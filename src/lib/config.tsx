import { BellRing, Coins, LayoutList } from "lucide-react";

import type { AuthErrorCode } from "@/lib/auth/supabase/basic-auth/types";
import type { BillingErrorCode } from "@/lib/billing/types";
import type { TrackerErrorCode } from "@/lib/tracker/types";

export const siteConfig = {
  name: "TrackMySubs",
  description:
    "Track all your personal subscriptions in one place and never miss a renewal.",
} as const;

export const ROUTES = {
  home: "/",
  login: "/login",
  signup: "/signup",
  forgotPassword: "/forgot-password",
  resetPassword: "/reset-password",
  authCallback: "/api/auth/callback",
  plans: "/planes",
  checkout: "/checkout",
  checkoutSuccess: "/checkout/success",
  checkoutPending: "/checkout/pending",
  checkoutError: "/checkout/error",
  checkoutUpgrade: "/checkout/upgrade",
  dashboard: "/dashboard",
  settings: "/settings",
} as const;

export const navbarContent = {
  plansLabel: "Plans",
  signInLabel: "Sign in",
} as const;

export const heroContent = {
  eyebrow: "Subscription tracker",
  title: "Every subscription, one clear dashboard",
  description:
    "Register Netflix, Spotify, YouTube and everything else you pay for. See what you spend each month by currency and get reminded before each charge.",
  primaryCta: "Get started",
  secondaryCta: {
    label: "View plans",
    href: ROUTES.plans,
  },
  highlights: [
    {
      title: "All in one place",
      description:
        "Add each service with its cost, category, currency and billing day.",
      icon: LayoutList,
    },
    {
      title: "Totals by currency",
      description:
        "Monthly totals split by ARS, USD and any other currency you use.",
      icon: Coins,
    },
    {
      title: "Never miss a charge",
      description:
        "Mark services as paid each month and see upcoming billing dates.",
      icon: BellRing,
    },
  ],
} as const;

export const PLAN_IDS = ["free", "standard", "pro"] as const;

export type PlanId = (typeof PLAN_IDS)[number];

export type PaidPlanId = Exclude<PlanId, "free">;

export function isPaidPlanId(value: unknown): value is PaidPlanId {
  return value === "standard" || value === "pro";
}

// Display content only. Prices, limits and trial live in the `plans` table.
export const PLANS = {
  free: {
    id: "free",
    name: "Free",
    description: "Everything you need to get started.",
    features: [
      "Up to 4 active services",
      "Totals split by currency",
      "Monthly PDF/CSV export",
    ],
  },
  standard: {
    id: "standard",
    name: "Standard",
    description: "For keeping most of your subscriptions in check.",
    features: [
      "Up to 7 services",
      "Totals split by currency",
      "Monthly PDF/CSV export",
    ],
  },
  pro: {
    id: "pro",
    name: "Pro",
    description: "For tracking everything, with no limits.",
    features: [
      "Unlimited services",
      "Totals split by currency",
      "Monthly PDF/CSV export",
    ],
  },
} as const;

export const PLAN_RANK: Record<PlanId, number> = { free: 0, standard: 1, pro: 2 };

export const SUBSCRIPTION_STATUSES = [
  "active",
  "pending",
  "cancelled",
  "suspended",
] as const;

export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

export const PASSWORD_MIN_LENGTH = 8;

// Extra days of access after the next payment date, to absorb charge delays.
export const BILLING_GRACE_DAYS = 3;

// Days before the end of a cancelled plan at which the dashboard warns the user.
export const EXPIRY_WARNING_DAYS = 7;

// Smallest amount charged for a prorated upgrade (Mercado Pago rejects tiny payments).
export const MIN_PRORATED_CHARGE = 50;

export const authContent = {
  login: {
    metaTitle: "Sign in",
    title: "Welcome back",
    description: "Sign in to manage your subscriptions.",
    emailLabel: "Email",
    emailPlaceholder: "you@example.com",
    passwordLabel: "Password",
    forgotPasswordLabel: "Forgot your password?",
    submitLabel: "Sign in",
    submittingLabel: "Signing in",
    noAccountText: "Don't have an account?",
    signUpLabel: "Sign up",
    resetSuccess: "Your password was updated. Sign in with your new password.",
    resendLabel: "Resend verification email",
    resendSuccess: "Verification email sent. Check your inbox.",
  },
  signup: {
    metaTitle: "Create account",
    title: "Create your account",
    description: "Start tracking your subscriptions for free.",
    emailLabel: "Email",
    emailPlaceholder: "you@example.com",
    passwordLabel: "Password",
    passwordHint: `Use at least ${PASSWORD_MIN_LENGTH} characters.`,
    submitLabel: "Create account",
    submittingLabel: "Creating account",
    haveAccountText: "Already have an account?",
    signInLabel: "Sign in",
    successTitle: "Check your email",
    successDescription:
      "We sent you a verification link. Open it to activate your account.",
    resendLabel: "Resend verification email",
    resendSuccess: "Verification email sent. Check your inbox.",
  },
  forgotPassword: {
    metaTitle: "Reset password",
    title: "Forgot your password?",
    description: "Enter your email and we'll send you a link to reset it.",
    emailLabel: "Email",
    emailPlaceholder: "you@example.com",
    submitLabel: "Send reset link",
    submittingLabel: "Sending",
    backToLoginLabel: "Back to sign in",
    successTitle: "Check your email",
    successDescription:
      "If an account exists for that email, you'll receive a reset link shortly.",
  },
  resetPassword: {
    metaTitle: "Set new password",
    title: "Set a new password",
    description: "Choose a new password for your account.",
    newPasswordLabel: "New password",
    confirmPasswordLabel: "Confirm new password",
    submitLabel: "Update password",
    submittingLabel: "Updating",
    mismatchError: "Passwords don't match.",
  },
  errors: {
    invalid_credentials: "Incorrect email or password.",
    email_not_verified: "Please verify your email before signing in.",
    user_already_exists: "An account with this email already exists.",
    weak_password: `Your password is too weak. Use at least ${PASSWORD_MIN_LENGTH} characters.`,
    invalid_email: "Please enter a valid email address.",
    oauth_error: "We couldn't sign you in with that provider.",
    session_expired: "Your session expired. Please sign in again.",
    no_session: "You need to sign in to continue.",
    same_password: "Your new password must be different from the current one.",
    rate_limited: "Too many attempts. Please try again in a few minutes.",
    unknown: "Something went wrong. Please try again.",
  } satisfies Record<AuthErrorCode, string>,
  callbackErrors: {
    missing_code: "The sign-in link is invalid. Please try again.",
    auth_callback_failed: "The sign-in link is invalid or has expired. Please try again.",
  },
} as const;

export const navbarAppContent = {
  settingsLabel: "Settings",
  upgradeLabel: "Upgrade plan",
} as const;

export const plansContent = {
  metaTitle: "Plans",
  title: "Simple, monthly pricing",
  description:
    "Start for free and upgrade when you need to track more subscriptions.",
  freePrice: "Free",
  perMonth: "/ month",
  trialSuffix: "days free",
  currentLabel: "Current plan",
  getStartedLabel: "Get started",
  choosePrefix: "Choose",
  manageLabel: "Manage plan",
  continueFreeLabel: "Continue with the Free plan",
} as const;

export const checkoutContent = {
  metaTitle: "Checkout",
  title: "Review your plan",
  description: "Check the details before continuing to Mercado Pago.",
  planLabel: "Plan",
  billingLabel: "Billing",
  billingValue: "Monthly",
  priceLabel: "Price",
  trialLabel: "Free trial",
  trialSuffix: "days",
  dueTodayLabel: "Due today",
  dueTodayFree: "Free",
  firstPaymentLabel: "First payment",
  payLabel: "Continue to Mercado Pago",
  payingLabel: "Redirecting",
  backLabel: "Back to plans",
  note: "You'll be redirected to Mercado Pago to authorize the recurring payment. You can cancel anytime from Settings.",
} as const;

export const billingErrors = {
  invalid_plan: "That plan isn't available.",
  unauthenticated: "Please sign in to continue.",
  email_not_verified: "Verify your email before subscribing.",
  already_subscribed: "You already have a paid plan. You can subscribe again when it ends.",
  misconfigured: "Billing isn't configured correctly. Please try again later.",
  provider_error: "We couldn't complete the request with Mercado Pago. Please try again.",
  not_subscribed: "You don't have an active paid plan.",
  same_plan: "You're already on that plan.",
  change_scheduled: "A plan change is already scheduled.",
  upgrade_unavailable: "Your renewal is being processed. Try again in a few minutes.",
} satisfies Record<BillingErrorCode, string>;

export const checkoutStatusContent = {
  dashboardLabel: "Go to dashboard",
  plansLabel: "Back to plans",
  checkAgainLabel: "Check again",
  success: {
    metaTitle: "Confirming payment",
    title: "Confirming your payment",
    description: "This usually takes a few seconds. Please keep this page open.",
    timeoutTitle: "Still confirming",
    timeoutDescription:
      "This is taking longer than usual. Your plan will activate automatically as soon as Mercado Pago confirms the payment.",
  },
  pending: {
    metaTitle: "Payment pending",
    title: "Payment pending",
    description:
      "Mercado Pago hasn't confirmed your payment yet. If you already completed it, your plan will activate automatically.",
    timeoutTitle: "Still pending",
    timeoutDescription:
      "We're still waiting for Mercado Pago. Your plan will activate automatically once the payment is confirmed.",
  },
  upgrade: {
    metaTitle: "Confirming upgrade",
    title: "Confirming your upgrade",
    description: "Your payment is being confirmed. This usually takes a few seconds.",
    timeoutTitle: "Still confirming",
    timeoutDescription:
      "This is taking longer than usual. Your new plan will activate automatically as soon as Mercado Pago confirms the payment.",
  },
  error: {
    metaTitle: "Payment failed",
    title: "We couldn't complete your payment",
    description:
      "Your subscription wasn't authorized. You can try again at any time.",
    tryAgainLabel: "Try again",
  },
} as const;

export const DEFAULT_CATEGORIES = [
  "Entertainment",
  "Music",
  "Video",
  "Gaming",
  "Work",
  "Education",
  "Health",
  "Cloud",
  "Other",
] as const;

export const DEFAULT_CURRENCIES = ["ARS", "USD", "EUR", "BRL", "CLP", "UYU", "MXN", "GBP"] as const;

export const dashboardContent = {
  metaTitle: "Dashboard",
  title: "Your subscriptions",
  usageSuffix: "active services",
  limitReached: "You've reached your plan's limit of active services.",
  upgradeLabel: "Upgrade plan",
  addLabel: "Add service",
  markAllPaidLabel: "Mark all as paid",
  exportCsvLabel: "CSV",
  exportPdfLabel: "PDF",
  totalsLabel: "Monthly total",
  totalsPaidLabel: "Paid this month",
  totalsNote: "Active services only. Yearly services count as a monthly equivalent.",
  currencyFilterLabel: "Currency",
  categoryFilterLabel: "Category",
  allOption: "All",
  clearFiltersLabel: "Clear filters",
  emptyTitle: "No services yet",
  emptyDescription: "Add your first subscription to start tracking what you spend.",
  noMatchTitle: "No services match your filters",
  columns: {
    service: "Service",
    category: "Category",
    cost: "Cost",
    nextCharge: "Next charge",
    status: "Status",
    paid: "This month",
    actions: "Actions",
  },
  statusLabels: {
    active: "Active",
    paused: "Paused",
    cancelled: "Cancelled",
  },
  cycleLabels: {
    monthly: "Monthly",
    yearly: "Yearly",
  },
  perMonth: "/ month",
  perYear: "/ year",
  paidLabel: "Paid",
  markPaidLabel: "Mark paid",
  editLabel: "Edit service",
  deleteLabel: "Delete service",
  form: {
    addTitle: "Add service",
    editTitle: "Edit service",
    addDescription: "Add a subscription you want to keep track of.",
    editDescription: "Update the details of this subscription.",
    nameLabel: "Name",
    namePlaceholder: "Netflix",
    costLabel: "Cost",
    currencyLabel: "Currency",
    currencyPlaceholder: "ARS",
    cycleLabel: "Billing cycle",
    dateLabel: "Next charge date",
    categoryLabel: "Category",
    categoryPlaceholder: "Entertainment",
    cancelLabel: "Cancel",
    addSubmitLabel: "Add service",
    editSubmitLabel: "Save changes",
    savingLabel: "Saving",
  },
  deleteDialog: {
    title: "Delete this service?",
    description: "It will be permanently deleted. This can't be undone.",
    cancelLabel: "Cancel",
    confirmLabel: "Delete",
    confirmingLabel: "Deleting",
  },
  suspended: {
    title: "Your account is suspended",
    description:
      "Your subscription has ended. Renew your plan to get back to your dashboard. Your data is safe.",
    renewLabel: "Renew plan",
    plansLabel: "View plans",
  },
  expiry: {
    endingTitle: "Your plan ends soon",
    endingBody: "Your plan ends on",
    endingSuffix: "After that your account will be suspended unless you renew.",
    overdueTitle: "We haven't received your latest payment",
    overdueBody: "Your access ends on",
    overdueSuffix:
      "unless the payment is confirmed. Check your payment method in Mercado Pago.",
    manageLabel: "Manage plan",
  },
} as const;

export const trackerErrors = {
  plan_limit_reached:
    "You've reached your plan's limit of active services. Upgrade to add more.",
  account_suspended: "Your account is suspended. Renew your plan to make changes.",
  invalid_data: "Some values aren't valid. Check the form and try again.",
  not_found: "That service no longer exists.",
  unknown: "Something went wrong. Please try again.",
} satisfies Record<TrackerErrorCode, string>;

export const exportContent = {
  filePrefix: "trackmysubs",
  pdfTitle: "Monthly subscriptions report",
  totalsHeading: "Monthly totals",
  yes: "Yes",
  no: "No",
  headers: [
    "Service",
    "Category",
    "Cost",
    "Currency",
    "Billing cycle",
    "Next charge",
    "Status",
    "Paid this month",
  ],
  totalsHeaders: ["Currency", "Monthly total", "Paid this month", "Active services"],
} as const;

export const settingsContent = {
  metaTitle: "Settings",
  title: "Settings",
  account: {
    title: "Account",
    description: "Your sign-in details.",
    emailLabel: "Email",
    verifiedLabel: "Verified",
    unverifiedLabel: "Not verified",
    memberSinceLabel: "Member since",
    signOutLabel: "Sign out",
    signingOutLabel: "Signing out",
  },
  plan: {
    title: "Plan",
    description: "Your subscription and billing.",
    planLabel: "Current plan",
    priceLabel: "Price",
    freePrice: "Free",
    perMonth: "/ month",
    status: {
      free: "Free",
      active: "Active",
      cancelled: "Cancelled",
      suspended: "Suspended",
    },
    nextPaymentLabel: "Next payment",
    accessUntilLabel: "Access until",
    endedLabel: "Ended on",
    upgradeLabel: "Upgrade plan",
    renewLabel: "Renew plan",
    viewPlansLabel: "View plans",
    upgradeToLabel: "Upgrade to {plan}",
    upgradeTitle: "Upgrade to {plan}?",
    upgradeBody:
      "You'll pay {amount} now for the rest of your current period (until {date}). {plan} starts right away and your next payment will be {price}.",
    upgradeConfirmLabel: "Pay {amount}",
    upgradingLabel: "Redirecting",
    downgradeToLabel: "Switch to {plan}",
    downgradeTitle: "Switch to {plan} next period?",
    downgradeBody:
      "You keep {current} until {date}. Then your plan changes to {plan} and your next payment will be {price}.",
    downgradeConfirmLabel: "Schedule change",
    downgradingLabel: "Scheduling",
    scheduledNote:
      "Your plan changes to {plan} on {date}. You keep {current} until then.",
    cancelledNote:
      "Your plan was cancelled and can't be resumed. You keep access until {date}. After that you can subscribe again.",
    cancelLabel: "Cancel plan",
    cancelTitle: "Cancel your plan?",
    cancelBody:
      "You keep your plan until {date}. This can't be undone. After that your account will be suspended unless you subscribe again. Payments already made aren't refunded.",
    cancelConfirmLabel: "Cancel plan",
    cancelingLabel: "Cancelling",
    dismissLabel: "Not now",
  },
  password: {
    title: "Password",
    description: "Change the password you use to sign in.",
    currentLabel: "Current password",
    newLabel: "New password",
    confirmLabel: "Confirm new password",
    submitLabel: "Update password",
    submittingLabel: "Updating",
    success: "Your password was updated.",
    mismatch: "Passwords don't match.",
    wrongCurrent: "Your current password is incorrect.",
  },
} as const;