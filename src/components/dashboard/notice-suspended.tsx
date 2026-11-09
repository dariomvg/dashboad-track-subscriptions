import Link from "next/link";
import { Lock } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { dashboardContent, ROUTES } from "@/lib/config";

export function NoticeSuspended({ renewHref }: { renewHref: string }) {
  const content = dashboardContent.suspended;

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="items-center text-center">
        <span className="flex size-10 items-center justify-center rounded-lg bg-accent text-accent-foreground">
          <Lock className="size-5" />
        </span>
        <CardTitle className="text-2xl">{content.title}</CardTitle>
        <CardDescription>{content.description}</CardDescription>
      </CardHeader>
      <CardFooter className="flex flex-col gap-3">
        <Link href={renewHref} className={buttonVariants({ className: "w-full" })}>
          {content.renewLabel}
        </Link>
        <Link
          href={ROUTES.plans}
          className={buttonVariants({ variant: "ghost", className: "w-full" })}
        >
          {content.plansLabel}
        </Link>
      </CardFooter>
    </Card>
  );
}
