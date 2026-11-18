import type { Metadata } from "next";
import { Cinzel } from "next/font/google";
import "./olympus.css";

const cinzel = Cinzel({ subsets: ["latin"], weight: ["600", "700"], variable: "--font-cinzel" });

const TITLE = "Olympus · the EARLY trading terminal";
const DESC = "Trade EARLY and its incubated projects first, then anything on Elysium — routed by Kalos for the best price.";
export const metadata: Metadata = {
  title: TITLE,
  description: DESC,
  openGraph: { title: TITLE, description: DESC, images: [{ url: "/olympus/og.png", width: 1200, height: 630, alt: "Olympus" }] },
  twitter: { card: "summary_large_image", title: TITLE, description: DESC, images: ["/olympus/og.png"] },
};

export default function OlympusLayout({ children }: { children: React.ReactNode }) {
  return <div className={`oly ${cinzel.variable}`}>{children}</div>;
}
