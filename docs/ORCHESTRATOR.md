# Orchestrator playbook

This document tells **each agent role** exactly what to produce and how it interacts with `progress.MD` and `deps.md`.

**→ Active implementation plan:** [`IMPLEMENTATION-ORCHESTRATION.md`](./IMPLEMENTATION-ORCHESTRATION.md) (phases I0–I7, gates, handoffs, next action).

## Roles

### 1. Orchestrator (single source of priorities)

**Inputs:** Product goals, `docs/TECHNICAL-REQUIREMENTS.md`, `progress.MD`.

**Outputs:**

- Phased backlog (P0 → P3).
- Architecture that follows **your** instructions — **not** a copy of the other app’s approach (that path is out of scope).
- Handoff notes at the bottom of `progress.MD` under `[ORCHESTRATOR]`.

**Rules:**

- P0: No full-file buffering for large uploads; streaming storage + server-side processing where you define it.
- P1: **Custom auth** + **file storage** using the **same dependency families** as agreed (`deps.md`); implementation is new.
- P2: nuqs-based editor routing and URL state.
- P3: Full checklist (overlays, Whisper, etc.) in slices.

#### Subagent workflow

- Use the **Task** tool for parallel work: **generalPurpose** for implementation slices (code changes), **explore** for codebase search and broad discovery, **code-reviewer** before merge or when a phase needs a structured review against requirements.
- After a subagent lands code, the parent run must append **`[IMPLEMENTER]`** in `progress.MD` (paths, scope) so tracker/reviewer entries stay synchronized.

---

### 2. Requirements / limitations agent

**Reads:** Vercel limits, browser memory model, existing `remove-metadata` processors.

**Writes:** `docs/TECHNICAL-REQUIREMENTS.md` (update in place) + short summary entry in `progress.MD` tagged `[REQUIREMENTS]`.

**Deliverables:**

- Clear **client vs server** matrix per feature.
- Explicit **RAM/OOM** risks and mitigations.

---

### 3. Dependencies agent

**Writes:** `deps.md` only (user runs Bun install manually).

**Deliverables:**

- **Short request list** of missing packages only — no long analysis (see current `deps.md` format).
- Note what is **already** in `package.json` vs **requested** when a feature lands.

**Does not:** run install commands.

---

### 4. Implementer agent

**Reads:** `docs/TECHNICAL-REQUIREMENTS.md`, `deps.md`, product instructions.

**Writes:** Application code; updates `progress.MD` `[IMPLEMENTER]` with file paths and migrations.

**Must:**

- Implement **custom auth** and **file storage** with the **same deps** as listed in `deps.md` when the server exists — **new** flows and APIs, not a port of the other app’s job/queue design unless you explicitly choose it.
- Wire **nuqs** with the correct adapter for your framework (e.g. Next layout or Vite + router).
- Implement **large-file handling** per requirements (streaming, workers, server processing) without copying a failed approach.

**Avoid:** Treating the old app as the source of truth for architecture.

---

### 5. Progress tracker agent

**Writes:** `progress.MD` table in the `[PROGRESS]` section + dated notes.

**Does not:** change production code unless also acting as implementer (prefer separation).

**Cadence:** After each phase, mark rows Done / Blocked and link to PR or commit range in free text.

---

### 6. Code reviewer agent

**Reads:** Diff against **requirements** and `deps.md`, not “match the old app line-by-line.”

**Writes:** `progress.MD` tagged `[REVIEW]` OR inline PR comments if using Git.

**Checklist:**

- [ ] CSRF on state-changing routes (when you add them)
- [ ] Storage paths scoped to the authenticated user
- [ ] Large files: no duplicate buffers in React state
- [ ] nuqs: typed parsers, no unbounded JSON in URL
- [ ] FFmpeg / long jobs: timeouts and clear errors for the user

---

## File map

| File | Owner |
|------|--------|
| `progress.MD` | All agents append |
| `deps.md` | Dependencies agent |
| `docs/TECHNICAL-REQUIREMENTS.md` | Requirements agent |
| `docs/IMPLEMENTATION-ORCHESTRATION.md` | Orchestrator + implementer (execution order) |
| `docs/ORCHESTRATOR.md` | Orchestrator (roles + reviewer checklist) |

---

## Suggested route map (nuqs)

Define routes in **your** app (framework of choice); example shape:

- `/` — landing / file intake
- `/auth/login` — sign-in
- `/files` — library (if you add it)
- `/studio` — editor shell; query: `tool`, `jobId`, `clip`, `panel`
- `/studio/[jobId]` — optional path segment if you prefer path over query for job

**Query keys (example):** `job`, `tool`, `clip`, `zoom`, `panel` — via nuqs parsers with defaults.

---

## Done definition (v1)

- Large video/audio does not crash the tab; heavy work uses the path you design (streaming / server / workers).
- Small files can still process **client** where appropriate.
- **Custom auth** + **file storage** implemented with the agreed **deps** (`deps.md`), not a clone of the old app’s flows.
- Editor shell + nuqs routing exists; advanced features ship incrementally behind the `tool` query (or equivalent).
