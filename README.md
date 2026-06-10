# claude-context-kit — project-cartographer

A token-cheap, safety-first toolkit for Claude Code. One plugin: **project-cartographer**.

## Install

```
/plugin marketplace add Charanjitsingh1991/claude-context-kit
/plugin install project-cartographer@claude-context-kit
```

Or via git URL:
```
/plugin marketplace add https://github.com/Charanjitsingh1991/claude-context-kit.git
/plugin install project-cartographer@claude-context-kit
```

## What it does

- **Detect** the stack from real manifests — no guessing
- **Recommend** context docs + skill/MCP/plugin categories for the stack
- **Scaffold** `CLAUDE.md`, `ARCHITECTURE.md`, `CONVENTIONS.md` etc. from templates + real evidence
- **Map** the codebase: dependency graph (`dependency-cruiser`) + symbol index (universal-ctags, 150+ languages)
- **Route** tasks to exact `file:line` — `/project-cartographer:find "add rate limiting to login"` → `src/lib/rate-limit/index.ts:57`
- **Verify** changes: scoped type-check + lint + related tests
- **Guard** destructive commands and secret leaks via a PreToolUse hook

## Commands

```
/project-cartographer:init          detect → recommend → scaffold → map
/project-cartographer:find "..."    exact file:line routing (token-cheap)
/project-cartographer:verify        scoped type-check + lint + tests
/project-cartographer:api <pkg>     confirm API exists in installed version
/project-cartographer:impact <n>    blast radius of a change
/project-cartographer:checkpoint    non-destructive recovery point
/project-cartographer:map           rebuild graph + symbols + nodes.md
/project-cartographer:check         is the map stale vs git?
/project-cartographer:recommend     docs + ecosystem suggestions
/project-cartographer:plan          goal + acceptance criteria (anti-drift)
/project-cartographer:log "..."     append to cross-session worklog
```

## Requirements

- Node 18+
- `dependency-cruiser` via npx (JS/TS edges)
- `universal-ctags` (optional — symbols + line numbers; falls back to graph)
  - macOS: `brew install universal-ctags`
  - Linux: `apt-get install universal-ctags`
  - Windows: `choco install universal-ctags`

## Repo structure

```
claude-context-kit/          ← repo root = plugin root
├── .claude-plugin/
│   ├── marketplace.json     ← marketplace catalog
│   └── plugin.json          ← plugin manifest
├── commands/                ← slash commands
├── hooks/                   ← PreToolUse guard + SessionStart digest
├── scripts/                 ← 14 deterministic Node scripts
├── skills/                  ← 8 auto-triggering skills
└── README.md
```
