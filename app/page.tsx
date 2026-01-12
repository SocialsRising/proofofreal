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
          Coming January 2026 • Priority access for HOPE, FAKE, and The Hopeful Holders.
        </p>

        <div className="mt-4 text-sm font-medium text-emerald-400 text-center">
  Early Waitlist Sign-ups have ended. Stay tuned for the next update!
</div>


        {/* 🎵 Random Playlist Player */}
        <div className="mt-8">
          <button
            onClick={toggleMusic}
            className="text-xs border border-slate-700 rounded-full px-4 py-2 hover:border-emerald-400 hover:text-emerald-300 transition"
          >
            {showPlayer ? "Hide POR Playlist Week 2" : "Play POR Playlist Week 2"}
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
          <a href="https://x.com/proofofreal" target="_blank" className="hover:text-emerald-400 transition">Twitter / X</a>
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
