"use client";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { short } from "../_lib/format";
import { useState } from "react";

export function WalletButton({ size = "sm" }: { size?: "sm" | "lg" }) {
  const { address, isConnected } = useAccount();
  const { connectors, connect, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const [open, setOpen] = useState(false);

  if (isConnected && address) {
    return <button className={`btn ${size}`} onClick={() => disconnect()} title="Disconnect"><span className="mono">{short(address)}</span></button>;
  }
  const visible = connectors.filter((c, i, arr) => arr.findIndex((x) => x.name === c.name) === i);
  return (
    <>
      <button className={`btn ${size} ink ${size === "lg" ? "full" : ""}`} onClick={() => setOpen(true)} disabled={isPending}>{isPending ? "Connecting…" : "Connect wallet"}</button>
      {open && (
        <div className="modal-bg open" onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
          <div className="modal" role="dialog" aria-label="Connect wallet">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}><h3>Connect a wallet</h3><button className="btn sm ghost" onClick={() => setOpen(false)}>✕</button></div>
            <div style={{ display: "grid", gap: 10 }}>
              {visible.map((c) => (
                <button key={c.uid} className="btn full" onClick={() => { connect({ connector: c }); setOpen(false); }}>{c.name === "Injected" ? "Browser wallet" : c.name}</button>
              ))}
            </div>
            <p className="muted" style={{ fontSize: ".8rem", marginTop: 14 }}>Coinbase Wallet, MetaMask, Rabby and any browser wallet work. We never ask for seed phrases.</p>
          </div>
        </div>
      )}
    </>
  );
}
