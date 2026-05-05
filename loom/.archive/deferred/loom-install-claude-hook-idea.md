---
type: idea
id: loom-install-claude-hook
title: "Ship loom-mcp-gate hook with `loom install`"
status: deferred
created: 2026-05-05
version: 1
tags: [install, hook, claude-code, mcp-discipline, deferred]
parent_id: null
child_ids: []
requires_load: []
---

# Ship `loom-mcp-gate` hook with `loom install`

## Why

The `loom-mcp-gate` PreToolUse hook is the only mechanism that *physically* prevents AI agents from bypassing MCP for writes to `loom/**/*.md`. Without it, the rule lives in CLAUDE.md as honor-system text — which AI will route around (Track 1 chat reply on 2026-05-05 documents this honestly). For Loom to fulfill its dogfooding promise — "every downstream user stress-tests our MCP surface" — every Loom workspace needs this gate by default.

Currently the gate is hand-installed in this repo only (`.claude/hooks/loom-mcp-gate.ps1` + `.claude/settings.json`). Downstream projects running `loom install` get the CLAUDE.md rule but no enforcement.

## What

`loom install` should write a Claude Code hook that physically blocks `Edit/Write/MultiEdit` to `loom/**/*.md` (excluding `loom/refs/`, `loom/.archive/`, and anything outside `loom/`). The hook produces a deny message that names the right `loom_*` MCP tool to use.

Two pieces:

1. **Hook script:** `.loom/hooks/loom-mcp-gate.js` — Node-based (cross-platform, no PowerShell dependency since Loom already requires Node).
2. **Settings integration:** create or merge into `.claude/settings.json` a `PreToolUse` entry on matcher `Edit|Write|MultiEdit` that calls the hook script.

## How

### Hook script (Node)

Reads JSON from stdin, extracts `tool_input.file_path`, normalizes path, computes path relative to `process.cwd()`, applies the same allow/deny logic as the PowerShell version. Outputs JSON with `hookSpecificOutput.permissionDecision = "deny"` when matched.

Logic must anchor on cwd, never substring-match `/loom/` — the repo path itself contains "loom" in this project, and could in others. (Lesson from this session: first version of the PS script had this bug and blocked `CLAUDE.md` at repo root.)

### Settings merge

Three cases for `.claude/settings.json`:

1. **File doesn't exist** — write a fresh file with just the hook entry.
2. **File exists, no `hooks.PreToolUse`** — add the entry, preserve all other settings.
3. **File exists with existing `PreToolUse` matcher** — append our hook to the matching entry's `hooks` array, or insert a new matcher block. Idempotent: skip if `loom-mcp-gate.js` is already wired (detect by command-string substring match).

Always back up to `.claude/settings.json.bak` on first install if the file existed.

### Install flags

- `--no-hook` — skip hook installation (for users who explicitly don't want it, or who use a non-Claude-Code MCP host).
- `--force-hook` — overwrite existing hook entry without idempotency check.

### After-install message

Print:
```
Loom MCP gate installed at .loom/hooks/loom-mcp-gate.js.
In Claude Code, run /hooks once to confirm the gate is loaded.
To disable: /hooks → toggle off, or remove the entry from .claude/settings.json.
```

## Open questions

1. **Other MCP hosts.** The `.claude/settings.json` hook only fires in Claude Code. Cursor, Continue, raw `claude.ai`, Codex etc. each have their own hook surfaces (or none). Should `loom install` also write hook configs for those, or document them as out-of-scope?
2. **Override granularity.** Should the gate exempt body-only edits (chat append, design narrative) so users can still touch those directly? Counter-argument: that's exactly what `loom_append_to_chat` and `loom_update_doc` are for, and exempting opens a routing-around loophole.
3. **Hook update flow.** When Loom ships a new version of the gate logic, how do users get the update? Re-run `loom install`? Auto-detect version in the script header and offer to update?
4. **Cross-platform smoke test.** The Node script needs to be tested on macOS and Linux (this project's Loom repo is Windows-only currently). Add to CI matrix.

## Why deferred

Opened during a Track 2 (concept-doc consolidation) session on 2026-05-05. The Track 1 hook itself was just installed locally; we want a few sessions of dogfooding here before generalizing it to `loom install`. Ship locally → find bugs → harden → ship to install.

Pick this back up once: (a) the local gate has caught at least one real MCP bug class without false positives, (b) the Node port is written and tested, (c) `loom install` already has stable behavior worth extending.

## Pickup checklist

- [ ] Port `.claude/hooks/loom-mcp-gate.ps1` logic to a Node script
- [ ] Implement settings.json detect/merge/idempotent in `packages/app/src/installWorkspace.ts`
- [ ] Add `--no-hook` and `--force-hook` flags to `loom install`
- [ ] Update LOOM_CLAUDE_MD template to mention the gate is installed by default (with override path)
- [ ] CI smoke test on macOS + Linux + Windows
- [ ] Open questions 1–3 resolved before merge
