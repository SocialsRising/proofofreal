import type { Metadata } from "next";
import { gameMetadata } from "../gameMeta";

export const metadata: Metadata = gameMetadata({
  slug: "flyinghearts",
  title: "Flying Hearts",
  description:
    "60-second 3D runs through Tokyo, Singapore, Seoul and Da Nang with your Paper Hearts pilot. Thread the gates, flip for combos, boost through everything — then share your card.",
  twitterSite: "@mememaxxers",
});

// Self-contained Three.js 3D game in /public/games/flyinghearts/index.html (three.js vendored in ./vendor), embedded full-screen.
export default function Page() {
  return (
    <main style={{ position: "fixed", inset: 0, background: "#07060c", overflow: "hidden" }}>
      <iframe
        src="/games/flyinghearts/index.html"
        title="Flying Hearts"
        allow="autoplay; fullscreen; web-share; clipboard-write"
        style={{ width: "100%", height: "100%", border: "none", display: "block" }}
      />
    </main>
  );
}
