import { CalendarClock } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { dashboardContent } from "@/lib/config";
import { formatDate } from "@/lib/format";
import type { ExpiryNotice } from "@/lib/billing/subscription";

export function NoticeExpiry({ notice, planName }: { notice: ExpiryNotice; planName: string }) {
  const content = dashboardContent.expiry;
  const date = formatDate(notice.endsAt);

  const title = notice.kind === "ending" ? content.endingTitle : content.overdueTitle;
  const description =
    notice.kind === "ending"
      ? `${planName} — ${content.endingBody} ${date}. ${content.endingSuffix}`
      : `${planName} — ${content.overdueBody} ${date} ${content.overdueSuffix}`;

  return (
    <Alert>
      <CalendarClock />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{description}</AlertDescription>
    </Alert>
  );
}