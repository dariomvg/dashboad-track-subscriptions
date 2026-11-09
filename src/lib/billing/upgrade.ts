import "server-only";
import { MercadoPagoConfig, Payment, Preference } from "mercadopago";
import type { MPResult } from "@/lib/payments/mercadopago/subscriptions/types";

type PreferenceCreateBody = Parameters<Preference["create"]>[0]["body"];

function getClients() {
  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!accessToken) throw new Error("Missing MERCADOPAGO_ACCESS_TOKEN environment variable.");

  const config = new MercadoPagoConfig({ accessToken });
  return { preference: new Preference(config), payment: new Payment(config) };
}

export type UpgradePreferenceInput = {
  userId: string;
  email: string;
  fromPlan: string;
  targetPlan: string;
  preapprovalId: string;
  amount: number;
  currency: string;
  title: string;
  returnUrl: string;
  failureUrl: string;
  notificationUrl: string;
};

/**
 * Creates the one-time Checkout Pro payment for the prorated upgrade and
 * returns the URL to send the user to. What the webhook later trusts (who,
 * which plan, how much) is stored in the preference's metadata, which only
 * our access token can set.
 */
export async function createUpgradePreference(input: UpgradePreferenceInput): Promise<string> {
  const { preference } = getClients();

  const body = {
    items: [
      {
        id: `upgrade-${input.targetPlan}`,
        title: input.title,
        quantity: 1,
        unit_price: input.amount,
        currency_id: input.currency,
      },
    ],
    payer: { email: input.email },
    external_reference: `upgrade:${input.userId}`,
    metadata: {
      kind: "plan_upgrade",
      user_id: input.userId,
      from_plan: input.fromPlan,
      target_plan: input.targetPlan,
      preapproval_id: input.preapprovalId,
      amount: input.amount,
    },
    back_urls: {
      success: input.returnUrl,
      pending: input.returnUrl,
      failure: input.failureUrl,
    },
    auto_return: "approved",
    notification_url: input.notificationUrl,
  };

  const response = await preference.create({ body: body as unknown as PreferenceCreateBody });
  if (!response.init_point) throw new Error("Mercado Pago did not return a checkout URL.");

  return response.init_point;
}

export type PaymentInfo = {
  id: string;
  status: string;
  transactionAmount: number;
  currencyId: string;
  externalReference: string | null;
  metadata: Record<string, unknown>;
};

export async function getPayment(id: string): Promise<MPResult<PaymentInfo>> {
  try {
    const { payment } = getClients();
    const raw = await payment.get({ id });

    return {
      success: true,
      data: {
        id: String(raw.id),
        status: String(raw.status ?? ""),
        transactionAmount: Number(raw.transaction_amount),
        currencyId: String(raw.currency_id ?? ""),
        externalReference: raw.external_reference ?? null,
        metadata: (raw.metadata ?? {}) as Record<string, unknown>,
      },
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || "Unexpected Mercado Pago error.",
      code: err?.status?.toString(),
    };
  }
}
