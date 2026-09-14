"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { WalletButton } from "./Wallet";
import { useAccount } from "wagmi";
import { chainById } from "../_lib/chains";

const LINKS = [["/launchpad/explore", "Explore"], ["/launchpad/launch", "Launch"], ["/launchpad/build", "Build a Game"], ["/launchpad/incubate", "Incubate"]] as const;

export function Nav() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const { chainId, isConnected } = useAccount();
  const chain = chainById(chainId);
  return (
    <div className="nav">
      <div className="wrap">
        <Link className="logo" href="/launchpad"><span className="cat">MM</span>Meme Maxxers</Link>
        <div className="navlinks">{LINKS.map(([h, l]) => <Link key={h} href={h} className={path.startsWith(h) ? "on" : ""}>{l}</Link>)}</div>
        <div className="spacer" />
        {isConnected && <span className={`tag soft mono ${chain ? "" : "tabby"}`} style={{ fontSize: ".68rem" }}>{chain ? chain.short : "Unsupported chain"}</span>}
        <WalletButton />
        <button className="burger" aria-label="Menu" onClick={() => setOpen((o) => !o)}>☰</button>
      </div>
      <div className={`drawer ${open ? "open" : ""}`} onClick={() => setOpen(false)}>
        {LINKS.map(([h, l]) => <Link key={h} href={h}>{l}</Link>)}
        <Link href="/launchpad/profile">My Profile</Link>
        <Link href="/launchpad/updates">Build in public</Link>
      </div>
    </div>
  );
}
