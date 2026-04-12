# Built-in Effects Catalog

This document provides a complete reference for all **built-in effects** available in the workflow system. Effects are the only mechanism for triggering side effects (file I/O, notifications, command execution) when a workflow event occurs.

**Important:** Effects are **not** user-defined JavaScript functions. They are pre-built, secure operations configured via `workflow.yml` (see `WORKFLOW_YML.md`).

---

## 1. Effect Execution Model

Effects are executed **after** the core reducer has successfully updated the document state (frontmatter). The flow is:

```
Event Triggered → Reducer Updates State (Pure) → Effects Executed (Side Effects)
```

If an effect fails (e.g., command returns non-zero exit code), the document state change **remains persisted** on disk by default. Use `allowFailure: false` (where supported) to halt the event chain, though rollback of state is not automatic (see Section 8).

---

## 2. Common Effect Parameters

Many effects support **templating** using `{{variable}}` syntax. The following context variables are available to all effects (unless otherwise noted):

| Variable | Description | Example |
|----------|-------------|---------|
| `workspaceRoot` | Absolute path to the workspace root | `/home/user/project` |
| `feature.path` | Absolute path to the feature directory | `/home/user/project/features/auth` |
| `feature.id` | Feature identifier (directory name) | `auth` |
| `document.path` | Absolute path to the document being acted upon | `/home/user/project/features/auth/design.md` |
| `document.type` | Document type (`idea`, `design`, `plan`, `ctx`) | `design` |
| `document.status` | Current status of the document | `active` |
| `document.version` | Document version (if present) | `3` |
| `event.name` | Name of the event being processed | `REFINE_DESIGN` |

---

## 3. Core Document Effects

### 3.1 `increment_version`

**Description:** Increments the document's `version` field (e.g., `1` → `2`). Used primarily during `REFINE_DESIGN` to indicate a design change that may invalidate child plans.

**Parameters:** None

**Example:**
```yaml
effects:
  - increment_version
```

**Behavior:**
- If `version` field is missing, it initializes to `1` and then increments.
- Works with custom `version_field` defined in document schema.

---

### 3.2 `mark_children_staled`

**Description:** Sets the `staled` frontmatter field to `true` on all **direct child documents** (those listing this document as `parent_id`).

**Parameters:** None

**Example:**
```yaml
effects:
  - mark_children_staled
```

**Behavior:**
- Iterates over `child_ids` or resolves via reverse lookup.
- Does **not** recurse into grandchildren.
- The UI will show a warning icon next to stale plans.

---

### 3.3 `create_child_document`

**Description:** Creates a new document of a specified child type, automatically linking it via `parent_id`.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `child_type` | string | **Yes** | The `type` of document to create (e.g., `plan`). |
| `template_path` | string | No | Path to a custom Markdown template (relative to workspace root). If omitted, uses the default template for that type. |

**Example:**
```yaml
effects:
  - create_child_document:
      child_type: plan
      template_path: ".wf/templates/custom-plan.md"
```

**Behavior:**
- The new document's filename is derived from the `file_pattern` defined in `workflow.yml` (e.g., `plan-001.md`).
- The `parent_id` frontmatter is automatically set to the current document's `id`.
- The `child_ids` of the current document is updated to include the new document.

---

### 3.4 `delete_child_documents`

**Description:** Deletes **all** child documents of the specified type(s). Use with extreme caution; this is a destructive operation.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `child_types` | string[] | **Yes** | List of document types to delete (e.g., `[plan]`). |

**Example:**
```yaml
effects:
  - delete_child_documents:
      child_types: [plan]
```

**Behavior:**
- Deletes files from the filesystem (moves to trash/recycle bin if supported by OS; otherwise permanent).
- Updates `child_ids` of the parent document to remove references.
- If a child document has its own children, those are **not** automatically deleted (orphaned references may occur). Use `wf validate` to detect orphans.

**Security:** This effect **cannot** be used to delete documents outside the feature directory.

---

## 4. Notification & UI Effects

### 4.1 `send_notification`

**Description:** Shows a notification in VS Code or logs a message to the output channel.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `message` | string | **Yes** | The text to display. Supports templating. |
| `severity` | string | No | `info` (default), `warning`, or `error`. |

**Example:**
```yaml
effects:
  - send_notification:
      message: "Design '{{document.title}}' has been refined to v{{document.version}}."
      severity: info
```

**Behavior:**
- In VS Code, `info` shows a brief popup; `warning` and `error` show modal dialogs.
- In CLI, messages are printed to stdout/stderr.

---

### 4.2 `refresh_tree_view`

**Description:** Forces an immediate refresh of the VS Code Tree View. Normally, the view refreshes automatically when files change, but this ensures UI consistency after complex state updates.

**Parameters:** None

**Example:**
```yaml
effects:
  - refresh_tree_view
```

**Use Case:** When you want to guarantee the UI reflects the new state before a long-running command starts.

---

## 5. Command Execution Effect

### 5.1 `run_command`

**Description:** Executes an external shell command. **This effect is disabled by default for security reasons.** See Section 6 for detailed security configuration.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `command` | string | **Yes** | Shell command to execute. Supports templating. |
| `cwd` | string | No | Working directory. Defaults to workspace root. Supports templating. |
| `timeout` | integer | No | Maximum execution time in milliseconds. Default: `60000` (60 seconds). |
| `env` | object | No | Additional environment variables. Values support templating. |
| `shell` | string | No | Path to shell executable (e.g., `/bin/bash`). Default: system default. |
| `allowFailure` | boolean | No | If `true`, command failure does not abort the event chain. Default: `false`. |

**Example:**
```yaml
effects:
  - run_command:
      command: "npx prettier --write {{document.path}}"
      cwd: "{{workspaceRoot}}"
      timeout: 10000
      allowFailure: true
```

**Behavior:**
- The command runs asynchronously; the orchestrator waits for completion.
- Stdout and stderr are captured and logged to the `WF: Command Output` channel in VS Code.
- If the command exits with a non-zero code and `allowFailure` is `false`, the event chain stops (subsequent effects are not executed), but the document state change already persisted **is not rolled back**.

**Templating in `command`:**
Use `{{variable}}` syntax to inject context. Example:
```yaml
command: "bash ./scripts/deploy.sh {{feature.id}} {{document.version}}"
```

**Security Note:** The resolved command is scanned against a deny-list of dangerous patterns (e.g., `rm -rf /`, `curl ... | bash`). Execution is blocked if a pattern matches.

---

## 6. Enabling `run_command` & Security Settings

To use `run_command`, you must explicitly enable it in VS Code settings (`settings.json`):

```json
{
  "workflow.allowShellCommands": true
}
```

Additional security settings:

| Setting | Default | Description |
|---------|---------|-------------|
| `workflow.allowShellCommands` | `false` | Master switch. If `false`, `run_command` effects are skipped with a warning. |
| `workflow.allowSensitiveEnvVars` | `false` | If `true`, environment variables containing `SECRET`, `TOKEN`, `PASSWORD` are passed to subprocess. **Not recommended.** |
| `workflow.allowOutsideCwd` | `false` | If `true`, the command can run outside the workspace root. |
| `workflow.commandTimeoutMs` | `60000` | Global maximum timeout (overrides per-effect timeout). |
| `workflow.denyListPatterns` | `[]` | Additional regex patterns to block (appended to built-in list). |

**Built-in Deny List (Case-Insensitive):**
- `rm -rf /` or `rm -rf /*`
- `:(){ :|:& };:` (fork bomb)
- `> /dev/sda` (raw disk write)
- `chmod 777 /`
- `sudo` (unless explicitly allowed by user setting)
- `curl.*\|.*bash` (piping from network to shell)

---

## 7. Effect Chaining & Failure Handling

Effects are executed in the order they appear in the `effects` list.

**Example:**
```yaml
effects:
  - increment_version
  - mark_children_staled
  - run_command:
      command: "npm run lint"
      allowFailure: true   # Lint failure won't stop next effect
  - send_notification:
      message: "Refinement complete."
```

If an effect fails (e.g., `run_command` returns non-zero with `allowFailure: false`), the **entire event chain halts**. Subsequent effects are **not** executed.

**Important:** The document state change (e.g., status update) has already been written to disk by the time effects run. If a command fails, you may need to manually revert the document or use version control (`git checkout`).

**Recommendation:** Design commands to be idempotent and safe to retry. Use `allowFailure: true` for non-critical tasks.

---

## 8. Custom Effects vs. `run_command`

The system does **not** allow users to define new JavaScript effects for security and simplicity. If you need custom logic, you have two options:

1.  **Use `run_command`** to call an external script (Python, Bash, Node.js). This is the recommended escape hatch.
2.  **Contribute a new built-in effect** to the core engine (requires modifying the extension source).

---

## 9. Effect Execution Logging

All effect executions are logged to the VS Code output channel named `Workflow Effects`. To view logs:
1.  Open the Command Palette (`Ctrl+Shift+P`).
2.  Run `Developer: Show Output`.
3.  Select `Workflow Effects` from the dropdown.

Example log entry:
```
[2026-04-11 10:30:00] Executing effect: increment_version on design.md
[2026-04-11 10:30:00] Version updated: 2 -> 3
[2026-04-11 10:30:01] Executing effect: run_command: "npx prettier --write /path/to/design.md"
[2026-04-11 10:30:02] Command completed with exit code 0
```

---

## 10. Effect Reference Table (Quick Lookup)

| Effect Name | Purpose | Requires Params |
|-------------|---------|-----------------|
| `increment_version` | Bump version number | No |
| `mark_children_staled` | Mark child docs as stale | No |
| `create_child_document` | Create a new child doc | Yes (`child_type`) |
| `delete_child_documents` | Delete child docs | Yes (`child_types`) |
| `send_notification` | Show UI notification | Yes (`message`) |
| `refresh_tree_view` | Refresh VS Code tree | No |
| `run_command` | Execute shell command | Yes (`command`) |