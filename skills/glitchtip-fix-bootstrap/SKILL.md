---
name: glitchtip-fix-bootstrap
description: Entry skill / full procedure for sp-gt-fix — orchestrator-only. Fix one GlitchTip issue per iteration via subagent delegation (never edit code yourself).
---

# ⚠️ READ THIS FIRST — IT OVERRIDES `using-superpowers` FOR THIS SESSION

You are a **pure ORCHESTRATOR** for this task. This entry skill is authoritative and **suspends `using-superpowers`' "do the work yourself / explore" directive** for this run.

- You do **NOT** investigate, write, edit, or fix code directly. Not even if the fix looks trivial or you "know" the answer.
- Your **only** tool for changing code or producing artifacts is the **`subagent`** tool: you delegate each step to a role agent (`gt-investigator`, `gt-test-author`, `gt-patcher`, `gt-verifier`, `gt-review`).
- **Self-check before EVERY tool call:** if the call is `edit`, `write`, or a `bash` that changes source files — **STOP, that is a failure**. Replace it with a `subagent` delegation to the right role. Permitted non-delegation calls: `gt ...`, `git status/log/checkout/add/commit/branch`, `read`, `grep`, `find`.
- Do **NOT** invoke `yandex-tracker` or any tracker skill. Do **NOT** grep the repo to "identify" the issue.

If you cannot delegate (no `subagent` tool available), report `BLOCKED: subagent tool unavailable` — do not fall back to editing.

---

## The task
Fix exactly ONE **GlitchTip** issue per iteration. Do **NOT** push / open an MR (human does). Mode default `lean`. The task argument (e.g. `GRAD-STAGING-R` or a number) is a GlitchTip shortId/id. `GRAD-STAGING-R` ≠ `GRAD-STAGING-7R` are DIFFERENT issues — only `gt find` tells them apart.

## Procedure (tick one `subagent` delegation per step; do not skip)

**0. Resolve & read the real issue.** Run `gt find <argument>` → numeric id + title/level/status. If not found → `BLOCKED`, stop. If `gt` unconfigured → point user to `glitchtip-setup`, stop.

**1. Branch.** `gt config get branchTemplate` (default `fix/glitchtip/<short-id>`, short-id = the shortId from `gt find`). If current branch ≠ rendered template → `git checkout -b <rendered>` from HEAD. You MUST be on the fix branch before STEP 3.

**2. Workspace.** `mkdir -p .glitchtip-agents/<numeric id>/`. Handoffs are file PATHS under it.

**3. Delegate the pipeline (each line = ONE `subagent` call):**
- `gt-investigator` (id) → writes `diagnosis.md`. If it reports ALREADY_FIXED → go to STEP 6 (verdict stale).
- `gt-test-author` (path to diagnosis.md) → writes `red-test.md`. If `NOT_REPRODUCIBLE` → skip RED, note it.
- `gt-patcher` (path to diagnosis.md) → commits the fix. (retry: also pass test-result.md)
- `gt-verifier` (branch, path to red-test.md) → writes `test-result.md`.
  - If FAIL and testAttempts < 2 → delegate `gt-patcher` (diagnosis.md + test-result.md), then `gt-verifier` again.

**4. Hard review loop (up to 2 rounds):**
- Delegate `gt-review` (id, branch, diagnosis.md, test-result.md) → writes `review.md` (APPROVE / REQUEST_CHANGES).
- While verdict == REQUEST_CHANGES and reviewAttempts < 2:
  - `gt-patcher` (diagnosis.md **+ review.md**) → commits improvements.
  - `gt-verifier` again.
  - `gt-review` again.
- APPROVE → STEP 5. Exhausted (still REQUEST_CHANGES) → STEP 6 as `DONE_WITH_CONCERNS` with the last review.md.

**5. Commit regression test.** `git add` the red-test spec (if RED was produced); `git commit -m "test(...): regression spec for <short-id>"`.

**6. Finalize.** Write `.glitchtip-agents/<id>/report.md` (branch, commits, RED→GREEN / NOT_REPRODUCIBLE / ALREADY_FIXED, review rounds + final verdict, concerns). Tell the user branch + commits + that they push/open the MR. Clean up the workspace on DONE.

`full` mode: also delegate `gt-recon` before the investigator. Roles run on the `glitchtip` tier.
Return `DONE` or `DONE_WITH_CONCERNS`.
