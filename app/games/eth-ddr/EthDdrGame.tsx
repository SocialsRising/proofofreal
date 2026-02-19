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
  const MIN_HIT_RATE_TO_UNLOCK = 0.69; // 69%

  // Public URL for tweet (set to production domain later if you want)
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
      await a.play(); // requires user gesture (Start button is the gesture)
    } catch {
      // If it fails, game still works; can add "Tap to enable sound" later.
    }
  }

  function cleanupGame() {
    try {
      const g = gameRef.current;
      if (g && (g as any).__interval__) clearInterval((g as any).__interval__);
      g?.destroy(true);
    } catch {}
    gameRef.current = null;

    // clear tap bridge just in case
    try {
      delete (window as any).__ETH_DDR_SCENE__;
    } catch {}
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

    // Create Phaser game after phase changes (avoid layout race)
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

    const text =
      `I just scored ${result.score} on ETH DDR 🎶\n` +
      `Max combo: ${result.comboMax} 👏 \n\n` +
      `Think you can beat me? 🫵\n` +
      `${shareUrl}\n\n` +
      `A @proofofreal 💯 x @Sacred_Waste 🗑️ experience `;

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

    // Cadence: 10 slow, 25 medium, 20 fast, 5 slow
    const SECTIONS = [
      { t0: 0, t1: 10, spawnDelay: 500, speed: 240 }, // slow
      { t0: 10, t1: 32, spawnDelay: 400, speed: 280 }, // medium
      { t0: 32, t1: 55, spawnDelay: 330, speed: 320 }, // fast
      { t0: 55, t1: 60, spawnDelay: 500, speed: 260 }, // slow
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
        this.cameras.main.setBackgroundColor("rgba(0,0,0,0)");

        // expose to React for mobile taps
        (window as any).__ETH_DDR_SCENE__ = this;

        score = 0;
        timeLeft = 60;
        combo = 0;
        comboMax = 0;
        notesSpawned = 0;
        notesHit = 0;

        this.elapsed = 0;
        this.notes = [];

    

        // Subtle rhythm guide lines
        for (let y = 0; y < H; y += 60) {
          this.add.rectangle(W / 2, y, W, 1, 0xffffff, 0.03);
        }

        

        this.add.text(14, 10, "ETH DDR", { fontSize: "20px", color: "#9b59ff" });

        this.scoreText = this.add.text(14, 30, "Score: 0", {
          fontSize: "16px",
          color: "#ffffff",
        });

        // Combo counter TOP LEFT
        this.comboText = this.add.text(14, 52, "Combo: 0", {
          fontSize: "16px",
          color: "#ffffff",
          fontStyle: "700",
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

        // HEAT BAR (base + glow overlay)
(this as any).heat = 0;
(this as any).heatBarBase = this.add.rectangle(W / 2, hitZoneY, W, 14, 0x00e5ff, 0.85);
(this as any).heatBarGlow = this.add.rectangle(W / 2, hitZoneY, W, 28, 0xff2bd6, 0);
(this as any).heatBarGlow.setBlendMode(Phaser.BlendModes.ADD);



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
        const e = this.elapsed;
        return SECTIONS.find((s) => e >= s.t0 && e < s.t1) ?? SECTIONS[SECTIONS.length - 1];
      }

  // Sacred Waste "logo note": bold triangle outline + fire emoji (directional, transparent)
spawnNote() {
  const dirs: Dir[] = ["Left", "Down", "Up", "Right"];
  const dir = Phaser.Utils.Array.GetRandom(dirs);

  // Triangle outline only (no fill) — bolder + glow
  const tri = this.add.graphics();

  // Main bright outline
  tri.lineStyle(5, 0xff7a1a, 1);

  const size = 22;
  const pts = [
    { x: 0, y: -size }, // base = UP triangle
    { x: -size, y: size },
    { x: size, y: size },
  ];

  tri.strokePoints(pts, true);

  // Soft neon glow stroke (same shape, thicker, lower alpha)
  tri.lineStyle(10, 0xff2bd6, 0.22);
  tri.strokePoints(pts, true);

  // Rotation per direction
  const rot: Record<Dir, number> = {
    Up: 0,
    Right: Math.PI / 2,
    Down: Math.PI,
    Left: -Math.PI / 2,
  };

  // Fire emoji (rotates WITH the arrow) — slightly bigger
  const fire = this.add.text(0, 2, "🔥", { fontSize: "18px" });
  fire.setOrigin(0.5);

  // Group + rotate together
  const container = this.add.container(laneX[dir], -30, [tri, fire]);
  container.rotation = rot[dir];

  const note: Note = {
    dir,
    x: laneX[dir],
    y: -30,
    g: container,
  };

  this.notes.push(note);
  notesSpawned += 1;
}


      flashLane(dir: Dir) {
        const color = Phaser.Utils.Array.GetRandom(NEON);
        const r = this.laneFlash[dir];
        r.fillColor = color;
        r.setAlpha(0.2);
        this.tweens.add({
          targets: r,
          alpha: 0,
          duration: 130,
        });
      }

      feedbackText(label: string, colorHex: number) {
        const t = this.add.text(W / 2, hitZoneY - 50, label, {
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

emojiPop(emoji: string, size = 72, duration = 1300) {
  const t = this.add.text(W / 2, H / 2 - 40, emoji, {
    fontSize: `${size}px`,
  });
  t.setOrigin(0.5);
  t.setAlpha(1);

  // big + readable, stays longer, then floats out
  this.tweens.add({
    targets: t,
    scale: 1.25,
    duration: Math.floor(duration * 0.35),
    yoyo: true,
    ease: "Sine.easeOut",
  });

  this.tweens.add({
    targets: t,
    alpha: 0,
    y: t.y - 55,
    delay: Math.floor(duration * 0.35),
    duration: Math.floor(duration * 0.65),
    ease: "Sine.easeIn",
    onComplete: () => t.destroy(),
  });
}


      fireworksBurst(intensity: number, originX?: number, originY?: number) {
        const bursts = 18 + intensity * 10;
        const ox = originX ?? Phaser.Math.Between(40, W - 40);
        const oy = originY ?? Phaser.Math.Between(70, 260);

        for (let i = 0; i < bursts; i++) {
          const c = Phaser.Utils.Array.GetRandom(NEON);
          const size = Phaser.Math.Between(2, 5 + intensity);
          const dot = this.add.circle(ox, oy, size, c, 1);

          const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
          const dist = Phaser.Math.Between(50, 140 + intensity * 60);

          this.tweens.add({
            targets: dot,
            x: ox + Math.cos(angle) * dist,
            y: oy + Math.sin(angle) * dist,
            alpha: 0,
            duration: Phaser.Math.Between(500, 850),
            onComplete: () => dot.destroy(),
          });
        }
      }

      fireworksBurstCenter(intensity: number) {
        this.fireworksBurst(intensity, W / 2, H / 2 - 40);
      }

      fireworksBurstEverywhere(intensity: number) {
        for (let i = 0; i < 6; i++) {
          this.fireworksBurst(intensity);
        }
      }

      popCombo(comboNow: number) {
        const pop = Math.min(1.0 + comboNow * 0.012, 1.75);
        this.tweens.add({
          targets: this.comboText,
          scaleX: pop,
          scaleY: pop,
          yoyo: true,
          duration: 95,
        });

        // color shifts at milestones
        if (comboNow >= 150) this.comboText.setColor("#ff5a1f");
        else if (comboNow >= 100) this.comboText.setColor("#00e5ff");
        else if (comboNow >= 50) this.comboText.setColor("#7cff00");
        else if (comboNow >= 25) this.comboText.setColor("#ffd400");
        else if (comboNow >= 10) this.comboText.setColor("#ff2bd6");
        else this.comboText.setColor("#ffffff");
      }

      onHit(dir: Dir, diff: number) {
  // --------------------
  // scoring
  // --------------------
  let gained = 30;
  let label = "OK";
  if (diff < PERFECT_WINDOW) {
    gained = 100;
    label = "PERFECT";
  } else if (diff < GOOD_WINDOW) {
    gained = 60;
    label = "GOOD";
  }

  // --------------------
  // combo + multiplier
  // --------------------
  combo += 1;
  comboMax = Math.max(comboMax, combo);

  let mult = 1;
  if (combo >= 50) mult = 2.0;
  else if (combo >= 25) mult = 1.5;
  else if (combo >= 10) mult = 1.2;

  score += Math.round(gained * mult);
  notesHit += 1;

  this.scoreText.setText(`Score: ${score}`);
  this.comboText.setText(`Combo: ${combo}`);
  this.popCombo(combo);

  // --------------------
  // visuals + feedback
  // --------------------
  const neon = Phaser.Utils.Array.GetRandom(NEON);
  this.flashLane(dir);
  this.feedbackText(label, neon);

  // --------------------
  // 🔥 HEAT BAR LOGIC
  // --------------------
  const perfect = diff < PERFECT_WINDOW;
  const good = diff < GOOD_WINDOW;

  let add = perfect ? 0.18 : good ? 0.12 : 0.08;
  add += Math.min(combo / 200, 0.25);

  (this as any).heat = Math.min(1, (this as any).heat + add);

  this.tweens.add({
    targets: (this as any).heatBarGlow,
    alpha: Math.min(0.9, (this as any).heat * 0.8),
    duration: 90,
    yoyo: true,
  });

  // --------------------
  // 🎉 COMBO CELEBRATIONS
  // --------------------
  if (combo === 25) {
    this.emojiPop("🫵", 88, 1400);
    this.fireworksBurstCenter(2);
  }

  if (combo === 50) {
    this.emojiPop("👏", 96, 1400);
    this.fireworksBurstCenter(3);
    this.fireworksBurstCenter(3);
  }

  if (combo === 100) {
    this.emojiPop("💯", 110, 1500);
    this.fireworksBurstEverywhere(4);
  }

  if (combo === 150) {
    this.emojiPop("🔥", 140, 1600);
    this.fireworksBurstEverywhere(5);
  }
}


      onMiss() {
  // --------------------
  // 🗑️ Trash emoji on miss (big + visible)
  // --------------------
  if (combo >= 26) {
    this.emojiPop("🗑️", 120, 1500);
  }

  // --------------------
  // ❄️ HEAT COOLDOWN (D)
  // --------------------
  if ((this as any).heat !== undefined) {
    (this as any).heat = Math.max(0, (this as any).heat * 0.25);
    (this as any).heatBarGlow.setAlpha((this as any).heat * 0.55);
  }

  // --------------------
  // combo reset + feedback
  // --------------------
  if (combo > 0) {
    combo = 0;
    this.comboText.setText("Combo: 0");
    this.comboText.setColor("#ffffff");
    this.feedbackText("MISS", 0xff3b3b);
  }
}


      update(_: number, delta: number) {
  const dt = delta / 1000;
  this.elapsed += dt;

  // --------------------
  // 🔥 HEAT BAR UPDATE (safe + more visible)
  // --------------------
  if ((this as any).heatBarBase && (this as any).heatBarGlow) {
    // decay
    (this as any).heat = Math.max(0, ((this as any).heat ?? 0) - dt * 0.22);
    const heat = (this as any).heat as number;

    // base bar stays bold even at 0 heat
    (this as any).heatBarBase.setAlpha(0.80 + heat * 0.15);

    // glow shows clearly as heat rises
    (this as any).heatBarGlow.setAlpha(heat * 0.85);

    // glow thickness grows with heat
    (this as any).heatBarGlow.scaleY = 0.9 + heat * 1.2;
  }

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
      n.g.destroy();
      this.onMiss();
      continue;
    }
    remaining.push(n);
  }
  this.notes = remaining;

  // keyboard input checks
  this.handleKeyPress("Up");
  this.handleKeyPress("Down");
  this.handleKeyPress("Left");
  this.handleKeyPress("Right");
}


      // Shared hit logic for keyboard + mobile taps
      tryHit(dir: Dir) {
        const candidates = this.notes
          .filter((n) => n.dir === dir && Math.abs(n.y - hitZoneY) < HIT_WINDOW)
          .sort((a, b) => Math.abs(a.y - hitZoneY) - Math.abs(b.y - hitZoneY));

        if (candidates.length === 0) return;

        const hit = candidates[0];
        const diff = Math.abs(hit.y - hitZoneY);

        this.onHit(dir, diff);

        // Pop/flash note then destroy (container-safe)
        this.tweens.add({
          targets: hit.g,
          scaleX: 1.35,
          scaleY: 1.35,
          alpha: 0,
          duration: 120,
          onComplete: () => {
            try {
              hit.g.destroy();
            } catch {}
          },
        });

        // remove from list immediately
        this.notes = this.notes.filter((n) => n !== hit);

        // small haptic on mobile
        if (typeof navigator !== "undefined" && "vibrate" in navigator) {
          (navigator as any).vibrate?.(8);
        }
      }

      tap(dir: Dir) {
        this.tryHit(dir);
      }

      handleKeyPress(dir: Dir) {
        const key = this.cursors[dir.toLowerCase()];
        if (!key) return;
        if (!Phaser.Input.Keyboard.JustDown(key)) return;
        this.tryHit(dir);
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
       
        this.add
          .text(W / 2, 260, "RUN COMPLETE", {
            fontSize: "20px",
            color: "#ffffff",
          })
          .setOrigin(0.5);
        this.add
          .text(W / 2, 300, `Score: ${score}`, {
            fontSize: "18px",
            color: "#ffffff",
          })
          .setOrigin(0.5);
        this.add
          .text(W / 2, 330, `Max Combo: ${comboMax}`, {
            fontSize: "14px",
            color: "#bbbbbb",
          })
          .setOrigin(0.5);
      }
    }

    const phaserConfig: any = {
  type: Phaser.AUTO,
  width: W,
  height: H,
  parent: containerRef.current,
  scene: [MainScene],
  transparent: true,
  render: {
    clearBeforeRender: true,
    // This is key: clear with transparent alpha instead of black
    clearAlpha: 0,
  },
};

    gameRef.current = new Phaser.Game(phaserConfig);

    // poll result
    const interval = window.setInterval(() => {
      const payload = (window as any).__ETH_DDR_RESULT__;
      if (!payload) return;

      if (payload.runId !== runIdRef.current) {
        delete (window as any).__ETH_DDR_RESULT__;
        return;
      }

      delete (window as any).__ETH_DDR_RESULT__;

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
      {/* Background video layer (mobile-optimized) */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        {/* soft blur fill layer */}
        
        {/* main video layer: more visible Vitalik */}
        <video
          className="absolute inset-0 w-full h-full object-cover object-[50%_18%] md:object-center scale-[1.18] md:scale-100 contrast-110 saturate-125"

          src="/games/eth-ddr/vitalik.mp4"
          autoPlay
          loop
          muted
          playsInline
        />
        {/* lighter overlay to pop the video more */}
        <div className="absolute inset-0 bg-black/25" />
      </div>

      {/* Audio (starts on Start click) */}
      <audio ref={audioRef} src="/games/eth-ddr/song.mp3" loop preload="auto" />

      <div className="w-full max-w-2xl pb-28">
        <h1 className="text-3xl font-semibold">Ethereum DDR</h1>
        <p className="text-white/70 mt-1">Hit the arrow keys when notes reach the line. 60s run gogogogo.</p>
       

<div className="mt-6 rounded-2xl overflow-hidden border border-white/10 bg-transparent relative">

          {/* Phaser mount */}
          <div className="p-3">
            <div ref={containerRef} className="w-[400px] h-[600px] mx-auto" />
          </div>

          {/* Mobile tap buttons (only while playing) */}
          {phase === "playing" && (
            <div className="md:hidden absolute inset-x-0 bottom-0 p-3">
              <div className="grid grid-cols-4 gap-2">
                {(["Left", "Down", "Up", "Right"] as const).map((d) => (
                  <button
                    key={d}
                    className="rounded-2xl py-4 font-bold text-2xl bg-white/10 border border-white/15 active:bg-white/20 select-none"
                    style={{ touchAction: "manipulation" }}
                    onTouchStart={(e) => {
                      e.preventDefault();
                      const scene = (window as any).__ETH_DDR_SCENE__;
                      scene?.tap?.(d);
                    }}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      const scene = (window as any).__ETH_DDR_SCENE__;
                      scene?.tap?.(d);
                    }}
                  >
                    {d === "Left" ? "←" : d === "Down" ? "↓" : d === "Up" ? "↑" : "→"}
                  </button>
                ))}
              </div>
              <div className="text-center text-xs text-white/50 mt-2">Tap buttons or use arrow keys</div>
            </div>
          )}

          {/* Setup overlay */}
          {phase === "setup" && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/70 p-4">
              <div className="w-full max-w-md rounded-2xl border border-white/10 bg-black/60 p-5">
                <div className="text-lg font-semibold">Enter to Play ETH DDR</div>
                <div className="text-white/60 text-sm mt-1"></div>

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
                    <label className="block text-sm text-white/70 mb-1">ETH Wallet address</label>
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

                  <div className="text-xs text-white/50"> Mobile or Desktop Friendly. GLHF Noobs.</div>
                </div>
              </div>
            </div>
          )}
          </div>

          {/* Results overlay */}
          {phase === "results" && result && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/70 p-4">
              <div className="w-full max-w-md rounded-2xl border border-white/10 bg-black/60 p-5">
                <div className="text-lg font-semibold">Run complete</div>

                <div className="mt-3 space-y-1 text-white/80">
                  <div>
                    Score: <span className="text-white font-semibold">{result.score}</span>
                  </div>
                  <div>
                    Max combo: <span className="text-white font-semibold">{result.comboMax}</span>
                  </div>
                  <div>
                    Hit rate:{" "}
                    <span className="text-white font-semibold">{(result.hitRate * 100).toFixed(1)}%</span>{" "}
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
                    <div className="text-xs text-emerald-200/80 mt-1">(Placeholder for now — you’ll swap the link later)</div>
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
                  <div className="mt-4 text-sm text-white/70">Not quite enough hit rate to unlock mint this run — try again 🔥</div>
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

        {/* Fixed links bar (always visible) */}
<div className="fixed bottom-0 left-0 right-0 z-30">
  <div className="mx-auto max-w-2xl px-3 pb-3">
    <div className="rounded-2xl border border-white/10 bg-black/50 backdrop-blur px-3 py-2 flex flex-wrap gap-x-4 gap-y-2 items-center justify-between">
      <a className="text-sm text-white/85 hover:text-white" href="https://x.com/Sacred_Waste" target="_blank" rel="noreferrer">
        Twitter
      </a>
      <a className="text-sm text-white/85 hover:text-white" href="https://opensea.io/collection/sw-prophets" target="_blank" rel="noreferrer">
        Prophet NFTs
      </a>
      <a className="text-sm text-white/85 hover:text-white" href="https://www.nftstrategy.fun/strategies/0x31794fbb311adbdd7704ebdc77de9e872e21f90f" target="_blank" rel="noreferrer">
        $444STR
      </a>
      <a className="text-sm text-white/85 hover:text-white" href="https://docs.sacredwaste.io/" target="_blank" rel="noreferrer">
        Docs
      </a>
      <a className="text-sm text-white/85 hover:text-white" href="https://discord.com/invite/sacredwaste" target="_blank" rel="noreferrer">
        Discord
      </a>
    </div>
  </div>
</div>


    </main>
  );
}
