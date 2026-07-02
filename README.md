# @galanin/pi-glitchtip-agents

pi agents + `gt` CLI to triage and fix GlitchTip issues, designed for weak local models (e.g. `ollama/qwen3:35b`).

## Requirements
- [@teelicht/pi-superagents](https://github.com/teelicht/pi-superagents) installed (`pi install npm:@teelicht/pi-superagents`).
- Node.js 18+.
- A GlitchTip instance + API token.

## Install
```sh
pi install npm:@galanin/pi-glitchtip-agents
npx @galanin/pi-glitchtip-agents        # symlinks agents, installs gt, merges glitchtip tier
```
Then configure the connection — see the `glitchtip-setup` skill (`/skill:glitchtip-setup`).

## Usage
- `/sp-gt-triage [--since 2w]` — recent issues ranked by criticality.
- `/sp-gt-fix <id> [lean|full]` — fix one issue (TDD red→green, no push/MR).
- `gt issues|triage|issue <id>|event <id>|resolve <id>` — direct CLI.

## Model
Agents run on the `glitchtip` tier. Change it with pi's `/sp-settings`.

**Local-model setup (important):** subagents launch with implicit extension
discovery disabled (`--no-extensions`). If your model is served by a custom
provider extension (e.g. an `ollama-native.ts` provider), you MUST add it to
`superagents.extensions` in `~/.pi/agent/extensions/subagent/config.json`,
otherwise the child falls back to the default model. Also, for **ollama-backed**
tiers set `thinking: "off"` — a `:<level>` thinking suffix breaks ollama model
resolution and silently falls back to the default provider.

## Layout
- `gt/` — the `gt` CLI (REST/JSON over GlitchTip's Sentry-compatible API).
- `agents/` — entrypoints (`sp-gt-*`) and bounded roles (`gt-*`).
- `skills/glitchtip-setup/` — connection setup.
- `install.mjs` — installer.
