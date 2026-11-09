/**
 * Mercado Pago subscriptions service layer.
 *
 * Contains all direct interaction with the Mercado Pago PreApproval API.
 * This file runs server-side only and relies on the secret access token —
 * never import it from client components.
 *
 * Consumers should go through `actions.ts` (server) or `client.ts` (client)
 * instead of importing this file directly.
 */

import "server-only";
import { MercadoPagoConfig, PreApproval } from "mercadopago";
import crypto from "crypto";
import type {
  CreateSubscriptionInput,
  MPSubscriptionResult,
  MPSubscription,
  SubscriptionStatusResult,
  PreapprovalStatus,
  AuthorizedPayment,
  MPResult,
} from "./types";

// ---------------------------------------------------------------------------
// SDK client initialization
// ---------------------------------------------------------------------------

if (!process.env.MERCADOPAGO_ACCESS_TOKEN) {
  throw new Error("Missing MERCADOPAGO_ACCESS_TOKEN environment variable.");
}

const mpConfig = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN,
});

const preapprovalClient = new PreApproval(mpConfig);

// The SDK's request typings don't cover every field the REST API accepts
// (e.g. auto_recurring.free_trial), so bodies are cast to the SDK types.
type PreApprovalCreateBody = Parameters<PreApproval["create"]>[0]["body"];
type PreApprovalUpdateBody = Parameters<PreApproval["update"]>[0]["body"];

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Wraps a Mercado Pago SDK call, normalizing thrown errors into an MPResult. */
async function safeCall<T>(fn: () => Promise<T>): Promise<MPResult<T>> {
  try {
    const data = await fn();
    return { success: true, data };
  } catch (err: any) {
    const message =
      err?.cause?.[0]?.description ||
      err?.message ||
      "Unexpected Mercado Pago error.";
    return { success: false, error: message, code: err?.status?.toString() };
  }
}

/** Maps a raw Mercado Pago preapproval object into our narrowed MPSubscription shape. */
function mapSubscription(raw: any): MPSubscription {
  return {
    id: raw.id,
    status: raw.status,
    payerEmail: raw.payer_email,
    preapprovalPlanId: raw.preapproval_plan_id ?? null,
    reason: raw.reason ?? null,
    externalReference: raw.external_reference ?? null,
    autoRecurring: {
      frequency: raw.auto_recurring?.frequency,
      frequencyType: raw.auto_recurring?.frequency_type,
      transactionAmount: raw.auto_recurring?.transaction_amount,
      currencyId: raw.auto_recurring?.currency_id,
      startDate: raw.auto_recurring?.start_date ?? null,
      endDate: raw.auto_recurring?.end_date ?? null,
      freeTrial: raw.auto_recurring?.free_trial
        ? {
            frequency: raw.auto_recurring.free_trial.frequency,
            frequencyType: raw.auto_recurring.free_trial.frequency_type,
          }
        : null,
    },
    nextPaymentDate: raw.next_payment_date ?? null,
    dateCreated: raw.date_created,
    lastModified: raw.last_modified,
  };
}

/**
 * The official SDK doesn't expose the authorized_payments sub-resource, so
 * this hits the REST API directly for that one call.
 */
async function fetchAuthorizedPaymentsRaw(preapprovalId: string): Promise<any[]> {
  const response = await fetch(
    `https://api.mercadopago.com/preapproval/${preapprovalId}/authorized_payments`,
    {
      headers: {
        Authorization: `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`,
      },
    }
  );

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body?.message || `Mercado Pago API error (${response.status})`);
  }

  return response.json();
}

/** Same raw-REST reasoning as above, for fetching a single authorized payment by its own id. */
async function fetchAuthorizedPaymentByIdRaw(authorizedPaymentId: string): Promise<any> {
  const response = await fetch(
    `https://api.mercadopago.com/authorized_payments/${authorizedPaymentId}`,
    {
      headers: {
        Authorization: `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`,
      },
    }
  );

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body?.message || `Mercado Pago API error (${response.status})`);
  }

  return response.json();
}

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------

/**
 * Creates a subscription WITHOUT an associated plan and returns the
 * authorization URL. Status is `pending` until the payer authorizes it on
 * Mercado Pago's hosted page. (A subscription with a plan requires a
 * card_token_id and is created already authorized, so it can't be used
 * with a redirect flow.)
 */
export async function createPreapproval(
  input: CreateSubscriptionInput
): Promise<MPResult<MPSubscriptionResult>> {
  return safeCall(async () => {
    const { autoRecurring } = input;

    const body = {
      reason: input.reason,
      external_reference: input.externalReference,
      payer_email: input.payerEmail,
      back_url: input.backUrl,
      status: "pending",
      auto_recurring: {
        frequency: autoRecurring.frequency,
        frequency_type: autoRecurring.frequencyType,
        transaction_amount: autoRecurring.transactionAmount,
        currency_id: autoRecurring.currencyId,
        ...(autoRecurring.freeTrial && {
          free_trial: {
            frequency: autoRecurring.freeTrial.frequency,
            frequency_type: autoRecurring.freeTrial.frequencyType,
          },
        }),
      },
    };

    const response = await preapprovalClient.create({
      body: body as unknown as PreApprovalCreateBody,
    });

    if (!response.id || !response.init_point) {
      throw new Error("Mercado Pago did not return an authorization URL.");
    }

    return {
      id: response.id,
      status: response.status as PreapprovalStatus,
      initPoint: response.init_point,
    };
  });
}

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------

/** Fetches a subscription by id. */
export async function getPreapproval(id: string): Promise<MPResult<MPSubscription>> {
  return safeCall(async () => {
    const raw = await preapprovalClient.get({ id });
    return mapSubscription(raw);
  });
}

/** Returns a simplified status snapshot for a subscription. */
export async function getPreapprovalStatus(
  id: string
): Promise<MPResult<SubscriptionStatusResult>> {
  return safeCall(async () => {
    const raw = await preapprovalClient.get({ id });
    return { id: raw.id!, status: raw.status as PreapprovalStatus };
  });
}

/** Lists the recurring charges (authorized payments) tied to a subscription. */
export async function getAuthorizedPayments(
  preapprovalId: string
): Promise<MPResult<AuthorizedPayment[]>> {
  return safeCall(async () => {
    const raw = await fetchAuthorizedPaymentsRaw(preapprovalId);
    return (raw as any[]).map((p) => ({
      id: String(p.id),
      preapprovalId,
      transactionAmount: p.transaction_amount,
      status: p.status,
      dateCreated: p.date_created,
    }));
  });
}

/**
 * Fetches a single authorized payment (recurring charge) by its own id.
 * Used when handling a `subscription_authorized_payment` webhook event,
 * whose `data.id` refers to the payment, not the subscription.
 */
export async function getAuthorizedPaymentById(
  authorizedPaymentId: string
): Promise<MPResult<AuthorizedPayment>> {
  return safeCall(async () => {
    const raw = await fetchAuthorizedPaymentByIdRaw(authorizedPaymentId);
    return {
      id: String(raw.id),
      preapprovalId: String(raw.preapproval_id),
      transactionAmount: raw.transaction_amount,
      status: raw.status,
      dateCreated: raw.date_created,
    };
  });
}

// ---------------------------------------------------------------------------
// Update (status + amount)
// ---------------------------------------------------------------------------

/**
 * Updates a subscription's status.
 * Valid transitions: authorized -> paused -> authorized, or -> cancelled
 * (terminal) from any non-cancelled status.
 */
export async function updatePreapprovalStatus(
  id: string,
  status: "authorized" | "paused" | "cancelled"
): Promise<MPResult<MPSubscription>> {
  return safeCall(async () => {
    const raw = await preapprovalClient.update({ id, body: { status } });
    return mapSubscription(raw);
  });
}

/**
 * Updates a subscription's recurring amount. This is the only way to change
 * an active subscription's plan-related terms — Mercado Pago does not allow
 * swapping preapproval_plan_id on an existing subscription. Used for
 * upgrade, downgrade, plan changes, and quantity changes alike.
 */
export async function updatePreapprovalAmount(
  id: string,
  transactionAmount: number
): Promise<MPResult<MPSubscription>> {
  return safeCall(async () => {
    const body = { auto_recurring: { transaction_amount: transactionAmount } };
    const raw = await preapprovalClient.update({
      id,
      body: body as unknown as PreApprovalUpdateBody,
    });
    return mapSubscription(raw);
  });
}

// ---------------------------------------------------------------------------
// Webhook signature verification
// ---------------------------------------------------------------------------

/**
 * Verifies the `x-signature` header Mercado Pago sends with webhook
 * notifications. Same HMAC-SHA256 scheme as the payments module — duplicated
 * here so this module has no dependency on it.
 *
 * Docs: https://www.mercadopago.com/developers/en/docs/checkout-api/webhooks
 */
export function verifyWebhookSignature(params: {
  xSignature: string;
  xRequestId: string;
  dataId: string;
}): boolean {
  const secret = process.env.MERCADOPAGO_SUBSCRIPTIONS_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error("Missing MERCADOPAGO_SUBSCRIPTIONS_WEBHOOK_SECRET environment variable.");
  }

  const parts = Object.fromEntries(
    params.xSignature.split(",").map((part) => {
      const [key, value] = part.split("=");
      return [key?.trim(), value?.trim()];
    })
  );

  const ts = parts.ts;
  const hash = parts.v1;
  if (!ts || !hash) return false;

  const manifest = `id:${params.dataId.toLowerCase()};request-id:${params.xRequestId};ts:${ts};`;
  const computedHash = crypto.createHmac("sha256", secret).update(manifest).digest("hex");

  const hashBuffer = Buffer.from(hash, "hex");
  const computedBuffer = Buffer.from(computedHash, "hex");

  if (hashBuffer.length !== computedBuffer.length) return false;
  return crypto.timingSafeEqual(hashBuffer, computedBuffer);
}