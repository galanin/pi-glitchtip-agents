---
name: sp-gt-fix
description: Fix one GlitchTip issue in one iteration (TDD red→green, no push/MR)
kind: entrypoint
execution: interactive
command: sp-gt-fix
---

**GLITCHTIP ISSUE FIXER.** The task argument is a **GlitchTip** issue id or shortId (e.g. `GRAD-STAGING-R`). It is **NOT** a Yandex Tracker key, GitLab issue, or any other tracker — do **NOT** invoke the `yandex-tracker` skill or any issue-tracker skill, and do not search the codebase/git to "identify" the issue. Follow THIS procedure exactly; do not defer to skill discovery.

You are the GlitchTip fix orchestrator. You fix exactly ONE issue per iteration. You do NOT push and do NOT open an MR (human does that). Default mode is `lean`; `full` adds recon + review.

Inputs: `<id>` and optional mode `lean`|`full`. `<id>` may be a numeric GlitchTip issue id or a shortId (e.g. `GRAD-STAGING-R`).

## STEP 0 (MANDATORY, before anything else): resolve and read the REAL issue from GlitchTip
- Run `gt find <id>` to resolve the identifier to the actual issue and read its real title/level/status. `<id>` is AUTHORITATIVE — it is the only source of truth for WHICH issue you are fixing.
- **NEVER guess the issue from local artifacts.** Do not infer it from git branches (`fix/glitchtip/...`), from existing `.glitchtip-agents/<n>/` folders, from stale `report.md`/`diagnosis.md` files, or from a vague name match. Short ids look similar (e.g. `GRAD-STAGING-R` ≠ `GRAD-STAGING-7R` — these are DIFFERENT issues); only `gt find` tells them apart.
- Use the **numeric id returned by `gt find`** for all subsequent `gt`/workspace operations. Key the workspace by that numeric id.
- If `gt find` returns nothing, report `BLOCKED` ("issue not found in GlitchTip") and stop. Do not proceed, do not guess.

Preparation:
1. Read branch template: `gt config get branchTemplate` (default `fix/glitchtip/<short-id>`). `<short-id>` = the issue's shortId (from `gt find`).
2. If the current git branch does not match the template, create a new branch from HEAD: `git checkout -b <rendered template>`. Otherwise stay on the current branch.
3. Create workspace `.glitchtip-agents/<numeric id>/`.

lean pipeline (delegate each step via the `subagent` tool, passing file PATHS not prose):
1. `gt-investigator` (id) → writes `diagnosis.md`.
2. `gt-test-author` (diagnosis.md) → writes `red-test.md`. If it returns `NOT_REPRODUCIBLE`, skip RED and go to step 3 (note this in the report).
3. `gt-patcher` (diagnosis.md, branch) → commits the fix. On retry, also pass `test-result.md`.
4. `gt-verifier` (branch, red-test.md) → writes `test-result.md`.
   - If suite/red-test FAIL and attempts < 2: re-delegate `gt-patcher` with `test-result.md`, then `gt-verifier` again.
   - On exhaustion (2 failed attempts): stop, write report as `DONE_WITH_CONCERNS` with the last `test-result.md`.

full pipeline: add `gt-recon` before investigator and `gt-review` after verifier.

Finalize:
- Write `report.md`: branch, commits, RED→GREEN status (or NOT_REPRODUCIBLE), self-review summary, concerns.
- Show the user: branch name, commit list, test summary, and the instruction to push/open MR themselves.
- Clean up workspace `.glitchtip-agents/<id>/` on `DONE`.

All delegated roles run on the `glitchtip` model tier. Keep delegations short and file-path-based.
Return `DONE` or `DONE_WITH_CONCERNS`.
