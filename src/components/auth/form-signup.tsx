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
import {
  resendVerificationEmailAction,
  signUpAction,
} from "@/lib/auth/supabase/basic-auth/actions";
import type { AuthErrorCode } from "@/lib/auth/supabase/basic-auth/types";
import { authContent, PASSWORD_MIN_LENGTH, ROUTES } from "@/lib/config";

export function FormSignup() {
  const content = authContent.signup;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [errorCode, setErrorCode] = useState<AuthErrorCode | null>(null);
  const [sent, setSent] = useState(false);
  const [resendState, setResendState] = useState<"idle" | "sending" | "sent">("idle");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setErrorCode(null);

    const { error } = await signUpAction({ email: email.trim(), password });

    setPending(false);
    if (error) {
      setErrorCode(error.code);
      return;
    }
    setSent(true);
  }

  async function handleResend() {
    setResendState("sending");
    await resendVerificationEmailAction(email.trim());
    setResendState("sent");
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
        <CardFooter className="flex flex-col gap-4">
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleResend}
            disabled={resendState !== "idle"}
          >
            {resendState === "sent" ? content.resendSuccess : content.resendLabel}
          </Button>
          <Link
            href={ROUTES.login}
            className="text-sm text-primary underline-offset-4 hover:underline"
          >
            {content.signInLabel}
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
            <Label htmlFor="signup-email">{content.emailLabel}</Label>
            <Input
              id="signup-email"
              type="email"
              autoComplete="email"
              placeholder={content.emailPlaceholder}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              disabled={pending}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="signup-password">{content.passwordLabel}</Label>
            <Input
              id="signup-password"
              type="password"
              autoComplete="new-password"
              minLength={PASSWORD_MIN_LENGTH}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              disabled={pending}
            />
            <p className="text-sm text-muted-foreground">{content.passwordHint}</p>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button type="submit" className="w-full" disabled={pending}>
            {pending && <LoaderCircle className="animate-spin" />}
            {pending ? content.submittingLabel : content.submitLabel}
          </Button>
          <p className="text-sm text-muted-foreground">
            {content.haveAccountText}{" "}
            <Link
              href={ROUTES.login}
              className="text-primary underline-offset-4 hover:underline"
            >
              {content.signInLabel}
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
