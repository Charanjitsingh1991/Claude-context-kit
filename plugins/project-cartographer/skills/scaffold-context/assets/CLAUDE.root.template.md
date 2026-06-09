# <PROJECT_NAME>

<One sentence: what this is and who it's for.>

## Stack

- Language/runtime: <e.g. TypeScript / Node 20>
- Framework: <e.g. Next.js 15 App Router>
- Package manager: <from lockfile>
- Data: <e.g. Prisma + PostgreSQL, or "none">

## Commands

> Copy these verbatim from package.json scripts. Do not invent.

```bash
<install>      # e.g. pnpm install
<dev>          # e.g. pnpm dev
<test>         # e.g. pnpm test
<build>        # e.g. pnpm build
<lint>         # e.g. pnpm lint
```

## How the code is organized

See `@docs/nodes.md` for the module map and dependency graph.
Area-specific rules live in nested `CLAUDE.md` files.

## Project conventions (the non-obvious rules)

- <e.g. Mutations go through server actions, not route handlers.>
- <e.g. All DB access is via the repository layer in `src/data` — never import Prisma in UI.>
- <e.g. Env vars are validated in `src/config/env.ts`; add new ones there.>

## Gotchas

- <e.g. `lenis/react` export path is unstable across minor versions — verify against current docs before changing imports; log deviations in BUILD_NOTES.md.>

## Do not

- <e.g. Do not edit files in `generated/`.>
- <e.g. Do not add dependencies without updating the lockfile via pnpm.>
