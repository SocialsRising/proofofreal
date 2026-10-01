import type { Metadata } from "next";
import { Inter_Tight } from "next/font/google";
import "../merch.css";

const font = Inter_Tight({ subsets: ["latin"], weight: ["500", "700", "800"], variable: "--font-mx" });
export const metadata: Metadata = { title: "Order received — Credits Merch", robots: { index: false } };

export default function Thanks() {
  return (
    <div className={`mx ${font.variable}`}>
      <main className="wrap thanks">
        <div className="eyebrow">Credits Merch</div>
        <h1>Order <span>received.</span></h1>
        <p className="lede">Thank you. Stripe has emailed your receipt. Your pieces are printed on demand and usually arrive in 5–14 business days — you&apos;ll get tracking by email when they ship.</p>
        <ul className="dots">
          <li><b>100% of profits</b> go to buying Credits NFTs off the floor.</li>
          <li><b>Referred by someone?</b> They&apos;ll get crypto back once your payment clears.</li>
        </ul>
        <div className="chips" style={{ marginTop: 22 }}>
          <a className="btn primary" href="/merch/credits">Back to the store</a>
          <a className="btn" href="/social/creditsleaderboard">Credits Contributor Leaderboard</a>
        </div>
      </main>
    </div>
  );
}
