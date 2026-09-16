"use client";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 px-6 text-center">
      <h1 className="text-lg font-bold text-text">Something went wrong</h1>
      <p className="text-xs text-text-faint font-mono max-w-md truncate">{error.message}</p>
      <button type="button" onClick={reset} className="mt-2 px-4 py-2 bg-surface border border-border text-text rounded-[6px] text-xs font-medium hover:border-text-dim transition-colors">
        Try again
      </button>
    </div>
  );
}
