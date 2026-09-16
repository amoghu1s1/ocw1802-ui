"use client";

import Link from "next/link";
import { overallProgress } from "@/lib/course";
import { useProgress } from "@/lib/progress";
import { useSidebar } from "@/lib/sidebar-context";
import ProgressBar from "./ProgressBar";
import UnitTree from "./UnitTree";
import ThemeSwitcher from "./ThemeSwitcher";
import DataMenu from "./DataMenu";

export default function Sidebar({ isMobile = false, onClose }: { isMobile?: boolean; onClose?: () => void }) {
  const progress = useProgress();
  const { completed, total, pct } = overallProgress(progress);
  const { collapsed, toggle } = useSidebar();
  const eff = isMobile ? false : collapsed;

  return (
    <aside
      className={`h-screen bg-surface flex flex-col select-none ${
        isMobile ? "w-72 border-r border-border" : `fixed left-0 top-0 z-30 transition-all duration-300 ease-in-out ${eff ? "w-16" : "w-72 border-r border-border"}`
      }`}
      aria-label="Course navigation"
    >
      {!isMobile && (
        <button
          type="button"
          onClick={toggle}
          className="absolute top-5 -right-3 z-40 w-6 h-6 bg-surface-2 border border-border rounded-full hidden md:flex items-center justify-center text-text-faint hover:text-text hover:bg-surface transition-colors cursor-pointer"
          aria-label={eff ? "Expand sidebar" : "Collapse sidebar"}
          aria-expanded={!eff}
        >
          <span className={`font-display text-sm leading-none transition-transform duration-300 ${eff ? "rotate-180" : ""}`} aria-hidden>
            ‹
          </span>
        </button>
      )}

      {/* Wordmark */}
      <div className={`border-b border-border/70 ${eff ? "px-3 py-4" : "px-5 py-5"}`}>
        <Link href="/" className="group block" onClick={onClose}>
          <span className={`font-display block text-text group-hover:text-white transition-colors leading-none ${eff ? "text-lg" : "text-2xl"}`}>
            {eff ? "18" : "18.02SC"}
          </span>
          {!eff && <p className="text-xs text-text-dim mt-1.5">Multivariable Calculus</p>}
        </Link>
        {isMobile && (
          <button type="button" onClick={onClose} className="absolute top-4 right-3 p-1.5 text-text-faint hover:text-text" aria-label="Close navigation">
            <span className="font-display text-lg leading-none" aria-hidden>×</span>
          </button>
        )}
      </div>

      {/* Progress */}
      {!eff ? (
        <div className="px-5 py-4 border-b border-border/70">
          <p className="text-xs text-text-dim">
            <span className="font-mono text-text">{completed}</span>
            <span className="text-text-faint"> of </span>
            <span className="font-mono text-text">{total}</span>
            <span className="text-text-faint"> complete</span>
          </p>
          <ProgressBar value={pct} className="mt-2" />
        </div>
      ) : (
        <div className="px-3 py-3 border-b border-border/70 flex justify-center">
          <div className="relative w-9 h-9" title={`${pct}% complete`} aria-label={`${pct}% complete`}>
            <svg className="w-9 h-9 -rotate-90" viewBox="0 0 36 36" aria-hidden>
              <circle cx="18" cy="18" r="14" fill="none" className="stroke-border" strokeWidth="2.5" />
              <circle cx="18" cy="18" r="14" fill="none" className="stroke-accent" strokeWidth="2.5" strokeDasharray={`${(pct / 100) * 88} ${88 - (pct / 100) * 88}`} strokeLinecap="round" />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center font-mono text-[8px] text-text-dim">{pct}</span>
          </div>
        </div>
      )}

      {/* Course tree */}
      <div className={`flex-1 overflow-y-auto ${eff ? "px-2 py-3" : "px-3 py-4"}`}>
        <UnitTree collapsed={eff} onSelect={onClose} />
      </div>

      {/* Footer */}
      <div className={`border-t border-border/70 ${eff ? "px-3 py-3 flex flex-col items-center gap-3" : "px-5 py-4 space-y-3"}`}>
        <div className={`flex items-center ${eff ? "flex-col gap-3" : "justify-between"}`}>
          <ThemeSwitcher />
          <DataMenu />
        </div>
        {!eff && (
          <p className="text-[10px] leading-relaxed text-text-faint">
            Prof. Denis Auroux, Fall 2010. Unofficial interface; content{" "}
            <a href="https://ocw.mit.edu/courses/18-02sc-multivariable-calculus-fall-2010/" target="_blank" rel="noopener noreferrer" className="underline decoration-border underline-offset-2 hover:text-text-dim">
              MIT OCW
            </a>{" "}
            (CC BY-NC-SA).
          </p>
        )}
      </div>
    </aside>
  );
}
