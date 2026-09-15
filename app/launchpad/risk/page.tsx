import Link from "next/link";
import { LegalPage } from "../_components/Legal";

export const metadata = { title: "Risk Notice · Meme Maxxers Launchpad" };

export default function Risk() {
  return (
    <LegalPage title="Risk Notice" intro="Read this before you launch, buy or hold anything here. It is written in plain English on purpose.">
      <section><h2>This is speculation, not investment</h2>
        <p>Tokens launched through Meme Maxxers are speculative digital assets. They have no intrinsic value, no claim on any company, revenue or asset, and no promise of appreciation. Most tokens of this kind lose most or all of their value. <b>Only use money you can afford to lose entirely.</b></p>
      </section>
      <section><h2>Nothing here is financial advice</h2>
        <p>Nothing on this site — including market-cap estimates, fee illustrations, founder-lock badges or anything a founder writes about their business — is investment, financial, legal or tax advice. We are not a broker, exchange, adviser or fiduciary. <b>Do your own research</b> and, if in doubt, talk to a licensed professional in your jurisdiction.</p>
      </section>
      <section><h2>Smart-contract risk</h2>
        <ul>
          <li>The contracts are open source and tested but <b>have not been independently audited</b>. Bugs may exist.</li>
          <li>Liquidity is locked in a contract that has no withdraw function. If there is a bug, <b>nobody — including us — can recover it.</b></li>
          <li>Transactions on a blockchain are final. A mistaken or malicious transaction cannot be reversed.</li>
          <li>Wallet compromise, phishing and signing the wrong transaction are your responsibility to guard against.</li>
        </ul>
      </section>
      <section><h2>Market risk</h2>
        <ul>
          <li>Prices are set by a Uniswap pool and can move violently on small volume. Early liquidity is thin.</li>
          <li>A founder&apos;s dev buy can concentrate a large share of supply in one wallet. We show the share so you can see it; we do not restrict it.</li>
          <li>Founders may sell, abandon a project, or fail to deliver what they describe. A founder lock delays selling of the locked share only, for the stated period only.</li>
          <li>The launchpad, the founder and the holder rewards pool all earn a percentage of every trade. Trading has a cost.</li>
        </ul>
      </section>
      <section><h2>Sunday payouts</h2>
        <p>Holder rewards depend on trading fees actually collected, on a snapshot process we run off-chain, and on the assets available in a given week. Payouts can be small, delayed, changed in composition or, if there were no fees, zero. They are not guaranteed and are not interest, dividends or yield.</p>
      </section>
      <section><h2>Third-party assets</h2>
        <p>Rewards may include tokenized stocks, AI-agent tokens and NFTs issued by third parties. We do not control those issuers, their availability, their legal status in your jurisdiction, or their value.</p>
      </section>
      <section><h2>Regulatory risk</h2>
        <p>Laws on digital assets differ by country and change quickly. It is your responsibility to know whether using this site, launching a token or holding one is legal where you are. Some features may be unavailable or withdrawn in some regions.</p>
      </section>
      <section><h2>Founders</h2>
        <p>If you launch a token you are responsible for what you say about it, for complying with the laws that apply to you, and for the business you link. Meme Maxxers does not vet, endorse or guarantee any founder or business that appears here.</p>
        <p>See also the <Link href="/launchpad/terms">Terms of Use</Link> and <Link href="/launchpad/privacy">Privacy Policy</Link>.</p>
      </section>
    </LegalPage>
  );
}
