import type { Metadata } from "next";

import { FormSignup } from "@/components/auth/form-signup";
import { NavbarPublic } from "@/components/layouts/navbar-public";
import { authContent } from "@/lib/config";

export const metadata: Metadata = {
  title: authContent.signup.metaTitle,
};

export default function SignupPage() {
  return (
    <>
      <NavbarPublic />
      <main className="flex flex-1 items-center justify-center px-4 py-16 sm:px-6">
        <FormSignup />
      </main>
    </>
  );
}
