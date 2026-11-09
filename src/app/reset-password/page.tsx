import type { Metadata } from "next";

import { FormResetPassword } from "@/components/auth/form-reset-password";
import { NavbarPublic } from "@/components/layouts/navbar-public";
import { requireAuth } from "@/lib/auth/supabase/basic-auth/actions";
import { authContent, ROUTES } from "@/lib/config";

export const metadata: Metadata = {
  title: authContent.resetPassword.metaTitle,
};

export default async function ResetPasswordPage() {
  await requireAuth(ROUTES.forgotPassword);

  return (
    <>
      <NavbarPublic />
      <main className="flex flex-1 items-center justify-center px-4 py-16 sm:px-6">
        <FormResetPassword />
      </main>
    </>
  );
}
