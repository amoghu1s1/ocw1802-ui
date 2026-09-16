# 18.02SC Multivariable Calculus — OCW Dashboard UI

A personal, offline-first dashboard for [MIT OCW 18.02SC Multivariable Calculus](https://ocw.mit.edu/courses/18-02sc-multivariable-calculus-fall-2010/) (Fall 2010, Prof. Denis Auroux). Sibling of the 18.06SC ocwUI project: same dark minimal design, adapted to 18.02SC's Unit → Part → Session structure with multi-clip sessions.

## Features

- **Step-by-step sessions** — each session page is an OCW-style progression (lecture → board notes → reading → recitation → problems → notes) with a completion rail
- **Playlist player** — sessions play their lecture clips in sequence with auto-advance, clip outline, and resume
- **Time-synced transcripts** (from OCW's caption files), click-to-seek, searchable
- **Board notes gallery** with lightbox
- **Documents** — all course PDFs mirrored locally (readings, problems, solutions, exams)
- **Quiz-style practice** — problem PDF side-by-side with an answer area (authored multiple-choice + self-grading)
- **Notes & pins** — per-page markdown notes, optionally pinned to a video timestamp; one-click timestamp bookmarks shown on the player bar
- **Command palette** (⌘K / Ctrl+K) — search sessions, transcript lines, and your notes
- **Progress tracking** — per-segment resume, completion marks, per-unit/part bars (all in localStorage)

## Getting started

```bash
npm install
npm run dev        # http://localhost:3000
```

Data is pre-scraped and committed (`src/data/`, `public/content/`), so no network is needed to use the app.

## Regenerating course data

```bash
npm run scrape:all       # structure → transcripts → assets
npm run validate
```

Scraped HTML is cached in `.cache/` so re-runs are cheap.

## Structure

```
src/app/           dashboard + /s/[slug] course pages
src/components/    player, transcript, PDF viewer, boards, notes, quiz, palette, sidebar
src/lib/           course model, progress, notes, bookmarks, search, quiz loader
src/data/          course.json, transcripts/bundle.json, quiz.json (authored)
public/content/    mirrored PDFs + board images
scripts/           scrapers + validators
```

Unofficial. Content © MIT OCW, CC BY-NC-SA.
