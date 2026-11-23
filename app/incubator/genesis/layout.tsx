import type { Metadata } from "next";

const TITLE = "Genesis NFT Incubator · EARLY";
const DESC = "Mint your genesis NFT collection with a community on day one: EARLY + Early Birds holders, creators, bounties and amplification. Then launch your token through EARLY.";
export const metadata: Metadata = {
  title: TITLE,
  description: DESC,
  openGraph: { title: TITLE, description: DESC, url: "/incubator/genesis", images: [{ url: "/incubator/og.png", width: 1200, height: 630, alt: "EARLY Incubator" }] },
  twitter: { card: "summary_large_image", title: TITLE, description: DESC, images: ["/incubator/og.png"] },
};

export default function GenesisLayout({ children }: { children: React.ReactNode }) {
  return children;
}
