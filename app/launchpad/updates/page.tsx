import { Stat } from "../_components/Cards";
import { EXAMPLE_TOKENS, UPDATES } from "../_lib/mock";
import { usd } from "../_lib/format";

export default function Updates() {
  const vol7 = EXAMPLE_TOKENS.reduce((a, t) => a + (t.example?.vol24 ?? 0) * 7, 0);
  return (
    <>
      <section className="blk" style={{ paddingTop: 34 }}>
        <div className="eyebrow">Build in public</div>
        <h2 style={{ margin: "6px 0" }}>What we built, what broke, what changed.</h2>
        <p className="muted" style={{ maxWidth: "56ch" }}>One post a week. Numbers included, even the bad ones.</p>
      </section>
      <div className="grid">
        {UPDATES.map((u) => <div key={u.w} className="card week"><div className="w">{u.w}</div><div style={{ display: "grid", gap: 10 }}><div><div className="eyebrow">What we built</div><p>{u.built}</p></div><div><div className="eyebrow">What we learned</div><p>{u.learned}</p></div><div><div className="eyebrow">What&apos;s next</div><p>{u.next}</p></div></div></div>)}
        <div className="card week" style={{ borderStyle: "dashed" }}><div className="w muted">Week 3</div><div className="muted">Coming Sunday.</div></div>
      </div>
      <section className="blk">
        <div className="stats"><Stat v={EXAMPLE_TOKENS.length} k="Launches (examples)" /><Stat v={usd(vol7)} k="Volume (7d, example)" /><Stat v={`${(vol7 * 0.01 / 3400).toFixed(2)} ETH`} k="Launchpad fees (1%, example)" /><Stat v={41} k="Game night players" /></div>
      </section>
    </>
  );
}
