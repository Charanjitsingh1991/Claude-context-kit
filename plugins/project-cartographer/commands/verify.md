---
description: Prove the current change works — scoped type-check, lint, and related tests.
---
Run scoped verification (use the `verify-change` skill) and report the result:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/verify.mjs"
```

If it fails (exit 1), read the printed tail, fix the root cause, and re-run.
Do not report the task as done until it passes.
