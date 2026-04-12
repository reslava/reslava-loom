# AI Integration & Handshake Protocol

This document defines how the workflow system interacts with Large Language Models (LLMs). It specifies the **native AI client**, **context injection strategy**, **dual interaction modes** (Chat vs. Action), and the **human approval flow** that ensures safe, predictable AI collaboration.

---

## 1. Core Philosophy

The system treats the AI as a **collaborator, not an autonomous agent**. The AI:

- Reads **persistent Markdown documents** instead of relying on chat memory.
- Participates in a **free-form conversation log** (`## User:` / `## AI:`) for exploration and reasoning.
- Proposes **structured actions** only when explicitly requested or when a workflow state change is appropriate.
- **Waits for human approval** before any state change occurs.

This approach ensures:

- **Traceability**: Every AI decision is captured in `design.md`.
- **Safety**: The AI cannot accidentally corrupt state or execute destructive commands.
- **Context Retention**: The AI has full access to the decision history stored in documents.
- **Low Friction**: The conversation log remains the primary interaction surface; structured actions are optional.

---

## 2. Document Writing Convention

All workflow documents follow a consistent voice:

- **First person** in conversation blocks (`## User:` and `## AI:`). These are direct dialogue between the human and the AI.
- **Third person** in all other sections (Goal, Context, Architecture, etc.). This maintains objectivity and readability.

---

## 3. Architecture Overview

The VS Code extension includes a **native AI client** that directly calls LLM provider APIs. No external chat tool is required.

```
┌─────────────────────────────────────────────────────────────┐
│                      VS Code Extension                       │
│  ┌─────────────────┐  ┌──────────────────────────────────┐  │
│  │   UI Commands   │  │         Native AI Client         │  │
│  │ wf ai respond   │─▶│  - Prompt assembly               │  │
│  │ wf ai propose   │  │  - API call (DeepSeek/OpenAI)    │  │
│  │ wf summarise    │  │  - Response parsing              │  │
│  └─────────────────┘  │  - Token accumulation            │  │
│                       └──────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │   LLM Provider API  │
                    │ (DeepSeek, OpenAI,  │
                    │  local Ollama, etc.)│
                    └─────────────────────┘
```

This design ensures **AI agnosticism** and **zero dependency** on extensions like Continue or Cursor.

---

## 4. Interaction Modes

The system supports two distinct modes of AI interaction.

### 4.1 Chat Mode (Default)

**Purpose:** Brainstorming, clarifying requirements, exploring options.

**Invocation:** `wf ai respond` command (or toolbar button).

**Behavior:**
- The extension reads the current document (usually `design.md`).
- It assembles context: feature state, full conversation log, and any documents listed in `requires_load`.
- The prompt is sent to the configured LLM.
- The AI's plain text response is appended to the document as a new `## AI:` block.
- No workflow state changes occur.

**Example:**
```markdown
## User:
I think we should consider using a message queue for async processing. Thoughts?

## AI:
That's a solid direction. A message queue would decouple the API from heavy processing tasks. 
Do you have a preference between RabbitMQ, SQS, or Kafka?
```

### 4.2 Action Mode (Explicit)

**Purpose:** Committing a decision to the workflow state (e.g., refining a design, starting a plan).

**Invocation:** `wf ai propose` command.

**Behavior:**
- The extension assembles context **plus** the list of allowed events (from `workflow.yml`) for the current document type and status.
- The LLM responds with a **structured JSON block** containing a proposed workflow event.
- The extension displays a diff preview of the proposed frontmatter changes.
- Upon user approval, the event is fired, updating the document and triggering any side effects.

**Example JSON Response:**
```json
{
  "proposed_action": "REFINE_DESIGN",
  "reasoning": "The user confirmed PostgreSQL as the database choice. The design version should be incremented to reflect this change and mark dependent plans as stale.",
  "target_document_id": "design-payment",
  "requires_approval": true,
  "next_step_description": "Review the updated design and regenerate any stale plans."
}
```

---

## 5. AI Handshake Protocol (Action Mode)

When in Action Mode, the AI must respond with a strict JSON object adhering to the following schema:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["proposed_action", "reasoning"],
  "properties": {
    "proposed_action": {
      "type": "string",
      "enum": ["REFINE_DESIGN", "CREATE_PLAN", "START_PLAN", "COMPLETE_STEP", "REQUEST_CLARIFICATION", "NO_ACTION"],
      "description": "The event to fire, or a special action."
    },
    "reasoning": {
      "type": "string",
      "description": "Explanation shown to the user in the approval dialog."
    },
    "target_document_id": {
      "type": "string",
      "description": "ID of the document to act upon. Defaults to the current primary document."
    },
    "requires_approval": {
      "type": "boolean",
      "description": "Should always be true for state-changing events."
    },
    "next_step_description": {
      "type": "string",
      "description": "Optional hint for the user after approval."
    },
    "clarification_question": {
      "type": "string",
      "description": "Required if proposed_action is REQUEST_CLARIFICATION."
    }
  }
}
```

### Special Actions

- `REQUEST_CLARIFICATION`: The AI asks a question instead of proposing an event.
- `NO_ACTION`: The user's query doesn't require a state change.

---

## 6. Context Injection Strategy

The native AI client builds a system prompt containing:

| Priority | Source |
|----------|--------|
| 1 | Feature derived state (status, phase) |
| 2 | Full `design.md` (or `design-ctx.md` if size exceeds threshold) |
| 3 | Active plan steps (if any) |
| 4 | Documents listed in `requires_load` |
| 5 | Allowed events list (Action Mode only) |

### Token Budget Management

The extension respects the following VS Code settings:

| Setting | Default | Description |
|---------|---------|-------------|
| `workflow.ai.maxContextTokens` | `8000` | Maximum tokens for the entire prompt. |
| `workflow.ai.designSummaryThreshold` | `20000` | Characters in `design.md` before auto-summary. |
| `workflow.ai.reservedResponseTokens` | `1000` | Tokens reserved for the AI's response. |

If the context exceeds `maxContextTokens`, the system truncates the conversation log to the most recent blocks and logs a warning.

---

## 7. Approval Flow (Action Mode)

```text
1. Parse JSON response → If invalid, show error and offer retry.
2. Check proposed_action:
   - REQUEST_CLARIFICATION → Show question in chat.
   - NO_ACTION → Do nothing.
   - State-changing event → Continue.
3. Generate diff preview of affected frontmatter.
4. Show approval dialog with reasoning.
5. Upon approval, fire event through orchestrator and apply effects.
```

---

## 8. Recording AI Interactions in `design.md`

All AI responses are appended as `## AI:` blocks, regardless of mode:

- **Chat Mode:** Plain text is appended directly.
- **Action Mode:** The JSON proposal is wrapped in a code block, followed by a summary.

This ensures a complete, searchable conversation history.

---

## 9. Context Summarization (`design-ctx.md`)

To prevent context overflow, the system can auto-generate a summary of `design.md`:

- **Trigger:** Manual (`wf summarise-context`) or when `design.md` exceeds the configured character threshold.
- **Content:** Problem statement, key decisions with timestamps, open questions, and plan references.
- **AI Usage:** When fresh, the AI is instructed to read the summary first.

---

## 10. Coexistence with External Chat Tools

Users may still use external chat tools (Continue, Cursor, web ChatGPT). The system:

- **Does not block or discourage this.**
- Provides `wf import-chat` to paste external responses into `design.md` with proper formatting.
- Clearly communicates that token tracking and context features **only apply to native AI usage**.

This respects user freedom while offering a superior integrated experience.

---

## 11. Provider Configuration

Users configure their AI provider in VS Code settings:

```json
{
  "workflow.ai.provider": "deepseek",
  "workflow.ai.apiKey": "sk-...",
  "workflow.ai.model": "deepseek-chat",
  "workflow.ai.baseUrl": "https://api.deepseek.com/v1"
}
```

Supported providers: DeepSeek, OpenAI, Anthropic (via OpenAI-compatible proxy), Ollama (local).

---

## 12. Commands Summary

| Command | Mode | Description |
|---------|------|-------------|
| `wf ai respond` | Chat | Get AI response and append to document. |
| `wf ai propose` | Action | Request JSON event proposal; show diff approval. |
| `wf summarise-context` | Utility | Force generation of `design-ctx.md`. |
| `wf import-chat` | Utility | Import external chat content into document. |

---

## 13. Troubleshooting

| Symptom | Possible Cause | Solution |
|---------|---------------|----------|
| AI proposes invalid events | Allowed events list missing or `workflow.yml` invalid | Run `wf validate-config`. |
| AI response truncated | Context exceeds token limit | Reduce `maxContextTokens` or summarize manually. |
| Approval dialog shows no diff | Event does not change frontmatter | Expected for events like `CREATE_PLAN` (child creation). |
| AI outputs JSON in Chat Mode | Mode detection failed | Ensure correct command was used. |

---

## 14. Future Enhancements

- Streaming responses for real-time feedback.
- Hybrid mode: conversational text with embedded JSON proposals.
- Custom prompt templates.
- Per-feature cost tracking.