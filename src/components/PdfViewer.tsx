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
    if (!ready) return;
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? 0;
      if (w > 0) setWrapW(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [ready]);

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

  if (!ready) return <div className={`${heightClass} rounded-[10px] border border-border/70 bg-surface`} />;

  return (
    <div className={`flex flex-col ${heightClass} min-w-0 rounded-[10px] border border-border/70 bg-surface overflow-hidden`}>
      <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-border/60 shrink-0 gap-2">
        <span className="text-xs text-text-dim truncate">
          {error ? (
            <span className="text-red-400/90">{error}</span>
          ) : numPages ? (
            <>
              Page <span className="font-mono">{page}</span> of <span className="font-mono">{numPages}</span>
            </>
          ) : (
            "Loading"
          )}
        </span>
        <div className="flex items-center gap-0.5 shrink-0">
          <button type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} className="w-7 h-7 rounded-[5px] text-sm text-text-dim hover:text-text hover:bg-surface-2 disabled:opacity-30 transition-colors" aria-label="Previous page" disabled={page <= 1}>
            ‹
          </button>
          <button type="button" onClick={() => setPage((p) => Math.min(numPages ?? 1, p + 1))} className="w-7 h-7 rounded-[5px] text-sm text-text-dim hover:text-text hover:bg-surface-2 disabled:opacity-30 transition-colors" aria-label="Next page" disabled={!numPages || page >= numPages}>
            ›
          </button>
          <span className="w-px h-4 bg-border/70 mx-1" aria-hidden />
          <button type="button" onClick={() => setScale((s) => Math.max(0.6, s - 0.15))} className="w-7 h-7 rounded-[5px] text-sm text-text-dim hover:text-text hover:bg-surface-2 transition-colors" aria-label="Zoom out">
            −
          </button>
          <span className="font-mono text-[11px] text-text-faint w-[42px] text-center">{Math.round(scale * 100)}%</span>
          <button type="button" onClick={() => setScale((s) => Math.min(2.5, s + 0.15))} className="w-7 h-7 rounded-[5px] text-sm text-text-dim hover:text-text hover:bg-surface-2 transition-colors" aria-label="Zoom in">
            +
          </button>
          <span className="w-px h-4 bg-border/70 mx-1" aria-hidden />
          <a href={url} target="_blank" rel="noopener noreferrer" className="w-7 h-7 rounded-[5px] flex items-center justify-center text-sm text-text-dim hover:text-text hover:bg-surface-2 transition-colors" title="Open in new tab">
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
          loading={<div className="p-6 text-xs text-text-faint text-center">Loading</div>}
          error={<div className="p-6 text-xs text-red-400/90 text-center">Failed to load PDF.</div>}
          className="flex flex-col items-center gap-2"
        >
          <Page
            pageNumber={page}
            width={wrapW > 0 ? Math.max(240, Math.min(wrapW - 18, 612)) * scale : undefined}
            renderTextLayer={false}
            renderAnnotationLayer={false}
            className="bg-white shadow-[0_1px_2px_rgba(0,0,0,0.5)]"
          />
        </Document>
      </div>
    </div>
  );
}
