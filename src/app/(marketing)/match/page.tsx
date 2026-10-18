import type { Metadata } from "next";
import { MatchFinder } from "@/components/marketing/MatchFinder";

export const metadata: Metadata = {
  title: "AI Match",
  description:
    "Find homes that fit your budget, preferred location, and requirements with WALE AI Match.",
};

export default function MatchPage() {
  return <MatchFinder />;
}
