#!/usr/bin/env node
/**
 * impact.mjs — "what breaks if I change this?"
 * Inverts the dependency graph and reports which nodes (transitively) depend on
 * a given node or file. Answers refactor-safety questions from the map alone,
 * with zero file reads.
 *
 * Usage: node impact.mjs <node-id-or-file-path>
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const MAP = join(ROOT, ".claude", "project-map", "project-map.json");
const target = process.argv.slice(2).join(" ").trim().replace(/\\/g, "/");

if (!target) { console.error("usage: impact.mjs <node-id-or-file-path>"); process.exit(1); }
if (!existsSync(MAP)) { console.log("No map. Run /cartographer:map."); process.exit(2); }
const map = JSON.parse(readFileSync(MAP, "utf8"));

// resolve a file path to its node id (longest matching node prefix)
function toNodeId(t) {
  if (map.nodes.some((n) => n.id === t)) return t;
  const matches = map.nodes
    .filter((n) => t === n.id || t.startsWith(n.id + "/"))
    .sort((a, b) => b.id.length - a.id.length);
  return matches[0]?.id ?? null;
}
const nodeId = toNodeId(target);
if (!nodeId) { console.log(`No node matches "${target}". See docs/nodes.md for node ids.`); process.exit(0); }

// reverse edges: who depends on X
const dependents = new Map();
for (const e of map.edges) {
  if (!dependents.has(e.to)) dependents.set(e.to, new Set());
  dependents.get(e.to).add(e.from);
}

// BFS upward
const seen = new Set();
const queue = [nodeId];
const direct = [...(dependents.get(nodeId) ?? [])];
while (queue.length) {
  const cur = queue.shift();
  for (const dep of dependents.get(cur) ?? []) {
    if (!seen.has(dep)) { seen.add(dep); queue.push(dep); }
  }
}

console.log(`Impact of changing "${nodeId}":`);
console.log(`  Direct dependents (${direct.length}): ${direct.length ? direct.join(", ") : "none"}`);
const transitive = [...seen].filter((n) => !direct.includes(n));
console.log(`  Transitive dependents (${transitive.length}): ${transitive.length ? transitive.join(", ") : "none"}`);
if (seen.size === 0) console.log("  Nothing depends on this node — change is locally contained.");
console.log("Note: edges are module-level. Confirm exact call sites by reading the dependent files.");
