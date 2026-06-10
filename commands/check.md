---
description: Check whether the project map is stale relative to the current code.
---

Run the staleness check and report the verdict:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/check.mjs"
```

If it reports STALE (exit 3), offer to run `/cartographer:map`. If it can't
check (not a git repo), note that and suggest regenerating if code changed.
