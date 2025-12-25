"use client";

import { useState, FormEvent } from "react";

export default function Home() {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [showPlayer, setShowPlayer] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus("loading");

    const form = e.currentTarget;
    const data = new FormData(form);

    try {
      const res = await fetch("https://formspree.io/f/mykgradg", {
        method: "POST",
        body: data,
        headers: { Accept: "application/json" },
      });

      if (res.ok) {
        form.reset();
        setStatus("success");
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-white px-6 text-center">
      {/* Main Hero */}
      <div className="max-w-xl w-full">
        <h1 className="text-5xl sm:text-6xl font-bold tracking-tight mb-4">
          PROOF OF REAL
        </h1>

        <p className="text-lg sm:text-xl text-slate-300 leading-relaxed mb-2">
          Where the{" "}
          <span className="text-emerald-400 font-semibold">best converters</span>{" "}
          become the{" "}
          <span className="text-sky-400 font-semibold">highest earners</span>
        </p>

        <p className="text-sm text-slate-400 mb-8">
          Coming early January 2026 · Priority access for Hopeful NFT, HOPE, and FAKE Holders.
        </p>

        {/* Waitlist Form */}
        <form
          onSubmit={handleSubmit}
          className="flex flex-col sm:flex-row items-center w-full max-w-md mx-auto gap-3"
        >
          <input
            type="email"
            name="email"
            required
            placeholder="Enter your email"
            className="flex-1 px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 
                       placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-emerald-500"
          />

          <button
            type="submit"
            disabled={status === "loading"}
            className="px-6 py-2.5 rounded-xl bg-emerald-500 font-semibold text-slate-950
                       hover:bg-emerald-400 transition shadow-lg disabled:opacity-70 disabled:cursor-wait"
          >
            {status === "loading" ? "Joining..." : "Join Waitlist"}
          </button>
        </form>

        <div className="min-h-[1.75rem] mt-3">
          {status === "success" && (
            <p className="text-xs text-emerald-400">
              You&apos;re in — welcome Real One 🧪 Check email soon for updates.
            </p>
          )}
          {status === "error" && (
            <p className="text-xs text-rose-400">
              Something went wrong. Try again or DM{" "}
              <a
                href="https://x.com/socialsrising"
                target="_blank"
                className="underline"
              >
                @SocialsRising
              </a>
              .
            </p>
          )}
          {status === "idle" && (
            <p className="text-xs text-slate-500">
              Early whitelist access before public rollout.
            </p>
          )}
        </div>

        {/* Music / Weekly Track Player */}
        <div className="mt-8">
          <button
            type="button"
            onClick={() => setShowPlayer((prev) => !prev)}
            className="text-xs rounded-full border border-slate-700 px-4 py-2 text-slate-300 hover:border-emerald-400 hover:text-emerald-300 transition"
          >
            {showPlayer ? "Hide Weekly Playlist" : "Play Week 0 Playlist"}
          </button>

          {showPlayer && (
            <div className="mt-4 aspect-video w-full rounded-xl overflow-hidden border border-slate-800">
              <iframe
                className="w-full h-full"
                src="https://www.youtube.com/embed/rQMsJnOEtvg?rel=0&autoplay=1"
                title="Weekly Real Ones Track"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-16 mb-6 flex flex-col items-center gap-3 text-xs text-slate-500">
        <div className="flex flex-wrap justify-center gap-4 text-[11px]">
          <a href="https://x.com/socialsrising" target="_blank" className="hover:text-emerald-400 transition">
            Twitter / X
          </a>
          <a href="https://discord.gg/krVPuyksQy" target="_blank" className="hover:text-emerald-400 transition">
            Discord
          </a>
          <a href="https://medium.com/@tradesgiving" target="_blank" className="hover:text-emerald-400 transition">
            Medium
          </a>
          <a href="https://opensea.io/collection/the-hopeful-" target="_blank" className="hover:text-emerald-400 transition">
            NFT Collection
          </a>
          <a href="https://clanker.world/clanker/0x8Ce6779DaE5bf8a1319168e763fcED44C5220B07" target="_blank" className="hover:text-emerald-400 transition">
            $HOPE Trading
          </a>
          <a href="https://portal.abs.xyz/trade?buy=0x532988fc8be76af7439de4bcaacc7707660ea3e6&showBars=true&showHistory=true"
             target="_blank"
             className="hover:text-emerald-400 transition">
            $FAKE Trading
          </a>
        </div>

        <p>© {new Date().getFullYear()} Proof of Real · Socials Rising</p>
      </footer>
    </main>
  );
}
