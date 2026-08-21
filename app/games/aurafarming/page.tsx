import type { Metadata } from "next";
import { gameMetadata } from "../gameMeta";

export const metadata: Metadata = gameMetadata({
  slug: "aurafarming",
  title: "Aura Farming",
  description:
    "60 seconds to farm as much AURA as possible. Match NFTs in a Candy-Crush-style board, chain combos, pop bombs and crowns, and grow a rare plant. An Adam's Aura mint game.",
  twitterSite: "@mememaxxers",
});

// Self-contained HTML5 canvas game in /public/games/aurafarming/index.html, embedded full-screen.
export default function Page() {
  return (
    <main style={{ position: "fixed", inset: 0, background: "#0d0618", overflow: "hidden" }}>
      <iframe
        src="/games/aurafarming/index.html"
        title="Aura Farming"
        allow="autoplay; fullscreen"
        style={{ width: "100%", height: "100%", border: "none", display: "block" }}
      />
    </main>
  );
}
