---
description: Bootstrap a project for Claude Code — detect stack, recommend + scaffold docs, and build the map and symbol index.
argument-hint: "[optional notes about the project]"
---

Bootstrap this project for Claude Code, in order. Verify everything against real
files; never invent facts. Extra context: $ARGUMENTS

1. **Detect** — use the `detect-project` skill; print the classification.

2. **Recommend** — use the `recommend-setup` skill:
   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/scripts/recommend.mjs"
   ```
   Show the recommended docs and ecosystem categories. Let the user pick.

3. **Scaffold** — use the `scaffold-context` skill to create/update the approved
   docs (root `CLAUDE.md`, `docs/ARCHITECTURE.md`, `CONVENTIONS.md`, etc.) from
   templates, filled from evidence. Diff before overwriting anything that exists.

4. **Map** — build the graph + symbol index + view:
   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/scripts/build-map.mjs"
   node "${CLAUDE_PLUGIN_ROOT}/scripts/build-symbols.mjs"
   node "${CLAUDE_PLUGIN_ROOT}/scripts/render-nodes.mjs"
   ```

Finish with a short summary: detected stack, files created/updated, and
node/edge/symbol counts. Remind the user: from now on use `/cartographer:find`
to locate code cheaply, and read the actual files before editing.
