# Architecture Overview

This document provides a high-level technical overview of the AI-native Workflow System. It is intended for contributors and users who want to understand how the system derives state, handles events, and maintains integrity without a central database.

## 1. Core Philosophy: Filesystem as Database

The system is built on a single, uncompromising principle:

> **Markdown files are the single source of truth. There is no central state machine.**

We do not store workflow status in a hidden `.json` cache, SQLite database, or in-memory global variable. Instead, the status of a feature is **derived** by reading the frontmatter of the Markdown files on disk.

**Consequences of this choice:**
- **Git-Native:** Every state change is a version-controlled file diff.
- **Human-Readable:** Users can view and edit status directly in the editor without opening a special UI.
- **Resilience:** If the extension crashes, the state is intact. If the CLI stops working, the files are still valid.

---

## 2. System Components

The system is composed of five distinct layers, each with a single responsibility.

```text
┌─────────────────────────────────────────────────────────────┐
│                      VS Code Extension                       │
│  (Tree View, Commands, Decorations, AI Prompt Injection)    │
└──────────────────────────────┬──────────────────────────────┘
                               │ (Triggers Events / Reads State)
┌──────────────────────────────▼──────────────────────────────┐
│                         Orchestrator                         │
│  (Validates Events, Routes to Reducers, Manages Effects)    │
└───────────────┬───────────────────────────────┬─────────────┘
                │                               │
┌───────────────▼───────────────┐ ┌─────────────▼─────────────┐
│     Core Engine (Reducers)     │ │      Effects Layer        │
│  (Pure functions that update   │ │ (Side effects: File I/O,  │
│   frontmatter state objects)   │ │  Run Command, Context Gen)│
└───────────────┬───────────────┘ └─────────────┬─────────────┘
                │                               │
┌───────────────▼───────────────────────────────▼─────────────┐
│                   Filesystem Integration                     │
│  (Markdown Parser, Frontmatter Read/Write, Watchers)        │
└─────────────────────────────────────────────────────────────┘
```

### 2.1 The Document Model (`BaseDoc`)
All documents (`idea`, `design`, `plan`, `ctx`) share a common frontmatter structure:
- `id`: Unique identifier (typically the filename or slug).
- `type`: `idea`, `design`, `plan`, or `ctx`.
- `status`: The state machine status (e.g., `draft`, `active`, `implementing`).
- `parent_id` / `child_ids`: The relational links that define the **Feature**.

### 2.2 Derived State (The Brain)
The `ViewState` and `Feature` aggregates are **never saved to disk**. They are computed on-the-fly.
- **Feature Resolution:** A recursive function walks `parent_id` links until it finds a `type: design` document. All documents that resolve to the same Design are grouped into a `Feature` object.
- **Status Calculation:**
    - If any plan is `implementing` → Feature is `IMPLEMENTING`.
    - Else if any doc is `active` → Feature is `ACTIVE`.
    - Else if all plans are `done` → Feature is `DONE`.
- **Staleness Detection:** A plan is `staled` if its `design_version` field is less than the current `version` field of the linked design document.

### 2.3 Event-Driven Architecture
State changes **only** happen via events. The UI or CLI never mutates a file directly.

**Event Flow:**
1.  **Trigger:** User clicks "Start Plan" in VS Code.
2.  **Event Object:** `{ type: 'START_PLAN', payload: { planId: 'plan-001' } }`.
3.  **Orchestrator:** Calls `applyEvent(feature, event)`.
4.  **Reducer:** A pure function updates the `status` of the `plan-001` document object.
5.  **Effects:** The orchestrator passes the updated document object to the Effects Layer to write the file to disk.

### 2.4 Reducers (Pure Logic)
Located in `core/designReducer.ts` and `core/planReducer.ts`, these functions have the signature:
```ts
function reducer(doc: BaseDoc, event: Event): BaseDoc
```
They contain **no side effects** (no `fs.writeFile`, no network calls). This makes them trivially testable and deterministic.

### 2.5 Effects Layer
After a reducer calculates the new state, the Effects Layer executes the necessary side effects:
- **File Writer:** Serializes the updated frontmatter and Markdown content back to the correct file path.
- **Context Generator:** If `design.md` exceeds the token threshold, it triggers the creation of `design-ctx.md`.
- **Command Runner:** If configured via `workflow.yml`, it spawns subprocesses (e.g., `npm run lint`).

---

## 3. Key Architectural Flows

### 3.1 Loading the VS Code Tree View
1.  File watcher detects a change in `features/**/*.md`.
2.  Debounce (300ms).
3.  **Cache Invalidation:** Clears the cache for that specific feature directory.
4.  **Parser:** `loadAllFeatures()` reads all frontmatter into `BaseDoc[]` objects.
5.  **ViewModel:** Applies active filters (`ViewState`) and grouping strategy (`groupByFeature` or `groupByType`).
6.  **Render:** `TreeDataProvider` renders the virtual nodes.

### 3.2 AI Handshake Protocol
This is the critical bridge between the human and the LLM.
1.  **Context Injection:** The extension builds a prompt containing:
    - The active `ViewState`.
    - Full text of `design.md` (or `design-ctx.md` if large).
    - Current plan steps.
2.  **AI Response Parsing:** The AI is instructed to respond with a JSON block:
    ```json
    {
      "proposed_action": "REFINE_DESIGN",
      "reasoning": "The user wants to switch from SQLite to Postgres.",
      "requires_approval": true
    }
    ```
3.  **Approval UI:** The extension shows a diff preview of the proposed frontmatter changes.
4.  **Execution:** Upon approval, the extension fires the `REFINE_DESIGN` event through the standard event pipeline.

### 3.3 Custom Workflow Execution (`workflow.yml`)
The system supports declarative workflow overrides. When an event fires:
1.  The orchestrator loads the relevant `workflow.yml` (Feature-specific or Workspace root).
2.  It validates that the current document `status` matches the `from_status` defined in the YAML.
3.  It determines the `to_status`.
4.  It enqueues the `effects` list (e.g., `increment_version`, `run_command`).
5.  **Security Check:** If `run_command` is present, the system checks the `allowShellCommands` setting and scans the command against a deny-list before execution.

---

## 4. Performance & Caching Strategy

Derived state calculation is **O(N)** relative to the number of documents. To ensure a responsive UI even with hundreds of features:
- **Feature-Level Caching:** The result of `buildFeatures(docs)` is cached per feature directory.
- **Invalidation:** File watchers only invalidate the cache for the specific feature that changed.
- **Memoization:** Pure functions like `resolveDesign()` are memoized during a single calculation cycle.

---

## 5. Security Model

| Vector | Mitigation |
|--------|------------|
| **Arbitrary Code Execution** | `run_command` effect is **disabled by default**. Requires user opt-in via `workflow.allowShellCommands: true`. |
| **Path Traversal** | The `cwd` for commands is restricted to the workspace root unless `allowOutsideCwd: true` is explicitly set. |
| **Secret Leakage** | Environment variable filtering prevents `*TOKEN*` or `*SECRET*` variables from being passed to subprocesses unless explicitly allowed. |
| **Prompt Injection** | AI responses are parsed as strict JSON. Malformed or extra-text responses are rejected and shown to the user for manual review. |

---

## 6. Extension Points

The architecture is designed to be extended without modifying the core engine:

1.  **Custom Document Types:** Add new types to `workflow.yml` (e.g., `research`, `review`).
2.  **Custom Effects:** While the effect library is built-in for security, users can trigger arbitrary scripts via `run_command` (if enabled).
3.  **Custom Validators:** `wf validate` uses a simple expression language defined in `workflow.yml` to enforce cross-document consistency rules.