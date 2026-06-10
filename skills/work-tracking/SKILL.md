---
name: work-tracking
description: Keep a session on-plan and remember what was tried across sessions. Use at the start of a multi-step task to record the goal and acceptance criteria, periodically to check you haven't drifted, and after notable decisions or dead ends to log them. Helps avoid building the wrong thing and repeating failed approaches in later sessions.
---

# Work Tracking

Two lightweight, committable files under `.claude/`:

## Plan (anti-drift) — `.claude/plan.md`

At the start of a non-trivial task, capture the goal + acceptance criteria:
```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/plan.mjs" --init   # creates a skeleton
```
Fill in Goal, Acceptance criteria, and Out of scope (edit the file directly).
Periodically — especially before declaring done — re-read it and check the work
still matches. If scope has grown beyond the plan, surface that to the user
rather than silently building more.
```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/plan.mjs" --show
```

## Worklog (cross-session memory) — `.claude/worklog.md`

Append decisions and dead ends so a future session doesn't repeat them:
```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/worklog.mjs" "tried X, failed because Y; using Z"
node "${CLAUDE_PLUGIN_ROOT}/scripts/worklog.mjs" --show 8
```

The SessionStart hook surfaces the plan goal + recent worklog automatically, so
you start each session with continuity instead of re-deriving context.

Keep entries short and honest. The value is in *why* something was chosen or
abandoned, not a play-by-play.
