"use client";
/* eslint-disable @next/next/no-img-element */
import { useEffect, useMemo, useRef, useState } from "react";
import { upload } from "@vercel/blob/client";
import { PRODUCTS, priceOf, type Product } from "./_lib/catalog";
import { COLLECTION, LIMITS, PRINT_MIN_PX, SHIPPING } from "./_lib/config";
import { Mockup } from "./Mockup";

type Design = { url: string; w: number; h: number; source: "upload" | "link" };
type BagItem = { id: string; productKey: string; color: string; size: string; qty: number; imageUrl: string };
type Pick = { color: string; size: string };

const money = (c: number) => "$" + (c / 100).toFixed(c % 100 ? 2 : 0);
const BAG_KEY = "mx-credits-bag";
const REF_KEY = "mx-credits-ref";
const store = {
  get<T>(k: string, d: T): T { try { const v = localStorage.getItem(k); return v ? (JSON.parse(v) as T) : d; } catch { return d; } },
  set(k: string, v: unknown) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode */ } },
};
const cleanHandle = (h: string) => h.trim().replace(/^https?:\/\/(www\.)?(x|twitter)\.com\//i, "").replace(/[/?#].*$/, "").replace(/^@/, "").replace(/[^A-Za-z0-9_]/g, "").slice(0, 15);
const measure = (src: string) => new Promise<{ w: number; h: number }>((res, rej) => { const i = new Image(); i.onload = () => res({ w: i.naturalWidth, h: i.naturalHeight }); i.onerror = () => rej(new Error("That image couldn't be loaded.")); i.src = src; });
const label = (p: Product, i: Pick) => [p.hideColor ? "" : i.color, i.size].filter(Boolean).join(" · ");

export function Store() {
  const [status, setStatus] = useState<{ uploads: boolean; checkout: boolean } | null>(null);
  const [design, setDesign] = useState<Design | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [link, setLink] = useState("");
  const [picks, setPicks] = useState<Record<string, Pick>>(() => Object.fromEntries(PRODUCTS.map((p) => [p.key, { color: p.colors[0] ?? "", size: p.sizes.includes("iPhone 16") ? "iPhone 16" : p.sizes[Math.min(1, p.sizes.length - 1)] }])));
  const [bag, setBag] = useState<BagItem[]>([]);
  const [open, setOpen] = useState(false);
  const [ref, setRef] = useState("");
  const [rights, setRights] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setBag(store.get<BagItem[]>(BAG_KEY, []));
    const q = new URLSearchParams(location.search).get("ref");
    const r = q ? cleanHandle(q) : store.get<string>(REF_KEY, "");
    setRef(r); if (q) store.set(REF_KEY, r);
    fetch("/api/merch/status").then((r) => r.json()).then(setStatus).catch(() => setStatus({ uploads: false, checkout: false }));
  }, []);
  useEffect(() => { store.set(BAG_KEY, bag); }, [bag]);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 2200); return () => clearTimeout(t); }, [toast]);

  const count = bag.reduce((s, i) => s + i.qty, 0);
  const subtotal = useMemo(() => bag.reduce((s, i) => { const p = PRODUCTS.find((x) => x.key === i.productKey); return s + (p ? priceOf(p, i.size) * i.qty : 0); }, 0), [bag]);
  const lowRes = design && Math.max(design.w, design.h) < PRINT_MIN_PX;

  async function onFile(file?: File | null) {
    if (!file) return;
    setErr(null);
    if (!/^image\/(png|jpe?g|webp)$/.test(file.type)) { setErr("Use a PNG, JPG or WEBP image."); return; }
    if (file.size > LIMITS.maxUploadBytes) { setErr("Max file size is 25 MB."); return; }
    const local = URL.createObjectURL(file);
    try {
      const dims = await measure(local);
      setBusy("Uploading your design…");
      const safe = file.name.replace(/[^A-Za-z0-9._-]/g, "_").slice(-60) || "design.png";
      const blob = await upload(`merch/designs/${safe}`, file, { access: "public", handleUploadUrl: "/api/merch/upload" });
      setDesign({ url: blob.url, ...dims, source: "upload" });
      setToast("Design added — it's on every piece below");
    } catch (e) {
      setErr(status && !status.uploads ? "Uploads open soon. You can paste an image link instead." : (e as Error).message || "Upload failed.");
    } finally { setBusy(null); URL.revokeObjectURL(local); if (fileRef.current) fileRef.current.value = ""; }
  }

  async function applyLink() {
    setErr(null);
    let u: URL;
    try { u = new URL(link.trim()); } catch { setErr("Paste a full image link starting with https://"); return; }
    if (u.protocol !== "https:") { setErr("The link must start with https://"); return; }
    setBusy("Checking your image…");
    try { const dims = await measure(u.toString()); setDesign({ url: u.toString(), ...dims, source: "link" }); setLink(""); setToast("Design added — it's on every piece below"); }
    catch (e) { setErr((e as Error).message); } finally { setBusy(null); }
  }

  function add(p: Product) {
    if (!design) { setErr("Add your design first — upload an image or paste a link."); document.getElementById("design")?.scrollIntoView({ behavior: "smooth", block: "center" }); return; }
    const pick = picks[p.key];
    setBag((b) => {
      const same = b.find((i) => i.productKey === p.key && i.color === pick.color && i.size === pick.size && i.imageUrl === design.url);
      if (same) return b.map((i) => (i === same ? { ...i, qty: Math.min(LIMITS.maxQty, i.qty + 1) } : i));
      if (b.length >= LIMITS.maxItems) { setErr(`Up to ${LIMITS.maxItems} items per order.`); return b; }
      return [...b, { id: Math.random().toString(36).slice(2, 10), productKey: p.key, color: pick.color, size: pick.size, qty: 1, imageUrl: design.url }];
    });
    setToast(`${p.name} added to your bag`);
  }

  async function checkout() {
    setErr(null);
    if (!rights) { setErr("Please confirm you have the right to print your design."); return; }
    setBusy("Opening secure checkout…");
    try {
      const res = await fetch("/api/merch/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items: bag, referral: ref, rightsConfirmed: true }) });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j.url) throw new Error(j.error || "Checkout failed.");
      store.set(REF_KEY, cleanHandle(ref));
      location.href = j.url;
    } catch (e) { setErr((e as Error).message); setBusy(null); }
  }

  const closed = status !== null && !status.checkout;

  return (
    <>
      <header className="top"><div className="wrap">
        <a className="brand" href="#"><i>MM</i>Credits Merch</a>
        <button className="btn sm primary" onClick={() => setOpen(true)}>Bag{count ? ` · ${count}` : ""}</button>
      </div></header>

      <main>
        <section className="hero wrap">
          <div className="eyebrow">{"Meme Maxxers · " + COLLECTION}</div>
          <h1>Credits<br /><span>Merch</span></h1>
          <p className="lede">Wear the movement. Put your favorite Jack Butcher meme, Credit or Statement on it.</p>
          <div className="chips">
            <span className="chip gold">100% of profits buy Credits off the floor</span>
            <span className="chip">Printed on demand</span>
            <span className="chip">Ships worldwide</span>
          </div>
          <p className="story">Jack started the fire. Together we rise. Now we write the next chapter — <a href="/social/creditsleaderboard">see the Credits Contributor Leaderboard →</a></p>
        </section>

        <section className="wrap" id="design">
          <div className="panel edge">
            <div className="panel-head"><span className="step">1</span><div><h2>Add your design</h2><p className="muted">Upload your meme, Credit or Statement — or paste an image link. It goes on every piece below.</p></div></div>
            <div className="design">
              <div className="thumb">{design ? <img src={design.url} alt="Your design" /> : <span>No design yet</span>}</div>
              <div className="design-controls">
                <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(e) => onFile(e.target.files?.[0])} />
                <button className="btn primary" disabled={!!busy} onClick={() => fileRef.current?.click()}>{design?.source === "upload" ? "Upload a different image" : "Upload image"}</button>
                <div className="or"><span>or</span></div>
                <div className="linkrow"><input className="inp" placeholder="https://…/your-image.png" value={link} onChange={(e) => setLink(e.target.value)} onKeyDown={(e) => e.key === "Enter" && applyLink()} aria-label="Image link" /><button className="btn" disabled={!!busy || !link.trim()} onClick={applyLink}>Use link</button></div>
                {design && <p className={`hint ${lowRes ? "warn" : ""}`}>{lowRes ? `This image is ${design.w}×${design.h}px — it may print soft. ${PRINT_MIN_PX}px+ on the long side looks best.` : `${design.w}×${design.h}px · prints sharp`}</p>}
                {busy && <p className="hint">{busy}</p>}
              </div>
            </div>
          </div>
        </section>

        <section className="wrap">
          <div className="sec-head"><span className="step">2</span><h2>Pick your pieces</h2></div>
          <div className="grid">
            {PRODUCTS.map((p, idx) => {
              const pick = picks[p.key];
              return (
                <article className="card edge" key={p.key}>
                  <div className="mock-wrap"><Mockup product={p.key} color={pick.color} src={design?.url} uid={`p${idx}`} /></div>
                  <div className="card-body">
                    <div className="row"><h3>{p.name}</h3><b className="price">{money(priceOf(p, pick.size))}</b></div>
                    <p className="muted small">{p.detail}</p>
                    {!p.hideColor && p.colors.length > 1 && (
                      <div className="swatches" role="radiogroup" aria-label={p.colorLabel}>
                        {p.colors.map((c) => <button key={c} role="radio" aria-checked={pick.color === c} className={`sw ${c.toLowerCase().replace(/\s+/g, "-")} ${pick.color === c ? "on" : ""}`} onClick={() => setPicks((s) => ({ ...s, [p.key]: { ...s[p.key], color: c } }))} title={c}><span /></button>)}
                        <span className="muted small">{pick.color}</span>
                      </div>
                    )}
                    <div className="buy">
                      <select className="sel" value={pick.size} aria-label={p.sizeLabel} onChange={(e) => setPicks((s) => ({ ...s, [p.key]: { ...s[p.key], size: e.target.value } }))}>
                        {p.sizes.map((z) => <option key={z} value={z}>{z}</option>)}
                      </select>
                      <button className="btn primary" onClick={() => add(p)}>Add</button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className="wrap">
          <div className="sec-head"><span className="step">3</span><h2>Check out</h2></div>
          <ul className="dots">
            <li><b>Secure checkout by Stripe</b> — cards, Apple Pay and Google Pay.</li>
            <li><b>{money(SHIPPING.amount)} flat shipping</b>, worldwide. Printed on demand, usually arrives in {SHIPPING.minDays}–{SHIPPING.maxDays} business days.</li>
            <li><b>Referred by someone?</b> Add their X username at checkout — we send them crypto back once your payment clears.</li>
            <li><b>100% of profits</b> (after printing and shipping) go to buying Credits NFTs off the floor.</li>
          </ul>
          <button className="btn primary lg" onClick={() => setOpen(true)} disabled={!count}>{count ? `Review bag · ${money(subtotal)}` : "Your bag is empty"}</button>
        </section>
      </main>

      <footer className="wrap">
        <div className="brand"><i>MM</i>Meme Maxxers</div>
        <p className="muted small">A collective of founders, creators, builders, guild leaders, investors, and AI lovers focused on supporting the latest innovations and experimenting with the coolest tech.</p>
        <p className="disc">Community-run. Not affiliated with or endorsed by Jack Butcher or Visualize Value. You may only upload images you own or have permission to print. Printing and fulfillment by Printful; payments by Stripe.</p>
      </footer>

      {count > 0 && !open && <button className="bagbar" onClick={() => setOpen(true)}><span>Bag · {count} item{count > 1 ? "s" : ""}</span><b>{money(subtotal)}</b></button>}
      {toast && <div className="toast" role="status">{toast}</div>}

      {open && (
        <div className="sheet-bg" onClick={(e) => e.target === e.currentTarget && setOpen(false)}>
          <div className="sheet edge" role="dialog" aria-label="Your bag">
            <div className="sheet-head"><h2>Your bag</h2><button className="btn sm" onClick={() => setOpen(false)} aria-label="Close">✕</button></div>
            {!bag.length ? <p className="muted">Nothing here yet. Add your design, then pick your pieces.</p> : (
              <>
                <div className="lines">
                  {bag.map((i) => {
                    const p = PRODUCTS.find((x) => x.key === i.productKey); if (!p) return null;
                    return (
                      <div className="line" key={i.id}>
                        <div className="line-mock"><Mockup product={p.key} color={i.color} src={i.imageUrl} uid={`b${i.id}`} /></div>
                        <div className="line-info"><b>{p.name}</b><span className="muted small">{label(p, i)}</span>
                          <div className="qty"><button onClick={() => setBag((b) => b.map((x) => x.id === i.id ? { ...x, qty: Math.max(1, x.qty - 1) } : x))} aria-label="Less">−</button><span>{i.qty}</span><button onClick={() => setBag((b) => b.map((x) => x.id === i.id ? { ...x, qty: Math.min(LIMITS.maxQty, x.qty + 1) } : x))} aria-label="More">+</button><button className="rm" onClick={() => setBag((b) => b.filter((x) => x.id !== i.id))}>Remove</button></div>
                        </div>
                        <b className="mono">{money(priceOf(p, i.size) * i.qty)}</b>
                      </div>
                    );
                  })}
                </div>
                <div className="kv"><span>Subtotal</span><b>{money(subtotal)}</b></div>
                <div className="kv"><span>Shipping</span><b>{money(SHIPPING.amount)}</b></div>
                <div className="kv total"><span>Total</span><b>{money(subtotal + SHIPPING.amount)}</b></div>
                <label className="field"><span>Referred by <em>(X username, optional)</em></span><input className="inp" placeholder="@username" value={ref} onChange={(e) => setRef(e.target.value)} maxLength={40} /></label>
                <label className="check"><input type="checkbox" checked={rights} onChange={(e) => setRights(e.target.checked)} /><span>I own these images or have permission to print them.</span></label>
                <button className="btn primary lg full" onClick={checkout} disabled={!!busy || closed}>{closed ? "Checkout opens soon" : busy ?? `Checkout · ${money(subtotal + SHIPPING.amount)}`}</button>
                <p className="muted small center">You&apos;ll finish on Stripe&apos;s secure page. 100% of profits buy Credits off the floor.</p>
              </>
            )}
            {err && <p className="err">{err}</p>}
          </div>
        </div>
      )}
      {err && !open && <div className="toast err-toast" role="alert" onClick={() => setErr(null)}>{err}</div>}
    </>
  );
}
