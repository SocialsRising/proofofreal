"use client";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-50">
      {/* Hero */}
      <section className="mx-auto flex max-w-5xl flex-col gap-10 px-6 pb-20 pt-24 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full bg-slate-900/80 px-3 py-1 text-xs font-medium text-slate-300 ring-1 ring-slate-700">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            Proof of Real • Early access
          </div>

          <h1 className="text-4xl font-semibold tracking-tight text-slate-50 sm:text-5xl lg:text-6xl">
            Verify that you&apos;re{" "}
            <span className="bg-gradient-to-r from-emerald-400 via-sky-400 to-violet-400 bg-clip-text text-transparent">
              actually real
            </span>
            .
          </h1>

          <p className="max-w-xl text-base text-slate-300 sm:text-lg">
            Proof of Real turns your threads, builds, and contributions into a
            verifiable <span className="font-semibold text-emerald-300">Real Score</span>. 
            No botted stats. No fake engagement. Just receipts that you show up.
          </p>

          {/* CTA / Waitlist */}
          <div className="space-y-3">
            <p className="text-sm font-medium uppercase tracking-wide text-slate-400">
              Join the early waitlist
            </p>
            <form
              className="flex flex-col gap-3 sm:flex-row"
              onSubmit={(e) => {
                e.preventDefault();
                alert(
                  "Waitlist coming soon. For now, DM @SocialsRising or join the Discord."
                );
              }}
            >
              <input
                type="email"
                required
                placeholder="Enter your email"
                className="w-full rounded-xl border border-slate-700 bg-slate-900/70 px-4 py-2.5 text-sm text-slate-50 placeholder:text-slate-500 outline-none ring-emerald-400/0 transition hover:border-slate-500 focus:ring-2"
              />
              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/30 transition hover:bg-emerald-400"
              >
                Request access
              </button>
            </form>
            <p className="text-xs text-slate-500">
              Real Ones, FAKE holders, and close partners will get priority access.
            </p>
          </div>
        </div>

        {/* Right side card */}
        <div className="mt-10 w-full max-w-md self-center rounded-3xl border border-slate-800 bg-slate-900/60 p-5 shadow-xl shadow-black/40 backdrop-blur lg:mt-0">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Sample Real Profile
            </p>
            <span className="rounded-full bg-slate-800 px-3 py-1 text-[10px] font-semibold text-emerald-300">
              Real Score • 82
            </span>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 via-sky-500 to-violet-500 text-lg font-bold text-slate-950">
              R
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-50">
                Real One #019
              </p>
              <p className="text-xs text-slate-400">@real_builder</p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-3 text-xs">
            <div className="rounded-2xl bg-slate-950/70 p-3">
              <p className="text-[11px] text-slate-400">Proofs submitted</p>
              <p className="mt-1 text-lg font-semibold text-slate-50">27</p>
            </div>
            <div className="rounded-2xl bg-slate-950/70 p-3">
              <p className="text-[11px] text-slate-400">Verified actions</p>
              <p className="mt-1 text-lg font-semibold text-slate-50">19</p>
            </div>
            <div className="rounded-2xl bg-slate-950/70 p-3">
              <p className="text-[11px] text-slate-400">Streak</p>
              <p className="mt-1 text-lg font-semibold text-emerald-400">
                8 days
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              Latest proofs
            </p>
            <ul className="space-y-2 text-xs">
              <li className="flex items-center justify-between rounded-xl bg-slate-950/60 px-3 py-2">
                <span className="text-slate-200">Shipped new landing page</span>
                <span className="text-emerald-300">+8</span>
              </li>
              <li className="flex items-center justify-between rounded-xl bg-slate-950/60 px-3 py-2">
                <span className="text-slate-200">Hosted X space for builders</span>
                <span className="text-emerald-300">+5</span>
              </li>
              <li className="flex items-center justify-between rounded-xl bg-slate-950/60 px-3 py-2">
                <span className="text-slate-200">Referred 3 Real Ones</span>
                <span className="text-emerald-300">+12</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-slate-800 bg-slate-950/60">
        <div className="mx-auto flex max-w-5xl flex-col gap-8 px-6 py-14">
          <div>
            <h2 className="text-xl font-semibold text-slate-50 sm:text-2xl">
              How Proof of Real works
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-slate-400">
              Simple, transparent, and built for long-term builders, creators, and
              contributors across crypto, gaming, and beyond.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                01 • Verify
              </p>
              <p className="mt-2 text-sm font-semibold text-slate-50">
                Connect your accounts
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Link your wallet and socials (X, Discord, more soon) to start your
                Real profile.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                02 • Prove
              </p>
              <p className="mt-2 text-sm font-semibold text-slate-50">
                Submit real receipts
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Threads, builds, campaigns, collabs, spaces, contributions. If you
                did it, you can prove it.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                03 • Earn
              </p>
              <p className="mt-2 text-sm font-semibold text-slate-50">
                Build your Real Score
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Verified actions increase your score and unlock rewards, reputation
                and access across the Socials Rising ecosystem.
              </p>
            </div>
          </div>

          <p className="text-xs text-slate-500">
            Coming soon: on-chain Real Score, partner integrations, and Real
            credentials for founders, creators, investors and communities.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-6">
        <div className="mx-auto flex max-w-5xl flex-col justify-between gap-3 px-6 text-xs text-slate-500 sm:flex-row sm:items-center">
          <p>© {new Date().getFullYear()} Proof of Real · Socials Rising</p>
          <p className="text-[11px]">
            Built for Real Ones. No bots. No fake friends.
          </p>
        </div>
      </footer>
    </main>
  );
}
