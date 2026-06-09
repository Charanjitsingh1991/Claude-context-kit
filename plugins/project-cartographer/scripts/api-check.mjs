#!/usr/bin/env node
/**
 * api-check.mjs — ground-truth API surface from INSTALLED types (#2)
 * ----------------------------------------------------------------------------
 * The most common concrete error an agent makes is calling a library API that
 * doesn't exist *in the installed version*. The fix is offline and exact: read
 * the .d.ts that ships in node_modules for the version in the lockfile.
 *
 * Usage:
 *   node api-check.mjs <package> [symbol]
 *   node api-check.mjs zod            # version + top exported names
 *   node api-check.mjs zod z          # does `z` exist? (yes/no)
 *
 * Best-effort: it scans the package's declared type entrypoint and its
 * top-level export statements. Barrel/re-export files mean a "not found" is a
 * weak signal — confirm by reading the .d.ts. A "found" is reliable.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const [pkg, symbol] = process.argv.slice(2);
if (!pkg) { console.error("usage: api-check.mjs <package> [symbol]"); process.exit(1); }

const dir = join(ROOT, "node_modules", pkg);
if (!existsSync(dir)) {
  console.log(`"${pkg}" is not installed in ./node_modules. Install it first, then re-check — do not assume its API.`);
  process.exit(2);
}

const meta = JSON.parse(readFileSync(join(dir, "package.json"), "utf8"));
const version = meta.version;

// resolve the types entrypoint
function typesEntry() {
  if (meta.types || meta.typings) return meta.types || meta.typings;
  // exports map may carry a "types" condition
  const ex = meta.exports;
  if (ex && typeof ex === "object") {
    const root = ex["."] || ex;
    const t = root?.types || root?.import?.types || root?.require?.types;
    if (typeof t === "string") return t;
  }
  if (existsSync(join(dir, "index.d.ts"))) return "index.d.ts";
  // fall back to first top-level .d.ts
  const dts = readdirSync(dir).find((f) => f.endsWith(".d.ts"));
  return dts || null;
}

const entry = typesEntry();
if (!entry) {
  console.log(`${pkg}@${version}: no TypeScript types found (no "types" field, no index.d.ts). This package may ship runtime-only; verify its API from its docs/source.`);
  process.exit(0);
}

const entryPath = join(dir, entry);
let src = "";
try { src = readFileSync(entryPath, "utf8"); } catch {
  console.log(`${pkg}@${version}: declared types at "${entry}" but could not read them.`);
  process.exit(0);
}

// extract top-level exported names (best-effort)
const names = new Set();
// export (declare) function/const/class/interface/type/enum NAME
for (const m of src.matchAll(/export\s+(?:declare\s+)?(?:abstract\s+)?(?:function|const|let|var|class|interface|type|enum|namespace)\s+([A-Za-z_$][\w$]*)/g)) names.add(m[1]);
// export { a, b as c }
for (const m of src.matchAll(/export\s*\{([^}]*)\}/g)) {
  for (const part of m[1].split(",")) {
    const name = part.trim().split(/\s+as\s+/i).pop()?.trim();
    if (name) names.add(name);
  }
}
// export default
if (/export\s+default\b/.test(src)) names.add("default");
// export * from "..."  -> note re-exports
const reexports = [...src.matchAll(/export\s+\*\s+from\s+['"]([^'"]+)['"]/g)].map((m) => m[1]);

const list = [...names].sort();

if (symbol) {
  const has = names.has(symbol);
  if (has) {
    console.log(`YES — "${symbol}" is exported by ${pkg}@${version} (in ${entry}).`);
  } else if (reexports.length) {
    console.log(`UNCERTAIN — "${symbol}" not found directly in ${entry}, but ${pkg}@${version} re-exports from: ${reexports.join(", ")}. Read those .d.ts to confirm before using "${symbol}".`);
  } else {
    console.log(`NOT FOUND — "${symbol}" is not a top-level export of ${pkg}@${version}. Check spelling/casing, or read ${entry} directly. Do not assume it exists.`);
  }
  process.exit(0);
}

console.log(`${pkg}@${version} — types: ${entry}`);
console.log(`Top-level exports (${list.length}): ${list.slice(0, 60).join(", ")}${list.length > 60 ? ", ..." : ""}`);
if (reexports.length) console.log(`Re-exports from: ${reexports.join(", ")} (more API lives there)`);
