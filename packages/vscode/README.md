# Loom — VS Code Extension

Document-driven, AI-assisted workflow for VS Code. Weave ideas into features through design, planning, and step-by-step execution.

## Prerequisites

Install the Loom CLI:

```bash
npm install -g @reslava/loom
```

## Setup

1. Open your project folder in VS Code.
2. Run `loom init` in the terminal to initialize the workspace.
3. The Loom panel appears in the Activity Bar.

### MCP integration (Claude Code / Cursor)

Create `.claude/mcp.json` in your workspace:

```json
{
  "mcpServers": {
    "loom": {
      "command": "loom",
      "args": ["mcp"],
      "env": {
        "LOOM_ROOT": "${workspaceFolder}",
        "DEEPSEEK_API_KEY": "sk-..."
      }
    }
  }
}
```

AI tools (`loom_create_idea`, `loom_complete_step`, etc.) are then available inside Claude Code or Cursor.

## Usage

- **Loom panel** — Browse weaves and threads in the Activity Bar sidebar.
- **Context menu** — Right-click any node to create ideas, designs, plans, or chats.
- **Toolbar** — Create weaves, filter, group, and refresh from the panel header.
- **AI commands** — Summarise, refine, promote, and do-step actions require an AI API key configured in VS Code settings (`reslava-loom.ai.apiKey`).

## Settings

| Setting | Description |
|---------|-------------|
| `reslava-loom.ai.provider` | AI provider (`deepseek` or `openai`) |
| `reslava-loom.ai.apiKey` | API key for the configured provider |
| `reslava-loom.ai.model` | Model override (leave blank for provider default) |
| `reslava-loom.user.name` | Your display name used in chat headers |

## License

MIT
