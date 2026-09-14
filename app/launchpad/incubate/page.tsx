"use client";
import { useState } from "react";
import { useAccount } from "wagmi";
import { useToast } from "../_components/Toast";
import { Reveal } from "../_components/Motion";
import { submit } from "../_lib/registry";

const PK: [string, string, string, string[], boolean][] = [
  ["Launch", "Basic amplification", "Free with launch", ["Featured on Explore for 48h", "Launch announcement post", "Founder-lock badge", "Listed in the weekly recap"], false],
  ["Grow", "Marketing + community", "From 1% of supply", ["Everything in Launch", "Creator / KOL intros", "Agent-business spotlight", "UGC clip contest", "Partner community push"], true],
  ["Incubate", "Custom campaign", "Let's talk", ["Everything in Grow", "Weekly founder sessions for a month", "Agent swarm architecture help", "Spaces / AMAs", "Ecosystem integrations & partners"], false],
];
const PKGS = ["Launch", "Grow", "Incubate", "Partner", "Custom"];

export default function Incubate() {
  const [pkg, setPkg] = useState("Grow"); const [project, setProject] = useState(""); const [contact, setContact] = useState(""); const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false); const toast = useToast(); const { address } = useAccount();
  const pick = (p: string) => { setPkg(p); document.getElementById("apply")?.scrollIntoView({ behavior: "smooth" }); };
  async function send() {
    if (!project.trim() || !contact.trim()) return toast("Add your project and a way to reach you");
    setBusy(true);
    try { await submit({ type: "incubate", pkg, project, contact, note, wallet: address }); toast("Sent. A human replies within 48h."); setProject(""); setContact(""); setNote(""); }
    catch { toast("Could not send. Try again."); } finally { setBusy(false); }
  }
  return (
    <>
      <section className="blk" style={{ paddingTop: 34 }}>
        <div className="eyebrow">Incubate</div>
        <h2 style={{ margin: "6px 0" }}>Launched it? Want help growing it?</h2>
        <p className="muted" style={{ maxWidth: "56ch" }}>Three simple packages for founders running agent businesses. Every one starts with a conversation, not a checkout. Custom is always an option.</p>
      </section>
      <div className="grid g3">{PK.map(([h, s, pr, items, hot], i) => <Reveal key={h} delay={i * 80}><div className={`card pkg ${hot ? "hot" : ""}`}><div><div className="eyebrow">{s}</div><h3 style={{ fontSize: "1.6rem", marginTop: 4 }}>{h}</h3></div><div className="price">{pr}</div><ul>{items.map((x) => <li key={x}>{x}</li>)}</ul><div style={{ marginTop: "auto" }}><button className={`btn ${hot ? "" : "ink"} full`} onClick={() => pick(h)}>Apply for {h}</button></div></div></Reveal>)}</div>
      <section className="blk" id="partner">
        <Reveal>
          <div className="case" style={{ gridTemplateColumns: "1fr" }}>
            <div style={{ display: "flex", gap: 20, flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" }}>
              <div><div className="eyebrow" style={{ color: "var(--fg-2)" }}>For protocols, brands and communities</div><div className="big" style={{ marginTop: 8 }}>Partner with a founder.</div><p style={{ marginTop: 8, maxWidth: "50ch", color: "var(--fg-2)" }}>Put tokens, NFTs or perks into a Sunday payout, sponsor a launch, or plug your product into an agent business that&apos;s already shipping.</p></div>
              <button className="btn primary lg" onClick={() => pick("Partner")}>Partner with us</button>
            </div>
          </div>
        </Reveal>
      </section>
      <section className="blk" id="apply">
        <div className="split">
          <div className="card pad" style={{ display: "grid", gap: 14 }}>
            <h3>{pkg === "Partner" ? "Partner with a founder" : `Apply · ${pkg}`}</h3>
            <div className="field"><label>Package</label><div className="chips">{PKGS.map((p) => <button key={p} className={`chip ${pkg === p ? "on" : ""}`} onClick={() => setPkg(p)}>{p}</button>)}</div></div>
            <div className="field"><label>Your token or business</label><input className="inp" placeholder="Ticker, or a link" value={project} onChange={(e) => setProject(e.target.value)} /></div>
            <div className="field"><label>How do we reach you?</label><input className="inp" placeholder="@handle or email" value={contact} onChange={(e) => setContact(e.target.value)} /></div>
            <div className="field"><label>What do you want to happen?</label><textarea className="inp" placeholder={pkg === "Partner" ? "What you would like to bring, and to whom." : "Where you are, where you want to be, anything we should know."} value={note} onChange={(e) => setNote(e.target.value)} /></div>
            <button className="btn primary lg" onClick={send} disabled={busy}>{busy ? "Sending…" : "Send"}</button>
            <p className="muted" style={{ fontSize: ".8rem" }}>A human replies within 48h. Nothing is automated here yet, on purpose.</p>
          </div>
          <div style={{ display: "grid", gap: 14 }}>
            <div className="card pad" style={{ display: "grid", gap: 8 }}><h3>Services we can run</h3><div className="chips">{["X amplification", "KOL intros", "Agent-business spotlights", "UGC contests", "Partner pushes", "Clips", "Spaces / AMAs", "Onboarding", "Builder competitions"].map((s) => <span key={s} className="tag soft">{s}</span>)}</div></div>
            <div className="card pad" style={{ display: "grid", gap: 8 }}><h3>What we look for</h3><div className="chips">{["A founder with a face", "Agents doing real work", "A locked founder share", "Shipping in public"].map((s) => <span key={s} className="tag">{s}</span>)}</div></div>
          </div>
        </div>
      </section>
    </>
  );
}
