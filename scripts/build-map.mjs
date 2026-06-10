#!/usr/bin/env node
/**
 * build-map.mjs
 * ----------------------------------------------------------------------------
 * Deterministically builds a coarse-grained module dependency graph of the
 * current project and writes it to .claude/project-map/project-map.json.
 *
 * This is the SOURCE OF TRUTH. docs/nodes.md is a rendered view (render-nodes.mjs).
 *
 * Strategy:
 *   1. Detect source roots (src, app, lib, server, packages, apps, components...).
 *   2. Run `dependency-cruiser` (real, battle-tested static analyzer) to get a
 *      file-level import graph as JSON. We do NOT hand-roll AST parsing.
 *   3. Fold files into directory-level "nodes" at a configurable depth so the
 *      graph stays navigable (modules/domains, not individual functions).
 *   4. Tag each node with a heuristic layer (ui / api / data / lib / config...).
 *   5. Emit nodes + edges + a contentHash used for staleness detection.
 *
 * Requirements: Node 18+, and `dependency-cruiser` resolvable via npx.
 *   (Pin it in your project: `npm i -D dependency-cruiser`, or rely on npx.)
 *
 * NOTE: dependency-cruiser CLI flags vary slightly by major version. The output
 * SHAPE used here ({ modules: [{ source, dependencies: [{ resolved, coreModule }] }] })
 * is stable, but verify flags with `npx dependency-cruiser --help` for your version.
 * For TS path aliases, pass MAP_TSCONFIG=tsconfig.json.
 */

import { execSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";

const ROOT = process.cwd();
const OUT_DIR = join(ROOT, ".claude", "project-map");
const OUT_JSON = join(OUT_DIR, "project-map.json");

const DEPTH = Number(process.env.MAP_DEPTH ?? 2); // path segments that define a node
const TSCONFIG = process.env.MAP_TSCONFIG ?? null;

const CANDIDATE_DIRS = [
  "src", "app", "lib", "server", "api", "packages", "apps", "components", "pages"
];

function log(...a) { console.error("[cartographer]", ...a); }
function gitHead() {
  try { return execSync("git rev-parse HEAD", { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim(); }
  catch { return null; }
}

// 1. detect source roots ------------------------------------------------------
let sourceDirs = CANDIDATE_DIRS.filter((d) => existsSync(join(ROOT, d)));
if (sourceDirs.length === 0) sourceDirs = ["."];
log("source roots:", sourceDirs.join(", "));

// 2. run dependency-cruiser ---------------------------------------------------
// Anchored to path segments + trailing slash so we only exclude these as
// DIRECTORIES. Bare words (e.g. "out") would otherwise match substrings like
// "rOUTe" and silently drop files. No `$` — the shell would treat it as
// command substitution inside the constructed command string.
const excludePattern = "(^|/)(node_modules|\\.next|\\.turbo|dist|build|out|coverage|\\.git)/";
const tsFlag = TSCONFIG ? `--ts-config "${TSCONFIG}"` : "";
const cmd = [
  "npx --yes dependency-cruiser",
  sourceDirs.map((d) => `"${d}"`).join(" "),
  "--no-config",
  "--output-type json",
  `--exclude "${excludePattern}"`,
  '--do-not-follow "node_modules"',
  tsFlag,
].filter(Boolean).join(" ");

let cruise;
try {
  const stdout = execSync(cmd, {
    cwd: ROOT,
    encoding: "utf8",
    maxBuffer: 128 * 1024 * 1024,
    stdio: ["ignore", "pipe", "inherit"],
  });
  cruise = JSON.parse(stdout);
} catch (err) {
  log("dependency-cruiser failed. Is it installed/resolvable via npx?");
  log(String(err.message || err).split("\n")[0]);
  process.exit(1);
}

const modules = Array.isArray(cruise?.modules) ? cruise.modules : [];
if (modules.length === 0) {
  log("no modules found — check source roots / exclude pattern.");
  process.exit(1);
}

// 3. fold files into directory-level nodes -----------------------------------
function nodeIdFor(file) {
  // normalize separators, strip leading ./
  const parts = file.replace(/\\/g, "/").replace(/^\.\//, "").split("/");
  // a file like src/features/auth/login.ts at DEPTH 2 -> "src/features"
  return parts.slice(0, DEPTH).join("/") || ".";
}

function layerFor(id) {
  const s = id.toLowerCase();
  if (/(^|\/)(pages|app|components|ui|views|screens|widgets)(\/|$)/.test(s)) return "ui";
  if (/(^|\/)(api|routes?|controllers?|handlers?|endpoints?)(\/|$)/.test(s)) return "api";
  if (/(^|\/)(db|prisma|models?|schema|repositor|data|store)(\/|$)/.test(s)) return "data";
  if (/(^|\/)(services?|domain|core|usecases?|business)(\/|$)/.test(s)) return "domain";
  if (/(^|\/)(lib|utils?|helpers?|shared|common)(\/|$)/.test(s)) return "lib";
  if (/(^|\/)(config|env|infra|scripts?|build)(\/|$)/.test(s)) return "config";
  return "module";
}

const nodes = new Map(); // id -> { id, layer, files:Set, entrypoints:Set, dependsOn:Set }
const edges = new Set(); // "from\tto"

function ensureNode(id) {
  if (!nodes.has(id)) {
    nodes.set(id, {
      id,
      layer: layerFor(id),
      files: new Set(),
      entrypoints: new Set(),
      dependsOn: new Set(),
    });
  }
  return nodes.get(id);
}

// entrypoint heuristic: index.*, route.*, page.*, main.*, server.*
const ENTRY_RE = /(?:^|\/)(index|route|page|layout|main|server|app)\.(?:[cm]?[jt]sx?|vue)$/i;

for (const m of modules) {
  const file = (m.source || "").replace(/\\/g, "/");
  if (!file || m.coreModule) continue;
  const fromId = nodeIdFor(file);
  const fromNode = ensureNode(fromId);
  fromNode.files.add(file);
  if (ENTRY_RE.test(file)) fromNode.entrypoints.add(file);

  for (const dep of m.dependencies || []) {
    if (dep.coreModule) continue;
    const resolved = (dep.resolved || "").replace(/\\/g, "/");
    if (!resolved || resolved.includes("node_modules")) continue;
    const toId = nodeIdFor(resolved);
    if (toId === fromId) continue; // ignore intra-node edges
    fromNode.dependsOn.add(toId);
    edges.add(`${fromId}\t${toId}`);
  }
}

// 4. content hash for staleness ----------------------------------------------
// Hash the structural facts (files + edges), not timestamps, so it only changes
// when the actual import graph changes.
const hashInput = JSON.stringify({
  files: [...nodes.values()].flatMap((n) => [...n.files]).sort(),
  edges: [...edges].sort(),
});
const contentHash = createHash("sha256").update(hashInput).digest("hex").slice(0, 16);

// 5. serialize ----------------------------------------------------------------
const out = {
  schema: 1,
  generatedAt: new Date().toISOString(),
  gitHead: gitHead(),
  depth: DEPTH,
  sourceDirs,
  contentHash,
  nodes: [...nodes.values()]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((n) => ({
      id: n.id,
      layer: n.layer,
      fileCount: n.files.size,
      entrypoints: [...n.entrypoints].sort(),
      dependsOn: [...n.dependsOn].sort(),
    })),
  edges: [...edges].sort().map((e) => {
    const [from, to] = e.split("\t");
    return { from, to };
  }),
};

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(OUT_JSON, JSON.stringify(out, null, 2) + "\n", "utf8");
log(`wrote ${OUT_JSON}`);
log(`${out.nodes.length} nodes, ${out.edges.length} edges, hash ${contentHash}`);
