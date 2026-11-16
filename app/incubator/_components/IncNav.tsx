"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useAccount } from "wagmi";
import { WalletButton } from "../../launchpad/_components/Wallet";
import { ELYSIUM } from "../_lib/config";

const NAV = [["/incubator/elysium", "Overview"], ["/incubator/elysium#projects", "Projects"], ["/incubator/elysium#fees", "Where fees go"], ["/incubator/elysium/launch", "Launch"]] as const;

export function IncNav() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const { chainId, isConnected } = useAccount();
  return (
    <div className="nav">
      <div className="wrap">
        <Link className="logo" href="/incubator/elysium" aria-label="EARLY Incubator home">
          <img className="mark" src="/incubator/early-mark.png" alt="" width={30} height={30} />
          <span className="word">EARLY</span><span className="sub">Incubator</span>
        </Link>
        <div className="navlinks">{NAV.map(([h, l]) => <Link key={h} href={h} className={path === h ? "on" : ""}>{l}</Link>)}</div>
        <div className="spacer" />
        {isConnected && chainId !== ELYSIUM.chainId && <span className="tag tabby" style={{ fontSize: ".7rem" }}>Switch to Elysium</span>}
        <WalletButton />
        <button className="burger" aria-label="Menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>☰</button>
      </div>
      <div className={`drawer ${open ? "open" : ""}`}>
        {NAV.map(([h, l]) => <Link key={h} href={h} onClick={() => setOpen(false)}>{l}</Link>)}
      </div>
    </div>
  );
}
