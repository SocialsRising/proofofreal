"use client";
import Link from "next/link";
import { useAccount } from "wagmi";
import { NightCard, Stat, TokenCard } from "../_components/Cards";
import { WalletButton } from "../_components/Wallet";
import { useTokens } from "../_lib/useTokens";
import { EXAMPLE_NIGHTS, EXAMPLE_TOKENS } from "../_lib/mock";
import { short } from "../_lib/format";

export default function Profile() {
  const { address } = useAccount();
  const { data: tokens = EXAMPLE_TOKENS } = useTokens();
  if (!address) return <section className="blk" style={{ paddingTop: 60, textAlign: "center", display: "grid", gap: 14, justifyItems: "center" }}><h2>Your profile</h2><p className="muted">Connect a wallet to see your tokens, stakes and game nights.</p><WalletButton size="lg" /></section>;
  const created = tokens.filter((t) => t.creator.toLowerCase() === address.toLowerCase());
  return (
    <>
      <div className="thead" style={{ gridTemplateColumns: "96px 1fr", alignItems: "center", gap: 18 }}>
        <div className="art md" style={{ background: "var(--chrome)" }}><span>{address.slice(2, 3).toUpperCase()}</span></div>
        <div><div className="eyebrow">Profile</div><h2 className="mono" style={{ fontFamily: "var(--font-display)" }}>{short(address)}</h2><div className="muted">Base</div></div>
      </div>
      <div className="stats" style={{ marginTop: 14 }}>
        <Stat v={created.length} k="Tokens created" /><Stat v="—" k="Tokens held" /><Stat v={0} k="Staking positions" /><Stat v="0.00 ETH" k="Rewards claimed" />
      </div>
      <section className="blk"><div className="sechead"><h2>Created</h2><Link href="/launchpad/launch">Launch another →</Link></div>
        {created.length ? <div className="grid g3">{created.map((t) => <TokenCard key={t.address} t={t} />)}</div> : <div className="empty">Nothing launched from this wallet yet. <Link href="/launchpad/launch" style={{ textDecoration: "underline" }}>Launch a token</Link>.</div>}
      </section>
      <section className="blk"><div className="sechead"><h2>Staked</h2><span className="muted">Staking opens week 3</span></div><div className="empty">Positions and weekly ETH payouts will show here.</div></section>
      <section className="blk"><div className="sechead"><h2>Game nights</h2></div><div className="grid"><NightCard n={EXAMPLE_NIGHTS[0]} t={EXAMPLE_TOKENS[0]} /></div></section>
    </>
  );
}
