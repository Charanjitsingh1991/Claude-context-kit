---
name: verify-api
description: Confirm a library's API actually exists in the INSTALLED version before using it, by reading the .d.ts that ships in node_modules. Use this whenever you're about to call a method, import, or option from a third-party package and aren't certain it exists in the version this project has — especially for fast-moving libraries. Prevents the single most common agent error: hallucinating an API from a different version.
---

# Verify API

Do not trust your memory of a library's API — versions drift. Check the ground
truth that's already on disk: the installed package's type definitions.

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/api-check.mjs" <package> [symbol]
```

- `api-check.mjs next` → installed version + top-level exports.
- `api-check.mjs next redirect` → does `redirect` exist in the installed version?

Interpreting results:
- **YES** — safe to use.
- **NOT FOUND** with no re-exports — treat as real; check spelling/casing or read
  the `.d.ts`. Don't use it on faith.
- **UNCERTAIN** (package re-exports from submodules) — open the named submodule
  `.d.ts` to confirm before using.
- **not installed** — never assume the API; install or ask first.

Use this proactively before writing code against any dependency whose exact API
you're not certain of in *this* project's version. It's offline, fast, and
exact for the version in the lockfile.
