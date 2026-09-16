"use client";

interface ProgressBarProps {
  /** Percentage 0-100. */
  value: number;
  className?: string;
}

export default function ProgressBar({ value, className = "" }: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, value));
  return (
    <div className={`w-full h-1 bg-surface-2 border border-border rounded-full overflow-hidden ${className}`} role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
      <div className="h-full bg-accent transition-all duration-300 rounded-full" style={{ width: `${pct}%` }} />
    </div>
  );
}
