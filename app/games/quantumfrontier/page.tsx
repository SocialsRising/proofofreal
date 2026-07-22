import type { Metadata } from "next";
import { gameMetadata } from "../gameMeta";

export const metadata: Metadata = gameMetadata({
  slug: "quantumfrontier",
  title: "Quantum Frontier",
  description:
    "Fly the galaxy, discover Abstract partner projects, and climb the leaderboard. Flap through the portals — can you handle the frontier?",
  twitterSite: "@mememaxxers",
});

// Self-contained HTML5 canvas game in /public/games/quantumfrontier/index.html, embedded full-screen.
export default function Page() {
  return (
    <main style={{ position: "fixed", inset: 0, background: "#05030f", overflow: "hidden" }}>
      <iframe
        src="/games/quantumfrontier/index.html"
        title="Quantum Frontier"
        allow="autoplay; fullscreen"
        style={{ width: "100%", height: "100%", border: "none", display: "block" }}
      />
    </main>
  );
}
