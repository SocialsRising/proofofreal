"use client";
/* JPEG Anvil: a fixed-rate swap between a token and an NFT collection. Forge = tokens → NFT, melt = NFT → tokens.
   Contracts: contracts/JpegAnvil.sol. Every action signs from the user's own wallet. */
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { concat, erc20Abi, formatEther, formatUnits, isAddress, parseEther, parseEventLogs, parseUnits } from "viem";
import { useAccount, usePublicClient, useSendTransaction, useSwitchChain, useWriteContract } from "wagmi";
import { WalletButton } from "../../launchpad/_components/Wallet";
import { useToast } from "../../launchpad/_components/Toast";
import { ELYSIUM, LINKS, explorerAddr, launchpad } from "../_lib/config";
import { hypeUsd, montra, short } from "../_lib/montra";
import { ERC721_ABI, LORE, MAX_BATCH, RATE_PRESETS, deployerReady, factoryLive, listAnvils, nftMeta, openseaCollection, openseaItem, ownedIds, parseIds, readAnvil, type AnvilInfo } from "../_lib/anvil";
import { ANVIL_ABI, ANVIL_FACTORY, ANVIL_FACTORY_ABI, ANVIL_FACTORY_INITCODE, ANVIL_SALT, CREATE2_DEPLOYER } from "../_lib/anvilArtifacts";

const fmt = (v: bigint, d: number) => Number(formatUnits(v, d)).toLocaleString(undefined, { maximumFractionDigits: 2 });
const fmtC = (v: bigint, d: number) => new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 2 }).format(Number(formatUnits(v, d)));
const hype = (wei: bigint) => `${Number(formatEther(wei)).toLocaleString(undefined, { maximumFractionDigits: 4 })} HYPE`;
const pick1 = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];
const errMsg = (e: unknown) => {
  const m = (e as { shortMessage?: string; message?: string }).shortMessage ?? (e as Error).message ?? "Something went wrong.";
  return /rejected|denied/i.test(m) ? "You cancelled in your wallet." : m.slice(0, 220);
};

/** Wallet + chain + "send and wait" in one place, so every action shows the same states. */
function useTx() {
  const { address, chainId, isConnected } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const client = usePublicClient({ chainId: ELYSIUM.chainId });
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const run = useCallback(async (label: string, fn: () => Promise<`0x${string}`>) => {
    setErr(""); setBusy(label);
    try {
      if (chainId !== ELYSIUM.chainId) await switchChainAsync({ chainId: ELYSIUM.chainId });
      const hash = await fn();
      const r = await client!.waitForTransactionReceipt({ hash, timeout: 180_000 });
      if (r.status !== "success") throw new Error("The transaction failed on-chain.");
      return r;
    } catch (e) { setErr(errMsg(e)); return null; } finally { setBusy(""); }
  }, [chainId, client, switchChainAsync]);
  return { address, isConnected, client, busy, err, setErr, run };
}

/** HYPE's dollar price from Montra, for showing the fee in dollars. */
function useHypeUsd() {
  const [p, setP] = useState<number | null>(null);
  useEffect(() => { hypeUsd().then(setP).catch(() => {}); }, []);
  return p;
}
const usdOf = (wei: bigint, p: number | null) => (p ? `~$${(Number(formatEther(wei)) * p).toFixed(2)}` : "");

function NftImg({ nft, id, className }: { nft: `0x${string}`; id: bigint; className?: string }) {
  const [img, setImg] = useState<string | null | undefined>(undefined);
  useEffect(() => { let live = true; nftMeta(nft, id).then((m) => live && setImg(m.image)); return () => { live = false; }; }, [nft, id]);
  return img ? <img className={className} src={img} alt={`#${id}`} loading="lazy" referrerPolicy="no-referrer" /> : <span className={`anv-ph ${img === undefined ? "loading" : ""}`} aria-hidden>🖼️</span>;
}

type Win = { kind: "forge" | "melt" | "stock"; title: string; line: string; nft?: `0x${string}`; ids: bigint[]; share?: string };

/** The celebration pop-up after a forge, melt or stock. */
function Celebrate({ win, onClose }: { win: Win; onClose: () => void }) {
  useEffect(() => { const k = (e: KeyboardEvent) => e.key === "Escape" && onClose(); window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, [onClose]);
  return (
    <div className="anv-pop" role="dialog" aria-modal aria-label={win.title} onClick={onClose}>
      <div className={`anv-pop-card ${win.kind}`} onClick={(e) => e.stopPropagation()}>
        <div className="anv-sparks" aria-hidden>{Array.from({ length: 14 }, (_, i) => <i key={i} style={{ ["--a" as string]: `${i * 26}deg`, ["--d" as string]: `${0.6 + (i % 4) * 0.15}s` }} />)}</div>
        <div className="anv-pop-emoji" aria-hidden>{win.kind === "forge" ? "🔥" : win.kind === "melt" ? "💧" : "⚒️"}</div>
        <h3>{win.title}</h3>
        <p className="anv-lore">“{win.line}”</p>
        {win.nft && win.ids.length > 0 && <div className="anv-pop-nfts">{win.ids.slice(0, 6).map((id) => <a key={id.toString()} href={openseaItem(win.nft!, id)} target="_blank" rel="noopener noreferrer"><NftImg nft={win.nft!} id={id} /><span>#{id.toString()}</span></a>)}</div>}
        <div className="anv-pop-ctas">
          {win.share && <a className="btn primary" href={`https://x.com/intent/post?text=${encodeURIComponent(win.share)}`} target="_blank" rel="noopener noreferrer">Share on X ↗</a>}
          <button className="btn" onClick={onClose}>Keep smithing</button>
        </div>
      </div>
    </div>
  );
}

/** One anvil: forge, melt and stock. */
function AnvilPanel({ address }: { address: `0x${string}` }) {
  const { writeContractAsync } = useWriteContract();
  const { address: me, isConnected, client, busy, err, setErr, run } = useTx();
  const usd = useHypeUsd();
  const [a, setA] = useState<AnvilInfo | null>(null);
  const [missing, setMissing] = useState(false);
  const [held, setHeld] = useState<bigint[]>([]);
  const [mode, setMode] = useState<"forge" | "melt" | "stock">("forge");
  const [pick, setPick] = useState<bigint[]>([]);
  const [idsText, setIdsText] = useState("");
  const [mine, setMine] = useState<bigint[] | null>(null);
  const [tokAmt, setTokAmt] = useState("");
  const [tokUsd, setTokUsd] = useState<number | null>(null);
  const [win, setWin] = useState<Win | null>(null);

  const load = useCallback(async () => {
    if (!client) return;
    try {
      const info = await readAnvil(client, address);
      setA(info);
      setHeld(await client.readContract({ address, abi: ANVIL_ABI, functionName: "heldIds", args: [BigInt(0), BigInt(200)] }) as bigint[]);
      montra.token(info.token).then((t) => setTokUsd(t.priceUsd)).catch(() => {});
    } catch { setMissing(true); }
  }, [client, address]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (client && a && me) ownedIds(client, a.nft, me).then(setMine); }, [client, a, me, win]);

  if (missing) return <div className="warn">That address isn&apos;t a JPEG Anvil on Elysium.</div>;
  if (!a) return <div className="empty">Heating the anvil…</div>;
  const tok = `$${a.symbol}`, perNft = fmt(a.rate, a.decimals);
  const typed = parseIds(idsText);
  const meltIds = mode !== "forge" ? typed ?? [] : [];
  const n = mode === "forge" ? pick.length : meltIds.length;
  const total = a.rate * BigInt(n), feeTotal = a.fee * BigInt(n);
  const nftUsd = tokUsd != null ? Number(formatUnits(a.rate, a.decimals)) * tokUsd : null;
  const toggle = (id: bigint) => setPick((p) => (p.includes(id) ? p.filter((x) => x !== id) : p.length >= MAX_BATCH ? p : [...p, id]));
  const shareFor = (verb: string, ids: bigint[]) => `Just ${verb} ${a.nftName} ${ids.slice(0, 3).map((i) => `#${i}`).join(" ")} on the JPEG Anvil ⚒️ 1 NFT = ${perNft} ${tok}\n\nproofofreal.app/incubator/anvil?a=${a.address.toLowerCase()}`;

  async function forge() {
    if (!me || !client || !pick.length) return;
    const ids = pick;
    const allowance = await client.readContract({ address: a!.token, abi: erc20Abi, functionName: "allowance", args: [me, address] });
    if (allowance < total && !(await run("Approving", () => writeContractAsync({ address: a!.token, abi: erc20Abi, functionName: "approve", args: [address, total], chainId: ELYSIUM.chainId })))) return;
    const r = await run("Forging", () => writeContractAsync({ address, abi: ANVIL_ABI, functionName: "forge", args: [ids], value: feeTotal, chainId: ELYSIUM.chainId }));
    if (r) { setWin({ kind: "forge", title: `Forged ${ids.length} NFT${ids.length > 1 ? "s" : ""}!`, line: pick1(LORE.forge), nft: a!.nft, ids, share: shareFor("forged", ids) }); setPick([]); load(); }
  }
  async function meltOrStock(kind: "melt" | "stock") {
    if (!me || !client || !meltIds.length) return;
    const ids = meltIds;
    const ok = await client.readContract({ address: a!.nft, abi: ERC721_ABI, functionName: "isApprovedForAll", args: [me, address] });
    if (!ok && !(await run("Approving", () => writeContractAsync({ address: a!.nft, abi: ERC721_ABI, functionName: "setApprovalForAll", args: [address, true], chainId: ELYSIUM.chainId })))) return;
    const r = kind === "melt"
      ? await run("Melting", () => writeContractAsync({ address, abi: ANVIL_ABI, functionName: "melt", args: [ids], value: feeTotal, chainId: ELYSIUM.chainId }))
      : await run("Stocking", () => writeContractAsync({ address, abi: ANVIL_ABI, functionName: "stock", args: [ids], chainId: ELYSIUM.chainId }));
    if (r) {
      setWin(kind === "melt"
        ? { kind, title: `+${fmt(a!.rate * BigInt(ids.length), a!.decimals)} ${tok}`, line: pick1(LORE.melt), nft: a!.nft, ids, share: shareFor("melted", ids) }
        : { kind, title: `Stocked ${ids.length} NFT${ids.length > 1 ? "s" : ""}`, line: pick1(LORE.stock), nft: a!.nft, ids });
      setIdsText(""); load();
    }
  }
  async function addTokens() {
    let amt: bigint; try { amt = parseUnits(tokAmt.trim(), a!.decimals); } catch { return setErr("Enter a token amount."); }
    if (amt <= BigInt(0)) return setErr("Enter a token amount.");
    const r = await run("Sending tokens", () => writeContractAsync({ address: a!.token, abi: erc20Abi, functionName: "transfer", args: [address, amt], chainId: ELYSIUM.chainId }));
    if (r) { setWin({ kind: "stock", title: `Added ${tokAmt} ${tok}`, line: pick1(LORE.stock), ids: [] }); setTokAmt(""); load(); }
  }

  return (
    <div className="anv-panel">
      {win && <Celebrate win={win} onClose={() => setWin(null)} />}
      <div className="anv-head">
        <div className="anv-cover">{held[0] != null ? <NftImg nft={a.nft} id={held[0]} /> : <span className="anv-ph">⚒️</span>}</div>
        <div className="anv-title">
          <div className="eyebrow">{a.legacy ? "Anvil · v1 (no fee)" : "Anvil"}</div>
          <h2>{a.nftName} <span className="muted">⇄</span> {tok}</h2>
          <div className="anv-links">
            <a href={launchpad("montra").tokenUrl(a.token)} target="_blank" rel="noopener noreferrer">Trade {tok} on Montra ↗</a>
            <a href={openseaCollection(a.nft)} target="_blank" rel="noopener noreferrer">Collection on OpenSea ↗</a>
          </div>
        </div>
        <div className="anv-rate"><small>1 NFT</small><b>{perNft} {tok}</b>{nftUsd != null && <small>≈ ${nftUsd.toLocaleString(undefined, { maximumFractionDigits: nftUsd < 10 ? 2 : 0 })}</small>}</div>
      </div>

      <div className="anv-stats">
        <div><b>{a.held.toString()}</b><span>NFTs in the anvil</span></div>
        <div><b>{fmtC(a.reserve, a.decimals)}</b><span>{tok} in the anvil</span></div>
        <div><b>{a.fee > BigInt(0) ? hype(a.fee) : "Free"}</b><span>fee per NFT {a.fee > BigInt(0) ? usdOf(a.fee, usd) : ""}</span></div>
      </div>

      <div className="anv-tabs" role="tablist">
        {(["forge", "melt", "stock"] as const).map((k) => <button key={k} role="tab" aria-selected={mode === k} className={mode === k ? "on" : ""} onClick={() => { setMode(k); setErr(""); }}>{k === "forge" ? "🔥 Forge" : k === "melt" ? "💧 Melt" : "➕ Stock"}</button>)}
      </div>

      {mode === "forge" && (
        held.length ? <div className="anv-grid">{held.map((id) => (
          <button key={id.toString()} type="button" className={`anv-tile ${pick.includes(id) ? "on" : ""}`} onClick={() => toggle(id)} aria-pressed={pick.includes(id)}>
            <NftImg nft={a.nft} id={id} /><span className="anv-id">#{id.toString()}</span>{pick.includes(id) && <span className="anv-check">✓</span>}
          </button>
        ))}</div> : <div className="empty">The anvil is empty. Melt an NFT in, or check back soon.</div>
      )}
      {mode !== "forge" && (
        <div className="anv-ids">
          {mine && mine.length > 0 ? (
            <div className="anv-grid small">{mine.slice(0, 60).map((id) => (
              <button key={id.toString()} type="button" className={`anv-tile ${meltIds.includes(id) ? "on" : ""}`} aria-pressed={meltIds.includes(id)} onClick={() => setIdsText((t) => { const cur = parseIds(t) ?? []; return (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]).join(", "); })}>
                <NftImg nft={a.nft} id={id} /><span className="anv-id">#{id.toString()}</span>{meltIds.includes(id) && <span className="anv-check">✓</span>}
              </button>
            ))}</div>
          ) : null}
          <input className="inp mono" value={idsText} onChange={(e) => setIdsText(e.target.value)} placeholder="NFT ids, e.g. 12, 15, 20-22" aria-label="NFT ids" />
          {mode === "stock" && <p className="muted anv-hint">Stocked NFTs and tokens stay in the anvil as liquidity. There are no withdrawals.</p>}
        </div>
      )}

      <div className="anv-action">
        {mode !== "stock" && n > 0 && (
          <div className="anv-sum">
            <span>{mode === "forge" ? "You pay" : "You get"}</span><b>{fmt(total, a.decimals)} {tok}</b>
            {feeTotal > BigInt(0) && <><span>Fee</span><b>{hype(feeTotal)} <small className="muted">{usdOf(feeTotal, usd)}</small></b></>}
          </div>
        )}
        {mode === "melt" && n > 0 && a.reserve < total && <div className="warn">The anvil has {fmt(a.reserve, a.decimals)} {tok}, not enough for {n} NFT{n > 1 ? "s" : ""}.</div>}
        {!isConnected ? <WalletButton size="lg" />
          : mode === "forge" ? <button className="btn primary lg full anv-go" disabled={!!busy || !pick.length} onClick={forge}>{busy || (pick.length ? `🔥 Forge ${pick.length} NFT${pick.length > 1 ? "s" : ""}` : "Pick NFTs to forge")}</button>
          : mode === "melt" ? <button className="btn primary lg full anv-go" disabled={!!busy || !n || a.reserve < total} onClick={() => meltOrStock("melt")}>{busy || (n ? `💧 Melt ${n} NFT${n > 1 ? "s" : ""}` : "Pick NFTs to melt")}</button>
          : (
            <div style={{ display: "grid", gap: 10 }}>
              <button className="btn primary full" disabled={!!busy || !n} onClick={() => meltOrStock("stock")}>{busy === "Stocking" || busy === "Approving" ? `${busy}…` : n ? `⚒️ Stock ${n} NFT${n > 1 ? "s" : ""}` : "Pick NFTs to stock"}</button>
              <div style={{ display: "flex", gap: 8 }}><input className="inp mono" value={tokAmt} onChange={(e) => setTokAmt(e.target.value)} inputMode="decimal" placeholder={`${tok} amount`} aria-label="Token amount" /><button className="btn" disabled={!!busy} onClick={addTokens}>{busy === "Sending tokens" ? "Sending…" : `Add ${tok}`}</button></div>
            </div>
          )}
        {busy && <p className="muted anv-hint">{busy}… confirm in your wallet.</p>}
        {err && <div className="warn">{err}</div>}
      </div>

      <div className="anv-verify">
        <a href={explorerAddr(a.address)} target="_blank" rel="noreferrer">Anvil {short(a.address)} ↗</a>
        <a href={explorerAddr(a.token)} target="_blank" rel="noreferrer">Token {short(a.token)} ↗</a>
        <a href={explorerAddr(a.nft)} target="_blank" rel="noreferrer">Collection {short(a.nft)} ↗</a>
        <span>Check these with the project before you swap.</span>
      </div>
    </div>
  );
}

/** Creating an anvil (and, the very first time, the factory itself). */
function CreateAnvil() {
  const router = useRouter();
  const toast = useToast();
  const { writeContractAsync } = useWriteContract();
  const { sendTransactionAsync } = useSendTransaction();
  const { isConnected, client, busy, err, setErr, run } = useTx();
  const [live, setLive] = useState<boolean | null>(null);
  const [token, setToken] = useState(""), [nft, setNft] = useState("");
  const [rateSel, setRateSel] = useState<number | "custom">(RATE_PRESETS[0]);
  const [custom, setCustom] = useState("");
  const [meta, setMeta] = useState<{ sym?: string; dec?: number; nftName?: string; tokenErr?: string; nftErr?: string }>({});
  useEffect(() => { if (client) factoryLive(client).then(setLive).catch(() => setLive(null)); }, [client]);
  useEffect(() => {
    if (!client) return;
    const t = token.trim(), n = nft.trim();
    (async () => {
      const m: typeof meta = {};
      if (isAddress(t)) {
        try {
          if (await client.readContract({ address: t, abi: ERC721_ABI, functionName: "supportsInterface", args: ["0x80ac58cd"] }).catch(() => false)) throw 0;
          const [sym, dec] = await Promise.all([client.readContract({ address: t, abi: erc20Abi, functionName: "symbol" }), client.readContract({ address: t, abi: erc20Abi, functionName: "decimals" })]);
          m.sym = sym; m.dec = dec;
        } catch { m.tokenErr = "Not a token on Elysium."; }
      }
      if (isAddress(n)) { try { if (!(await client.readContract({ address: n, abi: ERC721_ABI, functionName: "supportsInterface", args: ["0x80ac58cd"] }))) throw 0; m.nftName = await client.readContract({ address: n, abi: ERC721_ABI, functionName: "name" }).catch(() => "NFT collection"); } catch { m.nftErr = "Not an NFT collection on Elysium."; } }
      setMeta(m);
    })();
  }, [client, token, nft]);

  const rateWhole = rateSel === "custom" ? custom.trim() : String(rateSel);
  const rate = (() => { try { return meta.dec != null && /^\d{1,15}(\.\d{1,18})?$/.test(rateWhole) ? parseUnits(rateWhole, meta.dec) : null; } catch { return null; } })();
  const ready = !!meta.sym && !!meta.nftName && !!rate && rate > BigInt(0);

  async function setupFactory() {
    if (!client || !(await deployerReady(client))) return setErr("Elysium's standard CREATE2 deployer isn't where it should be, so we stopped. Message @Tradesgiving.");
    const r = await run("Setting up", () => sendTransactionAsync({ to: CREATE2_DEPLOYER, data: concat([ANVIL_SALT, ANVIL_FACTORY_INITCODE]), chainId: ELYSIUM.chainId }));
    if (r && (await factoryLive(client))) { setLive(true); toast("JPEG Anvil is set up on Elysium ✓"); }
    else if (r) setErr("The setup went through but the factory isn't at its expected address with the expected code. Message @Tradesgiving.");
  }
  async function create() {
    if (!ready) return;
    const r = await run("Creating", () => writeContractAsync({ address: ANVIL_FACTORY, abi: ANVIL_FACTORY_ABI, functionName: "create", args: [token.trim() as `0x${string}`, nft.trim() as `0x${string}`, rate!], chainId: ELYSIUM.chainId }));
    if (!r) return;
    const [ev] = parseEventLogs({ abi: ANVIL_FACTORY_ABI, eventName: "AnvilCreated", logs: r.logs.filter((l) => l.address.toLowerCase() === ANVIL_FACTORY) });
    if (!ev) return setErr("Created, but the receipt had no AnvilCreated event. Check your wallet's activity.");
    toast("Anvil created ⚒️ Now stock it.");
    router.push(`/incubator/anvil?a=${ev.args.anvil.toLowerCase()}`);
  }

  return (
    <div className="card pad anv-create">
      <div className="field"><label htmlFor="a-token">1 · Your token</label><input id="a-token" className="inp mono" value={token} onChange={(e) => setToken(e.target.value)} placeholder="0x… token address" />
        <span className="hint">{meta.tokenErr ?? (meta.sym ? `✓ $${meta.sym}` : "Launched on Montra.")}</span></div>
      <div className="field"><label htmlFor="a-nft">2 · Your NFT collection</label><input id="a-nft" className="inp mono" value={nft} onChange={(e) => setNft(e.target.value)} placeholder="0x… collection address" />
        <span className="hint">{meta.nftErr ?? (meta.nftName ? `✓ ${meta.nftName}` : "On Elysium, e.g. made with OpenSea.")}</span></div>
      <div className="field"><span className="flabel">3 · Tokens per NFT</span>
        <div className="chips" role="group" aria-label="Rate">
          {RATE_PRESETS.map((p) => <button key={p} type="button" aria-pressed={rateSel === p} className={`chip ${rateSel === p ? "on" : ""}`} onClick={() => setRateSel(p)}>{p >= 1e6 ? `${p / 1e6}M` : `${p / 1e3}K`}</button>)}
          <button type="button" aria-pressed={rateSel === "custom"} className={`chip ${rateSel === "custom" ? "on" : ""}`} onClick={() => setRateSel("custom")}>Custom</button>
        </div>
        {rateSel === "custom" && <input className="inp mono" style={{ marginTop: 8 }} value={custom} onChange={(e) => setCustom(e.target.value)} inputMode="decimal" placeholder="Tokens per NFT" />}
      </div>
      {!isConnected ? <WalletButton size="lg" /> : live === false ? (
        <button className="btn primary lg full" disabled={!!busy} onClick={setupFactory}>{busy ? `${busy}…` : "Set up JPEG Anvil (one time)"}</button>
      ) : <button className="btn primary lg full anv-go" disabled={!!busy || !ready || live == null} onClick={create}>{busy ? `${busy}…` : "⚒️ Create anvil"}</button>}
      <p className="muted anv-hint">Then stock it with NFTs and {meta.sym ? `$${meta.sym}` : "tokens"}. Test with one NFT first: there are no withdrawals.</p>
      {err && <div className="warn">{err}</div>}
    </div>
  );
}

/** Only shown to the fee wallet: set the fee in dollars, and send collected fees on. */
function FeeDesk() {
  const { writeContractAsync } = useWriteContract();
  const { address: me, client, busy, err, setErr, run } = useTx();
  const usd = useHypeUsd();
  const [info, setInfo] = useState<{ recipient: string; fee: bigint; collected: bigint } | null>(null);
  const [dollars, setDollars] = useState("1");
  const load = useCallback(async () => {
    if (!client || !(await factoryLive(client).catch(() => false))) return;
    const [recipient, fee, collected] = await Promise.all([
      client.readContract({ address: ANVIL_FACTORY, abi: ANVIL_FACTORY_ABI, functionName: "feeRecipient" }),
      client.readContract({ address: ANVIL_FACTORY, abi: ANVIL_FACTORY_ABI, functionName: "fee" }),
      client.getBalance({ address: ANVIL_FACTORY }),
    ]);
    setInfo({ recipient: recipient.toLowerCase(), fee, collected });
  }, [client]);
  useEffect(() => { load(); }, [load]);
  if (!info || !me || me.toLowerCase() !== info.recipient) return null;
  const want = usd && Number(dollars) > 0 ? parseEther((Number(dollars) / usd).toFixed(6)) : null;
  return (
    <div className="card pad anv-desk">
      <div className="eyebrow">Fee desk · only you see this</div>
      <div className="anv-sum"><span>Fee now</span><b>{hype(info.fee)} <small className="muted">{usdOf(info.fee, usd)}</small></b><span>Collected</span><b>{hype(info.collected)} <small className="muted">{usdOf(info.collected, usd)}</small></b></div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <input className="inp mono" style={{ maxWidth: 120 }} value={dollars} onChange={(e) => setDollars(e.target.value)} inputMode="decimal" aria-label="Fee in dollars" />
        <button className="btn" disabled={!!busy || !want} onClick={async () => { if (want && (await run("Setting fee", () => writeContractAsync({ address: ANVIL_FACTORY, abi: ANVIL_FACTORY_ABI, functionName: "setFee", args: [want], chainId: ELYSIUM.chainId })))) load(); }}>Set fee to ${dollars}{want ? ` (${hype(want)})` : ""}</button>
        <button className="btn primary" disabled={!!busy || info.collected === BigInt(0)} onClick={async () => { if (await run("Sending fees", () => writeContractAsync({ address: ANVIL_FACTORY, abi: ANVIL_FACTORY_ABI, functionName: "withdraw", chainId: ELYSIUM.chainId }))) load(); }}>Send fees to your wallet</button>
      </div>
      {err && <div className="warn" onClick={() => setErr("")}>{err}</div>}
    </div>
  );
}

function Directory() {
  const client = usePublicClient({ chainId: ELYSIUM.chainId });
  const [list, setList] = useState<AnvilInfo[] | null>(null);
  useEffect(() => { if (client) factoryLive(client).then((ok) => (ok ? listAnvils(client) : [])).then(setList).catch(() => setList([])); }, [client]);
  if (list == null) return <div className="empty">Heating the anvils…</div>;
  if (!list.length) return <div className="empty">No anvils yet. Forge the first one below.</div>;
  return (
    <div className="anv-list">
      {list.map((a) => (
        <Link key={a.address} className="anv-card" href={`/incubator/anvil?a=${a.address.toLowerCase()}`}>
          <b>{a.nftName} <span className="muted">⇄</span> ${a.symbol}</b>
          <span>1 NFT = {fmt(a.rate, a.decimals)} ${a.symbol}</span>
          <small>{a.held.toString()} NFTs · {fmtC(a.reserve, a.decimals)} ${a.symbol}</small>
        </Link>
      ))}
    </div>
  );
}

const PERKS = [
  { icon: "🛡️", title: "NFTs keep your community", text: "Art, status and roles keep holders around." },
  { icon: "🌊", title: "Tokens bring liquidity", text: "Easy to trade, so volume keeps flowing." },
  { icon: "⚒️", title: "The anvil links them", text: "One fixed rate, both ways, any time." },
];

function AnvilPage() {
  const params = useSearchParams();
  const sel = (params.get("a") ?? "").toLowerCase();
  return (
    <>
      <section className="anv-hero">
        <div className="anv-hero-glow" aria-hidden />
        <div className="eyebrow live"><i />JPEG Anvil · Elysium</div>
        <h1>Forge tokens into NFTs.<br /><span className="dim">Melt them back.</span></h1>
        <div className="anv-flow" aria-hidden>
          <span>🪙 100,000 tokens</span>
          <i><em>🔥 forge →</em><em>← melt 💧</em></i>
          <span>🖼️ 1 NFT</span>
        </div>
        <div className="anv-perks">{PERKS.map((p) => <div key={p.title}><span aria-hidden>{p.icon}</span><b>{p.title}</b><small>{p.text}</small></div>)}</div>
      </section>

      <section className="blk" id="swap" style={{ paddingTop: 10 }}>
        {isAddress(sel) ? <><Link href="/incubator/anvil" className="muted" style={{ fontSize: ".88rem" }}>← All anvils</Link><div style={{ marginTop: 12 }}><AnvilPanel address={sel as `0x${string}`} /></div></>
          : <><div className="sh"><div className="eyebrow">Anvils</div><h2>Pick a pair</h2></div><Directory /></>}
      </section>

      <section className="blk" id="create">
        <div className="sh"><div className="eyebrow">For creators</div><h2>Make your own anvil</h2><p>Need a collection and a token first? Make the collection on <a href="https://opensea.io/studio" target="_blank" rel="noopener noreferrer" style={{ textDecoration: "underline" }}>OpenSea</a> and <Link href="/incubator/elysium/launch" style={{ textDecoration: "underline" }}>launch your token on Montra</Link>.</p></div>
        <div className="anv-create-wrap">
          <CreateAnvil />
          <FeeDesk />
          <p className="muted anv-hint">Every forge and melt pays a fee of about $1 in HYPE per NFT, which goes to EARLY&apos;s community wallet. No owner over the assets, no withdrawals. Questions? <a href={LINKS.helpTelegram} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "underline" }}>@Tradesgiving</a></p>
        </div>
      </section>
    </>
  );
}

export default function Page() {
  return <Suspense fallback={<section className="blk"><div className="empty">Loading…</div></section>}><AnvilPage /></Suspense>;
}
