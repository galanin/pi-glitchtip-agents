---
name: sp-gt-fix
description: Fix one GlitchTip issue in one iteration (TDD red→green, no push/MR)
kind: entrypoint
execution: interactive
command: sp-gt-fix
entrySkill: glitchtip-fix-bootstrap
skills: glitchtip-fix-bootstrap
---

Entrypoint for `/sp-gt-fix <id|shortId> [lean|full]`.

NOTE: for entrypoint agents the body is NOT injected into the session — the full
procedure lives in the `glitchtip-fix-bootstrap` entry skill (frontmatter above),
which IS injected. Keep this file as a pointer; edit the skill for the procedure.
