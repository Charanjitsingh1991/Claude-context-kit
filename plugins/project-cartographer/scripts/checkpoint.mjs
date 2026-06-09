#!/usr/bin/env node
/**
 * checkpoint.mjs — non-destructive recovery point before risky work (#3).
 * Uses `git stash create`, which snapshots the working tree as a dangling
 * commit WITHOUT touching your files or the stash list. Records the sha so you
 * can recover with `git stash apply <sha>`.
 * Usage: node checkpoint.mjs ["label"]
 */
import { execSync } from "node:child_process";
import { existsSync, mkdirSync, appendFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const label = process.argv.slice(2).join(" ").trim() || "checkpoint";
const git = (c) => { try { return execSync(`git ${c}`, { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim(); } catch { return null; } };

if (git("rev-parse --is-inside-work-tree") !== "true") { console.log("Not a git repo — cannot checkpoint. Commit to git to enable recovery points."); process.exit(2); }

const sha = git("stash create");
if (!sha) { console.log("Nothing to checkpoint — working tree is clean (your last commit is already a recovery point)."); process.exit(0); }
// keep the object alive so GC won't drop it
git(`update-ref refs/cartographer/checkpoints/${sha.slice(0, 8)} ${sha}`);
const dir = join(ROOT, ".claude"); mkdirSync(dir, { recursive: true });
appendFileSync(join(dir, "checkpoints.log"), `${new Date().toISOString()}\t${sha}\t${label}\n`);
console.log(`Checkpoint saved: ${sha.slice(0, 12)}  (${label})`);
console.log(`Restore later with:  git stash apply ${sha}`);
