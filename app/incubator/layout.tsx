import type { Metadata } from "next";
import { Inter, Inter_Tight, JetBrains_Mono } from "next/font/google";
import Link from "next/link";
import "../launchpad/launchpad.css";
import "./incubator.css";
import { ToastProvider } from "../launchpad/_components/Toast";
import { IncNav } from "./_components/IncNav";
import { Providers } from "./_components/Providers";
import { BRAND, LINKS, PARENT, SITE } from "./_lib/config";

// Only the weights the design uses: headings 600, body 400/500/600, numbers 500.
const display = Inter_Tight({ subsets: ["latin"], weight: ["600"], variable: "--font-inc-display" });
const body = Inter({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-inc-body" });
const mono = JetBrains_Mono({ subsets: ["latin"], weight: ["500"], variable: "--font-jbmono" });

const TITLE = `${BRAND} · Launch with a team behind you`;
const DESC = "Launch your token through EARLY: the Socials Rising team and creators behind you, airdrop rewards for active holders, and daily buybacks from every trade. Live on Montra · Elysium.";
export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: TITLE,
  description: DESC,
  icons: { icon: [{ url: "/incubator/icon-64.png", sizes: "64x64", type: "image/png" }], apple: "/incubator/icon-180.png" },
  openGraph: { title: TITLE, description: DESC, url: `${SITE}/incubator/elysium`, siteName: BRAND, type: "website", images: [{ url: "/incubator/og.png", width: 1200, height: 630, alt: "EARLY Incubator" }] },
  twitter: { card: "summary_large_image", title: TITLE, description: DESC, images: ["/incubator/og.png"], site: "@socialsrising" },
};

export default function IncubatorLayout({ children }: { children: React.ReactNode }) {
  const cols: [string, [string, string, boolean?][]][] = [
    ["Incubator", [["Launch a token", "/incubator/elysium/launch", true], ["Launch a meme coin", "/incubator/elysium/launch?template=meme", true], ["Genesis NFT incubator", "/incubator/genesis", true], ["JPEG Anvil", "/incubator/anvil", true], ["Trade on Olympus", "/incubator/olympus", true], ["What you get", "/incubator/elysium#perks", true], ["Where fees go", "/incubator/elysium#fees", true], ["Projects", "/incubator/elysium#projects", true]]],
    ["EARLY", [["$EARLY", LINKS.earlyToken, true], ["Early Birds NFTs", LINKS.earlyBirds, true], ["Why we built EARLY", LINKS.article]]],
    ["Community", [["Telegram", LINKS.telegram], ["X · @socialsrising", LINKS.x], ["Discord", LINKS.discord], ["Help · @Tradesgiving", LINKS.helpTelegram]]],
  ];
  return (
    <div className={`mm inc ${display.variable} ${body.variable} ${mono.variable}`}>
      <Providers>
        <ToastProvider>
          <IncNav />
          <main className="wrap">{children}</main>
          <footer>
            <div className="wrap foot">
              <div className="foot-brand">
                <Link className="logo" href="/incubator/elysium"><img className="mark" src="/incubator/early-mark.png" alt="" width={30} height={30} /><span className="word">EARLY</span><span className="sub">Incubator</span></Link>
                <p className="muted" style={{ maxWidth: "34ch", fontSize: ".92rem" }}>Launch with the {PARENT} team behind you. Every trade funds daily buybacks for your community.</p>
              </div>
              {cols.map(([head, links]) => (
                <div key={head} className="foot-col"><div className="eyebrow">{head}</div>
                  {links.map(([l, h, internal]) => internal
                    ? <Link key={l} href={h}>{l}</Link>
                    : <a key={l} href={h} target="_blank" rel="noopener noreferrer">{l} ↗</a>)}
                </div>
              ))}
            </div>
            <div className="wrap foot-bottom">
              <span>© {new Date().getFullYear()} {BRAND} · by {PARENT}</span>
              <span className="muted">Tokens are launched by their creators on third-party launchpads. Crypto is speculative and risky; nothing here is financial advice. Rewards depend on trading volume and no return or listing is promised. Elysium is a new network that its operators may pause or change.</span>
            </div>
          </footer>
        </ToastProvider>
      </Providers>
    </div>
  );
}
