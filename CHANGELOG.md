# Changelog

## 0.1.0
- `gt` CLI (zero-dep Node ESM): config get/set, ping, issues, triage, issue, event,
  resolve/unresolve/mute. JSON output, Bearer auth, centralized Sentry-compatible
  endpoints, retry/backoff on 429/5xx (honors Retry-After), `GT_CONFIG_PATH` override,
  `--help`/`-h`.
- Agents: entrypoints `/sp-gt-triage`, `/sp-gt-fix` (orchestrator) and bounded roles
  `gt-recon`, `gt-investigator`, `gt-test-author` (TDD red, NOT_REPRODUCIBLE escape),
  `gt-patcher`, `gt-verifier`, `gt-review`. All `model: glitchtip`, lineage-only,
  self-contained prompts with per-role AGENTS.md scope directives for weak models.
- `glitchtip-setup` skill (connection setup only).
- Installer: symlinks agents into `~/.pi/agent/agents/`, installs `gt` to `~/.local/bin`,
  merges `glitchtip` model tier (non-overwriting), writes `branchTemplate` default, `--remove`.
  Import-safe (guarded `main()`).
- 16 unit tests (`node:test`).

### Known limitations
- GlitchTip REST endpoint paths are Sentry-compatible and centralised in `gt/api.mjs`;
  validate against your instance via `gt ping` (see `glitchtip-setup` skill).
- Fix pipeline runs in mode A: no push, no MR (human opens the MR).
