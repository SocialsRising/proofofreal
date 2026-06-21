import type { Metadata } from "next";

const QUIZ_URL = "https://proofofreal.app/social/horrorvillainquiz";
const TITLE = "Which Horror Timeline Monster Are You? 🔪";
const DESC =
  "15 cursed questions. 20 monsters. Find out which classic & modern horror archetype haunts your timeline — then post your card & tag @mememaxxers.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESC,
  metadataBase: new URL("https://proofofreal.app"),
  alternates: { canonical: QUIZ_URL },
  openGraph: {
    type: "website",
    siteName: "proofofreal",
    url: QUIZ_URL,
    title: TITLE,
    description: DESC,
    images: [
      {
        url: "/social/horrorvillainquiz/og-image.png",
        width: 1200,
        height: 630,
        alt: "Which Horror Timeline Monster Are You?",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@mememaxxers",
    title: TITLE,
    description: DESC,
    images: ["/social/horrorvillainquiz/og-image.png"],
  },
};

// The quiz is a self-contained HTML app living in
// /public/social/horrorvillainquiz/index.html. We embed it full-screen here so
// the clean route /social/horrorvillainquiz serves it (matches the wemby pattern).
export default function Page() {
  return (
    <main
      style={{
        position: "fixed",
        inset: 0,
        background: "#070708",
        overflow: "hidden",
      }}
    >
      <iframe
        src="/social/horrorvillainquiz/index.html"
        title="Horror Timeline Monster Quiz"
        allow="clipboard-write"
        style={{ width: "100%", height: "100%", border: "none", display: "block" }}
      />
    </main>
  );
}
