"use client";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useToast } from "../../../../launchpad/_components/Toast";
import { BUYBACKS, LINKS, MEME, PARENT, SITE, explorerAddr, explorerTx, launchpad, splitText, type Launchpad } from "../../../_lib/config";
import { HelpLine } from "../../../_components/Bits";
import { hasIncubatorSplit, isAddr, isIncubated, isMemeLaunch, montra, pct, pctOf, recipientLabel, safeLink, safeUrl, short, units, usd, type Holders, type TokenDetail } from "../../../_lib/montra";

/** Everything the page shows about a project, whichever launchpad it's on. */
type View = {
  lp: Launchpad; address: string; name: string; symbol: string; imageUrl: string | null; description: string;
  links: { website?: string | null; twitter?: string | null; telegram?: string | null; discord?: string | null };
  inc: boolean; std: boolean; meme: number | null; feePct: number; tradeUrl: string; feeRoute: string;
  stats: { mcapUsd: number | null; volUsd: number | null; change: number | null; holders: number; top10: number | null; fees: string; feesLabel: string };
  splitRows: { label: string; href?: string; pct: string }[]; splitNote: string;
  verify: { label: string; href: string; text: string }[];
};

function fromMontra(d: TokenDetail, h: Holders | null, treasuryPct: number): View {
  const meme = isMemeLaunch(d, treasuryPct) ? treasuryPct : null;
  const lp = launchpad("montra"), inc = isIncubated(d) || meme != null, std = hasIncubatorSplit(d);
  const q = d.quote?.symbol ?? "HYPE", dec = d.quote?.decimals ?? 18;
  const label = (r: string) => recipientLabel(r, d.address, d.creator);
  const feePct = d.totalFeePips / 10000;
  const route = std ? splitText() : d.splitter ? d.splitter.recipients.map((r, i) => `${d.splitter!.shares[i] / 100}% ${label(r)}`).join(" · ") : d.recipientKind === "holders" ? "100% to holders" : `100% to ${d.recipient ? label(d.recipient) : "the creator"}`;
  return {
    lp, address: d.address, name: d.name, symbol: d.symbol, imageUrl: safeUrl(d.imageUrl), description: d.description ?? d.metadata?.description ?? "",
    links: { website: d.metadata?.website, twitter: d.metadata?.twitter, telegram: d.metadata?.telegram, discord: d.metadata?.discord },
    inc, std, meme, feePct, tradeUrl: lp.tokenUrl(d.address),
    feeRoute: `After Montra's cut, it's split on-chain: ${route}.`,
    stats: {
      mcapUsd: d.marketCapUsd, volUsd: d.volume24hUsd, change: d.change24hPct, holders: d.holders, top10: h?.top10Pct ?? null,
      fees: `${units(inc && meme == null ? d.stats?.creatorFees : d.rewards?.received ?? d.rewardsReceived, dec).toFixed(3)} ${q}`,
      feesLabel: meme != null ? "Paid to holders" : inc ? (std ? "Fees to buybacks" : "Creator fees earned") : "Paid to holders",
    },
    splitRows: d.splitter
      ? d.splitter.recipients.map((r, i) => ({ label: label(r), href: explorerAddr(r), pct: `${d.splitter!.shares[i] / 100}%` }))
      : [{ label: d.recipient ? label(d.recipient) : d.recipientKind, href: d.recipient ? explorerAddr(d.recipient) : undefined, pct: "100%" }],
    splitNote: `Of the creator side of a ${feePct}% trade fee. ${units(d.stats?.creatorFees, dec).toFixed(3)} ${q} earned so far.`,
    verify: [
      { label: "Token", href: explorerAddr(d.address), text: `${short(d.address)} ↗` },
      ...(d.splitter ? [{ label: "Fee splitter", href: explorerAddr(d.splitter.address), text: `${short(d.splitter.address)} ↗` }] : []),
      { label: "Creator", href: explorerAddr(d.creator), text: `${short(d.creator)} ↗` },
      ...(meme != null ? [{ label: `EARLY treasury holds ${meme.toFixed(2)}%`, href: explorerAddr(MEME.treasury), text: `${short(MEME.treasury)} ↗` }] : []),
      ...(d.launchTx ? [{ label: "Launch tx", href: explorerTx(d.launchTx), text: `${short(d.launchTx)} ↗` }] : []),
      { label: "Montra page", href: lp.tokenUrl(d.address), text: "Open ↗" },
    ],
  };
}

function Copy({ text }: { text: string }) {
  const toast = useToast();
  return <button className="btn sm ghost" onClick={() => { navigator.clipboard.writeText(text).then(() => toast("Copied")).catch(() => {}); }}>Copy</button>;
}
function Block({ title, text, children }: { title: string; text: string; children?: React.ReactNode }) {
  return <div className="kitblock"><div className="h"><b>{title}</b><Copy text={text} /></div>{children ?? <pre>{text}</pre>}</div>;
}

/** Launch kit filled in from the token's own live data: no AI, no server, no cost. Creators edit before posting. */
function buildKit(v: View) {
  const t = `$${v.symbol}`, url = v.tradeUrl;
  const page = `${SITE}/incubator/elysium/p/${v.address.toLowerCase()}`;
  const first = v.description.trim().split(/\n+/)[0] ?? "";
  const sentence = first.match(/^.{20,200}?[.!?](\s|$)/)?.[0].trim();
  const about = sentence || (first.length > 200 ? `${first.slice(0, 200).replace(/[\s,;:]+\S*$/, "")}…` : first) || "[one line on what it is]";
  const fee = `${v.feePct}%`;
  const share = "of fees";
  const x = safeLink(v.links.twitter, "twitter"), tg = safeLink(v.links.telegram, "telegram"), dc = safeLink(v.links.discord, "discord"), web = safeLink(v.links.website);
  const socials = [x && `X: ${x}`, tg && `Telegram: ${tg}`, dc && `Discord: ${dc}`, web && `Website: ${web}`].filter(Boolean).join("\n");
  const how = "How it launched: the whole supply went into a Uniswap v4 pool with liquidity locked forever. No presale; the only early tokens are the creator's own first buy, visible on-chain.";
  return {
    launchPost: `${v.name} (${t}) is live on ${v.lp.name} 🚀\n\n${about}\n\n🔒 Liquidity locked forever\n${v.std ? "Every trade funds daily buybacks for the community 🔁" : v.feeRoute}\n\nTrade: ${url}`,
    thread: [
      `${v.name} (${t}) just launched on @montramarkets, ${v.meme != null ? "launched with" : "incubated by"} EARLY 🧵`,
      `What it is: ${about}`,
      how,
      v.std ? `Where the ${fee} trading fee goes: ${v.feeRoute} Buybacks run daily, executed by the EARLY AI agent swarm, from public wallets anyone can check.` : `Where the ${fee} trading fee goes: ${v.feeRoute}`,
      `Want to earn ${t}? Help it grow. 60% ${share} buys back ${t} for product launches, feedback, content and referrals, and 20% rewards only active $EARLY and Early Birds holders who buy ${t}, create content and refer others.`,
      `Trade ${t}: ${url}\nVerify everything: ${page}`,
    ].filter((_, i) => v.std || i !== 4),
    welcome: `Welcome to ${v.name} (${t}) 👋\n\n${about}\n\n📈 Trade: ${url}\n🔎 Verify: ${page}\n📄 Contract: ${v.address}${v.std ? "\n🔁 Every trade funds daily buybacks for this community." : ""}${socials ? `\n\n${socials}` : ""}\n\nNever share your seed phrase. Admins will never DM you first.`,
    faq: [
      { q: `Where do I buy ${t}?`, a: `On ${v.lp.name}: ${url}. You'll need HYPE on Elysium.` },
      { q: "Is liquidity locked?", a: "Yes. The full supply went into a Uniswap v4 pool at launch and the liquidity is locked forever. There was no presale; the only early tokens are the creator's own first buy, which is visible on-chain." },
      { q: "What are the fees, and where do they go?", a: `${fee} per trade, fixed forever. ${v.feeRoute}` },
      ...(v.std ? [
        { q: "How do the buybacks work?", a: `${BUYBACKS} The wallets are public, so anyone can check every buy. Amounts depend on trading volume.` },
        { q: "How does the community get rewarded?", a: `60% ${share} goes to EARLY's public community wallet, which buys back ${t} to reward the community for product launches, feedback, content, referrals and more. Rewards depend on trading volume.` },
        { q: "What are the $EARLY & Early Birds marketing incentives?", a: `20% ${share} goes to EARLY's public incentives wallet, which buys back ${t} for active $EARLY and Early Birds NFT holders only: the ones who buy ${t}, create content and refer others. Passive holders get nothing.` },
        { q: "What's the Builder Fund?", a: `20% ${share} goes to EARLY's public Builder Fund wallet, which buys KNTQ and MONTRA (10% each). It's held for the team and unlocked as the project hits market-cap and builder milestones.` },
      ] : []),
      { q: "How can I verify all this?", a: `Every wallet, the fee route and the launch transaction are linked on the project page: ${page}` },
      { q: "What's the contract?", a: v.address },
    ],
    hour: [
      "Post the launch post and thread on X, and tag @montramarkets.",
      "Pin the welcome message in your Telegram or Discord.",
      `Put your ${v.lp.name} link and contract address in your X bio.`,
      "Share your EARLY project page so people can verify the fee route.",
      "Message @Tradesgiving so the EARLY network can amplify you.",
    ],
    week: [
      ["Day 1", "Launch posts out, welcome pinned, links in bio. Reply to everyone."],
      ["Day 2", "Introduce yourself or the team and say why you built it."],
      ["Day 3", "Run a meme or art contest for holders."],
      ["Day 4", "Host a short X Space or voice chat and answer questions live."],
      ["Day 5", "Share progress: holders, volume and the latest buybacks."],
      ["Day 6", "Reach out to related communities for a collab or shout-out."],
      ["Day 7", "Recap the week, post next week's plan and apply for a Socials Rising spotlight."],
    ] as [string, string][],
  };
}

function LaunchKit({ v }: { v: View }) {
  const k = buildKit(v);
  const tweetUrl = (t: string) => `https://x.com/intent/tweet?text=${encodeURIComponent(t)}`;
  return (
    <div className="card pad">
      <div className="eyebrow">Launch kit</div>
      <h3 style={{ fontSize: "1.3rem", marginTop: 4 }}>Your next steps for ${v.symbol}</h3>
      <p className="muted" style={{ fontSize: ".9rem", marginTop: 6 }}>Filled in from your token&apos;s live data. Edit anything in [brackets] and make it yours before posting.</p>
      <div className="kitgrid" style={{ marginTop: 14 }}>
        <Block title="Do this in the first hour" text={k.hour.map((x, i) => `${i + 1}. ${x}`).join("\n")}><ol>{k.hour.map((x, i) => <li key={i}>{x}</li>)}</ol></Block>
        <Block title="Launch post" text={k.launchPost}><pre>{k.launchPost}</pre><a className="btn sm" style={{ marginTop: 10 }} href={tweetUrl(k.launchPost)} target="_blank" rel="noreferrer">Post on X ↗</a></Block>
        <Block title="Thread" text={k.thread.join("\n\n")}><ol>{k.thread.map((t, i) => <li key={i} style={{ whiteSpace: "pre-wrap" }}>{t}</li>)}</ol></Block>
        <Block title="Pinned community welcome" text={k.welcome} />
        <Block title="FAQ" text={k.faq.map((x) => `Q: ${x.q}\nA: ${x.a}`).join("\n\n")}><ul>{k.faq.map((x, i) => <li key={i}><b>{x.q}</b><br /><span className="muted" style={{ overflowWrap: "anywhere" }}>{x.a}</span></li>)}</ul></Block>
        <Block title="Your first week" text={k.week.map(([a, b]) => `${a}: ${b}`).join("\n")}><ul>{k.week.map(([a, b]) => <li key={a}><b>{a}</b> — {b}</li>)}</ul></Block>
      </div>
      <HelpLine />
    </div>
  );
}

function Support() {
  return (
    <div className="card pad">
      <div className="eyebrow">Support from the team</div>
      <h3 style={{ fontSize: "1.2rem", marginTop: 4 }}>Real people, not a bot</h3>
      <p className="muted" style={{ fontSize: ".9rem", marginTop: 6 }}>Questions, launch help or a collab? Message <b style={{ color: "var(--fg)" }}>@Tradesgiving</b>. Each week we also pick projects for {PARENT} spotlights, art, memes and campaigns.</p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
        <a className="btn sm ink" href={LINKS.helpTelegram} target="_blank" rel="noopener noreferrer">Telegram ↗</a>
        <a className="btn sm" href={LINKS.helpX} target="_blank" rel="noopener noreferrer">X ↗</a>
        <a className="btn sm ghost" href={LINKS.telegram} target="_blank" rel="noopener noreferrer">EARLY community ↗</a>
      </div>
      <p className="muted" style={{ fontSize: ".8rem", marginTop: 10 }}>Support is planned with each project, so reach out early.</p>
    </div>
  );
}

/** Finds the token on Montra and builds its view. null = Montra doesn't know it (yet). */
async function loadView(token: string): Promise<View | null> {
  const d = await montra.token(token).catch(() => null);
  if (!d) return null;
  const [h, pos] = await Promise.all([montra.holders(token, 10).catch(() => null), d.recipientKind === "holders" ? montra.position(token, MEME.treasury).catch(() => null) : null]);
  return fromMontra(d, h, pctOf(pos?.balance, d.supply));
}

function Project() {
  const { token } = useParams<{ token: string }>();
  const isNew = useSearchParams().get("new") === "1";
  const [view, setView] = useState<View | null>(null);
  const [err, setErr] = useState("");

  const valid = isAddr(token ?? "");
  useEffect(() => {
    if (!valid) return;
    let alive = true, tries = 0;
    const load = () => loadView(token).then((x) => {
      if (!alive) return;
      if (x) { setView(x); setErr(""); return; }
      // a brand-new launch can take a few seconds to reach the launchpad's indexer
      if (tries++ < 12) setTimeout(load, 5000); else setErr("We can't find this token on Montra yet. If you just launched, give it a minute and refresh.");
    }).catch((e) => { console.warn("Couldn't load this project yet:", e); if (alive && tries++ < 12) setTimeout(load, 5000); });
    load();
    const id = setInterval(() => loadView(token).then((x) => alive && x && setView(x)).catch(() => {}), 30_000);
    return () => { alive = false; clearInterval(id); };
  }, [token, valid]);

  if (!valid) return <section className="blk" style={{ paddingTop: 40 }}><div className="empty">That isn&apos;t a token address. <Link href="/incubator/elysium" style={{ textDecoration: "underline" }}>Back to the directory</Link></div></section>;
  if (!view) return <section className="blk" style={{ paddingTop: 40 }}><div className="empty">{err || (isNew ? "Your token is live — waiting for the launchpad's indexer to pick it up…" : "Loading…")}</div></section>;

  const v = view, s = v.stats;
  // Links and descriptions are written by whoever launched the token. Only show them for tokens we incubate, and only safe ones.
  const links = (v.inc ? ([["Website", v.links.website, "website"], ["X", v.links.twitter, "twitter"], ["Telegram", v.links.telegram, "telegram"], ["Discord", v.links.discord, "discord"]] as const) : [])
    .map(([l, u, k]) => [l, safeLink(u, k)]).filter(([, u]) => u) as [string, string][];

  return (
    <>
      {isNew && <div className="note" style={{ marginTop: 24 }}>🚀 <b>${v.symbol} is live on {v.lp.name}.</b> Your launch kit is below — post it, then share your {v.lp.name} link. Your project shows up in the directory within a few minutes.</div>}
      <section className="blk" style={{ paddingTop: 30 }}>
        <div style={{ display: "flex", gap: 18, alignItems: "center", flexWrap: "wrap" }}>
          {v.imageUrl ? <img className="ptoken" src={v.imageUrl} alt="" /> : null}
          <div style={{ flex: 1, minWidth: 220 }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <span className={`tag ${v.inc ? "mint" : "soft"}`}>{v.meme != null ? "EARLY meme launch" : v.inc ? "Incubated by EARLY" : "Not incubated"}</span>
              <span className="tag soft">{v.lp.name} · {v.lp.chain}</span>
            </div>
            <h1 style={{ fontSize: "clamp(2rem,5vw,3rem)", marginTop: 8 }}>{v.name} <span className="muted" style={{ fontSize: ".55em" }}>${v.symbol}</span></h1>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <a className="btn primary" href={v.tradeUrl} target="_blank" rel="noreferrer">Trade on {v.lp.name} ↗</a>
            {v.inc && <Link className="btn" href={`/incubator/olympus?t=${v.address}`} title="Live quotes from Kalos, with a Kalos Swap link when Kalos lists the token">Trade on Olympus</Link>}
            {links.map(([l, u]) => <a key={l} className="btn sm" href={u} target="_blank" rel="noopener noreferrer nofollow">{l} ↗</a>)}
          </div>
        </div>
        {!v.inc && <div className="warn" style={{ marginTop: 16 }}><b>Not launched through EARLY.</b> This page shows public {v.lp.name} data for any token, so its description and links are hidden. Do your own research.</div>}
        {v.inc && v.description && <p className="muted" style={{ marginTop: 16, maxWidth: "80ch", whiteSpace: "pre-wrap" }}>{v.description}</p>}
        {v.inc && <p className="byline">Description and links are written by the project&apos;s creator. A listing isn&apos;t an endorsement, so check links before you connect a wallet.</p>}

        <div className="statline four" style={{ marginTop: 26 }}>
          <div><b>{usd(s.mcapUsd)}</b><span>Market cap</span></div>
          <div><b>{usd(s.volUsd)}</b><span>24h volume <em className={(s.change ?? 0) >= 0 ? "up" : "down"}>{pct(s.change)}</em></span></div>
          <div><b>{s.holders > 0 ? s.holders.toLocaleString() : "—"}</b><span>{s.holders > 0 ? `Holders${s.top10 && s.top10 > 0 ? ` · top 10 hold ${s.top10.toFixed(1)}%` : ""}` : "Holders (counting…)"}</span></div>
          <div><b>{s.fees}</b><span>{s.feesLabel}</span></div>
        </div>
      </section>

      <section className="blk" style={{ paddingTop: 0 }}>
        <div className="grid2">
          {v.inc ? <LaunchKit v={v} /> : <div className="card pad"><div className="eyebrow">Launch kit</div><p className="muted" style={{ marginTop: 8 }}>Launch kits are made for projects launched through EARLY. <Link href="/incubator/elysium/launch" style={{ textDecoration: "underline" }}>Launch yours →</Link></p></div>}
          <div style={{ display: "grid", gap: 14 }}>
            <Support />
            <div className="card pad">
              <div className="eyebrow">Fee route · on-chain</div>
              {v.splitRows.map((r) => <div key={r.label} className="kv"><span>{r.href ? <a href={r.href} target="_blank" rel="noopener noreferrer">{r.label}</a> : r.label}</span><b>{r.pct}</b></div>)}
              <p className="muted" style={{ fontSize: ".8rem", marginTop: 8 }}>{v.splitNote}</p>
            </div>
            <div className="card pad verify">
              <div className="eyebrow">Verify it yourself</div>
              {v.verify.map((r) => <div key={r.label} className="kv"><span>{r.label}</span><a className="mono" href={r.href} target="_blank" rel="noreferrer">{r.text}</a></div>)}
            </div>
          </div>
        </div>
      </section>
      <p className="muted" style={{ fontSize: ".8rem", marginBottom: 30 }}><Link href="/incubator/elysium" style={{ textDecoration: "underline" }}>← Back to the directory</Link></p>
    </>
  );
}

export default function ProjectPage() {
  return <Suspense fallback={null}><Project /></Suspense>;
}
