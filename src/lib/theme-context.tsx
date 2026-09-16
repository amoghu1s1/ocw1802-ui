"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";

export const ACCENT_COLORS = [
  { name: "Red", value: "#C41E24" },
  { name: "Blue", value: "#2563EB" },
  { name: "Green", value: "#16A34A" },
  { name: "Purple", value: "#9333EA" },
  { name: "Orange", value: "#EA580C" },
  { name: "Teal", value: "#0D9488" },
  { name: "Pink", value: "#DB2777" },
  { name: "Amber", value: "#D97706" },
] as const;

export const THEMES = [
  { name: "Default Dark", bg: "#0a0a0a", surface: "#141414", surface2: "#1c1c1c", border: "#262626", text: "#e5e5e5", textDim: "#a3a3a3", textFaint: "#525252" },
  { name: "Dracula", bg: "#282a36", surface: "#21222c", surface2: "#2d2f3d", border: "#44475a", text: "#f8f8f2", textDim: "#bfbfbf", textFaint: "#6272a4" },
  { name: "Atomic Dark", bg: "#1b1d1e", surface: "#232526", surface2: "#2c2d2e", border: "#3c3d3e", text: "#c5c8c6", textDim: "#9da0a0", textFaint: "#505354" },
  { name: "Nord", bg: "#2e3440", surface: "#2e3440", surface2: "#3b4252", border: "#434c5e", text: "#eceff4", textDim: "#d8dee9", textFaint: "#4c566a" },
  { name: "Tokyo Night", bg: "#1a1b26", surface: "#1f2335", surface2: "#24283b", border: "#292e42", text: "#c0caf5", textDim: "#9aa5ce", textFaint: "#565f89" },
] as const;

export type AccentColor = (typeof ACCENT_COLORS)[number]["name"];
export type ThemeName = (typeof THEMES)[number]["name"];

interface ThemeContextValue {
  accent: AccentColor;
  setAccent: (color: AccentColor) => void;
  theme: ThemeName;
  setTheme: (name: ThemeName) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  accent: "Red",
  setAccent: () => {},
  theme: "Default Dark",
  setTheme: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

const ACCENT_KEY = "ocw1802.theme.accent";
const THEME_KEY = "ocw1802.theme.bg";

function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return r + " " + g + " " + b;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [accent, setAccentState] = useState<AccentColor>("Red");
  const [theme, setThemeState] = useState<ThemeName>("Default Dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    try {
      const storedAccent = localStorage.getItem(ACCENT_KEY) as AccentColor | null;
      const storedTheme = localStorage.getItem(THEME_KEY) as ThemeName | null;
      if (storedAccent && ACCENT_COLORS.some((c) => c.name === storedAccent)) setAccentState(storedAccent);
      if (storedTheme && THEMES.some((t) => t.name === storedTheme)) setThemeState(storedTheme);
    } catch {}
    setMounted(true);
  }, []);

  const setAccent = useCallback((color: AccentColor) => {
    setAccentState(color);
    try {
      localStorage.setItem(ACCENT_KEY, color);
    } catch {}
  }, []);

  const setTheme = useCallback((name: ThemeName) => {
    setThemeState(name);
    try {
      localStorage.setItem(THEME_KEY, name);
    } catch {}
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const colorDef = ACCENT_COLORS.find((c) => c.name === accent) || ACCENT_COLORS[0];
    const themeDef = THEMES.find((t) => t.name === theme) || THEMES[0];
    const root = document.documentElement;
    root.style.setProperty("--color-accent", colorDef.value);
    root.style.setProperty("--color-accent-dim", colorDef.value + "26");
    root.style.setProperty("--accent-rgb", hexToRgb(colorDef.value));
    root.style.setProperty("--color-bg", themeDef.bg);
    root.style.setProperty("--color-surface", themeDef.surface);
    root.style.setProperty("--color-surface-2", themeDef.surface2);
    root.style.setProperty("--color-border", themeDef.border);
    root.style.setProperty("--color-text", themeDef.text);
    root.style.setProperty("--color-text-dim", themeDef.textDim);
    root.style.setProperty("--color-text-faint", themeDef.textFaint);
  }, [accent, theme, mounted]);

  return <ThemeContext.Provider value={{ accent, setAccent, theme, setTheme }}>{children}</ThemeContext.Provider>;
}
