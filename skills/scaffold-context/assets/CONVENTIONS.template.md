# Conventions

The non-obvious rules. If it's standard and a linter enforces it, leave it out —
this file is for what a new contributor (or Claude) would otherwise get wrong.

## Code

- <e.g. Mutations go through server actions, not route handlers.>
- <e.g. No `any`. Use `unknown` + a type guard.>
- <e.g. DB access only via `src/data/*` repositories.>

## Naming & structure

- <e.g. Files kebab-case; React components PascalCase.>
- <e.g. One feature = one folder under `src/features/<name>`.>

## Errors & validation

- <e.g. Validate all inputs at the boundary with zod; never trust client data.>
- <e.g. API errors return a typed shape `{ error: { code, message } }`.>

## Dependencies

- <e.g. Package manager is pnpm; do not commit other lockfiles.>
- <e.g. Adding a dependency requires a one-line justification in the PR.>

## Third-party APIs that drift

- <e.g. `lenis/react`, `next-sanity` export paths change across minors — verify
  against current docs before editing imports; log deviations in BUILD_NOTES.md.>

## Don't

- <e.g. Don't edit `generated/` or `*.d.ts` by hand.>
- <e.g. Don't add new env vars without registering them in `src/config/env.ts`.>
