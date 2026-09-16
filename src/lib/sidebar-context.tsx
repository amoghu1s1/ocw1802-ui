"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";

interface SidebarContextValue {
  collapsed: boolean;
  openMobile: boolean;
  toggle: () => void;
  setOpenMobile: (v: boolean) => void;
}

const SidebarContext = createContext<SidebarContextValue>({
  collapsed: false,
  openMobile: false,
  toggle: () => {},
  setOpenMobile: () => {},
});

export function useSidebar() {
  return useContext(SidebarContext);
}

const STORAGE_KEY = "ocw1802.sidebar.collapsed";

function getInitialCollapsed(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState<boolean>(() => getInitialCollapsed());
  const [openMobile, setOpenMobile] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, collapsed ? "1" : "0");
    } catch {}
  }, [collapsed]);

  const toggle = useCallback(() => setCollapsed((c) => !c), []);

  useEffect(() => {
    const mql = window.matchMedia("(min-width: 1024px)");
    const handler = () => {
      if (mql.matches) setOpenMobile(false);
    };
    mql.addEventListener?.("change", handler);
    return () => {
      mql.removeEventListener?.("change", handler);
    };
  }, []);

  return (
    <SidebarContext.Provider value={{ collapsed, openMobile, toggle, setOpenMobile }}>
      {children}
    </SidebarContext.Provider>
  );
}
