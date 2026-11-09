import Link from "next/link";
import { Check } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { plansContent } from "@/lib/config";

export type PlanCta =
  | { kind: "current" }
  | { kind: "none" }
  | { kind: "link"; href: string; label: string; variant: "default" | "outline" };

type CardPlanProps = {
  name: string;
  description: string;
  features: readonly string[];
  price: string;
  period: string | null;
  trialBadge: string | null;
  cta: PlanCta;
};

export function CardPlan({
  name,
  description,
  features,
  price,
  period,
  trialBadge,
  cta,
}: CardPlanProps) {
  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-xl">{name}</CardTitle>
          {trialBadge && <Badge variant="secondary">{trialBadge}</Badge>}
        </div>
        <CardDescription>{description}</CardDescription>
        <p className="pt-2">
          <span className="text-3xl font-semibold tracking-tight">{price}</span>
          {period && (
            <span className="ml-1 text-sm text-muted-foreground">{period}</span>
          )}
        </p>
      </CardHeader>
      <CardContent className="flex-1">
        <ul className="flex flex-col gap-2 text-sm">
          {features.map((feature) => (
            <li key={feature} className="flex items-center gap-2">
              <Check className="size-4 text-primary" />
              {feature}
            </li>
          ))}
        </ul>
      </CardContent>
      {cta.kind !== "none" && (
        <CardFooter>
          {cta.kind === "current" ? (
            <Button variant="outline" className="w-full" disabled>
              {plansContent.currentLabel}
            </Button>
          ) : (
            <Link
              href={cta.href}
              className={buttonVariants({ variant: cta.variant, className: "w-full" })}
            >
              {cta.label}
            </Link>
          )}
        </CardFooter>
      )}
    </Card>
  );
}
