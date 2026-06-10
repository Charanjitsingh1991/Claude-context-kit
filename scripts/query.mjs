#!/usr/bin/env node
/**
 * query.mjs  —  the token-saving router
 * ----------------------------------------------------------------------------
 * Usage:
 *   node query.mjs "add rate limiting to the login flow"
 *   node query.mjs --json --limit 6 "where is the checkout total computed"
 *
 * Reads .claude/project-map/{project-map.json,symbols.json} FROM DISK, ranks
 * against the task with cheap lexical scoring, and prints only the few files
 * (with line numbers) worth opening. The indexes never enter the model's
 * context, so routing cost is ~constant regardless of repo size.
 *
 * Degrades gracefully:
 *   - symbols.json present  -> precise file:line targets
 *   - only project-map.json -> node/path-level targets
 *   - neither               -> instructs how to build the map
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const DIR = join(ROOT, ".claude", "project-map");

const argv = process.argv.slice(2);
const asJson = argv.includes("--json");
let LIMIT = 6;
const taskParts = [];
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === "--json") continue;
  if (a === "--limit") { LIMIT = Number(argv[++i]) || 6; continue; }
  taskParts.push(a);
}
const task = taskParts.join(" ").trim();

if (!task) { console.error("usage: query.mjs [--json] [--limit N] \"<task>\""); process.exit(1); }

const STOP = new Set("the a an to of in on for and or with into from add new fix update change make build create implement support handle".split(" "));
function terms(s) {
  return [...new Set(s.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 2 && !STOP.has(w)))];
}
const T = terms(task);

// layer hints: certain task words bias toward layers
const LAYER_HINTS = {
  ui: ["page", "component", "button", "form", "screen", "view", "modal", "style", "layout", "render"],
  api: ["endpoint", "route", "handler", "request", "response", "auth", "login", "logout", "token", "webhook", "rate"],
  data: ["schema", "model", "migration", "query", "table", "prisma", "db", "repository", "cache", "redis"],
  domain: ["service", "logic", "rule", "workflow", "usecase", "calculate", "compute", "process"],
};
const layerBias = {};
for (const [layer, words] of Object.entries(LAYER_HINTS)) {
  layerBias[layer] = words.some((w) => T.includes(w)) ? 1 : 0;
}

function load(name) {
  const p = join(DIR, name);
  if (!existsSync(p)) return null;
  try { return JSON.parse(readFileSync(p, "utf8")); } catch { return null; }
}
const map = load("project-map.json");
const sym = load("symbols.json");

if (!map && !sym) {
  console.log("No project map found. Run: /cartographer:map  (builds project-map.json + symbols.json)");
  process.exit(0);
}

const pathTokens = (f) => f.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);

// ---- score symbols ---------------------------------------------------------
const KIND_BOOST = { function: 3, method: 3, class: 3, interface: 2, route: 3, struct: 2, constant: 1, variable: 0.5, member: 0.5 };
let symHits = [];
if (sym?.symbols) {
  for (const s of sym.symbols) {
    const name = s.n.toLowerCase();
    const nameTokens = name.split(/(?=[A-Z])|[^a-zA-Z0-9]+/).map((x) => x.toLowerCase()).filter(Boolean);
    let score = 0;
    for (const t of T) {
      if (name === t) score += 6;                       // exact symbol name
      else if (nameTokens.includes(t)) score += 4;      // token of camelCase name
      else if (name.includes(t)) score += 2;            // substring
    }
    if (score === 0) continue;
    const pt = pathTokens(s.f);
    for (const t of T) if (pt.includes(t)) score += 1;  // path corroboration
    score += KIND_BOOST[s.k] ?? 0;
    symHits.push({ ...s, score });
  }
  symHits.sort((a, b) => b.score - a.score || a.f.localeCompare(b.f));
}

// ---- score nodes -----------------------------------------------------------
let nodeHits = [];
if (map?.nodes) {
  for (const n of map.nodes) {
    const pt = pathTokens(n.id).concat(n.entrypoints.flatMap(pathTokens));
    let score = 0;
    for (const t of T) if (pt.includes(t)) score += 3;
    for (const t of T) if (pt.some((p) => p.includes(t))) score += 1;
    score += (layerBias[n.layer] || 0) * 2;
    if (score === 0) continue;
    nodeHits.push({ ...n, score });
  }
  nodeHits.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
}

// ---- assemble a tiny result ------------------------------------------------
const topSyms = symHits.slice(0, LIMIT);
const topNodes = nodeHits.slice(0, 4);

// files to read: dedupe symbol files first, then top node entrypoints
const readSet = new Map(); // file -> {lines:Set, why:Set}
for (const s of topSyms) {
  if (!readSet.has(s.f)) readSet.set(s.f, { lines: new Set(), why: new Set() });
  readSet.get(s.f).lines.add(s.l);
  readSet.get(s.f).why.add(`${s.k || "sym"} ${s.n}`);
}
// Add node-level entrypoints ONLY when symbol hits are sparse. When we already
// have precise symbol targets, padding with sibling files from the same coarse
// node just adds noise (and tokens).
if (topSyms.length === 0) {
  for (const n of topNodes) {
    for (const ep of n.entrypoints.slice(0, 2)) {
      if (!readSet.has(ep)) readSet.set(ep, { lines: new Set(), why: new Set() });
      readSet.get(ep).why.add(`node ${n.id}`);
    }
  }
}

// ripple: include data/lib deps of the top node (only as "related")
const related = new Set();
if (topNodes[0]) for (const d of topNodes[0].dependsOn) related.add(d);

const result = {
  task,
  indexes: { map: !!map, symbols: !!sym, symbolCount: sym?.count ?? 0 },
  read: [...readSet.entries()].slice(0, LIMIT).map(([f, v]) => ({
    file: f,
    lines: [...v.lines].sort((a, b) => a - b),
    why: [...v.why],
  })),
  relatedNodes: [...related],
  confident: topSyms.length > 0 || topNodes.length > 0,
};

if (asJson) { console.log(JSON.stringify(result, null, 2)); process.exit(0); }

// compact human/Claude-readable output (small on purpose)
const out = [];
out.push(`Targets for: "${task}"`);
if (!result.confident) {
  out.push("No strong match. Either the map is stale (run /cartographer:map) or describe the task differently.");
} else {
  out.push(`Read these (narrowed using ${result.indexes.symbols ? "symbol index" : "dependency map"}; read ~40 lines around each line number):`);
  for (const r of result.read) {
    const where = r.lines.length ? `:${r.lines.join(",")}` : "";
    out.push(`  - ${r.file}${where}   [${r.why.slice(0, 3).join("; ")}]`);
  }
  if (result.relatedNodes.length) {
    out.push(`Related (open only if the change ripples): ${result.relatedNodes.join(", ")}`);
  }
}
out.push("Note: this narrows the search. Read the actual files before editing — the files are the source of truth, not the map.");
console.log(out.join("\n"));
