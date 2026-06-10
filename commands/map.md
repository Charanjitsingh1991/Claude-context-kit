---
description: (Re)generate the full project map — dependency graph, symbol index, and docs/nodes.md.
argument-hint: "[optional: MAP_DEPTH=N or MAP_TSCONFIG=path]"
---

Regenerate the project map (use the `project-map` skill). Apply any tunables
from $ARGUMENTS as env vars (e.g. `MAP_DEPTH=3`, `MAP_TSCONFIG=tsconfig.json`).

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/build-map.mjs"
node "${CLAUDE_PLUGIN_ROOT}/scripts/build-symbols.mjs"
node "${CLAUDE_PLUGIN_ROOT}/scripts/render-nodes.mjs"
```

`build-symbols.mjs` exits cleanly (code 2) if universal-ctags isn't installed —
that's fine, routing just falls back to the dependency graph. Report node count,
edge count, symbol count, and the `contentHash`.
