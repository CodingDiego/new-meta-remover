# New Meta Remover — Technical Documentation

This document describes the **new-meta-remover** application: architecture, data flow, every major module, and operational limits. It is intended for developers maintaining or extending the codebase.

---

## 1. Product overview

**New meta remover** is a browser-based studio for:

- **Reading** embedded metadata (images, PDFs, video containers where possible).
- **Stripping or replacing** metadata for images and PDFs (client-side).
- **Editing and re-encoding video** with [FFmpeg](https://ffmpeg.org/) compiled to WebAssembly (`ffmpeg.wasm`), producing new MP4 files (H.264 + AAC).

**Privacy model:** There is **no in-repo backend**. Files are processed in the user’s browser. Session files live in memory; only the **currently running** encode job is snapshotted to IndexedDB for crash recovery, then removed. Nothing is uploaded by the app code paths documented here.

The UI mixes **English** (marketing/home) and **Spanish** (studio strings, errors, buttons).

---

## 2. Technology stack

| Layer | Choice |
|--------|--------|
| Runtime | React 19 |
| Bundler | Vite 8 |
| Routing | `react-router` / `react-router-dom` v7 (`createBrowserRouter`) |
| URL state | `nuqs` v2 (`NuqsAdapter` for React Router v7) |
| Styling | Tailwind CSS v4 (`@tailwindcss/vite`), custom theme in `index.css` |
| UI primitives | shadcn-style `Button`, Radix-related deps via `radix-ui`, `class-variance-authority`, `tailwind-merge` |
| Fonts | `@fontsource-variable/lora`, `@fontsource-variable/nunito-sans` |
| Icons | `@hugeicons/react` (where used) |
| Async / cache | `@tanstack/react-query` (`QueryClientProvider` in `main.tsx`; minimal explicit usage in scanned files) |
| Video processing | `@ffmpeg/ffmpeg`, `@ffmpeg/core`, `@ffmpeg/util` (core loaded from unpkg CDN as blob URLs) |
| Image EXIF | `exifr`, `piexifjs` |
| PDF | `pdf-lib` |
| Validation | `zod` (client env in `lib/env.ts`) |
| Compiler | React Compiler via `@rolldown/plugin-babel` + `babel-plugin-react-compiler` |

**Path alias:** `@/` → `src/` (see `vite.config.ts`).

### 2.1 Dependencies present but unused in `src/` (as of this doc)

The following appear in `package.json` but have **no imports under `src/`**: `@neondatabase/serverless`, `drizzle-orm`, `drizzle-kit`, `pg`, `@vercel/blob`, `sharp`, `tone`, `konva`, `react-konva`, `jszip`, `react-player`. They may be placeholders for future server features or leftover installs. The **documented behavior** of the app does not rely on them.

---

## 3. Repository layout

```
new-meta-remover/
├── index.html
├── vite.config.ts
├── vercel.json              # SPA fallback rewrites
├── components.json          # shadcn config
├── DOCUMENTATION.md         # this file
└── src/
    ├── main.tsx             # root render, global providers
    ├── router.tsx           # route table
    ├── App.css              # minimal / legacy
    ├── index.css            # Tailwind + design tokens
    ├── vite-env.d.ts
    ├── layouts/
    │   └── RootLayout.tsx   # nuqs adapter wrapper
    ├── pages/
    │   ├── HomePage.tsx
    │   ├── LoginPage.tsx    # informational “no server auth”
    │   └── StudioPage.tsx   # studio shell + tool tabs + diagnostics
    ├── components/ui/
    │   ├── button.tsx
    │   └── HelpTip.tsx      # FieldLabel, HelpTip
    ├── features/studio/
    │   ├── StudioMediaProvider.tsx
    │   ├── studioMediaContext.ts
    │   ├── useStudioMedia.ts
    │   ├── StudioProcessQueueProvider.tsx
    │   ├── studioProcessQueueContext.ts
    │   ├── useStudioProcessQueue.ts
    │   ├── ProcessingDock.tsx
    │   ├── StudioAssetBar.tsx
    │   ├── StudioVideoShell.tsx
    │   ├── useStudioDownload.ts
    │   ├── useVideoCompareResult.ts
    │   ├── FfmpegProgress.tsx
    │   ├── useFfmpegJobProgress.ts
    │   └── tools/
    │       ├── index.ts
    │       ├── toolRegistry.tsx   # lazy-loaded tool panels
    │       ├── MetadataTool.tsx
    │       ├── VisualTool.tsx
    │       ├── ColorTool.tsx
    │       ├── StructureTool.tsx
    │       ├── AudioTool.tsx
    │       ├── OverlaysTool.tsx
    │       └── EncodeTool.tsx
    └── lib/
        ├── env.ts
        ├── utils.ts
        ├── formatBytes.ts
        ├── search-params.ts       # nuqs parsers, StudioTool union
        ├── studio/
        │   └── studioMediaIdb.ts  # IndexedDB helpers
        ├── filename/
        │   └── buildDownloadFilename.ts
        ├── metadata/
        │   ├── readMetadata.ts
        │   ├── flattenMetadata.ts
        │   └── randomMetadata.ts
        ├── processors/
        │   ├── detectCategory.ts
        │   ├── stripImageMetadata.ts
        │   ├── stripPdfMetadata.ts
        │   ├── stripVideoMetadata.ts
        │   └── piexifjs.d.ts
        └── video/
            ├── ffmpegRun.ts       # singleton FFmpeg, presets, I/O
            └── visualFilters.ts   # -vf chain for Visual tool
```

---

## 4. Application bootstrap (`main.tsx`)

Render tree (outer → inner):

1. `StrictMode`
2. `QueryClientProvider` — shared React Query client
3. `StudioMediaProvider` — session files, active file, preview URL, download naming prefs
4. `StudioProcessQueueProvider` — serial job queue + progress + last output
5. `RouterProvider` — application routes
6. `ProcessingDock` — **sibling** to the router (fixed bottom-right): global queue UI and “download last result”

`getEnv()` runs once at startup and validates `import.meta.env` with Zod (`MODE`, `DEV`, `PROD`).

---

## 5. Routing

Defined in `router.tsx`:

| Path | Component |
|------|-----------|
| `/` | `RootLayout` → `HomePage` (index) |
| `/auth/login` | `LoginPage` |
| `/studio` | `StudioPage` |
| `/studio/:jobId` | `StudioPage` (same component; `jobId` available for future deep links) |

`RootLayout` wraps children with `NuqsAdapter` so `useQueryStates` works under React Router v7.

---

## 6. URL state (nuqs)

`lib/search-params.ts` exports:

- **`StudioTool`**: `'metadata' | 'visual' | 'color' | 'structure' | 'audio' | 'overlays' | 'encode'`
- **`studioParsers`**: object of parsers for `useQueryStates`:
  - `tool` — literal union, default `'metadata'`
  - `job` — optional string (duplicates path param intent)
  - `clip` — optional integer
  - `panel` — optional string
  - `zoom` — float, default `1`

`StudioPage` reads `tool`, `job`, `clip`, `panel`, `zoom` and shows a collapsible **“Estado & URL”** panel for debugging shared query state.

---

## 7. Global state

### 7.1 Studio media (`StudioMediaProvider` / `studioMediaContext.ts`)

**Purpose:** Multi-file session with one **active** file used by tools.

| Field / method | Role |
|----------------|------|
| `items` | `{ id, file }[]` — each `id` is `crypto.randomUUID()` |
| `activeId` | Currently selected item |
| `file` | Active `File` or `null` |
| `previewUrl` | `URL.createObjectURL(file)` for active file; revoked on change |
| `mediaHydrated` | `false` until IndexedDB migration/recovery finishes |
| `addFiles` | Append files; activate last added |
| `removeItem` | Remove by id; reassign active if needed |
| `setActiveId` | Switch active file |
| `setFile` | Replace entire session with one file, or remove active |
| `clearAll` | Empty session |
| `getFileById` | Resolve `File` for queue jobs |
| `nameMode` | `'preserve' \| 'randomize'` — download stem behavior |
| `nameSuffix32` | Append `_` + 32 random alphanumeric chars before tag+ext |

**Hydration:** On mount, the provider:

1. Reads **legacy** key `current-file` once (`idbConsumeLegacyPersistedFile`) and migrates into session if present.
2. Reads **processing** snapshot (`idbGetProcessingFile`); if found (interrupted job), adds as file and deletes the key.

### 7.2 Process queue (`StudioProcessQueueProvider` / `studioProcessQueueContext.ts`)

**Purpose:** Serialize heavy work (FFmpeg, metadata jobs wrapped as async work) so only one `run()` executes at a time, with shared progress UI.

**`enqueue({ label, fileId, run })`:**

- Pushes a job with `resolve`/`reject` for a `Promise<Blob>`.
- `drain()` loop: for each job, loads `File` via `getFileById(fileId)`; on miss, rejects with a Spanish error.
- **Before** `run`: `idbPutProcessingFile(file)` — crash recovery.
- **`run({ onProgress })`:** user-supplied async function returns output `Blob`.
- **After** `run` (success or failure): `idbRemoveProcessingFile()`, clear progress.

**Exposed state:**

- `queuedCount`, `runningLabel`, `progressPct` (0–100 or null), `lastError`
- `lastOutput` — `{ label, blob, mime }` after success (so user can download if they navigated away)
- `dismissLastOutput()`

### 7.3 Video compare (`useVideoCompareResult`)

Local React state (per component tree instance): holds last **processed** video `Blob` and derived object URL for **Original vs Después de procesar** tabs in `StudioVideoShell`. `clearProcessed()` drops the result blob.

---

## 8. IndexedDB (`lib/studio/studioMediaIdb.ts`)

- **Database:** `new-meta-remover-studio`, version `1`, store `media`.
- **Keys:**
  - `processing-active` — snapshot of file during an active `enqueue` job.
  - `current-file` — **deprecated**; read once and deleted on migration.

Helpers: `idbPutProcessingFile`, `idbRemoveProcessingFile`, `idbConsumeLegacyPersistedFile`, `idbGetProcessingFile`, `fileFromPersisted`.

---

## 9. FFmpeg integration (`lib/video/ffmpegRun.ts`)

### 9.1 Loading

- **Singleton** `FFmpeg` instance; `getFfmpeg()` loads once.
- Core URLs: `https://unpkg.com/@ffmpeg/core@0.12.10/dist/esm/ffmpeg-core.js` and `.wasm`, fetched via `toBlobURL` for worker/CORS-friendly loading.

### 9.2 Limits

- **`MAX_VIDEO_BYTES`:** 512 MiB (`getMaxVideoBytes()`, `assertVideoSize()`). Larger files throw a Spanish error directing user to smaller files.

### 9.3 I/O helpers

- `ffmpegWriteInput(ff, file)` — writes virtual FS input as `in{ext}`.
- `ffmpegReadOut(ff, outName, mime)` — reads output, deletes file, returns `Blob`.
- `ffmpegCleanupInput(ff, inName)` — delete input.

### 9.4 Default encode tail (`FFMPEG_MP4_TAIL` / `OUT_MP4`)

Shared tail for most video tools (libx264 + AAC, browser-friendly):

- Video: `libx264`, preset `veryfast`, CRF `26`, `-pix_fmt yuv420p`, `-profile:v main`, `-threads 0`
- Audio: AAC 128k, `-ar 48000`
- `-movflags +faststart`
- Output filename constant: `out.mp4`

Constants `FFMPEG_X264_PRESET_DEFAULT` and `FFMPEG_X264_CRF_DEFAULT` match these defaults; **EncodeTool** exposes user-selectable preset and CRF range.

### 9.5 Progress

`subscribeFfmpegProgress(ff, onProgress)` listens to `ff.on('progress', …)` and passes clamped 0–1 ratio; callers map to 0–100 for the queue.

### 9.6 Visual filter chain (`lib/video/visualFilters.ts`)

`buildVisualTransformFilter(rotationDeg, flipHorizontal)`:

- Optional `hflip`, then `rotate=2*PI/360*(deg):fillcolor=black` if non-zero.
- Always ends with `format=yuv420p` for H.264 compatibility.
- Throws if both rotation is 0 and flip is false.

---

## 10. File classification & processors

### 10.1 `detectCategory` (`lib/processors/detectCategory.ts`)

Returns `'image' | 'pdf' | 'video' | 'audio' | 'unknown'` using MIME first, then extension sets (images, video, audio, pdf).

### 10.2 Images — `stripImageMetadata` (`stripImageMetadata.ts`)

- **JPEG:** `piexif.remove` on binary string; if `exifr` still sees tags, **canvas re-encode** fallback. Optional **`addRandomized`**: inject random EXIF via `getRandomImageExif()` + `piexif.insert` (see `randomMetadata.ts`).
- **PNG / WebP:** Detect magic bytes; **canvas** `drawImage` + `toBlob` to strip chunks/metadata.
- Other image MIMEs: attempt canvas by type; else return buffer as blob.

### 10.3 PDF — `stripPdfMetadata` (`stripPdfMetadata.ts`)

- `PDFDocument.load`; on failure returns original bytes as blob.
- Clears or sets metadata fields via `pdf-lib`. **`addRandomized`:** `getRandomPdfMetadata()` fills title, author, subject, creator, producer, dates.

### 10.4 Video — `stripVideoMetadata` (`stripVideoMetadata.ts`)

**No** in-browser strip without re-encode. Returns the **same `File`** as blob reference with a **note** explaining that container/track metadata requires re-encoding; points users to Visual / Color / Encode tools.

### 10.5 Metadata reading (`lib/metadata/readMetadata.ts`)

- **Images:** `fileBase` + `exifr.parse` + `flattenMetadata`.
- **PDF:** `pdf-lib` getters (title, author, subject, keywords, creator, producer, dates); encrypted PDFs may reduce fields (`ignoreEncryption: true` on load for read path).
- **Video:** base fields + optional `exifr.parse` for files **&lt; 80 MB** (container EXIF in browser is best-effort).
- **Audio / unknown:** mostly `fileBase` only.
- **`readMetadataFromBlob`:** wraps blob as `File` for “after” table in Metadata tool.

### 10.6 `flattenMetadata` (`flattenMetadata.ts`)

Recursively flattens objects/arrays to dot-path string map for tables.

---

## 11. Downloads (`useStudioDownload` + `buildDownloadFilename`)

`buildDownloadFilename(originalName, { mode, suffix32, tag, ext })`:

- **Stem:** sanitized basename (`preserve`) or `randomStem(24)` (`randomize`).
- **Suffix:** optional `_` + `randomId32()` (32 alphanumerics).
- **Tag:** e.g. `-sin-metadatos`, `-visual`, `-encode`.
- **Extension:** explicit or from original name.

`useStudioDownload()` returns a function `(blob, tag, ext?)` that requires `file` from context (for original name) and triggers an `<a download>` with object URL.

---

## 12. Studio UI pieces

### 12.1 `StudioAssetBar`

- Shown on `StudioPage` when `mediaHydrated`.
- Lists session files as tabs; remove per item; **add videos** (`accept="video/*"`, multiple).
- Explains IndexedDB is only for the job in progress.

### 12.2 `StudioVideoShell`

Shared layout for **video** tools:

- File picker when empty (`video/*`, multiple) — uses `addFiles` and clears compare on new pick.
- If active file is **not** video: amber warning + remove active.
- Shows name, size, duration (from video metadata), max processable size.
- **Large file warning** if size &gt; ~55% of max.
- **Compare mode:** `OriginalVersusResultPreview` with fullscreen on preview container.
- Collapsible legal/technical note on re-encoding and platforms.
- **Children:** tool-specific controls in a “Controles” section.

### 12.3 `ProcessingDock`

Fixed overlay: queue status, progress bar, errors, **last output** download (`resultado-{timestamp}.mp4|webm|bin`) and dismiss.

### 12.4 `FfmpegProgress` / `useFfmpegJobProgress`

Thin UI/helpers for binding local “busy” state to queue `progressPct` (see tool implementations).

### 12.5 `HelpTip` / `FieldLabel`

Accessible labels with optional tooltip text for dense FFmpeg parameters.

### 12.6 Tool registry (`tools/toolRegistry.tsx`)

Each tool is `React.lazy` loaded; `StudioToolContent` wraps in `Suspense` with Spanish “Cargando…”.

---

## 13. Tool-by-tool behavior

### 13.1 Metadata (`MetadataTool.tsx`)

- **Inputs:** Multi-file picker (any types); uses **session** active file from bar.
- **Preview:** Image / video / audio / PDF / fallback by category.
- **Tables:** “Metadatos (antes)” / “Metadatos (después)” from `readMetadataForCategory` / `readMetadataFromBlob`.
- **Strip:** `enqueue` with category-specific work:
  - Image → `stripImageMetadata`
  - PDF → `stripPdfMetadata`
  - Video → `stripVideoMetadata` (passthrough + note)
  - Audio → copy bytes to blob + note that ID3 etc. are not modified
- **Random metadata checkbox:** only enabled for image/PDF; uses `addRandomized` flag.
- **Download naming block:** edits global `nameMode` / `nameSuffix32` (shared with video tools).
- **Download result:** `-sin-metadatos` tag.

### 13.2 Visual (`VisualTool.tsx`)

- Rotation (−180…180, step 0.01) + presets; horizontal flip.
- FFmpeg: `-vf` from `buildVisualTransformFilter` + `FFMPEG_MP4_TAIL`.
- Auto-download via `useStudioDownload(..., '-visual', '.mp4')` on success.

### 13.3 Color (`ColorTool.tsx`)

- `eq=brightness=:contrast=` + `format=yuv420p` + `FFMPEG_MP4_TAIL`.
- Tag `-color`.

### 13.4 Structure (`StructureTool.tsx`)

- Temporal trim: `-ss`, `-i`, `-t`, then `FFMPEG_MP4_TAIL`.
- Download tag `-corte`.

### 13.5 Audio (`AudioTool.tsx`)

- **Mute:** `-an` + video encode tail.
- **Volume:** `-af volume=` + tail.
- Download tag `-audio`.

### 13.6 Overlays (`OverlaysTool.tsx`)

- Renders text to a **canvas** PNG (`watermarkPng`), writes `wm.png` to FFmpeg FS, `filter_complex` scale + `overlay` bottom-right, then deletes `wm.png`.
- Download tag `-overlay`.

### 13.7 Encode (`EncodeTool.tsx`)

- User **CRF** (18–32) and **preset** (ultrafast…slow).
- Direct `ff.exec` with explicit x264/aac args (aligned with tail defaults).
- Tag `-encode`, extension `.mp4`.

---

## 14. Pages

### `HomePage`

Marketing blurb; if session has files after hydration, shows **continue to studio** CTA with active file info and `formatBytes`.

### `LoginPage`

Explicitly states **client-only**: no API, no remote login.

### `StudioPage`

- Breadcrumb: Inicio / Studio / active tool label (Spanish).
- `StudioAssetBar`.
- Horizontal **tool tabs** syncing to nuqs `tool`.
- `StudioToolContent`.
- Optional diagnostics for URL params.

---

## 15. Build & scripts

From `package.json` (use **Bun** per project preference):

```powershell
cd new-meta-remover
bun install
bun run dev
bun run build
bun run preview
bun run lint
```

- **Build:** `tsc -b` then `vite build`.
- **React Compiler** is enabled via Rolldown Babel plugin in `vite.config.ts`.

---

## 16. Deployment (`vercel.json`)

Single-page app rewrite: all paths → `/index.html`. Static hosting compatible.

---

## 17. Limitations & design notes

1. **Video metadata strip:** Not implemented as true strip; user must re-encode (Encode or any FFmpeg tool).
2. **Audio metadata:** Not stripped in Metadata tool; message explains limitation.
3. **512 MB cap** on video processing to limit WASM memory use.
4. **ffmpeg.wasm** is slow vs native FFmpeg; presets default to faster options.
5. **FFmpeg core** is fetched from **unpkg** at runtime — requires network on first load; offline builds would need self-hosting core assets.
6. **Multi-file session:** Video tools require **video** active file; Metadata tool accepts broader types via its own picker + session.
7. **`job` / `clip` / `panel` / `zoom` query keys** are wired for future features; not all may drive UI logic yet beyond diagnostics.
8. **Security:** Client-only processing means malicious files could still exploit browser bugs; no server-side scanning.

---

## 18. Extension checklist

When adding a studio tool:

1. Add literal to `toolValues` in `lib/search-params.ts` and to `STUDIO_TOOLS` / `lazyByTool` in `toolRegistry.tsx`.
2. Add label + tab + icon in `StudioPage.tsx`.
3. Implement `*Tool.tsx`; for video FFmpeg jobs, use `enqueue`, `assertVideoSize`, `getFfmpeg`, progress subscription, and `useStudioDownload` with a distinct **tag**.
4. Prefer `StudioVideoShell` for consistent video UX, or a standalone section like `MetadataTool` for non-video workflows.

---

## 19. Key file index (quick reference)

| Concern | File(s) |
|---------|---------|
| Routes | `router.tsx` |
| Providers | `main.tsx`, `StudioMediaProvider.tsx`, `StudioProcessQueueProvider.tsx` |
| Queue contract | `studioProcessQueueContext.ts` |
| IndexedDB | `lib/studio/studioMediaIdb.ts` |
| FFmpeg singleton & presets | `lib/video/ffmpegRun.ts` |
| Image/PDF strip | `lib/processors/stripImageMetadata.ts`, `stripPdfMetadata.ts` |
| Metadata read | `lib/metadata/readMetadata.ts` |
| Downloads | `lib/filename/buildDownloadFilename.ts`, `useStudioDownload.ts` |
| URL tool state | `lib/search-params.ts` |

---

*Generated from source inspection; update this file when behavior or dependencies change materially.*
