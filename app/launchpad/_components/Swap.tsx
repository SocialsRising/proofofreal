"use client";
import { useEffect, useMemo, useState } from "react";
import { concatHex, encodeAbiParameters, erc20Abi, formatEther, keccak256, maxUint160, maxUint256, parseEther } from "viem";
import { useAccount, useBalance, usePublicClient, useReadContract, useSwitchChain, useWriteContract } from "wagmi";
import type { ChainInfo } from "../_lib/chains";
import type { LaunchToken } from "../_lib/types";
import { LaunchFactoryV4Abi, StateViewAbi } from "../_lib/abi";
import { ACT_SETTLE_ALL, ACT_SWAP_EXACT_IN_SINGLE, ACT_TAKE_ALL, DYNAMIC_FEE_FLAG, Permit2Abi, PoolKeyComponents, UR_V4_SWAP, UniversalRouterAbi, V4QuoterAbi } from "../_lib/v4abi";
import { ethPerTokenFromSqrtX96 } from "../_lib/curve";
import { TOTAL_SUPPLY } from "../_lib/config";
import { useEthPrice } from "../_lib/useEthPrice";
import { fmt, price, usd } from "../_lib/format";
import { readable } from "../_lib/launchpad";
import { useToast } from "./Toast";
import { WalletButton } from "./Wallet";

type Key = { currency0: `0x${string}`; currency1: `0x${string}`; fee: number; tickSpacing: number; hooks: `0x${string}` };
const ZERO = "0x0000000000000000000000000000000000000000" as const;
const UINT48_MAX = 281474976710655;
const hex1 = (n: number) => `0x${n.toString(16).padStart(2, "0")}` as `0x${string}`;
export const poolIdOf = (k: Key) => keccak256(encodeAbiParameters([{ type: "tuple", components: PoolKeyComponents }], [k]));

/**
 * In-app buy/sell for tokens on the V4 factory. Uniswap's own site does not route pools with custom hooks, so this
 * talks to the UniversalRouter directly: V4_SWAP → SWAP_EXACT_IN_SINGLE + SETTLE_ALL + TAKE_ALL. Quotes come from
 * the V4Quoter and already include the pool's fee. Selling needs the standard Permit2 approvals (once per token).
 */
export function Swap({ t, chain, symbol }: { t: LaunchToken; chain: ChainInfo; symbol: string }) {
  const v4 = chain.v4!;
  const token = t.address as `0x${string}`;
  const { address: me, chainId } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient({ chainId: chain.id });
  const toast = useToast();
  const { eth: ethUsd } = useEthPrice();
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [amt, setAmt] = useState("0.1");
  const [slip, setSlip] = useState(2);
  const [quote, setQuote] = useState<bigint | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const { data: curve } = useReadContract({ address: chain.factoryV4, abi: LaunchFactoryV4Abi, functionName: "curve", chainId: chain.id, query: { enabled: !!chain.factoryV4 } });
  const tickSpacing = curve ? Number(curve[0]) : 200;
  const hooks = ((t.hook as `0x${string}` | null | undefined) ?? chain.hook ?? ZERO) as `0x${string}`;
  const key: Key = useMemo(() => ({ currency0: ZERO, currency1: token, fee: DYNAMIC_FEE_FLAG, tickSpacing, hooks }), [token, tickSpacing, hooks]);
  const poolId = ((t.poolId as `0x${string}` | null | undefined) ?? poolIdOf(key)) as `0x${string}`;

  const { data: slot0, refetch: refetchSlot } = useReadContract({ address: v4.stateView, abi: StateViewAbi, functionName: "getSlot0", args: [poolId], chainId: chain.id });
  const ethPerToken = slot0 ? ethPerTokenFromSqrtX96(slot0[0] as bigint) : 0;
  const mcapEth = ethPerToken * TOTAL_SUPPLY;
  const lpFeePct = slot0 ? Number(slot0[3]) / 10_000 : undefined;
  const { data: ethBal, refetch: refetchEth } = useBalance({ address: me, chainId: chain.id });
  const { data: tokBal, refetch: refetchTok } = useReadContract({ address: token, abi: erc20Abi, functionName: "balanceOf", args: me ? [me] : undefined, chainId: chain.id, query: { enabled: !!me } });

  const amountIn = useMemo(() => { try { return parseFloat(amt) > 0 ? parseEther(amt) : BigInt(0); } catch { return BigInt(0); } }, [amt]);

  useEffect(() => {
    let alive = true;
    if (!publicClient || amountIn === BigInt(0)) { setQuote(null); return; }
    setQuoting(true);
    const id = setTimeout(async () => {
      try {
        const r = await publicClient.simulateContract({ address: v4.quoter, abi: V4QuoterAbi, functionName: "quoteExactInputSingle", args: [{ poolKey: key, zeroForOne: side === "buy", exactAmount: amountIn, hookData: "0x" }] });
        if (alive) setQuote(r.result[0]);
      } catch { if (alive) setQuote(null); } finally { if (alive) setQuoting(false); }
    }, 350);
    return () => { alive = false; clearTimeout(id); };
  }, [publicClient, amountIn, side, key, v4.quoter]);

  const minOut = quote !== null ? quote - (quote * BigInt(Math.round(slip * 100))) / BigInt(10000) : BigInt(0);

  function encodeSwap(zeroForOne: boolean) {
    const actions = concatHex([hex1(ACT_SWAP_EXACT_IN_SINGLE), hex1(ACT_SETTLE_ALL), hex1(ACT_TAKE_ALL)]);
    const params = [
      encodeAbiParameters([{ type: "tuple", components: [{ name: "poolKey", type: "tuple", components: PoolKeyComponents }, { name: "zeroForOne", type: "bool" }, { name: "amountIn", type: "uint128" }, { name: "amountOutMinimum", type: "uint128" }, { name: "hookData", type: "bytes" }] }], [{ poolKey: key, zeroForOne, amountIn, amountOutMinimum: minOut, hookData: "0x" }]),
      encodeAbiParameters([{ type: "address" }, { type: "uint256" }], [zeroForOne ? ZERO : token, amountIn]),
      encodeAbiParameters([{ type: "address" }, { type: "uint256" }], [zeroForOne ? token : ZERO, minOut]),
    ];
    return { commands: hex1(UR_V4_SWAP), inputs: [encodeAbiParameters([{ type: "bytes" }, { type: "bytes[]" }], [actions, params])] };
  }

  async function ensurePermit2() {
    if (!me || !publicClient) return;
    const allowance = await publicClient.readContract({ address: token, abi: erc20Abi, functionName: "allowance", args: [me, v4.permit2] });
    if (allowance < amountIn) {
      setBusy("Approve token (1 of 2)…");
      const h = await writeContractAsync({ address: token, abi: erc20Abi, functionName: "approve", args: [v4.permit2, maxUint256], chainId: chain.id });
      await publicClient.waitForTransactionReceipt({ hash: h });
    }
    const [p2amt, p2exp] = await publicClient.readContract({ address: v4.permit2, abi: Permit2Abi, functionName: "allowance", args: [me, token, v4.universalRouter] });
    if (p2amt < amountIn || Number(p2exp) <= Math.floor(Date.now() / 1000)) {
      setBusy("Allow router (2 of 2)…");
      const h = await writeContractAsync({ address: v4.permit2, abi: Permit2Abi, functionName: "approve", args: [token, v4.universalRouter, maxUint160, UINT48_MAX], chainId: chain.id });
      await publicClient.waitForTransactionReceipt({ hash: h });
    }
  }

  async function go() {
    if (!me || !publicClient) return;
    if (quote === null) { toast("No quote yet"); return; }
    try {
      if (chainId !== chain.id) await switchChainAsync({ chainId: chain.id });
      if (side === "sell") await ensurePermit2();
      setBusy("Confirm in your wallet…");
      const { commands, inputs } = encodeSwap(side === "buy");
      const hash = await writeContractAsync({ address: v4.universalRouter, abi: UniversalRouterAbi, functionName: "execute", args: [commands, inputs, BigInt(Math.floor(Date.now() / 1000) + 600)], value: side === "buy" ? amountIn : BigInt(0), chainId: chain.id });
      setBusy("Waiting for confirmation…");
      await publicClient.waitForTransactionReceipt({ hash });
      toast(side === "buy" ? `Bought ${symbol} 🎉` : `Sold ${symbol}`);
      refetchSlot(); refetchEth(); refetchTok(); setQuote(null);
    } catch (e) { toast(readable(e)); } finally { setBusy(null); }
  }

  const balIn = side === "buy" ? (ethBal?.value ?? BigInt(0)) : ((tokBal as bigint | undefined) ?? BigInt(0));
  const outLabel = side === "buy" ? symbol : "ETH";
  const inLabel = side === "buy" ? "ETH" : symbol;
  const setMax = () => setAmt(side === "buy" ? Math.max(0, Number(formatEther(balIn)) - 0.002).toFixed(4) : formatEther(balIn));

  return (
    <div className="card pad swap">
      <div className="swap-head">
        <div className="tabs" style={{ margin: 0, border: 0 }}>
          <button className={side === "buy" ? "on" : ""} onClick={() => { setSide("buy"); setAmt("0.1"); }}>Buy</button>
          <button className={side === "sell" ? "on" : ""} onClick={() => { setSide("sell"); setAmt(""); }}>Sell</button>
        </div>
        <div className="mono muted" style={{ fontSize: ".78rem" }}>{lpFeePct !== undefined ? `${lpFeePct}% fee · in the quote` : ""}</div>
      </div>

      <div className="swap-box">
        <div className="row"><span className="muted" style={{ fontSize: ".8rem" }}>You pay</span><span className="muted mono" style={{ fontSize: ".78rem" }}>Balance {fmt(Number(formatEther(balIn)))} {inLabel}{me && <button className="btn sm ghost" style={{ padding: "2px 8px", marginLeft: 6 }} onClick={setMax}>max</button>}</span></div>
        <div className="row"><input className="swap-inp mono" inputMode="decimal" placeholder="0.0" value={amt} onChange={(e) => setAmt(e.target.value.replace(/[^0-9.]/g, ""))} /><span className="tag">{inLabel}</span></div>
      </div>
      <div className="swap-arrow">↓</div>
      <div className="swap-box">
        <div className="row"><span className="muted" style={{ fontSize: ".8rem" }}>You receive {quoting ? "· quoting…" : "· estimate"}</span></div>
        <div className="row"><div className="swap-inp mono" style={{ opacity: quote === null ? .5 : 1 }}>{quote !== null ? fmt(Number(formatEther(quote))) : "—"}</div><span className="tag">{outLabel}</span></div>
        {quote !== null && <div className="muted mono" style={{ fontSize: ".78rem" }}>{side === "buy" ? usd(Number(formatEther(amountIn)) * ethUsd) : usd(Number(formatEther(quote)) * ethUsd)} · min {fmt(Number(formatEther(minOut)))} {outLabel} after {slip}% slippage</div>}
      </div>

      <div className="row" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <span className="muted" style={{ fontSize: ".8rem" }}>Slippage</span>
        <div className="chips">{[1, 2, 5].map((s) => <button key={s} className={`chip ${slip === s ? "on" : ""}`} style={{ padding: "6px 12px", fontSize: ".82rem" }} onClick={() => setSlip(s)}>{s}%</button>)}</div>
      </div>

      {me ? <button className="btn primary lg full" disabled={!!busy || quote === null || amountIn === BigInt(0) || amountIn > balIn} onClick={go}>{busy ?? (amountIn > balIn ? `Not enough ${inLabel}` : side === "buy" ? `Buy ${symbol}` : `Sell ${symbol}`)}</button> : <WalletButton size="lg" />}

      <div className="kvs" style={{ fontSize: ".88rem" }}>
        <div className="kv"><span>Price</span><b>{ethPerToken ? price(ethPerToken * ethUsd) : "—"}</b></div>
        <div className="kv"><span>Market cap</span><b>{mcapEth ? `${mcapEth >= 1000 ? fmt(mcapEth) : mcapEth.toFixed(2)} ETH · ${usd(mcapEth * ethUsd)}` : "—"}</b></div>
        <div className="kv"><span>Route</span><b>Uniswap V4 · Robinhood</b></div>
      </div>
      <p className="muted" style={{ fontSize: ".74rem" }}>Trades go straight to the Uniswap V4 pool through the Universal Router. Selling asks for two one-time approvals (token → Permit2 → router).</p>
    </div>
  );
}
