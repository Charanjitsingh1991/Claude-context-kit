# Benchmark: project-cartographer vs. vanilla Claude Code

This document gives you everything to **reproduce the head-to-head yourself** — the test repo, the 8 traps, the exact prompts, and how to read the results. We'd rather you run it than trust our screenshot.

## TL;DR

On a 151-file SaaS codebase with 8 planted navigation traps, both vanilla Claude Code and Cartographer reached **correct answers on all 8 tasks**. The difference was cost and depth:

- **Vanilla** found files by exploration: grep → open → re-grep → open again. Worst case: **62 tool calls / 47k tokens / 5m39s** on one task.
- **Cartographer** routed to the correct `file:line` **first**, in **17–31 seconds** per task, and — because it wasn't burning budget on navigation — surfaced **real secondary bugs** the vanilla run passed over.

**This is n=1, single-model, author-run.** It is a demonstration you can reproduce, not a statistical study. Numbers will vary by model, machine, and Claude Code version. If you run it, please [open an issue](https://github.com/Charanjitsingh1991/claude-context-kit/issues) with your results.

---

## Test environment

| Item | Value |
|------|-------|
| Model | Claude Sonnet 4.6 |
| Claude Code | v2.1.170 |
| Benchmark repo | [`saas-platform-benchmark`](https://github.com/Charanjitsingh1991/saas-platform-benchmark) (151 files) |
| Stack | Next.js 15 (App Router), TypeScript strict, Prisma + PostgreSQL, NextAuth 5, Stripe, Redis + BullMQ, Vitest |
| Symbol index | universal-ctags (530 symbols indexed) |
| Map | 19 module nodes, 23 dependency edges |

---

## Method

1. Clone the benchmark repo **twice** into separate folders (so file edits in one run don't pollute the other).
2. **Run A (vanilla):** open one copy in Claude Code, run the 8 task prompts in order.
3. **Run B (cartographer):** in the *other* copy, install the plugin, run `/project-cartographer:init` once, then run the same 8 tasks via `/project-cartographer:find`.
4. For each task, record: which file it opened first, total files read, tool calls, tokens, wall-clock time, and whether the final answer was correct.

> **Fairness notes.** Same model and settings for both runs. Each run uses a *fresh* copy of the repo. The traps were designed *before* either run. The prompts are identical in intent; the Cartographer run wraps them in `/find` because that's the plugin's actual interface.

---

## The 8 traps

Each trap mimics a real-world navigation hazard. The "correct target" is the file a senior engineer familiar with the codebase would go to directly.

| # | Task prompt | The trap | Correct target |
|---|-------------|----------|----------------|
| 1 | "Add a check to the dashboard that redirects to /billing if the subscription is expired. Use the session to get the team ID." | Three `getSession`-like functions exist; two are decoys (one deprecated, one client-only) | `src/lib/session/index.ts` |
| 2 | "The invoice email shows the wrong amount. The test is failing. Fix the formatter used for invoice generation." | **Three** different `formatCurrency` functions — cents vs. dollars, usd vs. USD | `src/domains/billing/index.ts` |
| 3 | "Password reset emails are not being sent. Debug the send path." | Email logic is split across `services/email`, `lib/email`, and a deleted `lib/mailer`; four files named `index.ts` | `src/services/email/index.ts` |
| 4 | "Add stricter rate limiting to the login endpoint — max 5 attempts per 15 min per IP." | The limit is defined in two places that can drift; no middleware file exists | `src/lib/rate-limit/index.ts` |
| 5 | "Feature flags return stale values after we update them. The cache isn't being busted." | Three resolution strategies (db/redis/env); the bug is one strategy + a missing invalidation call | `src/lib/feature-flags/strategies/redis.ts` |
| 6 | "When a subscription is canceled by Stripe, the team plan should revert to starter immediately." | A 3-hop path: webhook route → billing service → billing domain | `src/services/billing/index.ts` |
| 7 | "Add audit logging when a team member is removed. Make sure it's stored in the database." | An audit *logger* and a generic *logger* both exist; only one writes to the DB | `src/domains/audit/index.ts` |
| 8 | "Welcome emails aren't sent to new users. Find where the job is enqueued and why it might be silently failing." | A 3-hop queue path; an invitation email is mis-routed to the welcome queue | `src/services/email/index.ts` → `src/lib/queue` |

---

## Results

### Per-task summary

| # | Vanilla — path to answer | Cartographer — first target | Correct (both) |
|---|--------------------------|------------------------------|----------------|
| 1 | 3 files explored | `session/index.ts:15` (+ named 2 decoys) | ✅ |
| 2 | 4 files, 2 search rounds | `domains/billing/index.ts:49` (+ mapped all 3) | ✅ |
| 3 | **62 tool calls, 47k tokens, 5m39s** | `services/email/index.ts:20` in **~17s** | ✅ |
| 4 | 5 files, 3 glob searches | `rate-limit/index.ts:57` (+ flagged drift) | ✅ |
| 5 | 4 files | `feature-flags/strategies/redis.ts:4` | ✅ |
| 6 | 3 files | `services/billing/index.ts:58` (+ found race) | ✅ |
| 7 | 7 files | `domains/audit/index.ts:14` | ✅ |
| 8 | 5 files, 2 rounds | `services/email/index.ts:12` (+ found 3 bugs) | ✅ |

### Secondary bugs Cartographer surfaced

Because it wasn't spending its budget locating files, the Cartographer run had room to reason about what it read, and flagged issues the prompts didn't even ask about:

- **Unused templates** — `passwordResetTemplate` and `welcomeTemplate` defined but never called; markup duplicated inline instead.
- **Wrong queue name** — `sendInvitationEmail` enqueues to `"send-welcome-email"`, so invitations silently send welcome content.
- **Cache inconsistency** — `getAllFlags()` always hits the DB even when the team is on the redis strategy.
- **Race condition** — user-cancel (delayed worker) and Stripe webhook both write `planTier`, with no dedup guard.
- **Config drift** — `AUTH_RATE_LIMIT` in `presets.ts` duplicates `RATE_LIMITS.auth`; changing one silently leaves the other stale.

---

## Reproduce it yourself

```bash
# 1. Clone the benchmark repo twice
git clone https://github.com/Charanjitsingh1991/saas-platform-benchmark vanilla-run
git clone https://github.com/Charanjitsingh1991/saas-platform-benchmark cartographer-run

# 2. RUN A — vanilla. Open vanilla-run in Claude Code and run the 8 prompts above, in order.
#    Record first-file-opened, tool calls, and time for each.

# 3. RUN B — cartographer. Open cartographer-run in Claude Code:
/plugin marketplace add https://github.com/Charanjitsingh1991/claude-context-kit.git
/plugin install project-cartographer@claude-context-kit
/reload-plugins
/project-cartographer:init
#    Then run each task with /project-cartographer:find "<task>"
```

Compare the two transcripts side by side. The thing to watch is **how many files each opens before it finds the right one**, and **how much budget is left over to actually reason.**

---

## Limitations & threats to validity

We're listing these so you don't have to find them in the comments:

- **n=1.** One run per setup. No variance, no averaging across seeds. Re-running may shift exact numbers.
- **Author-run.** The benchmark was executed by the plugin's author. The traps were designed to reflect real hazards, but we built both the test and the tool.
- **Single model.** Sonnet 4.6 only. A stronger or weaker model changes the vanilla baseline.
- **Synthetic repo.** 151 files is mid-sized and the traps are deliberate. Your codebase will differ.
- **Token counts** for the vanilla run are read from Claude Code's own per-task reporting, not an independent meter.

What we're confident in despite the above: the *mechanism* is sound. Querying a pre-built index off disk is structurally cheaper than re-deriving structure from grep every task — and that gap widens as the repo grows. The benchmark illustrates the mechanism; it doesn't need to be a clinical trial to be useful.

---

*Found a flaw in this methodology? [Open an issue](https://github.com/Charanjitsingh1991/claude-context-kit/issues) — we'll fix the doc or the tool.*
