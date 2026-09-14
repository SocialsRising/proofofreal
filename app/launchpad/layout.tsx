import type { Metadata } from "next";
import { Syne, Manrope, JetBrains_Mono } from "next/font/google";
import "./launchpad.css";
import { Providers } from "./_components/Providers";
import { Nav } from "./_components/Nav";
import { ToastProvider } from "./_components/Toast";
import { RefCapture } from "./_components/RefCapture";
import { Suspense } from "react";
import Link from "next/link";

const syne = Syne({ subsets: ["latin"], weight: ["600", "700", "800"], variable: "--font-syne" });
const manrope = Manrope({ subsets: ["latin"], weight: ["500", "600", "700", "800"], variable: "--font-manrope" });
const jb = JetBrains_Mono({ subsets: ["latin"], weight: ["500", "700"], variable: "--font-jbmono" });

export const metadata: Metadata = {
  title: "Meme Maxxers Launchpad",
  description: "Launch a Base token for your game, IP, or community in minutes. Stakers earn a cut of real trading fees.",
};

export default function LaunchpadLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`mm ${syne.variable} ${manrope.variable} ${jb.variable}`}>
      <Providers>
        <ToastProvider>
          <Suspense fallback={null}><RefCapture /></Suspense>
          <Nav />
          <main className="wrap">{children}</main>
          <footer>
            <div className="wrap">
              <div>Meme Maxxers Launchpad · an experiment on Base · <Link href="/launchpad/updates">Build-in-public log</Link></div>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <span className="proto">Base · Robinhood · Arc soon</span>
                <Link href="/launchpad/profile">My Profile</Link>
              </div>
            </div>
          </footer>
        </ToastProvider>
      </Providers>
    </div>
  );
}
