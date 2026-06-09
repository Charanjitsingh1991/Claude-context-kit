#!/usr/bin/env node
/**
 * guard.mjs — PreToolUse safety hook (#3 guardrails + #6 secret guard)
 * ----------------------------------------------------------------------------
 * Wired in hooks/hooks.json for matcher "Bash|Write|Edit|MultiEdit".
 * Reads the hook event JSON on stdin, inspects the pending tool call, and:
 *   - Bash:            blocks destructive commands (rm -rf /, force-push, db
 *                      resets, pipe-to-shell, etc.)
 *   - Write/Edit:      blocks writing secrets into source, and blocks edits to
 *                      real .env files (requires the human to do it).
 *
 * PROTOCOL (verified against Claude Code hooks docs):
 *   - exit 2  => BLOCK the tool call; stderr is shown to Claude as feedback.
 *   - exit 0  => allow.
 *   - exit 1 is NOT a block (only a warning) — never use it for enforcement.
 *
 * FAILS OPEN: on malformed input or its own error it exits 0, so a bug here can
 * never brick the session. The threat model is accidental destructive actions
 * by the agent, not an adversary crafting malformed hook payloads.
 */

import { readFileSync } from "node:fs";

function allow() { process.exit(0); }
function block(reason) { process.stderr.write(`[cartographer:guard] BLOCKED — ${reason}\n`); process.exit(2); }

let data;
try {
  const raw = readFileSync(0, "utf8");
  data = JSON.parse(raw);
} catch { allow(); }

const tool = data?.tool_name || "";
const input = data?.tool_input || {};

// ---- Bash: destructive command denylist -----------------------------------
const DANGEROUS = [
  { re: /rm\s+-[a-z]*r[a-z]*f|rm\s+-[a-z]*f[a-z]*r/i, hint: "recursive force delete (rm -rf)" },
  { re: /\brm\s+-rf?\s+(\/|~|\.|\*|\$HOME)(\s|$)/i, hint: "rm -rf on a broad/root path" },
  { re: /:\(\)\s*\{\s*:\|:&\s*\};:/, hint: "fork bomb" },
  { re: /\bgit\s+push\b[^|&;]*(--force\b|-f\b)(?!-with-lease)/i, hint: "git force-push (use --force-with-lease, or push a branch)" },
  { re: /\bgit\s+reset\s+--hard\b/i, hint: "git reset --hard (discards work)" },
  { re: /\bgit\s+clean\s+-[a-z]*f/i, hint: "git clean -f (deletes untracked files)" },
  { re: /\bprisma\s+migrate\s+reset\b|db\s+push\s+--force-reset/i, hint: "Prisma reset (wipes the database)" },
  { re: /\b(DROP\s+(TABLE|DATABASE|SCHEMA)|TRUNCATE\s+TABLE)\b/i, hint: "destructive SQL (DROP/TRUNCATE)" },
  { re: /(curl|wget)\b[^|]*\|\s*(sudo\s+)?(sh|bash|zsh)\b/i, hint: "pipe-to-shell of a remote script (supply-chain risk)" },
  { re: /\bchmod\s+-R\s+777\b/i, hint: "chmod -R 777 (insecure permissions)" },
  { re: /\bmkfs\b|\bdd\s+if=.*of=\/dev\//i, hint: "disk-level operation" },
  { re: /\bnpm\s+publish\b|\bpnpm\s+publish\b/i, hint: "package publish (irreversible release)" },
  { re: />\s*\.env(\s|$)/, hint: "overwriting .env via redirection" },
];

if (tool === "Bash") {
  const cmd = String(input.command || "");
  for (const d of DANGEROUS) {
    if (d.re.test(cmd)) {
      block(`${d.hint}. If you intend this, ask the user to run it themselves or confirm explicitly. Command: ${cmd.slice(0, 200)}`);
    }
  }
  allow();
}

// ---- Write/Edit: sensitive files + secret scan -----------------------------
if (tool === "Write" || tool === "Edit" || tool === "MultiEdit") {
  const file = String(input.file_path || input.filePath || "");

  // real .env files (allow .example/.sample/.template/.local.example)
  if (/(^|\/)\.env(\.[A-Za-z0-9]+)?$/.test(file) && !/\.(example|sample|template)$/.test(file)) {
    block(`editing a real env file (${file}). Env files hold secrets — ask the user to edit it manually, or write a .env.example instead.`);
  }

  // gather the text being written
  let text = "";
  if (typeof input.content === "string") text += input.content;
  if (typeof input.new_string === "string") text += "\n" + input.new_string;
  if (Array.isArray(input.edits)) text += "\n" + input.edits.map((e) => e?.new_string || "").join("\n");

  const SECRETS = [
    { re: /AKIA[0-9A-Z]{16}/, hint: "AWS access key id" },
    { re: /-----BEGIN (?:RSA |EC |OPENSSH |PGP )?PRIVATE KEY-----/, hint: "private key" },
    { re: /\bsk_live_[0-9A-Za-z]{16,}/, hint: "Stripe live secret key" },
    { re: /\bghp_[0-9A-Za-z]{36}\b/, hint: "GitHub personal access token" },
    { re: /\bAIza[0-9A-Za-z\-_]{35}\b/, hint: "Google API key" },
    { re: /\bxox[baprs]-[0-9A-Za-z-]{10,}/, hint: "Slack token" },
    { re: /(?:api[_-]?key|secret|token|password|passwd)\s*[:=]\s*['"][A-Za-z0-9_\-./+]{16,}['"]/i, hint: "hard-coded credential" },
  ];
  for (const s of SECRETS) {
    if (s.re.test(text)) {
      block(`this writes what looks like a ${s.hint} into ${file || "a file"}. Move it to an env var (referenced, not inlined) and add the name to .env.example.`);
    }
  }
  allow();
}

allow();
