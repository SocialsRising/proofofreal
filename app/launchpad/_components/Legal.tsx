import Link from "next/link";

export const LEGAL_UPDATED = "September 14, 2026";

/** Shared shell for the legal pages so they read as one set. */
export function LegalPage({ title, intro, children }: { title: string; intro: string; children: React.ReactNode }) {
  return (
    <div className="doc">
      <section className="blk" style={{ paddingTop: 34, paddingBottom: 0 }}>
        <div className="eyebrow">Legal</div>
        <h2 style={{ margin: "6px 0 10px" }}>{title}</h2>
        <p>{intro}</p>
        <p className="muted" style={{ fontSize: ".85rem", marginTop: 8 }}>Last updated {LEGAL_UPDATED}.</p>
        <div className="toc" style={{ marginTop: 14 }}>
          <Link className="chip" href="/launchpad/terms">Terms of Use</Link>
          <Link className="chip" href="/launchpad/privacy">Privacy</Link>
          <Link className="chip" href="/launchpad/risk">Risk Notice</Link>
        </div>
      </section>
      {children}
    </div>
  );
}
