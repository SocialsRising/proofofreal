This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

---

## Meme Maxxers Launchpad (`/launchpad`)

Token launchpad for games, IPs and communities on **Base and Robinhood Chain** (Arc next). Our own Pons-style factory on
Uniswap V3: one transaction mints a fixed **1B** token, opens its WETH pool, seeds all unlocked supply as single-sided
liquidity, locks the LP forever in `FeeLocker` with a bps fee split (30% launchpad / 70% creator economy, split creator vs
holders by the preset chosen at launch), optionally time-locks a founder share and executes a dev buy. Holders are paid
weekly by **soft staking**: a Sunday balance snapshot, tiers (100k → 100M), a streak boost, and a Merkle claim on
`RewardsDistributor` (ETH now; the reward token is per-epoch so it can become QUANT later).

Setup:

1. `cd contracts && npm install --legacy-peer-deps && npx hardhat test`, then deploy per chain:
   `DEPLOYER_PRIVATE_KEY=0x… TREASURY=0x… STAKERS_POOL=0x… npx hardhat run script/deploy.js --network baseSepolia` (then `base`, `robinhood`).
   Copy the printed `NEXT_PUBLIC_FACTORY_*` / `NEXT_PUBLIC_DISTRIBUTOR_*` into `.env.local` / Vercel. Run `node script/export-abi.js` after any contract change.
2. Optional: run `supabase/launchpad.sql` and set `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` so launches, game submissions and incubation requests persist (in-memory fallback otherwise).
3. `npm run dev` → http://localhost:3000/launchpad
4. Weekly payouts: `node scripts/snapshot.mjs --chain 8453 [--publish]` (also runs Sundays via `.github/workflows/snapshot.yml` and opens a PR). Epoch sheets are public under `public/launchpad/epochs/`.

Code: `app/launchpad` (pages, `_components`, `_lib`), `app/api/launchpad` (registry), `contracts/` (Hardhat), `scripts/snapshot.mjs`.
Referrals: `?ref=<wallet>` is captured for 30 days and stored with each launch; X sign-in and volume attribution are next.
