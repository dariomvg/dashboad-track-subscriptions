"use client";

import Link from "next/link";
import { useState } from "react";
import { LoaderCircle, MailCheck } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { forgotPasswordAction } from "@/lib/auth/supabase/basic-auth/actions";
import type { AuthErrorCode } from "@/lib/auth/supabase/basic-auth/types";
import { authContent, ROUTES } from "@/lib/config";

export function FormForgotPassword() {
  const content = authContent.forgotPassword;

  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [errorCode, setErrorCode] = useState<AuthErrorCode | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setErrorCode(null);

    const { error } = await forgotPasswordAction({ email: email.trim() });

    setPending(false);
    if (error && (error.code === "rate_limited" || error.code === "invalid_email")) {
      setErrorCode(error.code);
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="items-center text-center">
          <span className="flex size-10 items-center justify-center rounded-lg bg-accent text-accent-foreground">
            <MailCheck className="size-5" />
          </span>
          <CardTitle className="text-2xl">{content.successTitle}</CardTitle>
          <CardDescription>{content.successDescription}</CardDescription>
        </CardHeader>
        <CardFooter className="justify-center">
          <Link
            href={ROUTES.login}
            className="text-sm text-primary underline-offset-4 hover:underline"
          >
            {content.backToLoginLabel}
          </Link>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-2xl">{content.title}</CardTitle>
        <CardDescription>{content.description}</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="flex flex-col gap-4">
          {errorCode && (
            <Alert variant="destructive">
              <AlertDescription>{authContent.errors[errorCode]}</AlertDescription>
            </Alert>
          )}
          <div className="flex flex-col gap-2">
            <Label htmlFor="forgot-email">{content.emailLabel}</Label>
            <Input
              id="forgot-email"
              type="email"
              autoComplete="email"
              placeholder={content.emailPlaceholder}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              disabled={pending}
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button type="submit" className="w-full" disabled={pending}>
            {pending && <LoaderCircle className="animate-spin" />}
            {pending ? content.submittingLabel : content.submitLabel}
          </Button>
          <Link
            href={ROUTES.login}
            className="text-sm text-primary underline-offset-4 hover:underline"
          >
            {content.backToLoginLabel}
          </Link>
        </CardFooter>
      </form>
    </Card>
  );
}
