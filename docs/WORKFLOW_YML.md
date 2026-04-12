# Workflow Configuration (`workflow.yml`)

This document defines the declarative schema and capabilities of the `workflow.yml` file. It allows you to customize document types, status transitions, and automated side effects **without writing a single line of TypeScript or touching the core engine.**

---

## 1. Overview

The workflow system comes with a **built-in default workflow** (`idea → design → plan → done`). However, different projects have different processes. You might be writing a blog post, managing a research project, or following a custom QA process.

By placing a `workflow.yml` file in your workspace, you override the default behavior and define your own domain-specific workflow.

**Key Principle:** Configuration over Code. The workflow is defined as data, not logic.

---

## 2. Placement & Discovery

The system looks for `workflow.yml` in two locations, with the following precedence:

1.  **Feature-specific:** `features/<feature-name>/workflow.yml` (Highest priority — applies only to that specific feature).
2.  **Workspace-wide:** `.wf/workflow.yml` (Applies to all features in the workspace).

If no `workflow.yml` is found, the system falls back to the **Built-in Default Workflow** (see Section 7).

---

## 3. Schema Reference

The file must be valid YAML and adhere to the following versioned schema.

### 3.1 Root Structure

```yaml
name: string                # Human-readable name for this workflow (e.g., "Blog Post Pipeline")
version: 1                  # Schema version. MUST be 1.

documents:                  # List of document type definitions
  - ...                     # See 3.2

events:                     # List of allowed state transitions and side effects
  - ...                     # See 3.3

validation:                 # (Optional) Cross-document integrity rules
  - ...                     # See 3.4
```

### 3.2 Document Definition (`documents`)

Each entry defines a type of document the workflow recognizes.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | `string` | **Yes** | Unique identifier (e.g., `research`, `blog_post`). |
| `file_pattern` | `string` | **Yes** | Glob/regex to match files relative to the feature root. Use `**/` to match any subdirectory depth. Examples: `"**/*-design.md"`, `"plans/*-plan-*.md"`. |
| `statuses` | `string[]` | **Yes** | Allowed status values for this document type. |
| `initial_status` | `string` | **Yes** | Status assigned when a new document of this type is created. |
| `parent_of` | `string[]` | No | Types of documents that can list this document as their `parent_id`. |
| `child_of` | `string` | No | If this document is always a child, specifies the parent type. |
| `version_field` | `string` | No | Frontmatter field for version tracking (default: `version`). |
| `staled_field` | `string` | No | Frontmatter field for staleness flag (default: `staled`). |

### 3.3 Event Definition (`events`)

Each event defines a state transition and the side effects that happen when that transition occurs.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | `string` | **Yes** | Unique event identifier (e.g., `PUBLISH`, `APPROVE`). |
| `applies_to` | `string` | **Yes** | Which `type` of document this event acts upon. |
| `from_status` | `string \| string[]` | **Yes** | The current status(es) required for this event to be valid. |
| `to_status` | `string` | **Yes** | The new status after the event is applied. |
| `effects` | `array` | No | List of built-in effects to execute (see `EFFECTS.md`). |

### 3.4 Validation Rule (`validation`)

Optional rules to maintain consistency across related documents (e.g., "A published post must have a design").

| Field | Type | Description |
|-------|------|-------------|
| `rule` | `string` | Human-readable description of the rule. |
| `check` | `string` | Expression evaluated to `true/false` (see Section 5). |

---

## 4. File Patterns & Directory Structure

The `file_pattern` field supports glob syntax and is evaluated **relative to the feature root** (the directory containing the root-type document). This allows flexible organization while maintaining consistent type identification.

### 4.1 Recommended Naming Convention

To make document types immediately recognizable, the default workflow uses a suffix convention:

- `*-idea.md` for ideas
- `*-design.md` for designs
- `*-plan-*.md` for plans
- `*-ctx.md` for context summaries

**Example feature directory (Option B):**
```
features/payment-system/
├── payment-system-idea.md
├── payment-system-design.md
├── plans/
│   ├── payment-system-plan-001.md
│   └── payment-system-plan-002.md
├── ctx/
│   └── payment-system-ctx-2026-04-12.md
└── references/
    └── api-spec.pdf
```

**Corresponding `file_pattern` values:**
```yaml
documents:
  - type: design
    file_pattern: "**/*-design.md"
  - type: plan
    file_pattern: "**/*-plan-*.md"
```

The `**/` prefix ensures the pattern matches documents at any depth, allowing users to nest files in subdirectories like `plans/` or `ctx/`.

### 4.2 Alternative Layouts

The system does **not** enforce a specific physical layout. Users can organize files as they prefer, as long as the `file_pattern` accurately captures the desired files.

**Flat layout (all files in feature root):**
```yaml
file_pattern: "*-design.md"
```

**Nested by type:**
```yaml
file_pattern: "designs/*-design.md"
```

The choice is up to the user; the system trusts the frontmatter `type` field for document identification.

---

## 5. Validation Expression Language

The `check` field in `validation` uses a simple, non-Turing-complete expression language to ensure safety.

**Available Context Variables:**
- `document.status` - Status of the current document.
- `parent.status` - Status of the parent (if `parent_id` exists).
- `child.status` - Used in loops: `all(child.status == 'done')`.
- `count(document.children)` - Number of child documents.
- `actual_release` - App version field (if present).

**Operators:** `==`, `!=`, `and`, `or`, `=>` (implies), `matches` (regex)

**Examples:**
```yaml
# A design that is 'approved' MUST have at least one plan child.
check: "design.status == 'approved' => count(design.children) > 0"

# actual_release must be a semantic version when present
check: "actual_release == null or actual_release matches '^[0-9]+\\.[0-9]+\\.[0-9]+'"
```

---

## 6. Built-in Effects Library

Effects are pre-defined, secure actions that execute after a successful state transition. See `EFFECTS.md` for the complete catalog.

| Effect Name | Description |
|-------------|-------------|
| `increment_version` | Increments the document’s `version` field. |
| `mark_children_staled` | Sets `staled: true` on all child documents. |
| `create_child_document` | Creates a new document of a child type. |
| `delete_child_documents` | Deletes child documents. |
| `send_notification` | Shows a VS Code notification. |
| `run_command` | Executes a shell command (disabled by default). |

---

## 7. Built-in Default Workflow (`default-wf.yml`)

If no custom `workflow.yml` is provided, the system uses this configuration:

```yaml
# default-wf.yml
name: "default-idea-design-plan"
version: 1

documents:
  - type: idea
    file_pattern: "**/*-idea.md"
    statuses: [draft, active, done, cancelled]
    initial_status: draft
    parent_of: [design]

  - type: design
    file_pattern: "**/*-design.md"
    statuses: [draft, active, closed, done, cancelled]
    initial_status: draft
    parent_of: [plan]
    child_of: idea

  - type: plan
    file_pattern: "**/*-plan-*.md"
    statuses: [draft, active, implementing, done, blocked, cancelled]
    initial_status: draft
    child_of: design

  - type: ctx
    file_pattern: "**/*-ctx.md"
    statuses: [draft, active, done, cancelled]
    initial_status: draft
    child_of: design

events:
  # Idea events
  - name: ACTIVATE_IDEA
    applies_to: idea
    from_status: draft
    to_status: active

  - name: COMPLETE_IDEA
    applies_to: idea
    from_status: active
    to_status: done

  - name: CANCEL_IDEA
    applies_to: idea
    from_status: [draft, active]
    to_status: cancelled
    effects:
      - delete_child_documents
        child_types: [design, plan]

  # Design events
  - name: CREATE_DESIGN
    applies_to: design
    from_status: draft
    to_status: draft
    effects:
      - create_child_document
        child_type: design
        template_path: "templates/design-template.md"

  - name: ACTIVATE_DESIGN
    applies_to: design
    from_status: draft
    to_status: active

  - name: CLOSE_DESIGN
    applies_to: design
    from_status: active
    to_status: closed

  - name: REOPEN_DESIGN
    applies_to: design
    from_status: closed
    to_status: active

  - name: REFINE_DESIGN
    applies_to: design
    from_status: [active, closed, done]
    to_status: active
    effects:
      - increment_version
      - mark_children_staled

  - name: FINALISE_DESIGN
    applies_to: design
    from_status: active
    to_status: done

  - name: CANCEL_DESIGN
    applies_to: design
    from_status: [draft, active, closed]
    to_status: cancelled
    effects:
      - delete_child_documents
        child_types: [plan]

  # Plan events
  - name: CREATE_PLAN
    applies_to: design
    from_status: done
    to_status: done
    effects:
      - create_child_document
        child_type: plan
        template_path: "templates/plan-template.md"

  - name: ACTIVATE_PLAN
    applies_to: plan
    from_status: draft
    to_status: active

  - name: START_IMPLEMENTING_PLAN
    applies_to: plan
    from_status: active
    to_status: implementing

  - name: COMPLETE_STEP
    applies_to: plan
    from_status: implementing
    to_status: implementing
    effects:
      - increment_step_counter

  - name: FINISH_PLAN
    applies_to: plan
    from_status: implementing
    to_status: done

  - name: BLOCK_PLAN
    applies_to: plan
    from_status: [active, implementing]
    to_status: blocked
    effects:
      - send_notification
        message: "Plan blocked, awaiting resolution"
        severity: warning

  - name: UNBLOCK_PLAN
    applies_to: plan
    from_status: blocked
    to_status: active

  - name: CANCEL_PLAN
    applies_to: plan
    from_status: [draft, active, implementing, blocked]
    to_status: cancelled

validation:
  - rule: "Plan cannot be active if its design is not done"
    check: "plan.status == 'active' => design.status == 'done'"
  - rule: "Design cannot be done if it has no plans"
    check: "design.status == 'done' => count(design.plans) > 0"
  - rule: "actual_release must be a valid semver or null"
    check: "actual_release == null or actual_release matches '^[0-9]+\\.[0-9]+\\.[0-9]+(-[a-zA-Z0-9\\.]+)?(\\+[a-zA-Z0-9\\.]+)?$'"
  - rule: "actual_release should only be set when status is done"
    check: "actual_release == null or status == 'done'"
```

---

## 8. Complete Example: Blog Post Workflow

```yaml
name: "Blog Post Pipeline"
version: 1

documents:
  - type: draft
    file_pattern: "**/*-draft.md"
    statuses: [writing, review, approved]
    initial_status: writing
    parent_of: [published_post]

  - type: published_post
    file_pattern: "published/*-post.md"
    statuses: [live, archived]
    initial_status: live
    child_of: draft

events:
  - name: SEND_TO_EDITOR
    applies_to: draft
    from_status: writing
    to_status: review
    effects:
      - send_notification:
          message: "Draft '{{document.title}}' is ready for review."

  - name: APPROVE_AND_PUBLISH
    applies_to: draft
    from_status: review
    to_status: approved
    effects:
      - create_child_document:
          child_type: published_post
      - run_command:
          command: "bundle exec jekyll build"
          cwd: "{{workspaceRoot}}"

validation:
  - rule: "Published post must have an approved draft parent"
    check: "published_post.status == 'live' => parent.status == 'approved'"
```

---

## 9. Troubleshooting & Validation

To check if your `workflow.yml` is valid:
- **CLI:** Run `wf validate-config`.
- **VS Code:** Errors will appear in the Problems panel with line numbers.

**Common Errors:**
- `Schema validation failed: 'statuses' must be an array` → You wrote `statuses: draft` instead of `statuses: [draft]`.
- `Event 'PUBLISH' references unknown effect 'deploy'` → Only effects listed in `EFFECTS.md` are allowed.
- `Validation rule parse error` → Check expression syntax (e.g., missing closing parenthesis).
