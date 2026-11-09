import type { Metadata } from "next";
import Link from "next/link";
import { TriangleAlert } from "lucide-react";

import { NavbarApp } from "@/components/layouts/navbar-app";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireAuth } from "@/lib/auth/supabase/basic-auth/actions";
import { getOwnSubscription, hasPaidAccess } from "@/lib/billing/subscription";
import { checkoutStatusContent, ROUTES } from "@/lib/config";

export const metadata: Metadata = {
  title: checkoutStatusContent.error.metaTitle,
};

export default async function CheckoutErrorPage() {
  const user = await requireAuth();
  const subscription = await getOwnSubscription(user.id);
  const content = checkoutStatusContent.error;

  return (
    <>
      <NavbarApp accountName={user.email ?? ""} showUpgrade={!hasPaidAccess(subscription)} />
      <main className="flex flex-1 items-center justify-center px-4 py-16 sm:px-6">
        <Card className="w-full max-w-md">
          <CardHeader className="items-center text-center">
            <span className="flex size-10 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
              <TriangleAlert className="size-5" />
            </span>
            <CardTitle className="text-2xl">{content.title}</CardTitle>
            <CardDescription>{content.description}</CardDescription>
          </CardHeader>
          <CardFooter className="flex flex-col gap-3">
            <Link href={ROUTES.plans} className={buttonVariants({ className: "w-full" })}>
              {content.tryAgainLabel}
            </Link>
            <Link
              href={ROUTES.dashboard}
              className={buttonVariants({ variant: "ghost", className: "w-full" })}
            >
              {checkoutStatusContent.dashboardLabel}
            </Link>
          </CardFooter>
        </Card>
      </main>
    </>
  );
}
