---
type: design
id: workflow-ai-integration-strategy
title: "AI Integration Strategy: Native vs External Chat"
status: active
created: 2026-04-12
version: 1.0.0
tags: [ai, integration, architecture, ux]
parent_id: workflow-design-v2
child_ids: []
requires_load: [workflow-design-v2, AI_INTEGRATION.md]
---

# AI Integration Strategy: Native vs External Chat

## Goal

Define how the workflow system interacts with AI models while remaining **AI-agnostic**, **zero-dependency on external chat tools**, and **fully controllable**. Address the reality that users may still use external AI chats (Continue, Cursor, web ChatGPT) and determine how the system coexists with that behavior.

## Context

The workflow system is designed as a **document-native operating system** for feature development. AI is an opt-in accelerator, not a requirement. The core value is **structured, stateful context**—something ephemeral chat windows cannot provide.

However, developers already use AI chat tools. We cannot force them to abandon those tools. Instead, we must:

1. **Make the integrated experience so compelling** that users *choose* it over generic chat.
2. **Accept that external chat usage will happen** and provide graceful fallbacks.
3. **Never create dependency on a specific chat tool** (e.g., Continue).

---

# CHAT

## User:
We need to keep in mind:
- App should be AI agnostic
- App independent of Continue, zero dependency
- App is a dev workflow OS, smarter with AI opt-in, giving AI stateful context

Best approach: with a good VSCode extension UX (sidebar, toolbar, web panel), almost all workflow could be independent of an AI chat. User clicks buttons, writes on docs, receives answers on docs. We could even implement a little own chat in the extension if needed. Extension has full control of AI interchange.

But how could we avoid the user using an external AI chat? No way?

(Here we have the problem that chat windows for design are very uncomfortable.)

## AI:
You're correct on all counts. Let's break this down systematically.

### 1. Can We Prevent External AI Chat Usage?

**No.** And we shouldn't try. Attempting to block or discourage external tools would create friction and resentment. Developers are loyal to their tools (Cursor, Continue, Copilot, etc.). A workflow system that tries to replace them entirely will be rejected.

**The right posture:** Embrace coexistence. The workflow system is the **structured layer** that sits *above* raw AI interaction. It provides what chat tools lack: persistent context, state machines, and event-driven automation.

### 2. The Native Integration Strategy

The extension should include its own **minimal AI client** that calls provider APIs directly (DeepSeek, OpenAI, Anthropic, etc.). This gives us:

| Capability | Benefit |
|------------|---------|
| Full control over prompt assembly | Inject exact context (design.md, plan steps, etc.) |
| Full control over response parsing | Enforce JSON handshake when in Action Mode |
| Accurate token tracking | Accumulate usage per session/feature |
| Context threshold detection | Trigger summarization automatically |
| Provider agnosticism | User configures API key and model; we adapt |

**This is the foundation.** No dependency on Continue, Cursor, or any other extension.

### 3. The UX: Chat Where It Belongs

Instead of a separate chat window, the AI interaction happens **inline with the documents**:

| Interaction | UX |
|-------------|-----|
| **Chat Mode (brainstorming)** | User types in `design.md` under `## User:`. Invokes command `wf ai respond` (or clicks toolbar button). AI response is appended as `## AI:`. |
| **Action Mode (committing)** | User invokes `wf ai propose`. AI returns JSON proposal. Diff preview appears in a webview panel. User approves or edits. |
| **Quick questions** | A small webview chat panel (optional) can be used for ephemeral questions, with the option to "Save to design.md". |

This keeps the conversation **in the document**, where it belongs. The document is the chat history.

### 4. Coexisting with External Chat Tools

If a user prefers to use Continue or Cursor for conversation, we support that through **import workflows**:

- **Manual:** User copies the AI's response from Continue and pastes it into `design.md` under `## AI:`. They manually update frontmatter if needed.
- **Semi-automated:** A `wf import-chat` command that reads the clipboard or a selected text file and appends it with proper formatting.

The system doesn't care *how* the content got into `design.md`. It only cares that the document structure is maintained.

**Token tracking limitation:** Usage from external tools cannot be tracked. That's acceptable—it's a trade-off the user makes. The system's budget/context features apply only to AI interactions initiated *through* the workflow extension.

### 5. Why This Approach Wins

| Concern | How We Address It |
|---------|-------------------|
| **AI agnostic** | Extension calls provider APIs directly; user brings their own key. |
| **Zero dependency on Continue** | No reliance on any specific chat extension. |
| **Stateful context** | All conversation lives in `design.md`; AI reads from it. |
| **User freedom** | User can still use external chat; we provide import paths. |
| **Superior UX** | Inline document editing + diff previews beats copy-pasting from a chat window. |

### 6. Implementation Priorities

1. **Minimal AI client** in the extension (calls DeepSeek/OpenAI-compatible endpoints).
2. **`wf ai respond`** command: reads current document, sends to AI, appends response.
3. **`wf ai propose`** command: Action Mode with JSON handshake and diff approval.
4. **Token accumulator** (in-memory, session-scoped) for budget display.
5. **Context threshold detection** (using local tokenizer) for summarization triggers.
6. **Import helpers** for external chat content.

### 7. Open Questions

- Should the extension include a persistent chat webview, or rely solely on inline document editing?
  - *Leaning: Inline first; webview as optional convenience.*
- How to handle streaming responses in inline mode?
  - *Show a temporary status bar progress; insert full response when complete.*
- Should we support multiple AI providers out of the box?
  - *Yes, via configuration: provider type + API key + model name.*

## Decision

- **Build a native AI client into the VS Code extension.**
- **Do not depend on Continue or any external chat tool.**
- **Provide inline AI interaction (Chat Mode) and structured proposal (Action Mode).**
- **Accept that external chat usage will happen; offer import tools as mitigation.**
- **Token tracking and context management apply only to native AI usage.**

## Next Step

Update `AI_INTEGRATION.md` to reflect native implementation details rather than Continue-specific configuration. Design the `wf ai respond` and `wf ai propose` command specifications.