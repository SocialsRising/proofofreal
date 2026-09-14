## Meme Maxxers Launchpad — Base + Robinhood, 1B factory, soft staking

Adds `/launchpad`: a token launchpad for games, IPs and communities.

- **Contracts** (`contracts/`): `LaunchFactory` (1B token + Uniswap V3 pool + permanent LP lock + fee split + founder vault + dev buy in one tx), `FeeLocker`, `FounderVault`, `RewardsDistributor`. Hardhat tests pass. Not audited.
- **Frontend**: launch flow with chain selector, fee presets (Equal / Community / Diamond Handers), token pages reading the chain, collect-fees, hold-to-earn tiers, profile with weekly claims and referral link, Explore / Build a Game / Incubate / Game nights / Build-in-public.
- **Soft staking**: `scripts/snapshot.mjs` builds weekly Merkle epochs (public JSON under `public/launchpad/epochs/`), Sunday GitHub Action opens the PR.
- Registry API with Supabase (in-memory fallback), `.env.example` + README sections.

See `LAUNCHPAD_HANDOFF.md` in the PR conversation for decisions, deploy steps and next steps.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_013hufnctn9ZDkZyGCEfdkiQ
