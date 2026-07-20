import type { Metadata } from "next";

const Q_URL = "https://proofofreal.app/social/quantumadventure";
const TITLE = "🌌 Quantum Adventure — Which Quantum Role are you?";
const DESC =
  "Enter the Quantum Frontier: portals, alien markets, rogue AI. Make choices across an interdimensional adventure and discover your Quantum Role. Quantum Queens · @mememaxxers × @abstractchain.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESC,
  metadataBase: new URL("https://proofofreal.app"),
  alternates: { canonical: Q_URL },
  openGraph: {
    type: "website",
    siteName: "proofofreal",
    url: Q_URL,
    title: TITLE,
    description: DESC,
    images: [
      {
        url: "/social/quantumadventure/og-image.png",
        width: 1200,
        height: 630,
        alt: "Quantum Adventure",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@mememaxxers",
    title: TITLE,
    description: DESC,
    images: ["/social/quantumadventure/og-image.png"],
  },
};

// Self-contained tool in /public/social/quantumadventure/index.html, embedded full-screen
// so the clean route /social/quantumadventure serves it (matches the wemby / quiz pattern).
export default function Page() {
  return (
    <main
      style={{
        position: "fixed",
        inset: 0,
        background: "#0a0618",
        overflow: "hidden",
      }}
    >
      <iframe
        src="/social/quantumadventure/index.html"
        title="Quantum Adventure"
        allow="clipboard-read; clipboard-write"
        style={{ width: "100%", height: "100%", border: "none", display: "block" }}
      />
    </main>
  );
}
