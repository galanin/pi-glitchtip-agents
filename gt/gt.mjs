#!/usr/bin/env node
import { homedir } from "node:os";
import { join } from "node:path";
import { loadConfig, saveConfig } from "./config.mjs";
import { createClient } from "./api.mjs";
import * as cmd from "./commands.mjs";

const CONFIG_PATH = process.env.GT_CONFIG_PATH ?? join(homedir(), ".config", "glitchtip-agents", "config.json");

const HELP = `Usage: gt <command> [options]

Connection & config:
  gt config set <key> <value>      set baseUrl|token|org|project|branchTemplate
  gt config get [key]              print config (or one key) as JSON
  gt ping                          verify connection/auth

Read (JSON):
  gt issues [--since 2w] [--status unresolved|resolved|muted] [--query Q] [--limit N]
  gt triage [--since 2w] [--limit N]      pre-sorted by criticality
  gt issue <id>
  gt event <id>                           latest event (stacktrace/breadcrumbs)

Write:
  gt resolve <id> | gt unresolve <id> | gt mute <id>

Config file: ${CONFIG_PATH}
Set GT_CONFIG_PATH to override.`;

function parseArgs(argv) {
  const [command, ...rest] = argv;
  const args = { _: [] };
  for (let i = 0; i < rest.length; i++) {
    const a = rest[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const next = rest[i + 1];
      if (next === undefined || next.startsWith("--")) args[key] = true;
      else { args[key] = next; i++; }
    } else {
      args._.push(a);
    }
  }
  args.id = args._[0];
  return { command, args };
}

async function main() {
  const { command, args } = parseArgs(process.argv.slice(2));

  if (!command || command === "help" || command === "--help" || command === "-h" || args.help) {
    process.stdout.write(HELP + "\n");
    return 0;
  }

  if (command === "config") {
    const sub = args._[0];
    const cfg = await loadConfig(CONFIG_PATH);
    if (sub === "set") {
      const [key, ...valParts] = args._.slice(1);
      const value = valParts.join(" ");
      if (!(key in cfg) && !["baseUrl", "token", "org", "project", "branchTemplate"].includes(key)) {
        throw new Error(`unknown config key: ${key}`);
      }
      cfg[key] = value;
      await saveConfig(CONFIG_PATH, cfg);
      return out(cfg);
    }
    if (sub === "get") {
      const key = args._[1];
      return out(key ? cfg[key] : cfg);
    }
    throw new Error("usage: gt config set <key> <value> | gt config get [key]");
  }

  const cfg = await loadConfig(CONFIG_PATH);
  if (!cfg.baseUrl || !cfg.token) {
    throw new Error("not configured: run `gt config set baseUrl ...` and `gt config set token ...` (see glitchtip-setup skill)");
  }
  const client = createClient(cfg);

  const handlers = {
    ping: cmd.ping, issues: cmd.issues, triage: cmd.triage,
    issue: cmd.issue, event: cmd.event,
    resolve: cmd.resolve, unresolve: cmd.unresolve, mute: cmd.mute,
  };
  const handler = handlers[command];
  if (!handler) throw new Error(`unknown command: ${command}\n\n${HELP}`);

  const data = await handler({ client, config: cfg, args });
  return out(data);
}

function out(data) {
  process.stdout.write(JSON.stringify(data, null, 2) + "\n");
  return 0;
}

main()
  .then((code) => process.exit(code))
  .catch((err) => {
    process.stderr.write(`error: ${err.message}\n`);
    process.exit(1);
  });
