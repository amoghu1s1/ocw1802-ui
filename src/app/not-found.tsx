import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 px-6 text-center">
      <h1 className="text-lg font-bold text-text">Page not found</h1>
      <p className="text-xs text-text-faint">This course page doesn't exist in the index.</p>
      <Link href="/" className="mt-2 px-4 py-2 bg-surface border border-border text-text rounded-[6px] text-xs font-medium hover:border-text-dim transition-colors">
        ← Dashboard
      </Link>
    </div>
  );
}
