"use client";
import Link from "next/link";
import { useAccount } from "wagmi";
import { Stat, TokenCard } from "../_components/Cards";
import { WalletButton } from "../_components/Wallet";
import { Rewards } from "../_components/Rewards";
import { useTokens } from "../_lib/useTokens";
import { short } from "../_lib/format";
import { SITE } from "../_lib/config";
import { useToast } from "../_components/Toast";

export default function Profile() {
  const { address } = useAccount();
  const { data: tokens = [] } = useTokens();
  const toast = useToast();
  if (!address) return (
    <section className="blk" style={{ paddingTop: 34 }}>
      <div className="empty first" style={{ padding: 50 }}><h2>Your profile</h2><p className="muted" style={{ margin: "10px 0 18px" }}>Connect a wallet to see your launches and Sunday payouts.</p><WalletButton size="lg" /></div>
    </section>
  );
  const created = tokens.filter((t) => t.creator.toLowerCase() === address.toLowerCase());
  const ref = `${SITE}/launchpad?ref=${address}`;
  return (
    <>
      <section className="blk" style={{ paddingTop: 34 }}>
        <div className="eyebrow">Profile</div>
        <h2 style={{ margin: "6px 0" }} className="mono">{short(address)}</h2>
        <div className="stats" style={{ marginTop: 18, gridTemplateColumns: "repeat(2,1fr)" }}><Stat v={created.length} k="Tokens launched" /><Stat v="0" k="Sunday payouts received" /></div>
      </section>
      <section className="blk">
        <div className="sechead"><h2>Your launches</h2><Link href="/launchpad/launch">Launch another →</Link></div>
        {created.length ? <div className="grid g3">{created.map((t) => <TokenCard key={t.address} t={t} />)}</div>
          : <div className="empty">Nothing launched from this wallet yet. <Link href="/launchpad/launch" style={{ textDecoration: "underline" }}>Launch your first token.</Link></div>}
      </section>
      <section className="blk">
        <div className="card pad" style={{ display: "grid", gap: 10 }}>
          <h3>Your referral link</h3>
          <p className="muted" style={{ fontSize: ".93rem" }}>Anyone who launches or trades after arriving through this link is attributed to you.</p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <code className="mono" style={{ flex: 1, minWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", padding: "10px 14px", border: "1px solid var(--line)", borderRadius: 12, background: "var(--bg-2)", fontSize: ".85rem" }}>{ref}</code>
            <button className="btn sm primary" onClick={() => { navigator.clipboard?.writeText(ref); toast("Copied"); }}>Copy</button>
          </div>
          <span className="tag soft">X sign-in for @handle links · coming</span>
        </div>
      </section>
      {process.env.NEXT_PUBLIC_REWARDS_LIVE === "1" && (
        <section className="blk"><div className="sechead"><h2>Sunday payouts</h2><span className="muted">Snapshots every Sunday · 00:00 UTC</span></div><Rewards /></section>
      )}
    </>
  );
}
