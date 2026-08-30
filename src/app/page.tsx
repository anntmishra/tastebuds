import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { LandingHero } from "@/components/landing-hero";

export default async function Home() {
  const session = await auth();
  if (session?.user && !session.error) redirect("/start");
  return <LandingHero />;
}
