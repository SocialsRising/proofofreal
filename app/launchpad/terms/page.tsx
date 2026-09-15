import Link from "next/link";
import { LegalPage } from "../_components/Legal";

export const metadata = { title: "Terms of Use · Meme Maxxers Launchpad" };

export default function Terms() {
  return (
    <LegalPage title="Terms of Use" intro="By using the Meme Maxxers Launchpad you agree to these terms. If you do not agree, do not use the site or the contracts.">
      <section><h2>1. What this is</h2>
        <p>Meme Maxxers (&quot;we&quot;, &quot;us&quot;) provides a website that lets users interact with open-source smart contracts on public blockchains to create tokens, open liquidity pools and split trading fees. We do not hold your funds, tokens or keys at any point. Every action is a transaction you sign from your own wallet.</p>
      </section>
      <section><h2>2. Eligibility</h2>
        <p>You must be at least 18 years old (or the age of majority where you live) and legally permitted to use digital assets in your jurisdiction. You may not use the site if you are a resident of, or located in, a jurisdiction where doing so is prohibited, or if you are subject to sanctions.</p>
      </section>
      <section><h2>3. No custody, no intermediation</h2>
        <p>We are not a bank, broker, exchange, money transmitter, investment adviser or fiduciary. We do not execute trades on your behalf; Uniswap and your wallet do. We cannot reverse, cancel or refund any transaction.</p>
      </section>
      <section><h2>4. Fees</h2>
        <p>Launching a token costs a launch fee paid to the launchpad treasury. Every trade in a launched pool pays a fee that is split on-chain between the launchpad, the founder and the holder rewards pool in proportions fixed at launch. These proportions are shown before you sign and cannot be changed afterwards. Network (gas) fees are paid to the blockchain, not to us.</p>
      </section>
      <section><h2>5. Founders</h2>
        <ul>
          <li>You are solely responsible for your token, its name, image and description, the business you link, and everything you communicate about it.</li>
          <li>You may not launch tokens that infringe intellectual property, impersonate a person or organisation, or are designed to defraud.</li>
          <li>We may remove a token&apos;s listing, image or description from the website at any time. We cannot remove the token or pool from the blockchain.</li>
          <li>A founder lock is a smart-contract time lock on the stated share of supply for the stated period. It is not an escrow, guarantee or promise of performance.</li>
        </ul>
      </section>
      <section><h2>6. Holder rewards</h2>
        <p>Sunday payouts are discretionary distributions funded by collected trading fees. Eligibility is based on wallet balances at a snapshot taken by us. We decide which wallets are excluded (liquidity pools, vaults, known exchange wallets), the assets used and the timing. Payouts are not interest, dividends, yield or a security, and may be changed, delayed or discontinued.</p>
      </section>
      <section><h2>7. Prohibited use</h2>
        <p>You may not use the site to break any law, to launder money, to manipulate markets, to attack the contracts or infrastructure, to scrape or overload the service, or to circumvent any restriction we impose.</p>
      </section>
      <section><h2>8. Disclaimers</h2>
        <p>The site and contracts are provided &quot;as is&quot; and &quot;as available&quot;, without warranties of any kind. The contracts are not audited. We do not warrant that the site will be uninterrupted, error-free or secure, or that any token will have value or liquidity. Read the <Link href="/launchpad/risk">Risk Notice</Link>; it forms part of these terms.</p>
      </section>
      <section><h2>9. Limitation of liability</h2>
        <p>To the maximum extent permitted by law, we and our contributors are not liable for any indirect, incidental, consequential or special damages, or for any loss of funds, tokens, profits or data arising from your use of the site or the contracts, even if advised of the possibility. Where liability cannot be excluded, it is limited to the launch fees you paid to us in the twelve months before the claim.</p>
      </section>
      <section><h2>10. Changes</h2>
        <p>We may update these terms and the website at any time. The date at the top tells you when they last changed. Continued use after a change means you accept it. Deployed contracts cannot be changed by us.</p>
      </section>
      <section><h2>11. Contact</h2>
        <p>Reach us through the community links in the footer. This document is a plain-English statement of terms and is not a substitute for legal advice in your jurisdiction.</p>
      </section>
    </LegalPage>
  );
}
