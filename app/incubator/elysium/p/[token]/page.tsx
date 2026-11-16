"use client";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useToast } from "../../../../launchpad/_components/Toast";
import { BUYBACKS, LINKS, PARENT, SITE, explorerAddr, explorerTx, splitText } from "../../../_lib/config";
import { HelpLine } from "../../../_components/Bits";
import { hasIncubatorSplit, isAddr, isIncubated, montra, pct, recipientLabel, safeLink, safeUrl, short, units, usd, type Holders, type TokenDetail } from "../../../_lib/montra";

function Copy({ text }: { text: string }) {
  const toast = useToast();
  return <button className="btn sm ghost" onClick={() => { navigator.clipboard.writeText(text).then(() => toast("Copied")).catch(() => {}); }}>Copy</button>;
}
function Block({ title, text, children }: { title: string; text: string; children?: React.ReactNode }) {
  return <div className="kitblock"><div className="h"><b>{title}</b><Copy text={text} /></div>{children ?? <pre>{text}</pre>}</div>;
}

/** Launch kit filled in from the token's own Montra data: no AI, no server, no cost. Creators edit before posting. */
function buildKit(d: TokenDetail, label: (r: string) => string) {
  const t = `$${d.symbol}`, url = `https://montramarkets.xyz/token/${d.address.toLowerCase()}`;
  const page = `${SITE}/incubator/elysium/p/${d.address.toLowerCase()}`;
  const first = (d.description ?? d.metadata?.description ?? "").trim().split(/\n+/)[0] ?? "";
  const sentence = first.match(/^.{20,200}?[.!?](\s|$)/)?.[0].trim();
  const about = sentence || (first.length > 200 ? `${first.slice(0, 200).replace(/[\s,;:]+\S*$/, "")}…` : first) || "[one line on what it is]";
  const fee = `${d.totalFeePips / 10000}%`;
  const std = hasIncubatorSplit(d);
  const split = std ? splitText() : d.splitter ? d.splitter.recipients.map((r, i) => `${d.splitter!.shares[i] / 100}% ${label(r)}`).join(" · ") : d.recipientKind === "holders" ? "100% to holders" : `100% to ${d.recipient ? label(d.recipient) : "the creator"}`;
  const x = safeLink(d.metadata?.twitter, "twitter"), tg = safeLink(d.metadata?.telegram, "telegram"), dc = safeLink(d.metadata?.discord, "discord"), web = safeLink(d.metadata?.website);
  const socials = [x && `X: ${x}`, tg && `Telegram: ${tg}`, dc && `Discord: ${dc}`, web && `Website: ${web}`].filter(Boolean).join("\n");
  const buyLine = std ? "Every trade funds daily buybacks for the community 🔁" : `Fees: ${split}`;
  return {
    launchPost: `${d.name} (${t}) is live on Montra 🚀\n\n${about}\n\n🔒 Liquidity locked forever\n${buyLine}\n\nTrade: ${url}`,
    thread: [
      `${d.name} (${t}) just launched on @montramarkets, incubated by EARLY 🧵`,
      `What it is: ${about}`,
      `How it launched: the whole supply went into a Uniswap v4 pool with liquidity locked forever. No presale; the only early tokens are the creator's own first buy, visible on-chain.`,
      std
        ? `Where the ${fee} trading fee goes: ${split}. Buybacks run daily, executed by the EARLY AI agent swarm, from public wallets anyone can check.`
        : `Where the ${fee} trading fee goes: ${split}.`,
      `Want to earn ${t}? Help it grow. 60% of fees go to EARLY's community wallet to buy back ${t} for product launches, feedback, content and referrals, and 20% rewards only active $EARLY and Early Birds holders who buy ${t}, create content and refer others.`,
      `Trade ${t}: ${url}\nVerify everything: ${page}`,
    ].filter((_, i) => std || i !== 4),
    welcome: `Welcome to ${d.name} (${t}) 👋\n\n${about}\n\n📈 Trade: ${url}\n🔎 Verify: ${page}\n📄 Contract: ${d.address}${std ? "\n🔁 Every trade funds daily buybacks for this community." : ""}${socials ? `\n\n${socials}` : ""}\n\nNever share your seed phrase. Admins will never DM you first.`,
    faq: [
      { q: `Where do I buy ${t}?`, a: `On Montra: ${url}. You'll need HYPE on Elysium.` },
      { q: "Is liquidity locked?", a: "Yes. The full supply went into a Uniswap v4 pool at launch and the liquidity is locked forever. There was no presale; the only early tokens are the creator's own first buy, which is visible on-chain." },
      { q: "What are the fees, and where do they go?", a: `${fee} per trade, fixed forever. After Montra's cut, it's split on-chain: ${split}.` },
      ...(std ? [
        { q: "How do the buybacks work?", a: `${BUYBACKS} The wallets are public, so anyone can check every buy. Amounts depend on trading volume.` },
        { q: "How does the community get rewarded?", a: `60% of fees go to EARLY's public community wallet, which buys back ${t} to reward the community for product launches, feedback, content, referrals and more. Rewards depend on trading volume.` },
        { q: "What are the $EARLY & Early Birds marketing incentives?", a: `20% of fees go to EARLY's public incentives wallet, which buys back ${t} for active $EARLY and Early Birds NFT holders only: the ones who buy ${t}, create content and refer others. Passive holders get nothing.` },
        { q: "What's the Builder Fund?", a: "20% of fees go to EARLY's public Builder Fund wallet, which buys KNTQ and MONTRA (10% each). It's held for the team and unlocked as the project hits market-cap and builder milestones." },
      ] : []),
      { q: "How can I verify all this?", a: `Every wallet, the fee split and the launch transaction are linked on the project page: ${page}` },
      { q: "What's the contract?", a: d.address },
    ],
    hour: [
      "Post the launch post and thread on X, and tag @montramarkets.",
      "Pin the welcome message in your Telegram or Discord.",
      "Put your Montra link and contract address in your X bio.",
      "Share your EARLY project page so people can verify the fee split.",
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

function LaunchKit({ d, label }: { d: TokenDetail; label: (r: string) => string }) {
  const k = buildKit(d, label);
  const tweetUrl = (t: string) => `https://x.com/intent/tweet?text=${encodeURIComponent(t)}`;
  return (
    <div className="card pad">
      <div className="eyebrow">Launch kit</div>
      <h3 style={{ fontSize: "1.3rem", marginTop: 4 }}>Your next steps for ${d.symbol}</h3>
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

function Project() {
  const { token } = useParams<{ token: string }>();
  const isNew = useSearchParams().get("new") === "1";
  const [d, setD] = useState<TokenDetail | null>(null);
  const [h, setH] = useState<Holders | null>(null);
  const [err, setErr] = useState("");

  const valid = isAddr(token ?? "");
  useEffect(() => {
    if (!valid) return;
    let alive = true, tries = 0;
    const load = () => montra.token(token).then((x) => { if (alive) { setD(x); setErr(""); } }).catch(() => {
      // a brand-new launch can take a few seconds to reach Montra's indexer
      if (alive && tries++ < 12) setTimeout(load, 5000); else if (alive) setErr("This token isn't on Montra yet — if you just launched, give it a minute and refresh.");
    });
    load(); montra.holders(token, 10).then((x) => alive && setH(x)).catch(() => {});
    const id = setInterval(() => montra.token(token).then((x) => alive && setD(x)).catch(() => {}), 30_000);
    return () => { alive = false; clearInterval(id); };
  }, [token, valid]);

  if (!valid) return <section className="blk" style={{ paddingTop: 40 }}><div className="empty">That isn&apos;t a token address. <Link href="/incubator/elysium" style={{ textDecoration: "underline" }}>Back to the directory</Link></div></section>;

  if (!d) return <section className="blk" style={{ paddingTop: 40 }}><div className="empty">{err || (isNew ? "Your token is live — waiting for Montra's indexer to pick it up…" : "Loading from Montra…")}</div></section>;

  const q = d.quote?.symbol ?? "HYPE", dec = d.quote?.decimals ?? 18, inc = isIncubated(d);
  const montraUrl = `https://montramarkets.xyz/token/${d.address.toLowerCase()}`;
  const label = (r: string) => recipientLabel(r, d.address, d.creator);
  // Links and descriptions are written by whoever launched the token. Only show them for tokens we incubate, and only https.
  const links = (inc ? ([["Website", d.metadata?.website, "website"], ["X", d.metadata?.twitter, "twitter"], ["Telegram", d.metadata?.telegram, "telegram"], ["Discord", d.metadata?.discord, "discord"]] as const) : [])
    .map(([l, u, k]) => [l, safeLink(u, k)]).filter(([, u]) => u) as [string, string][];

  return (
    <>
      {isNew && <div className="note" style={{ marginTop: 24 }}>🚀 <b>${d.symbol} is live.</b> Your launch kit is below — post it, then share your Montra link. Your project appears in the directory after its first trade.</div>}
      <section className="blk" style={{ paddingTop: 30 }}>
        <div style={{ display: "flex", gap: 18, alignItems: "center", flexWrap: "wrap" }}>
          {safeUrl(d.imageUrl) ? <img className="ptoken" src={safeUrl(d.imageUrl)!} alt="" /> : null}
          <div style={{ flex: 1, minWidth: 220 }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <span className={`tag ${inc ? "mint" : "soft"}`}>{inc ? "Incubated by EARLY" : "Not incubated"}</span>
              <span className="tag soft">Montra · Elysium</span>
            </div>
            <h1 style={{ fontSize: "clamp(2rem,5vw,3rem)", marginTop: 8 }}>{d.name} <span className="muted" style={{ fontSize: ".55em" }}>${d.symbol}</span></h1>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <a className="btn primary" href={montraUrl} target="_blank" rel="noreferrer">Trade on Montra ↗</a>
            {links.map(([l, u]) => <a key={l} className="btn sm" href={u} target="_blank" rel="noopener noreferrer nofollow">{l} ↗</a>)}
          </div>
        </div>
        {!inc && <div className="warn" style={{ marginTop: 16 }}><b>Not launched through EARLY.</b> This page shows public Montra data for any token, so its description and links are hidden. Do your own research.</div>}
        {inc && d.description && <p className="muted" style={{ marginTop: 16, maxWidth: "80ch", whiteSpace: "pre-wrap" }}>{d.description}</p>}
        {inc && <p className="byline">Description and links are written by the project&apos;s creator. A listing isn&apos;t an endorsement, so check links before you connect a wallet.</p>}

        <div className="statline four" style={{ marginTop: 26 }}>
          <div><b>{usd(d.marketCapUsd)}</b><span>Market cap</span></div>
          <div><b>{usd(d.volume24hUsd)}</b><span>24h volume <em className={(d.change24hPct ?? 0) >= 0 ? "up" : "down"}>{pct(d.change24hPct)}</em></span></div>
          <div><b>{d.holders > 0 ? d.holders.toLocaleString() : "—"}</b><span>{d.holders > 0 ? `Holders${h && h.top10Pct > 0 ? ` · top 10 hold ${h.top10Pct.toFixed(1)}%` : ""}` : "Holders (counting…)"}</span></div>
          {inc
            ? <div><b>{units(d.stats?.creatorFees, dec).toFixed(3)} {q}</b><span>{hasIncubatorSplit(d) ? "Fees to buybacks" : "Creator fees earned"}</span></div>
            : <div><b>{units(d.rewards?.received ?? d.rewardsReceived, dec).toFixed(3)} {q}</b><span>Paid to holders</span></div>}
        </div>
      </section>

      <section className="blk" style={{ paddingTop: 0 }}>
        <div className="grid2">
          {inc ? <LaunchKit d={d} label={label} /> : <div className="card pad"><div className="eyebrow">Launch kit</div><p className="muted" style={{ marginTop: 8 }}>Launch kits are made for projects launched through EARLY. <Link href="/incubator/elysium/launch" style={{ textDecoration: "underline" }}>Launch yours →</Link></p></div>}
          <div style={{ display: "grid", gap: 14 }}>
            <Support />
            <div className="card pad">
              <div className="eyebrow">Fee split · on-chain</div>
              {d.splitter ? d.splitter.recipients.map((r, i) => (
                <div key={r} className="kv"><span><a href={explorerAddr(r)} target="_blank" rel="noreferrer">{label(r)}</a></span><b>{d.splitter!.shares[i] / 100}%</b></div>
              )) : <div className="kv"><span>{d.recipient ? <a href={explorerAddr(d.recipient)} target="_blank" rel="noopener noreferrer">{label(d.recipient)}</a> : d.recipientKind}</span><b>100%</b></div>}
              <p className="muted" style={{ fontSize: ".8rem", marginTop: 8 }}>Of the creator side of a {d.totalFeePips / 10000}% trade fee. {units(d.stats?.creatorFees, dec).toFixed(3)} {q} earned so far.</p>
            </div>
            <div className="card pad verify">
              <div className="eyebrow">Verify it yourself</div>
              <div className="kv"><span>Token</span><a className="mono" href={explorerAddr(d.address)} target="_blank" rel="noreferrer">{short(d.address)} ↗</a></div>
              {d.splitter && <div className="kv"><span>Fee splitter</span><a className="mono" href={explorerAddr(d.splitter.address)} target="_blank" rel="noreferrer">{short(d.splitter.address)} ↗</a></div>}
              <div className="kv"><span>Creator</span><a className="mono" href={explorerAddr(d.creator)} target="_blank" rel="noreferrer">{short(d.creator)} ↗</a></div>
              {d.launchTx && <div className="kv"><span>Launch tx</span><a className="mono" href={explorerTx(d.launchTx)} target="_blank" rel="noreferrer">{short(d.launchTx)} ↗</a></div>}
              <div className="kv"><span>Montra page</span><a href={montraUrl} target="_blank" rel="noreferrer">Open ↗</a></div>
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
