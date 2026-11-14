"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useAccount } from "wagmi";
import { WalletButton } from "../../launchpad/_components/Wallet";
import { BRAND, ELYSIUM } from "../_lib/config";

const NAV = [["/incubator/elysium", "Directory"], ["/incubator/elysium/launch", "Launch"], ["/incubator/elysium#how", "How it works"]] as const;

export function IncNav() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const { chainId, isConnected } = useAccount();
  return (
    <div className="nav">
      <div className="wrap">
        <Link className="logo" href="/incubator/elysium"><span className="cat">E</span>{BRAND}</Link>
        <div className="navlinks">{NAV.map(([h, l]) => <Link key={h} href={h} className={path === h ? "on" : ""}>{l}</Link>)}</div>
        <div className="spacer" />
        {isConnected && <span className={`tag soft mono ${chainId === ELYSIUM.chainId ? "" : "tabby"}`} style={{ fontSize: ".68rem" }}>{chainId === ELYSIUM.chainId ? "Elysium" : "Switch to Elysium"}</span>}
        <WalletButton />
        <button className="burger" aria-label="Menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>☰</button>
      </div>
      <div className={`drawer ${open ? "open" : ""}`}>
        {NAV.map(([h, l]) => <Link key={h} href={h} onClick={() => setOpen(false)}>{l}</Link>)}
      </div>
    </div>
  );
}
