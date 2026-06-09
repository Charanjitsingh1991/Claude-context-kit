#!/usr/bin/env node
/**
 * recommend.mjs — reads the project's package.json + marker files, detects stack
 * signals, and reports which context docs to create and which ecosystem pieces
 * (skills / MCP servers / plugins) are worth adding.
 *
 * Non-destructive: it only REPORTS. The recommend-setup skill writes the files
 * the user approves. Ecosystem items are categories to verify against the live
 * marketplace/registry — this script never claims a package is current.
 *
 * The mapping lives in references/recommendations.json (edit it freely).
 * Pass the recommendations file path as argv[1], or rely on the default beside
 * this script's skill.
 */
import { existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = process.cwd();
const HERE = dirname(fileURLToPath(import.meta.url));
const recPath = process.argv[2]
  || join(HERE, "..", "skills", "recommend-setup", "references", "recommendations.json");

function readJson(p) { try { return JSON.parse(readFileSync(p, "utf8")); } catch { return null; } }

const rec = readJson(recPath);
if (!rec) { console.error(`could not read recommendations.json at ${recPath}`); process.exit(1); }

// gather dependencies
const pkg = readJson(join(ROOT, "package.json")) || {};
const deps = new Set(Object.keys({ ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) }));

// detect active signals
const active = [];
for (const [sig, def] of Object.entries(rec.signals)) {
  const depHit = (def.deps || []).some((d) => deps.has(d));
  const fileHit = (def.files || []).some((f) => existsSync(join(ROOT, f)));
  if (depHit || fileHit) active.push(sig);
}

// collect docs (dedupe by path; flag existing)
const docMap = new Map();
for (const d of rec.docs.always || []) docMap.set(d.path, d.why);
for (const sig of active) for (const d of rec.docs.bySignal?.[sig] || []) docMap.set(d.path, d.why);

// collect ecosystem
const eco = { mcp: new Map(), plugins: new Map(), skills: new Map() };
for (const sig of active) {
  const e = rec.ecosystem.bySignal?.[sig];
  if (!e) continue;
  for (const k of ["mcp", "plugins", "skills"]) for (const item of e[k] || []) eco[k].set(item, sig);
}

// ---- report (compact) ------------------------------------------------------
const L = [];
L.push(`Detected signals: ${active.length ? active.join(", ") : "none (sparse package.json — verify manually)"}`);
L.push("");
L.push("Recommended context docs:");
for (const [path, why] of docMap) {
  const tag = existsSync(join(ROOT, path)) ? " (exists — review/update)" : "";
  L.push(`  - ${path}${tag}  — ${why}`);
}
const ecoEmpty = eco.mcp.size + eco.plugins.size + eco.skills.size === 0;
L.push("");
L.push("Recommended ecosystem (verify against the live marketplace / MCP registry):");
if (ecoEmpty) {
  L.push("  - none matched; consider a general PR-review or frontend-design plugin if relevant");
} else {
  for (const [item, sig] of eco.mcp) L.push(`  - MCP:    ${item}   [${sig}]`);
  for (const [item, sig] of eco.plugins) L.push(`  - Plugin: ${item}   [${sig}]`);
  for (const [item, sig] of eco.skills) L.push(`  - Skill:  ${item}   [${sig}]`);
}
L.push("");
L.push(rec.ecosystem.verify);
console.log(L.join("\n"));
