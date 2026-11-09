import Link from "next/link";
import { Settings } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { navbarAppContent, ROUTES, siteConfig } from "@/lib/config";

type NavbarAppProps = {
  accountName: string;
  showUpgrade: boolean;
};

export function NavbarApp({ accountName, showUpgrade }: NavbarAppProps) {
  return (
    <header className="border-b">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-2 px-4 sm:px-6">
        <Link
          href={ROUTES.dashboard}
          className="font-semibold tracking-tight"
        >
          {siteConfig.name}
        </Link>
        <nav className="flex items-center gap-2">
          <span className="hidden max-w-48 truncate text-sm text-muted-foreground md:inline">
            {accountName}
          </span>
          {showUpgrade && (
            <Link
              href={ROUTES.plans}
              className={buttonVariants({ size: "sm" })}
            >
              {navbarAppContent.upgradeLabel}
            </Link>
          )}
          <Link
            href={ROUTES.settings}
            aria-label={navbarAppContent.settingsLabel}
            className={buttonVariants({ variant: "ghost", size: "sm" })}
          >
            <Settings />
            <span className="hidden sm:inline">{navbarAppContent.settingsLabel}</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}
