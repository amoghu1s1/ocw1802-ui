"use client";

import katex from "katex";
import { Fragment, useMemo } from "react";

/** Split text into plain segments and $…$ / $$…$$ math runs. */
function tokenize(text: string): { math: boolean; body: string; display: boolean }[] {
  const out: { math: boolean; body: string; display: boolean }[] = [];
  const re = /\$\$([\s\S]+?)\$\$|\$([^$\n]+?)\$/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push({ math: false, body: text.slice(last, m.index), display: false });
    if (m[1] != null) out.push({ math: true, body: m[1], display: true });
    else out.push({ math: true, body: m[2] ?? "", display: false });
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push({ math: false, body: text.slice(last), display: false });
  return out;
}

/** Renders text with $…$ / $$…$$ math via KaTeX (falls back to plain text on error). */
export function MathText({ text, className = "" }: { text: string; className?: string }) {
  const parts = useMemo(() => tokenize(text), [text]);
  return (
    <span className={className}>
      {parts.map((p, i) =>
        p.math ? (
          <MathSpan key={i} tex={p.body} display={p.display} />
        ) : (
          <Fragment key={i}>{p.body}</Fragment>
        ),
      )}
    </span>
  );
}

function MathSpan({ tex, display }: { tex: string; display: boolean }) {
  const html = useMemo(() => {
    try {
      return katex.renderToString(tex, { displayMode: display, throwOnError: false, strict: false });
    } catch {
      return null;
    }
  }, [tex, display]);
  if (html == null) return <span>{tex}</span>;
  return <span dangerouslySetInnerHTML={{ __html: html }} />;
}
