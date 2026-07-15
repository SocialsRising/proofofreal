import type { Metadata } from "next";
import { gameMetadata } from "../gameMeta";

export const metadata: Metadata = gameMetadata({
  slug: "blackbullchase",
  title: "Black Bull Chase (BBC)",
  description:
    "Ride the Black Bull to Valhalla. Survive 60 seconds — dodge the bears, outrun liquidation, grab King Mode. Can you handle the BBC?",
  twitterSite: "@ansemishandsome",
});

// Self-contained HTML5 canvas game in /public/games/blackbullchase/index.html, embedded full-screen.
export default function Page() {
  return (
    <main style={{ position: "fixed", inset: 0, background: "#05060f", overflow: "hidden" }}>
      <iframe
        src="/games/blackbullchase/index.html"
        title="Black Bull Chase"
        allow="autoplay; fullscreen"
        style={{ width: "100%", height: "100%", border: "none", display: "block" }}
      />
    </main>
  );
}
