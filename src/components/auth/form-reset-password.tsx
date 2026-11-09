"use client";

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
  resetPasswordAction,
  signOutAction,
} from "@/lib/auth/supabase/basic-auth/actions";
import { authContent, PASSWORD_MIN_LENGTH, ROUTES } from "@/lib/config";

export function FormResetPassword() {
  const router = useRouter();
  const content = authContent.resetPassword;

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    if (password !== confirmPassword) {
      setMessage(content.mismatchError);
      return;
    }

    setPending(true);
    const { error } = await resetPasswordAction({ newPassword: password });

    if (error) {
      setMessage(authContent.errors[error.code]);
      setPending(false);
      return;
    }

    await signOutAction();
    router.replace(`${ROUTES.login}?reset=success`);
    router.refresh();
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-2xl">{content.title}</CardTitle>
        <CardDescription>{content.description}</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="flex flex-col gap-4">
          {message && (
            <Alert variant="destructive">
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          )}

          <div className="flex flex-col gap-2">
            <Label htmlFor="reset-password">{content.newPasswordLabel}</Label>
            <Input
              id="reset-password"
              type="password"
              autoComplete="new-password"
              minLength={PASSWORD_MIN_LENGTH}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              disabled={pending}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="reset-confirm-password">{content.confirmPasswordLabel}</Label>
            <Input
              id="reset-confirm-password"
              type="password"
              autoComplete="new-password"
              minLength={PASSWORD_MIN_LENGTH}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
              disabled={pending}
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" className="w-full" disabled={pending}>
            {pending && <LoaderCircle className="animate-spin" />}
            {pending ? content.submittingLabel : content.submitLabel}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
