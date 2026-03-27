# Cross-agent progress log

**Purpose:** Every agent appends dated entries when blocked, when completing a milestone, or when changing assumptions. Use ISO date `YYYY-MM-DD` and your **role** tag.

**Convention:**

- `[ORCHESTRATOR]` — scope, priorities, handoffs
- `[REQUIREMENTS]` — limits, browser/Vercel constraints
- `[DEPS]` — dependency conflicts or version pins
- `[IMPLEMENTER]` — code landed, routes added, migrations
- `[PROGRESS]` — checklist / phase status only
- `[REVIEW]` — review findings, must-fix vs nice-to-have

---

## Log (append newest at bottom)

### 2026-03-27 — [ORCHESTRATOR]

- **Goal:** Metadata removal + rich media editing with **no tab crashes on large files**, **client-smooth paths where feasible**, **heavy encode off the main thread / server as designed**, **URL state via nuqs**, **custom auth + file storage** using the **same dependency families** as agreed — **not** a replay of the other app’s architecture (that approach is excluded).
- **Stack decision:** Implement in this project per instructions; add server pieces when needed. Reuse **deps** from `deps.md` for auth + DB + Blob only — **new** API and storage flows.
- **Phasing:** (1) Big-file handling (2) Metadata strip (3) Encode pipeline (4) Editor UI + nuqs (5) Overlays/advanced — see `docs/TECHNICAL-REQUIREMENTS.md` for constraints only.

---

### 2026-03-27 — [ORCHESTRATOR] (correction)

- **`deps.md`** is **only** a short list of **requested missing packages** for manual `bun add` — not an architecture doc.

---

### 2026-03-27 — [REQUIREMENTS]

- See `docs/TECHNICAL-REQUIREMENTS.md` for full analysis (RAM, workers, Vercel limits, when to use server vs client).

---

### 2026-03-27 — [DEPS]

- Install requests only: `deps.md`. User runs `bun add` locally; agents do not assume shell access.

---

### 2026-03-27 — [PROGRESS]

| Phase | ID | Status | Notes |
|-------|-----|--------|--------|
| Client shell (router, nuqs, query) | I0 | **Done** | `src/router.tsx`, `main.tsx`, `search-params.ts`, pages |
| API boundary + env | I1 | **Done** | `src/lib/env.ts`, `src/lib/api/client.ts`, `vite-env.d.ts`, `.env.example`, README |
| Custom auth (new API design) | I2 | **Done** | Subagent: `AuthProvider`, `ProtectedRoute`, login, dev `/api` proxy |
| File storage / Blob pipeline | I3 | **Done** | Subagent: uploads API, `useUploadFlow`, `AssetDropzone`, contract README |
| Metadata removal (types + routing) | I4 | **Done** | Subagent: processors + `MetadataTool` |
| Studio tool panels | I5 | **Done** | Subagent: lazy tools + `toolRegistry`; parent wired `StudioPage` |
| Heavy encode / FFmpeg jobs | I6 | **Done** | Subagent: `useJob` + types; UI strip in Studio when `jobId` set |
| Advanced editor (overlays, etc.) | I7 | Pending | Sliced PRs |

**Detail:** `docs/IMPLEMENTATION-ORCHESTRATION.md`

---

### 2026-03-27 — [ORCHESTRATOR] (implementation kickoff)

- **Canonical plan:** `docs/IMPLEMENTATION-ORCHESTRATION.md` — phases **I0–I7**, dependency graph, agent handoffs, blocker protocol.
- **Next action for implementer:** **I3** — file storage / Blob pipeline (after backend contract for uploads).
- **Done:** **I0–I2** (shell, env+API client, auth client + protected studio + Vite `/api` proxy).

---

### 2026-03-27 — [IMPLEMENTER]

- **I1:** `getEnv()` + zod validation for `VITE_API_BASE_URL` (optional URL or empty); `apiUrl`, `apiFetch` / `apiJson` with `credentials: 'include'`; `ApiError`; startup `getEnv()` in `main.tsx`; `.env.example` + README table.

---

### 2026-03-27 — [IMPLEMENTER] (Task subagent — I2)

- **I2:** `src/lib/auth/types.ts`, `AuthProvider.tsx` (`/api/me`, login, logout), `ProtectedRoute.tsx`, `router.tsx` studio layout, `LoginPage.tsx` form, `vite.config.ts` proxy `/api` → `VITE_DEV_API_PROXY` or `127.0.0.1:3000`, README + `.env.example` line for proxy.

---

### 2026-03-27 — [IMPLEMENTER] (parallel Task subagents — I3–I6)

- **I3:** `src/lib/uploads/*`, `README-contract.md`, `useUploadFlow.ts`, `AssetDropzone.tsx`, `HomePage` upload section.
- **I4:** `src/lib/processors/*`, `piexifjs.d.ts`, `MetadataTool.tsx`.
- **I5:** `toolRegistry.tsx`, placeholder tools, barrel `index.ts` (parent removed static re-exports for code-split).
- **I6:** `src/lib/jobs/types.ts`, `useJob.ts`.
- **Parent integration:** `StudioPage.tsx` → `StudioToolContent` + `useJob`; `MetadataTool` accepts `tool` prop; `metadata` lazy import fixed.

---

### 2026-03-27 — [PROGRESS] (Task subagents)

- Implementation uses **Task subagents** for parallel work: implementer runs code changes; tracker/reviewer entries go in progress.MD.

---

### 2026-03-27 — [REVIEW]

- `src/lib/api/client.ts`: checklist — `credentials: 'include'` OK for cookies; ensure API base URL never logs secrets.

---

<!-- Append below -->
