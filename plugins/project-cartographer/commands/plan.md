---
description: Show or initialize the current task plan + acceptance criteria.
argument-hint: "[--init | --show]"
---
Use the `work-tracking` skill:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/plan.mjs" ${ARGUMENTS:---show}
```

If initializing, fill in Goal, Acceptance criteria, and Out of scope, then keep
the work aligned to it and flag scope creep to the user.
