import type { Metadata } from "next";
import { Syne, Manrope, JetBrains_Mono } from "next/font/google";
import Link from "next/link";
import "../launchpad/launchpad.css";
import "./incubator.css";
import { Providers } from "../launchpad/_components/Providers";
import { ToastProvider } from "../launchpad/_components/Toast";
import { IncNav } from "./_components/IncNav";
import { BRAND, LINKS, PARENT, SITE } from "./_lib/config";

const syne = Syne({ subsets: ["latin"], weight: ["600", "700", "800"], variable: "--font-syne" });
const manrope = Manrope({ subsets: ["latin"], weight: ["500", "600", "700", "800"], variable: "--font-manrope" });
const jb = JetBrains_Mono({ subsets: ["latin"], weight: ["500", "700"], variable: "--font-jbmono" });

const DESC = "Launch your token through EARLY. Every trading fee funds daily buybacks for your community, run by our AI agent swarm. Live on Montra · Elysium.";
export const metadata: Metadata = {
  title: `${BRAND} · Elysium`,
  description: DESC,
  openGraph: { title: `${BRAND} · Elysium`, description: DESC, url: `${SITE}/incubator/elysium`, siteName: BRAND, type: "website" },
  twitter: { card: "summary_large_image", title: `${BRAND} · Elysium`, description: DESC },
};

export default function IncubatorLayout({ children }: { children: React.ReactNode }) {
  const community = [["Telegram", LINKS.telegram], ["X", LINKS.x], ["Discord", LINKS.discord]].filter(([, h]) => h);
  const ecosystem = [["$EARLY", LINKS.earlyToken], ["Early Birds NFTs", LINKS.earlyBirds]];
  return (
    <div className={`mm inc ${syne.variable} ${manrope.variable} ${jb.variable}`}>
      <Providers>
        <ToastProvider>
          <IncNav />
          <main className="wrap">{children}</main>
          <footer>
            <div className="wrap foot">
              <div className="foot-brand">
                <Link className="logo" href="/incubator/elysium"><span className="cat">E</span>{BRAND}</Link>
                <p className="muted" style={{ maxWidth: "36ch", fontSize: ".92rem" }}>Launch your token through EARLY. Trading fees fund daily buybacks for your community, run by our AI agent swarm.</p>
                <span className="proto">Elysium · by {PARENT}</span>
              </div>
              <div className="foot-col"><div className="eyebrow">Incubator</div>
                <Link href="/incubator/elysium">Directory</Link><Link href="/incubator/elysium/launch">Launch a token</Link><Link href="/incubator/elysium#how">How it works</Link>
              </div>
              <div className="foot-col"><div className="eyebrow">EARLY</div>
                {ecosystem.map(([l, h]) => <a key={l} href={h} target="_blank" rel="noopener noreferrer">{l} ↗</a>)}
                <Link href="/incubator/elysium#fees">Fee wallets</Link>
              </div>
              <div className="foot-col"><div className="eyebrow">Community</div>
                {community.map(([l, h]) => <a key={l} href={h} target="_blank" rel="noopener noreferrer">{l} ↗</a>)}
                <a href={LINKS.helpTelegram} target="_blank" rel="noopener noreferrer">Help: @Tradesgiving ↗</a>
              </div>
            </div>
            <div className="wrap foot-bottom">
              <span>© {new Date().getFullYear()} {BRAND}</span>
              <span className="muted">Tokens are launched by their creators on third-party launchpads. Speculative and risky; not financial advice. Elysium is a new network that its operators may pause or change. No airdrop, listing or return is promised.</span>
            </div>
          </footer>
        </ToastProvider>
      </Providers>
    </div>
  );
}
