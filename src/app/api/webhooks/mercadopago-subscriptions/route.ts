/**
 * Mercado Pago subscriptions webhook.
 *
 * Register https://<your-domain>/api/webhooks/mercadopago-subscriptions in
 * the Mercado Pago dashboard (Webhooks) for subscription lifecycle and
 * recurring-charge events.
 *
 * Security model: the signature is verified first, and nothing from the body
 * is trusted beyond the resource id. The handler fetches the current state
 * from Mercado Pago and syncs our database to it (see lib/billing/webhook.ts).
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/payments/mercadopago/subscriptions/service";
import type { SubscriptionWebhookNotification } from "@/lib/payments/mercadopago/subscriptions/types";
import {
  claimEvent,
  finishEvent,
  PermanentWebhookError,
  processNotification,
} from "@/lib/billing/webhook";

const HANDLED_TYPES = new Set([
  "subscription_preapproval",
  "preapproval",
  "subscription_authorized_payment",
  "payment",
]);

const DATA_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

export async function POST(request: NextRequest) {
  const xSignature = request.headers.get("x-signature");
  const xRequestId = request.headers.get("x-request-id");

  let body: SubscriptionWebhookNotification;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const rawDataId = body?.data?.id;
  const dataId = rawDataId === undefined || rawDataId === null ? "" : String(rawDataId);

  if (!xSignature || !xRequestId || !DATA_ID_PATTERN.test(dataId)) {
    return NextResponse.json({ error: "Missing signature or data.id." }, { status: 400 });
  }

  let isValid: boolean;
  try {
    isValid = verifyWebhookSignature({ xSignature, xRequestId, dataId });
  } catch (err) {
    console.error(
      "[webhook] signature check failed to run:",
      err instanceof Error ? err.message : err
    );
    return NextResponse.json({ error: "Signature verification unavailable." }, { status: 500 });
  }

  if (!isValid) {
    return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
  }

  const type = typeof body.type === "string" ? body.type : "";
  if (!HANDLED_TYPES.has(type)) {
    return NextResponse.json({ received: true, ignored: true });
  }

  const eventKey =
    body.id !== undefined && body.id !== null
      ? `${type}:${body.id}`
      : `${type}:${dataId}:${xRequestId}`;

  try {
    const event = await claimEvent({
      eventKey,
      eventType: type,
      resourceId: dataId,
      payload: body,
    });

    if (event.alreadyProcessed) {
      return NextResponse.json({ received: true, duplicate: true });
    }

    try {
      const outcome = await processNotification(type, dataId);
      await finishEvent(event.id, { status: "processed", userId: outcome.userId });
    } catch (err) {
      const message = err instanceof Error ? err.message : "unknown error";
      const permanent = err instanceof PermanentWebhookError;

      await finishEvent(event.id, { status: "failed", error: message });
      console.error(`[webhook] ${type} ${dataId} failed (${permanent ? "permanent" : "retryable"}):`, message);

      // Retryable failures return 500 so Mercado Pago redelivers the event.
      return NextResponse.json({ received: true }, { status: permanent ? 200 : 500 });
    }
  } catch (err) {
    console.error("[webhook] could not record event:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Internal error." }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}