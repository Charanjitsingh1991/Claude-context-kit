---
name: scaffold-context
description: Generate or update the Claude Code context files (root CLAUDE.md plus per-area CLAUDE.md files) that a project needs, tailored to its detected stack. Use this when setting up a new project for Claude Code, when the user asks to "create context files", "set up CLAUDE.md", "scaffold the knowledge files", or whenever a repo has no CLAUDE.md and is about to be worked on. Run detect-project first.
---

# Scaffold Context

Create the minimal, high-signal context files Claude Code reads automatically.
The goal is **leverage, not volume** — a few accurate files beat a large,
half-true wiki that drifts.

## What to create

Decide based on the `detect-project` result:

| Project shape | Files to create |
|---|---|
| Single package | `CLAUDE.md` (root) only |
| Has distinct front/back | root `CLAUDE.md` + `CLAUDE.md` in each major area |
| Monorepo | root `CLAUDE.md` + one per `app`/`package` that has real complexity |

Do **not** create per-folder files mechanically. One file per *meaningful
boundary* (an app, a service, a bounded domain), not per directory.

## Procedure

1. Read the templates in `assets/`:
   - `assets/CLAUDE.root.template.md`
   - `assets/CLAUDE.area.template.md`
   - `assets/ARCHITECTURE.template.md` (for `docs/ARCHITECTURE.md`)
   - `assets/CONVENTIONS.template.md` (for `CONVENTIONS.md`)
   For *which* docs a given project should have, run the `recommend-setup` skill
   first — it maps the detected stack to a doc list (and ecosystem suggestions).
2. Fill them from real evidence (manifests, configs, existing code) gathered by
   `detect-project`. Every claim must be checkable in the repo. If you cannot
   verify a section (e.g. deployment), write `> TODO: confirm` rather than
   inventing it.
3. Keep the root `CLAUDE.md` short. It should answer, fast:
   - What is this, in one line
   - How to run / test / build (exact commands from `package.json` scripts)
   - The non-obvious rules a contributor must know (conventions, gotchas)
   - A pointer to the node map: ``See `docs/nodes.md` for module layout.``
4. Reference, don't duplicate. Link to the map and to area files using `@`
   imports (e.g. `@docs/nodes.md`) so Claude loads them on demand instead of
   inlining everything.

## Hard rules

- **No frozen framework trivia.** Do not paste API signatures or version-
  specific export paths into CLAUDE.md — those rot. Record *project decisions*
  (e.g. "we use server actions, not API routes for mutations"), and for unstable
  third-party APIs note "verify against current docs" instead of pinning syntax.
- **No invented commands.** Copy run/test/build commands verbatim from scripts.
- Prefer updating an existing `CLAUDE.md` over overwriting it. Show a diff.

After scaffolding, suggest running `/cartographer:map` to generate the node map
that the root `CLAUDE.md` points to.
