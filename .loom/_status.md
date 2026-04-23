# Loom Status (Manual Scaffolding)

## Stage
1
<!-- 1 = manual simulation — Rafa maintains this file manually after each session -->
<!-- 2 = CLI-managed      — `loom status` command updates automatically      -->

## Loom
local mode

## Active weave
vscode-extension

## Active design
weaves/vscode-extension/vscode-extension-design.md

## Active plan
> `vscode-extension-plan-004.md` | Feature | Step 5 (commands) | Builds the core extension structure and tree view. Steps 1-4 done. |
- `vscode-extension-plan-005.md` | Feature | `vscode-extension-plan-004` | Adds thread‑based grouping to the tree view. |
- `vscode-extension-plan-006.md` | Feature | `vscode-extension-plan-004`, `vscode-extension-plan-005` | Implements toolbar controls and actions. |
- `cli-error-standardization-idea.md` | Polish (Deferred) | None | Improves CLI UX; can be done anytime, even after initial VS Code release. |


## Last session
2026-04-23 — Implemented core-tests-plan-001 (all 8 steps): DoneDoc entity tests,
             weaveRepository done/ loading, planReducer, completeStep use-case,
             closePlan (mock AI), doStep (mock AI), summarise (mock AI), test-all.sh.
             Full suite passes (10 test files). Next: vscode-tests-plan-001.

---
<!-- STAGE 1 MAINTENANCE INSTRUCTIONS (delete this block when Stage → 2)

After each session, update:
  1. "Active plan" line — bump the step number if progressed
  2. "Last session" line — date + one sentence summary

That's it. Two edits, 30 seconds.
When core CLI is working, run: loom status --init
That command will take over maintenance and remove this block.
-->
