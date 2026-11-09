import type { Metadata } from "next";

import { FormForgotPassword } from "@/components/auth/form-forgot-password";
import { NavbarPublic } from "@/components/layouts/navbar-public";
import { authContent } from "@/lib/config";

export const metadata: Metadata = {
  title: authContent.forgotPassword.metaTitle,
};

export default function ForgotPasswordPage() {
  return (
    <>
      <NavbarPublic />
      <main className="flex flex-1 items-center justify-center px-4 py-16 sm:px-6">
        <FormForgotPassword />
      </main>
    </>
  );
}
