"use client";

import { useSidebar } from "@/lib/sidebar-context";
import Sidebar from "./Sidebar";

export default function SidebarShell({ children }: { children: React.ReactNode }) {
  const { collapsed, openMobile, setOpenMobile } = useSidebar();

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      {/* Mobile drawer */}
      {openMobile && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpenMobile(false)} aria-hidden />
          <div className="relative z-50 w-72 max-w-[80vw] h-screen">
            <Sidebar isMobile onClose={() => setOpenMobile(false)} />
          </div>
        </div>
      )}

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-30 bg-surface border-b border-border h-14 flex items-center gap-3 px-3">
        <button
          type="button"
          onClick={() => setOpenMobile(true)}
          className="p-2 -ml-1 rounded-[6px] hover:bg-surface-2 border border-transparent hover:border-border transition-colors"
          aria-label="Open navigation"
        >
          <svg className="w-5 h-5 text-text" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <span className="font-mono font-bold text-text tracking-tight">18.02SC</span>
        <span className="text-xs text-text-faint hidden sm:inline">Multivariable Calculus</span>
      </div>

      <main className={`flex-1 min-w-0 min-h-screen transition-all duration-300 ease-in-out pt-14 md:pt-0 ${collapsed ? "md:ml-16" : "md:ml-72"}`}>
        {children}
      </main>
    </div>
  );
}
