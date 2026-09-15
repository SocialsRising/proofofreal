"use client";
import { use, useState } from "react";
import Link from "next/link";
import { erc20Abi, formatEther } from "viem";
import { useAccount, usePublicClient, useReadContract, useReadContracts, useSwitchChain, useWriteContract } from "wagmi";
import { Art } from "../../_components/Art";
import { Stat } from "../../_components/Cards";
import { Swap } from "../../_components/Swap";
import { useToast } from "../../_components/Toast";
import { WalletButton } from "../../_components/Wallet";
import { useToken } from "../../_lib/useTokens";
import { SITE, TOTAL_SUPPLY } from "../../_lib/config";
import { CHAINS, chainById, isV4Chain } from "../../_lib/chains";
import { FeeLockerAbi, FounderVaultAbi, LaunchFactoryAbi, LaunchFactoryV4Abi, V4FeeLockerAbi } from "../../_lib/abi";
import { creatorSplitFromBps, feeSummary, feeSummaryV4, pipsToPct } from "../../_lib/presets";
import { fmt, isAddress, short } from "../../_lib/format";
import { readable } from "../../_lib/launchpad";

type Tab = "trade" | "hold" | "chart" | "share";
const href = (s: string) => (/^https?:/.test(s) ? s : `https://${s}`);
const xHref = (s: string) => (/^https?:/.test(s) ? s : `https://x.com/${s.replace(/^@/, "")}`);

export default function TokenPage({ params }: { params: Promise<{ address: string }> }) {
  const { address: id } = use(params);
  const { data: t, isLoading } = useToken(id);
  const [tab, setTab] = useState<Tab | null>(null);
  const { address: me, chainId: myChain } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();
  const toast = useToast();
  const onchain = isAddress(id);
  const addr = id as `0x${string}`;
  const chain = chainById(t?.chainId) ?? CHAINS.robinhood;
  const isV4 = t?.version === "v4" && isV4Chain(chain);
  const factory = isV4 ? chain.factoryV4 : chain.factory;
  const publicClient = usePublicClient({ chainId: chain.id });

  const { data: reads } = useReadContracts({
    allowFailure: true, query: { enabled: onchain },
    contracts: [
      { address: addr, abi: erc20Abi, functionName: "name", chainId: chain.id },
      { address: addr, abi: erc20Abi, functionName: "symbol", chainId: chain.id },
    ],
  });
  const { data: myBal } = useReadContract({ address: addr, abi: erc20Abi, functionName: "balanceOf", args: me ? [me] : undefined, chainId: chain.id, query: { enabled: onchain && !!me } });
  const { data: lockerAddr } = useReadContract({ address: factory, abi: isV4 ? LaunchFactoryV4Abi : LaunchFactoryAbi, functionName: "feeLocker", chainId: chain.id, query: { enabled: onchain && !!factory } });
  const { data: vaultAddr } = useReadContract({ address: factory, abi: isV4 ? LaunchFactoryV4Abi : LaunchFactoryAbi, functionName: "vault", chainId: chain.id, query: { enabled: onchain && !!factory } });
  const tokenId = t?.tokenId ? BigInt(t.tokenId) : undefined;
  // V3 locker: (token0, token1, creatorIndex, collected0, collected1). V4 locker: (key, creatorIndex, collectedEth, collectedToken, exists).
  const { data: posV3, refetch: refetchV3 } = useReadContract({ address: lockerAddr, abi: FeeLockerAbi, functionName: "positions", args: tokenId !== undefined ? [tokenId] : undefined, chainId: chain.id, query: { enabled: !isV4 && !!lockerAddr && tokenId !== undefined } });
  const { data: posV4, refetch: refetchV4 } = useReadContract({ address: lockerAddr, abi: V4FeeLockerAbi, functionName: "positions", args: tokenId !== undefined ? [tokenId] : undefined, chainId: chain.id, query: { enabled: isV4 && !!lockerAddr && tokenId !== undefined } });
  const { data: vaultLock } = useReadContract({ address: vaultAddr, abi: FounderVaultAbi, functionName: "locks", args: t ? [addr, t.creator as `0x${string}`] : undefined, chainId: chain.id, query: { enabled: !!vaultAddr && onchain && !!t } });

  const [collecting, setCollecting] = useState(false);
  async function collect() {
    if (!lockerAddr || tokenId === undefined || !publicClient) return;
    setCollecting(true);
    try {
      if (myChain !== chain.id) await switchChainAsync({ chainId: chain.id });
      const hash = isV4
        ? await writeContractAsync({ address: lockerAddr, abi: V4FeeLockerAbi, functionName: "collect", args: [tokenId], chainId: chain.id })
        : await writeContractAsync({ address: lockerAddr, abi: FeeLockerAbi, functionName: "collect", args: [tokenId], chainId: chain.id });
      await publicClient.waitForTransactionReceipt({ hash });
      toast("Fees collected and paid out"); if (isV4) refetchV4(); else refetchV3();
    } catch (e) { toast(readable(e)); } finally { setCollecting(false); }
  }

  if (isLoading) return <div className="empty" style={{ marginTop: 40 }}>Loading…</div>;
  if (!t) return <div className="empty" style={{ marginTop: 40 }}>Token not found. {onchain && <span>It may not have been launched here — <a href={`${chain.explorer}/token/${id}`} style={{ textDecoration: "underline" }}>view on the explorer</a>.</span>}</div>;

  // One fee picture for both factories: total / launchpad / founder / community, in % of every trade.
  const fee = isV4
    ? feeSummaryV4(pipsToPct(t.creatorFeePips ?? 0), t.creatorShareBps ?? 5000)
    : (() => { const s = feeSummary(t.split); return { total: s.total, launchpad: s.platformPct, founder: s.creatorPct, community: s.stakerPct, creatorFeePct: 0 }; })();
  const splitLabel = isV4 ? creatorSplitFromBps(t.creatorShareBps).label : undefined;
  const name = (reads?.[0]?.result as string | undefined) ?? t.name, symbol = (reads?.[1]?.result as string | undefined) ?? t.symbol;
  const collectedEth = isV4
    ? (posV4 ? Number(formatEther(posV4[2] as bigint)) : 0)
    : (posV3 ? Number(formatEther(((posV3[0] as string).toLowerCase() === chain.weth.toLowerCase() ? posV3[3] : posV3[4]) as bigint)) : 0);
  const holdersEth = fee.total ? collectedEth * fee.community / fee.total : 0;
  const isCreator = !!me && t.creator.toLowerCase() === me.toLowerCase();
  const myTokens = myBal !== undefined ? Number(formatEther(myBal)) : 0;
  const business = t.socials.business || t.socials.web;
  const activeTab: Tab = tab ?? (isV4 ? "trade" : "hold");
  const shareText = `${short(me) || "I"} just found $${symbol} on Meme Maxxers Launchpad — ${t.lockPct ? `founder locked ${t.lockPct}% for ${t.lockDays} days.` : `${fee.community}% of every trade goes to holders.`}`;
  const shareUrl = `${SITE}/launchpad/token/${t.address}`;
  const xIntent = `https://x.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
  const castIntent = `https://warpcast.com/~/compose?text=${encodeURIComponent(shareText)}&embeds[]=${encodeURIComponent(shareUrl)}`;
  const nextSunday = (() => { const d = new Date(); d.setUTCDate(d.getUTCDate() + ((7 - d.getUTCDay()) % 7 || 7)); return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }); })();
  const tabs: [Tab, string][] = [...(isV4 ? [["trade", "Trade"] as [Tab, string]] : []), ["hold", "Hold & earn"], ["chart", "Chart & holders"], ["share", "Share"]];

  return (
    <>
      <div className="thead">
        <div><Art symbol={symbol} image={t.image} size="xl" className="big" /></div>
        <div style={{ display: "grid", gap: 16 }}>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <span className="tag soft">{chain.short}</span>
            <span className="tag lemon">Live</span>
            <span className="tag soft mono">{fee.total}% fee</span>
            {business && <span className="tag grape">AI agent business</span>}
          </div>
          <div><h1 style={{ fontSize: "clamp(2rem,6vw,3.6rem)" }}>{name}</h1><div className="mono muted" style={{ fontSize: "1.1rem" }}>${symbol} · by {short(t.creator) || t.creator}</div></div>
          <p style={{ maxWidth: "56ch", fontSize: "1.05rem" }}>{t.description || "Freshly launched."}</p>
          <div className="socials">
            {t.socials.x && <a className="tag" href={xHref(t.socials.x)} target="_blank" rel="noreferrer">𝕏 {t.socials.x.replace(/^https?:\/\/(www\.)?(x|twitter)\.com\//, "@")}</a>}
            {t.socials.chat && <a className="tag" href={href(t.socials.chat)} target="_blank" rel="noreferrer">💬 Community</a>}
            {business && <a className="tag" href={href(business)} target="_blank" rel="noreferrer">🤖 {business.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}</a>}
            {onchain && <a className="tag mono" href={`${chain.explorer}/token/${t.address}`} target="_blank" rel="noreferrer">{short(t.address)}</a>}
          </div>
          <div className="ctarow">
            {isV4 ? <button className="btn primary lg" onClick={() => setTab("trade")}>Buy {symbol}</button>
              : <a className="btn primary lg" href={onchain ? chain.swapUrl(t.address) : "#"} target="_blank" rel="noreferrer">{chain.testnet ? "View on explorer" : "Buy"}</a>}
            <button className="btn mint lg" onClick={() => setTab("hold")}>Hold &amp; earn</button>
            {business && <a className="btn lg" href={href(business)} target="_blank" rel="noreferrer">Visit the business ↗</a>}
          </div>
          <div className="stats">
            <Stat v={`${holdersEth.toFixed(4)} ETH`} k="Fees earned for holders" hint="Holder share of trading fees collected so far" />
            <Stat v={t.lockPct ? `${t.lockPct}%` : "None"} k={t.lockPct ? `Founder lock · ${t.lockDays}d` : "Founder lock"} />
            <Stat v={t.devBuyEth ? `${t.devBuyEth} ETH` : "None"} k="Dev buy" />
            <Stat v={`${fee.total}%`} k="Fee on every trade" hint={isV4 ? `${fee.launchpad}% launchpad + ${fee.creatorFeePct}% creator` : undefined} />
          </div>
        </div>
      </div>

      <div className="grid g2" style={{ marginTop: 10 }}>
        <div className="trust"><div className="badge">{t.lockPct ? "🔒" : "!"}</div><div style={{ flex: 1 }}><div className="eyebrow">Founder alignment</div><div style={{ fontWeight: 800, fontSize: "1.05rem" }}>{t.lockPct ? `Founder has ${t.lockPct}% of supply locked for ${t.lockDays} days${vaultLock && Number(vaultLock[1]) ? ` (until ${new Date(Number(vaultLock[1]) * 1000).toLocaleDateString()})` : ""}.` : "Founder has not locked any supply."}{t.devBuyEth ? ` Dev buy: ${t.devBuyEth} ETH.` : ""}</div></div></div>
        <div className="trust"><div className="badge">%</div><div style={{ flex: 1 }}><div className="eyebrow">Fee on every trade · {fee.total}%</div><div style={{ fontWeight: 800, fontSize: "1.05rem" }}>{fee.launchpad}% launchpad · {fee.founder}% founder · {fee.community}% holders{splitLabel ? ` · founder split ${splitLabel}` : ""}</div></div></div>
      </div>

      {onchain && tokenId !== undefined && (
        <div className="card pad" style={{ marginTop: 16, display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ flex: 1 }}><div className="eyebrow">Trading fees collected so far</div><div style={{ fontFamily: "var(--font-display)", fontSize: "1.4rem", fontWeight: 700 }}>{collectedEth.toFixed(5)} ETH</div><div className="muted" style={{ fontSize: ".85rem" }}>Anyone can trigger a payout; fees go straight to the launchpad, the founder and the holder rewards pool.{isV4 ? " Buys pay in ETH, sells pay in the token; both are split the same way." : ""}</div></div>
          <button className="btn primary" onClick={collect} disabled={collecting || !me}>{collecting ? "Collecting…" : isCreator ? "Collect my fees" : "Collect & pay out"}</button>
        </div>
      )}

      <div className="tabs">{tabs.map(([k, l]) => <button key={k} className={activeTab === k ? "on" : ""} onClick={() => setTab(k)}>{l}</button>)}</div>

      {activeTab === "trade" && isV4 && (
        <div className="grid g2">
          <Swap t={t} chain={chain} symbol={symbol} />
          <div style={{ display: "grid", gap: 14 }}>
            <div className="card pad" style={{ display: "grid", gap: 10 }}>
              <h3>Where the {fee.total}% goes</h3>
              <div className="kv"><span>Launchpad</span><b>{fee.launchpad}%</b></div>
              <div className="kv"><span>Founder</span><b>{fee.founder}%</b></div>
              <div className="kv"><span>Holders (Sunday payouts)</span><b>{fee.community}%</b></div>
              <p className="muted" style={{ fontSize: ".82rem" }}>Set on-chain at launch, cannot change. Liquidity is locked forever.</p>
            </div>
            {onchain && chain.chartUrl && <div className="chart" style={{ height: 300 }}><iframe title="chart" src={chain.chartUrl(t.address)} style={{ width: "100%", height: "100%", border: 0 }} /></div>}
          </div>
        </div>
      )}

      {activeTab === "hold" && (
        <div className="grid g2">
          <div className="card pad" style={{ display: "grid", gap: 14 }}>
            <h3>Soft staking</h3>
            <p className="muted" style={{ fontSize: ".93rem" }}>Nothing to stake, nothing to lock. Every Sunday at 00:00 UTC we snapshot every wallet holding {symbol} and send rewards straight to it — a variety of stock tokens, experimental AI agents and new NFTs, funded by the {fee.community}% holder share of the week&apos;s trades. Pool, vault and exchange wallets are excluded.</p>
            <div className="kv"><span>Next snapshot</span><b>{nextSunday} · 00:00 UTC</b></div>
            <div className="kv"><span>Holder fees so far</span><b>{holdersEth.toFixed(4)} ETH</b></div>
            <div className="kv"><span>First payout</span><b>after the first full week</b></div>
            {me ? (
              <div className="note" style={{ display: "grid", gap: 4 }}>
                <div className="kv"><span>You hold</span><b>{fmt(myTokens)} {symbol} · {(myTokens / TOTAL_SUPPLY * 100).toFixed(3)}%</b></div>
                <div className="kv"><span>Counted at the snapshot</span><b>{myTokens > 0 ? "Yes" : "Hold any amount"}</b></div>
              </div>
            ) : <WalletButton />}
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>{isV4 ? <button className="btn mint" onClick={() => setTab("trade")}>Buy {symbol}</button> : <a className="btn mint" href={onchain ? chain.swapUrl(t.address) : "#"} target="_blank" rel="noreferrer">Buy {symbol}</a>}<Link className="btn" href="/launchpad/docs#soft-staking">How payouts work</Link></div>
          </div>
          <div className="card pad" style={{ display: "grid", gap: 10 }}>
            <h3>What the fee funds</h3>
            <div className="kv"><span>Holder rewards pool</span><b>{fee.community}% of every trade</b></div>
            <div className="kv"><span>Founder</span><b>{fee.founder}% of every trade</b></div>
            <div className="kv"><span>Launchpad</span><b>{fee.launchpad}% of every trade</b></div>
            <p className="muted" style={{ fontSize: ".82rem" }}>The split was written on-chain at launch and cannot change. Liquidity is locked forever.</p>
            {business && <a className="btn" href={href(business)} target="_blank" rel="noreferrer">See what the agents are building ↗</a>}
          </div>
        </div>
      )}

      {activeTab === "chart" && (
        <div className="grid g2">
          <div style={{ display: "grid", gap: 12 }}>
            {onchain && chain.chartUrl ? (
              <div className="chart" style={{ height: 420 }}><iframe title="chart" src={chain.chartUrl(t.address)} style={{ width: "100%", height: "100%", border: 0 }} /></div>
            ) : <div className="empty" style={{ height: 200, display: "grid", placeItems: "center" }}>Charts are mainnet-only. Trades show on the explorer.</div>}
          </div>
          <div className="card pad holders">
            <h3>Distribution at launch</h3>
            {[["Founder lock (vault)", t.lockPct || 0], ["Liquidity pool", (100 - (t.lockPct || 0)).toFixed(1)]].map(([n, p]) => <div key={String(n)} className="kv"><span>{n}</span><b>{p}%</b></div>)}
            <p className="muted" style={{ fontSize: ".82rem" }}>Every token bought since then came out of the pool. Current holders are on the explorer.</p>
            {onchain && <a className="btn sm" href={`${chain.explorer}/token/${t.address}${chain.key === "robinhood" ? "?tab=holders" : "#balances"}`} target="_blank" rel="noreferrer">Holders on explorer</a>}
          </div>
        </div>
      )}

      {activeTab === "share" && (
        <div className="grid g2">
          <div className="share">
            <div className="eyebrow">mememaxxers · {chain.short}</div>
            <div className="big" style={{ margin: "12px 0 16px" }}>{t.lockPct ? `${short(t.creator) || t.creator} locked ${t.lockPct}% of $${symbol} for ${t.lockDays} days.` : `$${symbol} is live. ${fee.community}% of every trade goes to holders.`}</div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}><span className="tag">{fee.total}% fee · {fee.community}% to holders</span>{t.devBuyEth ? <span className="tag">Dev buy {t.devBuyEth} ETH</span> : null}</div>
            <div className="paw">🐾</div>
          </div>
          <div className="card pad" style={{ display: "grid", gap: 12 }}>
            <h3>Share it</h3>
            <p className="muted">Every launch and every Sunday payout gets a card like this. Post it, tag the token, flex a little.</p>
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
