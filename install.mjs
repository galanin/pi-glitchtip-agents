#!/usr/bin/env node
import * as fs from "node:fs";
import * as path from "node:path";
import { homedir } from "node:os";
import { pathToFileURL } from "node:url";

const PKG_ROOT = path.resolve(new URL(".", import.meta.url).pathname);
const AGENTS_SRC = path.join(PKG_ROOT, "agents");
const SKILLS_SRC = path.join(PKG_ROOT, "skills");
const GT_SRC = path.join(PKG_ROOT, "gt", "gt.mjs");
const AGENT_FILES = [
  "sp-gt-triage.md", "sp-gt-fix.md",
  "gt-recon.md", "gt-investigator.md", "gt-test-author.md",
  "gt-patcher.md", "gt-verifier.md", "gt-review.md",
];

const USER_AGENTS_DIR = path.join(homedir(), ".pi", "agent", "agents");
const USER_SKILLS_DIR = path.join(homedir(), ".pi", "agent", "skills");
const GT_BIN_DIR = path.join(homedir(), ".local", "bin");
const GT_BIN = path.join(GT_BIN_DIR, "gt");
const SP_CONFIG = path.join(homedir(), ".pi", "agent", "extensions", "subagent", "config.json");
const PKG_CONFIG_DIR = path.join(homedir(), ".config", "glitchtip-agents");
const PKG_CONFIG = path.join(PKG_CONFIG_DIR, "config.json");

export const DEFAULT_TIER = { model: "ollama/qwen3:35b", thinking: "off" };
export const DEFAULT_BRANCH_TEMPLATE = "fix/glitchtip/<short-id>";

export function mergeTierIntoSuperagentsConfig(cfg, tier) {
  const out = structuredClone(cfg);
  out.superagents ??= {};
  out.superagents.modelTiers ??= {};
  if (!out.superagents.modelTiers.glitchtip) {
    out.superagents.modelTiers.glitchtip = { ...tier };
  }
  return out;
}

export function mergePackageDefaults(existing) {
  return {
    baseUrl: existing.baseUrl ?? "",
    token: existing.token ?? "",
    org: existing.org ?? "",
    project: existing.project ?? "",
    branchTemplate: existing.branchTemplate ?? DEFAULT_BRANCH_TEMPLATE,
  };
}

function readJSON(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, "utf-8")); } catch { return fallback; }
}
function writeJSON(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + "\n", "utf-8");
}

function symlinkAgents() {
  fs.mkdirSync(USER_AGENTS_DIR, { recursive: true });
  for (const f of AGENT_FILES) {
    const target = path.join(USER_AGENTS_DIR, f);
    const src = path.join(AGENTS_SRC, f);
    if (!fs.existsSync(src)) { console.warn(`skip (missing in package): ${f}`); continue; }
    if (fs.existsSync(target) || fs.lstatSync(target, { throwIfNoEntry: false })) {
      fs.rmSync(target, { force: true });
    }
    fs.symlinkSync(src, target);
    console.log(`linked ${f} -> ${src}`);
  }
}

function installGt() {
  fs.mkdirSync(GT_BIN_DIR, { recursive: true });
  // gt.mjs imports sibling modules (./config.mjs, ./api.mjs, ./commands.mjs) via
  // relative paths, so the binary must resolve to the package's gt/ directory.
  // Symlink (not copy) so relative imports resolve from the package location.
  fs.rmSync(GT_BIN, { force: true });
  fs.symlinkSync(GT_SRC, GT_BIN);
  fs.chmodSync(GT_SRC, 0o755);
  console.log(`linked gt -> ${GT_SRC}`);
}

// Discover skill directories (each containing SKILL.md) under skills/.
function discoverSkillNames() {
  if (!fs.existsSync(SKILLS_SRC)) return [];
  return fs
    .readdirSync(SKILLS_SRC, { withFileTypes: true })
    .filter((e) => e.isDirectory() && fs.existsSync(path.join(SKILLS_SRC, e.name, "SKILL.md")))
    .map((e) => e.name);
}

function symlinkSkills() {
  const names = discoverSkillNames();
  if (names.length === 0) return;
  fs.mkdirSync(USER_SKILLS_DIR, { recursive: true });
  for (const name of names) {
    const src = path.join(SKILLS_SRC, name);
    const target = path.join(USER_SKILLS_DIR, name);
    fs.rmSync(target, { force: true });
    fs.symlinkSync(src, target);
    console.log(`linked skill ${name} -> ${src}`);
  }
}

function mergeTier() {
  if (!fs.existsSync(SP_CONFIG)) {
    console.warn(`superagents config not found at ${SP_CONFIG}; skipping tier merge (install @teelicht/pi-superagents first).`);
    return;
  }
  const cfg = readJSON(SP_CONFIG, {});
  const merged = mergeTierIntoSuperagentsConfig(cfg, DEFAULT_TIER);
  writeJSON(SP_CONFIG, merged);
  console.log(`merged glitchtip tier into ${SP_CONFIG}`);
  console.warn("NOTE: subagents run with implicit extension discovery disabled.");
  console.warn("      If your model needs a custom provider extension (e.g. ollama-native),");
  console.warn("      add it to superagents.extensions in this config.json, e.g.");
  console.warn("      \"/home/<user>/.pi/agent/extensions/ollama-native.ts\".");
  console.warn("      Also: ollama-backed tiers must use thinking \"off\" (a :<level> suffix breaks ollama model resolution).");
}

function writeDefaults() {
  const existing = readJSON(PKG_CONFIG, {});
  writeJSON(PKG_CONFIG, mergePackageDefaults(existing));
  console.log(`wrote package defaults -> ${PKG_CONFIG}`);
}

function remove() {
  for (const f of AGENT_FILES) fs.rmSync(path.join(USER_AGENTS_DIR, f), { force: true });
  for (const name of discoverSkillNames()) fs.rmSync(path.join(USER_SKILLS_DIR, name), { force: true });
  fs.rmSync(GT_BIN, { force: true });
  if (fs.existsSync(SP_CONFIG)) {
    const cfg = readJSON(SP_CONFIG, {});
    if (cfg.superagents?.modelTiers?.glitchtip) {
      delete cfg.superagents.modelTiers.glitchtip;
      writeJSON(SP_CONFIG, cfg);
    }
  }
  console.log("removed agent + skill symlinks, gt binary, and glitchtip tier");
}

function main() {
  const args = process.argv.slice(2);
  if (args.includes("--remove") || args.includes("-r")) return remove();
  if (args.includes("--help") || args.includes("-h")) {
    console.log(`Usage: npx @galanin/pi-glitchtip-agents [--remove]\n  Symlinks agents into ${USER_AGENTS_DIR}, installs gt, merges glitchtip model tier, writes defaults.`);
    return;
  }
  symlinkAgents();
  symlinkSkills();
  installGt();
  mergeTier();
  writeDefaults();
  console.log("done.");
}

if (import.meta.url === pathToFileURL(fs.realpathSync(process.argv[1])).href) {
  main();
}
