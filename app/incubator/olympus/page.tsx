"use client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { formatUnits } from "viem";
import { useToast } from "../../launchpad/_components/Toast";
import { launchpad } from "../_lib/config";
import { pct, usd, type DirToken } from "../_lib/montra";
import { EARLY_BIRDS, GODS, KALOS_REWARDS, LOW_ROUTE_EFFICIENCY, MAJORS, godFor, godImg, kalosCollectionUrl, kalosSwapUrl, kalosTradeUrl, majorOf, type OlyNft, type OlyQuote, type OlyToken } from "../_lib/olympus";

type Tab = "pantheon" | "verified" | "search";
const BIRDS_ID = "early-birds", BIRDS_IMG = "/olympus/gods/early-birds.webp";
const BIRDS: OlyToken = { address: EARLY_BIRDS.address, symbol: "BIRDS", name: EARLY_BIRDS.name, decimals: 0, tier: "pantheon", kind: "nft" };
const BUY_PRESETS = ["0.1", "0.5", "1", "5"];
const REFRESH_S = 15;
const MOSAIC = ["Zeus", "Poseidon", "Nyx", "Helios", "Artemis", "Hermes", "Selene", "Ares", "Aphrodite", "Hecate", "Apollo", "Chaos"] as const;

/** A plain decimal string (no "e-8"), about 3 significant digits for tiny values. */
const plain = (n: number) => n.toFixed(n >= 1 ? 4 : Math.min(18, 2 - Math.floor(Math.log10(n)))).replace(/\.?0+$/, "");
const compact = (n: number) => (n === 0 ? "0" : n < 0.0001 ? plain(n) : new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: n < 1 ? 6 : 2 }).format(n));
const units = (raw: string | null | undefined, decimals: number) => { try { return raw ? Number(formatUnits(BigInt(raw), decimals)) : null; } catch { return null; } };
const hype = (raw: string | null | undefined) => { const v = units(raw, 18); return v == null ? "—" : `${compact(v)} HYPE`; };
const title = (t: OlyToken) => (t.kind === "nft" ? t.name : `$${t.symbol}`);
/** Incubated tokens trade on Montra pools, so their trades also count toward the MONTRA airdrop. */
const lpDrop = (t: OlyToken) => (t.tier !== "pantheon" || t.kind === "nft" ? null : "$MONTRA");
const dropsLine = (t: OlyToken) => (lpDrop(t) ? "$KALOS + $MONTRA airdrops" : "the $KALOS airdrop");

function Avatar({ t, size = 40 }: { t: OlyToken; size?: number }) {
  const src = t.kind === "nft" ? BIRDS_IMG : t.god ? godImg(t.god) : null;
  if (src) return <img className="oly-av" src={src} alt="" width={size} height={size} style={{ width: size, height: size }} />;
  return <span className="oly-av mortal" style={{ width: size, height: size }} aria-hidden>{t.symbol.slice(0, 1)}</span>;
}

function Copy({ text, label = "Copy" }: { text: string; label?: string }) {
  const toast = useToast();
  return <button className="oly-copy" onClick={() => navigator.clipboard.writeText(text).then(() => toast("Address copied")).catch(() => {})}>{label}</button>;
}

/** A small area chart (hourly closes for Montra tokens, daily floor for the collection). */
function Chart({ points, label }: { points: number[]; label: string }) {
  if (points.length < 2) return null;
  const w = 600, h = 150, min = Math.min(...points), max = Math.max(...points), span = max - min || 1;
  const line = points.map((c, i) => `${i ? "L" : "M"}${((i / (points.length - 1)) * w).toFixed(1)},${(h - 8 - ((c - min) / span) * (h - 24)).toFixed(1)}`).join(" ");
  const up = points[points.length - 1] >= points[0], color = up ? "#D9B75F" : "#F08C8C";
  return (
    <svg className="oly-chart" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" role="img" aria-label={`${label}, ${up ? "up" : "down"}`}>
      <defs><linearGradient id="olyfill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={color} stopOpacity=".35" /><stop offset="1" stopColor={color} stopOpacity="0" /></linearGradient></defs>
      <path d={`${line} L${w},${h} L0,${h} Z`} fill="url(#olyfill)" />
      <path d={line} fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function ProjectCard({ t, onOracle, throne = false, onSwap }: { t: OlyToken; onOracle: () => void; throne?: boolean; onSwap: boolean }) {
  return (
    <article className={`oly-card ${throne ? "throne" : ""}`}>
      <div className="oly-card-art"><img src={godImg(t.god!, throne && t.god === "Zeus")} alt={t.god} loading="lazy" /><span className="oly-god">{t.god}</span></div>
      <div className="oly-card-body">
        <div className="oly-card-head">{t.imageUrl ? <img src={t.imageUrl} alt="" /> : null}<div><b>${t.symbol}</b><small>{t.name}</small></div></div>
        <div className="oly-card-stats"><span>{usd(t.marketCapUsd)}<i>mcap</i></span><span className={(t.change24hPct ?? 0) >= 0 ? "up" : "down"}>{pct(t.change24hPct)}<i>24h</i></span>{throne && t.holders ? <span>{t.holders.toLocaleString()}<i>holders</i></span> : null}</div>
        <div className="oly-drop"><i aria-hidden>✦</i> {onSwap ? <>Trades earn {dropsLine(t)}</> : <>$KALOS points once it&apos;s on Kalos Swap</>}</div>
        <div className="oly-card-ctas">
          <a className={`btn sm ${throne ? "primary" : "ink"}`} href={onSwap ? kalosSwapUrl(t.address, "buy") : kalosTradeUrl(t.address)} target="_blank" rel="noopener noreferrer">Trade on Kalos ↗</a>
          <button className="btn sm" onClick={onOracle}>Consult the Oracle</button>
        </div>
      </div>
    </article>
  );
}

function BirdsCard({ nft, onOpen }: { nft: OlyNft | null; onOpen: () => void }) {
  return (
    <article className="oly-card throne birds">
      <div className="oly-mosaic" aria-hidden>{MOSAIC.slice(0, 6).map((g) => <img key={g} src={godImg(g)} alt="" loading="lazy" />)}<span className="oly-god">The Early Birds</span></div>
      <div className="oly-card-body">
        <div className="oly-card-head"><img src={BIRDS_IMG} alt="" /><div><b>Early Birds</b><small>NFT collection · {EARLY_BIRDS.supply} gods on Elysium</small></div></div>
        <div className="oly-card-stats">
          {nft?.listed ? <><span>{hype(nft.floor)}<i>floor</i></span><span>{nft.owners ?? "—"}<i>owners</i></span><span>{hype(nft.volume24h)}<i>24h vol</i></span></>
            : <span className="oly-soon">Listing on Kalos soon</span>}
        </div>
        <div className="oly-ca"><span>CA</span><code>{EARLY_BIRDS.address}</code><Copy text={EARLY_BIRDS.address} /></div>
        <div className="oly-card-ctas">
          {nft?.listed ? <a className="btn sm primary" href={kalosCollectionUrl(EARLY_BIRDS.address)} target="_blank" rel="noopener noreferrer">Trade Early Birds on Kalos ↗</a>
            : <span className="btn sm primary is-off" aria-disabled>Trading on Kalos soon</span>}
          <button className="btn sm" onClick={onOpen}>Open in the terminal</button>
        </div>
      </div>
    </article>
  );
}

export default function Olympus() {
  const [pantheon, setPantheon] = useState<OlyToken[] | null>(null);
  const [nft, setNft] = useState<OlyNft | null>(null);
  const [swapList, setSwapList] = useState<Set<string>>(new Set()); // tokens Kalos Swap (the points route) can open from a link
  const verified = useMemo<OlyToken[]>(() => MAJORS.map((m) => ({ ...m, tier: "verified" as const })), []);
  const [tab, setTab] = useState<Tab>("pantheon");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<OlyToken[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [sel, setSel] = useState<OlyToken | null>(null);
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [amount, setAmount] = useState("1");
  const [quote, setQuote] = useState<OlyQuote | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [tick, setTick] = useState(0);
  const [quotedAt, setQuotedAt] = useState(0);
  const [now, setNow] = useState(Date.now());
  const [closes, setCloses] = useState<number[]>([]);
  const termRef = useRef<HTMLDivElement>(null), searchRef = useRef<HTMLInputElement>(null);

  // The Pantheon: every project launched through EARLY, $EARLY first, each with its own god.
  useEffect(() => {
    fetch("/api/incubator/directory").then((r) => r.json()).then((d: { tokens?: DirToken[] }) => {
      const list = (d.tokens ?? []).map<OlyToken>((t) => ({ address: t.address.toLowerCase(), symbol: t.symbol, name: t.name, decimals: 18, tier: "pantheon", god: godFor(t.address),
        kind: "token", imageUrl: t.imageUrl, launchpad: launchpad(t.launchpad).name, marketCapUsd: t.marketCapUsd, change24hPct: t.change24hPct, holders: t.holders }));
      list.sort((a, b) => (a.god === "Zeus" ? -1 : b.god === "Zeus" ? 1 : (b.marketCapUsd ?? 0) - (a.marketCapUsd ?? 0)));
      const used = new Set<string>(MAJORS.map((m) => m.god));
      for (const t of list) { let i = GODS.indexOf(t.god!); while (used.has(GODS[i]) && used.size < GODS.length) i = (i + 1) % GODS.length; t.god = GODS[i]; used.add(GODS[i]); }
      setPantheon(list);
    }).catch(() => setPantheon([]));
    fetch("/api/incubator/olympus/nft").then((r) => r.json()).then(setNft).catch(() => setNft({ listed: false }));
    fetch("/api/incubator/olympus/swap").then((r) => r.json()).then((d: { tokens?: string[] }) => setSwapList(new Set(d.tokens ?? []))).catch(() => {});
  }, []);

  const select = useCallback((t: OlyToken, scroll = false) => {
    setSel(t); setQuote(null);
    try { window.history.replaceState(null, "", `${window.location.pathname}?t=${t.kind === "nft" ? BIRDS_ID : t.address}`); } catch { /* ignore */ }
    if (scroll) termRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  // Deep links (?t=<address> or ?t=early-birds), else $EARLY.
  useEffect(() => {
    if (!pantheon || sel) return;
    const t = (new URLSearchParams(window.location.search).get("t") ?? "").toLowerCase();
    if (t === BIRDS_ID) return setSel(BIRDS);
    const known = /^0x[0-9a-f]{40}$/.test(t) ? pantheon.find((x) => x.address === t) ?? (majorOf(t) ? { ...majorOf(t)!, tier: "verified" as const } : null) : null;
    if (known) return setSel(known);
    if (/^0x[0-9a-f]{40}$/.test(t)) {
      fetch(`/api/incubator/olympus/tokens?q=${t}`).then((r) => r.json()).then((d: { tokens?: OlyToken[] }) => {
        const hit = d.tokens?.find((x) => x.address === t);
        setSel(hit ? { ...hit, tier: "unverified" } : pantheon[0] ?? null);
      }).catch(() => setSel(pantheon[0] ?? null));
      return;
    }
    setSel(pantheon[0] ?? null);
  }, [pantheon, sel]);

  // Search everything Kalos routes; anything outside the Pantheon and the verified list is marked unverified.
  useEffect(() => {
    const q = query.trim().replace(/^\$/, "");
    if (!q) { setResults(null); setSearching(false); return; }
    setSearching(true);
    const id = setTimeout(() => {
      fetch(`/api/incubator/olympus/tokens?q=${encodeURIComponent(q)}`).then((r) => r.json()).then((d: { tokens?: { address: string; symbol: string; name: string; decimals: number }[] }) => {
        setResults((d.tokens ?? []).map((t) => pantheon?.find((x) => x.address === t.address) ?? (majorOf(t.address) ? { ...majorOf(t.address)!, tier: "verified" as const } : { ...t, tier: "unverified" as const })));
      }).catch(() => setResults([])).finally(() => setSearching(false));
    }, 350);
    return () => clearTimeout(id);
  }, [query, pantheon]);

  // "/" jumps to search, like any good terminal.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (e.key !== "/" || e.metaKey || e.ctrlKey || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) || el.isContentEditable) return;
      e.preventDefault(); setTab("search"); setTimeout(() => searchRef.current?.focus(), 0);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // The Oracle: a live Kalos quote, refreshed every 15 seconds.
  const validAmount = /^\d{1,12}(\.\d{1,18})?$/.test(amount.trim()) && Number(amount) > 0;
  useEffect(() => {
    if (!sel || sel.kind === "nft" || !validAmount) { setQuote(null); return; }
    setQuoting(true);
    let live = true; // a late answer for an older token/amount must not overwrite the current one
    const id = setTimeout(() => {
      const q = new URLSearchParams({ token: sel.address, side, amount: amount.trim(), decimals: String(sel.decimals) });
      fetch(`/api/incubator/olympus/quote?${q}`).then((r) => r.json()).then((d: OlyQuote) => { if (live) { setQuote(d); setQuotedAt(Date.now()); } })
        .catch(() => {}).finally(() => { if (live) setQuoting(false); });
    }, 400);
    return () => { live = false; clearTimeout(id); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sel, side, amount, tick]);
  useEffect(() => {
    const id = setInterval(() => { setNow(Date.now()); if (document.visibilityState === "visible") setTick((t) => (Date.now() - quotedAt > REFRESH_S * 1000 ? t + 1 : t)); }, 1000);
    return () => clearInterval(id);
  }, [quotedAt]);

  // Chart: Montra publishes hourly candles for its tokens; the collection uses its daily floor.
  useEffect(() => {
    setCloses([]);
    if (!sel) return;
    if (sel.kind === "nft") { setCloses((nft?.floorSeries ?? []).map((x) => units(x, 18) ?? 0)); return; }
    if (sel.launchpad !== "Montra") return;
    fetch(`https://api.montramarkets.xyz/api/tokens/${sel.address}/candles?interval=1h&limit=48`).then((r) => r.json())
      .then((d: { candles?: { close: string }[] }) => setCloses((d.candles ?? []).map((c) => Number(c.close)).filter((n) => Number.isFinite(n))))
      .catch(() => {});
  }, [sel, nft]);

  const throne = pantheon?.[0], rest = pantheon?.slice(1) ?? [];
  const list = tab === "pantheon" ? (pantheon ? [...(throne ? [throne] : []), BIRDS, ...rest] : []) : tab === "verified" ? verified : results ?? [];
  const outDec = side === "buy" ? sel?.decimals ?? 18 : 18;
  const got = units(quote?.amountOut, outDec), min = units(quote?.minimumOut, outDec);
  const inSym = side === "buy" ? "HYPE" : sel?.symbol ?? "", outSym = side === "buy" ? sel?.symbol ?? "" : "HYPE";
  const rate = got != null && Number(amount) > 0 ? got / Number(amount) : null;
  const eff = quote?.efficiency ?? null, lowRoute = eff != null && eff < LOW_ROUTE_EFFICIENCY;
  // Kalos Swap (points) when it can open this token and its route is near the market price; else the token's Kalos page.
  const viaSwap = !!sel && sel.kind !== "nft" && swapList.has(sel.address) && !lowRoute;
  // Switching sides carries the current estimate over, so "buy 1 HYPE" flips to "sell the EARLY you'd get".
  const switchSide = (next: "buy" | "sell") => {
    if (next === side) return;
    if (got != null && got > 0 && !quoting) setAmount(plain(got));
    setSide(next);
  };
  const ageS = quotedAt ? Math.max(0, Math.round((now - quotedAt) / 1000)) : null;
  const frieze = useMemo(() => [...GODS, ...GODS], []);
  const ticker = useMemo(() => (pantheon ?? []).filter((t) => t.marketCapUsd != null), [pantheon]);

  return (
    <>
      <a className="oly-season" href={KALOS_REWARDS} target="_blank" rel="noopener noreferrer">
        <span className="oly-season-tag">Kalos Season 1 · live</span>
        <span className="oly-season-text"><b>Trades through Kalos Swap earn points toward the $KALOS airdrop.</b> Trading $EARLY and the incubated projects also earns points toward the $MONTRA airdrop.</span>
        <span className="oly-season-go">Your points ↗</span>
      </a>

      <section className="oly-hero">
        <div className="oly-hero-copy">
          <div className="oly-kicker">Olympus · powered by Kalos</div>
          <h1>Trade like<br /><span className="gold">a god.</span></h1>
          <p className="oly-lead">EARLY, the Early Birds and every incubated project sit at the top of Olympus. Everything else on Elysium is one search away, routed by Kalos for the best price across every venue, and Kalos Swap trades stack Season 1 points.</p>
          <div className="oly-ctas">
            <a className="btn primary lg" href="#terminal">Enter the terminal</a>
            <a className="btn lg" href="#pantheon">Meet the Pantheon</a>
          </div>
        </div>
        <div className="oly-hero-art" aria-hidden><img src={godImg("Zeus", true)} alt="" width={900} height={900} /></div>
      </section>

      <div className="oly-frieze" aria-hidden><div className="oly-frieze-track">{frieze.map((g, i) => <img key={i} src={godImg(g)} alt="" width={64} height={64} loading="lazy" />)}</div></div>

      <section className="blk" id="pantheon">
        <div className="oly-sh"><div className="oly-kicker">The Pantheon</div><h2>EARLY, the Early Birds and the incubated projects</h2><p>Every incubated project funds buybacks for its community with each trade, and active Early Birds holders share in the rewards.</p></div>
        {pantheon == null ? <div className="empty">Summoning the Pantheon…</div> : (
          <>
            <div className="oly-thrones">
              {throne && <ProjectCard t={throne} throne onSwap={swapList.has(throne.address)} onOracle={() => select(throne, true)} />}
              <BirdsCard nft={nft} onOpen={() => select(BIRDS, true)} />
            </div>
            {rest.length > 0 && <>
              <h3 className="oly-sub">Incubated projects</h3>
              <div className="oly-cards">{rest.map((t) => <ProjectCard key={t.address} t={t} onSwap={swapList.has(t.address)} onOracle={() => select(t, true)} />)}</div>
            </>}
          </>
        )}
      </section>

      <section className="blk" id="terminal" ref={termRef}>
        <div className="oly-sh"><div className="oly-kicker">The terminal</div><h2>Pick a token, ask the Oracle</h2><p>Live quotes from Kalos&apos;s router, refreshed every few seconds. When you&apos;re ready, trade on Kalos with the token already selected. Press <kbd>/</kbd> to search.</p></div>
        {ticker.length > 0 && (
          <div className="oly-ticker" aria-hidden><div className="oly-ticker-track">{[...ticker, ...ticker, ...ticker].map((t, i) => (
            <span key={i}><b>${t.symbol}</b> {usd(t.marketCapUsd)} <em className={(t.change24hPct ?? 0) >= 0 ? "up" : "down"}>{(t.change24hPct ?? 0) >= 0 ? "▲" : "▼"} {pct(t.change24hPct).replace(/^[+-]/, "")}</em></span>
          ))}</div></div>
        )}
        <div className="oly-term">
          <aside className="oly-list">
            <div className="oly-tabs" role="tablist" aria-label="Token lists">
              {(["pantheon", "verified", "search"] as Tab[]).map((k) => <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? "on" : ""} onClick={() => { setTab(k); if (k === "search") setTimeout(() => searchRef.current?.focus(), 0); }}>{k === "pantheon" ? "Pantheon" : k === "verified" ? "Verified" : "Search all"}</button>)}
            </div>
            {tab === "search" && <input ref={searchRef} className="inp oly-search" placeholder="Name, $ticker or 0x address" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search tokens" />}
            <div className="oly-rows" role="list">
              {tab === "search" && !query.trim() && <p className="oly-hint">Search every token Kalos can route. Anything outside the Pantheon and the verified list is marked <b>unverified</b>: copycats exist, so always check the contract address.</p>}
              {tab === "search" && searching && <p className="oly-hint">Searching Elysium…</p>}
              {tab === "search" && results && !searching && results.length === 0 && <p className="oly-hint">Nothing found.</p>}
              {list.map((t) => (
                <button key={`${t.kind ?? "token"}-${t.address}`} role="listitem" className={`oly-row ${sel?.address === t.address ? "on" : ""}`} onClick={() => select(t)}>
                  <Avatar t={t} size={34} />
                  <span className="oly-row-main"><b>{title(t)}</b><small>{t.kind === "nft" ? "NFT collection" : t.tier === "unverified" ? `${t.address.slice(0, 6)}…${t.address.slice(-4)}` : t.name}</small></span>
                  <span className={`oly-tier ${t.kind === "nft" ? "nft" : t.tier}`}>{t.kind === "nft" ? "NFT" : t.tier === "pantheon" ? "EARLY" : t.tier === "verified" ? "Verified" : "Unverified"}</span>
                </button>
              ))}
            </div>
          </aside>

          <div className="oly-main">
            {!sel ? <div className="empty">Pick a token from the list.</div> : sel.kind === "nft" ? (
              <>
                <div className="oly-sel"><Avatar t={sel} size={64} /><div className="oly-sel-name"><div className="oly-kicker">The NFT collection of the gods</div><h3>Early Birds <small>{EARLY_BIRDS.supply} gods · ERC-721</small></h3></div></div>
                <div className="oly-ca big"><span>CA</span><code>{EARLY_BIRDS.address}</code><Copy text={EARLY_BIRDS.address} /><a href={`https://elysium.kinetiq.xyz/address/${EARLY_BIRDS.address}`} target="_blank" rel="noopener noreferrer">Explorer ↗</a></div>
                <div className="oly-stats">
                  <div><b>{nft?.listed ? hype(nft.floor) : "—"}</b><span>Floor</span></div>
                  <div><b>{nft?.listed ? hype(nft.topBid) : "—"}</b><span>Top bid</span></div>
                  <div><b>{nft?.listed ? nft.owners ?? "—" : "—"}</b><span>Owners</span></div>
                  <div><b>{EARLY_BIRDS.supply}</b><span>Supply</span></div>
                </div>
                <div className="oly-gallery">{MOSAIC.map((g) => <figure key={g}><img src={godImg(g)} alt={g} loading="lazy" /><figcaption>{g}</figcaption></figure>)}</div>
              </>
            ) : (
              <>
                <div className="oly-sel">
                  <Avatar t={sel} size={64} />
                  <div className="oly-sel-name">
                    <div className="oly-kicker">{sel.god ? `Guarded by ${sel.god}` : "Unverified token"}</div>
                    <h3>${sel.symbol} <small>{sel.name}</small></h3>
                  </div>
                </div>
                <div className="oly-ca"><span>CA</span><code>{sel.address}</code><Copy text={sel.address} /><a href={`https://elysium.kinetiq.xyz/address/${sel.address}`} target="_blank" rel="noopener noreferrer">Explorer ↗</a></div>
                {sel.tier === "unverified" && <div className="warn" style={{ marginTop: 14 }}>Not verified by EARLY. Copycat tokens use real names, so check this contract address with the project before you trade.</div>}
                {sel.tier === "pantheon" && (
                  <div className="oly-stats">
                    <div><b>{usd(sel.marketCapUsd)}</b><span>Market cap</span></div>
                    <div><b className={(sel.change24hPct ?? 0) >= 0 ? "up" : "down"}>{pct(sel.change24hPct)}</b><span>24h</span></div>
                    <div><b>{sel.holders ? sel.holders.toLocaleString() : "—"}</b><span>Holders</span></div>
                    <div><b>Kalos</b><span>Trades on</span></div>
                  </div>
                )}
                {sel.tier === "pantheon" && <p className="oly-hint" style={{ marginTop: 10 }}><Link href={`/incubator/elysium/p/${sel.address}`} style={{ textDecoration: "underline" }}>Project page, fee route and launch kit →</Link></p>}
              </>
            )}
            {sel && (closes.length > 1
              ? <div className="oly-chartbox"><Chart points={closes} label={sel.kind === "nft" ? "Floor price, last days" : "Price, last 48 hours"} /><span className="oly-chart-note">{sel.kind === "nft" ? "Floor, last days" : "Last 48 hours"}</span></div>
              : sel.kind !== "nft" && <div className="oly-chartbox empty-chart"><a href={kalosTradeUrl(sel.address)} target="_blank" rel="noopener noreferrer">Live chart on Kalos ↗</a></div>)}
          </div>

          {sel?.kind === "nft" ? (
            <div className="oly-oracle">
              <div className="oly-kicker">The Agora · on Kalos</div>
              <p className="oly-agora">Early Birds trade on Kalos&apos;s NFT marketplace: buy a god, list yours, or make an offer.</p>
              <ul className="oly-route">
                <li><span>Floor</span><b>{nft?.listed ? hype(nft.floor) : "—"}</b></li>
                <li><span>24h volume</span><b>{nft?.listed ? hype(nft.volume24h) : "—"}</b></li>
                <li><span>Listed now</span><b>{nft?.listed ? nft.listedCount ?? "—" : "—"}</b></li>
              </ul>
              {nft?.listed ? <a className="btn primary lg full" href={kalosCollectionUrl(EARLY_BIRDS.address)} target="_blank" rel="noopener noreferrer">Trade Early Birds on Kalos ↗</a>
                : <span className="btn primary lg full is-off" aria-disabled>Trading on Kalos soon</span>}
              <p className="oly-fine">Active Early Birds holders share the 20% marketing incentives from every incubated launch. Rewards depend on trading and aren&apos;t guaranteed. Not financial advice.</p>
            </div>
          ) : (
            <div className="oly-oracle">
              <div className="oly-kicker">The Oracle</div>
              <div className="oly-side" role="group" aria-label="Buy or sell">
                <button aria-pressed={side === "buy"} className={side === "buy" ? "on buy" : ""} onClick={() => switchSide("buy")}>Buy</button>
                <button aria-pressed={side === "sell"} className={side === "sell" ? "on sell" : ""} onClick={() => switchSide("sell")}>Sell</button>
              </div>
              <label className="oly-field" htmlFor="oly-amt"><span>You pay</span>
                <span className="oly-amt"><input id="oly-amt" inputMode="decimal" autoComplete="off" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1"))} /><b>{inSym || "—"}</b></span>
              </label>
              {side === "buy" && <div className="oly-presets">{BUY_PRESETS.map((p) => <button key={p} className={amount === p ? "on" : ""} onClick={() => setAmount(p)}>{p} HYPE</button>)}</div>}
              <button className="oly-flip" onClick={() => switchSide(side === "buy" ? "sell" : "buy")} aria-label="Switch between buying and selling" title="Switch buy / sell">⇅</button>
              <div className="oly-field"><span>You get (estimate)</span>
                <div className="oly-out" aria-live="polite">{quoting && !quote ? <span className="oly-shimmer">Consulting the Oracle…</span> : got != null ? <><b>{compact(got)}</b> {outSym}</> : <span className="muted">{validAmount ? quote?.error ?? "—" : "Enter an amount"}</span>}</div>
              </div>
              {got != null && quote && (
                <ul className="oly-route">
                  {rate != null && <li><span>Rate</span><b>1 {inSym} ≈ {compact(rate)} {outSym}</b></li>}
                  {min != null && <li><span>Minimum after 0.5% slippage</span><b>{compact(min)} {outSym}</b></li>}
                  <li><span>Route</span><b>{quote.legs} {quote.legs === 1 ? "path" : "paths"} · {quote.hops.length} {quote.hops.length === 1 ? "hop" : "hops"}</b></li>
                  <li><span>Searched</span><b>{quote.paths.toLocaleString()} paths · {quote.simulated.toLocaleString()} swaps</b></li>
                  {eff != null && <li><span>Price check</span><b className={lowRoute ? "down" : "up"}>{eff >= 0.95 ? "✓ At market price" : `${Math.round((1 - eff) * 100)}% below market`}</b></li>}
                </ul>
              )}
              {lowRoute && <div className="oly-heads">Heads up: this route returns about <b>{Math.round((1 - eff!) * 100)}% less</b> than ${sel?.symbol}&apos;s market price right now. Try a smaller amount, or refresh in a moment as routes update every block.</div>}
              <div className="oly-refresh"><span>{quoting ? "Updating…" : ageS != null && quote ? `Updated ${ageS < 2 ? "just now" : `${ageS}s ago`}` : ""}</span><button onClick={() => setTick((t) => t + 1)} aria-label="Refresh quote">↻ Refresh</button></div>
              {sel && (viaSwap
                ? <a className="oly-earn" href={KALOS_REWARDS} target="_blank" rel="noopener noreferrer"><i aria-hidden>✦</i><span>Routed through <b>Kalos Swap</b>: this trade earns <b>Kalos Season 1 points</b> toward the $KALOS airdrop{lpDrop(sel) ? <> and counts toward the <b>{lpDrop(sel)} airdrop</b></> : null}.</span></a>
                : <div className="oly-earn"><i aria-hidden>✦</i><span>Kalos Season 1 points come from trades on <b>Kalos Swap</b>, Kalos&apos;s aggregator. {swapList.has(sel.address) ? "Its route for this amount is far below market right now" : `$${sel.symbol} isn't on Kalos Swap yet`}, so this opens ${sel.symbol}&apos;s Kalos page at the market price.</span></div>)}
              {sel && <a className="btn primary lg full" href={viaSwap ? kalosSwapUrl(sel.address, side, validAmount ? amount.trim() : undefined) : kalosTradeUrl(sel.address)} target="_blank" rel="noopener noreferrer">{side === "buy" ? "Buy" : "Sell"} ${sel.symbol} on {viaSwap ? "Kalos Swap" : "Kalos"} ↗</a>}
              <p className="oly-fine">Quotes are estimates from Kalos&apos;s router and move with the market. You trade on kalos.fun with your own wallet, so review the trade there before you sign. Not financial advice.</p>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
