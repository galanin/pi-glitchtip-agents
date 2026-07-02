---
name: glitchtip-setup
description: Configure the gt CLI connection to a GlitchTip instance (base URL, API token, org, project) and verify it for the glitchtip agents.
---

# glitchtip-setup

Configure the `gt` CLI so the GlitchTip agents can read issues and events.

## Prerequisite
Install the package and run its installer (creates `gt` and the agents):
```sh
pi install npm:@galanin/pi-glitchtip-agents
npx @galanin/pi-glitchtip-agents
```

## Steps

1. **Base URL** — your self-hosted GlitchTip root (no trailing slash, no `/api/0`):
   ```sh
   gt config set baseUrl https://glitchtip.example.com
   ```
2. **API token** — in GlitchTip UI: Organization → Settings → API Keys (or Auth Tokens). Create a token with `org:read` + `project:read` (+ `event:write` if you want `gt resolve/mute`):
   ```sh
   gt config set token <paste-token>
   ```
3. **Org and project slugs** (from the GlitchTip URL: `…/organizations/<org>/issues/?project=<project>`):
   ```sh
   gt config set org my-org
   gt config set project my-project
   ```
4. **Verify:**
   ```sh
   gt ping           # expect {"ok": true}
   gt issues --limit 3
   ```

## Branch template (separate setting, not connection)
```sh
gt config get branchTemplate
gt config set branchTemplate "fix/glitchtip/<short-id>"
```

## Troubleshooting
- `401` / "bad token" → token wrong or expired; regenerate.
- `404` on `gt issues` → wrong `org`/`project` slug, or base URL points to the wrong instance.
- Errors mention `/api/0` doubled → you included `/api/0` in `baseUrl`; remove it (`gt` appends it).
- `gt` not found → re-run the installer or ensure `~/.local/bin` is on `PATH`.

Config file: `~/.config/glitchtip-agents/config.json` (override with `GT_CONFIG_PATH`).

## Model tier
The agents run on the `glitchtip` model tier (default a local model). Change it with pi's `/sp-settings`.
