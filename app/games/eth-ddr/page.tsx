"use client";

import dynamic from "next/dynamic";

const EthDdrGame = dynamic(() => import("./EthDdrGame"), { ssr: false });

export default function Page() {
  return (
    <main className="min-h-screen bg-black text-white flex flex-col items-center justify-start pt-6 px-4">
      <div className="w-full max-w-2xl">
        <h1 className="text-2xl font-semibold">ETH DDR (Week 1)</h1>
        <p className="text-white/70 mt-2">
          Hit the arrow keys when notes reach the line. 60s run. Score is local for now.
        </p>

        <div className="mt-6 rounded-xl overflow-hidden border border-white/10 bg-white/5">
          <EthDdrGame />
        </div>
      </div>
    </main>
  );
}
