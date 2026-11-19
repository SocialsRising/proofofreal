import type { Metadata } from "next";

const TITLE = "Launch a meme coin · EARLY Incubator";
const DESC = "Launch a meme coin on Montra with 100% of trading fees to holders, then get a 24-hour push from the Socials Rising network. Launching and trading earn Montra Season 2 airdrop points.";
export const metadata: Metadata = {
  title: TITLE,
  description: DESC,
  openGraph: { title: TITLE, description: DESC, url: "/incubator/elysium/meme", images: [{ url: "/incubator/og.png", width: 1200, height: 630, alt: "EARLY Incubator" }] },
  twitter: { card: "summary_large_image", title: TITLE, description: DESC, images: ["/incubator/og.png"] },
};

export default function MemeLayout({ children }: { children: React.ReactNode }) {
  return children;
}
