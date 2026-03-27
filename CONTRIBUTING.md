# Contributing to New meta remover

Thanks for your interest in this project. This document explains how to contribute effectively and what we expect from patches and discussions.

The source repository is: [github.com/CodingDiego/new-meta-remover](https://github.com/CodingDiego/new-meta-remover).

## Ground rules

- **Be respectful.** Assume good intent. Keep feedback specific and constructive.
- **Privacy first.** This app is **client-only**: avoid changes that upload user files or metadata to a server without explicit, documented consent and clear UX.
- **Small, focused changes.** Prefer one logical change per pull request (bugfix, feature, or docs—not all at once).
- **Match the codebase.** Follow existing patterns for file layout, naming, imports (`@/`), and Spanish/English copy as used nearby (studio UI is largely Spanish; home and some pages use English).

## Before you start

1. **Search existing issues and PRs** so we do not duplicate work.
2. For **larger features or refactors**, open an issue first to align on approach (especially anything touching FFmpeg flows, IndexedDB, or routing/URL state).

## Development setup

Use [Bun](https://bun.sh/) as the package manager for this repo:

```powershell
cd new-meta-remover
bun install
bun run dev
```

Other useful commands:

```powershell
bun run build
bun run lint
```

## Code and architecture notes

- **React + Vite SPA** — there is no in-repo backend; do not add `/api/*` clients or server-only assumptions without a deliberate product decision.
- **Fast Refresh:** Prefer splitting modules so each file exports either React components or non-component hooks/utilities, not both (see `eslint` / React Refresh expectations in the project).
- **Styling:** Tailwind CSS v4. For hover backgrounds in light and dark mode, keep contrast readable (e.g. pair `hover:bg-*` with appropriate `dark:hover:*` where needed).
- **Video / metadata:** Heavy work runs in the browser (e.g. ffmpeg.wasm). Consider memory and file-size limits documented in the README when changing processing paths.

## Pull requests

1. Branch from the default branch (`master` unless the repo moves to `main`).
2. Keep commits readable; squash or clean up noisy WIP history if helpful.
3. In the PR description, explain **what** changed and **why** (user-visible behavior, risks, or follow-ups).
4. Ensure `bun run lint` and `bun run build` pass locally before requesting review.

## Reporting issues

- Include **steps to reproduce**, **expected vs actual behavior**, and **browser/OS** when relevant.
- For **security vulnerabilities**, do not open a public issue with exploit details; contact the maintainers privately (e.g. GitHub Security Advisories or email if listed on the profile) so we can fix and disclose responsibly.

## Documentation

- User-facing and technical overview: `README.md`.
- Deeper module notes: `DOCUMENTATION.md` (if present in your checkout).
- Update README or CONTRIBUTING when behavior or contribution flow changes in a meaningful way.

## License

By contributing, you agree that your contributions will be licensed under the same terms as the project (see the repository’s `LICENSE` file if one is present).
