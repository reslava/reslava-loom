---
type: idea
id: id_01KQYDFDDDGPNXJJ8XWA812W7K
title: refine-plan prompt and stale-plan detection
status: draft
created: "2026-04-28T00:00:00.000Z"
version: 1
tags: []
parent_id: null
requires_load: []
---

# refine-plan prompt and stale-plan detection

## Problem

When a user refines a design after a plan already exists, the plan becomes stale — but Loom has no mechanism to detect or signal this. The current state:

- `refine-design` prompt exists and updates the design doc
- No `refine-plan` prompt or `loom_amend_plan` tool exists
- Plans do not have a `stale` status
- The user must manually identify and update affected plan steps

## Proposed solution

### 1. Stale plan detection

When `refine-design` completes, check if any active plans exist for the thread. If so, set their `status: stale`. This makes the staleness visible in the tree view and MCP resources.

### 2. `refine-plan` prompt

A new MCP prompt that:
1. Loads the updated design + current plan steps
2. Uses sampling to propose which steps to add, remove, or modify
3. Presents a diff for human approval before mutating anything

### 3. `loom_amend_plan` tool (optional)

A tool that accepts a list of step mutations (add/remove/update) and applies them atomically, re-validating step order and blockers.

## Scope

- Add `stale` to the plan `status` union in `packages/core/`
- Update `refine-design` prompt to mark related plans as stale after completion
- Add `refine-plan` prompt to `packages/mcp/`
- Optionally add `loom_amend_plan` tool
- Update tree view to show stale plan indicator
