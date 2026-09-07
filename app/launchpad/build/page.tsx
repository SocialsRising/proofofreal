"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { useToast } from "../_components/Toast";
import { useTokens } from "../_lib/useTokens";
import { EXAMPLE_TOKENS } from "../_lib/mock";
import { submit } from "../_lib/registry";

const STEPS: [string, string, string | null][] = [
  ["Create your token", "Four fields. You probably already did this.", "/launchpad/launch"],
  ["Build a game with AI", "Use any AI game builder. Describe a multiplayer game, iterate until it's fun. Aim for 5-minute rounds.", null],
  ["Submit the game URL", "Paste the link below. It shows on your token page with a Play button.", null],
  ["Host a game night", "Pick a Friday, set a prize, post the card. We'll help with the first one.", "/launchpad/incubate"],
  ["Reward players", "Pay the top 5 from your creator fees. Winners share the card, more people show up.", null],
  ["Share clips & results", "The results page is built for you. Screenshot, clip, post.", null],
];

export default function Build() {
  const { data: tokens = EXAMPLE_TOKENS } = useTokens();
  const { address } = useAccount();
  const mine = tokens.filter((t) => address && t.creator.toLowerCase() === address.toLowerCase());
  const options = mine.length ? mine : tokens;
  const [token, setToken] = useState(""); const [url, setUrl] = useState(""); const [name, setName] = useState(""); const [players, setPlayers] = useState("5–8");
  const [busy, setBusy] = useState(false);
  const toast = useToast(); const router = useRouter();
  async function go() {
    if (!url.trim()) return toast("Paste a game URL first");
    const tok = token || options[0]?.address; if (!tok) return;
    setBusy(true);
    try { await submit({ type: "game", token: tok, url: url.trim(), name: name.trim(), players, wallet: address }); toast("Game submitted — we check the link, then it goes live"); router.push(`/launchpad/token/${tok}`); }
    catch { toast("Could not send. Try again."); } finally { setBusy(false); }
  }
  return (
    <>
      <section className="blk" style={{ paddingTop: 34 }}>
        <div className="eyebrow">Build a game</div>
        <h2 style={{ margin: "6px 0" }}>Your token is the economy. The game is the reason to show up.</h2>
        <p className="muted" style={{ maxWidth: "58ch" }}>You don&apos;t need a game to launch. But every token with one gets a Play button, game nights, and a reason to hold. AI game tools make this a weekend project, not a studio project.</p>
      </section>
      <div className="steps">{STEPS.map(([h, p, l], i) => <div key={h} className="step-c"><div className="n">{i + 1}</div><div><b>{h}</b><p className="muted" style={{ fontSize: ".95rem" }}>{p}</p>{l && <Link href={l} style={{ color: "var(--fg-2)", fontWeight: 700, fontSize: ".9rem" }}>Go →</Link>}</div></div>)}</div>
      <section className="blk">
        <div className="sechead"><h2>Tools that work well</h2></div>
        <div className="grid g3">{[["ChatGPT Astra", "Describe a game, get a playable multiplayer link. Good for arenas and party games."], ["Any web game builder", "If it exports a URL people can open on a phone, it works here."], ["Your own code", "Hand-built games welcome. Same submit form."]].map(([h, p]) => <div key={h} className="card pad" style={{ display: "grid", gap: 6 }}><h3>{h}</h3><p className="muted" style={{ fontSize: ".95rem" }}>{p}</p></div>)}</div>
        <p className="muted" style={{ fontSize: ".85rem", marginTop: 10 }}>The builder integration is modular. New tools get added as they show up.</p>
      </section>
      <section className="blk">
        <div className="split">
          <div className="card pad" style={{ display: "grid", gap: 14 }}>
            <h3>Connect a game to your token</h3>
            <div className="field"><label>Your token</label><select className="inp" value={token || options[0]?.address} onChange={(e) => setToken(e.target.value)}>{options.map((t) => <option key={t.address} value={t.address}>{t.name} (${t.symbol})</option>)}</select></div>
            <div className="field"><label>Game URL</label><input className="inp" placeholder="https://…" value={url} onChange={(e) => setUrl(e.target.value)} /></div>
            <div className="field"><label>Game name</label><input className="inp" placeholder="Cat Royale" value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div className="field"><label>Players per round</label><div className="chips">{["2–4", "5–8", "9–16", "16+"].map((v) => <button key={v} className={`chip ${players === v ? "on" : ""}`} onClick={() => setPlayers(v)}>{v}</button>)}</div></div>
            <button className="btn primary lg" onClick={go} disabled={busy}>{busy ? "Sending…" : "Connect game"}</button>
            <p className="muted" style={{ fontSize: ".8rem" }}>We check the link works, then it goes live on your token page.</p>
          </div>
          <div className="card pad" style={{ display: "grid", gap: 10, background: "var(--card-2)" }}>
            <div className="eyebrow">What makes a good game night game</div>
            {["Rounds under 5 minutes", "Works on a phone", "Fun to watch, not just play", "A clear winner every round", "Something to screenshot"].map((s) => <div key={s} className="kv"><span>✓ {s}</span></div>)}
          </div>
        </div>
      </section>
    </>
  );
}
