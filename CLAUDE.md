# CLAUDE.md — REslava Loom Session Contract

## What this project is

**REslava Loom** is a document-driven, event-sourced workflow system for AI-assisted development.
Markdown files are the database. State is derived. AI collaborates step-by-step with human approval.

This repository *uses its own workflow* to build itself. The `loom/` directory contains the living
design documents. The `packages/` directory contains the implementation.

---

## Stage

**Stage 1 — Manual simulation.** Rafa maintains `.loom/_status.md` manually after each session.
Stage 2 begins when `loom status --init` takes over.

---

## Architecture

```
packages/
  core/       Pure domain logic. No IO. No side effects.
              Entities, reducers, events, utilities.
  fs/         Infrastructure. File IO, frontmatter parsing, link index.
              Repositories: weaveRepository, threadRepository, linkRepository.
  app/        Use-case orchestration. Calls core + fs. No CLI/UI logic.
              All use-cases follow: (input, deps) => result
  cli/        Thin delivery layer. Parses args, calls app, prints output.
  vscode/     Thin presentation layer. Calls app, renders tree view.
              Currently under active development.
  mcp/        Agent surface. Exposes Resources, Tools, Prompts, Sampling via MCP.
              Implemented — released in 0.4.0.

loom/         Design documents in Weave/Thread graph layout.
  core-engine/
    core-engine/          ← Thread (idea + design + plans + done)
    id-management/        ← Thread
    weave-and-thread/     ← Thread
    link-index/           ← Thread
    ...                   ← more threads
  vscode-extension/
    vscode-extension/     ← Thread
    vscode-extension-visual/
    vscode-extension-toolbar/
    ...
  ai-integration/
  multi-workspace/
  docs-infra/
  workflow/
loom/refs/    Static architectural facts, patterns, API notes.
```

**Dependency rule:** `cli / vscode / mcp → app → core + fs`. Layers never import upward.
**Injection rule:** Every app use-case receives its dependencies explicitly via a `deps` argument.

---

## Key terminology

| Term | Meaning |
|------|---------|
| **Weave** | A project folder under `loom/`. Also the core domain entity (`Weave` interface). |
| **Thread** | A workstream subfolder inside a Weave (`loom/{weave}/{thread}/`). Contains an idea, a design, plans, done docs, and thread-level chats. The core entity is `Thread`. |
| **Loose fiber** | A doc at weave root (no thread). Idea or design that hasn't been grouped into a thread yet. |
| **Loom** | The tool itself (CLI + VS Code extension). Also a workspace instance. |
| **Plan** | An implementation plan doc (`*-plan-*.md`) with a steps table. Lives in `{thread}/plans/`. |
| **Design** | A design doc (`*-design.md`). Contains the design conversation log. Lives in `{thread}/`. |
| **Ctx** | A context summary doc, auto-generated or manually written. |

Thread layout: `loom/{weave-id}/{thread-id}/{thread-id}-idea.md`, `{thread-id}-design.md`, `plans/`, `done/`.

---

## Current active work

**Active design weaves:**
- `loom/vscode-extension/` — VS Code extension (human surface), builds on `getState` + `app` use cases
- `loom/ai-integration/` — MCP server (agent surface), global ctx, CLAUDE.md lifecycle

## VS Code Extension

**Key design docs (thread-based paths):**
- `loom/vscode-extension/vscode-extension/vscode-extension-design.md` — Architecture overview.
- `loom/vscode-extension/vscode-extension-visual/vscode-extension-visual-design.md` — Visual blueprint.
- `loom/vscode-extension/vscode-extension-toolbar/vscode-extension-toolbar-design.md` — ViewState and toolbar.
- `loom/vscode-extension/vscode-extension-ctx.md` — Session context summary (load this first).

**What's implemented:**
- `packages/vscode/src/extension.ts` — Activation, command registration, file watcher.
- `packages/vscode/src/tree/treeProvider.ts` — LoomTreeProvider with Thread nodes, using `getState`.
- `packages/vscode/src/icons.ts` — Unified icon system with Codicon fallback.
- `packages/vscode/src/view/viewStateManager.ts` and `viewState.ts`.
- `packages/vscode/src/commands/` — weaveIdea, weaveDesign, weavePlan, startPlan, grouping.

**What's missing:**
- File watcher with incremental index updates.
- Diagnostics for broken links.
- Remaining commands (finalize, rename, refine, completeStep, validate, summarise).
- Full test in VS Code Extension Host.

---

## Build and test

```bash
# Build all packages
./scripts/build-all.sh

# Run full test suite
./scripts/test-all.sh

# Run individual tests
npx ts-node --project tests/tsconfig.json tests/multi-loom.test.ts
npx ts-node --project tests/tsconfig.json tests/commands.test.ts
npx ts-node --project tests/tsconfig.json tests/id-management.test.ts
npx ts-node --project tests/tsconfig.json tests/workspace-workflow.test.ts

# Run MCP integration tests (spawns loom mcp subprocess)
npx ts-node --project tests/tsconfig.json packages/mcp/tests/integration.test.ts

# Run CLI from source
npx ts-node packages/cli/src/index.ts status

# Migration script (for new repos still on flat layout)
npx ts-node --project tests/tsconfig.json scripts/migrate-to-threads.ts --dry-run
```

---

## Document frontmatter conventions

All docs use this canonical key order (enforced by `serializeFrontmatter`):

```yaml
---
type: idea | design | plan | ctx
id: kebab-case-id
title: "Human Readable Title"
status: draft | active | ...
created: YYYY-MM-DD
version: 1
tags: []
parent_id: null
child_ids: []
requires_load: []
# design-specific:
role: primary | supporting
target_release: "0.x.0"
actual_release: null
---
```

**`requires_load`** lists workspace-relative document IDs that must be read before working on this doc.
Claude Code should honour this: read the listed docs before responding.

---

<!-- ═══════════════════════════════════════════════════════════════════════════
  MCP tools (Stage 2)

  Toggle: comment out this entire block (from the opening comment to the
  closing comment) to fall back to Stage 1 manual mode at any time.
═══════════════════════════════════════════════════════════════════════════ -->

## MCP tools (Stage 2)

> **Fallback toggle:** To revert to Stage 1 manual mode, comment out this
> entire section. The manual workflow (direct file edits following frontmatter
> conventions) remains valid as a fallback at all times.

### Claude Code config

Add this to `{workspace}/.claude/mcp.json` (project-scoped) or `~/.claude.json` (global):

```json
{
  "mcpServers": {
    "loom": {
      "command": "loom",
      "args": ["mcp"],
      "env": {
        "LOOM_ROOT": "${workspaceFolder}"
      }
    }
  }
}
```

### Primary entry points

| Entry point | When to use |
|-------------|-------------|
| `loom://thread-context/{weaveId}/{threadId}` resource | Load full context for a thread before working on it |
| `do-next-step` prompt | Get the next incomplete step with full context pre-loaded |
| `continue-thread` prompt | Review thread state and get a next-action suggestion |
| `validate-state` prompt | Review diagnostics and identify issues to fix |

### Rules

- **All Loom state mutations must go through MCP tools** — create doc, mark step done, rename, archive, promote. Never edit weave markdown files directly to change state — doing so bypasses reducers, link index, and plan-step validation.
- Use `loom://thread-context` before starting any thread work. It bundles everything the agent needs (idea, design, active plan, requires_load refs) in a single read.
- `do-next-step` prompt is the primary workflow driver: call it with the active planId to get context + step instruction in one shot.
- `loom_generate_*` tools require sampling support from the MCP client (Claude Code only). If sampling is unavailable, use `loom_create_*` tools manually.

<!-- end MCP tools (Stage 2) -->

---

## AI session rules

- **Chat Mode (default):** Respond naturally. Never modify frontmatter or files without explicit approval.
- **Action Mode:** Only when Rafa explicitly asks. Respond with a JSON proposal per the handshake protocol.
- **Never propose state changes** (version bumps, status transitions) without being asked.
- Rafa uses the name `Rafa` in `## Rafa:` headers. Respond under `## AI:`.
- Keep responses aligned with the ongoing design conversation in the document.
- **When asked to read a file ending in `-chat.md`**: reply by writing inside that doc at the bottom under `## AI:`. Continue replying inside the doc for all follow-up messages until Rafa says `close`.
- **MCP tools for Loom state changes:** All Loom state mutations (create doc, mark step done, rename, archive, promote) must go through MCP tools once MCP is active. Never edit weave markdown files directly to change state — doing so bypasses reducers, link index, and plan-step validation.

---

## Session start protocol

**These reads are mandatory at the start of every session — including when continuing from a compacted/summarized conversation. Never skip.**

1. Read `.loom/_status.md` — note Stage, active weave, active plan, last session.
2. Load thread context:
   - **Stage 2 (MCP active):** read `loom://thread-context/{weaveId}/{threadId}` resource — bundles idea, design, active plan, and `requires_load` refs in one call. Then call the `do-next-step` prompt with the active planId to get context + next step.
   - **Stage 1 (manual):** read the active plan file and its `requires_load` docs directly.
3. For VS Code extension work, load `loom/vscode-extension/vscode-extension-ctx.md` instead of reading all four design docs cold.

After completing the reads, output this block and **STOP**:

```
📋 Session start  [Stage {1|2}]
> Active weave:  {weave-id}
> Active plan:   {plan title} — Step {N}  (or "no active plan")
- Docs read: {doc1} ✓ · {doc2} ✓ · ...
- Last session: {date} — {summary}

STOP — waiting for go
```

**Any time a doc is read because a rule requires it** (outside session start), output:
`📄 {filename} read as required`

---

## Non-negotiable stop rules

1. **After each step**: mark ✅ in the plan · state the next step + files that will be touched · **STOP** — wait for `go`. For ad-hoc tasks (no active plan), end every response with a `Next:` line: one sentence describing what comes next, or "waiting for direction."
2. **Error loop**: after a 2nd consecutive failed fix — stop, write root-cause findings, wait for `go`. Never push forward blindly.
3. **Design decision**: when a decision affects architecture, API shape, or test design — explain options and trade-offs, **STOP** and wait.
4. **User says "STOP"**: respond with `Stopped.` only — nothing else.

---

## Collaboration style

- Discuss design before implementing — Rafa thinks out loud and reaches better solutions through dialogue.
- When a design question is open, present trade-offs and ask — don't just pick one.
- If Rafa's proposal has a problem, explain it briefly then let him respond.
- Don't rush to write code or create files until the design feels settled.
- Do not make any changes until you have 95% confidence in what you need to build. Ask follow-up questions until you reach that confidence.
- Always choose the cleanest, most correct approach even if it is harder or slower. Patches and workarounds accumulate debt. If the clean approach requires more work, say so — never silently pick the easy path.

---

## Applied learning

- `CLAUDE.md` is gitignored — changes are local only, never committed.
- Ask Rafa if something is not clear before proceeding.
- Clean approach always preferred — state the extra cost, never silently patch.
- Reducers must stay pure — no filesystem or VS Code calls inside reducer functions.
- Stage 1: always verify active plan step against actual file, not just `_status.md`.
- `getState()` is the single query entry point — never traverse files directly from the extension.
- `buildLinkIndex` must be called once per `getState`, then passed to `loadThread` — never N+1.
- Cross-plan blockers in `isStepBlocked`: missing plan = blocked, existing plan = not blocked (best-effort).
- `generatePlanId` regex matches plan IDs not filenames — no `.md` suffix in the pattern.
