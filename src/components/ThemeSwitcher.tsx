"use client";

import { useState } from "react";
import { useTheme, ACCENT_COLORS, THEMES } from "@/lib/theme-context";

export default function ThemeSwitcher() {
  const { accent, setAccent, theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"accent" | "theme">("accent");

  const tabClass = (on: boolean) =>
    "flex-1 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider transition-colors " +
    (on ? "text-text border-b-2 border-accent" : "text-text-faint hover:text-text-dim");

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-5 h-5 rounded-full border border-border hover:border-text-dim transition-colors cursor-pointer"
        style={{ backgroundColor: ACCENT_COLORS.find((c) => c.name === accent)?.value }}
        aria-label="Change theme"
        title="Theme settings"
      />
      {open && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-surface-2 border border-border rounded-[8px] shadow-palette z-50 overflow-hidden" style={{ width: "200px" }}>
          <div className="flex border-b border-border">
            <button onClick={() => setTab("accent")} className={tabClass(tab === "accent")}>Accent</button>
            <button onClick={() => setTab("theme")} className={tabClass(tab === "theme")}>Theme</button>
          </div>
          {tab === "accent" ? (
            <div className="p-3 flex flex-wrap gap-2">
              {ACCENT_COLORS.map((c) => (
                <button
                  key={c.name}
                  type="button"
                  onClick={() => setAccent(c.name)}
                  className={"w-6 h-6 rounded-full border-2 transition-all cursor-pointer " + (accent === c.name ? "border-text scale-110" : "border-transparent hover:scale-110")}
                  style={{ backgroundColor: c.value }}
                  title={c.name}
                />
              ))}
            </div>
          ) : (
            <div className="p-2 space-y-1 max-h-[200px] overflow-auto">
              {THEMES.map((t) => (
                <button
                  key={t.name}
                  type="button"
                  onClick={() => setTheme(t.name)}
                  className={"w-full flex items-center gap-2 px-2 py-1.5 rounded text-left transition-colors " + (theme === t.name ? "bg-accent-dim text-text" : "text-text-dim hover:bg-surface hover:text-text")}
                >
                  <div className="flex gap-0.5">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: t.bg }} />
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: t.surface }} />
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: t.surface2 }} />
                  </div>
                  <span className="text-[10px] font-medium">{t.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
