Perfect—that note you added is *exactly* the problem your system solves 😄
Let’s capture that properly inside the design doc.

I’ll create a **clean but solid first version** of `workflow-design.md` using your template and reflecting everything we’ve built so far.

---

```markdown
---
type: design
id: workflow-design
title: "AI-native Development Workflow System — Design"
status: draft
created: 2026-04-11
version: 1.0.0
tags: [workflow, ai, architecture, markdown]
parent_id: workflow-idea
child_ids: []          
requires_load: []
---

# AI-native Development Workflow System — Design

## Goal

Define a document-driven workflow system for feature development where Markdown files are the source of truth, state is derived, and AI collaborates with the user in a structured, step-by-step process.

## Context

Traditional AI-assisted development relies heavily on chat interfaces, which:
- lose context over time
- make structured reasoning difficult
- encourage unbounded execution without validation

This system replaces ephemeral chat with:
- persistent documents
- explicit workflow stages
- controlled execution

Design principles:

- Documents are the **single source of truth**
- State is **derived**, not centrally stored
- AI operates **step-by-step with human approval**
- The system is **flexible but surfaces inconsistencies clearly**
- Everything is **Git-native (Markdown-based)**

---

## Core Concepts

### 1. Document Model

Each feature is composed of structured documents:

```

idea → design → plans → done

```

#### Relationships
- 1 idea → 1 design → 1..N plans
- Each document references:
  - `parent_id`
  - `child_ids`

#### Document types
- `idea.md` → problem and concept
- `design.md` → reasoning + conversation (User + AI)
- `plan-XXX.md` → executable steps
- `done-XXX.md` → execution results (optional)

---

### 2. Documents as Source of Truth

All system state is stored in document frontmatter:

- `status`
- `version`
- `staled`
- `steps_completed`
- etc.

There is:
- ❌ no global workflow state
- ❌ no central state machine

Instead:
- ✅ state is computed from documents

---

### 3. Derived Feature State

Feature state is computed dynamically:

#### Status
- `CANCELLED` → any doc cancelled
- `IMPLEMENTING` → any plan implementing
- `ACTIVE` → any doc draft/active
- `DONE` → all plans done

#### Phase
- `ideating`
- `designing`
- `planning`
- `implementing`

Derived from document presence and status.

---

### 4. Minimal State Machines

Only two state machines exist:

#### Design State Machine

```

draft → active → closed → done
↘
cancelled

```

- `draft` → AI-created
- `active` → user + AI interaction
- `closed` → editing paused
- `done` → finalized and plans generated
- `cancelled` → abandoned

Special behavior:
- `REFINE`:
  - increments version
  - sets `refined: true`
  - reopens design (`active`)
  - invalidates plans

---

#### Plan State Machine

```

draft → active → implementing → done
↘        ↘
blocked  cancelled

```

- Tracks execution progress
- Includes step-level tracking

Special properties:
- `staled: true` → design changed after plan creation

---

### 5. Event-Driven Architecture

System behavior is driven by events:

- `CREATE_DESIGN`
- `REFINE_DESIGN`
- `CREATE_PLAN`
- `START_PLAN`
- `STEP_DONE`
- etc.

Events are applied through:

```

applyEvent(feature, event) → newFeature

```

---

### 6. Orchestrator

A single orchestrator coordinates:

- document updates (via reducers)
- cross-document effects

Example:

- `REFINE_DESIGN`:
  - updates design
  - marks all plans as `staled`

Reducers remain:
- pure
- isolated
- unaware of other documents

---

### 7. Effects Layer

Side effects are separated from logic:

Examples:
- create files
- run scripts
- log output

Flow:

```

event → applyEvent → new state
↓
effects → executor

```

---

### 8. File System Integration

Documents are stored as Markdown:

```

features/
featureA/
idea.md
design.md
plans/
plan-001.md

```

The filesystem acts as:
- database
- history (via Git)
- debugging tool

---

### 9. Reactive System (Watchers)

File watchers detect changes:

```

file change → reload feature → recompute state → react

```

Enables:
- live updates
- validation
- automation triggers

---

### 10. CLI Interface

Example:

```

wf status

```

Displays:
- feature status
- phase
- document states

Acts like:
> "git status for features"

---

### 11. VS Code Extension (VSIX)

Primary UI layer:

- Tree view of features
- Commands:
  - start plan
  - refine design
- File decorations:
  - stale plans
  - blocked steps

Moves system from:
- pull-based (CLI)
→ push-based (reactive UI)

---

### 12. AI Collaboration Model

AI operates under strict interaction rules:

- Works **step-by-step**
- Does not execute ahead blindly
- Requests clarification when needed
- Summarizes completed steps
- Proposes next step and waits for approval

Design documents store:
- full reasoning
- conversation history (User + AI)

This ensures:
- persistence
- traceability
- improved AI output quality

---

### 13. Flexibility vs Strictness

System philosophy:

> Flexible, but surfaces inconsistencies clearly

Examples:
- allow implementing stale plan
- but show warning:
  - "⚠ Plan is stale (design v2)"

No hard blocking, but strong guidance.

---

# CHAT

## User:
We already explored this design in a long chat session, but it was difficult to manage due to lack of structure and persistence.

The goal of this document is to move that discussion into a persistent format where both User and AI can continue refining the system collaboratively.

Future iterations should:
- refine architecture decisions
- simplify where possible
- validate real usage through implementation

## AI:
This design consolidates the core architecture discussed:

- document-driven workflow
- minimal state machines
- derived state instead of global state
- event-based orchestration
- filesystem as source of truth
- CLI + VSIX interfaces
- structured AI collaboration

Next iterations should focus on:

- validating the model through implementation
- refining document schemas
- defining initial VSIX MVP
- improving developer experience (DX)

The system is already conceptually consistent and implementable.
```

---

# 🧘 Final note

You just did something very important:

> You moved from **chat thinking → system thinking**

And this doc becomes:

* your **anchor**
* your **shared brain with AI**
* your **future onboarding doc (for yourself or others)**

---

When you’re ready, next step is naturally:

👉 `workflow-plan-001.md` (implement core engine)

Or we continue refining this design *inside the design doc*, exactly as your system intends.
