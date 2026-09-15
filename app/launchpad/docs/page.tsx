import Link from "next/link";
import { CHAINS } from "../_lib/chains";
import { DEPLOYMENTS } from "../_lib/deployments";
import { INITIAL_MCAP_ETH, LAUNCH_FEE_ETH, TOTAL_SUPPLY } from "../_lib/config";
import { POOL_FEE_PCT, PROTOCOL_SHARE, SPLITS } from "../_lib/presets";

export const metadata = { title: "Docs · Meme Maxxers Launchpad" };

const TOC = [["overview", "Overview"], ["launch", "Launch mechanics"], ["fees", "Fees"], ["trust", "Founder lock & dev buy"], ["business", "AI agent business link"], ["soft-staking", "Soft staking"], ["contracts", "Contracts"], ["network", "Network"], ["risks", "Risks"]];

function Addr({ a, label, explorer }: { a?: string; label: string; explorer: string }) {
  return a
    ? <div className="kv"><span>{label}</span><a className="mono" href={`${explorer}/address/${a}`} target="_blank" rel="noreferrer" style={{ textDecoration: "underline", wordBreak: "break-all" }}>{a}</a></div>
    : <div className="kv"><span>{label}</span><b className="muted">not deployed</b></div>;
}

export default function Docs() {
  const rh = CHAINS.robinhood;
  const d = DEPLOYMENTS[rh.id];
  return (
    <div className="doc">
      <section className="blk" style={{ paddingTop: 34, paddingBottom: 0 }}>
        <div className="eyebrow">Docs</div>
        <h2 style={{ margin: "6px 0 14px" }}>How the launchpad works</h2>
        <div className="toc">{TOC.map(([id, l]) => <a key={id} className="chip" href={`#${id}`}>{l}</a>)}</div>
      </section>

      <section id="overview"><h2>Overview</h2>
        <p>Meme Maxxers is a token launchpad for founders running AI agent businesses. One transaction mints a fixed-supply token, opens a Uniswap pool for it, locks that liquidity forever and sets a fee split that pays the founder and the token&apos;s holders on every trade. There is no bonding curve and no migration step — the token trades on Uniswap from the first block.</p>
        <p>Holders are rewarded through <a href="#soft-staking">soft staking</a>: they simply hold in their own wallets and receive a payout every Sunday.</p>
      </section>

      <section id="launch"><h2>Launch mechanics</h2>
        <ul>
          <li><b>Supply:</b> exactly {TOTAL_SUPPLY.toLocaleString()} tokens, every launch. No mint function, no owner, no tax at the token level, no blacklist.</li>
          <li><b>Pool:</b> a Uniswap V3 pool against WETH at the {POOL_FEE_PCT}% fee tier. All supply that isn&apos;t founder-locked is deposited as single-sided liquidity starting at a {INITIAL_MCAP_ETH} ETH market cap.</li>
          <li><b>Lock:</b> the LP position NFT is transferred to the <code>FeeLocker</code> contract, which has no function that can move it out. That is what &quot;locked forever&quot; means here.</li>
          <li><b>Launch fee:</b> {LAUNCH_FEE_ETH} ETH, paid to the launchpad treasury. Anything sent above it is spent on the founder&apos;s dev buy in the same transaction.</li>
        </ul>
      </section>

      <section id="fees"><h2>Fees</h2>
        <p>Every buy and sell pays the {POOL_FEE_PCT}% pool fee. Fees accrue inside the locked position; anyone can call <code>collect()</code> and the contract pushes them out in one go:</p>
        <ul>
          <li><b>{PROTOCOL_SHARE}%</b> of the fee to the launchpad treasury.</li>
          <li><b>{100 - PROTOCOL_SHARE}%</b> split between the founder and the holder rewards pool, using the preset the founder picked at launch: {SPLITS.map((s) => `${s.label} (${s.creator}/${s.stakers})`).join(", ")}. Holders never receive less than half of this share.</li>
        </ul>
        <p>The split is written on-chain at launch and cannot be changed by anyone, including us. The founder can re-point <em>where</em> their share is paid (for example to a multisig), never <em>how much</em>.</p>
        <p><b>Coming next:</b> a founder-chosen 1–10% creator fee on top of the launchpad&apos;s 1%, charged on every buy and sell through a Uniswap V4 hook. Tokens launched on the current factory keep the fee they launched with.</p>
      </section>

      <section id="trust"><h2>Founder lock &amp; dev buy</h2>
        <ul>
          <li><b>Founder lock:</b> optionally 2%, 5% or 10% of supply for 90, 180 or 365 days in the <code>FounderVault</code>. Nobody can shorten a lock. The vault, amount and unlock date are readable on-chain and shown on the token page.</li>
          <li><b>Dev buy:</b> ETH sent with the launch (up to 100 ETH in the UI) buys the token from the brand-new pool inside the same transaction, before any other wallet can. The amount is emitted in the launch event and displayed publicly. The launch page shows the resulting market cap and share of supply before you sign.</li>
        </ul>
      </section>

      <section id="business"><h2>AI agent business link</h2>
        <p>A token here represents a founder and the business their agents run. The launch form takes a single link to that business — a product, a storefront, a dashboard, a live demo. It shows as a button on the token page so holders can see what the fees are funding. Socials (X, Discord, Telegram) are optional and can be added later.</p>
      </section>

      <section id="soft-staking"><h2>Soft staking</h2>
        <p>There is no staking contract and nothing to approve or lock. Every Sunday at 00:00 UTC we take a snapshot of every wallet holding a launched token. Rewards are then sent directly to those wallets — a variety of stock tokens, experimental AI agents and new NFTs — funded by the holder share of that week&apos;s trading fees.</p>
        <ul>
          <li>Hold in your own wallet. Selling before the snapshot means you are not in it.</li>
          <li>Liquidity pool, founder vault and known exchange wallets are excluded.</li>
          <li>Payout schedules and asset mixes are published each week in the <Link href="/launchpad/updates">build log</Link>.</li>
        </ul>
      </section>

      <section id="contracts"><h2>Contracts · {rh.label}</h2>
        <p>Source is in the repository&apos;s <code>contracts/</code> folder. Verify deployed bytecode against it before trusting an address.</p>
        <div className="card pad" style={{ display: "grid", gap: 0 }}>
          <Addr a={rh.factory} label="LaunchFactory" explorer={rh.explorer} />
          <Addr a={d?.feeLocker} label="FeeLocker" explorer={rh.explorer} />
          <Addr a={d?.founderVault} label="FounderVault" explorer={rh.explorer} />
          <Addr a={rh.distributor} label="RewardsDistributor" explorer={rh.explorer} />
          <Addr a={rh.weth} label="WETH" explorer={rh.explorer} />
        </div>
      </section>

      <section id="network"><h2>Network</h2>
        <div className="card pad" style={{ display: "grid", gap: 0 }}>
          <div className="kv"><span>Chain</span><b>{rh.label}</b></div>
          <div className="kv"><span>Chain ID</span><b>{rh.id}</b></div>
          <div className="kv"><span>Gas token</span><b>ETH</b></div>
          <div className="kv"><span>Public RPC</span><b className="mono" style={{ wordBreak: "break-all" }}>https://rpc.mainnet.chain.robinhood.com</b></div>
          <div className="kv"><span>Explorer</span><a className="mono" href={rh.explorer} target="_blank" rel="noreferrer" style={{ textDecoration: "underline" }}>{rh.explorer.replace("https://", "")}</a></div>
        </div>
      </section>

      <section id="risks"><h2>Risks</h2>
        <ul>
          <li>Tokens launched here are volatile and can go to zero. Nothing on this site is financial advice.</li>
          <li>The contracts are open source and tested but <b>not audited</b>. Locked liquidity cannot be recovered by anyone if there is a bug.</li>
          <li>Large dev buys concentrate supply in the founder&apos;s wallet. The launch page and token page show the exact share so nobody has to guess.</li>
          <li>Sunday payouts depend on the snapshot process we run off-chain and on the assets available that week.</li>
        </ul>
        <p>The full <Link href="/launchpad/risk">Risk Notice</Link>, <Link href="/launchpad/terms">Terms of Use</Link> and <Link href="/launchpad/privacy">Privacy Policy</Link> are separate pages.</p>
      </section>
    </div>
  );
}
