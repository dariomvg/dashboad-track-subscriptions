"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LoaderCircle, LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import { signOutAction } from "@/lib/auth/supabase/basic-auth/actions";
import { ROUTES, settingsContent } from "@/lib/config";

export function ButtonSignOut() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleClick() {
    setPending(true);
    await signOutAction();
    router.replace(ROUTES.home);
    router.refresh();
  }

  return (
    <Button variant="outline" onClick={handleClick} disabled={pending}>
      {pending ? <LoaderCircle className="animate-spin" /> : <LogOut />}
      {pending ? settingsContent.account.signingOutLabel : settingsContent.account.signOutLabel}
    </Button>
  );
}
