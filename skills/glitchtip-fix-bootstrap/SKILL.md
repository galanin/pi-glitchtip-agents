---
name: glitchtip-fix-bootstrap
description: Entry skill for sp-gt-fix — resolve the GlitchTip issue from the task argument FIRST, before any skill discovery or exploration.
---

# glitchtip-fix-bootstrap (entry skill — overrides default exploration)

You are fixing **one GlitchTip issue**. The task argument (e.g. `GRAD-STAGING-R` or a number) is a **GlitchTip** issue shortId/id.

## HARD RULES (follow before anything else)

1. **It is NOT a Yandex Tracker key, GitLab issue, GitHub issue, or any other tracker.** Do **NOT** invoke the `yandex-tracker` skill or any issue-tracker skill. Do **NOT** grep the codebase, read git history, or scan branches/folders to "figure out what the issue is".
2. **Your FIRST action is exactly one command:** `gt find <the task argument>`. This resolves the shortId to the real numeric id and reads the actual issue (title, level, status) from GlitchTip.
3. Short ids are easy to confuse — `GRAD-STAGING-R` ≠ `GRAD-STAGING-7R` are DIFFERENT issues. Only `gt find` tells them apart. Never assume.
4. If `gt find` returns nothing, report `BLOCKED: issue not found in GlitchTip` and stop. Do not guess.
5. Use the **numeric id from `gt find`** for every later step (`gt issue`, `gt event`, `gt archaeology`, workspace folder).

If `gt` is not configured, stop and point the user to the `glitchtip-setup` skill.

Ignore any impulse to "identify relevant skills" or explore the repo before running `gt find`. This entry skill takes precedence over generic skill-discovery for this task.
