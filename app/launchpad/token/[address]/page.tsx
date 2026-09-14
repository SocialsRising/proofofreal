"use client";
import { use, useState } from "react";
import Link from "next/link";
import { erc20Abi, formatEther } from "viem";
import { useAccount, usePublicClient, useReadContract, useReadContracts, useSwitchChain, useWriteContract } from "wagmi";
import { Art } from "../../_components/Art";
import { NightCard, Stat } from "../../_components/Cards";
import { useToast } from "../../_components/Toast";
import { WalletButton } from "../../_components/Wallet";
import { useToken } from "../../_lib/useTokens";
import { EXAMPLE_NIGHTS } from "../../_lib/mock";
import { SITE, TOTAL_SUPPLY } from "../../_lib/config";
import { CHAINS, chainById } from "../../_lib/chains";
import { FeeLockerAbi, FounderVaultAbi, LaunchFactoryAbi } from "../../_lib/abi";
import { HOLD_TIERS, STREAK_BOOST, feeSummary } from "../../_lib/presets";
import { fmt, isAddress, short, usd } from "../../_lib/format";
import { readable } from "../../_lib/launchpad";

type Tab = "hold" | "game" | "chart" | "share";

export default function TokenPage({ params }: { params: Promise<{ address: string }> }) {
  const { address: id } = use(params);
  const { data: t, isLoading } = useToken(id);
  const [tab, setTab] = useState<Tab>("hold");
  const { address: me, chainId: myChain } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();
  const toast = useToast();
  const onchain = isAddress(id);
  const addr = id as `0x${string}`;
  const chain = chainById(t?.chainId) ?? CHAINS.base;
  const factory = chain.factory;
  const publicClient = usePublicClient({ chainId: chain.id });

  const { data: reads } = useReadContracts({
    allowFailure: true, query: { enabled: onchain },
    contracts: [
      { address: addr, abi: erc20Abi, functionName: "name", chainId: chain.id },
      { address: addr, abi: erc20Abi, functionName: "symbol", chainId: chain.id },
    ],
  });
  const { data: myBal } = useReadContract({ address: addr, abi: erc20Abi, functionName: "balanceOf", args: me ? [me] : undefined, chainId: chain.id, query: { enabled: onchain && !!me } });
  const { data: lockerAddr } = useReadContract({ address: factory, abi: LaunchFactoryAbi, functionName: "feeLocker", chainId: chain.id, query: { enabled: onchain && !!factory } });
  const { data: vaultAddr } = useReadContract({ address: factory, abi: LaunchFactoryAbi, functionName: "vault", chainId: chain.id, query: { enabled: onchain && !!factory } });
  const tokenId = t?.tokenId ? BigInt(t.tokenId) : undefined;
  const { data: position, refetch: refetchPos } = useReadContract({ address: lockerAddr, abi: FeeLockerAbi, functionName: "positions", args: tokenId !== undefined ? [tokenId] : undefined, chainId: chain.id, query: { enabled: !!lockerAddr && tokenId !== undefined } });
  const { data: vaultLock } = useReadContract({ address: vaultAddr, abi: FounderVaultAbi, functionName: "locks", args: t ? [addr, t.creator as `0x${string}`] : undefined, chainId: chain.id, query: { enabled: !!vaultAddr && onchain && !!t } });

  const [collecting, setCollecting] = useState(false);
  async function collect() {
    if (!lockerAddr || tokenId === undefined || !publicClient) return;
    setCollecting(true);
    try {
      if (myChain !== chain.id) await switchChainAsync({ chainId: chain.id });
      const hash = await writeContractAsync({ address: lockerAddr, abi: FeeLockerAbi, functionName: "collect", args: [tokenId], chainId: chain.id });
      await publicClient.waitForTransactionReceipt({ hash });
      toast("Fees collected and paid out"); refetchPos();
    } catch (e) { toast(readable(e)); } finally { setCollecting(false); }
  }

  if (isLoading) return <div className="empty" style={{ marginTop: 40 }}>Loading…</div>;
  if (!t) return <div className="empty" style={{ marginTop: 40 }}>Token not found. {onchain && <span>It may not have been launched here — <a href={`${chain.explorer}/token/${id}`} style={{ textDecoration: "underline" }}>view on the explorer</a>.</span>}</div>;

  const ex = t.example;
  const fee = feeSummary(t.split);
  const nights = EXAMPLE_NIGHTS.filter((n) => n.token === t.address);
  const name = (reads?.[0]?.result as string | undefined) ?? t.name, symbol = (reads?.[1]?.result as string | undefined) ?? t.symbol;
  const wethIs0 = position && (position[0] as string).toLowerCase() === chain.weth.toLowerCase();
  const collectedEth = position ? Number(formatEther((wethIs0 ? position[3] : position[4]) as bigint)) : 0;
  const isCreator = !!me && t.creator.toLowerCase() === me.toLowerCase();
  const myTokens = myBal !== undefined ? Number(formatEther(myBal)) : 0;
  const myTier = HOLD_TIERS.filter((x) => myTokens >= x).length; // 0..9
  const nextTier = HOLD_TIERS[myTier];
  const shareText = `${short(me) || "I"} just found $${symbol} on Meme Maxxers Launchpad — ${t.lockPct ? `founder locked ${t.lockPct}% for ${t.lockDays} days.` : `${fee.stakerPct}% of every trade goes to holders.`}`;
  const shareUrl = `${SITE}/launchpad/token/${t.address}`;
  const xIntent = `https://x.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
  const castIntent = `https://warpcast.com/~/compose?text=${encodeURIComponent(shareText)}&embeds[]=${encodeURIComponent(shareUrl)}`;
  const nextSunday = (() => { const d = new Date(); d.setUTCDate(d.getUTCDate() + ((7 - d.getUTCDay()) % 7 || 7)); return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }); })();

  return (
    <>
      <div className="thead">
        <div><Art symbol={symbol} image={t.image} size="xl" className="big" /></div>
        <div style={{ display: "grid", gap: 16 }}>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <span className="tag soft">{chain.short}</span>
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
            {onchain && <a className="tag mono" href={`${chain.explorer}/token/${t.address}`} target="_blank" rel="noreferrer">{short(t.address)}</a>}
          </div>
          <div className="ctarow">
            <a className="btn primary lg" href={onchain ? chain.swapUrl(t.address) : "#"} target="_blank" rel="noreferrer">{chain.testnet ? "View on explorer" : "Buy"}</a>
            <button className="btn mint lg" onClick={() => setTab("hold")}>Hold &amp; earn</button>
            {t.socials.game ? <a className="btn lg" href={t.socials.game} target="_blank" rel="noreferrer">Play</a> : t.gameName ? <Link className="btn lg" href={`/launchpad/night/${nights[0]?.id ?? "n1"}`}>Play</Link> : <Link className="btn lg" href="/launchpad/build">Add a game</Link>}
          </div>
          <div className="stats">
            <Stat v={ex ? usd(ex.mcap) : "—"} k="Market cap" />
            <Stat v={ex ? usd(ex.vol24) : "—"} k="24h volume" />
            <Stat v={ex ? fmt(ex.holders) : onchain ? "new" : "—"} k="Holders" />
            <Stat v={ex ? `${ex.rewardsEth.toFixed(2)} ETH` : `${(collectedEth * fee.stakerPct / fee.total).toFixed(4)} ETH`} k="Fees to holders" />
          </div>
        </div>
      </div>

      <div className="grid g2" style={{ marginTop: 10 }}>
        <div className="trust"><div className="badge">{t.lockPct ? "🔒" : "!"}</div><div style={{ flex: 1 }}><div className="eyebrow">Founder alignment</div><div style={{ fontWeight: 800, fontSize: "1.05rem" }}>{t.lockPct ? `Founder has ${t.lockPct}% of supply locked for ${t.lockDays} days${vaultLock && Number(vaultLock[1]) ? ` (until ${new Date(Number(vaultLock[1]) * 1000).toLocaleDateString()})` : ""}.` : "Founder has not locked any supply."}{t.devBuyEth ? ` Dev buy: ${t.devBuyEth} ETH.` : ""}</div></div></div>
        <div className="trust"><div className="badge">%</div><div style={{ flex: 1 }}><div className="eyebrow">Fee on every trade · {fee.total}%</div><div style={{ fontWeight: 800, fontSize: "1.05rem" }}>{fee.stakerPct}% to holders · {fee.creatorPct}% to creator · {fee.platformPct}% launchpad{t.split === "diamond" ? " · creator earns only by holding" : ""}</div></div></div>
      </div>

      {onchain && tokenId !== undefined && (
        <div className="card pad" style={{ marginTop: 16, display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ flex: 1 }}><div className="eyebrow">Trading fees collected so far</div><div style={{ fontFamily: "var(--font-display)", fontSize: "1.4rem", fontWeight: 700 }}>{collectedEth.toFixed(5)} ETH</div><div className="muted" style={{ fontSize: ".85rem" }}>Anyone can trigger a payout; fees go straight to the creator, the holders pool and the launchpad.</div></div>
          <button className="btn primary" onClick={collect} disabled={collecting || !me}>{collecting ? "Collecting…" : isCreator ? "Collect my fees" : "Collect & pay out"}</button>
        </div>
      )}

      <div className="tabs">{([["hold", "Hold & earn"], ["game", "Game & nights"], ["chart", "Chart & holders"], ["share", "Share"]] as [Tab, string][]).map(([k, l]) => <button key={k} className={tab === k ? "on" : ""} onClick={() => setTab(k)}>{l}</button>)}</div>

      {tab === "hold" && (
        <div className="grid g2">
          <div className="card pad" style={{ display: "grid", gap: 14 }}>
            <h3>Hold &amp; earn</h3>
            <p className="muted" style={{ fontSize: ".93rem" }}>No staking, no lockup. Every Sunday we snapshot every wallet holding {symbol}. Hit a tier and get paid with a variety of stock tokens, experimental AI agents, and new exciting NFTs, funded by {fee.stakerPct}% of the week&apos;s trades. Hold across weeks for a streak boost up to 3×.</p>
            <div className="kv"><span>Next snapshot</span><b>{nextSunday} · 00:00 UTC</b></div>
            <div className="kv"><span>Paid so far</span><b>{ex ? `${ex.rewardsEth.toFixed(2)} ETH` : "first payout after week 1"}</b></div>
            <div className="kv"><span>Supply in qualifying wallets</span><b>{ex ? `${ex.stakedPct}%` : "—"}</b></div>
            <div className="bar"><i style={{ width: `${ex ? ex.stakedPct : 0}%` }} /></div>
            {me ? (
              <div className="note" style={{ display: "grid", gap: 4 }}>
                <div className="kv"><span>You hold</span><b>{fmt(myTokens)} {symbol} · {(myTokens / TOTAL_SUPPLY * 100).toFixed(3)}%</b></div>
                <div className="kv"><span>Your tier</span><b>{myTier ? `Tier ${myTier} · ${fmt(HOLD_TIERS[myTier - 1])}+` : "Below tier 1"}</b></div>
                {nextTier && <div className="kv"><span>Next tier at</span><b>{fmt(nextTier)} {symbol}</b></div>}
              </div>
            ) : <WalletButton />}
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}><a className="btn mint" href={onchain ? chain.swapUrl(t.address) : "#"} target="_blank" rel="noreferrer">Buy {symbol}</a><Link className="btn" href="/launchpad/profile">My rewards</Link></div>
          </div>
          <div style={{ display: "grid", gap: 14 }}>
            <div className="card pad" style={{ display: "grid", gap: 10 }}>
              <h3>Tiers</h3>
              <div className="mult">{HOLD_TIERS.map((x, i) => <div key={x} className={`chip ${myTier === i + 1 ? "on" : ""}`}><b>{fmt(x)}</b><small>tier {i + 1}</small></div>)}</div>
              <p className="muted" style={{ fontSize: ".82rem" }}>Weight = balance × tier bonus × streak. Bigger tiers earn a larger share of the pool; LP, vault and exchange wallets are excluded.</p>
            </div>
            <div className="card pad" style={{ display: "grid", gap: 10 }}>
              <h3>Streak boost</h3>
              <div className="mult">{[1, 2, 4, 8, 11].map((w) => <div key={w} className="chip"><b>{STREAK_BOOST(w).toFixed(1)}×</b><small>{w === 1 ? "week 1" : `${w} weeks`}</small></div>)}</div>
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
            {onchain && chain.chartUrl ? (
              <div className="chart" style={{ height: 420 }}><iframe title="chart" src={chain.chartUrl(t.address)} style={{ width: "100%", height: "100%", border: 0 }} /></div>
            ) : <div className="empty" style={{ height: 200, display: "grid", placeItems: "center" }}>{chain.testnet && onchain ? "Charts are mainnet-only. Trades show on the explorer." : "Example token — no live chart."}</div>}
          </div>
          <div className="card pad holders">
            <h3>Distribution</h3>
            {[["Founder lock (vault)", t.lockPct || 0], ["Liquidity pool", Math.max(0, 100 - (t.lockPct || 0) - (ex?.stakedPct ?? 0)).toFixed(1)], ["Holders", ex ? ex.stakedPct.toFixed(1) : "—"]].map(([n, p]) => <div key={String(n)} className="kv"><span>{n}</span><b>{p}%</b></div>)}
            {onchain && <a className="btn sm" href={`${chain.explorer}/token/${t.address}${chain.key === "robinhood" ? "?tab=holders" : "#balances"}`} target="_blank" rel="noreferrer">Holders on explorer</a>}
          </div>
        </div>
      )}

      {tab === "share" && (
        <div className="grid g2">
          <div className="share">
            <div className="eyebrow">mememaxxers · {chain.short}</div>
            <div className="big" style={{ margin: "12px 0 16px" }}>{t.lockPct ? `${short(t.creator) || t.creator} locked ${t.lockPct}% of $${symbol} for ${t.lockDays} days.` : `$${symbol} is live. ${fee.stakerPct}% of every trade goes to holders.`}</div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}><span className="tag">{fee.total}% fee · {fee.stakerPct}% to holders</span>{t.devBuyEth ? <span className="tag">Dev buy {t.devBuyEth} ETH</span> : null}</div>
            <div className="paw">🐾</div>
          </div>
          <div className="card pad" style={{ display: "grid", gap: 12 }}>
            <h3>Share it</h3>
            <p className="muted">Every launch, payout and game-night win gets a card like this. Post it, tag the token, flex a little.</p>
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
