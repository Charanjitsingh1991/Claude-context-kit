#!/usr/bin/env node
/**
 * check.mjs — cheap staleness signal.
 * Compares the gitHead recorded in the map against the current repo state and
 * lists source files that changed since the map was built. Prints a one-line
 * verdict so Claude can decide whether to trust the map or regenerate.
 * Exit code: 0 = fresh, 3 = stale, 2 = no map.
 */
import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const MAP = join(ROOT, ".claude", "project-map", "project-map.json");

if (!existsSync(MAP)) { console.log("No map. Run /cartographer:map."); process.exit(2); }
const map = JSON.parse(readFileSync(MAP, "utf8"));

function git(cmd) {
  try { return execSync(`git ${cmd}`, { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim(); }
  catch { return null; }
}
const head = git("rev-parse HEAD");

if (!head || !map.gitHead) {
  console.log("Not a git repo (or map predates git tracking) — cannot auto-check. Regenerate if code changed.");
  process.exit(0);
}

const SRC = /\.([cm]?[jt]sx?|vue|cs|py|go|rs|java)$/i;
let changed = [];
if (head !== map.gitHead) {
  changed = (git(`diff --name-only ${map.gitHead} HEAD`) || "").split("\n").filter((f) => SRC.test(f));
}
const dirty = (git("status --porcelain") || "").split("\n").map((l) => l.slice(3)).filter((f) => SRC.test(f));
const all = [...new Set([...changed, ...dirty])].filter(Boolean);

if (all.length === 0) {
  console.log(`Map is FRESH (built at ${map.gitHead.slice(0, 8)}, HEAD ${head.slice(0, 8)}).`);
  process.exit(0);
}
console.log(`Map may be STALE — ${all.length} source file(s) changed since it was built:`);
for (const f of all.slice(0, 20)) console.log("  " + f);
if (all.length > 20) console.log(`  ...and ${all.length - 20} more`);
console.log("Run /cartographer:map to refresh.");
process.exit(3);
