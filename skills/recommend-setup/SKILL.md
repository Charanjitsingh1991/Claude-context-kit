---
name: recommend-setup
description: Recommend the context docs and ecosystem pieces (skills, MCP servers, plugins) a project should have, based on its actual stack, then generate the approved docs. Use when the user asks "what docs should this project have", "what skills/MCP/plugins should I add", "set this project up for Claude", or after detecting a new project. Token-light — runs a script and reports a short list instead of reasoning over the whole repo.
---

# Recommend Setup

Turn a detected stack into concrete, verifiable recommendations: which context
`.md` files to create, and which **categories** of skills / MCP servers / plugins
are worth adding.

## Procedure

1. Run the recommender (it reads `package.json` + marker files; cheap):
   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/scripts/recommend.mjs"
   ```
   It prints detected signals, recommended docs (flagging ones that already
   exist), and ecosystem categories.

2. Present the list to the user and let them pick. Do **not** auto-create files
   or auto-install anything.

3. For each **doc** the user approves, generate it using the matching template
   in the `scaffold-context` skill's `assets/` (ARCHITECTURE, CONVENTIONS, etc.),
   filled from real evidence — never invented. For docs without a template
   (e.g. `docs/data-model.md`), write a short, honest skeleton with `> TODO`
   markers rather than fabricated detail.

4. For **ecosystem** suggestions, these are categories, not endorsements:
   - For plugins: point the user to `/plugin marketplace` to find a current one.
   - For MCP servers: point them to the connector picker / MCP registry — these
     change often, so confirm what's actually available now. Do not hardcode a
     server name as if it's guaranteed to exist.
   - For skills: if it's a capability this kit or another installed plugin
     already provides, say so.

## Rules

- Recommendations are a starting point, not a mandate. Fewer, accurate docs beat
  many speculative ones.
- The mapping lives in `references/recommendations.json` — if the user's stack
  isn't covered well, suggest editing that file rather than hardcoding.
- Never claim a specific third-party plugin/MCP is current; always defer to the
  live marketplace/registry for exact names and availability.

After generating docs, suggest `/cartographer:map` so the new `ARCHITECTURE.md`
can reference an up-to-date `docs/nodes.md`.
