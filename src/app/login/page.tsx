import type { Metadata } from "next";

import { FormLogin } from "@/components/auth/form-login";
import { NavbarPublic } from "@/components/layouts/navbar-public";
import { getSafeNextPath } from "@/lib/auth-redirect";
import { authContent, ROUTES } from "@/lib/config";

export const metadata: Metadata = {
  title: authContent.login.metaTitle,
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;

  const nextPath = getSafeNextPath(params.next, ROUTES.dashboard);
  const resetSuccess = params.reset === "success";

  const errorKey = Array.isArray(params.error) ? params.error[0] : params.error;
  const callbackError =
    errorKey && Object.hasOwn(authContent.callbackErrors, errorKey)
      ? authContent.callbackErrors[errorKey as keyof typeof authContent.callbackErrors]
      : null;

  return (
    <>
      <NavbarPublic />
      <main className="flex flex-1 items-center justify-center px-4 py-16 sm:px-6">
        <FormLogin
          nextPath={nextPath}
          resetSuccess={resetSuccess}
          callbackError={callbackError}
        />
      </main>
    </>
  );
}
