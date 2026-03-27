# New meta remover

**Client-only** Vite + React app: React Router, nuqs (URL state), TanStack Query. There is **no separate backend** in this repo — no `/api/*` client, no remote auth, no Blob upload pipeline. Metadata stripping and video work run **in the browser** (including FFmpeg via WebAssembly).

Typed env: `src/lib/env.ts` (`MODE` / `DEV` / `PROD` only).

## Quick start

```powershell
cd new-meta-remover
bun install
bun run dev
```

Other scripts: `bun run build`, `bun run preview`, `bun run lint`.

**React Compiler** is enabled (see [React Compiler](https://react.dev/learn/react-compiler)); it affects dev/build performance.

**Repository:** [github.com/CodingDiego/new-meta-remover](https://github.com/CodingDiego/new-meta-remover) (open source).

---

## Contributing

We welcome issues and pull requests. Please read [**CONTRIBUTING.md**](./CONTRIBUTING.md) for guidelines: ground rules, dev setup (Bun), PR expectations, privacy/client-only constraints, and how to report security-sensitive problems.

---

## Technical reference (architecture & modules)

The rest of this README documents how the app is structured, how state and processing work, and how to extend it.

### 1. Product overview

The studio lets users:

- **Read** embedded metadata (images, PDFs, video containers where the browser exposes them).
- **Strip or replace** metadata for **images** and **PDFs** client-side.
- **Edit and re-encode video** with [FFmpeg](https://ffmpeg.org/) in WASM (`ffmpeg.wasm`), exporting **MP4** (H.264 + AAC).

**Privacy:** Session files stay in memory. Only the **currently running** queued job snapshots the input file to **IndexedDB** for crash recovery; it is removed when the job finishes. The documented code paths do not upload files to a server.

The UI mixes **English** (home/marketing) and **Spanish** (studio copy, errors, buttons).

### 2. Technology stack

| Layer | Choice |
|--------|--------|
| Runtime | React 19 |
| Bundler | Vite 8 |
| Routing | `react-router` / `react-router-dom` v7 (`createBrowserRouter`) |
| URL state | `nuqs` v2 (`NuqsAdapter` for React Router v7) |
| Styling | Tailwind CSS v4 (`@tailwindcss/vite`), `index.css` |
| UI | shadcn-style `Button`, `radix-ui`, `cva`, `tailwind-merge` |
| Fonts | `@fontsource-variable/lora`, `@fontsource-variable/nunito-sans` |
| Data | `@tanstack/react-query` (`QueryClientProvider` in `main.tsx`) |
| Video | `@ffmpeg/ffmpeg`, `@ffmpeg/core`, `@ffmpeg/util` (core from unpkg as blob URLs) |
| Image EXIF | `exifr`, `piexifjs` |
| PDF | `pdf-lib` |
| Validation | `zod` (`lib/env.ts`) |
| Compiler | `@rolldown/plugin-babel` + `babel-plugin-react-compiler` |

**Path alias:** `@/` → `src/` (`vite.config.ts`).

#### Dependencies in `package.json` not used under `src/` (as of this README)

No imports found in `src/` for: `@neondatabase/serverless`, `drizzle-orm`, `drizzle-kit`, `pg`, `@vercel/blob`, `sharp`, `tone`, `konva`, `react-konva`, `jszip`, `react-player`. Treat as placeholders or leftovers; app behavior does not depend on them.

### 3. Repository layout

```
new-meta-remover/
├── index.html
├── vite.config.ts
├── vercel.json              # SPA fallback rewrites
├── components.json          # shadcn config
├── README.md
└── src/
    ├── main.tsx
    ├── router.tsx
    ├── index.css
    ├── layouts/RootLayout.tsx
    ├── pages/
    │   ├── HomePage.tsx
    │   ├── LoginPage.tsx
    │   └── StudioPage.tsx
    ├── components/ui/       # button, HelpTip
    ├── features/studio/
    │   ├── StudioMediaProvider.tsx, studioMediaContext.ts, useStudioMedia.ts
    │   ├── StudioProcessQueueProvider.tsx, studioProcessQueueContext.ts, useStudioProcessQueue.ts
    │   ├── ProcessingDock.tsx, StudioAssetBar.tsx, StudioVideoShell.tsx
    │   ├── useStudioDownload.ts, useVideoCompareResult.ts
    │   ├── FfmpegProgress.tsx, useFfmpegJobProgress.ts
    │   └── tools/           # toolRegistry + *Tool.tsx
    └── lib/
        ├── env.ts, utils.ts, formatBytes.ts, search-params.ts
        ├── studio/studioMediaIdb.ts
        ├── filename/buildDownloadFilename.ts
        ├── metadata/        # readMetadata, flattenMetadata, randomMetadata
        ├── processors/      # detectCategory, strip*
        └── video/           # ffmpegRun.ts, visualFilters.ts
```

### 4. Application bootstrap (`main.tsx`)

Render tree (outer → inner):

1. `StrictMode`
2. `QueryClientProvider`
3. `StudioMediaProvider` — session files, active file, preview URL, download naming prefs
4. `StudioProcessQueueProvider` — serial job queue, progress, last output
5. `RouterProvider`
6. `ProcessingDock` — **sibling** to the router (fixed bottom-right): global queue UI and download-last-result

`getEnv()` runs once at startup (Zod-validated `import.meta.env`).

### 5. Routing (`router.tsx`)

| Path | Component |
|------|-----------|
| `/` | `RootLayout` → `HomePage` |
| `/auth/login` | `LoginPage` |
| `/studio` | `StudioPage` |
| `/studio/:jobId` | `StudioPage` (`jobId` for future deep links) |

`RootLayout` wraps `NuqsAdapter` around `Outlet`.

### 6. URL state (`lib/search-params.ts`)

- **`StudioTool`:** `metadata` | `visual` | `color` | `structure` | `audio` | `overlays` | `encode`
- **`studioParsers`** for `useQueryStates`: `tool` (default `metadata`), optional `job`, `clip`, `panel`, `zoom` (default `1`)

`StudioPage` can show **Estado & URL** diagnostics for these params.

### 7. Global state

#### Studio media (`StudioMediaProvider`)

Multi-file session; one **active** file for tools.

| Field / method | Role |
|----------------|------|
| `items` | `{ id, file, nameMode, nameCustomStem, nameSuffix32 }[]` (`id` = `crypto.randomUUID()`) |
| `activeId`, `file`, `previewUrl` | Active selection + object URL (revoked on change) |
| `mediaHydrated` | `false` until IDB migration/recovery finishes |
| `addFiles`, `removeItem`, `setActiveId`, `setFile`, `clearAll`, `getFileById` | Session CRUD |
| `nameMode`, `nameCustomStem`, `nameSuffix32` | Download naming for the **active** item (each `StudioMediaItem` has its own copy) |

**Hydration:** Migrates legacy `current-file` from IDB; if `processing-active` exists (crashed mid-job), restores and clears it.

#### Process queue (`StudioProcessQueueProvider`)

Serial execution of `enqueue({ label, fileId, run })` where `run({ onProgress })` returns a `Blob`. Before `run`: `idbPutProcessingFile`; after: `idbRemoveProcessingFile`. Exposes `queuedCount`, `runningLabel`, `progressPct`, `lastError`, `lastOutput`, `dismissLastOutput`.

#### Video compare (`useVideoCompareResult`)

Per-mount state: last processed video blob + object URL for Original / “Después de procesar” in `StudioVideoShell`.

### 8. IndexedDB (`lib/studio/studioMediaIdb.ts`)

- DB: `new-meta-remover-studio`, v1, store `media`
- Keys: `processing-active` (during jobs), `current-file` (deprecated, consumed once)

### 9. FFmpeg (`lib/video/ffmpegRun.ts`)

- **Singleton** `getFfmpeg()`; loads core from `unpkg.com/@ffmpeg/core@0.12.10/dist/esm/…` via `toBlobURL`
- **512 MiB** max input (`assertVideoSize`)
- **Shared export tail** `FFMPEG_MP4_TAIL`: libx264 (veryfast, CRF 26, yuv420p, main), AAC 128k, 48 kHz, `+faststart` → `out.mp4`
- **Helpers:** `ffmpegWriteInput`, `ffmpegReadOut`, `ffmpegCleanupInput`, `subscribeFfmpegProgress`

**Visual filters** (`visualFilters.ts`): `buildVisualTransformFilter(deg, flipH)` → `hflip` / `rotate` / `format=yuv420p`.

### 10. Processors & metadata reading

- **`detectCategory`:** image | pdf | video | audio | unknown (MIME + extension)
- **Images:** `stripImageMetadata` — JPEG via piexif + exifr verify + canvas fallback; PNG/WebP via canvas; optional random EXIF (`randomMetadata`)
- **PDF:** `stripPdfMetadata` via pdf-lib; optional random doc info
- **Video:** `stripVideoMetadata` returns same file with explanatory note (true strip needs re-encode)
- **`readMetadata`:** category-specific; video tries exifr for files &lt; 80 MB; `readMetadataFromBlob` for “after” tables

### 11. Downloads

`buildDownloadFilename` + `useStudioDownload(blob, tag, ext?)` — tags used by tools include `-sin-metadatos`, `-visual`, `-color`, `-corte`, `-audio`, `-overlay`, `-encode`.

### 12. Studio UI

- **`StudioAssetBar`:** session tabs, add `video/*`, remove items
- **`StudioVideoShell`:** shared video tool chrome (picker, warnings, compare tabs, fullscreen, controls slot)
- **`ProcessingDock`:** global queue + last result download
- **`toolRegistry.tsx`:** lazy-loaded tool panels + Suspense

### 13. Tools (behavior summary)

| Tool | What it does | Download tag |
|------|----------------|----------------|
| **Metadata** | Read before/after tables; strip image/PDF; video passthrough + note; audio copy + note; optional random metadata (image/PDF) | `-sin-metadatos` |
| **Visual** | Rotate + optional hflip → MP4 | `-visual` |
| **Color** | `eq` brightness/contrast → MP4 | `-color` |
| **Structure** | `-ss` / `-t` trim → MP4 | `-corte` |
| **Audio** | Mute (`-an`) or `volume` filter → MP4 | `-audio` |
| **Overlays** | Canvas text → PNG → `overlay` filter → MP4 | `-overlay` |
| **Encode** | User CRF + x264 preset → MP4 | `-encode` |

### 14. Pages

- **HomePage** — intro + continue to studio if session has files
- **LoginPage** — explains there is no server login
- **StudioPage** — asset bar, tool tabs (nuqs), active tool, optional diagnostics

### 15. Deployment

`vercel.json`: SPA rewrite `/(.*)` → `/index.html`.

### 16. Limitations

1. Video “metadata strip” without re-encode is not implemented; use Encode or other FFmpeg tools.
2. Audio embedded tags (ID3, etc.) are not stripped in the Metadata tool.
3. 512 MB video cap; WASM is slower than native FFmpeg.
4. FFmpeg core loads from **unpkg** (network on first run unless you self-host).
5. `job` / `clip` / `panel` / `zoom` may be reserved for future UX beyond diagnostics.

### 17. Adding a new studio tool

1. Add to `toolValues` in `lib/search-params.ts` and to `STUDIO_TOOLS` / `lazyByTool` in `toolRegistry.tsx`.
2. Add tab + label + icon in `StudioPage.tsx`.
3. Implement `*Tool.tsx`; for FFmpeg, use `enqueue`, `assertVideoSize`, `getFfmpeg`, progress subscription, `useStudioDownload` with a unique tag.
4. Use `StudioVideoShell` for video UX, or a standalone layout like `MetadataTool` for non-video flows.

### 18. Key files

| Concern | File(s) |
|---------|---------|
| Routes | `src/router.tsx` |
| Providers | `src/main.tsx`, `StudioMediaProvider.tsx`, `StudioProcessQueueProvider.tsx` |
| Queue API | `src/features/studio/studioProcessQueueContext.ts` |
| IndexedDB | `src/lib/studio/studioMediaIdb.ts` |
| FFmpeg | `src/lib/video/ffmpegRun.ts` |
| Strip image/PDF | `src/lib/processors/stripImageMetadata.ts`, `stripPdfMetadata.ts` |
| Read metadata | `src/lib/metadata/readMetadata.ts` |
| Downloads | `src/lib/filename/buildDownloadFilename.ts`, `useStudioDownload.ts` |
| URL tool | `src/lib/search-params.ts` |

---

*Update this README when behavior or dependencies change materially.*
