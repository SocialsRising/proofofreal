import type { Metadata } from "next";
import { gameMetadata } from "../gameMeta";

export const metadata: Metadata = gameMetadata({
  slug: "catnipcartel",
  title: "Catnip Cartel",
  description:
    "60 seconds. Move fake product to ridiculous customers, dodge undercover cops, mimics and FBI raids, and cash out before the 5-paw wanted meter maxes. A Cutie Kitties degen street-hustle parody.",
  twitterSite: "@mememaxxers",
});

// Self-contained HTML5 canvas game in /public/games/catnipcartel/index.html, embedded full-screen.
export default function Page() {
  return (
    <main style={{ position: "fixed", inset: 0, background: "#0a0812", overflow: "hidden" }}>
      <iframe
        src="/games/catnipcartel/index.html"
        title="Cutie Cartel"
        allow="autoplay; fullscreen"
        style={{ width: "100%", height: "100%", border: "none", display: "block" }}
      />
    </main>
  );
}
