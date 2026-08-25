---
name: init-agent
description: Bootstrap one canonical .agents tree into Cursor, Claude, and Codex folders.
---

# init-agent

From the repository root, ensure `.agents/skills`, `.agents/commands`, and `.agents/rules` exist, then run:

```sh
bash .agents/skills/init-agent/scripts/init-agent.sh
```

The script creates relative symlinks for each agent tool and `CLAUDE.md -> AGENTS.md`. It refuses to replace real files or directories.
