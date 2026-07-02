---
name: glitchtip-fix-bootstrap
description: Entry skill / full procedure for sp-gt-fix — fix one GlitchTip issue per iteration (resolve from GlitchTip, branch, TDD red→green pipeline, commit, report; no push/MR).
---

# glitchtip-fix (sp-gt-fix procedure — this IS the authoritative procedure)

You fix exactly **one GlitchTip issue** per iteration. You do **NOT** push and do **NOT** open an MR (the human does). Default mode `lean`; `full` adds recon + review. The task argument (e.g. `GRAD-STAGING-R` or a number) is a **GlitchTip** shortId/id.

## HARD RULES (before anything else)
1. It is **NOT** a Yandex Tracker / GitLab issue. Do **NOT** invoke `yandex-tracker` or any tracker skill. Do **NOT** grep the repo / read git history / scan branches to "identify" the issue. Ignore generic skill-discovery impulses for this task.
2. Short ids are easy to confuse — `GRAD-STAGING-R` ≠ `GRAD-STAGING-7R` are DIFFERENT issues. Only `gt find` tells them apart.

## STEP 0 — resolve & read the real issue (mandatory, first action)
- Run `gt find <argument>` → resolve to the numeric id and read the real title/level/status from GlitchTip.
- If nothing found: report `BLOCKED: issue not found in GlitchTip` and stop. Do not guess.
- If `gt` not configured: stop, point the user to the `glitchtip-setup` skill.
- Use that **numeric id** for every later `gt`/workspace step.

## STEP 1 — branch
- `gt config get branchTemplate` (default `fix/glitchtip/<short-id>`). `<short-id>` = the issue shortId from `gt find`.
- If the current branch does NOT match the rendered template, create a new branch from HEAD: `git checkout -b <rendered>`. Otherwise stay.
- **You MUST be on the fix branch before editing anything.** Never edit on `main`/`master`/`test`.

## STEP 2 — workspace
- Create `.glitchtip-agents/<numeric id>/`. All role handoffs are file PATHS under it (not prose).

## STEP 3 — lean pipeline (delegate each step via the `subagent` tool)
1. `gt-investigator` (id) → writes `.glitchtip-agents/<id>/diagnosis.md`. (It runs `gt archaeology` first; if it reports ALREADY_FIXED, skip to STEP 5 with verdict stale.)
2. `gt-test-author` (path to diagnosis.md) → writes `red-test.md`. If it returns `NOT_REPRODUCIBLE`, skip RED; note it.
3. `gt-patcher` (path to diagnosis.md; on retry also `test-result.md`) → **commits the fix on the branch**. The patcher MUST commit (Conventional Commits, slash-scoped per AGENTS.md). It must NOT touch the red-test.
4. `gt-verifier` (branch, path to red-test.md) → writes `test-result.md`.
   - If red-test/suite FAIL and attempts < 2: re-delegate `gt-patcher` (with test-result.md) then `gt-verifier`.
   - On exhaustion (2 fails): stop, finalize as `DONE_WITH_CONCERNS`.

`full` mode: also delegate `gt-recon` before investigator and `gt-review` after verifier.

## STEP 4 — commit the regression test
- `git add` the red-test spec (if RED was produced) and commit it: `test(...): regression spec for <short-id>`.

## STEP 5 — finalize
- Write `.glitchtip-agents/<id>/report.md`: branch, commits (short SHA + subject), RED→GREEN status (or NOT_REPRODUCIBLE / ALREADY_FIXED), self-review, concerns.
- Tell the user: branch name, commit list, test summary, and that they push/open the MR themselves.
- Clean up `.glitchtip-agents/<id>/` on DONE.

All delegated roles run on the `glitchtip` model tier. If you cannot delegate (no `subagent` tool), do NOT silently edit files directly — report `BLOCKED: subagent tool unavailable`.
Return `DONE` or `DONE_WITH_CONCERNS`.
