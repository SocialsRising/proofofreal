import Link from "next/link";
import { LINKS, type Launchpad } from "../_lib/config";

const TOKENS: Record<string, [string, string]> = {
  EARLY: ["$EARLY", LINKS.earlyToken],
  BIRDS: ["Early Birds", LINKS.earlyBirds],
};

/** Renders a slot description, turning {EARLY} / {BIRDS} into links people can click to buy. */
export function RichDesc({ text }: { text: string }) {
  return (
    <>
      {text.split(/(\{[A-Z]+\})/).map((part, i) => {
        const hit = TOKENS[part.slice(1, -1)];
        if (!hit) return <span key={i}>{part}</span>;
        return hit[1].startsWith("/") ? <Link key={i} className="inlink" href={hit[1]}>{hit[0]}</Link>
          : <a key={i} className="inlink" href={hit[1]} target="_blank" rel="noopener noreferrer">{hit[0]} ↗</a>;
      })}
    </>
  );
}

/** "Season 2 is live"-style incentive note for a launchpad. Hides itself after `until`. */
export function Bonus({ lp }: { lp: Launchpad }) {
  if (!lp.bonus || (lp.bonus.until && Date.now() >= Date.parse(lp.bonus.until))) return null;
  const { title, text, href } = lp.bonus;
  return (
    <a className="bonus" href={href} target="_blank" rel="noopener noreferrer">
      <span className="bonus-dot" aria-hidden />
      <span><b>{title}</b> {text}</span>
      <span className="bonus-go" aria-hidden>↗</span>
    </a>
  );
}

export function HelpLine() {
  return (
    <p className="helpline">
      Need help? Reach out to <b>@Tradesgiving</b> on{" "}
      <a href={LINKS.helpTelegram} target="_blank" rel="noopener noreferrer">Telegram ↗</a> or{" "}
      <a href={LINKS.helpX} target="_blank" rel="noopener noreferrer">X ↗</a>.
    </p>
  );
}
