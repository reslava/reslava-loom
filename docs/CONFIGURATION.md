# Configuration Guide

The Reslava workflow system is configured via VS Code settings. These settings control user preferences, AI behavior, and system defaults.

## User Personalization

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `workflow.user.name` | `string` | `"User"` | Your preferred name. Used in document headers and AI conversations. |
| `workflow.user.email` | `string` | `null` | (Optional) Your email address. Reserved for future collaboration features. |

**Example `settings.json`:**
```json
{
  "workflow.user.name": "Rafa",
  "workflow.user.email": "rafa@example.com"
}
```

## AI Provider Configuration

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `workflow.ai.provider` | `string` | `"deepseek"` | AI provider: `"deepseek"`, `"openai"`, `"anthropic"`, or `"ollama"`. |
| `workflow.ai.apiKey` | `string` | `""` | Your API key for the selected provider. |
| `workflow.ai.model` | `string` | `"deepseek-chat"` | Model name (e.g., `"deepseek-chat"`, `"deepseek-reasoner"`). |
| `workflow.ai.baseUrl` | `string` | Provider default | Override the API endpoint (useful for local proxies). |

**Example:**
```json
{
  "workflow.ai.provider": "deepseek",
  "workflow.ai.apiKey": "sk-...",
  "workflow.ai.model": "deepseek-chat"
}
```

## Context & Token Management

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `workflow.ai.maxContextTokens` | `number` | `8000` | Maximum tokens for the AI prompt. |
| `workflow.ai.designSummaryThreshold` | `number` | `20000` | Characters in `design.md` before auto-summary. |

## Security & Effects

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `workflow.allowShellCommands` | `boolean` | `false` | Enable `run_command` effect. |
| `workflow.allowSensitiveEnvVars` | `boolean` | `false` | Allow passing sensitive environment variables to commands. |