import { UPDATES } from "../_lib/mock";

export default function Updates() {
  return (
    <>
      <section className="blk" style={{ paddingTop: 34 }}>
        <div className="eyebrow">Build in public</div>
        <h2 style={{ margin: "6px 0" }}>What we built, what broke, what changed.</h2>
        <p className="muted" style={{ maxWidth: "56ch" }}>One post a week. Real numbers only, even the bad ones — which is why there are none here yet.</p>
      </section>
      <div className="grid">
        {UPDATES.map((u) => <div key={u.w} className="card week"><div className="w">{u.w}</div><div style={{ display: "grid", gap: 10 }}><div><div className="eyebrow">What we built</div><p>{u.built}</p></div><div><div className="eyebrow">What we learned</div><p>{u.learned}</p></div><div><div className="eyebrow">What&apos;s next</div><p>{u.next}</p></div></div></div>)}
        <div className="card week" style={{ borderStyle: "dashed" }}><div className="w muted">Week {UPDATES.length + 1}</div><div className="muted">Coming Sunday.</div></div>
      </div>
    </>
  );
}
