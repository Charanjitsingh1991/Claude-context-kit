---
description: Show what depends on a node/file (blast radius) before refactoring — from the graph, no file reads.
argument-hint: "<node id or file path>"
---

Report the impact of changing this, using the dependency graph:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/impact.mjs" "$ARGUMENTS"
```

Summarize direct vs transitive dependents. Edges are module-level, so before
committing to a refactor, open the listed dependents to confirm exact call sites.
