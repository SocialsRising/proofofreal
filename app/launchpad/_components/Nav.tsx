"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { WalletButton } from "./Wallet";
import { useAccount } from "wagmi";
import { chainById } from "../_lib/chains";
import { LINKS } from "../_lib/config";

const NAV = [["/launchpad/explore", "Explore"], ["/launchpad/launch", "Launch"], ["/launchpad/incubate", "Incubate"], [LINKS.docs, "Docs"]] as const;
const isExternal = (h: string) => /^https?:/.test(h);

function NavLink({ href, label, on, onClick }: { href: string; label: string; on?: boolean; onClick?: () => void }) {
  if (isExternal(href)) return <a href={href} target="_blank" rel="noreferrer" onClick={onClick}>{label} ↗</a>;
  return <Link href={href} className={on ? "on" : ""} onClick={onClick}>{label}</Link>;
}

export function Nav() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const { chainId, isConnected } = useAccount();
  const chain = chainById(chainId);
  return (
    <div className="nav">
      <div className="wrap">
        <Link className="logo" href="/launchpad"><span className="cat">MM</span>Meme Maxxers</Link>
        <div className="navlinks">{NAV.map(([h, l]) => <NavLink key={h} href={h} label={l} on={!isExternal(h) && path.startsWith(h)} />)}</div>
        <div className="spacer" />
        {isConnected && <span className={`tag soft mono ${chain ? "" : "tabby"}`} style={{ fontSize: ".68rem" }}>{chain ? chain.short : "Unsupported chain"}</span>}
        <WalletButton />
        <button className="burger" aria-label="Menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>☰</button>
      </div>
      <div className={`drawer ${open ? "open" : ""}`}>
        {NAV.map(([h, l]) => <NavLink key={h} href={h} label={l} onClick={() => setOpen(false)} />)}
        <Link href="/launchpad/profile" onClick={() => setOpen(false)}>My Profile</Link>
        <Link href="/launchpad/updates" onClick={() => setOpen(false)}>Build in public</Link>
      </div>
    </div>
  );
}
