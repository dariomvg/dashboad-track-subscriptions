import { Hero } from "@/components/landing/hero";
import { NavbarPublic } from "@/components/layouts/navbar-public";


export default async function HomePage() {

  return (
    <>
      <NavbarPublic />
      <main className="flex-1">
        <Hero />
      </main>
    </>
  );
}