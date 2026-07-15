import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Black Bull Chase (BBC)",
  description: "Ride the Black Bull to Valhalla. Survive 60 seconds of the bull run.",
};

// Self-contained HTML5 canvas game in /public/games/ansem-bull-run/index.html,
// embedded full-screen (same pattern as Attack on Wemby).
export default function Page() {
  return (
    <main style={{ position: "fixed", inset: 0, background: "#05060f", overflow: "hidden" }}>
      <iframe
        src="/games/ansem-bull-run/index.html"
        title="Ansem Bull Run"
        allow="autoplay; fullscreen"
        style={{ width: "100%", height: "100%", border: "none", display: "block" }}
      />
    </main>
  );
}
