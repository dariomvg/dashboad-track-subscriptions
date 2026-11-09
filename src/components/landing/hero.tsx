import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { heroContent, ROUTES } from "@/lib/config";

export function Hero() {
  return (
    <section className="mx-auto flex w-full max-w-6xl flex-col items-center gap-12 px-4 py-16 text-center sm:px-6 sm:py-24">
      <div className="flex max-w-3xl flex-col items-center gap-6">
        <Badge variant="secondary">{heroContent.eyebrow}</Badge>
        <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
          {heroContent.title}
        </h1>
        <p className="max-w-2xl text-lg text-balance text-muted-foreground">
          {heroContent.description}
        </p>
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
          <Link
            href={ROUTES.login}
            className={buttonVariants({ size: "lg" })}
          >
            {heroContent.primaryCta}
          </Link>
          <Link
            href={heroContent.secondaryCta.href}
            className={buttonVariants({ size: "lg", variant: "outline" })}
          >
            {heroContent.secondaryCta.label}
          </Link>
        </div>
      </div>

      <ul className="grid w-full gap-4 sm:grid-cols-3">
        {heroContent.highlights.map((highlight) => (
          <li
            key={highlight.title}
            className="flex flex-col items-center gap-2 rounded-xl border bg-card p-6 text-center"
          >
            <span className="flex size-10 items-center justify-center rounded-lg bg-accent text-accent-foreground">
              <highlight.icon className="size-5" />
            </span>
            <h2 className="font-medium">{highlight.title}</h2>
            <p className="text-sm text-muted-foreground">
              {highlight.description}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
