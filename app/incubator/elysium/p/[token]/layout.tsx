import type { Metadata } from "next";
import { MEME, SITE } from "../../../_lib/config";
import { MONTRA_API, hasIncubatorSplit, isAddr, isIncubated, isMemeLaunch, pctOf, type TokenDetail } from "../../../_lib/montra";

// Link previews for project pages. Only incubated projects get their name in the title; any other token gets a
// generic, non-indexed page so our domain can't be used to dress up someone else's token.
export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const { token } = await params;
  const generic: Metadata = { title: "Token on Elysium · EARLY Incubator", robots: { index: false, follow: false } };
  if (!isAddr(token)) return generic;
  const a = token.toLowerCase();
  const named = (name: string, symbol: string, description: string): Metadata => {
    const title = `${name} ($${symbol}) · EARLY Incubator`, url = `${SITE}/incubator/elysium/p/${a}`;
    return { title, description, alternates: { canonical: url }, openGraph: { title, description, url, images: ["/incubator/og.png"] }, twitter: { card: "summary_large_image", title, description, images: ["/incubator/og.png"] } };
  };
  try {
    const m = await fetch(`${MONTRA_API}/api/tokens/${a}`, { next: { revalidate: 300 } });
    if (m.ok) {
      const d = (await m.json()) as TokenDetail;
      if (d.recipientKind === "holders") {
        const pos = await fetch(`${MONTRA_API}/api/tokens/${a}/position/${MEME.treasury}`, { next: { revalidate: 300 } }).then((r) => r.json() as Promise<{ balance?: string }>).catch(() => null);
        if (isMemeLaunch(d, pctOf(pos?.balance, d.supply))) return named(d.name, d.symbol, `${d.name} ($${d.symbol}), a meme coin launched with EARLY on Montra · Elysium. 100% of trading fees go to holders.`);
      }
      if (!isIncubated(d)) return generic;
      return named(d.name, d.symbol, hasIncubatorSplit(d)
        ? `${d.name} launched through EARLY on Montra · Elysium. Every trade funds daily buybacks for its community.`
        : `${d.name} on Montra · Elysium, part of the EARLY Incubator.`);
    }
  } catch { /* fall through */ }
  return generic;
}

export default function ProjectLayout({ children }: { children: React.ReactNode }) {
  return children;
}
