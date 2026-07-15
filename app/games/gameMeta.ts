import type { Metadata } from "next";

/**
 * Reusable share/preview metadata for games under /games/<slug>.
 * Drop a 1200x630 image at /public/games/<slug>/og.png and call this from
 * the game's page.tsx — every shared link then renders a big preview card on
 * X / iMessage / Discord. This is the pattern for ALL future games.
 */
const BASE = "https://proofofreal.app";

export function gameMetadata(opts: {
  slug: string;            // folder name, e.g. "blackbullchase"
  title: string;
  description: string;
  twitterSite?: string;    // e.g. "@ansemishandsome"
}): Metadata {
  const url = `${BASE}/games/${opts.slug}`;
  const image = `${url}/og.png`;
  return {
    metadataBase: new URL(BASE),
    title: opts.title,
    description: opts.description,
    openGraph: {
      title: opts.title,
      description: opts.description,
      url,
      siteName: "Proof of Real",
      type: "website",
      images: [{ url: image, width: 1200, height: 630, alt: opts.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: opts.title,
      description: opts.description,
      images: [image],
      ...(opts.twitterSite ? { site: opts.twitterSite, creator: opts.twitterSite } : {}),
    },
  };
}
