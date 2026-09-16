/**
 * Download VTT captions for every video → src/data/transcripts/bundle.json
 * (map: ytId → [{ t, text }]). One transcript per unique ytId; clips slice it client-side.
 */
import path from "node:path";
import fs from "node:fs";
import { fetchText, pool, writeJson, log, PROJECT_ROOT } from "./_lib";
import type { TranscriptLine } from "../src/lib/types";

interface SourceVideo {
  ytId: string;
  start: number;
  end: number;
  vttUrl: string | null;
  isRecitation: boolean;
  title: string;
}
interface SourceEntry {
  slug: string;
  videos: SourceVideo[];
}
interface SourceStaging {
  units: { slug: string; parts: { slug: string; entries: SourceEntry[] }[] }[];
}

const timeRe =
  /(\d{1,2}):(\d{2}):(\d{2})[.,](\d{3})\s*-->\s*(\d{1,2}):(\d{2}):(\d{2})[.,](\d{3})/;

function parseVtt(vtt: string): TranscriptLine[] {
  const out: TranscriptLine[] = [];
  const blocks = vtt.replace(/\r/g, "").split(/\n\n+/);
  for (const block of blocks) {
    const lines = block.split("\n");
    const tLine = lines.find((l) => timeRe.test(l));
    if (!tLine) continue;
    const m = timeRe.exec(tLine);
    if (!m) continue;
    const t = parseInt(m[1], 10) * 3600 + parseInt(m[2], 10) * 60 + parseInt(m[3], 10) + parseInt(m[4], 10) / 1000;
    const text = lines
      .filter((l) => l !== tLine && l.trim() && !/^\d+$/.test(l.trim()) && !l.startsWith("WEBVTT") && !l.startsWith("NOTE") && !l.includes("-->"))
      .join(" ")
      .replace(/<[^>]+>/g, "")
      .replace(/\s+/g, " ")
      .trim();
    if (text) out.push({ t: Math.round(t), text });
  }
  return out;
}

async function main() {
  const staging = JSON.parse(fs.readFileSync(path.join(PROJECT_ROOT, ".cache/course-staging.json"), "utf8")) as { _sources: SourceStaging["units"] };
  const units = staging._sources ?? [];

  // unique videos
  const videos = new Map<string, string | null>();
  for (const u of units)
    for (const p of u.parts)
      for (const e of p.entries) for (const v of e.videos) if (!videos.has(v.ytId)) videos.set(v.ytId, v.vttUrl);
  log(`unique videos: ${videos.size}`);

  const bundle: Record<string, TranscriptLine[]> = {};
  const failed: string[] = [];

  await pool([...videos.entries()], 4, async ([ytId, vttUrl]) => {
    try {
      if (vttUrl) {
        const raw = await fetchText(vttUrl, { polite: false });
        if (raw.includes("WEBVTT") && timeRe.test(raw)) {
          bundle[ytId] = parseVtt(raw);
          return;
        }
      }
      throw new Error("no vtt");
    } catch {
      failed.push(ytId);
    }
  });

  // fallback: youtube-transcript for the ones without VTT
  if (failed.length) {
    log(`falling back to youtube-transcript for ${failed.length} videos…`);
    try {
      const { YoutubeTranscript } = await import("youtube-transcript");
      await pool(failed, 2, async (ytId) => {
        try {
          const tr = await YoutubeTranscript.fetchTranscript(ytId);
          if (tr) {
            bundle[ytId] = tr
              .map((l) => ({ t: Math.round((l as { offset?: number }).offset ?? 0), text: (l as { text?: string }).text?.replace(/\s+/g, " ").trim() ?? "" }))
              .filter((l) => l.text);
          }
        } catch {
          /* leave missing */
        }
      });
    } catch {
      log("youtube-transcript package unavailable; skipping fallback");
    }
  }

  writeJson(path.join(PROJECT_ROOT, "src/data/transcripts/bundle.json"), bundle);
  const totalLines = Object.values(bundle).reduce((a, l) => a + l.length, 0);
  log(`bundle.json: ${Object.keys(bundle).length} transcripts, ${totalLines} lines, ${failed.length} without captions`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
