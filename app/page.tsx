"use client";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-white px-6 text-center">
      
      {/* Title */}
      <h1 className="text-5xl sm:text-6xl font-bold tracking-tight mb-4">
        PROOF OF REAL
      </h1>

      {/* Slogan */}
      <p className="text-lg sm:text-xl text-slate-300 max-w-lg leading-relaxed mb-10">
        Where the <span className="text-emerald-400 font-semibold">best converters</span> 
        become the <span className="text-sky-400 font-semibold">highest earners</span>.
      </p>

      {/* Waitlist Form */}
      <form
        action="https://formspree.io/f/mykgradg"   // your form integrated
        method="POST"
        className="flex flex-col sm:flex-row items-center w-full max-w-md gap-3"
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
          className="px-6 py-2.5 rounded-xl bg-emerald-500 font-semibold text-slate-950
                     hover:bg-emerald-400 transition shadow-lg"
        >
          Join Waitlist
        </button>
      </form>

      <p className="text-xs text-slate-500 mt-3">
        Priority access for early supporters & Real Ones.
      </p>

      {/* Footer */}
      <footer className="mt-16 text-xs text-slate-500">
        © {new Date().getFullYear()} Proof of Real · Socials Rising
      </footer>
    </main>
  );
}
