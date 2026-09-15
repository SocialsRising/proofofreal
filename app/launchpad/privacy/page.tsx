import { LegalPage } from "../_components/Legal";

export const metadata = { title: "Privacy · Meme Maxxers Launchpad" };

export default function Privacy() {
  return (
    <LegalPage title="Privacy Policy" intro="Short version: we never see your keys, we store what you type into the site, and blockchains are public.">
      <section><h2>What we collect</h2>
        <ul>
          <li><b>Wallet addresses.</b> When you connect a wallet, launch a token or claim a payout, your public address is used to read balances and is stored with anything you create. Addresses are pseudonymous but public on the blockchain.</li>
          <li><b>Token metadata you submit.</b> Name, ticker, description, image, links. This is published on the website and, in part, emitted permanently in the on-chain launch event.</li>
          <li><b>Incubation and partner requests.</b> The project name, contact handle or email, and message you send us.</li>
          <li><b>Referral tags.</b> If you arrive via a <code>?ref=</code> link we keep that tag in your browser&apos;s local storage for 30 days to attribute launches and trades.</li>
          <li><b>Technical logs.</b> Our hosting provider records standard request logs (IP address, browser, pages) to run and protect the service.</li>
        </ul>
      </section>
      <section><h2>What we do not collect</h2>
        <p>Private keys or seed phrases — ever. We do not ask for your name, government ID or payment card. We do not run advertising trackers or sell data.</p>
      </section>
      <section><h2>How we use it</h2>
        <p>To show your token and profile, run Sunday payout snapshots, respond to requests, attribute referrals, prevent abuse and improve the site.</p>
      </section>
      <section><h2>Where it lives</h2>
        <p>Website data is stored with our hosting and database providers. Prices are fetched from a public price API without sending any personal data. Anything written to a blockchain is public, permanent and outside our control.</p>
      </section>
      <section><h2>Your choices</h2>
        <ul>
          <li>Disconnect your wallet at any time from the wallet button.</li>
          <li>Clear the referral tag by clearing your browser&apos;s site data.</li>
          <li>Ask us to remove a token listing, image or description from the website via the community links. On-chain data cannot be removed.</li>
        </ul>
      </section>
      <section><h2>Children</h2>
        <p>The site is not intended for anyone under 18 and we do not knowingly collect data from minors.</p>
      </section>
      <section><h2>Changes</h2>
        <p>If this policy changes, the date at the top changes with it.</p>
      </section>
    </LegalPage>
  );
}
