Here is the **addendum** (Section 17) to your `workflow-design-v2.md`. You can insert it at the end of the document, before the “Next Steps” or “Changelog” section.

---

```markdown
### 17. Custom Workflows via Declarative Configuration

While the default workflow (`idea → design → plan → done`) covers many feature development scenarios, advanced users may need different document types, statuses, or transition rules. Instead of reintroducing a complex, code‑based state machine, the system supports **declarative custom workflows** via a `workflow.yml` file.

#### 17.1 Placement & Discovery

- **Workspace‑wide**: `.wf/workflow.yml` – applies to all features in the workspace.
- **Feature‑specific**: `features/<feature-name>/workflow.yml` – overrides the workspace config for that feature only.

If no `workflow.yml` is found, the system falls back to the **built‑in default workflow** (which is internally represented as a `workflow.yml`).

#### 17.2 Schema Definition

```yaml
# workflow.yml schema (version 1)
name: string                # human‑readable name
version: 1                  # schema version, must be 1

documents:                  # list of document types
  - type: string            # unique identifier (e.g., "research")
    file_pattern: string    # glob/regex to match files (e.g., "research.md" or "study-*.md")
    statuses: [string]      # allowed status values (e.g., ["draft", "review", "done"])
    initial_status: string  # status when document is first created
    parent_of: [string]     # optional: document types that can be children (by `parent_id`)
    child_of: string        # optional: single parent type (if this doc is always a child)
    version_field: string   # optional: frontmatter field for version (default "version")
    staled_field: string    # optional: frontmatter field for staleness flag (default "staled")

events:                     # allowed events and their transitions
  - name: string            # event identifier (e.g., "SUBMIT_FOR_REVIEW")
    applies_to: string      # document type this event acts on
    from_status: string|list  # source status(es) allowed for this transition
    to_status: string       # target status after event
    effects:                # list of built‑in effects to run
      - effect_name
      # effects can have parameters (see 17.4)

validation:                 # additional cross‑document consistency rules (optional)
  - rule: string            # human‑readable description
    check: string           # expression (simple condition language, see 17.5)
```

#### 17.3 Example: Research → Design → Review Workflow

```yaml
name: "research-to-release"
version: 1

documents:
  - type: research
    file_pattern: "research.md"
    statuses: [draft, peer_review, approved, archived]
    initial_status: draft
    parent_of: [design]

  - type: design
    file_pattern: "design.md"
    statuses: [draft, review, approved, done]
    initial_status: draft
    parent_of: [implementation_plan]
    child_of: research

  - type: implementation_plan
    file_pattern: "plan-*.md"
    statuses: [draft, active, blocked, done]
    initial_status: draft
    child_of: design

events:
  - name: SUBMIT_RESEARCH_FOR_REVIEW
    applies_to: research
    from_status: draft
    to_status: peer_review
    effects:
      - notify_reviewers

  - name: APPROVE_RESEARCH
    applies_to: research
    from_status: peer_review
    to_status: approved
    effects:
      - create_child_document
        # creates an initial design.md from template

  - name: REFINE_DESIGN
    applies_to: design
    from_status: [review, approved]
    to_status: draft
    effects:
      - increment_version
      - mark_children_staled

validation:
  - rule: "Implementation plan cannot be active if design is not approved"
    check: "implementation_plan.status == 'active' => design.status == 'approved'"
  - rule: "Approved research must have at least one design child"
    check: "research.status == 'approved' => count(design.children) > 0"
```

#### 17.4 Built‑in Effects (Available for Use in `events.effects`)

| Effect Name | Description | Parameters |
|-------------|-------------|------------|
| `increment_version` | Increments the document’s `version` field | none |
| `mark_children_staled` | Sets `staled: true` on all child documents | none |
| `create_child_document` | Creates a new document of a child type (from template) | `child_type`, `template_path` (optional) |
| `delete_child_documents` | Removes child documents (e.g., when cancelling) | `child_types` (list) |
| `send_notification` | Shows a VS Code notification or logs to output channel | `message`, `severity` (info/warning/error) |
| `run_command` | Executes a shell command (⚠️ disabled by default, requires user opt‑in) | `command`, `cwd` (optional) |
| `refresh_tree_view` | Forces UI update in VS Code extension | none |

All effects are executed by the **effects layer** after `applyEvent` returns the new state.

#### 17.5 Validation Rule Language (Simple)

Validation rules are evaluated when `wf validate` is run or when state changes. The `check` field uses a small expression language:

- `document.status` – status of the current document
- `parent.status` – status of the parent document (if any)
- `child.status` – for validation that iterates over children (using `all(child.status == 'done')`)
- `count(document.children)` – number of child documents
- Logical operators: `==`, `!=`, `and`, `or`, `=>` (implies)

Example: `"design.status == 'approved' => count(design.plans) > 0"`

The system evaluates these expressions safely (no arbitrary code execution).

#### 17.6 How the Orchestrator Uses the Custom Workflow

1. **Loading** – On orchestrator startup, read `workflow.yml` from the workspace root or feature folder. Validate against the schema (using a JSON Schema validator). If invalid, fall back to default workflow and log an error.

2. **Event Validation** – When an event is triggered (e.g., `REFINE_DESIGN`), the orchestrator checks:
   - The event is defined in `events`.
   - The current document’s status matches `from_status`.
   - If yes, it computes the new state and enqueues the effects.

3. **Effect Execution** – After `applyEvent`, the orchestrator calls the effects layer with the list of effect names and parameters. Effects are executed in order.

4. **UI Adaptation** – The VS Code extension reads the active workflow to determine:
   - Which document types to show in the tree view.
   - What status badges/colours to display.
   - Which commands (events) to enable for a given document.

#### 17.7 Default Workflow as Built‑in Config

The built‑in default workflow is equivalent to:

```yaml
name: "default-idea-design-plan"
version: 1
documents:
  - type: idea
    file_pattern: "idea.md"
    statuses: [draft, active, done, cancelled]
    initial_status: draft
    parent_of: [design]
  - type: design
    file_pattern: "design.md"
    statuses: [draft, active, closed, done, cancelled]
    initial_status: draft
    parent_of: [plan]
  - type: plan
    file_pattern: "plan-*.md"
    statuses: [draft, active, implementing, done, blocked, cancelled]
    initial_status: draft
events:
  - name: REFINE_DESIGN
    applies_to: design
    from_status: [active, closed, done]
    to_status: active
    effects: [increment_version, mark_children_staled]
  - name: CREATE_PLAN
    applies_to: design
    from_status: done
    to_status: done
    effects: [create_child_document]
  # ... other events (truncated for brevity)
```

This config is **hard‑coded** in the extension, but users can override it by providing their own `workflow.yml`.

#### 17.8 Security & Sandboxing

- **No user‑supplied code** – All effects are built‑in and reviewed. The `run_command` effect is **disabled by default**; users must explicitly enable it in VS Code settings (`"workflow.allowShellCommands": true`).
- **Validation rules are not evaluated with `eval()`** – They are parsed by a simple, non‑Turing‑complete expression language.
- **File system access** – Effects only write to the `features/` directory (or user‑configured root). They cannot delete arbitrary files outside the workspace.

#### 17.9 Migration from Default Workflow

When a user creates a new feature, the system checks for a `workflow.yml` in the workspace root. If found, the feature uses that workflow. The CLI command `wf init --workflow custom` can copy a template `workflow.yml` into the workspace.

Existing features that were created with the default workflow remain on the default workflow unless the user explicitly adds a `workflow.yml` to the feature folder (which then overrides).

#### 17.10 Example: Simple Blog Post Workflow

```yaml
name: "blog-post"
documents:
  - type: post
    file_pattern: "post-*.md"
    statuses: [draft, editorial, published, archived]
    initial_status: draft
events:
  - name: SEND_TO_EDITOR
    applies_to: post
    from_status: draft
    to_status: editorial
    effects: [send_notification]
  - name: PUBLISH
    applies_to: post
    from_status: editorial
    to_status: published
    effects: [run_command]   # e.g., run a static site generator
```

This shows how the same system can be used for non‑software workflows (blog posts, documentation, etc.).

---

### 18. Summary: Custom Workflows Without a Black‑Box State Machine

| Concern | Solution |
|---------|----------|
| Users need different document types | Declarative `documents` list |
| Users need different status transitions | Declarative `events` with `from_status`/`to_status` |
| Users need side effects | Built‑in effect library (no code) |
| Users need cross‑document validation | Simple expression language |
| Security | No arbitrary code execution; `run_command` opt‑in |
| Complexity | Configuration, not programming |

The original black‑box state machine is **not** brought back. Instead, a **declarative configuration layer** sits on top of the pure, document‑driven core. This gives users flexibility while keeping the system safe, debuggable, and maintainable.
```

---

Now, to keep your design document clean, you can either:

1. **Append this section** to your existing `workflow-design-v2.md` (recommended), or
2. Create a **separate file** `workflow-customisation-spec.md` if you want to keep the main design focused on the default workflow.

I suggest appending it as Section 17 (and renumber the old “Next Steps” to Section 19). Would you like me to produce the **final, merged** version of the entire design document (v2 + custom workflows) as a single downloadable markdown file?