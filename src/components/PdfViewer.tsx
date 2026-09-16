"use client";

import { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";

const Document = dynamic(() => import("react-pdf").then((m) => m.Document), { ssr: false });
const Page = dynamic(() => import("react-pdf").then((m) => m.Page), { ssr: false });

interface PdfViewerProps {
  url: string;
  heightClass?: string;
}

export function PdfViewer({ url, heightClass = "h-[560px]" }: PdfViewerProps) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [ready, setReady] = useState(false);
  const [scale, setScale] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [wrapW, setWrapW] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? 0;
      if (w > 0) setWrapW(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    let cancelled = false;
    import("react-pdf").then((m) => {
      if (cancelled) return;
      m.pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setNumPages(null);
    setPage(1);
    setError(null);
  }, [url]);

  if (!ready)
    return <div className="p-4 text-xs text-text-dim border border-border bg-surface rounded-[8px] animate-pulse">Loading PDF viewer…</div>;

  return (
    <div className={`flex flex-col ${heightClass} bg-surface border border-border rounded-[8px] overflow-hidden`}>
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-surface-2 shrink-0 gap-2">
        <span className="text-xs text-text-dim truncate">
          {error ? <span className="text-red-400">{error}</span> : numPages ? `Page ${page} of ${numPages}` : "Loading PDF…"}
        </span>
        <div className="flex items-center gap-1.5 shrink-0">
          <div className="flex items-center gap-1 border border-border rounded-[6px] overflow-hidden bg-surface">
            <button type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} className="px-2 py-1 text-xs text-text hover:bg-surface-2" aria-label="Previous page">
              ‹
            </button>
            <button type="button" onClick={() => setPage((p) => Math.min(numPages ?? 1, p + 1))} className="px-2 py-1 text-xs text-text hover:bg-surface-2" aria-label="Next page">
              ›
            </button>
          </div>
          <div className="flex items-center gap-1 border border-border rounded-[6px] overflow-hidden bg-surface">
            <button type="button" onClick={() => setScale((s) => Math.max(0.6, s - 0.15))} className="px-2 py-1 text-xs text-text hover:bg-surface-2" aria-label="Zoom out">
              −
            </button>
            <span className="text-[10px] font-mono text-text-faint px-1 min-w-[38px] text-center">{Math.round(scale * 100)}%</span>
            <button type="button" onClick={() => setScale((s) => Math.min(2.5, s + 0.15))} className="px-2 py-1 text-xs text-text hover:bg-surface-2" aria-label="Zoom in">
              +
            </button>
          </div>
          <a href={url} target="_blank" rel="noopener noreferrer" className="text-[10px] font-mono text-text-faint hover:text-text-dim px-1" title="Open PDF in new tab">
            ↗
          </a>
        </div>
      </div>
      <div ref={wrapRef} className="flex-1 min-w-0 overflow-auto bg-surface-2/40 p-2">
        <Document
          file={url}
          onLoadSuccess={({ numPages: n }: { numPages: number }) => {
            setNumPages(n);
            setError(null);
          }}
          onLoadError={(e: Error) => setError(e.message || "Failed to load PDF")}
          loading={<div className="p-6 text-xs text-text-faint text-center">Loading PDF…</div>}
          error={<div className="p-6 text-xs text-red-400 text-center">Failed to load PDF.</div>}
          className="flex flex-col items-center gap-2"
        >
          <Page
            pageNumber={page}
            width={wrapW > 0 ? Math.max(240, Math.min(wrapW - 18, 612)) * scale : undefined}
            renderTextLayer={false}
            renderAnnotationLayer={false}
            className="bg-white shadow-md"
          />
        </Document>
      </div>
    </div>
  );
}
