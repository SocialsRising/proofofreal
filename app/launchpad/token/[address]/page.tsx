"use client";
import { use, useState } from "react";
import Link from "next/link";
import { erc20Abi, formatEther } from "viem";
import { useAccount, usePublicClient, useReadContract, useReadContracts, useWalletClient } from "wagmi";
import { useQuery } from "@tanstack/react-query";
import { Art } from "../../_components/Art";
import { NightCard, Stat } from "../../_components/Cards";
import { useToast } from "../../_components/Toast";
import { WalletButton } from "../../_components/Wallet";
import { useToken } from "../../_lib/useTokens";
import { EXAMPLE_NIGHTS } from "../../_lib/mock";
import { CHAIN, CHAIN_ID, EXPLORER, IS_TESTNET, SITE } from "../../_lib/config";
import { MULTIPLIERS, feeSummary } from "../../_lib/presets";
import { fmt, isAddress, short, usd } from "../../_lib/format";
import { makeClanker } from "../../_lib/clanker";

type Tab = "stake" | "game" | "chart" | "share";

export default function TokenPage({ params }: { params: Promise<{ address: string }> }) {
  const { address: id } = use(params);
  const { data: t, isLoading } = useToken(id);
  const [tab, setTab] = useState<Tab>("stake");
  const { address: me } = useAccount();
  const toast = useToast();
  const onchain = isAddress(id);
  const addr = id as `0x${string}`;

  const { data: reads } = useReadContracts({
    allowFailure: true, query: { enabled: onchain },
    contracts: [
      { address: addr, abi: erc20Abi, functionName: "name", chainId: CHAIN_ID },
      { address: addr, abi: erc20Abi, functionName: "symbol", chainId: CHAIN_ID },
      { address: addr, abi: erc20Abi, functionName: "totalSupply", chainId: CHAIN_ID },
    ],
  });
  const { data: myBal } = useReadContract({ address: addr, abi: erc20Abi, functionName: "balanceOf", args: me ? [me] : undefined, chainId: CHAIN_ID, query: { enabled: onchain && !!me } });
  const chainName = reads?.[0]?.result as string | undefined;
  const chainSymbol = reads?.[1]?.result as string | undefined;

  // Creator's claimable trading fees, straight from Clanker.
  const publicClient = usePublicClient({ chainId: CHAIN_ID });
  const { data: wallet } = useWalletClient();
  const isCreator = !!t && !!me && t.creator.toLowerCase() === me.toLowerCase();
  const { data: claimable, refetch } = useQuery({
    queryKey: ["claimable", id, me],
    enabled: onchain && !!me && !!publicClient && !!wallet && isCreator,
    queryFn: async () => {
      const c = makeClanker({ ...wallet!, chain: CHAIN }, publicClient!);
      const [paired] = await Promise.all([c.availableRewards({ token: addr, rewardRecipient: me! })]);
      return paired as bigint;
    },
  });
  const [claiming, setClaiming] = useState(false);
  async function claim() {
    if (!wallet || !publicClient || !me) return;
    setClaiming(true);
    try {
      const c = makeClanker({ ...wallet, chain: CHAIN }, publicClient);
      const r = await c.claimRewards({ token: addr, rewardRecipient: me });
      if (r.error) throw new Error(r.error.message);
      toast("Claim sent"); refetch();
    } catch (e) { toast(e instanceof Error ? e.message : "Claim failed"); } finally { setClaiming(false); }
  }

  if (isLoading) return <div className="empty" style={{ marginTop: 40 }}>Loading…</div>;
  if (!t) return <div className="empty" style={{ marginTop: 40 }}>Token not found. {onchain && <span>It may not have been launched here — <a href={`${EXPLORER}/token/${id}`} style={{ textDecoration: "underline" }}>view on Basescan</a>.</span>}</div>;

  const ex = t.example;
  const fee = feeSummary(t.creatorFee, t.split);
  const nights = EXAMPLE_NIGHTS.filter((n) => n.token === t.address);
  const name = chainName ?? t.name, symbol = chainSymbol ?? t.symbol;
  const shareText = `${short(me) || "I"} just found $${symbol} on Meme Maxxers Launchpad — ${t.lockPct ? `founder locked ${t.lockPct}% for ${t.lockDays} days.` : "fees go to stakers."}`;
  const shareUrl = `${SITE}/launchpad/token/${t.address}`;
  const xIntent = `https://x.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
  const castIntent = `https://warpcast.com/~/compose?text=${encodeURIComponent(shareText)}&embeds[]=${encodeURIComponent(shareUrl)}`;
  const swapUrl = IS_TESTNET ? `${EXPLORER}/token/${t.address}` : `https://app.uniswap.org/swap?chain=base&outputCurrency=${t.address}`;

  return (
    <>
      <div className="thead">
        <div><Art symbol={symbol} image={t.image} size="xl" className="big" /></div>
        <div style={{ display: "grid", gap: 16 }}>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <span className="tag soft">{IS_TESTNET && onchain ? "Base Sepolia" : "Base"}</span>
            {!ex && <span className="tag lemon">Live</span>}
            {ex && <span className="tag soft">Example</span>}
            {t.gameName && <span className="tag grape">🎮 {ex?.gameKind ?? t.gameName}</span>}
            {t.address === "lmeow" && <span className="tag tabby">Case study</span>}
          </div>
          <div><h1 style={{ fontSize: "clamp(2rem,6vw,3.6rem)" }}>{name}</h1><div className="mono muted" style={{ fontSize: "1.1rem" }}>${symbol} · by {short(t.creator) || t.creator}</div></div>
          <p style={{ maxWidth: "56ch", fontSize: "1.05rem" }}>{t.description || "Freshly launched."}</p>
          <div className="socials">
            {t.socials.x && <a className="tag" href={/^https?:/.test(t.socials.x) ? t.socials.x : `https://x.com/${t.socials.x.replace(/^@/, "")}`} target="_blank" rel="noreferrer">𝕏 {t.socials.x.replace(/^https?:\/\/(www\.)?(x|twitter)\.com\//, "@")}</a>}
            {t.socials.chat && <a className="tag" href={/^https?:/.test(t.socials.chat) ? t.socials.chat : `https://${t.socials.chat}`} target="_blank" rel="noreferrer">💬 Community</a>}
            {t.socials.web && <a className="tag" href={/^https?:/.test(t.socials.web) ? t.socials.web : `https://${t.socials.web}`} target="_blank" rel="noreferrer">🌐 {t.socials.web}</a>}
            {onchain && <a className="tag mono" href={`${EXPLORER}/token/${t.address}`} target="_blank" rel="noreferrer">{short(t.address)}</a>}
          </div>
          <div className="ctarow">
            <a className="btn primary lg" href={swapUrl} target="_blank" rel="noreferrer">{IS_TESTNET ? "View on Basescan" : "Buy"}</a>
            <button className="btn mint lg" onClick={() => setTab("stake")}>Stake</button>
            {t.socials.game ? <a className="btn lg" href={t.socials.game} target="_blank" rel="noreferrer">Play</a> : t.gameName ? <Link className="btn lg" href={`/launchpad/night/${nights[0]?.id ?? "n1"}`}>Play</Link> : <Link className="btn lg" href="/launchpad/build">Add a game</Link>}
          </div>
          <div className="stats">
            <Stat v={ex ? usd(ex.mcap) : "—"} k="Market cap" />
            <Stat v={ex ? usd(ex.vol24) : "—"} k="24h volume" />
            <Stat v={ex ? fmt(ex.holders) : onchain ? "new" : "—"} k="Holders" />
            <Stat v={ex ? `${ex.rewardsEth.toFixed(2)} ETH` : "0.00 ETH"} k="Paid to stakers" />
          </div>
        </div>
      </div>

      <div className="grid g2" style={{ marginTop: 10 }}>
        <div className="trust"><div className="badge">{t.lockPct ? "🔒" : "!"}</div><div style={{ flex: 1 }}><div className="eyebrow">Founder alignment</div><div style={{ fontWeight: 800, fontSize: "1.05rem" }}>{t.lockPct ? `Founder has ${t.lockPct}% of supply locked for ${t.lockDays} days.` : "Founder has not locked any supply."}{t.devBuyEth ? ` Dev buy: ${t.devBuyEth} ETH.` : ""}</div></div></div>
        <div className="trust"><div className="badge">%</div><div style={{ flex: 1 }}><div className="eyebrow">Fees on every trade · {fee.total}% total</div><div style={{ fontWeight: 800, fontSize: "1.05rem" }}>{fee.stakerPct}% to stakers · {fee.creatorPct}% to creator · 1% launchpad{t.split === "diamond" ? " · creator earns only by staking their own lock" : ""}</div></div></div>
      </div>

      {isCreator && onchain && (
        <div className="card pad" style={{ marginTop: 16, display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ flex: 1 }}><div className="eyebrow">Creator · your trading fees</div><div style={{ fontFamily: "var(--font-display)", fontSize: "1.4rem", fontWeight: 700 }}>{claimable !== undefined ? `${Number(formatEther(claimable)).toFixed(5)} ETH` : "…"}</div></div>
          <button className="btn primary" onClick={claim} disabled={claiming || !claimable}>{claiming ? "Claiming…" : "Claim fees"}</button>
        </div>
      )}

      <div className="tabs">{([["stake", "Staking"], ["game", "Game & nights"], ["chart", "Chart & holders"], ["share", "Share"]] as [Tab, string][]).map(([k, l]) => <button key={k} className={tab === k ? "on" : ""} onClick={() => setTab(k)}>{l}</button>)}</div>

      {tab === "stake" && (
        <div className="grid g2">
          <div className="card pad" style={{ display: "grid", gap: 14 }}>
            <h3>Community staking</h3>
            <div className="kv"><span>Supply staked</span><b>{ex ? `${ex.stakedPct}%` : `${t.lockPct}% (founder lock)`}</b></div>
            <div className="bar"><i style={{ width: `${ex ? ex.stakedPct : t.lockPct}%` }} /></div>
            <div className="kv"><span>Creator locked</span><b>{t.lockPct}% · {t.lockDays}d</b></div>
            <div className="kv"><span>Rewards paid so far</span><b>{ex ? `${ex.rewardsEth.toFixed(2)} ETH` : "0.00 ETH"}</b></div>
            <div className="kv"><span>Est. reward rate</span><b>{ex?.apr ? `~${ex.apr}% / yr in ETH` : "—"}</b></div>
            <div className="kv"><span>Payouts</span><b>Sunday · weekly</b></div>
            <p className="muted" style={{ fontSize: ".85rem" }}>Rewards are {fee.stakerPct}% of every trade, paid in ETH, split by stake × time weight. Longer locks, bigger weight.</p>
            {ex ? <button className="btn mint full" onClick={() => toast("Staking opens with the LMEOW launch")}>Stake {symbol}</button>
              : <button className="btn full" disabled>Staking opens week 3</button>}
          </div>
          <div style={{ display: "grid", gap: 14 }}>
            <div className="card pad" style={{ display: "grid", gap: 10 }}><h3>Time weights</h3><div className="mult">{MULTIPLIERS.map(([d, m]) => <div key={d} className="chip"><b>{m}×</b><small>{d} days</small></div>)}</div></div>
            <div className="card pad" style={{ display: "grid", gap: 10 }}>
              <h3>Your position</h3>
              {me ? <p className="muted">{onchain && myBal !== undefined ? `You hold ${fmt(Number(formatEther(myBal)))} ${symbol}.` : "No positions yet."}</p> : <WalletButton />}
            </div>
          </div>
        </div>
      )}

      {tab === "game" && (
        <div className="grid g2">
          <div className="card pad" style={{ display: "grid", gap: 12 }}>
            {t.gameName || t.socials.game ? (<>
              <div className="eyebrow">{ex?.gameKind ?? "Submitted"}</div><h3 style={{ fontSize: "1.6rem" }}>{t.gameName}</h3>
              <div className="art" style={{ aspectRatio: "16/9", background: "linear-gradient(135deg,#8F93A1,#07070A)" }}><span style={{ fontSize: "1.4rem", opacity: .85 }}>▶ Play</span></div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}><a className="btn primary" href={t.socials.game ?? "#"} target="_blank" rel="noreferrer">Play now</a><Link className="btn" href="/launchpad/incubate#sponsor">Sponsor a game night</Link></div>
            </>) : (<><h3>No game yet</h3><p className="muted">Build one with an AI game tool, paste the URL, and it shows up here with a Play button.</p><Link className="btn" href="/launchpad/build">Build a game</Link></>)}
          </div>
          <div style={{ display: "grid", gap: 14 }}>{nights.length ? nights.map((n) => <NightCard key={n.id} n={n} t={t} />) : <div className="empty">No game nights scheduled.</div>}</div>
        </div>
      )}

      {tab === "chart" && (
        <div className="grid g2">
          <div style={{ display: "grid", gap: 12 }}>
            {onchain && !IS_TESTNET ? (
              <div className="chart" style={{ height: 420 }}><iframe title="chart" src={`https://dexscreener.com/base/${t.address}?embed=1&theme=dark&trades=0&info=0`} style={{ width: "100%", height: "100%", border: 0 }} /></div>
            ) : <div className="empty" style={{ height: 200, display: "grid", placeItems: "center" }}>{IS_TESTNET && onchain ? "Charts are mainnet-only. Trades on Base Sepolia show on Basescan." : "Example token — no live chart."}</div>}
          </div>
          <div className="card pad holders">
            <h3>Distribution</h3>
            {[["Founder lock (vault)", t.lockPct || 0], ["Liquidity pool", Math.max(0, 100 - (t.lockPct || 0) - (ex?.stakedPct ?? 0)).toFixed(1)], ["Community staking", ex ? Math.max(0, ex.stakedPct - t.lockPct).toFixed(1) : 0]].map(([n, p]) => <div key={String(n)} className="kv"><span>{n}</span><b>{p}%</b></div>)}
            {onchain && <a className="btn sm" href={`${EXPLORER}/token/${t.address}#balances`} target="_blank" rel="noreferrer">Holders on Basescan</a>}
          </div>
        </div>
      )}

      {tab === "share" && (
        <div className="grid g2">
          <div className="share">
            <div className="eyebrow">mememaxxers · Base</div>
            <div className="big" style={{ margin: "12px 0 16px" }}>{t.lockPct ? `${short(t.creator) || t.creator} locked ${t.lockPct}% of $${symbol} for ${t.lockDays} days.` : `$${symbol} is live. ${fee.stakerPct}% of every trade goes to stakers.`}</div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}><span className="tag">{fee.total}% fee · {fee.stakerPct}% to stakers</span>{t.devBuyEth ? <span className="tag">Dev buy {t.devBuyEth} ETH</span> : null}</div>
            <div className="paw">🐾</div>
          </div>
          <div className="card pad" style={{ display: "grid", gap: 12 }}>
            <h3>Share it</h3>
            <p className="muted">Every launch, stake and game-night win gets a card like this. Post it, tag the token, flex a little.</p>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <a className="btn primary" href={xIntent} target="_blank" rel="noreferrer">Post to X</a>
              <a className="btn" href={castIntent} target="_blank" rel="noreferrer">Cast it</a>
              <button className="btn ghost" onClick={() => { navigator.clipboard?.writeText(shareUrl); toast("Link copied"); }}>Copy link</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
