---
name: project-map
description: Build, refresh, and use a deterministic, token-cheap map of the project — a module graph plus a symbol index — so you can jump straight to the right files and line numbers instead of grepping and reading whole files. Use this whenever you need to find where something lives before editing, when the user asks to map the project or show architecture, when checking what a change might break, or when a map looks stale. The map narrows the search; always read the real files before editing.
---

# Project Map

Maintains, on disk, three artifacts under `.claude/project-map/`:
- `project-map.json` — module dependency graph (source of truth)
- `symbols.json` — symbol → file:line index (polyglot, via universal-ctags)
- and renders `docs/nodes.md` — human-readable Mermaid view

**Token discipline (the whole point):** never `cat` these JSON files into your
context. They can be large. Always query them with the scripts below, which
return a tiny shortlist. Routing cost stays roughly constant as the repo grows.

## Find where a task lives  (use this constantly)

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/query.mjs" "<the task in plain words>"
```
Returns only the few files (with line numbers) worth opening. Read ~40 lines
around each line number — not the whole file. Example output:

```
Read these (narrowed using symbol index; read ~40 lines around each line number):
  - src/api/auth/route.ts:42   [function loginHandler]
Related (open only if the change ripples): src/db
```

Then open exactly those ranges and implement. If the result says "no strong
match", the map may be stale (refresh) or the task wording lacks code-ish terms.

## Check what a change breaks (refactor safety)

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/impact.mjs" <node-id-or-file>
```
Lists direct + transitive dependents from the graph — zero file reads.

## Staleness

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/check.mjs"
```
Compares the map's recorded `gitHead` to the current repo and lists changed
source files. Exit 0 = fresh, 3 = stale, 2 = no map. If stale, regenerate.
The map is advisory: if it disagrees with the code, the code wins.

## Generate / refresh

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/build-map.mjs"      # -> project-map.json (+ gitHead)
node "${CLAUDE_PLUGIN_ROOT}/scripts/build-symbols.mjs"  # -> symbols.json (skips cleanly if no ctags)
node "${CLAUDE_PLUGIN_ROOT}/scripts/render-nodes.mjs"   # -> docs/nodes.md
```

Tunables:
- `MAP_DEPTH=2` — path segments per node (raise for finer nodes in big modules).
- `MAP_TSCONFIG=tsconfig.json` — required for TS path aliases to resolve edges.

Requirements: Node 18+. `dependency-cruiser` via npx (JS/TS/Vue) for edges;
`universal-ctags` for symbols (covers ~150 languages incl. C#, Python, Go). If
ctags is missing, symbol indexing skips and routing falls back to the graph —
still useful, just coarser.

## Other languages

`build-map.mjs` edges are JS/TS-focused, but `build-symbols.mjs` (ctags) is
polyglot, so symbol routing works for C#/Python/Go/etc. For dependency edges in
those languages, run a language-appropriate analyzer and emit the same
`project-map.json` schema (`schema`, `nodes[]`, `edges[]`, `gitHead`,
`contentHash`) so `render-nodes.mjs` and `query.mjs` keep working unchanged.
