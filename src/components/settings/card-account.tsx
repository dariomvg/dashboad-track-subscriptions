import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ButtonSignOut } from "@/components/settings/button-sign-out";
import { settingsContent } from "@/lib/config";
import { formatDate } from "@/lib/format";

type CardAccountProps = {
  email: string;
  verified: boolean;
  createdAt: string;
};

export function CardAccount({ email, verified, createdAt }: CardAccountProps) {
  const content = settingsContent.account;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{content.title}</CardTitle>
        <CardDescription>{content.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <dl className="flex flex-col gap-3 text-sm">
          <div className="flex items-center justify-between gap-4">
            <dt className="text-muted-foreground">{content.emailLabel}</dt>
            <dd className="flex min-w-0 items-center gap-2 font-medium">
              <span className="truncate">{email}</span>
              <Badge variant={verified ? "secondary" : "outline"}>
                {verified ? content.verifiedLabel : content.unverifiedLabel}
              </Badge>
            </dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-muted-foreground">{content.memberSinceLabel}</dt>
            <dd className="font-medium">{formatDate(new Date(createdAt))}</dd>
          </div>
        </dl>
      </CardContent>
      <CardFooter>
        <ButtonSignOut />
      </CardFooter>
    </Card>
  );
}
