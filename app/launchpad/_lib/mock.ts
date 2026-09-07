import type { GameNight, LaunchToken } from "./types";

const ex = (o: Partial<LaunchToken> & Pick<LaunchToken, "address" | "name" | "symbol" | "creator" | "creatorFee" | "split" | "lockPct" | "lockDays" | "example">): LaunchToken => ({
  chainId: 8453, devBuyEth: 0, socials: {}, createdAt: "2026-09-02T00:00:00Z", ...o,
});

/** Example tokens shown until real launches exist. Marked as examples in the UI. */
export const EXAMPLE_TOKENS: LaunchToken[] = [
  ex({ address: "lmeow", name: "LMEOW", symbol: "LMEOW", creator: "memeMaxxers.eth", creatorFee: 4, split: "community", lockPct: 7.8, lockDays: 180,
    description: "LMEOW is the first token launched through this launchpad and the live case study for it. Meme Maxxers run weekly game nights, sponsors put up prizes, and builders ship AI-generated games around a shared token.",
    socials: { x: "lmeow", web: "lmeow.gg", chat: "t.me/lmeowgames" }, gameName: "Cat Royale",
    example: { holders: 2184, vol24: 184200, mcap: 2410000, change: 12.4, stakedPct: 31.4, rewardsEth: 9.42, apr: 38, tagline: "Weekly multiplayer game nights. Play, win, get paid.", gameKind: "Multiplayer arena · 16 players" } }),
  ex({ address: "pixl", name: "Pixel Pals", symbol: "PIXL", creator: "pixelpals.base.eth", creatorFee: 3, split: "equal", lockPct: 5, lockDays: 90,
    description: "A retro pixel-art IP community giving its fans a sub-economy. Skins and lobbies unlock with PIXL.", socials: { x: "pixelpals" }, gameName: "Pals Dungeon",
    example: { holders: 640, vol24: 32800, mcap: 410000, change: -3.1, stakedPct: 18.2, rewardsEth: 1.12, apr: 22, tagline: "Co-op pixel dungeon for a retro art community.", gameKind: "Co-op dungeon · 4 players" } }),
  ex({ address: "dngn", name: "Dungeo", symbol: "DNGN", creator: "0x8f2a…c41e", creatorFee: 2, split: "diamond", lockPct: 10, lockDays: 180,
    description: "A text-and-tiles roguelike where an AI runs the dungeon. Party tickets are paid in DNGN.", socials: { x: "dungeo_game", chat: "t.me/dungeo" }, gameName: "Dungeo",
    example: { holders: 312, vol24: 12100, mcap: 150000, change: 41, stakedPct: 44.9, rewardsEth: 0.44, apr: 61, tagline: "AI dungeon master. Bring your party.", gameKind: "Roguelike · 5 players" } }),
  ex({ address: "bonk", name: "Bonkball", symbol: "BONK", creator: "bonkboss.eth", creatorFee: 4, split: "equal", lockPct: 0, lockDays: 0,
    description: "A meme community that wanted something to actually do together on Fridays.", socials: { x: "bonkball" }, gameName: "Bonkball",
    example: { holders: 1020, vol24: 58900, mcap: 620000, change: 5.5, stakedPct: 6.1, rewardsEth: 2.05, apr: 17, tagline: "Dodgeball, but the ball is a meme.", gameKind: "Party game · 8 players" } }),
  ex({ address: "orbt", name: "Orbital", symbol: "ORBT", creator: "orbitalstudio.eth", creatorFee: 1, split: "community", lockPct: 12, lockDays: 180,
    description: "A physics puzzler by a two-person studio. Weekly courses, community-designed levels.", socials: { web: "orbital.games" }, gameName: "Orbital",
    example: { holders: 228, vol24: 6400, mcap: 88000, change: -1.2, stakedPct: 27.7, rewardsEth: 0.21, apr: 29, tagline: "Gravity golf across a shared solar system.", gameKind: "Physics puzzle · async" } }),
  ex({ address: "mosh", name: "Moshpit", symbol: "MOSH", creator: "moshpit.eth", creatorFee: 3, split: "community", lockPct: 4, lockDays: 30,
    description: "A music NFT collective giving holders a rhythm game and a reason to show up every week.", socials: { x: "moshpitwav" },
    example: { holders: 410, vol24: 9900, mcap: 120000, change: 8.8, stakedPct: 12.3, rewardsEth: 0.33, apr: 24, tagline: "Rhythm brawler for a music collective." } }),
];

export const EXAMPLE_NIGHTS: GameNight[] = [
  { id: "n1", token: "lmeow", title: "LMEOW Game Night #2 — Cat Royale", when: "Fri Sep 11 · 6:00 PM PT", day: "11", mon: "SEP", status: "upcoming", prize: "250,000 LMEOW + 0.2 ETH", sponsor: "Bankr", players: 64, leaderboard: [] },
  { id: "n2", token: "pixl", title: "Pals Dungeon Speedrun", when: "Sat Sep 12 · 11:00 AM PT", day: "12", mon: "SEP", status: "upcoming", prize: "100,000 PIXL", players: 32, leaderboard: [] },
  { id: "n0", token: "lmeow", title: "LMEOW Game Night #1 — Cat Royale", when: "Fri Sep 4 · 6:00 PM PT", day: "04", mon: "SEP", status: "done", prize: "200,000 LMEOW", players: 41,
    leaderboard: [{ n: "whiskerwin.eth", s: "12 KOs", r: "80,000 LMEOW" }, { n: "0x4b…19aa", s: "9 KOs", r: "50,000 LMEOW" }, { n: "nyanlord.base.eth", s: "8 KOs", r: "30,000 LMEOW" }, { n: "catnipdan", s: "7 KOs", r: "20,000 LMEOW" }, { n: "0x77…e0c2", s: "6 KOs", r: "20,000 LMEOW" }] },
];

export const UPDATES = [
  { w: "Week 1", built: "Prototype of every page. Fee presets, staking multipliers, founder lock + dev buy, share cards. Restyled to chrome.", learned: "Nobody reads tokenomics. Everybody reads \"founder locked 7.8% for 180 days.\"", next: "Wire the launch page to Clanker on Base Sepolia. Launch LMEOW for real." },
  { w: "Week 2", built: "Real wallet connect. Real launches through Clanker v4 on Base Sepolia: fees, creator/staker split, founder vault and dev buy all in one transaction. Token pages read the chain.", learned: "Clanker fixes supply at 100B, so percentages are the language, not token counts.", next: "Mainnet. LMEOW launch. Staking lock contract + first weekly ETH drop." },
];

export const PALETTES: Record<string, [string, string, string]> = {
  LMEOW: ["#F5F5F7", "#8F93A1", "#2A2A33"], PIXL: ["#9AA4FF", "#4A4F7A", "#14162A"], DNGN: ["#5B5F73", "#2A2A33", "#0B0B0F"],
  BONK: ["#E6E7EC", "#9EA1AC", "#3A3A45"], ORBT: ["#B7FFEA", "#4E7A70", "#12201C"], MOSH: ["#D8B4FF", "#6B4F8A", "#1E1428"],
};
export function paletteFor(symbol: string): [string, string, string] {
  if (PALETTES[symbol]) return PALETTES[symbol];
  const pool: [string, string, string][] = [["#E6E7EC", "#8F93A1", "#2A2A33"], ["#C3C8FF", "#5C63A6", "#171A33"], ["#CFFFF0", "#5E8C80", "#14201C"], ["#F0D9FF", "#7A5C99", "#1F1528"], ["#FFE9C9", "#9A8460", "#221C10"]];
  let h = 0; for (const c of symbol) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return pool[h % pool.length];
}
