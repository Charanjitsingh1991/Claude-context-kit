---
name: safe-changes
description: Work safely around destructive or irreversible operations and create recovery points before risky changes. Use when about to run something dangerous (deletes, force-push, DB resets, migrations), before a large multi-file refactor, or when the user worries about losing work. A safety guard hook is also active automatically; this skill explains how to respond when it fires.
---

# Safe Changes

This plugin ships a PreToolUse guard (see `hooks/hooks.json` → `guard.mjs`) that
**blocks** clearly destructive shell commands and writing secrets/`.env` files,
returning a reason via exit code 2.

## When the guard blocks you

Do not try to bypass it. The block is correct by default. Instead:
- Explain to the user what was blocked and why.
- Offer the safe alternative the message suggests (e.g. `--force-with-lease`
  instead of `--force`, a `.env.example` instead of `.env`, an env-var reference
  instead of an inlined secret).
- If the user truly wants the destructive action, have **them** run it, or have
  them confirm explicitly — never just route around the guard.

## Before risky work: checkpoint

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/checkpoint.mjs" "before <what you're about to do>"
```
Creates a non-destructive snapshot of the working tree (via `git stash create`)
and prints a `git stash apply <sha>` restore command. Do this before large
refactors, migrations, or sweeping edits so the work is recoverable.

## Principles

- Destructive + irreversible operations are the user's call, not yours.
- Prefer reversible steps; create a checkpoint when a step isn't easily undone.
- Never write secrets into source — reference env vars and register names in
  `.env.example`.
