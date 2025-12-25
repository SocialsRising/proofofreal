"use client";

import { useState, FormEvent, useCallback } from "react";

export default function Home() {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [showPlayer, setShowPlayer] = useState(false);
  const [videoId, setVideoId] = useState<string | null>(null);
  const [trackStatus, setTrackStatus] = useState<"idle" | "loading" | "error">("idle");

  // === Waitlist Submit Function ===
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

  // === Load random YouTube track ===
  const loadRandomTrack = useCallback(async () => {
    try {
      setTrackStatus("loading");
      const res = await fetch("/api/random-track");
      const data = await res.json();

      if (data.videoId) {
        setVideoId(data.videoId);
        setTrackStatus("idle");
      } else {
        setTrackStatus("error");
      }
    } catch {
      setTrackStatus("error");
    }
  }, []);

  const toggleMusic = () => {
    const openNext = !showPlayer;
    setShowPlayer(openNext);
    if (openNext && !videoId) loadRandomTrack();
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-between bg-slate-950 text-white px-6 text-center py-16">

      {/* Main Section */}
      <div className="max-w-xl w-full mt-10">
        <h1 className="text-5xl sm:text-6xl font-bold tracking-tight mb-4">PROOF OF REAL</h1>

        <p className="text-lg sm:text-xl text-slate-300 leading-relaxed mb-2">
          Where the <span className="text-emerald-400 font-semibold">best converters</span> become the{" "}
          <span className="text-sky-400 font-semibold">highest earners</span>
        </p>

        <p className="text-sm text-slate-400 mb-8">
          Coming early January 2026 • Priority access for early believers & Real Ones.
        </p>

        {/* Email Form */}
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row items-center w-full max-w-md mx-auto gap-3">
          <input
            type="email"
            name="email"
            required
            placeholder="Enter email"
            className="flex-1 px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 
                       placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-emerald-500"
          />

          <button type="submit" disabled={status === "loading"} className="px-6 py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-semibold hover:bg-emerald-400 transition">
            {status === "loading" ? "Joining..." : "Join Waitlist"}
          </button>
        </form>

        <div className="mt-3 text-xs min-h-[20px]">
          {status === "success" && <p className="text-emerald-400">You're in — welcome Real One 🧪</p>}
          {status === "error" && <p className="text-rose-400">Error — try again or DM us.</p>}
          {status === "idle" && <p className="text-slate-500">Early whitelist access.</p>}
        </div>

        {/* 🎵 Random Playlist Player */}
        <div className="mt-8">
          <button
            onClick={toggleMusic}
            className="text-xs border border-slate-700 rounded-full px-4 py-2 hover:border-emerald-400 hover:text-emerald-300 transition"
          >
            {showPlayer ? "Hide POR Playlist Week 1" : "Play POR Playlist Week 1"}
          </button>

          {showPlayer && (
            <div className="mt-4">
              {trackStatus === "loading" && <p className="text-[11px] text-slate-400">Loading track…</p>}
              {trackStatus === "error" && <p className="text-[11px] text-rose-400">Playlist failed to load.</p>}

              {videoId && (
                <div className="mt-2 aspect-video w-full rounded-xl overflow-hidden border border-slate-800">
                  <iframe
                    className="w-full h-full"
                    src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`}
                    allow="accelerometer; autoplay; encrypted-media; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Footer Links — ⭐ RESTORED ⭐ */}
      <footer className="mt-20 mb-4 text-xs text-slate-500 flex flex-col items-center gap-3">
        <div className="flex flex-wrap justify-center gap-4 text-[12px]">
          <a href="https://x.com/socialsrising" target="_blank" className="hover:text-emerald-400 transition">Twitter / X</a>
          <a href="https://discord.gg/krVPuyksQy" target="_blank" className="hover:text-emerald-400 transition">Discord</a>
          <a href="https://medium.com/@tradesgiving" target="_blank" className="hover:text-emerald-400 transition">Medium</a>
          <a href="https://opensea.io/collection/the-hopeful-" target="_blank" className="hover:text-emerald-400 transition">NFT Collection</a>
          <a href="https://clanker.world/clanker/0x8Ce6779DaE5bf8a1319168e763fcED44C5220B07" target="_blank" className="hover:text-emerald-400 transition">$HOPE Trading</a>
          <a href="https://portal.abs.xyz/trade?buy=0x532988fc8be76af7439de4bcaacc7707660ea3e6&showBars=true&showHistory=true" target="_blank" className="hover:text-emerald-400 transition">$FAKE Trading</a>
        </div>

        <p>© {new Date().getFullYear()} Proof of Real • Socials Rising</p>
      </footer>
    </main>
  );
}
