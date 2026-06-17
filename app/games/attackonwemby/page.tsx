import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Attack on Wemby",
  description: "Save NYC from the alien Wemby Titan in 60 seconds.",
};

// The game is a self-contained HTML5 canvas app living in
// /public/games/attackonwemby/index.html. We embed it full-screen here so
// the clean route /games/attackonwemby serves it (matches the eth-ddr pattern).
export default function Page() {
  return (
    <main
      style={{
        position: "fixed",
        inset: 0,
        background: "#05010f",
        overflow: "hidden",
      }}
    >
      <iframe
        src="/games/attackonwemby/index.html"
        title="Attack on Wemby"
        allow="autoplay; fullscreen"
        style={{ width: "100%", height: "100%", border: "none", display: "block" }}
      />
    </main>
  );
}
