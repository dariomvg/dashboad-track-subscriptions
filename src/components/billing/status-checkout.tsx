"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Clock, LoaderCircle } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getCheckoutStatus } from "@/lib/billing/actions";
import { checkoutStatusContent, ROUTES, type PaidPlanId } from "@/lib/config";

const POLL_INTERVAL_MS = 3000;
const MAX_ATTEMPTS = 20;

type StatusCheckoutProps = {
  title: string;
  description: string;
  timeoutTitle: string;
  timeoutDescription: string;
  /** When set, wait until the subscription is on this plan (upgrades). */
  targetPlan?: PaidPlanId;
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function StatusCheckout({
  title,
  description,
  timeoutTitle,
  timeoutDescription,
  targetPlan,
}: StatusCheckoutProps) {
  const router = useRouter();
  const [timedOut, setTimedOut] = useState(false);
  const [run, setRun] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      for (let attempt = 0; attempt < MAX_ATTEMPTS && !cancelled; attempt++) {
        try {
          const { active } = await getCheckoutStatus(targetPlan);
          if (cancelled) return;
          if (active) {
            router.replace(ROUTES.dashboard);
            router.refresh();
            return;
          }
        } catch {
          // Network hiccup: keep polling.
        }
        await sleep(POLL_INTERVAL_MS);
      }
      if (!cancelled) setTimedOut(true);
    }

    poll();
    return () => {
      cancelled = true;
    };
  }, [run, router, targetPlan]);

  function handleCheckAgain() {
    setTimedOut(false);
    setRun((value) => value + 1);
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="items-center text-center">
        <span className="flex size-10 items-center justify-center rounded-lg bg-accent text-accent-foreground">
          {timedOut ? (
            <Clock className="size-5" />
          ) : (
            <LoaderCircle className="size-5 animate-spin" />
          )}
        </span>
        <CardTitle className="text-2xl">{timedOut ? timeoutTitle : title}</CardTitle>
        <CardDescription>{timedOut ? timeoutDescription : description}</CardDescription>
      </CardHeader>
      {timedOut && (
        <CardFooter className="flex flex-col gap-3">
          <Button className="w-full" onClick={handleCheckAgain}>
            {checkoutStatusContent.checkAgainLabel}
          </Button>
          <Link
            href={ROUTES.plans}
            className={buttonVariants({ variant: "ghost", className: "w-full" })}
          >
            {checkoutStatusContent.plansLabel}
          </Link>
        </CardFooter>
      )}
    </Card>
  );
}