import type { Metadata } from "next";
import { SITE } from "../../../_lib/config";
import { MONTRA_API, hasIncubatorSplit, isAddr, isIncubated, type TokenDetail } from "../../../_lib/montra";

// Link previews for project pages. Only incubated projects get their name in the title; any other token gets a
// generic, non-indexed page so our domain can't be used to dress up someone else's token.
export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const { token } = await params;
  const generic: Metadata = { title: "Token on Montra · EARLY Incubator", robots: { index: false, follow: false } };
  if (!isAddr(token)) return generic;
  try {
    const r = await fetch(`${MONTRA_API}/api/tokens/${token.toLowerCase()}`, { next: { revalidate: 300 } });
    if (!r.ok) return generic;
    const d = (await r.json()) as TokenDetail;
    if (!isIncubated(d)) return generic;
    const title = `${d.name} ($${d.symbol}) · EARLY Incubator`;
    const description = hasIncubatorSplit(d)
      ? `${d.name} launched through EARLY on Montra · Elysium. Every trade funds daily buybacks for its community.`
      : `${d.name} on Montra · Elysium, part of the EARLY Incubator.`;
    const url = `${SITE}/incubator/elysium/p/${d.address.toLowerCase()}`;
    return { title, description, alternates: { canonical: url }, openGraph: { title, description, url, images: ["/incubator/og.png"] }, twitter: { card: "summary_large_image", title, description, images: ["/incubator/og.png"] } };
  } catch {
    return generic;
  }
}

export default function ProjectLayout({ children }: { children: React.ReactNode }) {
  return children;
}
