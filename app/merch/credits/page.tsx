import type { Metadata } from "next";
import { Inter_Tight } from "next/font/google";
import { Store } from "./Store";
import { COLLECTION } from "./_lib/config";
import "./merch.css";

const font = Inter_Tight({ subsets: ["latin"], weight: ["500", "700", "800"], variable: "--font-mx" });

const URL_ = "https://proofofreal.app/merch/credits";
const TITLE = `Credits Merch — ${COLLECTION}`;
const DESC = "Custom Credits merch by Meme Maxxers. Put your favorite Jack Butcher meme, Credit or Statement on a tee, hoodie, poster and more. 100% of profits buy Credits off the floor.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESC,
  metadataBase: new URL("https://proofofreal.app"),
  alternates: { canonical: URL_ },
  openGraph: { type: "website", siteName: "proofofreal", url: URL_, title: TITLE, description: DESC },
  twitter: { card: "summary", site: "@mememaxxers", title: TITLE, description: DESC },
};

export default function Page() {
  return <div className={`mx ${font.variable}`}><Store /></div>;
}
