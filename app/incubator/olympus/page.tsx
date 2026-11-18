"use client";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { formatUnits } from "viem";
import { launchpad } from "../_lib/config";
import { pct, usd, type DirToken } from "../_lib/montra";
import { GODS, MAJORS, MIN_ROUTE_EFFICIENCY, godFor, godImg, kalosTradeUrl, majorOf, type OlyQuote, type OlyToken } from "../_lib/olympus";

type Tab = "pantheon" | "verified" | "search";
const compact = (n: number) => (n === 0 ? "0" : n < 0.0001 ? n.toExponential(2) : new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: n < 1 ? 6 : 2 }).format(n));
const units = (raw: string | null | undefined, decimals: number) => (raw ? Number(formatUnits(BigInt(raw), decimals)) : 0);

function Avatar({ t, size = 40 }: { t: OlyToken; size?: number }) {
  if (t.god) return <img className="oly-av" src={godImg(t.god)} alt={t.god} width={size} height={size} style={{ width: size, height: size }} />;
  return <span className="oly-av mortal" style={{ width: size, height: size }} aria-hidden>{t.symbol.slice(0, 1)}</span>;
}

/** Hourly closes as a small area chart (Montra tokens only; others link to Kalos's chart). */
function Chart({ closes }: { closes: number[] }) {
  if (closes.length < 2) return null;
  const w = 600, h = 150, min = Math.min(...closes), max = Math.max(...closes), span = max - min || 1;
  const pts = closes.map((c, i) => [(i / (closes.length - 1)) * w, h - 8 - ((c - min) / span) * (h - 24)] as const);
  const line = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const up = closes[closes.length - 1] >= closes[0];
  return (
    <svg className="oly-chart" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" role="img" aria-label={`Price over the last ${closes.length} hours, ${up ? "up" : "down"}`}>
      <defs><linearGradient id="olyfill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={up ? "#D9B75F" : "#F08C8C"} stopOpacity=".35" /><stop offset="1" stopColor={up ? "#D9B75F" : "#F08C8C"} stopOpacity="0" /></linearGradient></defs>
      <path d={`${line} L${w},${h} L0,${h} Z`} fill="url(#olyfill)" />
      <path d={line} fill="none" stroke={up ? "#D9B75F" : "#F08C8C"} strokeWidth="2" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export default function Olympus() {
  const [pantheon, setPantheon] = useState<OlyToken[] | null>(null);
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
  const [closes, setCloses] = useState<number[]>([]);
  const termRef = useRef<HTMLDivElement>(null);

  // The Pantheon: every project launched through EARLY (Montra + Volta), $EARLY first.
  useEffect(() => {
    fetch("/api/incubator/directory").then((r) => r.json()).then((d: { tokens?: DirToken[] }) => {
      const list = (d.tokens ?? []).map<OlyToken>((t) => ({ address: t.address.toLowerCase(), symbol: t.symbol, name: t.name, decimals: 18, tier: "pantheon", god: godFor(t.address),
        imageUrl: t.imageUrl, launchpad: launchpad(t.launchpad).name, launchpadUrl: launchpad(t.launchpad).tokenUrl(t.address), marketCapUsd: t.marketCapUsd, change24hPct: t.change24hPct, holders: t.holders }));
      list.sort((a, b) => (a.god === "Zeus" ? -1 : b.god === "Zeus" ? 1 : (b.marketCapUsd ?? 0) - (a.marketCapUsd ?? 0)));
      // every project gets its own god: on a clash, take the next free one (verified assets keep theirs)
      const used = new Set<string>(MAJORS.map((m) => m.god));
      for (const t of list) {
        let i = GODS.indexOf(t.god!);
        while (used.has(GODS[i]) && used.size < GODS.length) i = (i + 1) % GODS.length;
        t.god = GODS[i]; used.add(GODS[i]);
      }
      setPantheon(list);
      setSel((s) => s ?? list[0] ?? null);
    }).catch(() => setPantheon([]));
  }, []);

  // Search everything Kalos routes; anything outside the Pantheon and the verified list is marked unverified.
  useEffect(() => {
    const q = query.trim().replace(/^\$/, "");
    if (!q) { setResults(null); return; }
    setSearching(true);
    const id = setTimeout(() => {
      fetch(`/api/incubator/olympus/tokens?q=${encodeURIComponent(q)}`).then((r) => r.json()).then((d: { tokens?: { address: string; symbol: string; name: string; decimals: number }[] }) => {
        setResults((d.tokens ?? []).map((t) => {
          const p = pantheon?.find((x) => x.address === t.address), m = majorOf(t.address);
          return p ?? (m ? { ...m, tier: "verified" as const } : { ...t, tier: "unverified" as const });
        }));
      }).catch(() => setResults([])).finally(() => setSearching(false));
    }, 350);
    return () => clearTimeout(id);
  }, [query, pantheon]);

  // The Oracle: a live Kalos quote for the selected token.
  useEffect(() => {
    if (!sel || !/^\d+(\.\d+)?$/.test(amount.trim()) || Number(amount) <= 0) { setQuote(null); return; }
    setQuoting(true);
    const id = setTimeout(() => {
      const q = new URLSearchParams({ token: sel.address, side, amount: amount.trim(), decimals: String(sel.decimals) });
      fetch(`/api/incubator/olympus/quote?${q}`).then((r) => r.json()).then(setQuote).catch(() => setQuote(null)).finally(() => setQuoting(false));
    }, 450);
    return () => clearTimeout(id);
  }, [sel, side, amount]);

  // Chart: Montra publishes hourly candles for its tokens.
  useEffect(() => {
    setCloses([]);
    if (!sel || sel.launchpad !== "Montra") return;
    fetch(`https://api.montramarkets.xyz/api/tokens/${sel.address}/candles?interval=1h&limit=48`).then((r) => r.json())
      .then((d: { candles?: { close: string }[] }) => setCloses((d.candles ?? []).map((c) => Number(c.close)).filter((n) => Number.isFinite(n))))
      .catch(() => {});
  }, [sel]);

  const pick = (t: OlyToken, scroll = false) => { setSel(t); setQuote(null); if (scroll) termRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); };
  const list = tab === "pantheon" ? pantheon ?? [] : tab === "verified" ? verified : results ?? [];
  const outDec = side === "buy" ? sel?.decimals ?? 18 : 18;
  const got = quote?.amountOut ? units(quote.amountOut, outDec) : null;
  const min = quote?.minimumOut ? units(quote.minimumOut, outDec) : null;
  const inSym = side === "buy" ? "HYPE" : sel?.symbol ?? "", outSym = side === "buy" ? sel?.symbol ?? "" : "HYPE";
  // Kalos vs the token's own launchpad pool: send traders wherever they get the fair price.
  const ref = quote?.ref ?? null;
  const kalosBad = !!ref && (!quote?.amountOut || (quote.efficiency != null && quote.efficiency < MIN_ROUTE_EFFICIENCY));
  const atPool = ref && Number(amount) > 0 ? (side === "buy" ? Number(amount) / ref.price : Number(amount) * ref.price) * (1 - ref.feePct / 100) : null;
  const shown = kalosBad ? atPool : got;
  const rate = shown != null && Number(amount) > 0 ? shown / Number(amount) : null;
  const frieze = useMemo(() => [...GODS, ...GODS], []);

  return (
    <>
      <section className="oly-hero">
        <div className="oly-hero-copy">
          <div className="oly-kicker">Olympus · powered by Kalos</div>
          <h1>Trade like<br /><span className="gold">a god.</span></h1>
          <p className="oly-lead">The incubator&apos;s projects sit at the top of Olympus. Everything else on Elysium is one search away, routed by Kalos for the best price across every venue.</p>
          <div className="oly-ctas">
            <a className="btn primary lg" href="#terminal">Enter the terminal</a>
            <a className="btn lg" href="#pantheon">Meet the Pantheon</a>
          </div>
        </div>
        <div className="oly-hero-art" aria-hidden>
          <img src={godImg("Zeus", true)} alt="" width={900} height={900} />
        </div>
      </section>

      <div className="oly-frieze" aria-hidden><div className="oly-frieze-track">{frieze.map((g, i) => <img key={i} src={godImg(g)} alt="" width={64} height={64} loading="lazy" />)}</div></div>

      <section className="blk" id="pantheon">
        <div className="oly-sh"><div className="oly-kicker">The Pantheon</div><h2>EARLY and its incubated projects</h2><p>Launched through EARLY, with every trade funding buybacks for their communities. Each one has a god watching over it.</p></div>
        {pantheon == null ? <div className="empty">Summoning the Pantheon…</div> : (
          <div className="oly-cards">
            {pantheon.map((t) => (
              <article key={t.address} className={`oly-card ${t.god === "Zeus" ? "zeus" : ""}`}>
                <div className="oly-card-art"><img src={godImg(t.god!)} alt={t.god} loading="lazy" /><span className="oly-god">{t.god}</span></div>
                <div className="oly-card-body">
                  <div className="oly-card-head">{t.imageUrl ? <img src={t.imageUrl} alt="" /> : null}<div><b>${t.symbol}</b><small>{t.name} · {t.launchpad}</small></div></div>
                  <div className="oly-card-stats"><span>{usd(t.marketCapUsd)}<i>mcap</i></span><span className={(t.change24hPct ?? 0) >= 0 ? "up" : "down"}>{pct(t.change24hPct)}<i>24h</i></span></div>
                  <div className="oly-card-ctas">
                    <button className="btn sm ink" onClick={() => pick(t, true)}>Consult the Oracle</button>
                    <a className="btn sm" href={t.launchpadUrl} target="_blank" rel="noopener noreferrer">Trade on {t.launchpad} ↗</a>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="blk" id="terminal" ref={termRef}>
        <div className="oly-sh"><div className="oly-kicker">The terminal</div><h2>Pick a token, ask the Oracle</h2><p>Live quotes from Kalos&apos;s router. When you&apos;re ready, the trade happens on Kalos with the token already selected.</p></div>
        <div className="oly-term">
          <aside className="oly-list">
            <div className="oly-tabs" role="tablist">
              {(["pantheon", "verified", "search"] as Tab[]).map((k) => <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? "on" : ""} onClick={() => setTab(k)}>{k === "pantheon" ? "Pantheon" : k === "verified" ? "Verified" : "Search all"}</button>)}
            </div>
            {tab === "search" && <input className="inp oly-search" placeholder="Name, $ticker or 0x address" value={query} onChange={(e) => setQuery(e.target.value)} autoFocus />}
            <div className="oly-rows">
              {tab === "search" && !query.trim() && <p className="oly-hint">Search every token Kalos can route. Anything outside the Pantheon and the verified list is marked <b>unverified</b>: copycats exist, so always check the contract address.</p>}
              {tab === "search" && searching && <p className="oly-hint">Searching Elysium…</p>}
              {tab === "search" && results && !searching && results.length === 0 && <p className="oly-hint">Nothing found.</p>}
              {list.map((t) => (
                <button key={t.address} className={`oly-row ${sel?.address === t.address ? "on" : ""}`} onClick={() => pick(t)}>
                  <Avatar t={t} size={34} />
                  <span className="oly-row-main"><b>${t.symbol}</b><small>{t.tier === "unverified" ? `${t.address.slice(0, 6)}…${t.address.slice(-4)}` : t.name}</small></span>
                  <span className={`oly-tier ${t.tier}`}>{t.tier === "pantheon" ? "EARLY" : t.tier === "verified" ? "Verified" : "Unverified"}</span>
                </button>
              ))}
            </div>
          </aside>

          <div className="oly-main">
            {!sel ? <div className="empty">Pick a token from the list.</div> : (
              <>
                <div className="oly-sel">
                  <Avatar t={sel} size={64} />
                  <div className="oly-sel-name">
                    <div className="oly-kicker">{sel.god ? `Guarded by ${sel.god}` : "Unverified token"}</div>
                    <h3>${sel.symbol} <small>{sel.name}</small></h3>
                    <a className="mono oly-addr" href={`https://elysium.kinetiq.xyz/address/${sel.address}`} target="_blank" rel="noopener noreferrer">{sel.address} ↗</a>
                  </div>
                </div>
                {sel.tier === "unverified" && <div className="warn" style={{ marginTop: 14 }}>Not verified by EARLY. Copycat tokens use real names, so check this contract address with the project before you trade.</div>}
                {sel.tier === "pantheon" && (
                  <div className="oly-stats">
                    <div><b>{usd(sel.marketCapUsd)}</b><span>Market cap</span></div>
                    <div><b className={(sel.change24hPct ?? 0) >= 0 ? "up" : "down"}>{pct(sel.change24hPct)}</b><span>24h</span></div>
                    <div><b>{sel.holders ? sel.holders.toLocaleString() : "—"}</b><span>Holders</span></div>
                    <div><b>{sel.launchpad}</b><span>Launched on</span></div>
                  </div>
                )}
                {closes.length > 1 ? <div className="oly-chartbox"><Chart closes={closes} /><span className="oly-chart-note">Last 48 hours</span></div>
                  : <div className="oly-chartbox empty-chart"><a href={kalosTradeUrl(sel.address)} target="_blank" rel="noopener noreferrer">Live chart on Kalos ↗</a></div>}
                {sel.tier === "pantheon" && <p className="oly-hint" style={{ marginTop: 10 }}><Link href={`/incubator/elysium/p/${sel.address}`} style={{ textDecoration: "underline" }}>Project page, fee route and launch kit →</Link></p>}
              </>
            )}
          </div>

          <div className="oly-oracle">
            <div className="oly-kicker">The Oracle</div>
            <div className="oly-side" role="group" aria-label="Buy or sell">
              <button aria-pressed={side === "buy"} className={side === "buy" ? "on buy" : ""} onClick={() => setSide("buy")}>Buy</button>
              <button aria-pressed={side === "sell"} className={side === "sell" ? "on sell" : ""} onClick={() => setSide("sell")}>Sell</button>
            </div>
            <label className="oly-field" htmlFor="oly-amt"><span>You pay</span>
              <span className="oly-amt"><input id="oly-amt" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))} /><b>{inSym || "—"}</b></span>
            </label>
            <div className="oly-field"><span>You get (estimate)</span>
              <div className="oly-out">{quoting ? <span className="oly-shimmer">Consulting…</span> : shown != null ? <><b>{compact(shown)}</b> {outSym}{kalosBad && ref ? <small className="oly-via">on {ref.venue}</small> : null}</> : <span className="muted">{quote?.error ?? "—"}</span>}</div>
            </div>
            {!quoting && kalosBad && ref && (
              <div className="oly-redirect">
                {quote?.amountOut && quote.efficiency != null
                  ? <>Kalos&apos;s best route right now pays only <b>{Math.round(quote.efficiency * 100)}%</b> of what ${sel?.symbol}&apos;s own {ref.venue} pool pays, so trade it on {ref.venue}.</>
                  : <>Kalos can&apos;t route ${sel?.symbol} yet. Its pool lives on {ref.venue}, so trade it there.</>}
                {sel?.tier === "pantheon" ? " That's also where its buybacks get funded." : ""}
                <span className="oly-fine">Estimate at the pool&apos;s current price after its {ref.feePct}% fee, before price impact.</span>
              </div>
            )}
            {!kalosBad && got != null && quote && (
              <ul className="oly-route">
                {rate != null && <li><span>Rate</span><b>1 {inSym} ≈ {compact(rate)} {outSym}</b></li>}
                {min != null && <li><span>Minimum after 0.5% slippage</span><b>{compact(min)} {outSym}</b></li>}
                <li><span>Route</span><b>{quote.legs} {quote.legs === 1 ? "path" : "paths"} · {quote.hops.length} {quote.hops.length === 1 ? "hop" : "hops"}</b></li>
                <li><span>Searched</span><b>{quote.paths.toLocaleString()} paths · {quote.simulated.toLocaleString()} swaps simulated</b></li>
              </ul>
            )}
            {sel && (kalosBad && ref
              ? <a className="btn primary lg full" href={ref.url} target="_blank" rel="noopener noreferrer">{side === "buy" ? "Buy" : "Sell"} ${sel.symbol} on {ref.venue} ↗</a>
              : <a className="btn primary lg full" href={kalosTradeUrl(sel.address)} target="_blank" rel="noopener noreferrer">{side === "buy" ? "Buy" : "Sell"} ${sel.symbol} on Kalos ↗</a>)}
            {sel && !kalosBad && ref && <a className="oly-alt" href={ref.url} target="_blank" rel="noopener noreferrer">or trade on {ref.venue} ↗</a>}
            <p className="oly-fine">Quotes are estimates from Kalos&apos;s router, checked against each project&apos;s own pool, and move with the market. Trades happen on the venue you open, with your own wallet; review them there before you sign. Not financial advice.</p>
          </div>
        </div>
      </section>
    </>
  );
}
