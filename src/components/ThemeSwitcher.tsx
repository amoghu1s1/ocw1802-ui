"use client";

import { useState } from "react";
import { useTheme, ACCENT_COLORS, THEMES } from "@/lib/theme-context";

export default function ThemeSwitcher() {
  const { accent, setAccent, theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"accent" | "theme">("accent");

  const tabClass = (on: boolean) =>
    "flex-1 px-3 py-2 text-[11px] border-b-2 transition-colors " +
    (on ? "text-text border-border" : "text-text-faint border-transparent hover:text-text-dim");

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-5 h-5 rounded-full border border-border hover:border-text-faint transition-colors cursor-pointer"
        style={{ backgroundColor: ACCENT_COLORS.find((c) => c.name === accent)?.value }}
        aria-label="Change theme"
        title="Theme settings"
      />
      {open && (
        <div className="absolute bottom-full left-0 mb-2 w-[200px] max-w-[80vw] rounded-[8px] border border-border/70 bg-surface shadow-palette overflow-hidden z-50">
          <div className="flex border-b border-border/70">
            <button onClick={() => setTab("accent")} className={tabClass(tab === "accent")}>
              Accent
            </button>
            <button onClick={() => setTab("theme")} className={tabClass(tab === "theme")}>
              Theme
            </button>
          </div>
          {tab === "accent" ? (
            <div className="p-3 flex flex-wrap gap-2">
              {ACCENT_COLORS.map((c) => (
                <button
                  key={c.name}
                  type="button"
                  onClick={() => setAccent(c.name)}
                  className={"w-6 h-6 rounded-full border-2 transition-colors cursor-pointer " + (accent === c.name ? "border-text" : "border-transparent hover:border-text-faint/60")}
                  style={{ backgroundColor: c.value }}
                  title={c.name}
                  aria-label={c.name}
                  aria-pressed={accent === c.name}
                />
              ))}
            </div>
          ) : (
            <div className="p-1.5 space-y-0.5 max-h-[200px] overflow-auto">
              {THEMES.map((t) => (
                <button
                  key={t.name}
                  type="button"
                  onClick={() => setTheme(t.name)}
                  className={"w-full flex items-center gap-2 px-2 py-1.5 rounded-[5px] text-left text-[11px] transition-colors " + (theme === t.name ? "bg-surface-2 text-text" : "text-text-dim hover:bg-surface-2/60 hover:text-text")}
                  aria-pressed={theme === t.name}
                >
                  <span className="flex gap-0.5 shrink-0">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: t.bg }} />
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: t.surface }} />
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: t.surface2 }} />
                  </span>
                  {t.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
