import type { Metadata } from "next";
import { gameMetadata } from "../gameMeta";

export const metadata: Metadata = gameMetadata({
  slug: "flyinghearts",
  title: "Flying Hearts",
  description:
    "Fly a Roadster over Tokyo, Singapore, Seoul and Da Nang. Hold to fly, flip for combos, boost through everything — then share your card and tag $IMD.",
  twitterSite: "@mememaxxers",
});

// Self-contained HTML5 canvas game in /public/games/flyinghearts/index.html, embedded full-screen.
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
