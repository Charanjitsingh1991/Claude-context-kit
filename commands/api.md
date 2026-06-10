---
description: Check whether a library API exists in the installed version (reads node_modules types).
argument-hint: "<package> [symbol]"
---
Verify a dependency's real API using the `verify-api` skill:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/api-check.mjs" $ARGUMENTS
```

Report version + whether the symbol exists. Treat NOT FOUND as real; open the
submodule .d.ts on UNCERTAIN. Never assume an API that isn't confirmed.
