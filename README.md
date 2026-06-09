# claude-context-kit

A Claude Code plugin marketplace. One plugin: **project-cartographer** — a
token-cheap, safety-first toolkit that makes Claude *understand* your repo,
*prove* its changes, and *not* do damage.

## What it does

**Understand the project (token-cheap)**
- Detect the stack from real manifests/configs.
- Build a deterministic dependency graph (`dependency-cruiser`) + a ctags symbol
  index, kept on disk and queried by scripts — the indexes never enter context.
- `/cartographer:find "..."` returns exact `file:line` targets, so Claude reads
  a 40-line window instead of grepping and reading whole files.

**Set the project up**
- Recommend the context docs AND the skill/MCP/plugin *categories* that fit the
  stack (verify-live, never frozen), then scaffold the approved docs.

**Prove changes work**
- `/cartographer:verify` runs scoped checks — type-check, lint on changed files,
  and the tests related to those files — not the whole suite.
- `/cartographer:api <pkg> [symbol]` confirms a library API exists in the
  *installed* version by reading its `.d.ts` — kills hallucinated APIs.
- `/cartographer:impact <node>` shows what a change breaks, from the graph.

**Don't do damage (active by default)**
- A PreToolUse hook blocks destructive commands (`rm -rf /`, force-push, DB
  resets, pipe-to-shell, …) and blocks writing secrets / real `.env` files.
- `/cartographer:checkpoint` makes a non-destructive recovery snapshot.

**Stay on-plan across sessions**
- `.claude/plan.md` (anti-drift) + `.claude/worklog.md` (decisions/dead-ends),
  surfaced automatically by a SessionStart digest.

## Commands

```
/cartographer:init        detect -> recommend -> scaffold -> map
/cartographer:find "..."  exact file:line targets (token-cheap routing)
/cartographer:verify      scoped type-check + lint + related tests
/cartographer:api <pkg>   does this API exist in the installed version?
/cartographer:impact <n>  blast radius of changing a node/file
/cartographer:checkpoint  non-destructive recovery point
/cartographer:map         rebuild graph + symbols + docs/nodes.md
/cartographer:check       is the map stale vs git?
/cartographer:recommend   docs + ecosystem suggestions
/cartographer:plan        goal + acceptance criteria (anti-drift)
/cartographer:log "..."   append to the cross-session worklog
```

Eight skills also trigger automatically (detect-project, recommend-setup,
scaffold-context, project-map, verify-change, verify-api, safe-changes,
work-tracking).

## Install

```bash
/plugin marketplace add your-username/claude-context-kit
/plugin install project-cartographer@claude-context-kit
```

## Requirements

- Node 18+
- `dependency-cruiser` via `npx` — dependency edges (JS/TS/JSX/TSX/Vue)
- `universal-ctags` — symbol index across ~150 languages (optional; routing
  falls back to the graph if absent)
  - macOS `brew install universal-ctags` · Debian `apt-get install universal-ctags` · Windows `choco install universal-ctags`
- Verification/guards use your project's own tools (eslint, tsc, vitest/jest) —
  only run when present in `node_modules/.bin`; never trigger network fetches.

## Safety hook protocol

The guard uses the verified Claude Code hook contract: reads the event JSON on
stdin and **exits 2 to block** (exit 1 would be a no-op). It **fails open** on
malformed input so a bug can never brick a session. Edit the denylist/secret
patterns in `scripts/guard.mjs`.

## Design principles

- The map is a router, not a source of truth — read real files before editing;
  `check.mjs` flags staleness vs git so a stale map isn't trusted blindly.
- Deterministic over narrated — graph from dependency-cruiser, symbols from
  ctags, APIs from installed `.d.ts`. Nothing guessed.
- Indexes on disk, results in context — that's the token win.
- Process + templates, not frozen trivia — ecosystem suggestions are categories
  to confirm live; docs capture decisions, not pinned API syntax.
- Reversible by default — destructive/irreversible actions are the user's call.

## Validate before publishing

```bash
claude plugin validate ./plugins/project-cartographer
claude plugin validate .
```

## Optional / roadmap

- A `Stop` hook to auto-run `verify.mjs` when Claude finishes a turn (left off by
  default — running tests automatically can be heavy/surprising; enable in
  `hooks/hooks.json` if you want it).
- `PostToolUse` dirty-marking to auto-flag stale map nodes.
- Git-incremental symbol refresh; embeddings-based semantic routing (opt-in).
