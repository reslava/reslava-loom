Here's a comprehensive `DOCUMENTATION_GUIDE.md` that establishes the writing conventions and document structure standards for the entire project.

```markdown
---
type: design
id: documentation-guide
title: "Documentation Guide — Writing Conventions & Structure"
status: active
created: 2026-04-12
version: 1.0.0
tags: [documentation, conventions, style-guide]
parent_id: workflow-design-v2
child_ids: []
requires_load: []
---

# Documentation Guide — Writing Conventions & Structure

## Goal

Define consistent writing conventions, document structure, and formatting standards for all workflow system documentation. This ensures clarity for both human readers and AI collaborators.

## Context

The workflow system relies heavily on Markdown documents as the source of truth. Consistent structure improves scannability, enables AI context injection, and maintains professionalism across the project.

This guide applies to:
- Project documentation (README, ARCHITECTURE, etc.)
- Workflow documents (idea, design, plan, ctx)
- Templates
- Inline code comments (where applicable)

---

## Document Voice Conventions

### First Person in Conversation Blocks

Sections marked `## User:` and `## AI:` are **direct dialogue**. Write in **first person** as if the participant is speaking.

```markdown
## User:
I think we should use PostgreSQL for the primary database.

## AI:
I agree. PostgreSQL offers better concurrency and supports advanced features we may need later.
```

### Third Person Everywhere Else

All other sections—Goal, Context, Architecture, step descriptions, etc.—are written in **third person** (or neutral narrative voice). This maintains objectivity and professional documentation standards.

```markdown
## Goal
Define a clear and extensible model for representing a Feature as a first-class concept.

## Context
The system currently represents documents as independent entities. A Feature groups related documents together.
```

### Why This Matters

- **Readability:** Readers can instantly distinguish between narrative documentation and actual conversation.
- **AI Parsing:** LLMs can reliably identify the conversation log versus structural content.
- **Consistency:** A single voice reduces cognitive load across a large documentation set.

---

## Document Structure

### Required Frontmatter Fields

Every workflow document must include YAML frontmatter with at minimum:

| Field | Description |
|-------|-------------|
| `type` | Document type (`idea`, `design`, `plan`, `ctx`) |
| `id` | Unique identifier (kebab-case, e.g., `workflow-design-v2`) |
| `title` | Human-readable title in quotes |
| `status` | Current status (see status reference) |
| `created` | ISO date `YYYY-MM-DD` |
| `version` | Semantic version or integer |
| `tags` | Array of relevant tags |
| `parent_id` | ID of parent document (or `null`) |
| `child_ids` | Array of child document IDs |
| `requires_load` | Array of document IDs required for AI session context |

### Body Structure by Document Type

| Type | Expected Sections |
|------|-------------------|
| `idea` | Problem, Idea, Why now, Open questions, Next step |
| `design` | Goal, Context, `# CHAT` (followed by `## User:` / `## AI:` blocks) |
| `plan` | Goal, Steps table, Step details, Legend |
| `ctx` | Active state, Key decisions, Open questions, Step continuation note |

Templates for each type are available in `docs/templates/`.

---

## Formatting Standards

### Headers

- Use ATX-style headers (`#`, `##`, `###`).
- Maintain a single `#` title at the top of the document.
- Section headers use `##`.
- Sub-sections use `###`.

### Tables

Use pipe tables for structured data. Align columns for readability.

```markdown
| Symbol | Meaning |
|--------|---------|
| ✅ | Done |
| 🔄 | In Progress |
| 🔳 | Pending |
| ❌ | Cancelled |
```

### Code Blocks

Specify language for syntax highlighting.

````markdown
```typescript
function applyEvent(feature: Feature, event: Event): Feature {
  // ...
}
```
````

### Lists

- Use `-` for unordered lists.
- Use `1.` for ordered lists.

### Links

Use reference-style links for repeated URLs.

```markdown
[DeepSeek API]: https://api.deepseek.com/v1
```

### Emphasis

- Use `**bold**` for strong emphasis.
- Use `*italic*` for light emphasis.
- Use `> ` for blockquotes.

---

## Symbols & Legend

The following symbols are used consistently across all documents:

| Symbol | Meaning |
|--------|---------|
| ✅ | Done |
| 🔄 | In Progress |
| 🔳 | Pending |
| ❌ | Cancelled |
| ⚠️ | Warning / Stale |
| 🔴 | Critical priority |
| 🟡 | High priority |
| 🟢 | Nice-to-have |

A legend should be included in any document that uses these symbols in tables (e.g., plan step tables).

---

## Naming Conventions

| Element | Convention | Example |
|---------|------------|---------|
| Document IDs | kebab-case | `workflow-design-v2` |
| Feature IDs | kebab-case | `payment-system` |
| File names | kebab-case with type suffix | `plan-001.md` |
| Event names | SCREAMING_SNAKE_CASE | `REFINE_DESIGN` |
| CLI commands | kebab-case | `wf ai respond` |

---

## AI Collaboration Notes

When writing documentation intended for AI consumption:

1. **Be explicit.** State requirements, constraints, and expected outputs clearly.
2. **Use structured sections.** AI models attend more strongly to headers.
3. **Include examples.** Concrete examples improve response accuracy.
4. **Specify the mode.** Indicate whether the AI should respond in Chat Mode (natural language) or Action Mode (JSON proposal).

---

## Templates

Reference templates are located in `docs/templates/`:

- `idea-template.md`
- `design-template.md`
- `plan-template.md`
- `ctx-template.md`

When creating a new document, copy the appropriate template and fill in placeholders.

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-04-12 | Initial documentation guide. |