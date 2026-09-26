import type { Metadata } from "next";

const L_URL = "https://proofofreal.app/social/creditsleaderboard";
const TITLE = "Credits Leaderboard — Meme Maxxers";
const DESC =
  "Uniting the Jack Butcher Credits & Statements community. Opt in, post about Credits on X, contribute in Discord — the weekly top 100 split $JACKOFF.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESC,
  metadataBase: new URL("https://proofofreal.app"),
  alternates: { canonical: L_URL },
  openGraph: {
    type: "website",
    siteName: "proofofreal",
    url: L_URL,
    title: TITLE,
    description: DESC,
  },
  twitter: {
    card: "summary",
    site: "@mememaxxers",
    title: TITLE,
    description: DESC,
  },
};

// Self-contained leaderboard in /public/social/creditsleaderboard/index.html, embedded
// full-screen so the clean route /social/creditsleaderboard serves it.
// Weekly rankings live in the CONFIG / TIERS / WEEKS block at the top of that file.
export default function Page() {
  return (
    <main
      style={{
        position: "fixed",
        inset: 0,
        background: "#050505",
        overflow: "hidden",
      }}
    >
      <iframe
        src="/social/creditsleaderboard/index.html"
        title="Credits Leaderboard"
        allow="clipboard-write"
        style={{ width: "100%", height: "100%", border: "none", display: "block" }}
      />
    </main>
  );
}
