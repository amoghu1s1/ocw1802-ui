import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 px-6 text-center">
      <h1 className="font-display text-2xl text-text">Page not found</h1>
      <p className="text-xs text-text-faint">This course page is not in the index.</p>
      <Link href="/" className="mt-2 px-3 py-1.5 rounded-[5px] text-xs border border-border text-text-dim hover:text-text hover:bg-surface-2 transition-colors">
        Back to the course
      </Link>
    </div>
  );
}
