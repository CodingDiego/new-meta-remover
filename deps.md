# Dependency requests (manual install)

**Purpose:** Packages to add when you need them. **Bun** for installs.

**Scope:** `new-meta-remover` runs **client-only** in the repo. The sections below are for **optional future** features (server, DB, etc.), not current requirements.

---

## Already in `package.json`

Core UI, processors, FFmpeg-related libs, `@tanstack/react-query`, `zod`, `react-router-dom`, `nuqs`, etc. — see `package.json`.

---

## Optional — only if you add a feature

| Request | Command | When |
|--------|---------|------|
| ZIP / archives | `bun add jszip` | Processing `.zip` bundles |
| Router + nuqs | Already have `react-router-dom` + `nuqs` | — |
| Server API + DB + Blob later | `zod`, `@vercel/blob`, `drizzle-orm`, … | If you introduce a backend or migrate to Next |

---

## Nothing required for a bare client build

Append one-line rows here if a new feature needs a package.
