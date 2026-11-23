import type { Metadata } from "next";

const TITLE = "JPEG Anvil · EARLY";
const DESC = "Forge tokens into NFTs and melt NFTs back into tokens at one fixed rate. Community from NFTs, liquidity from tokens, on Elysium.";
export const metadata: Metadata = {
  title: TITLE,
  description: DESC,
  openGraph: { title: TITLE, description: DESC, url: "/incubator/anvil", images: [{ url: "/incubator/og.png", width: 1200, height: 630, alt: "EARLY Incubator" }] },
  twitter: { card: "summary_large_image", title: TITLE, description: DESC, images: ["/incubator/og.png"] },
};

export default function AnvilLayout({ children }: { children: React.ReactNode }) {
  return children;
}
