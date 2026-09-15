import type { Metadata } from "next";
import { Syne, Manrope, JetBrains_Mono } from "next/font/google";
import "./launchpad.css";
import { Providers } from "./_components/Providers";
import { Nav } from "./_components/Nav";
import { ToastProvider } from "./_components/Toast";
import { RefCapture } from "./_components/RefCapture";
import { Suspense } from "react";
import Link from "next/link";
import { LINKS, SITE } from "./_lib/config";
import { CHAINS } from "./_lib/chains";

const syne = Syne({ subsets: ["latin"], weight: ["600", "700", "800"], variable: "--font-syne" });
const manrope = Manrope({ subsets: ["latin"], weight: ["500", "600", "700", "800"], variable: "--font-manrope" });
const jb = JetBrains_Mono({ subsets: ["latin"], weight: ["500", "700"], variable: "--font-jbmono" });

const DESC = "The launchpad for founders running AI agent businesses. One transaction launches your token on Robinhood Chain with liquidity locked forever. Holders are paid every Sunday.";
export const metadata: Metadata = {
  title: "Meme Maxxers Launchpad",
  description: DESC,
  openGraph: { title: "Meme Maxxers Launchpad", description: DESC, url: `${SITE}/launchpad`, siteName: "Meme Maxxers", type: "website" },
  twitter: { card: "summary_large_image", title: "Meme Maxxers Launchpad", description: DESC },
};

const ext = (h: string) => /^https?:/.test(h);
function FootLink({ href, children }: { href: string; children: React.ReactNode }) {
  return ext(href) ? <a href={href} target="_blank" rel="noreferrer">{children}</a> : <Link href={href}>{children}</Link>;
}

export default function LaunchpadLayout({ children }: { children: React.ReactNode }) {
  const rh = CHAINS.robinhood;
  const community = [["X / Twitter", LINKS.x], ["Discord", LINKS.discord], ["Telegram", LINKS.telegram]].filter(([, h]) => h);
  return (
    <div className={`mm ${syne.variable} ${manrope.variable} ${jb.variable}`}>
      <Providers>
        <ToastProvider>
          <Suspense fallback={null}><RefCapture /></Suspense>
          <Nav />
          <main className="wrap">{children}</main>
          <footer>
            <div className="wrap foot">
              <div className="foot-brand">
                <Link className="logo" href="/launchpad"><span className="cat">MM</span>Meme Maxxers</Link>
                <p className="muted" style={{ maxWidth: "34ch", fontSize: ".92rem" }}>Tokens for founders running AI agent businesses. Liquidity locked forever, fees split on-chain, holders paid every Sunday.</p>
                <span className="proto">Live on Robinhood Chain</span>
              </div>
              <div className="foot-col"><div className="eyebrow">Product</div>
                <Link href="/launchpad/explore">Explore</Link><Link href="/launchpad/launch">Launch a token</Link><Link href="/launchpad/incubate">Incubate</Link><Link href="/launchpad/profile">My profile</Link><Link href="/launchpad/updates">Build in public</Link>
              </div>
              <div className="foot-col"><div className="eyebrow">Resources</div>
                <FootLink href={LINKS.docs}>Docs</FootLink>
                {rh.factory && <a href={`${rh.explorer}/address/${rh.factory}`} target="_blank" rel="noreferrer">Factory contract ↗</a>}
                <Link href="/launchpad/docs#soft-staking">How Sunday payouts work</Link>
                <Link href="/launchpad/updates">Build log</Link>
              </div>
              <div className="foot-col"><div className="eyebrow">Community</div>
                {community.length ? community.map(([l, h]) => <a key={l} href={h} target="_blank" rel="noreferrer">{l} ↗</a>) : <span className="muted" style={{ fontSize: ".9rem" }}>Links coming soon.</span>}
              </div>
              <div className="foot-col"><div className="eyebrow">Legal</div>
                <Link href="/launchpad/terms">Terms of Use</Link>
                <Link href="/launchpad/privacy">Privacy</Link>
                <Link href="/launchpad/risk">Risk Notice</Link>
              </div>
            </div>
            <div className="wrap foot-bottom">
              <span>© {new Date().getFullYear()} Meme Maxxers</span>
              <span className="muted">Speculative assets. Not financial advice. Do your own research — <Link href="/launchpad/risk" style={{ textDecoration: "underline" }}>read the risk notice</Link>.</span>
            </div>
          </footer>
        </ToastProvider>
      </Providers>
    </div>
  );
}
