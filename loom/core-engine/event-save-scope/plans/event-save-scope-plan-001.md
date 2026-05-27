---
type: plan
id: pl_01KSNAFC9TT66GV1BVF761A8KF
title: Scope runEvent saves to the changed doc set
status: active
created: 2026-05-27
version: 1
design_version: 1
tags: []
parent_id: de_01KSNACN3T97M7HVG3K0W3WBQB
requires_load: []
target_version: 0.1.0
---
# Scope runEvent saves to the changed doc set

## Goal

Implement the reducer-reported changed-doc-set save scoping from the design: a workflow event persists exactly the docs it changed, never the whole weave. Bounds the blast radius (a non-idempotent save-path bug can no longer touch untouched siblings) and eliminates spurious churn on unrelated docs. Built in dependency order: reducers report touched ids → applyEvent aggregates → runEvent saves only those → callers updated → tests.
---

## Steps

| Done | # | Step | Files touched | Blocked by |
|---|---|---|---|---|
| 🔳 | 1 | Change each reducer in packages/core/src/reducers to return the doc id(s) it touched alongside the new weave, staying pure (no IO); usually one id, a set for any cascade | — | — |
| 🔳 | 2 | Change applyEvent (packages/core/src/applyEvent.ts) to return ApplyResult with the new weave plus an aggregated `changed` string array of mutated doc ids | — | — |
| 🔳 | 3 | Update runEvent (packages/app/src/runEvent.ts) to destructure `changed` and saveDoc only those docs; add saveDoc to RunEventDeps; stop calling saveWeave on the single-event path | — | — |
| 🔳 | 4 | Update every applyEvent caller (app use-cases and tests) to the new ApplyResult shape; keep saveWeave only for genuine bulk operations (migrations) | — | — |
| 🔳 | 5 | Add tests: each reducer reports the correct changed set; runEvent saveDoc is called only for changed docs and never for untouched siblings (mock saveDoc); regression — complete-step on one plan in a multi-plan weave leaves every sibling file byte-identical on disk | — | — |
---

### Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Done |
| 🔄 | In Progress |
| 🔳 | Pending |
| ❌ | Cancelled |
