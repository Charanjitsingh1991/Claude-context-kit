#!/usr/bin/env node
/**
 * plan.mjs — current task plan + acceptance criteria (#4 drift control).
 *   node plan.mjs --show     # print the plan
 *   node plan.mjs --init     # create a skeleton if none exists
 * The agent edits .claude/plan.md with the normal Write tool; this just
 * surfaces it cheaply (e.g. from the SessionStart digest).
 */
import { existsSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { join } from "node:path";
const ROOT = process.cwd();
const FILE = join(ROOT, ".claude", "plan.md");
const cmd = process.argv[2] || "--show";

if (cmd === "--init") {
  if (existsSync(FILE)) { console.log("plan.md already exists."); process.exit(0); }
  mkdirSync(join(ROOT, ".claude"), { recursive: true });
  writeFileSync(FILE, "# Plan\n\n## Goal\n> One sentence: what we're building this session.\n\n## Acceptance criteria\n- [ ] \n- [ ] \n\n## Out of scope\n- \n\n## Notes\n- \n");
  console.log("Created .claude/plan.md — fill in Goal + acceptance criteria.");
  process.exit(0);
}
if (!existsSync(FILE)) { console.log("No plan yet. Run `plan.mjs --init` or create .claude/plan.md."); process.exit(0); }
console.log(readFileSync(FILE, "utf8"));
