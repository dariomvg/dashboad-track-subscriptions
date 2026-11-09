import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { dashboardContent } from "@/lib/config";
import { formatMoney } from "@/lib/format";
import type { CurrencyTotal } from "@/lib/tracker/totals";

export function TotalsServices({ totals }: { totals: CurrencyTotal[] }) {
  if (totals.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {totals.map((total) => (
          <Card key={total.currency}>
            <CardHeader>
              <CardDescription>
                {dashboardContent.totalsLabel} · {total.currency}
              </CardDescription>
              <CardTitle className="text-2xl">
                {formatMoney(total.total, total.currency)}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              {dashboardContent.totalsPaidLabel}: {formatMoney(total.paid, total.currency)}
            </CardContent>
          </Card>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">{dashboardContent.totalsNote}</p>
    </div>
  );
}
