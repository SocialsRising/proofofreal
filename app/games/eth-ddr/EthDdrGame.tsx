"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Dir = "Up" | "Down" | "Left" | "Right";
type Note = { dir: Dir; x: number; y: number; g: any };

type RunResult = {
  score: number;
  comboMax: number;
  notesSpawned: number;
  notesHit: number;
  hitRate: number;
  xHandle: string;
  wallet: string;
};

const STORAGE_KEY = "ethddr_profile_v1";

// Neon palette for lane flashes / feedback
const NEON = [
  0xff2bd6, // pink
  0x00e5ff, // cyan
  0x7cff00, // lime
  0xffd400, // yellow
  0x9b59ff, // purple
  0xff5a1f, // orange
];
const HIT_COLORS = [
  0x00ff6a, // green
  0x00c8ff, // blue
  0xffffff, // white
  0x000000, // black
  0xff3b3b, // red
  0xff2bd6, // pink
];

function isValidXHandle(v: string) {
  const s = v.trim().replace(/^@/, "");
  return /^[A-Za-z0-9_]{1,15}$/.test(s);
}

function normalizeXHandle(v: string) {
  return v.trim().replace(/^@/, "");
}

function isValidWallet(v: string) {
  const s = v.trim();
  return /^0x[a-fA-F0-9]{40}$/.test(s);
}

export default function EthDdrGame() {
  // ===== React/UI state =====
  const [phase, setPhase] = useState<"setup" | "playing" | "results">("setup");
  const [xHandle, setXHandle] = useState("");
  const [wallet, setWallet] = useState("");
  const [error, setError] = useState<string | null>(null);

  const [result, setResult] = useState<RunResult | null>(null);
  const [shared, setShared] = useState(false);

  // ===== Media refs =====
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // ===== Phaser refs =====
  const containerRef = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef<any>(null);
  const runIdRef = useRef(0);

  // mint gate (adjust any time)
  const MIN_HIT_RATE_TO_UNLOCK = 0.25; // 25%

  // Public URL for tweet (set to your production domain later if you want)
  const shareUrl = useMemo(() => "https://proofofreal.app/games/eth-ddr", []);

  // Load saved profile once
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      if (typeof data?.xHandle === "string") setXHandle(data.xHandle);
      if (typeof data?.wallet === "string") setWallet(data.wallet);
    } catch {}
  }, []);

  // Save profile whenever changes
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ xHandle: normalizeXHandle(xHandle), wallet: wallet.trim() })
      );
    } catch {}
  }, [xHandle, wallet]);

  function stopAudio() {
    const a = audioRef.current;
    if (!a) return;
    try {
      a.pause();
      a.currentTime = 0;
    } catch {}
  }

  async function startAudio() {
    const a = audioRef.current;
    if (!a) return;
    try {
      a.currentTime = 0;
      await a.play(); // requires user gesture (our Start button is the gesture)
    } catch {
      // If it fails, user can still play; we can add a "Tap to enable sound" later.
    }
  }

  function cleanupGame() {
    try {
      const g = gameRef.current;
      if (g && (g as any).__interval__) clearInterval((g as any).__interval__);
      g?.destroy(true);
    } catch {}
    gameRef.current = null;
  }

  function startRun() {
    setError(null);
    const x = normalizeXHandle(xHandle);
    const w = wallet.trim();

    if (!isValidXHandle(x)) {
      setError("Enter a valid X handle (letters/numbers/_ up to 15).");
      return;
    }
    if (!isValidWallet(w)) {
      setError("Enter a valid wallet address (0x + 40 hex characters).");
      return;
    }

    setShared(false);
    setResult(null);
    setPhase("playing");

    // Start audio immediately on user click
    startAudio();

    // Make sure any existing Phaser instance is destroyed
    cleanupGame();

    // Bump run id so we can uniquely bridge result
    runIdRef.current += 1;

    // Create Phaser game after phase changes (small timeout avoids React layout race)
    setTimeout(() => {
      initPhaser(runIdRef.current);
    }, 0);
  }

  function restartToSetup() {
    stopAudio();
    cleanupGame();
    setPhase("setup");
    setResult(null);
    setShared(false);
    setError(null);
  }

  function openTweet() {
    if (!result) return;
    const handle = normalizeXHandle(result.xHandle);

    const text =
      `I just scored ${result.score} on ETH DDR 🎶\n` +
      `Max combo: ${result.comboMax} 👏 \n\n` +
      `Think you can beat me? 🫵 \n` +
      `${shareUrl}\n\n` +
      `@proofofreal 💯 `;

    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank", "noopener,noreferrer");
    setShared(true);
  }

  // ===== Phaser init =====
  async function initPhaser(runId: number) {
    if (!containerRef.current) return;

    const PhaserMod = await import("phaser");
    const Phaser = PhaserMod.default;

    // If user navigated away or restarted during await
    if (runId !== runIdRef.current) return;

    // Game constants
    const W = 400;
    const H = 600;
    const hitZoneY = 520;

    // Timing windows
    const HIT_WINDOW = 55;
    const PERFECT_WINDOW = 10;
    const GOOD_WINDOW = 25;
    const MISS_LINE = hitZoneY + HIT_WINDOW; // when note passes this, it's a miss

    // Beat/section pacing (simple but effective)
    // 0–15s slow, 15–40s fast (chorus), 40–60s medium
   const SECTIONS = [
  { t0: 0,  t1: 10, spawnDelay: 500, speed: 240 }, // slow intro
  { t0: 10, t1: 32, spawnDelay: 400, speed: 280 }, // medium
  { t0: 32, t1: 55, spawnDelay: 330, speed: 320 }, // fast
  { t0: 55, t1: 60, spawnDelay: 500, speed: 270 }, // slow outro
];

    const laneX: Record<Dir, number> = {
      Left: 100,
      Down: 160,
      Up: 240,
      Right: 300,
    };

    let score = 0;
    let timeLeft = 60;
    let combo = 0;
    let comboMax = 0;

    let notesSpawned = 0;
    let notesHit = 0;

    class MainScene extends Phaser.Scene {
      cursors!: any;

      scoreText!: any;
      timerText!: any;
      comboText!: any;

      notes: Note[] = [];
      spawnEvent!: any;
      countdownEvent!: any;

      // lane flash rectangles
      laneFlash: Record<Dir, any> = {} as any;

      // elapsed tracking
      elapsed = 0;

      constructor() {
        super("main");
      }

      create() {
        score = 0;
        timeLeft = 60;
        combo = 0;
        comboMax = 0;
        notesSpawned = 0;
        notesHit = 0;

        this.elapsed = 0;
        this.notes = [];

        // Background base (canvas)
        this.add.rectangle(W / 2, H / 2, W, H, 0x0b0b12, 0.88);

        // Lunar new year subtle text
        const lny = this.add.text(W / 2, 180, "HAPPY LUNAR NEW YEAR 🧧", {
          fontSize: "16px",
          color: "#ffffff",
        });
        lny.setOrigin(0.5, 0.5);
        lny.setAlpha(0.08);

        this.add.text(14, 10, "ETH DDR", { fontSize: "14px", color: "#9b59ff" });

        this.scoreText = this.add.text(14, 30, "Score: 0", {
          fontSize: "16px",
          color: "#ffffff",
        });

        this.timerText = this.add.text(330, 30, "60", {
          fontSize: "16px",
          color: "#ffffff",
        });

        // lanes + hit line
        (["Left", "Down", "Up", "Right"] as Dir[]).forEach((d) => {
          const x = laneX[d];
          this.add.rectangle(x, H / 2, 2, H, 0xffffff, 0.08);

          // flash overlay per lane
          const r = this.add.rectangle(x, H / 2, 60, H, 0x9b59ff, 0);
          r.setAlpha(0);
          this.laneFlash[d] = r;
        });

        this.add.rectangle(W / 2, hitZoneY, W, 4, 0x9b59ff, 1);

        // combo text near hit line
        this.comboText = this.add.text(W / 2, hitZoneY + 12, "Combo: 0", {
          fontSize: "14px",
          color: "#ffffff",
        });
        this.comboText.setOrigin(0.5, 0);

        // input
        this.cursors = this.input.keyboard!.createCursorKeys();

        // spawn notes using initial section pacing
        const s0 = SECTIONS[0];
        this.spawnEvent = this.time.addEvent({
          delay: s0.spawnDelay,
          loop: true,
          callback: () => this.spawnNote(),
        });

        // countdown
        this.countdownEvent = this.time.addEvent({
          delay: 1000,
          loop: true,
          callback: () => {
            timeLeft -= 1;
            this.timerText.setText(String(timeLeft));
            if (timeLeft <= 0) this.endRun();
          },
        });
      }

      currentSection() {
        // elapsed is in seconds
        const e = this.elapsed;
        return (
          SECTIONS.find((s) => e >= s.t0 && e < s.t1) ?? SECTIONS[SECTIONS.length - 1]
        );
      }

      spawnNote() {
        const dirs: Dir[] = ["Left", "Down", "Up", "Right"];
        const dir = Phaser.Utils.Array.GetRandom(dirs);

        const g = this.add.graphics();
        g.fillStyle(0xffffff, 1);

        // draw bold triangle arrow centered at (0,0)
        const size = 18;
        let pts: { x: number; y: number }[] = [];
        if (dir === "Up") {
          pts = [
            { x: 0, y: -size },
            { x: -size, y: size },
            { x: size, y: size },
          ];
        } else if (dir === "Down") {
          pts = [
            { x: 0, y: size },
            { x: -size, y: -size },
            { x: size, y: -size },
          ];
        } else if (dir === "Left") {
          pts = [
            { x: -size, y: 0 },
            { x: size, y: -size },
            { x: size, y: size },
          ];
        } else {
          pts = [
            { x: size, y: 0 },
            { x: -size, y: -size },
            { x: -size, y: size },
          ];
        }

        g.fillPoints(pts, true);
        g.lineStyle(2, 0x9b59ff, 1);
        g.strokePoints(pts, true);

        const note: Note = {
          dir,
          x: laneX[dir],
          y: -30,
          g,
        };

        g.x = note.x;
        g.y = note.y;

        this.notes.push(note);
        notesSpawned += 1;
      }

      flashLane(dir: Dir) {
        const color = Phaser.Utils.Array.GetRandom(NEON);
        const r = this.laneFlash[dir];
        r.fillColor = color;
        r.setAlpha(0.18);
        this.tweens.add({
          targets: r,
          alpha: 0,
          duration: 120,
        });
      }

      feedbackText(label: string, colorHex: number) {
        const t = this.add.text(W / 2, hitZoneY - 48, label, {
          fontSize: "14px",
          color: "#" + colorHex.toString(16).padStart(6, "0"),
        });
        t.setOrigin(0.5, 0.5);
        this.tweens.add({
          targets: t,
          alpha: 0,
          y: t.y - 18,
          duration: 450,
          onComplete: () => t.destroy(),
        });
      }

      fireworksBurst() {
        // simple fireworks burst (no assets): a handful of small circles that pop out
        const bursts = 18;
        const originX = Phaser.Math.Between(60, W - 60);
        const originY = Phaser.Math.Between(80, 220);

        for (let i = 0; i < bursts; i++) {
          const c = Phaser.Utils.Array.GetRandom(NEON);
          const dot = this.add.circle(originX, originY, 3, c, 1);

          const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
          const dist = Phaser.Math.Between(40, 120);

          this.tweens.add({
            targets: dot,
            x: originX + Math.cos(angle) * dist,
            y: originY + Math.sin(angle) * dist,
            alpha: 0,
            duration: Phaser.Math.Between(450, 700),
            onComplete: () => dot.destroy(),
          });
        }
      }

      onHit(dir: Dir, diff: number) {
        // scoring
        let gained = 30;
        let label = "OK";
        if (diff < PERFECT_WINDOW) {
          gained = 100;
          label = "PERFECT";
        } else if (diff < GOOD_WINDOW) {
          gained = 60;
          label = "GOOD";
        }

        // combo
        combo += 1;
        comboMax = Math.max(comboMax, combo);

        // tiny multiplier tiers (keeps it exciting)
        let mult = 1;
        if (combo >= 50) mult = 2.0;
        else if (combo >= 25) mult = 1.5;
        else if (combo >= 10) mult = 1.2;

        score += Math.round(gained * mult);
        notesHit += 1;

        this.scoreText.setText(`Score: ${score}`);
        this.comboText.setText(`Combo: ${combo}  (x${mult.toFixed(1)})`);

        // visuals
        const neon = Phaser.Utils.Array.GetRandom(NEON);
        this.flashLane(dir);
        this.feedbackText(label, neon);

        // fireworks milestones
        if ([10, 25, 50, 75, 100].includes(combo)) {
          this.fireworksBurst();
        }
      }

      onMiss() {
        if (combo > 0) {
          combo = 0;
          this.comboText.setText("Combo: 0");
          this.feedbackText("MISS", 0xff3b3b);
        }
      }

      update(_: number, delta: number) {
        const dt = delta / 1000;
        this.elapsed += dt;

        const section = this.currentSection();
        // adjust spawn pacing dynamically
        if (this.spawnEvent && this.spawnEvent.delay !== section.spawnDelay) {
          this.spawnEvent.delay = section.spawnDelay;
        }

        // move notes by section speed
        const speed = section.speed;

        for (const n of this.notes) {
          n.y += speed * dt;
          n.g.y = n.y;
        }

        // miss detection + cleanup
        const remaining: Note[] = [];
        for (const n of this.notes) {
          if (n.y > H + 40) {
            n.g.destroy();
            continue;
          }
          if (n.y > MISS_LINE) {
            // note passed hit window => miss
            n.g.destroy();
            this.onMiss();
            continue;
          }
          remaining.push(n);
        }
        this.notes = remaining;

        // input checks
        this.handleKeyPress("Up");
        this.handleKeyPress("Down");
        this.handleKeyPress("Left");
        this.handleKeyPress("Right");
      }

      handleKeyPress(dir: Dir) {
        const key = this.cursors[dir.toLowerCase()];
        if (!key) return;

        if (!Phaser.Input.Keyboard.JustDown(key)) return;

        const candidates = this.notes
          .filter((n) => n.dir === dir && Math.abs(n.y - hitZoneY) < HIT_WINDOW)
          .sort((a, b) => Math.abs(a.y - hitZoneY) - Math.abs(b.y - hitZoneY));

        if (candidates.length === 0) return;

        const hit = candidates[0];
        const diff = Math.abs(hit.y - hitZoneY);

this.onHit(dir, diff);

// FLASH THE NOTE COLOR BEFORE DESTROYING
const hitColor = Phaser.Utils.Array.GetRandom(HIT_COLORS);

// redraw as a colored dot pop (fast + reliable)
hit.g.clear();
hit.g.fillStyle(hitColor, 1);
hit.g.fillCircle(0, 0, 14);

// destroy a split-moment later so you actually see it
this.time.delayedCall(60, () => {
  hit.g.destroy();
});

// remove from list immediately so it can't be hit twice
this.notes = this.notes.filter((n) => n !== hit);
      }

      endRun() {
        this.spawnEvent?.remove(false);
        this.countdownEvent?.remove(false);

        this.notes.forEach((n) => n.g.destroy());
        this.notes = [];

        const hitRate = notesSpawned > 0 ? notesHit / notesSpawned : 0;

        // bridge to React
        (window as any).__ETH_DDR_RESULT__ = {
          runId,
          score,
          comboMax,
          notesSpawned,
          notesHit,
          hitRate,
        };

        // overlay end text (inside canvas)
        this.add.rectangle(W / 2, H / 2, 360, 220, 0x000000, 0.85);
        this.add.text(W / 2, 260, "RUN COMPLETE", {
          fontSize: "20px",
          color: "#ffffff",
        }).setOrigin(0.5);
        this.add.text(W / 2, 300, `Score: ${score}`, {
          fontSize: "18px",
          color: "#ffffff",
        }).setOrigin(0.5);
        this.add.text(W / 2, 330, `Max Combo: ${comboMax}`, {
          fontSize: "14px",
          color: "#bbbbbb",
        }).setOrigin(0.5);
      }
    }

    const phaserConfig: any = {
      type: Phaser.AUTO,
      width: W,
      height: H,
      parent: containerRef.current,
      scene: [MainScene],
      backgroundColor: "#0b0b12",
    };

    gameRef.current = new Phaser.Game(phaserConfig);

    // poll result
    const interval = window.setInterval(() => {
      const payload = (window as any).__ETH_DDR_RESULT__;
      if (!payload) return;

      if (payload.runId !== runIdRef.current) {
        // stale
        delete (window as any).__ETH_DDR_RESULT__;
        return;
      }

      delete (window as any).__ETH_DDR_RESULT__;

      // stop audio & show results
      stopAudio();
      cleanupGame();

      const r: RunResult = {
        score: payload.score,
        comboMax: payload.comboMax,
        notesSpawned: payload.notesSpawned,
        notesHit: payload.notesHit,
        hitRate: payload.hitRate,
        xHandle: normalizeXHandle(xHandle),
        wallet: wallet.trim(),
      };

      setResult(r);
      setPhase("results");
    }, 200);

    (gameRef.current as any).__interval__ = interval;
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAudio();
      cleanupGame();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const canUnlockMint = !!result && result.hitRate >= MIN_HIT_RATE_TO_UNLOCK;

  return (
    <main className="relative z-10 min-h-screen bg-black/0 text-white flex flex-col items-center justify-start pt-6 px-4">

      {/* Background video layer */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">

        <video
          className="absolute inset-0 w-full h-full object-cover"
          src="/games/eth-ddr/vitalik.mp4"
          autoPlay
          loop
          muted
          playsInline
        />
        {/* dark overlay to preserve readability */}
        <div className="absolute inset-0 bg-black/75" />
      </div>

      {/* Audio (starts on Start click) */}
      <audio ref={audioRef} src="/games/eth-ddr/song.mp3" loop preload="auto" />

      <div className="w-full max-w-2xl">
        <h1 className="text-3xl font-semibold">Ethereum DDR</h1>
<p className="text-white/70 mt-1">
  Hit the arrow keys when notes reach the line. 60s run gogogogo.
</p>
        <p className="text-white/70 mt-2">
           🧧 Happy Lunar New Years!! 🧧
        </p>

        <div className="mt-6 rounded-2xl overflow-hidden border border-white/10 bg-white/5 relative">
          {/* Phaser mount */}
          <div className="p-3">
            <div ref={containerRef} className="w-[400px] h-[600px] mx-auto" />
          </div>

          {/* Setup overlay */}
          {phase === "setup" && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/70 p-4">
              <div className="w-full max-w-md rounded-2xl border border-white/10 bg-black/60 p-5">
                <div className="text-lg font-semibold">Enter to play</div>
                <div className="text-white/60 text-sm mt-1">
                  Required for leaderboard + rewards.
                </div>

                <div className="mt-4 space-y-3">
                  <div>
                    <label className="block text-sm text-white/70 mb-1">X handle</label>
                    <input
                      className="w-full rounded-xl bg-white/10 border border-white/10 px-3 py-2 outline-none"
                      placeholder="e.g. daniellong (no @ needed)"
                      value={xHandle}
                      onChange={(e) => setXHandle(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-white/70 mb-1">Wallet address</label>
                    <input
                      className="w-full rounded-xl bg-white/10 border border-white/10 px-3 py-2 outline-none"
                      placeholder="0x..."
                      value={wallet}
                      onChange={(e) => setWallet(e.target.value)}
                    />
                  </div>

                  {error && <div className="text-sm text-red-300">{error}</div>}

                  <button
                    className="w-full rounded-xl bg-white text-black font-semibold py-2 hover:opacity-90"
                    onClick={startRun}
                  >
                    Start Game
                  </button>

                  <div className="text-xs text-white/50">
                    Sound starts after clicking Start (browser rule).
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Results overlay */}
          {phase === "results" && result && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/70 p-4">
              <div className="w-full max-w-md rounded-2xl border border-white/10 bg-black/60 p-5">
                <div className="text-lg font-semibold">Run complete</div>

                <div className="mt-3 space-y-1 text-white/80">
                  <div>Score: <span className="text-white font-semibold">{result.score}</span></div>
                  <div>Max combo: <span className="text-white font-semibold">{result.comboMax}</span></div>
                  <div>
                    Hit rate:{" "}
                    <span className="text-white font-semibold">
                      {(result.hitRate * 100).toFixed(1)}%
                    </span>{" "}
                    <span className="text-white/50 text-xs">
                      ({result.notesHit}/{result.notesSpawned})
                    </span>
                  </div>
                </div>

                <div className="mt-4 flex gap-2">
                  <button
                    className="flex-1 rounded-xl bg-white text-black font-semibold py-2 hover:opacity-90"
                    onClick={openTweet}
                  >
                    Share on X
                  </button>
                  <button
                    className="flex-1 rounded-xl bg-white/10 border border-white/10 text-white font-semibold py-2 hover:bg-white/15"
                    onClick={() => {
                      // run again with same profile
                      setPhase("setup");
                      setResult(null);
                      setShared(false);
                      setError(null);
                    }}
                  >
                    Play again
                  </button>
                </div>

                <div className="mt-3 text-xs text-white/50">
                  After sharing, you’ll unlock the mint link if your hit rate is at least{" "}
                  {(MIN_HIT_RATE_TO_UNLOCK * 100).toFixed(0)}%.
                </div>

                {/* Mint placeholder (revealed after share + gate) */}
                {shared && canUnlockMint && (
                  <div className="mt-4 rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-3">
                    <div className="text-sm font-semibold text-emerald-200">Mint unlocked</div>
                    <div className="text-xs text-emerald-200/80 mt-1">
                      (Placeholder for now — you’ll swap the link later)
                    </div>
                    <a
                      href="#"
                      className="inline-block mt-2 underline text-emerald-200 hover:text-emerald-100"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Mint on OpenSea
                    </a>
                  </div>
                )}

                {shared && !canUnlockMint && (
                  <div className="mt-4 text-sm text-white/70">
                    Not quite enough hit rate to unlock mint this run — try again 🔥
                  </div>
                )}

                <button
                  className="mt-4 w-full text-xs underline text-white/60 hover:text-white"
                  onClick={restartToSetup}
                >
                  Edit X handle / wallet
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer / links area (paste your existing ProofOfReal footer here) */}
        <div className="mt-6 text-sm text-white/60">
          {/* Replace this block with your copied footer links */}
          <div className="flex flex-wrap gap-4">
            <a className="hover:text-white" href="https://x.com/proofofreal" target="_blank" rel="noreferrer">X</a>
            <a className="hover:text-white" href="#" target="_blank" rel="noreferrer">HOPE</a>
            <a className="hover:text-white" href="#" target="_blank" rel="noreferrer">FAKE</a>
            <a className="hover:text-white" href="#" target="_blank" rel="noreferrer">Discord</a>
          </div>
          <div className="mt-3 text-xs text-white/40">
            © {new Date().getFullYear()} Proof of Real • Socials Rising
          </div>
        </div>
      </div>
    </main>
  );
}
