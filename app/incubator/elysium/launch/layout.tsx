import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Launch a token · EARLY Incubator",
  description: "Launch on Montra through EARLY: a utility token whose fees fund community buybacks, or a meme coin with 100% of fees to holders and a 24-hour push.",
};

export default function LaunchLayout({ children }: { children: React.ReactNode }) {
  return children;
}
