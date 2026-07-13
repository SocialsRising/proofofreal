import type { Metadata } from "next";

const SCAN_URL = "https://proofofreal.app/social/handsomescanner";
const TITLE = "🤫 Handsome Analyzer — can your aura compete with Ansem?";
const DESC =
  "Upload your PFP, get scanned by Robinhood AI, and reveal your Handsome Index — aura, jawline, drip, mog coefficient. Spoiler: Ansem is still 104%. Tag @mememaxxers.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESC,
  metadataBase: new URL("https://proofofreal.app"),
  alternates: { canonical: SCAN_URL },
  openGraph: {
    type: "website",
    siteName: "proofofreal",
    url: SCAN_URL,
    title: TITLE,
    description: DESC,
    images: [
      {
        url: "/social/handsomescanner/og-image.png",
        width: 1200,
        height: 630,
        alt: "Handsome Analyzer",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@mememaxxers",
    title: TITLE,
    description: DESC,
    images: ["/social/handsomescanner/og-image.png"],
  },
};

// Self-contained tool in /public/social/handsomescanner/index.html, embedded full-screen
// so the clean route /social/handsomescanner serves it (matches the wemby / quiz pattern).
export default function Page() {
  return (
    <main
      style={{
        position: "fixed",
        inset: 0,
        background: "#04070a",
        overflow: "hidden",
      }}
    >
      <iframe
        src="/social/handsomescanner/index.html"
        title="Handsome Analyzer"
        allow="clipboard-read; clipboard-write"
        style={{ width: "100%", height: "100%", border: "none", display: "block" }}
      />
    </main>
  );
}
