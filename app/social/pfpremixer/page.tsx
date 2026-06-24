import type { Metadata } from "next";

const REMIX_URL = "https://proofofreal.app/social/pfpremixer";
const TITLE = "JPEG JOKERS — PFP Remixer 🃏";
const DESC =
  "Drop your image, pick from 50 expressions + chrome/gold/glitch/blackout frames, and mint your face into a JPEG JOKERS Genesis card. Tag @mememaxxers.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESC,
  metadataBase: new URL("https://proofofreal.app"),
  alternates: { canonical: REMIX_URL },
  openGraph: {
    type: "website",
    siteName: "proofofreal",
    url: REMIX_URL,
    title: TITLE,
    description: DESC,
    images: [
      {
        url: "/social/pfpremixer/og-image.png",
        width: 1200,
        height: 630,
        alt: "JPEG JOKERS PFP Remixer",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@mememaxxers",
    title: TITLE,
    description: DESC,
    images: ["/social/pfpremixer/og-image.png"],
  },
};

// Self-contained tool in /public/social/pfpremixer/index.html, embedded full-screen
// so the clean route /social/pfpremixer serves it (matches the wemby / quiz pattern).
export default function Page() {
  return (
    <main
      style={{
        position: "fixed",
        inset: 0,
        background: "#06070a",
        overflow: "hidden",
      }}
    >
      <iframe
        src="/social/pfpremixer/index.html"
        title="JPEG JOKERS PFP Remixer"
        allow="clipboard-read; clipboard-write"
        style={{ width: "100%", height: "100%", border: "none", display: "block" }}
      />
    </main>
  );
}
