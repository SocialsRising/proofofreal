import type { Metadata } from "next";

const TITLE = "Genesis NFT Incubator · EARLY";
const DESC = "You bring the vision and the art. We help plan your genesis NFT campaign and amplify it. Live on Ethereum, Robinhood, Base and Elysium.";
export const metadata: Metadata = {
  title: TITLE,
  description: DESC,
  openGraph: { title: TITLE, description: DESC, url: "/incubator/genesis", images: [{ url: "/incubator/og.png", width: 1200, height: 630, alt: "EARLY Incubator" }] },
  twitter: { card: "summary_large_image", title: TITLE, description: DESC, images: ["/incubator/og.png"] },
};

export default function GenesisLayout({ children }: { children: React.ReactNode }) {
  return children;
}
