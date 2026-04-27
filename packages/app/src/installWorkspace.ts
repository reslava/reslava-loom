import * as fs from 'fs-extra';
import * as path from 'path';
import { initLocal } from './init';
import { ConfigRegistry } from '../../core/dist/registry';

export interface InstallWorkspaceInput {
    force?: boolean;
}

export interface InstallWorkspaceDeps {
    fs: typeof fs;
    registry: ConfigRegistry;
    cwd: string;
}

export interface InstallWorkspaceResult {
    path: string;
    loomDirCreated: boolean;
    claudeMdWritten: boolean;
    rootClaudeMdPatched: boolean;
    mcpJsonWritten: boolean;
}

const LOOM_CLAUDE_MD = `# Loom Session Contract

## What Loom is

**Loom** is a document-driven, event-sourced workflow system for AI-assisted development.
Markdown files are the database. State is derived. AI collaborates step-by-step with human approval.

---

## Key terminology

| Term | Meaning |
|------|---------|
| **Weave** | A project folder under \`loom/\`. The core domain entity. |
| **Thread** | A workstream subfolder inside a Weave (\`loom/{weave}/{thread}/\`). Contains idea, design, plans, done docs, chats. |
| **Plan** | An implementation plan doc (\`*-plan-*.md\`) with a steps table. Lives in \`{thread}/plans/\`. |
| **Design** | A design doc (\`*-design.md\`). Contains the design conversation log. |

Thread layout: \`loom/{weave-id}/{thread-id}/{thread-id}-idea.md\`, \`{thread-id}-design.md\`, \`plans/\`, \`done/\`.

---

## MCP tools (Stage 2)

### Claude Code config

\`\`\`json
{
  "mcpServers": {
    "loom": {
      "command": "loom",
      "args": ["mcp"],
      "env": {
        "LOOM_ROOT": "\${workspaceFolder}"
      }
    }
  }
}
\`\`\`

### Primary entry points

| Entry point | When to use |
|-------------|-------------|
| \`loom://thread-context/{weaveId}/{threadId}\` resource | Load full context for a thread before working on it |
| \`do-next-step\` prompt | Get the next incomplete step with full context pre-loaded |
| \`continue-thread\` prompt | Review thread state and get a next-action suggestion |
| \`validate-state\` prompt | Review diagnostics and identify issues to fix |

### Rules

- **All Loom state mutations must go through MCP tools** — create doc, mark step done, rename, archive, promote. Never edit weave markdown files directly to change state.
- Use \`loom://thread-context\` before starting any thread work.
- \`do-next-step\` prompt is the primary workflow driver: call it with the active planId to get context + step instruction.
- \`loom_generate_*\` tools require sampling support (Claude Code only). If unavailable, use \`loom_create_*\` tools manually.

---

## AI session rules

- **Chat Mode (default):** Respond naturally. Never modify frontmatter or files without explicit approval.
- **Action Mode:** Only when the user explicitly asks. Respond with a JSON proposal per the handshake protocol.
- **Never propose state changes** (version bumps, status transitions) without being asked.
- **When asked to read a file ending in \`-chat.md\`**: reply by writing inside that doc at the bottom under \`## AI:\`.
- **MCP tools for Loom state changes:** All mutations must go through MCP tools. Never edit weave markdown files directly.

---

## Session start protocol

**These reads are mandatory at the start of every session — including when continuing from a compacted/summarized conversation.**

1. Read \`.loom/_status.md\` if present — note Stage, active weave, active plan, last session.
2. Load thread context:
   - **Stage 2 (MCP active):** read \`loom://thread-context/{weaveId}/{threadId}\` resource. Then call the \`do-next-step\` prompt with the active planId.
   - **Stage 1 (manual):** read the active plan file and its \`requires_load\` docs directly.

After the reads, output this block and **STOP**:

\`\`\`
📋 Session start  [Stage {1|2}]
> Active weave:  {weave-id}
> Active plan:   {plan title} — Step {N}  (or "no active plan")
- Docs read: {doc1} ✓ · {doc2} ✓ · ...

STOP — waiting for go
\`\`\`

---

## Non-negotiable stop rules

1. **After each step**: mark ✅ in the plan · state the next step + files that will be touched · **STOP** — wait for \`go\`.
2. **Error loop**: after a 2nd consecutive failed fix — stop, write root-cause findings, wait for \`go\`.
3. **Design decision**: when a decision affects architecture, API shape, or test design — explain options and trade-offs, **STOP** and wait.
4. **User says "STOP"**: respond with \`Stopped.\` only — nothing else.

---

## Collaboration style

- Discuss design before implementing — think out loud and reach better solutions through dialogue.
- When a design question is open, present trade-offs and ask — don't just pick one.
- Do not make any changes until you have 95% confidence. Ask follow-up questions until you reach that confidence.
- Always choose the cleanest, most correct approach. If it requires more work, say so.
`;

const MCP_JSON = JSON.stringify({
    mcpServers: {
        loom: {
            command: 'loom',
            args: ['mcp'],
            env: {
                LOOM_ROOT: '${workspaceFolder}',
            },
        },
    },
}, null, 2);

export async function installWorkspace(
    input: InstallWorkspaceInput,
    deps: InstallWorkspaceDeps
): Promise<InstallWorkspaceResult> {
    const root = deps.cwd;
    const loomDir = path.join(root, '.loom');
    const loomClaudeMdPath = path.join(loomDir, 'CLAUDE.md');
    const rootClaudeMdPath = path.join(root, 'CLAUDE.md');
    const claudeDir = path.join(root, '.claude');
    const mcpJsonPath = path.join(claudeDir, 'mcp.json');

    // Step 1: init .loom/ structure (idempotent if exists)
    let loomDirCreated = false;
    if (!deps.fs.existsSync(loomDir)) {
        await initLocal({ force: input.force }, { fs: deps.fs, registry: deps.registry });
        loomDirCreated = true;
    } else if (input.force) {
        await initLocal({ force: true }, { fs: deps.fs, registry: deps.registry });
        loomDirCreated = true;
    }

    // Step 2: write .loom/CLAUDE.md
    deps.fs.ensureDirSync(loomDir);
    deps.fs.writeFileSync(loomClaudeMdPath, LOOM_CLAUDE_MD, 'utf8');
    const claudeMdWritten = true;

    // Step 3: patch root CLAUDE.md
    const importLine = '@.loom/CLAUDE.md';
    let rootClaudeMdPatched = false;
    if (deps.fs.existsSync(rootClaudeMdPath)) {
        const existing = deps.fs.readFileSync(rootClaudeMdPath, 'utf8');
        if (!existing.includes(importLine)) {
            deps.fs.writeFileSync(rootClaudeMdPath, `${importLine}\n\n${existing}`, 'utf8');
            rootClaudeMdPatched = true;
        }
    } else {
        deps.fs.writeFileSync(rootClaudeMdPath, `${importLine}\n`, 'utf8');
        rootClaudeMdPatched = true;
    }

    // Step 4: write .claude/mcp.json (skip if exists and not --force)
    deps.fs.ensureDirSync(claudeDir);
    let mcpJsonWritten = false;
    if (!deps.fs.existsSync(mcpJsonPath) || input.force) {
        deps.fs.writeFileSync(mcpJsonPath, MCP_JSON, 'utf8');
        mcpJsonWritten = true;
    }

    return { path: root, loomDirCreated, claudeMdWritten, rootClaudeMdPatched, mcpJsonWritten };
}
