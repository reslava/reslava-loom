# Configuration Guide — REslava Loom

The REslava Loom workflow system is configured via VS Code settings. These settings control user preferences, AI behavior, and system defaults.

---

## User Personalization

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `reslava-loom.user.name` | `string` | `""` | Your preferred name. Used in document headers (`## Rafa:`) and AI conversations. |
| `reslava-loom.user.email` | `string` | `""` | (Optional) Your email address. Reserved for future collaboration features. |

**Example `settings.json`:**
```json
{
  "reslava-loom.user.name": "Rafa",
  "reslava-loom.user.email": "rafa@example.com"
}
```

---

## AI Provider Configuration

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `reslava-loom.ai.provider` | `string` | `"deepseek"` | AI provider: `"deepseek"`, `"openai"`, `"anthropic"`, or `"ollama"`. |
| `reslava-loom.ai.apiKey` | `string` | `""` | Your API key for the selected provider. |
| `reslava-loom.ai.model` | `string` | `"deepseek-chat"` | Model name (e.g., `"deepseek-chat"`, `"deepseek-reasoner"`). |
| `reslava-loom.ai.baseUrl` | `string` | Provider default | Override the API endpoint (useful for local proxies or Ollama). |

**Example:**
```json
{
  "reslava-loom.ai.provider": "deepseek",
  "reslava-loom.ai.apiKey": "sk-...",
  "reslava-loom.ai.model": "deepseek-chat"
}
```

For local Ollama:
```json
{
  "reslava-loom.ai.provider": "ollama",
  "reslava-loom.ai.baseUrl": "http://localhost:11434/v1",
  "reslava-loom.ai.model": "deepseek-r1:7b"
}
```

---

## Context & Token Management

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `reslava-loom.ai.maxContextTokens` | `number` | `8000` | Maximum tokens for the entire AI prompt. |
| `reslava-loom.ai.designSummaryThreshold` | `number` | `20000` | Characters in `design.md` before auto‑summary triggers. |
| `reslava-loom.ai.reservedResponseTokens` | `number` | `1000` | Tokens reserved for the AI's response. |
| `reslava-loom.ai.summarizationModel` | `string` | Same as `ai.model` | Model used for generating context summaries (can be a cheaper model). |
| `reslava-loom.ai.summarizationMaxTokens` | `number` | `500` | Maximum tokens for summary generation. |

---

## Security & Effects

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `reslava-loom.allowShellCommands` | `boolean` | `false` | Master switch for `run_command` effect. |
| `reslava-loom.allowSensitiveEnvVars` | `boolean` | `false` | If `true`, environment variables containing `SECRET`, `TOKEN`, `PASSWORD` are passed to subprocess. **Not recommended.** |
| `reslava-loom.allowOutsideCwd` | `boolean` | `false` | If `true`, `run_command` can execute outside the loom root. |
| `reslava-loom.commandTimeoutMs` | `number` | `60000` | Global maximum timeout for `run_command` (milliseconds). |
| `reslava-loom.denyListPatterns` | `string[]` | `[]` | Additional regex patterns to block for `run_command`. |

---

## UI & Tree View

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `reslava-loom.tree.defaultGrouping` | `string` | `"thread"` | Default grouping mode: `"type"`, `"thread"`, `"status"`, or `"release"`. |
| `reslava-loom.tree.showArchived` | `boolean` | `false` | Show archived threads in the tree view. |
| `reslava-loom.tree.showChats` | `boolean` | `true` | Show the "Chats" node in the tree view. |
| `reslava-loom.fileWatcherDebounceMs` | `number` | `300` | Debounce delay for file watcher (milliseconds). |

---

## Experimental / Advanced

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `reslava-loom.logLevel` | `string` | `"info"` | Logging verbosity: `"debug"`, `"info"`, `"warn"`, `"error"`. |
| `reslava-loom.enableTokenTracking` | `boolean` | `true` | Show session token usage in status bar. |
| `reslava-loom.autoSummarize` | `boolean` | `true` | Automatically generate `-ctx.md` when threshold exceeded. |

---

## Full Example `settings.json`

```json
{
  "reslava-loom.user.name": "Rafa",
  "reslava-loom.ai.provider": "deepseek",
  "reslava-loom.ai.apiKey": "sk-...",
  "reslava-loom.ai.model": "deepseek-chat",
  "reslava-loom.ai.maxContextTokens": 8000,
  "reslava-loom.allowShellCommands": false,
  "reslava-loom.tree.defaultGrouping": "thread",
  "reslava-loom.logLevel": "info"
}
```

---

## See Also

- [AI Integration & Handshake Protocol](./AI_INTEGRATION.md) — Details on Chat Mode and Action Mode.
- [Built‑in Effects Catalog](./EFFECTS.md) — Complete reference for all built‑in effects.
- [Workflow Configuration](./WORKFLOW_YML.md) — Customizing document types and transitions.
- [CLI Commands Reference](../loom/refs/cli-commands-reference.md) — Every `loom` command documented.