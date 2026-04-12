# 🧠 Reslava — AI-Native Development Workflow System

**Document-driven. Event-sourced. Git-native. AI-agnostic.**

Stop losing context when working with AI. This VS Code extension turns your Markdown files into a structured, versionable workflow engine that guides collaboration between you and your LLM assistant.

> ⚠️ **Early Development** — This project is currently in active design and initial implementation. The core engine is being built. See [Roadmap](#roadmap) for current status.

---

## Why This Exists

AI-assisted development is stuck in the **Chat Era**. You prompt, the AI generates, you copy-paste, and context is lost. Features drift. Plans go stale. There's no single source of truth.

Reslava replaces ephemeral chat with **persistent documents** that act as both specification and conversation log:

- **Clear separation** between idea, design, planning, and execution.
- **Automatic staleness detection** when designs change.
- **Human-in-the-loop** approval for AI‑proposed state changes.
- **Customizable workflows** that adapt to *your* process, not the other way around.
- **Zero lock‑in** — everything is Markdown, versioned with Git.

---

## How It Works (In 30 Seconds)

1. **Documents are the Database** — Every feature lives in a folder: `idea.md`, `design.md`, `plan-*.md`.
2. **Status is Derived** — No central state file. Frontmatter (`status: active`) defines the workflow.
3. **AI Reads the Docs** — The extension injects `design.md` (or a summary) into the AI prompt so it never forgets why decisions were made.
4. **You Approve Changes** — AI proposes an action (e.g., "Refine Design"). You see a diff, click **Approve**, and only then does the file change.

```text
Feature: Payment System
├── design.md          (status: active)   ← The root of truth
├── plan-001.md        (status: implementing)
└── plan-002.md        (status: stale ⚠️) ← Flagged automatically because design changed
```

---

## Key Features (Planned / In Progress)

| Feature | Description |
|---------|-------------|
| 📁 **Filesystem as DB** | 100% Git-friendly. Every state change is a versioned Markdown diff. |
| 🔄 **Reactive Staleness** | Change a design? Linked plans are marked `staled: true` automatically. |
| 🤖 **AI Handshake Protocol** | Structured JSON proposals + diff approval. No rogue changes. |
| ⚙️ **Declarative Custom Workflows** | Define your own document types and transitions in `workflow.yml`. |
| 🧩 **Built-in Effects** | Automate linting, deployment, notifications with `run_command`, etc. |
| 🖥️ **VS Code Native** | Tree view, file decorations, toolbar commands. Fits your existing workflow. |
| 🔌 **AI Agnostic** | Works with DeepSeek, OpenAI, Anthropic, or local models (Ollama). No vendor lock‑in. |

---

## Current Status & Roadmap

The project is in **Phase 1: Core Engine Implementation**.

- [x] Comprehensive design documentation
- [x] Document templates and workflow configuration schema
- [x] AI integration protocol and handshake design
- [ ] Core engine (reducers, derived state, event applier)
- [ ] Filesystem layer (Markdown load/save)
- [ ] CLI interface (`wf` command)
- [ ] VS Code extension (tree view, commands)
- [ ] Native AI client integration

See the [GitHub Projects](https://github.com/your-repo/projects) board for detailed tracking.

---

## Getting Started (For Contributors)

### Prerequisites

- Node.js 18+
- VS Code
- (Optional) DeepSeek or OpenAI API key for AI features

### Development Setup

```bash
git clone https://github.com/your-username/reslava-workflow-vsix.git
cd reslava-workflow-vsix
npm install
npm run build
```

To test the extension:
- Press `F5` in VS Code to launch the Extension Development Host.
- Open a workspace and run `> Workflow: Initialize` (once implemented).

---

## Documentation

All design and reference documentation is available in the [`docs/`](./docs/) directory:

| Document | Purpose |
|----------|---------|
| [**ARCHITECTURE.md**](./docs/ARCHITECTURE.md) | Derived state, reducers, and event flow. |
| [**WORKFLOW_YML.md**](./docs/WORKFLOW_YML.md) | Custom workflow configuration reference. |
| [**EFFECTS.md**](./docs/EFFECTS.md) | Catalog of built-in effects. |
| [**AI_INTEGRATION.md**](./docs/AI_INTEGRATION.md) | AI handshake protocol and native client design. |
| [**DOCUMENTATION_GUIDE.md**](./docs/DOCUMENTATION_GUIDE.md) | Writing conventions and structure. |
| [**Templates**](./docs/templates/) | Base templates for `idea`, `design`, `plan`, `ctx`. |
| [**CONFIGURATION.md**](./docs/CONFIGURATION.md) | Complete reference for all VS Code settings. |

---

## Example: Custom Blog Post Workflow

Reslava is not limited to software development. Here's a `workflow.yml` for a blog pipeline:

```yaml
name: "Blog Pipeline"
documents:
  - type: draft
    file_pattern: "draft-*.md"
    statuses: [writing, review, approved]
    initial_status: writing
  - type: published_post
    file_pattern: "published/*.md"
    statuses: [live, archived]
    initial_status: live

events:
  - name: PUBLISH
    applies_to: draft
    from_status: approved
    to_status: live
    effects:
      - run_command:
          command: "bundle exec jekyll build"
          cwd: "{{workspaceRoot}}"
```

When a draft is approved, the static site rebuilds automatically.

---

## Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](./CONTRIBUTING.md) for development guidelines and [DOCUMENTATION_GUIDE.md](./docs/DOCUMENTATION_GUIDE.md) for writing conventions.

- **Report bugs** via GitHub Issues.
- **Propose features** by opening a discussion.
- **Improve documentation** – PRs to `docs/` are always appreciated.

---

## License

MIT © 2026

---

**Ready to stop losing context?**  
Star the repo to follow along, and join us in building a better way to collaborate with AI.