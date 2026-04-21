---
type: design
id: weave-and-thread-design
title: "Weave and Thread — The True Graph Model"
status: active
created: 2026-04-21
version: 1
tags: [domain-model, graph, terminology, directory-structure]
parent_id: core-engine-design
child_ids: []
requires_load: [anchor-free-threads-design]
supersedes: [anchor-free-threads-design]
---

# Weave and Thread — The True Graph Model

## Goal

Refine Loom's domain model and terminology to fully embrace a graph‑based, zero‑friction workbench. Introduce the concepts of **Weave** (a project container) and **Thread** (a cohesive unit of work) with clear, simple internal structure. Define the directory layout, document linking rules, and the migration path from the previous anchor‑free model.

## Core Definitions

| Term | Definition | Filesystem Representation |
| :--- | :--- | :--- |
| **Weave** | A project container; a "carpet" of related work. | A folder under `weaves/` (formerly `threads/`). |
| **Thread** | A cohesive unit of work with a clear, linear progression: **one root idea → one design → many plans**. | A subdirectory under a Weave, named after the Thread. |
| **Root Document** | The entry point of a Thread. Can be an `idea` (typical), a `design` (fast‑tracked), or a `plan` (quick task). | The document that serves as the Thread's anchor, stored directly in the Thread folder. |
| **Loose Fiber** | A document that lives directly in a Weave root, not yet assigned to any Thread. | A `.md` file in the Weave folder (not in a Thread subdirectory). |

## 1. The Weave and Thread Metaphor

- **The Loom** is the tool (VS Code + CLI).
- You create a **Weave** (a carpet, a project).
- You weave **Threads** (units of work) into the carpet.
- Each Thread is made of **fibers** (documents: idea → design → plans).

This metaphor is intuitive, visual, and scales from solo projects to complex endeavors.

## 2. Thread Internal Structure (The "One Idea → One Design → N Plans" Rule)

To keep Threads focused and comprehensible, each Thread adheres to a simple structure:

- **Exactly one root idea** (optional but recommended).
- **Exactly one design** (created from the idea, or as a fast‑track design).
- **Zero or more plans** (implementation steps, linked to the design).

**Why this constraint?**
- **Clarity.** A Thread is a single, cohesive narrative. Multiple designs or multiple root ideas indicate separate workstreams and should be separate Threads.
- **Simplicity.** The filesystem structure (Thread folder) directly mirrors the logical structure.
- **Scalability.** Complex projects are modeled as **multiple Threads linked via `parent_id`**, not as a single monolithic Thread with tangled internal links.

### 2.1 What About Multiple Designs Exploring Alternatives?

Create separate Threads (e.g., `auth-jwt`, `auth-oauth`) and link them to a common parent idea using `parent_id`. The idea lives in one Thread; the alternative designs live in their own Threads and link back to it.

### 2.2 What About Fast‑Tracked Designs or Plans?

A Thread can start directly with a `design` or a `plan`. The root document is simply the first document created. The system does not enforce the presence of an idea.

## 3. Directory Structure

```
weaves/                           # Formerly threads/
├── core-engine/                  # A Weave (project)
│   ├── state-management/         # A Thread (workstream)
│   │   ├── state-management-idea.md
│   │   ├── state-management-design.md
│   │   └── plans/
│   │       ├── state-management-plan-001.md
│   │       └── state-management-plan-002.md
│   ├── event-bus/                # Another Thread
│   │   ├── event-bus-design.md   # Fast‑tracked design (root)
│   │   └── plans/
│   │       └── event-bus-plan-001.md
│   ├── loose-idea.md             # Loose fiber (unassigned)
│   └── references/               # Weave‑level references
├── vscode-extension/             # Another Weave
│   └── ...
└── _archive/                     # Archived weaves and threads
```

## 4. Document Linking Rules

- **Within a Thread:** Documents follow the natural chain: `idea → design → plans`. `parent_id` points to the immediate predecessor.
- **Across Threads:** A document in one Thread can link to a document in another Thread via `parent_id`. This creates a **graph of Threads** without complicating the internal structure of any single Thread.
- **Loose fibers:** Have no `parent_id`. They can be linked later, at which point the system may offer to move them into an appropriate Thread folder.

## 5. Thread Creation and Naming

| Scenario | Command | Result |
| :--- | :--- | :--- |
| Start a new Thread with an idea | `loom weave idea "State Management" --thread state-management --weave core-engine` | Creates `weaves/core-engine/state-management/state-management-idea.md`. |
| Start a fast‑track design | `loom weave design "Event Bus" --weave core-engine` | Creates a new Thread folder `event-bus/` with the design as root. |
| Quick plan (standalone) | `loom weave plan "Hotfix" --weave core-engine` | Creates a Thread folder `hotfix/` with the plan as root. |
| Create a loose fiber | `loom weave idea "Random Thought" --weave core-engine` (omit `--thread`) | Creates `weaves/core-engine/loose-idea.md`. |

## 6. UI Representation

### 6.1 VS Code Tree View

```
🧵 core-engine (Weave)
   🧶 state-management (Thread) [ACTIVE]
      💡 state-management-idea.md
      📄 state-management-design.md
      📋 Plans
         📋 state-management-plan-001.md [implementing]
   🧶 event-bus (Thread) [ACTIVE]
      📄 event-bus-design.md
      📋 Plans
         📋 event-bus-plan-001.md [draft]
   📄 loose-idea.md (Loose Fiber)
```

- Each Thread is a top‑level node under the Weave.
- Loose fibers appear directly under the Weave, with a distinct icon.
- Thread status is derived from its plans (same priority order as defined in `anchor-free-threads-design.md`).

### 6.2 CLI `loom status`

```
🧵 Weave: core-engine

   🧶 state-management (Thread)
      Status: IMPLEMENTING
      Design: State Management Design (v1)
      Plans: 2 (1 implementing, 1 draft)

   🧶 event-bus (Thread)
      Status: ACTIVE
      Design: Event Bus Design (v1)
      Plans: 1 (draft)

   📄 Loose Fibers
      💡 loose-idea.md (draft)
```

## 7. Migration Path

| Phase | Description |
| :--- | :--- |
| **Current (Anchor‑Free Phase 2)** | Code uses `threads/` folder and `Thread` aggregate with `designs[]`. |
| **Phase 3 (Cleanup)** | Remove `getPrimaryDesign()` helper and `validateSinglePrimaryDesign`. |
| **Phase 4 (True Graph)** | Implement the Weave/Thread model: rename `threads/` → `weaves/`, introduce Thread subdirectories, update `loadThread` to scan Thread folders, implement loose fiber handling, update CLI and VS Code UI. |
| **Phase 5 (Deprecate `role`)** | Remove the `role` field entirely from the domain model. |

## 8. Benefits

| Benefit | Description |
| :--- | :--- |
| **Clear Mental Model** | Weave = project, Thread = workstream, Fiber = document. |
| **Filesystem as UI** | The directory structure directly reflects the logical organization. |
| **Drag‑and‑Drop Ready** | Moving a document into a Thread folder can auto‑set `parent_id`. |
| **Scalable Complexity** | Complex projects use multiple Threads linked together, not tangled internal graphs. |
| **Zero Friction** | Loose fibers allow quick capture of ideas without immediate organization. |

## 9. Open Questions

- Should a Thread folder be allowed to contain loose fibers? (Recommendation: No. Loose fibers live at the Weave root. A Thread folder contains exactly the documents of that workstream.)
- How to handle renaming a Thread? (Renaming the folder updates the Thread name. Inbound `parent_id` links are by document ID, so they remain intact.)
- Should we allow moving a document between Threads via drag‑and‑drop? (Yes. This is a core UX feature of Phase 4.)

## 10. Decision

Adopt the Weave and Thread model as the true graph architecture. Implement Phase 3 cleanup immediately. Defer Phase 4 and Phase 5 until after the VS Code extension core is stable.

## Next Steps

- Complete Phase 3 cleanup (remove `getPrimaryDesign` and `validateSinglePrimaryDesign`).
- Create `weave-and-thread-plan-001.md` for Phase 4 implementation.