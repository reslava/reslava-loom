---
type: plan
id: pl_01KSNAFC9TT66GV1BVF761A8KF
title: Scope runEvent saves to the changed doc set
status: done
created: "2026-05-27T00:00:00.000Z"
updated: 2026-05-27
version: 3
design_version: 1
tags: []
parent_id: de_01KSNACN3T97M7HVG3K0W3WBQB
requires_load: []
target_version: 0.1.0
---
# Scope runEvent saves to the changed doc set

## Goal

Implement the orchestrator-reported changed-doc-set save scoping from the design: a workflow event persists exactly the docs it changed, never the whole weave. Bounds the blast radius (a non-idempotent save-path bug can no longer touch untouched siblings) and eliminates spurious churn on unrelated docs.

Realisation note: the changed-id signal is collected inside `applyEvent` (the orchestrator that places each reducer's output), so **reducers stay pure** — cleaner than threading an id out of every reducer, same external contract. See design §3.

## Steps

| Done | # | Step | Files touched | Blocked by |
|---|---|---|---|---|
| ✅ | 1 | Add `ApplyResult` (weave + changed[]) to applyEvent and collect changed doc ids at each reassignment site, including the stale-child-plan marking; reducers stay pure, no IO | packages/core/src/applyEvent.ts | — |
| ✅ | 2 | Export ApplyResult from core; add fs `saveDocs(loomRoot, weave, docIds)` that filters the weave by id set and resolves each path via _path or docPathInThread (exported); saveWeave retained for bulk | packages/core/src/index.ts, packages/fs/src/repositories/weaveRepository.ts, packages/fs/src/repositories/threadRepository.ts, packages/fs/src/index.ts | — |
| ✅ | 3 | Update runEvent to destructure `changed` and call saveDocs only on those docs; replace RunEventDeps.saveWeave with saveDocs | packages/app/src/runEvent.ts | — |
| ✅ | 4 | Update every runEvent injection site to inject saveDocs (cli completeStep/startPlan/refine, mcp completeStep/startPlan, tests commands/workspace-workflow/vscode) | packages/cli/src/commands, packages/mcp/src/tools, tests | — |
| ✅ | 5 | Add tests: applyEvent.changed excludes siblings; runEvent leaves a sibling plan byte-identical (non-canonical sibling so any re-save would differ); register in test-all.sh | tests/event-save-scope.test.ts, scripts/test-all.sh | — |
---

### Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Done |
| 🔄 | In Progress |
| 🔳 | Pending |
| ❌ | Cancelled |