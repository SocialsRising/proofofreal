/* Genesis NFT Incubator: launch a genesis collection with EARLY's community behind it, build traction for a few weeks,
   then graduate into the token incubator on Montra. Interest goes to @Tradesgiving. */
import Link from "next/link";
import { LINKS, PARENT } from "../_lib/config";

const ART = ["zeus", "poseidon", "nyx", "helios", "artemis", "hermes", "selene", "apollo", "hecate"];

const PERKS: { icon: string; title: string; text: string }[] = [
  { icon: "🐦", title: "A community on day one", text: "$EARLY and Early Birds NFT holders join from the start, so your mint opens to a crowd, not an empty room." },
  { icon: "📣", title: "Campaign-built marketing", text: "A structured campaign around your mint: teasers, countdown, mint day, reveal and the weeks after." },
  { icon: "🚀", title: "Social media amplification", text: `Your mint and milestones pushed across the EARLY and ${PARENT} accounts and communities.` },
  { icon: "🤝", title: "Creator partnerships", text: "Creators amplify your collection, each for a free NFT. Their audiences become your holders." },
  { icon: "💎", title: "Buy & trade bounties", text: "Rewards for collectors who buy and trade your NFT, so the floor and volume get going early." },
  { icon: "🔗", title: "Referral rewards", text: "Holders get rewarded for bringing friends in. Every holder becomes a recruiter." },
];

const BOUNTIES: { icon: string; title: string; text: string }[] = [
  { icon: "💬", title: "Join the Discord", text: "Get in, grab a role, say gm." },
  { icon: "𝕏", title: "Follow on X", text: "Follow the collection's account." },
  { icon: "📌", title: "Amplify the mint tweet", text: "Like, repost and quote the pinned mint post." },
  { icon: "🎨", title: "Share your art post-mint", text: "Post the NFT you minted and tag the project." },
  { icon: "🛒", title: "Buy & trade", text: "Pick one up on the market or trade between collectors." },
  { icon: "👥", title: "Refer a friend", text: "Bring someone in who mints or buys." },
];

const ROADMAP: { when: string; title: string; text: string }[] = [
  { when: "Week 0", title: "Plan the mint", text: "Art, supply and price, plus the campaign and bounty board." },
  { when: "Mint week", title: "Launch with a crowd", text: "EARLY + Early Birds holders, creators and amplification all at once." },
  { when: "Weeks 2–6+", title: "Build real traction", text: "Bounties, referrals and post-mint content keep holders, volume and the floor growing." },
  { when: "Then", title: "Launch your token", text: "Graduate into the EARLY token incubator on Montra, with your NFT holders as day-one community. More chains after." },
];

export default function GenesisPage() {
  return (
    <>
      <section className="gen-hero">
        <div className="gen-copy">
          <div className="eyebrow live"><i />Genesis NFT Incubator</div>
          <h1>Mint your genesis collection<br /><span className="dim">with a community on day one.</span></h1>
          <p className="lead">We bring the holders, the creators and the campaign. You bring the art. Build traction with your genesis NFT first, then launch your token through EARLY.</p>
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
        <div className="sh"><div className="eyebrow">What you get</div><h2>Everything a genesis mint needs</h2></div>
        <div className="gen-perks">
          {PERKS.map((p) => <div key={p.title} className="gen-perk"><span className="gen-ico" aria-hidden>{p.icon}</span><h3>{p.title}</h3><p>{p.text}</p></div>)}
        </div>
      </section>

      <section className="blk" id="bounties">
        <div className="sh"><div className="eyebrow">The bounty board</div><h2>Every action earns</h2><p>Quests that turn new faces into holders, and holders into your loudest promoters.</p></div>
        <div className="gen-board">
          {BOUNTIES.map((b) => (
            <div key={b.title} className="gen-quest"><span className="gen-ico" aria-hidden>{b.icon}</span><div><b>{b.title}</b><small>{b.text}</small></div><span className="gen-reward">Reward</span></div>
          ))}
        </div>
      </section>

      <section className="blk" id="how">
        <div className="sh"><div className="eyebrow">From genesis to token</div><h2>NFT first, token when it&apos;s earned</h2><p>A token comes after your genesis NFT has real traction: several weeks minimum.</p></div>
        <ol className="gen-road">
          {ROADMAP.map((r, i) => <li key={r.title}><span className="gen-when">{r.when}</span><span className="gen-dot" aria-hidden>{i + 1}</span><h3>{r.title}</h3><p>{r.text}</p></li>)}
        </ol>
        <div className="gen-funnel">
          <div><b>Ready for a token?</b><span>Launch through the EARLY token incubator on Montra, with fees that fund your community.</span></div>
          <Link className="btn" href="/incubator/elysium">Token incubator →</Link>
        </div>
      </section>

      <section className="blk">
        <div className="cta gen-cta">
          <img src="/olympus/gods/early-birds-lg.webp" alt="" />
          <div>
            <div className="eyebrow">Limited spots</div>
            <h2>Want in? Message @Tradesgiving</h2>
            <p>Tell us about your collection: art, supply and timeline. We&apos;ll confirm if it&apos;s a fit and map out your mint.</p>
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
