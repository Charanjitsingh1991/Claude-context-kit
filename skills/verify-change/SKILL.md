---
name: verify-change
description: Prove a code change actually works by running scoped checks — type-check, lint on changed files, and the tests related to those files — instead of guessing or running the whole suite. Use this after editing code and BEFORE telling the user it's done, when the user asks to verify/test a change, or whenever you're about to claim something works. Never declare a task complete without it.
---

# Verify Change

The most damaging agent habit is editing and then claiming success without
proof. This runs only the checks relevant to what changed, so it's cheap enough
to actually run every time.

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/verify.mjs"
```

It detects changed source files (vs git HEAD), then runs whichever are present:
type-check (`typecheck` script or `tsc --noEmit`), `eslint` on the changed
files, and related tests (`vitest related` / `jest --findRelatedTests`). Tools
that aren't installed are skipped, not failed.

- Exit 0 = passed (or nothing to verify). Exit 1 = something failed.
- On failure, read the printed tail, fix the cause, and re-run. Do not report
  "done" until it passes.
- For broader safety, pair with `impact.mjs`: if the change touches a widely
  depended-on node, also exercise the dependents it lists.

This is scoped on purpose. A full-suite run is the user's/CI's job; your job is
to prove the specific change is sound before handing it back.
