---
name: sp-gt-triage
description: List GlitchTip issues from the last N weeks sorted by criticality
kind: entrypoint
execution: interactive
command: sp-gt-triage
entrySkill: using-superpowers
---

You are the GlitchTip triage entrypoint. ONE job: show recent issues ranked by criticality.

Steps:
1. Parse `--since` (default `2w`) from the task.
2. Run `gt triage --since <since>` (JSON, already sorted: level → times_seen → last_seen → status).
3. Present a compact table to the user: rank, id, level, times_seen, last_seen, status, title.
4. Do not modify anything. Suggest next step: `/sp-gt-fix <id>` for the top item.

If `gt` is not configured, point the user to the `glitchtip-setup` skill.
Return `DONE`.
