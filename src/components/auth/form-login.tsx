"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { LoaderCircle } from "lucide-react";

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
  signInAction,
} from "@/lib/auth/supabase/basic-auth/actions";
import type { AuthErrorCode } from "@/lib/auth/supabase/basic-auth/types";
import { authContent, ROUTES } from "@/lib/config";

type FormLoginProps = {
  nextPath: string;
  resetSuccess: boolean;
  callbackError: string | null;
};

export function FormLogin({ nextPath, resetSuccess, callbackError }: FormLoginProps) {
  const router = useRouter();
  const content = authContent.login;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [errorCode, setErrorCode] = useState<AuthErrorCode | null>(null);
  const [resendState, setResendState] = useState<"idle" | "sending" | "sent">("idle");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setErrorCode(null);
    setResendState("idle");

    const { error } = await signInAction({ email: email.trim(), password });

    if (error) {
      setErrorCode(error.code);
      setPending(false);
      return;
    }

    router.replace(nextPath);
    router.refresh();
  }

  async function handleResend() {
    setResendState("sending");
    await resendVerificationEmailAction(email.trim());
    setResendState("sent");
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-2xl">{content.title}</CardTitle>
        <CardDescription>{content.description}</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="flex flex-col gap-4">
          {resetSuccess && (
            <Alert>
              <AlertDescription>{content.resetSuccess}</AlertDescription>
            </Alert>
          )}
          {callbackError && (
            <Alert variant="destructive">
              <AlertDescription>{callbackError}</AlertDescription>
            </Alert>
          )}
          {errorCode && (
            <Alert variant="destructive">
              <AlertDescription>{authContent.errors[errorCode]}</AlertDescription>
            </Alert>
          )}
          {errorCode === "email_not_verified" && (
            <Button
              type="button"
              variant="outline"
              onClick={handleResend}
              disabled={resendState !== "idle"}
            >
              {resendState === "sent" ? content.resendSuccess : content.resendLabel}
            </Button>
          )}

          <div className="flex flex-col gap-2">
            <Label htmlFor="login-email">{content.emailLabel}</Label>
            <Input
              id="login-email"
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
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="login-password">{content.passwordLabel}</Label>
              <Link
                href={ROUTES.forgotPassword}
                className="text-sm text-primary underline-offset-4 hover:underline"
              >
                {content.forgotPasswordLabel}
              </Link>
            </div>
            <Input
              id="login-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
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
          <p className="text-sm text-muted-foreground">
            {content.noAccountText}{" "}
            <Link
              href={ROUTES.signup}
              className="text-primary underline-offset-4 hover:underline"
            >
              {content.signUpLabel}
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
