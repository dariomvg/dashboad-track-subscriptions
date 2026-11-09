export type BillingErrorCode =
  | "invalid_plan"
  | "unauthenticated"
  | "email_not_verified"
  | "already_subscribed"
  | "misconfigured"
  | "provider_error"
  | "not_subscribed"
  | "same_plan"
  | "change_scheduled"
  | "upgrade_unavailable";

export type StartCheckoutResult =
  | { success: true; url: string }
  | { success: false; error: BillingErrorCode };