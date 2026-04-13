# Workspace Directory Structure

Visual reference for a complete workspace using the Reslava workflow system.
Shows both system configuration (`.wf/`) and user feature documents (`features/`).

```
workspace-root/
│
├── .wf/                                         # Workflow system configuration (committed to Git)
│   ├── default-wf.yml                           # Built‑in fallback workflow (read‑only reference)
│   ├── workflow.yml                             # (Optional) Custom workflow overrides
│   │
│   ├── templates/                               # Document templates for scaffolding
│   │   ├── idea-template.md
│   │   ├── design-template.md
│   │   ├── plan-template.md
│   │   └── ctx-template.md
│   │
│   ├── prompts/                                 # AI session bootstrap prompts
│   │   └── SESSION_START.md                     # Paste into chat to initialize context
│   │
│   ├── schemas/                                 # JSON Schemas for editor validation
│   │   └── workflow-schema.json                 # Validates workflow.yml inline (VS Code YAML ext)
│   │
│   └── cache/                                   # Local derived state cache (ignored by Git)
│       └── features.json                        # Cached feature aggregates
│                                                # Invalidated per-feature when any .md file changes
│
├── features/                                    # All active features live here
│   │
│   ├── payment-system/                          # Feature folder (name = feature ID)
│   │   │
│   │   ├── payment-system-idea.md               # Idea document (optional)
│   │   │
│   │   ├── payment-system-design.md             # PRIMARY design (anchor, required)
│   │   ├── payment-system-design-webhooks.md    # Supporting design (role: supporting)
│   │   ├── payment-system-design-security.md    # Supporting design (role: supporting)
│   │   │                                        # Supporting designs sorted by `created` date
│   │   │
│   │   ├── payment-system-ctx.md                # Auto‑generated context summary (always current,
│   │   │                                        # overwritten on each generation)
│   │   │
│   │   ├── plans/                               # Implementation plans
│   │   │   ├── payment-system-plan-001.md       # parent_id → primary design
│   │   │   ├── payment-system-plan-002.md       # parent_id → webhooks design
│   │   │   ├── payment-system-plan-003.md       # parent_id → security design
│   │   │   └── ...
│   │   │
│   │   ├── ctx/                                 # Manual session checkpoints (historical archive)
│   │   │   ├── payment-system-ctx-2026-04-12.md # Never overwritten — permanent record
│   │   │   └── payment-system-ctx-2026-04-15.md
│   │   │
│   │   └── references/                          # Feature‑specific reference files
│   │       ├── api-spec.pdf
│   │       └── wireframes/
│   │
│   ├── user-auth/                               # Another feature
│   │   ├── user-auth-design.md                  # PRIMARY design
│   │   ├── plans/
│   │   │   └── user-auth-plan-001.md
│   │   └── ...
│   │
│   └── _archive/                                # Completed / abandoned features
│       ├── done/                                # shipped
│       ├── cancelled/                           # decided not to pursue
│       ├── postponed/                           # good idea, wrong time
│       └── superseded/                          # replaced by a different feature or design
│
├── references/                                  # Global references shared by all features
│   ├── style-guide.md
│   ├── adr/                                     # Architecture Decision Records
│   │   ├── adr-001-database-choice.md
│   │   └── adr-002-api-design.md
│   └── research/
│
├── .gitignore                                   # Ignores .wf/cache/, ctx/ (optional)
├── package.json                                 # Actual project files
├── src/                                         # Application source code
└── ...
```

---

## Key File Naming Conventions (Suffixes)

| Document Type | Filename Pattern | Example |
|---------------|-----------------|---------|
| Idea | `*-idea.md` | `payment-system-idea.md` |
| Design (primary) | `*-design.md` | `payment-system-design.md` |
| Design (supporting) | `*-design-{topic}.md` | `payment-system-design-webhooks.md` |
| Plan | `*-plan-*.md` | `payment-system-plan-001.md` |
| Context summary | `*-ctx.md` | `payment-system-ctx.md` |
| Session checkpoint | `*-ctx-{date}.md` | `payment-system-ctx-2026-04-12.md` |

---

## Design Roles

Each feature has exactly **one primary design** (the feature anchor) and any number of **supporting designs** (scoped sub-topics). Supporting designs are sorted by `created` date — no manual ordering required.

```yaml
# Primary design — required, one per feature
role: primary

# Supporting design — optional, many allowed
role: supporting
```

Plans may have either the primary or a supporting design as their `parent_id`. Feature identity always resolves to the primary design regardless of which design a plan hangs off.

---

## Context Files: Two Distinct Purposes

| File | Location | Purpose | Lifecycle |
|------|----------|---------|-----------|
| `*-ctx.md` | Feature root | Auto-generated summary of current design state | Overwritten on each generation |
| `*-ctx-{date}.md` | `ctx/` subfolder | Manual session checkpoint — what was decided, what's next | Never overwritten, permanent record |

The root ctx is always "latest summary." The `ctx/` subfolder is the historical archive.

---

## Important Files Explained

| Path | Purpose |
|------|---------|
| `.wf/default-wf.yml` | Built‑in default workflow (fallback if no custom config). Do not edit. |
| `.wf/workflow.yml` | User‑provided custom workflow (overrides default). |
| `.wf/templates/` | Scaffolding templates used by `wf new` commands. |
| `.wf/schemas/workflow-schema.json` | JSON Schema for `workflow.yml` — enables inline validation in VS Code. |
| `.wf/prompts/SESSION_START.md` | Bootstrap prompt to initialize AI context in external chat tools. |
| `.wf/cache/` | Local derived state cache (Git-ignored). Invalidated per-feature on any `.md` change. |
| `features/<feature>/` | One directory per feature. Folder name = feature ID. |
| `features/<feature>/*-design.md` | PRIMARY design — anchor document, defines the feature root. Required. |
| `features/<feature>/*-design-{topic}.md` | SUPPORTING design — scoped sub-topic. Optional, many allowed. |
| `features/<feature>/plans/` | Optional subdirectory for plan documents (keeps feature root tidy). |
| `features/<feature>/ctx/` | Manual session checkpoints — historical archive, never auto-overwritten. |
| `features/_archive/` | Manually moved completed features — hidden from active tree view by default. |
| `references/` | Global documents shared across features (not tied to any specific feature). |

---

## Feature Model Summary

```
Feature (identity = primary design id)
├── 1 idea                    (optional)
├── 1 design (role: primary)  (required — anchor)
├── n designs (role: supporting, sorted by created)
└── n plans   (parent_id → primary OR supporting design)
```

This structure supports feature isolation, clean archiving, and clear separation between system configuration and user content. The VS Code tree view groups documents by feature using `parent_id` links — the physical layout mirrors the logical model.
