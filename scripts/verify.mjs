#!/usr/bin/env node
/**
 * verify.mjs — "prove it works", scoped to the change (#1)
 * ----------------------------------------------------------------------------
 * Runs only the checks relevant to what changed, instead of the whole suite
 * (which is slow/expensive enough that an agent skips it and guesses):
 *   1. type-check  (project's `typecheck` script, else `tsc --noEmit`)
 *   2. lint        (eslint, only on changed source files)
 *   3. related tests (vitest related / jest --findRelatedTests on changed files)
 *
 * Only runs a tool if it's actually installed in node_modules/.bin — never
 * triggers an npx network fetch, never fails spuriously for a missing tool.
 *
 * Exit 0 = all run checks passed (or nothing to verify); 1 = something failed.
 * Pair with impact.mjs: changed node -> impacted nodes -> their tests.
 */
import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const BIN = join(ROOT, "node_modules", ".bin");
const has = (tool) => existsSync(join(BIN, tool)) || existsSync(join(BIN, tool + ".cmd"));
const log = (...a) => console.log(...a);

function sh(cmd) {
  try {
    const out = execSync(cmd, { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: 64 * 1024 * 1024 });
    return { ok: true, out };
  } catch (e) {
    return { ok: false, out: (e.stdout || "") + (e.stderr || "") };
  }
}
function git(cmd) { try { return execSync(`git ${cmd}`, { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim(); } catch { return ""; } }

const SRC = /\.([cm]?[jt]sx?|vue)$/i;
const VENDOR = /(^|\/)(node_modules|dist|build|out|coverage|\.next|\.turbo|\.git)\//;
const changed = [...new Set([
  ...git("diff --name-only HEAD").split("\n"),
  ...git("ls-files --others --exclude-standard").split("\n"),
].filter((f) => f && SRC.test(f) && !VENDOR.test(f) && existsSync(join(ROOT, f))))];

if (changed.length === 0) { log("Nothing to verify — no changed source files vs HEAD."); process.exit(0); }
log(`Changed source files (${changed.length}): ${changed.slice(0, 10).join(", ")}${changed.length > 10 ? ", ..." : ""}\n`);

const pkg = existsSync(join(ROOT, "package.json")) ? JSON.parse(execSync(`cat ${join(ROOT, "package.json")}`).toString()) : {};
const scripts = pkg.scripts || {};
const results = [];
function record(name, r, tail = 12) {
  results.push({ name, ok: r.ok });
  log(`${r.ok ? "PASS" : "FAIL"}  ${name}`);
  if (!r.ok) log(r.out.split("\n").slice(-tail).join("\n"));
}
const quoted = changed.map((f) => `"${f}"`).join(" ");

// 1. typecheck
if (scripts.typecheck) record("typecheck (npm script)", sh(`npm run -s typecheck`));
else if (existsSync(join(ROOT, "tsconfig.json")) && has("tsc")) record("typecheck (tsc --noEmit)", sh(`"${join(BIN, "tsc")}" --noEmit`));
else log("SKIP  typecheck (no `typecheck` script and no tsc installed)");

// 2. lint (changed files only)
if (has("eslint")) record("eslint (changed files)", sh(`"${join(BIN, "eslint")}" ${quoted}`));
else log("SKIP  eslint (not installed)");

// 3. related tests
if (has("vitest")) record("vitest related", sh(`"${join(BIN, "vitest")}" related ${quoted} --run`));
else if (has("jest")) record("jest --findRelatedTests", sh(`"${join(BIN, "jest")}" --findRelatedTests ${quoted} --passWithNoTests`));
else log("SKIP  tests (no vitest/jest installed)");

const failed = results.filter((r) => !r.ok);
log("");
if (results.length === 0) { log("No runnable checks found. Install eslint/tsc/vitest or add a `typecheck` script to get verification."); process.exit(0); }
if (failed.length) { log(`VERIFY FAILED — ${failed.map((f) => f.name).join(", ")}. Fix before claiming done.`); process.exit(1); }
log(`VERIFY PASSED — ${results.length} check(s) on ${changed.length} changed file(s).`);
