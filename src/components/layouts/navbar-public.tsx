import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { navbarContent, ROUTES, siteConfig } from "@/lib/config";

export function NavbarPublic() {
  return (
    <header className="border-b">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link
          href={ROUTES.home}
          className="font-semibold tracking-tight"
        >
          {siteConfig.name}
        </Link>
        <nav className="flex items-center gap-2">
          <Link
            href={ROUTES.plans}
            className={buttonVariants({ variant: "ghost", size: "sm" })}
          >
            {navbarContent.plansLabel}
          </Link>
          <Link
            href={ROUTES.login}
            className={buttonVariants({ size: "sm" })}
          >
            {navbarContent.signInLabel}
          </Link>
        </nav>
      </div>
    </header>
  );
}
