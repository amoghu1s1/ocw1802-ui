/**
 * Shared helpers for OCW scraping scripts.
 * - Polite fetch with HTML cache in .cache/html
 * - Small concurrency pool
 * - Course constants
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

export const BASE = "https://ocw.mit.edu";
export const COURSE_PATH = "/courses/18-02sc-multivariable-calculus-fall-2010";
export const PROJECT_ROOT = path.resolve(import.meta.dirname, "..");
export const CACHE_DIR = path.join(PROJECT_ROOT, ".cache");
export const HTML_CACHE_DIR = path.join(CACHE_DIR, "html");

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36 ocw1802-scraper/0.1";

export function ensureDirs() {
  for (const d of [CACHE_DIR, HTML_CACHE_DIR]) fs.mkdirSync(d, { recursive: true });
}

function hashKey(url: string): string {
  return crypto.createHash("md5").update(url).digest("hex").slice(0, 24);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** GET text for a URL with on-disk HTML cache + retry. */
export async function fetchText(url: string, opts: { retries?: number; polite?: boolean } = {}): Promise<string> {
  const { retries = 2, polite = true } = opts;
  ensureDirs();
  const key = hashKey(url);
  const cached = path.join(HTML_CACHE_DIR, `${key}.txt`);
  if (fs.existsSync(cached)) return fs.readFileSync(cached, "utf8");

  let lastErr: unknown = null;
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": UA }, redirect: "follow" });
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
      const text = await res.text();
      fs.writeFileSync(cached, text);
      if (polite) await sleep(120);
      return text;
    } catch (err) {
      lastErr = err;
      if (i < retries) await sleep(800 * (i + 1));
    }
  }
  throw lastErr;
}

/** Concurrency-limited map. */
export async function pool<T, R>(items: T[], limit: number, fn: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

export function writeJson(file: string, data: unknown) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, "\t"));
}

export function readJson<T>(file: string, fallback: T): T {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8")) as T;
  } catch {
    return fallback;
  }
}

export function log(msg: string) {
  const t = new Date().toLocaleTimeString("en-GB", { hour12: false });
  console.log(`[${t}] ${msg}`);
}
