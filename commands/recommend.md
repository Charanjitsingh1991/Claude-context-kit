---
description: Recommend the context docs and skills/MCP/plugins this project should have, based on its stack.
---

Use the `recommend-setup` skill:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/recommend.mjs"
```

Present the detected signals, the recommended docs (note which already exist),
and the ecosystem categories. Let the user choose what to generate. Do not
auto-create files or claim any third-party plugin/MCP is current — defer to the
live marketplace and the connector picker for exact names.
