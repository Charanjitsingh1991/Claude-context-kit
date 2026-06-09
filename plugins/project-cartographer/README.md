# project-cartographer

A token-cheap, safety-first toolkit for working in a codebase with Claude Code.

## Layout

```
project-cartographer/
├── .claude-plugin/plugin.json
├── hooks/hooks.json                 # PreToolUse guard + SessionStart digest
├── skills/
│   ├── detect-project/              # classify the stack
│   ├── recommend-setup/             # suggest docs + skill/MCP/plugin categories
│   │   └── references/recommendations.json
│   ├── scaffold-context/            # generate CLAUDE.md / ARCHITECTURE / CONVENTIONS
│   │   └── assets/*.template.md
│   ├── project-map/                 # graph + symbols + routing
│   ├── verify-change/               # scoped verification
│   ├── verify-api/                  # installed-version API check
│   ├── safe-changes/                # guard + checkpoints
│   └── work-tracking/               # plan (anti-drift) + worklog (memory)
├── commands/                        # 11 slash commands (/cartographer:*)
└── scripts/                         # 14 deterministic Node scripts (ESM)
```

## Scripts (all read from disk / project tools; never load indexes into context)

| Script | Purpose |
|---|---|
| `build-map.mjs` | dependency graph -> `.claude/project-map/project-map.json` (records gitHead) |
| `build-symbols.mjs` | ctags symbol index -> `symbols.json` (skips cleanly if no ctags) |
| `render-nodes.mjs` | graph -> `docs/nodes.md` (Mermaid) |
| `query.mjs` | rank task -> tiny `file:line` shortlist (the token win) |
| `impact.mjs` | reverse deps: what breaks if I change X |
| `check.mjs` | staleness vs git (exit 3 = stale) |
| `recommend.mjs` | stack signals -> doc + ecosystem suggestions |
| `verify.mjs` | scoped type-check + lint(changed) + related tests |
| `api-check.mjs` | installed-version API surface from `.d.ts` |
| `guard.mjs` | PreToolUse: block destructive cmds / secrets / `.env` (exit 2) |
| `checkpoint.mjs` | non-destructive `git stash create` recovery point |
| `worklog.mjs` | append-only `.claude/worklog.md` |
| `plan.mjs` | `.claude/plan.md` (goal + acceptance criteria) |
| `session-start.mjs` | SessionStart digest (plan goal + recent worklog + freshness) |

## Honest caveats

- Dependency **edges** are JS/TS/Vue (dependency-cruiser); **symbols** are
  polyglot (ctags → C#/Python/Go/…). For edges in other languages, emit the same
  `project-map.json` schema from a language-appropriate analyzer.
- `verify.mjs` only runs tools present in `node_modules/.bin`; full E2E behavior
  depends on the project having eslint/tsc/vitest. It's scoped by design — CI
  still owns the full suite.
- `api-check.mjs` is exact for direct exports; for barrel/re-export packages a
  "NOT FOUND" can be a false negative, so it reports **UNCERTAIN** and points at
  the submodule to read.
- The guard is heuristic and **fails open** (a bug can't brick the session). It
  reduces accidents; it is not a substitute for review. Tune patterns in
  `guard.mjs`.
- An auto-verify `Stop` hook is intentionally **not** enabled (can be heavy).
  Add it to `hooks/hooks.json` if you want verification on every turn-end.
