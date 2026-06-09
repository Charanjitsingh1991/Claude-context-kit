#!/usr/bin/env node
/**
 * session-start.mjs — SessionStart hook. Prints a SMALL digest to stdout, which
 * Claude Code adds to context: current plan goal, last few worklog entries, and
 * map freshness. Gives continuity without re-reading the repo. Fails silent.
 */
import { existsSync, readFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = process.cwd();
const out = [];
try {
  const plan = join(ROOT, ".claude", "plan.md");
  if (existsSync(plan)) {
    const lines = readFileSync(plan, "utf8").split("\n");
    const i = lines.findIndex((l) => /^##\s*Goal/i.test(l));
    if (i >= 0) {
      let g = null;
      for (const l of lines.slice(i + 1)) {
        if (/^#{1,6}\s/.test(l)) break;            // next heading -> stop
        if (l.trim() && !l.startsWith(">")) { g = l.trim(); break; } // skip blockquote placeholder
      }
      if (g) out.push(`Plan goal: ${g}`);
    }
  }
  const wl = join(ROOT, ".claude", "worklog.md");
  if (existsSync(wl)) {
    const lines = readFileSync(wl, "utf8").split("\n").filter((l) => l.startsWith("- ")).slice(-3);
    if (lines.length) out.push("Recent worklog:\n" + lines.join("\n"));
  }
  if (existsSync(join(ROOT, ".claude", "project-map", "project-map.json"))) {
    try {
      const r = execSync(`node "${join(HERE, "check.mjs")}"`, { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
      out.push(r.trim().split("\n")[0]);
    } catch {}
  }
} catch {}
if (out.length) console.log("[cartographer] session digest\n" + out.join("\n"));
