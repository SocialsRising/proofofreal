"use client";
/* JPEG Anvil: a fixed-rate swap between a token and an NFT collection. Forge = tokens → NFT, melt = NFT → tokens.
   Contracts: contracts/JpegAnvil.sol (no owner, no fees, no withdrawals). Everything here signs from the user's wallet. */
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { concat, erc20Abi, formatUnits, isAddress, parseEventLogs, parseUnits } from "viem";
import { useAccount, usePublicClient, useSendTransaction, useSwitchChain, useWriteContract } from "wagmi";
import { WalletButton } from "../../launchpad/_components/Wallet";
import { useToast } from "../../launchpad/_components/Toast";
import { ELYSIUM, LINKS, explorerAddr } from "../_lib/config";
import { short } from "../_lib/montra";
import { ERC721_ABI, MAX_BATCH, RATE_PRESETS, deployerReady, factoryLive, listAnvils, nftImage, ownedIds, parseIds, readAnvil, type AnvilInfo } from "../_lib/anvil";
import { ANVIL_ABI, ANVIL_FACTORY, ANVIL_FACTORY_ABI, ANVIL_FACTORY_INITCODE, ANVIL_SALT, CREATE2_DEPLOYER } from "../_lib/anvilArtifacts";

const fmt = (v: bigint, d: number) => Number(formatUnits(v, d)).toLocaleString(undefined, { maximumFractionDigits: 2 });
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
      return await client!.waitForTransactionReceipt({ hash, timeout: 180_000 });
    } catch (e) { setErr(errMsg(e)); return null; } finally { setBusy(""); }
  }, [chainId, client, switchChainAsync]);
  return { address, isConnected, client, busy, err, setErr, run };
}

function NftTile({ nft, id, on, onClick }: { nft: `0x${string}`; id: bigint; on: boolean; onClick: () => void }) {
  const client = usePublicClient({ chainId: ELYSIUM.chainId });
  const [img, setImg] = useState<string | null>(null);
  useEffect(() => { let live = true; if (client) nftImage(client, nft, id).then((x) => live && setImg(x)); return () => { live = false; }; }, [client, nft, id]);
  return (
    <button type="button" className={`anv-tile ${on ? "on" : ""}`} onClick={onClick} aria-pressed={on}>
      {img ? <img src={img} alt="" loading="lazy" referrerPolicy="no-referrer" /> : <span className="anv-ph">🖼️</span>}
      <span className="anv-id">#{id.toString()}</span>
    </button>
  );
}

/** One anvil: forge, melt and stock. */
function AnvilPanel({ address }: { address: `0x${string}` }) {
  const toast = useToast();
  const { writeContractAsync } = useWriteContract();
  const { address: me, isConnected, client, busy, err, setErr, run } = useTx();
  const [a, setA] = useState<AnvilInfo | null>(null);
  const [missing, setMissing] = useState(false);
  const [held, setHeld] = useState<bigint[]>([]);
  const [mode, setMode] = useState<"forge" | "melt" | "stock">("forge");
  const [pick, setPick] = useState<bigint[]>([]);
  const [idsText, setIdsText] = useState("");
  const [mine, setMine] = useState<bigint[] | null>(null);
  const [tokAmt, setTokAmt] = useState("");

  const load = useCallback(async () => {
    if (!client) return;
    try {
      const info = await readAnvil(client, address);
      setA(info);
      setHeld(await client.readContract({ address, abi: ANVIL_ABI, functionName: "heldIds", args: [BigInt(0), BigInt(200)] }) as bigint[]);
    } catch { setMissing(true); }
  }, [client, address]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (client && a && me) ownedIds(client, a.nft, me).then(setMine); }, [client, a, me]);

  if (missing) return <div className="warn">That address isn&apos;t a JPEG Anvil on Elysium.</div>;
  if (!a) return <div className="empty">Loading the anvil…</div>;
  const tok = `$${a.symbol}`, perNft = fmt(a.rate, a.decimals);
  const typed = parseIds(idsText);
  const meltIds = mode === "melt" || mode === "stock" ? typed ?? [] : [];
  const n = mode === "forge" ? pick.length : meltIds.length;
  const total = a.rate * BigInt(n);
  const toggle = (id: bigint) => setPick((p) => (p.includes(id) ? p.filter((x) => x !== id) : p.length >= MAX_BATCH ? p : [...p, id]));

  async function forge() {
    if (!me || !client || !pick.length) return;
    const allowance = await client.readContract({ address: a!.token, abi: erc20Abi, functionName: "allowance", args: [me, address] });
    if (allowance < total && !(await run("Approving", () => writeContractAsync({ address: a!.token, abi: erc20Abi, functionName: "approve", args: [address, total], chainId: ELYSIUM.chainId })))) return;
    const r = await run("Forging", () => writeContractAsync({ address, abi: ANVIL_ABI, functionName: "forge", args: [pick], chainId: ELYSIUM.chainId }));
    if (r) { toast(`Forged ${pick.length} NFT${pick.length > 1 ? "s" : ""} 🔥`); setPick([]); load(); }
  }
  async function meltOrStock(kind: "melt" | "stock") {
    if (!me || !client || !meltIds.length) return;
    const ok = await client.readContract({ address: a!.nft, abi: ERC721_ABI, functionName: "isApprovedForAll", args: [me, address] });
    if (!ok && !(await run("Approving", () => writeContractAsync({ address: a!.nft, abi: ERC721_ABI, functionName: "setApprovalForAll", args: [address, true], chainId: ELYSIUM.chainId })))) return;
    const r = await run(kind === "melt" ? "Melting" : "Stocking", () => writeContractAsync({ address, abi: ANVIL_ABI, functionName: kind, args: [meltIds], chainId: ELYSIUM.chainId }));
    if (r) { toast(kind === "melt" ? `Melted ${meltIds.length} NFT${meltIds.length > 1 ? "s" : ""} into ${tok} 💧` : "Stocked ✓"); setIdsText(""); load(); }
  }
  async function addTokens() {
    let amt: bigint; try { amt = parseUnits(tokAmt.trim(), a!.decimals); } catch { return setErr("Enter a token amount."); }
    if (amt <= BigInt(0)) return setErr("Enter a token amount.");
    const r = await run("Sending tokens", () => writeContractAsync({ address: a!.token, abi: erc20Abi, functionName: "transfer", args: [address, amt], chainId: ELYSIUM.chainId }));
    if (r) { toast(`Added ${tokAmt} ${tok}`); setTokAmt(""); load(); }
  }

  return (
    <div className="card pad anv-panel">
      <div className="anv-head">
        <div><div className="eyebrow">Anvil</div><h2>{a.nftName} <span className="muted">⇄</span> {tok}</h2></div>
        <div className="anv-rate"><b>1 NFT = {perNft} {tok}</b><small>both ways, fixed</small></div>
      </div>
      <div className="anv-stats">
        <div><b>{a.held.toString()}</b><span>NFTs to forge</span></div>
        <div><b>{fmt(a.reserve, a.decimals)}</b><span>{tok} to melt into</span></div>
        <div><b>{(a.reserve / a.rate).toString()}</b><span>NFTs it can buy back</span></div>
      </div>

      <div className="anv-tabs" role="tablist">
        {(["forge", "melt", "stock"] as const).map((k) => <button key={k} role="tab" aria-selected={mode === k} className={mode === k ? "on" : ""} onClick={() => { setMode(k); setErr(""); }}>{k === "forge" ? "🔥 Forge" : k === "melt" ? "💧 Melt" : "➕ Stock"}</button>)}
      </div>

      {mode === "forge" && (
        <>
          <p className="muted anv-hint">Pick NFTs from the anvil and pay {perNft} {tok} each.</p>
          {held.length ? <div className="anv-grid">{held.map((id) => <NftTile key={id.toString()} nft={a.nft} id={id} on={pick.includes(id)} onClick={() => toggle(id)} />)}</div>
            : <div className="empty">No NFTs in the anvil right now. Melt one in, or check back.</div>}
        </>
      )}
      {(mode === "melt" || mode === "stock") && (
        <>
          <p className="muted anv-hint">{mode === "melt" ? `Melt your NFTs into ${perNft} ${tok} each.` : "Add NFTs or tokens as liquidity. They stay in the anvil for good: there are no withdrawals. Stock and forge one NFT first to check your token and collection work."}</p>
          {mine && mine.length > 0 && <div className="chips" style={{ marginBottom: 8 }}>{mine.slice(0, 30).map((id) => <button key={id.toString()} type="button" className={`chip ${meltIds.includes(id) ? "on" : ""}`} onClick={() => setIdsText((t) => { const cur = parseIds(t) ?? []; return (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]).join(", "); })}>#{id.toString()}</button>)}</div>}
          <input className="inp mono" value={idsText} onChange={(e) => setIdsText(e.target.value)} placeholder="Your NFT ids, e.g. 12, 15, 20-22" aria-label="NFT ids" />
          {idsText && !typed && <p className="muted" style={{ fontSize: ".82rem", marginTop: 6 }}>Use ids like 12, 15 or 20-22 (up to {MAX_BATCH}).</p>}
        </>
      )}

      <div className="anv-action">
        {mode !== "stock" && <div className="kv" style={{ borderBottom: 0, padding: 0 }}><span>{mode === "forge" ? "You pay" : "You get"}</span><b className="mono">{fmt(total, a.decimals)} {tok}</b></div>}
        {mode === "melt" && n > 0 && a.reserve < total && <div className="warn">The anvil has {fmt(a.reserve, a.decimals)} {tok}, not enough for {n} NFT{n > 1 ? "s" : ""}.</div>}
        {!isConnected ? <WalletButton size="lg" />
          : mode === "forge" ? <button className="btn primary lg full" disabled={!!busy || !pick.length} onClick={forge}>{busy || (pick.length ? `Forge ${pick.length} NFT${pick.length > 1 ? "s" : ""}` : "Pick NFTs to forge")}</button>
          : mode === "melt" ? <button className="btn primary lg full" disabled={!!busy || !n || a.reserve < total} onClick={() => meltOrStock("melt")}>{busy || (n ? `Melt ${n} NFT${n > 1 ? "s" : ""}` : "Enter NFT ids")}</button>
          : (
            <div style={{ display: "grid", gap: 10 }}>
              <button className="btn primary full" disabled={!!busy || !n} onClick={() => meltOrStock("stock")}>{busy === "Stocking" || busy === "Approving" ? busy : n ? `Stock ${n} NFT${n > 1 ? "s" : ""}` : "Stock NFTs"}</button>
              <div style={{ display: "flex", gap: 8 }}><input className="inp mono" value={tokAmt} onChange={(e) => setTokAmt(e.target.value)} inputMode="decimal" placeholder={`${tok} amount`} aria-label="Token amount" /><button className="btn" disabled={!!busy} onClick={addTokens}>{busy === "Sending tokens" ? "Sending…" : `Add ${tok}`}</button></div>
            </div>
          )}
        {err && <div className="warn">{err}</div>}
      </div>

      <div className="anv-verify">
        <span>Anvil <a className="mono" href={explorerAddr(a.address)} target="_blank" rel="noreferrer">{short(a.address)} ↗</a></span>
        <span>Token <a className="mono" href={explorerAddr(a.token)} target="_blank" rel="noreferrer">{short(a.token)} ↗</a></span>
        <span>Collection <a className="mono" href={explorerAddr(a.nft)} target="_blank" rel="noreferrer">{short(a.nft)} ↗</a></span>
        <span>Creator <a className="mono" href={explorerAddr(a.creator)} target="_blank" rel="noreferrer">{short(a.creator)} ↗</a></span>
      </div>
      <p className="muted" style={{ fontSize: ".78rem", marginTop: 8 }}>Anyone can create an anvil, so check the token and collection addresses with the project before you swap.</p>
    </div>
  );
}

/** Creating an anvil (and, the very first time on Elysium, the factory itself). */
function CreateAnvil() {
  const router = useRouter();
  const toast = useToast();
  const { writeContractAsync } = useWriteContract();
  const { sendTransactionAsync } = useSendTransaction();
  const { isConnected, client, busy, err, setErr, run } = useTx();
  const [live, setLive] = useState<boolean | null>(null);
  const [token, setToken] = useState(""), [nft, setNft] = useState("");
  const [rateSel, setRateSel] = useState<number | "custom">(RATE_PRESETS[1]);
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
          const isNft = await client.readContract({ address: t, abi: ERC721_ABI, functionName: "supportsInterface", args: ["0x80ac58cd"] }).catch(() => false);
          if (isNft) throw 0;
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
    if (r && client && (await factoryLive(client))) { setLive(true); toast("JPEG Anvil is set up on Elysium ✓"); }
    else if (r) setErr("The setup went through but the factory isn't at its expected address with the expected code. Message @Tradesgiving.");
  }
  async function create() {
    if (!ready) return;
    const r = await run("Creating", () => writeContractAsync({ address: ANVIL_FACTORY, abi: ANVIL_FACTORY_ABI, functionName: "create", args: [token.trim() as `0x${string}`, nft.trim() as `0x${string}`, rate!], chainId: ELYSIUM.chainId }));
    if (!r) return;
    const [ev] = parseEventLogs({ abi: ANVIL_FACTORY_ABI, eventName: "AnvilCreated", logs: r.logs.filter((l) => l.address.toLowerCase() === ANVIL_FACTORY) });
    if (!ev) return setErr("Created, but the receipt had no AnvilCreated event. Check your wallet's activity.");
    toast("Anvil created 🔨 Now stock it.");
    router.push(`/incubator/anvil?a=${ev.args.anvil.toLowerCase()}`);
  }

  return (
    <div className="card pad anv-create">
      <div className="field"><label htmlFor="a-token">Token address <span className="req">*</span></label><input id="a-token" className="inp mono" value={token} onChange={(e) => setToken(e.target.value)} placeholder="0x… (your Montra token)" />
        <span className="hint">{meta.tokenErr ?? (meta.sym ? `$${meta.sym}` : "The ERC-20 side.")}</span></div>
      <div className="field"><label htmlFor="a-nft">NFT collection address <span className="req">*</span></label><input id="a-nft" className="inp mono" value={nft} onChange={(e) => setNft(e.target.value)} placeholder="0x… (your collection)" />
        <span className="hint">{meta.nftErr ?? (meta.nftName ?? "The ERC-721 side.")}</span></div>
      <div className="field"><span className="flabel">Tokens per NFT</span>
        <div className="chips" role="group" aria-label="Rate">
          {RATE_PRESETS.map((p) => <button key={p} type="button" aria-pressed={rateSel === p} className={`chip ${rateSel === p ? "on" : ""}`} onClick={() => setRateSel(p)}>{p >= 1e6 ? `${p / 1e6}M` : `${p / 1e3}K`}</button>)}
          <button type="button" aria-pressed={rateSel === "custom"} className={`chip ${rateSel === "custom" ? "on" : ""}`} onClick={() => setRateSel("custom")}>Custom</button>
        </div>
        {rateSel === "custom" && <input className="inp mono" style={{ marginTop: 8 }} value={custom} onChange={(e) => setCustom(e.target.value)} inputMode="decimal" placeholder="Tokens per NFT" />}
        <span className="hint">Fixed forever. 1 NFT = {rateWhole || "—"} {meta.sym ? `$${meta.sym}` : "tokens"}, both ways.</span>
      </div>
      {!isConnected ? <WalletButton size="lg" /> : live === false ? (
        <>
          <button className="btn primary lg full" disabled={!!busy} onClick={setupFactory}>{busy || "Set up JPEG Anvil on Elysium (one time)"}</button>
          <p className="muted" style={{ fontSize: ".78rem" }}>First anvil ever on Elysium: this deploys the factory to its fixed address <span className="mono">{short(ANVIL_FACTORY)}</span>. Anyone can do it once; it has no owner.</p>
        </>
      ) : <button className="btn primary lg full" disabled={!!busy || !ready || live == null} onClick={create}>{busy || "Create anvil"}</button>}
      {err && <div className="warn">{err}</div>}
    </div>
  );
}

function Directory() {
  const client = usePublicClient({ chainId: ELYSIUM.chainId });
  const [list, setList] = useState<AnvilInfo[] | null>(null);
  useEffect(() => { if (client) factoryLive(client).then((ok) => (ok ? listAnvils(client) : [])).then(setList).catch(() => setList([])); }, [client]);
  if (list == null) return <div className="empty">Loading anvils…</div>;
  if (!list.length) return <div className="empty">No anvils yet. Be the first to forge one below.</div>;
  return (
    <div className="anv-list">
      {list.map((a) => (
        <Link key={a.address} className="anv-card" href={`/incubator/anvil?a=${a.address.toLowerCase()}`}>
          <b>{a.nftName} ⇄ ${a.symbol}</b>
          <span>1 NFT = {fmt(a.rate, a.decimals)} ${a.symbol}</span>
          <small>{a.held.toString()} NFTs · {fmt(a.reserve, a.decimals)} ${a.symbol} in the anvil</small>
        </Link>
      ))}
    </div>
  );
}

const PERKS = [
  { icon: "🛡️", title: "NFTs keep your community", text: "Holders with art, status and roles stick around and show up." },
  { icon: "🌊", title: "Tokens bring the liquidity", text: "Easy to buy and sell, so volume and new traders keep flowing." },
  { icon: "⚒️", title: "The anvil links them", text: "Swap between the two at one fixed rate, any time, both ways." },
  { icon: "📈", title: "Every trade feeds both", text: "When one side runs, people forge or melt, and both markets move." },
];
const STEPS = [
  { title: "Make your NFT collection", text: "Create it on OpenSea on Elysium.", href: "https://opensea.io/studio", cta: "OpenSea Studio ↗" },
  { title: "Launch your token", text: "On Montra, through the EARLY incubator.", href: "/incubator/elysium/launch", cta: "Launch a token →" },
  { title: "Create the anvil", text: "Pick 100K, 1M or 10M tokens per NFT.", href: "#create", cta: "Create below ↓" },
  { title: "Stock both sides", text: "Add NFTs to forge and tokens to melt into.", href: "#create", cta: "" },
];

function AnvilPage() {
  const params = useSearchParams();
  const sel = (params.get("a") ?? "").toLowerCase();
  return (
    <>
      <section className="anv-hero">
        <div className="eyebrow live"><i />JPEG Anvil · Elysium</div>
        <h1>Forge tokens into NFTs.<br /><span className="dim">Melt NFTs back into tokens.</span></h1>
        <p className="lead">One fixed rate, both ways. Community retention from NFTs and liquidity from tokens, in one place.</p>
        <div className="anv-flow" aria-hidden><span>🪙 {RATE_PRESETS[1].toLocaleString()} tokens</span><i>🔥 forge →<br />← melt 💧</i><span>🖼️ 1 NFT</span></div>
      </section>

      <section className="blk" id="swap" style={{ paddingTop: 10 }}>
        {isAddress(sel) ? <><Link href="/incubator/anvil" className="muted" style={{ fontSize: ".88rem" }}>← All anvils</Link><div style={{ marginTop: 12 }}><AnvilPanel address={sel as `0x${string}`} /></div></>
          : <><div className="sh"><div className="eyebrow">Anvils</div><h2>Pick a pair</h2></div><Directory /></>}
      </section>

      <section className="blk">
        <div className="sh"><div className="eyebrow">Why an anvil</div><h2>The best of both worlds</h2></div>
        <div className="gen-perks">{PERKS.map((p) => <div key={p.title} className="gen-perk"><span className="gen-ico" aria-hidden>{p.icon}</span><h3>{p.title}</h3><p>{p.text}</p></div>)}</div>
      </section>

      <section className="blk" id="create">
        <div className="sh"><div className="eyebrow">For creators</div><h2>Forge your own anvil</h2></div>
        <div className="grid2">
          <ol className="anv-steps">
            {STEPS.map((s, i) => <li key={s.title}><span className="gen-dot">{i + 1}</span><div><b>{s.title}</b><p>{s.text}</p>{s.cta && (s.href.startsWith("http") ? <a href={s.href} target="_blank" rel="noopener noreferrer">{s.cta}</a> : <Link href={s.href}>{s.cta}</Link>)}</div></li>)}
            <li className="anv-note"><b>Good to know</b><p>No owner, no fees, no withdrawals: what you stock stays as liquidity, so test with one NFT first. Tokens with transfer fees and NFT/token hybrids don&apos;t work. Anyone forging picks which NFT they get, so a rate fits collections where every piece is worth about the same. Questions? <a href={LINKS.helpTelegram} target="_blank" rel="noopener noreferrer">@Tradesgiving ↗</a></p></li>
          </ol>
          <CreateAnvil />
        </div>
      </section>
    </>
  );
}

export default function Page() {
  return <Suspense fallback={<section className="blk"><div className="empty">Loading…</div></section>}><AnvilPage /></Suspense>;
}

