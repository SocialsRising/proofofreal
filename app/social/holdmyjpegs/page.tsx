import type { Metadata } from "next";

const L_URL = "https://proofofreal.app/social/holdmyjpegs";
const TITLE = "🏆 Hold My JPEGs — Leaderboard";
const DESC =
  "The Hold My JPEGs competition leaderboard. Hold your JPEGs, climb the ranks, split the prize pool. Rankings update daily.";

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
    images: [
      {
        url: "/social/holdmyjpegs/og-image.png",
        width: 1200,
        height: 630,
        alt: "Hold My JPEGs Leaderboard",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@mememaxxers",
    title: TITLE,
    description: DESC,
    images: ["/social/holdmyjpegs/og-image.png"],
  },
};

// Self-contained leaderboard in /public/social/holdmyjpegs/index.html, embedded
// full-screen so the clean route /social/holdmyjpegs serves it.
export default function Page() {
  return (
    <main
      style={{
        position: "fixed",
        inset: 0,
        background: "#0a0812",
        overflow: "hidden",
      }}
    >
      <iframe
        src="/social/holdmyjpegs/index.html"
        title="Hold My JPEGs Leaderboard"
        allow="clipboard-write"
        style={{ width: "100%", height: "100%", border: "none", display: "block" }}
      />
    </main>
  );
}
