/* Genesis NFT Incubator: marketing consultation for a genesis collection's main campaign, with EARLY's community and
   amplification around it. After several weeks of traction, projects can launch a token through EARLY. */
import Link from "next/link";
import { LINKS, PARENT } from "../_lib/config";

const ART = ["zeus", "poseidon", "nyx", "helios", "artemis", "hermes", "selene", "apollo", "hecate"];
const CHAINS = ["Ethereum", "Robinhood", "Base", "Elysium"];

const PERKS: { icon: string; title: string; text: string }[] = [
  { icon: "🧭", title: "Campaign consultation", text: "We help you plan your main campaign: teasers, countdown, mint day, reveal and the weeks after. You run it." },
  { icon: "🐦", title: "Day-one community", text: "$EARLY and Early Birds holders join early, so your mint opens to a crowd." },
  { icon: "🚀", title: "Amplification", text: `Your key posts pushed across the EARLY and ${PARENT} accounts and communities.` },
  { icon: "🤝", title: "Creator intros", text: "Creators who amplify your collection, each for a free NFT." },
  { icon: "💎", title: "Bounty design", text: "Rewards that get people buying, trading and referring, set up your way." },
  { icon: "🪜", title: "A path to a token", text: "When the traction is real, launch your token through EARLY." },
];

const BOUNTIES: { icon: string; title: string }[] = [
  { icon: "💬", title: "Join the Discord" },
  { icon: "𝕏", title: "Follow on X" },
  { icon: "📌", title: "Amplify the mint tweet" },
  { icon: "🎨", title: "Share your art post-mint" },
  { icon: "🛒", title: "Buy & trade" },
  { icon: "👥", title: "Refer a friend" },
];

const ROADMAP: { when: string; title: string; text: string }[] = [
  { when: "Week 0", title: "Plan the campaign", text: "We map your mint campaign and bounties with you." },
  { when: "Mint week", title: "You launch, we amplify", text: "Your campaign goes live with our community and creators behind it." },
  { when: "Weeks 2–6+", title: "Build traction", text: "Bounties and post-mint content grow holders and volume." },
  { when: "Then", title: "Launch a token", text: "Graduate into the EARLY token incubator on Montra, with more chains after." },
];

export default function GenesisPage() {
  return (
    <>
      <section className="gen-hero">
        <div className="gen-copy">
          <div className="eyebrow live"><i />Genesis NFT Incubator</div>
          <h1>You bring the vision<br /><span className="dim">and the art.</span></h1>
          <p className="lead">We help you shape the main campaign for your genesis mint and amplify it, with a community ready on day one.</p>
          <div className="gen-chains" aria-label="Live chains">
            <span className="muted">Live on</span>
            {CHAINS.map((c) => <span key={c} className="gen-chain">{c}</span>)}
            <span className="gen-chain more">+ more soon</span>
          </div>
          <div className="ctas">
            <a className="btn primary lg" href={LINKS.helpTelegram} target="_blank" rel="noopener noreferrer">Message @Tradesgiving ↗</a>
            <a className="btn lg" href="#how">How it works</a>
          </div>
        </div>
        <div className="gen-art" aria-hidden>
          {ART.map((g, i) => <img key={g} src={`/olympus/gods/${g}.webp`} alt="" width={180} height={180} style={{ animationDelay: `${i * -0.7}s` }} />)}
          <span className="gen-art-tag"><img src="/olympus/gods/early-birds.webp" alt="" width={28} height={28} />Early Birds · our own genesis</span>
        </div>
      </section>

      <section className="blk" id="perks">
        <div className="sh"><div className="eyebrow">What you get</div><h2>Your campaign, our reach</h2></div>
        <div className="gen-perks">
          {PERKS.map((p) => <div key={p.title} className="gen-perk"><span className="gen-ico" aria-hidden>{p.icon}</span><h3>{p.title}</h3><p>{p.text}</p></div>)}
        </div>
      </section>

      <section className="blk" id="bounties">
        <div className="sh"><div className="eyebrow">Bounty ideas</div><h2>Every action can earn</h2></div>
        <div className="gen-board">
          {BOUNTIES.map((b) => <div key={b.title} className="gen-quest"><span className="gen-ico" aria-hidden>{b.icon}</span><b>{b.title}</b><span className="gen-reward">Reward</span></div>)}
        </div>
      </section>

      <section className="blk" id="how">
        <div className="sh"><div className="eyebrow">From genesis to token</div><h2>NFT first, token when it&apos;s earned</h2><p>A token comes after several weeks of real traction, minimum.</p></div>
        <ol className="gen-road">
          {ROADMAP.map((r, i) => <li key={r.title}><span className="gen-when">{r.when}</span><span className="gen-dot" aria-hidden>{i + 1}</span><h3>{r.title}</h3><p>{r.text}</p></li>)}
        </ol>
        <div className="gen-funnel">
          <div><b>Ready for a token?</b><span>Launch through the EARLY token incubator on Montra.</span></div>
          <Link className="btn" href="/incubator/elysium">Token incubator →</Link>
        </div>
      </section>

      <section className="blk">
        <div className="cta gen-cta">
          <img src="/olympus/gods/early-birds-lg.webp" alt="" />
          <div>
            <div className="eyebrow">Limited spots</div>
            <h2>Want in? Message @Tradesgiving</h2>
            <p>Share your collection, chain and timeline. We&apos;ll confirm if it&apos;s a fit.</p>
          </div>
          <div className="ctas">
            <a className="btn primary lg" href={LINKS.helpTelegram} target="_blank" rel="noopener noreferrer">Telegram ↗</a>
            <a className="btn lg" href={LINKS.helpX} target="_blank" rel="noopener noreferrer">X ↗</a>
          </div>
        </div>
      </section>
    </>
  );
}
