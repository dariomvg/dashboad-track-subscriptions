"use client";

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
import { resetPasswordAction, signInAction } from "@/lib/auth/supabase/basic-auth/actions";
import { authContent, PASSWORD_MIN_LENGTH, settingsContent } from "@/lib/config";

export function FormChangePassword({ email }: { email: string }) {
  const content = settingsContent.password;

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    if (newPassword !== confirmPassword) {
      setMessage({ type: "error", text: content.mismatch });
      return;
    }
    if (newPassword === currentPassword) {
      setMessage({ type: "error", text: authContent.errors.same_password });
      return;
    }

    setPending(true);

    // Re-authenticate with the current password before allowing the change.
    const verification = await signInAction({ email, password: currentPassword });
    if (verification.error) {
      setMessage({
        type: "error",
        text:
          verification.error.code === "invalid_credentials"
            ? content.wrongCurrent
            : authContent.errors[verification.error.code],
      });
      setPending(false);
      return;
    }

    const result = await resetPasswordAction({ newPassword });
    setPending(false);

    if (result.error) {
      setMessage({ type: "error", text: authContent.errors[result.error.code] });
      return;
    }

    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setMessage({ type: "success", text: content.success });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{content.title}</CardTitle>
        <CardDescription>{content.description}</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="flex flex-col gap-4">
          {message && (
            <Alert variant={message.type === "error" ? "destructive" : "default"}>
              <AlertDescription>{message.text}</AlertDescription>
            </Alert>
          )}

          <div className="flex flex-col gap-2">
            <Label htmlFor="current-password">{content.currentLabel}</Label>
            <Input
              id="current-password"
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              required
              disabled={pending}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="new-password">{content.newLabel}</Label>
              <Input
                id="new-password"
                type="password"
                autoComplete="new-password"
                minLength={PASSWORD_MIN_LENGTH}
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                required
                disabled={pending}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="confirm-new-password">{content.confirmLabel}</Label>
              <Input
                id="confirm-new-password"
                type="password"
                autoComplete="new-password"
                minLength={PASSWORD_MIN_LENGTH}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
                disabled={pending}
              />
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={pending}>
            {pending && <LoaderCircle className="animate-spin" />}
            {pending ? content.submittingLabel : content.submitLabel}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
