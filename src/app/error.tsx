"use client";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 px-6 text-center">
      <h1 className="font-display text-2xl text-text">Something went wrong</h1>
      <p className="text-xs text-text-faint max-w-md truncate">{error.message}</p>
      <button
        type="button"
        onClick={reset}
        className="mt-2 px-3 py-1.5 rounded-[5px] text-xs border border-border text-text-dim hover:text-text hover:bg-surface-2 transition-colors"
      >
        Try again
      </button>
    </div>
  );
}
