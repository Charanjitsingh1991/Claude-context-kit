#!/usr/bin/env node
/**
 * worklog.mjs — append-only decision log / session memory (#5).
 *   node worklog.mjs "tried X, failed because Y; using Z instead"   # append
 *   node worklog.mjs --show [N]                                     # last N (default 8)
 * Lives at .claude/worklog.md so it's committable and survives sessions.
 */
import { existsSync, mkdirSync, appendFileSync, readFileSync } from "node:fs";
import { join } from "node:path";
const ROOT = process.cwd();
const FILE = join(ROOT, ".claude", "worklog.md");
const argv = process.argv.slice(2);

if (argv[0] === "--show") {
  if (!existsSync(FILE)) { console.log("No worklog yet."); process.exit(0); }
  const n = Number(argv[1]) || 8;
  const lines = readFileSync(FILE, "utf8").split("\n").filter((l) => l.startsWith("- "));
  console.log(lines.slice(-n).join("\n") || "No entries.");
  process.exit(0);
}
const entry = argv.join(" ").trim();
if (!entry) { console.error('usage: worklog.mjs "<entry>"  |  worklog.mjs --show [N]'); process.exit(1); }
mkdirSync(join(ROOT, ".claude"), { recursive: true });
if (!existsSync(FILE)) appendFileSync(FILE, "# Worklog\n\nAppend-only record of decisions, dead ends, and why. Newest at the bottom.\n\n");
appendFileSync(FILE, `- ${new Date().toISOString().slice(0, 16).replace("T", " ")} — ${entry}\n`);
console.log("Logged.");
