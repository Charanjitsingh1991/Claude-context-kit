---
description: Find exactly which files and line numbers a task touches, using the symbol index — without reading the whole repo.
argument-hint: "<describe the change or task>"
---

Locate the code for this task token-cheaply. Do NOT grep the repo or read the
map files into context.

Task: $ARGUMENTS

1. Run:
   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/scripts/query.mjs" "$ARGUMENTS"
   ```
2. Open ONLY the files/line ranges it returns (read ~40 lines around each line).
3. State which targets you're using. If it reports a weak match, run
   `/cartographer:check` (maybe stale) before falling back to a broader search.
4. The files are the source of truth — confirm in the code before editing.
