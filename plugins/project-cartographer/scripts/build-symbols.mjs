#!/usr/bin/env node
/**
 * build-symbols.mjs
 * ----------------------------------------------------------------------------
 * Builds a polyglot symbol index using universal-ctags and writes it to
 * .claude/project-map/symbols.json.
 *
 * WHY THIS EXISTS (the token argument):
 *   Without symbols, finding "the login handler" means grepping and reading
 *   whole files. With a symbol index, query.mjs can answer
 *   "loginHandler -> src/api/auth/route.ts:42" and Claude reads a ~40-line
 *   window instead of a 400-line file. That is the difference between hundreds
 *   and thousands of tokens for the same edit.
 *
 * This file is NEVER loaded into the model's context. query.mjs reads it from
 * disk and returns only a tiny shortlist, so its size does not cost tokens.
 *
 * Requirements: universal-ctags (NOT exuberant-ctags).
 *   macOS:   brew install universal-ctags
 *   Debian:  apt-get install universal-ctags
 *   Windows: choco install universal-ctags
 * Covers ~150 languages (TS/JS, C#, Python, Go, Rust, Java, ...).
 */

import { execSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const OUT_DIR = join(ROOT, ".claude", "project-map");
const OUT_JSON = join(OUT_DIR, "symbols.json");

const log = (...a) => console.error("[cartographer]", ...a);

function gitHead() {
  try {
    return execSync("git rev-parse HEAD", { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch { return null; }
}

// verify ctags is universal-ctags
try {
  const v = execSync("ctags --version", { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
  if (!/Universal Ctags/i.test(v)) {
    log("found ctags but it is not Universal Ctags. Install universal-ctags. Skipping symbol index.");
    process.exit(2); // soft-fail: the plugin still works without symbols
  }
} catch {
  log("ctags not found — skipping symbol index (navigation falls back to the dependency map).");
  process.exit(2);
}

const CANDIDATE_DIRS = ["src", "app", "lib", "server", "api", "packages", "apps", "components", "pages"];
let sourceDirs = CANDIDATE_DIRS.filter((d) => existsSync(join(ROOT, d)));
if (sourceDirs.length === 0) sourceDirs = ["."];

const EXCLUDES = ["node_modules", ".next", ".turbo", "dist", "build", "out", "coverage", ".git", "*.min.*", "*.d.ts"];
const excludeFlags = EXCLUDES.map((e) => `--exclude=${e}`).join(" ");
const cmd = `ctags -R --output-format=json --fields=+n --pseudo-tags= --map-TypeScript=+.tsx --map-JavaScript=+.jsx ${excludeFlags} ${sourceDirs.map((d) => `"${d}"`).join(" ")}`;

let raw;
try {
  raw = execSync(cmd, { cwd: ROOT, encoding: "utf8", maxBuffer: 256 * 1024 * 1024, stdio: ["ignore", "pipe", "ignore"] });
} catch (err) {
  log("ctags failed:", String(err.message || err).split("\n")[0]);
  process.exit(2);
}

// ctags emits one JSON object per line. Keep only real tags; compact keys to
// keep parsing fast (n=name, f=file, l=line, k=kind). Drop anonymous/noise.
const symbols = [];
for (const line of raw.split("\n")) {
  if (!line.trim()) continue;
  let t;
  try { t = JSON.parse(line); } catch { continue; }
  if (t._type !== "tag" || !t.name || !t.path) continue;
  if (/^(__anon|anonymous)/.test(t.name)) continue;
  symbols.push({ n: t.name, f: t.path.replace(/\\/g, "/"), l: t.line ?? 0, k: t.kind || "" });
}

symbols.sort((a, b) => (a.f === b.f ? a.l - b.l : a.f.localeCompare(b.f)));

const out = {
  schema: 1,
  generatedAt: new Date().toISOString(),
  gitHead: gitHead(),
  count: symbols.length,
  symbols,
};

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(OUT_JSON, JSON.stringify(out) + "\n", "utf8"); // not pretty-printed: file is read by scripts, not humans
log(`wrote ${OUT_JSON} (${symbols.length} symbols)`);
