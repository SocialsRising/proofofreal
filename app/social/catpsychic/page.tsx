import type { Metadata } from "next";

const C_URL = "https://proofofreal.app/social/catpsychic";
const TITLE = "😼🔮 The Cat Psychic Is High AF — Cutie Cartel";
const DESC =
  "Enter your X handle. A suspiciously high cat psychic reads your past life, cursed future, the object haunting your room, and your luck for today — then transfer your curse to a friend. Spiritually accurate, financially useless.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESC,
  metadataBase: new URL("https://proofofreal.app"),
  alternates: { canonical: C_URL },
  openGraph: {
    type: "website",
    siteName: "proofofreal",
    url: C_URL,
    title: TITLE,
    description: DESC,
    images: [
      {
        url: "/social/catpsychic/og-image.png",
        width: 1200,
        height: 630,
        alt: "The Cat Psychic Is High AF",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@mememaxxers",
    title: TITLE,
    description: DESC,
    images: ["/social/catpsychic/og-image.png"],
  },
};

// Self-contained tool in /public/social/catpsychic/index.html, embedded full-screen
// so the clean route /social/catpsychic serves it (matches the wemby / quiz pattern).
export default function Page() {
  return (
    <main
      style={{
        position: "fixed",
        inset: 0,
        background: "#070b16",
        overflow: "hidden",
      }}
    >
      <iframe
        src="/social/catpsychic/index.html"
        title="The Cat Psychic Is High AF"
        allow="clipboard-read; clipboard-write"
        style={{ width: "100%", height: "100%", border: "none", display: "block" }}
      />
    </main>
  );
}
