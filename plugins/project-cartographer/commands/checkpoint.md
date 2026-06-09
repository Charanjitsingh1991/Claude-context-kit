---
description: Create a non-destructive recovery point before risky work.
argument-hint: "[label]"
---
Create a recovery snapshot (use the `safe-changes` skill):

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/checkpoint.mjs" "$ARGUMENTS"
```

Report the saved sha and the `git stash apply` restore command.
