# Technical requirements & limitations

*Role: Requirements analyst — report for orchestration and implementation.*

## 1. Problem: “BIG files” and browser tab kills

### Symptoms

- `ArrayBuffer` holding a full movie or ProRes clip duplicates memory (decode buffers, WASM heaps).
- Main-thread work blocks UI; users think the app froze.
- **OOM** or **Chrome kills tab** when RSS exceeds practical limits (often ~2–4GB per tab on desktop; lower on mobile).

### Root causes

1. **Loading entire file into RAM** (`file.arrayBuffer()`, repeated copies for FFmpeg WASM).
2. **ffmpeg.wasm** copies frames through MEMFS; large jobs need **SharedArrayBuffer** + COOP/COEP and still hit RAM ceilings.
3. **Parallel** processing of multiple huge files multiplies peak memory.

### Mitigations (required)

| Layer | Strategy |
|-------|------------|
| **Upload** | Stream to **Vercel Blob** (multipart for large files). Never hold full binary in React state. |
| **Metadata-only (light)** | Workers + **chunked** or format-specific parsers; avoid full-file buffer when spec allows. |
| **Transcode / edit** | **Server-side FFmpeg** (Node + `ffmpeg-static` or system `ffmpeg` in container) with **temp disk** / streaming where possible. |
| **Client preview** | Lower resolution proxy; **MediaSource** or `<video>` URL from Blob — not full re-decode in canvas for export. |
| **Concurrency** | **Sequential** queue for large jobs; cap parallel count (e.g. 1–2) when WASM or main thread involved. |
| **UX** | Progress via **SSE** or polling job status; **abort** + cleanup Object URLs. |

### Rule of thumb (from product brief)

- **> ~50MB** or **> ~2s** CPU on weak devices → **default to server job** with Blob input/output URLs.
- **Small images/PDFs** → can stay client (existing patterns: `pdf-lib`, `exifr`, etc.).

---

## 2. Web Workers: when they help

- **Help:** CPU-bound metadata parse, image strip without blocking UI, off-thread ZIP/PDF steps if implemented carefully.
- **Do not magically fix RAM:** Workers still allocate; **moving** work off main thread avoids **jank**, not necessarily **peak RSS** if you still load 4GB into one worker.
- **ffmpeg.wasm:** Typically runs in worker; still **heavy** — treat as optional path for **small/medium** files only unless you invest in streaming/chunked WASM pipelines.

---

## 3. Vercel / deployment constraints

- **Serverless functions:** **Memory** and **max duration** caps apply. Long FFmpeg jobs may need **splitting**, **queues**, or **background workers** (e.g. Vercel Queue consumer, or external worker) — validate against current plan limits.
- **Request body size:** Large uploads should **not** go through JSON bodies; use **Blob client upload** or **multipart** to Blob.
- **COOP/COEP:** Required for `SharedArrayBuffer` (ffmpeg.wasm). `remove-metadata/next.config.ts` already sets headers; keep consistent in any Next app.

---

## 4. Feature checklist — feasibility

| Area | Client-only | Server recommended |
|------|-------------|---------------------|
| Strip image EXIF | Yes (with size guard) | Optional |
| Strip PDF metadata | Yes (`pdf-lib`) | For huge PDFs |
| Video re-encode, cuts, speed, bitrate | Limited / risky | **Yes (FFmpeg)** |
| Audio pitch/tempo/noise/mux | Tone.js preview possible | **FFmpeg** for export |
| Subtitles burn-in | Canvas preview | **FFmpeg** for final |
| Watermark / stickers | Konva overlay + export frame sequence | **FFmpeg** overlay or image sequence → video |
| Whisper captions | Needs API + audio extract | API route + storage |

---

## 5. State & routing (nuqs)

- Use **nuqs** for: active **tool** (crop / color / audio / encode), **clip index**, **zoom level**, **panel open**, **job id** linking to Blob URLs.
- Keep **job truth** (status, URLs) in **server DB** + API; URL holds **UI/editor state** only, not large blobs.

---

## 6. Auth & storage parity with `remove-metadata`

- **JWT cookie** + **CSRF** on mutations; `proxy.ts` for route protection.
- **Jobs table** with `inputBlobKey` / `outputBlobKey`, `processingMode` `client` | `server`.
- **Permissions** for `BLOB_UPLOAD`, `JOBS_ENQUEUE_SERVER` as in existing app.

This **requires** the Next.js + Drizzle stack; a Vite SPA cannot host those patterns without a separate API (which duplicates work).

---

## 7. Open risks (track in `progress.MD`)

- Very long FFmpeg on serverless **timeout** — may need queue + retry or external worker.
- **Cost** of Blob storage and egress for large user files.
- **Legal/ToS** for background music / stickers assets if bundled.
