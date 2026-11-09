import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { settingsContent } from "@/lib/config";

export type PlanState = "free" | "active" | "cancelled" | "suspended";

type CardCurrentPlanProps = {
  planName: string;
  state: PlanState;
  price: string;
  detail: { label: string; value: string } | null;
  note?: string | null;
  children?: React.ReactNode;
};

const BADGE_VARIANTS = {
  free: "secondary",
  active: "default",
  cancelled: "outline",
  suspended: "destructive",
} as const;

export function CardCurrentPlan({
  planName,
  state,
  price,
  detail,
  note,
  children,
}: CardCurrentPlanProps) {
  const content = settingsContent.plan;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{content.title}</CardTitle>
        <CardDescription>{content.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <dl className="flex flex-col gap-3 text-sm">
          <div className="flex items-center justify-between gap-4">
            <dt className="text-muted-foreground">{content.planLabel}</dt>
            <dd className="flex items-center gap-2 font-medium">
              {planName}
              <Badge variant={BADGE_VARIANTS[state]}>{content.status[state]}</Badge>
            </dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-muted-foreground">{content.priceLabel}</dt>
            <dd className="font-medium">{price}</dd>
          </div>
          {detail && (
            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted-foreground">{detail.label}</dt>
              <dd className="font-medium">{detail.value}</dd>
            </div>
          )}
        </dl>
        {note && <p className="pt-4 text-sm text-muted-foreground">{note}</p>}
      </CardContent>
      {children && <CardFooter className="flex flex-wrap gap-2">{children}</CardFooter>}
    </Card>
  );
}