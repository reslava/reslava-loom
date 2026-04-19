---
type: design
id: vscode-extension-visual-design
title: "VS Code Extension — Visual Design Blueprint"
status: active
created: 2026-04-19
version: 1.1.0
tags: [vscode, ui, tree-view, toolbar, design]
parent_id: vscode-extension-design
child_ids: []
requires_load: [vscode-extension-design]
---

# VS Code Extension — Visual Design Blueprint

## Goal

Define the complete visual and interactive behavior of the Loom VS Code extension. This document serves as the blueprint for the tree view, toolbar, command palette, file watcher, and AI approval panel. It ensures the UI layer is a thin, consistent consumer of the `app` layer use‑cases.

## 1. Tree View

### 1.1 Root Level: Threads

The primary view is named "Loom" and appears in the Explorer sidebar. It displays a hierarchical list of all threads in the active loom.

```
🧵 Loom
├── 📁 core-engine (ACTIVE)
├── 📁 vscode-extension (ACTIVE)
├── 📁 ai-integration (IMPLEMENTING)
└── 📁 docs-infra (DONE)
```

### 1.2 Thread Node (Expanded)

When expanded, each thread reveals its documents grouped by type.

```
📁 core-engine (ACTIVE)
├── 📄 core-engine-design.md (primary design)
├── 📁 Supporting Designs
│   └── 📄 core-engine-run-command-design.md
├── 📁 Plans
│   ├── 📋 core-engine-plan-001.md (implementing)
│   └── 📋 core-engine-plan-002.md (draft) ⚠️ stale
├── 📁 Ideas
│   └── 💡 core-engine-idea.md
├── 📁 Contexts
│   └── 📝 core-engine-ctx.md
├── 📁 Done
│   └── 📄 old-design.md
├── 📁 Deferred
│   └── 💡 future-idea.md
└── 📁 Chats
    └── 💬 2026-04-19-design-debate.md
```

### 1.3 Node Icons & Decorations

| Node Type | Icon | Description |
| :--- | :--- | :--- |
| Thread (ACTIVE) | 📁 | Folder icon, no decoration. |
| Thread (IMPLEMENTING) | 📁 | Blue dot or `🔄` overlay. |
| Thread (DONE) | 📁 | Green check `✅` overlay. |
| Primary Design | 📄 | Document icon. |
| Supporting Design | 📄 | Document icon, dimmed. |
| Plan (draft) | 📋 | Clipboard icon. |
| Plan (implementing) | 📋 | Blue `🔄` overlay. |
| Plan (done) | 📋 | Green `✅` overlay. |
| Plan (stale) | 📋 | Yellow `⚠️` warning overlay. |
| Idea | 💡 | Lightbulb icon. |
| Context | 📝 | Note icon. |
| Chat | 💬 | Comment icon. |

### 1.4 Context Menus

Right‑clicking a node reveals context‑specific actions.

| Node Type | Actions |
| :--- | :--- |
| Thread | Weave Idea, Weave Design, Refresh, Validate |
| Primary Design | Open, Refine Design, Summarise Context, Validate |
| Plan | Open, Start Plan, Complete Step…, Validate |
| Idea | Open, Finalize, Rename, Delete |
| Chat | Open, Archive, Promote to Idea |

All actions delegate to the corresponding `app` use‑case.

## 2. Toolbar

The view title bar contains controls for grouping, filtering, and primary actions.

### 2.1 Toolbar Layout

```
[ Group By ▼ ]  [ 🔍 Filter ]  [ ☑ Show Archived ]  [ ✚ Weave ▼ ]
```

### 2.2 Grouping Selector

Clicking "Group By" opens a QuickPick with options:

- **Type** – Flat list grouped by document type.
- **Thread** – Hierarchical by thread (default).
- **Status** – Group by workflow status.
- **Release** – Group by target release version.

The selection updates the `ViewState` and refreshes the tree.

### 2.3 Filter Controls

| Control | Behavior |
| :--- | :--- |
| 🔍 Filter | Text input that filters tree items by name or title. |
| ☑ Show Archived | Toggle to include `done/` and `deferred/` documents in the tree. |

### 2.4 Weave Dropdown

Provides quick access to creation commands:

- **Weave Idea** – Prompts for title, calls `app/weaveIdea`.
- **Weave Design** – Prompts for thread selection, calls `app/weaveDesign`.
- **Weave Plan** – Prompts for thread selection, calls `app/weavePlan`.
- **New Chat** – Creates a new chat file in `chats/`.

## 3. Command Palette

All commands are prefixed with `Loom:` and accessible via `Ctrl+Shift+P`.

| Command | `app` Use‑Case |
| :--- | :--- |
| `Loom: Weave Idea` | `weaveIdea` |
| `Loom: Weave Design` | `weaveDesign` |
| `Loom: Weave Plan` | `weavePlan` |
| `Loom: Finalize Document` | `finalize` |
| `Loom: Rename Document` | `rename` |
| `Loom: Refine Design` | `runEvent(REFINE_DESIGN)` |
| `Loom: Start Plan` | `runEvent(START_IMPLEMENTING_PLAN)` |
| `Loom: Complete Step` | `completeStep` |
| `Loom: Summarise Context` | `summarise` |
| `Loom: Validate Thread` | `validate` |
| `Loom: Show Status` | `status` (via `getState`) |
| `Loom: Switch Loom` | `switchLoom` (only in multi‑loom mode) |
| `Loom: List Looms` | `listLooms` |

## 4. File Watcher

The extension watches `**/threads/**/*.md` for changes.

```
File change → Debounce (300ms) → getState() → Diff with cached state → Tree refresh (changed nodes only)
```

### 4.1 Flow Details

1. **File System Event:** A `.md` file within `threads/` is created, changed, or deleted.
2. **Debounce:** A 300ms debounce prevents excessive refreshes during rapid edits.
3. **`getState()` Call:** The extension calls `app/getState()`, which performs a **full link index rebuild** and loads all threads. This guarantees consistency with the filesystem.
4. **Diff with Cached State:** The `LoomTreeProvider` compares the newly returned `LoomState` with its internally cached `LoomState`. It identifies which threads have been added, removed, or modified (by comparing `thread.id` and a shallow hash of each thread's document IDs and statuses).
5. **Selective Tree Refresh:** The tree provider fires change events **only for the threads that actually changed**. VS Code's tree view efficiently re‑renders only those nodes.

### 4.2 Performance Characteristics

| Aspect | Behavior |
| :--- | :--- |
| **Index Build** | Full scan of `threads/` directory and frontmatter parsing. Fast for typical Loom workspaces (up to hundreds of documents). |
| **Tree Rendering** | Only modified threads are re‑rendered, minimizing UI work. |
| **Debounce** | Prevents excessive refreshes during rapid typing or batch operations. |

### 4.3 Future Optimization Path

If real‑world usage reveals performance bottlenecks with very large workspaces (500+ threads), the architecture is designed to accommodate a true incremental path:

```
File change → updateIndexForFile() → updateState() → Tree refresh
```

This would require:
- An `updateState` use‑case in the `app` layer that accepts a pre‑updated `LinkIndex`.
- Caching the `LinkIndex` in the extension and patching it via `updateIndexForFile`.

This optimization is **deferred** and will only be pursued if performance data justifies the added complexity.

### 4.4 Diagnostics

Diagnostics (squiggles for broken links, missing fields) are updated on the same refresh cycle. After `getState()` returns, the extension calls `app/validate` and converts the returned issues to VS Code `Diagnostic` objects.

## 5. AI Approval Panel (Webview)

When the user invokes `Loom: AI Propose` (Action Mode), a webview panel appears.

### 5.1 Workflow

1. User selects a design document and runs `Loom: AI Propose`.
2. Extension calls `app/aiPropose` (future use‑case) with the document context.
3. AI returns a JSON proposal (`REFINE_DESIGN`, `CREATE_PLAN`, etc.).
4. Webview displays:
   - **Reasoning:** The AI's explanation.
   - **Diff View:** Side‑by‑side comparison of current vs. proposed frontmatter.
   - **Buttons:** [Approve] [Edit Prompt] [Cancel]
5. On approval, the extension fires the corresponding event via `app/runEvent`.
6. The document is updated, and the tree view refreshes.

### 5.2 Webview UI Sketch

```
┌─────────────────────────────────────────────────────────────┐
│  AI Proposal                                                │
├─────────────────────────────────────────────────────────────┤
│  Reasoning: The user wants to switch from SQLite to         │
│  PostgreSQL. This requires incrementing the design version  │
│  and marking dependent plans as stale.                      │
├─────────────────────────────────────────────────────────────┤
│  Proposed Changes (design.md)                               │
│  ┌─────────────────────────┬─────────────────────────────┐  │
│  │ Current                 │ Proposed                    │  │
│  ├─────────────────────────┼─────────────────────────────┤  │
│  │ status: active          │ status: active              │  │
│  │ version: 2              │ version: 3                  │  │
│  │                         │ refined: true               │  │
│  └─────────────────────────┴─────────────────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│  [Approve]  [Edit Prompt]  [Cancel]                         │
└─────────────────────────────────────────────────────────────┘
```

## 6. Integration with `app` Layer

All UI actions are thin wrappers. Example for "Weave Idea":

```typescript
async function weaveIdeaCommand() {
    const title = await vscode.window.showInputBox({ prompt: 'Idea title' });
    if (!title) return;
    const result = await weaveIdea({ title }, { getActiveLoomRoot, saveDoc, fs });
    vscode.window.showInformationMessage(`Idea woven: ${result.tempId}`);
    treeProvider.refresh();
}
```

No business logic lives in the extension—only presentation and user input collection.

## 7. Call Flow Symmetry

The architecture ensures identical data flow for both the CLI and the VS Code extension.

### 7.1 VS Code Extension — File Watcher

```
File System Event → Debounce → getState() → Tree Refresh
                           │
                           ▼
              ┌──────────────────────────┐
              │         app/getState     │
              │  • buildLinkIndex (full) │
              │  • loadThread (all)      │
              │  • filters & sorting     │
              └──────────────────────────┘
                           │
                           ▼
              ┌──────────────────────────┐
              │      fs repositories     │
              │  • scan threads/         │
              │  • parse frontmatter     │
              └──────────────────────────┘
```

### 7.2 CLI `loom status`

```
User Command → statusCommand() → getState() → Console Output
                                       │
                                       ▼
                          ┌──────────────────────────┐
                          │         app/getState     │
                          │  • buildLinkIndex (full) │
                          │  • loadThread (all)      │
                          │  • filters & sorting     │
                          └──────────────────────────┘
                                       │
                                       ▼
                          ┌──────────────────────────┐
                          │      fs repositories     │
                          │  • scan threads/         │
                          │  • parse frontmatter     │
                          └──────────────────────────┘
```

This symmetry is the hallmark of our clean architecture: thin delivery layers, a unified `app` layer, and pure infrastructure and domain layers.

## 8. Next Steps

- Implement `vscode-extension-plan-004` (core tree view).
- Implement `vscode-extension-plan-005` (thread‑based grouping).
- Implement `vscode-extension-plan-006` (toolbar controls).
- Add AI approval panel as a follow‑up plan.

---
*Last updated: 2026-04-19*
