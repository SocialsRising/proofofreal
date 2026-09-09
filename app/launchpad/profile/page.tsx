"use client";
import Link from "next/link";
import { useAccount } from "wagmi";
import { NightCard, Stat, TokenCard } from "../_components/Cards";
import { WalletButton } from "../_components/Wallet";
import { Rewards } from "../_components/Rewards";
import { useTokens } from "../_lib/useTokens";
import { EXAMPLE_NIGHTS, EXAMPLE_TOKENS } from "../_lib/mock";
import { short } from "../_lib/format";
import { SITE } from "../_lib/config";
import { useToast } from "../_components/Toast";

export default function Profile() {
  const { address } = useAccount();
  const { data: tokens = EXAMPLE_TOKENS } = useTokens();
  const toast = useToast();
  if (!address) return <section className="blk" style={{ paddingTop: 60, textAlign: "center", display: "grid", gap: 14, justifyItems: "center" }}><h2>Your profile</h2><p className="muted">Connect a wallet to see your tokens, stakes and game nights.</p><WalletButton size="lg" /></section>;
  const created = tokens.filter((t) => t.creator.toLowerCase() === address.toLowerCase());
  return (
    <>
      <div className="thead" style={{ gridTemplateColumns: "96px 1fr", alignItems: "center", gap: 18 }}>
        <div className="art md" style={{ background: "var(--chrome)" }}><span>{address.slice(2, 3).toUpperCase()}</span></div>
        <div><div className="eyebrow">Profile</div><h2 className="mono" style={{ fontFamily: "var(--font-display)" }}>{short(address)}</h2><div className="muted">Base</div></div>
      </div>
      <div className="stats" style={{ marginTop: 14 }}>
        <Stat v={created.length} k="Tokens created" /><Stat v="—" k="Tokens held" /><Stat v="—" k="Hold streak" /><Stat v="0.00 ETH" k="Rewards claimed" />
      </div>
      <section className="blk"><div className="sechead"><h2>Created</h2><Link href="/launchpad/launch">Launch another →</Link></div>
        {created.length ? <div className="grid g3">{created.map((t) => <TokenCard key={t.address} t={t} />)}</div> : <div className="empty">Nothing launched from this wallet yet. <Link href="/launchpad/launch" style={{ textDecoration: "underline" }}>Launch a token</Link>.</div>}
      </section>
      <section className="blk">
        <div className="sechead"><h2>Your referral link</h2><span className="muted">Launches and volume you bring in earn weekly rewards</span></div>
        <div className="card pad" style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <code className="mono" style={{ flex: 1, minWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--fg-2)" }}>{SITE}/launchpad?ref={address}</code>
          <button className="btn sm primary" onClick={() => { navigator.clipboard?.writeText(`${SITE}/launchpad?ref=${address}`); toast("Referral link copied"); }}>Copy</button>
          <span className="tag soft">X sign-in for @handle links · next week</span>
        </div>
      </section>
      <section className="blk"><div className="sechead"><h2>Holder rewards</h2><span className="muted">Snapshots every Sunday · paid in ETH</span></div><Rewards /><div className="empty" style={{ marginTop: 10 }}>Hold any launched token above a tier at the Sunday snapshot and your payout appears here to claim.</div></section>
      <section className="blk"><div className="sechead"><h2>Game nights</h2></div><div className="grid"><NightCard n={EXAMPLE_NIGHTS[0]} t={EXAMPLE_TOKENS[0]} /></div></section>
    </>
  );
}
