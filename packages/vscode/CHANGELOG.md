# Loom VS Code Extension — Changelog

## [0.5.0] - 2026-05-14

### Added
- **MCP client architecture** — extension now routes all AI operations through the Loom MCP server via sampling. No separate API key needed in VS Code settings; billing flows through your AI agent (Claude Code, Cursor).
- **Empty-workspace welcome view** — friendly onboarding shown when no `loom/` workspace exists; includes *Initialize Workspace* button.
- **MCP reconnect command** (`loom.reconnectMcp`) — restore the MCP connection without reloading VS Code. Status-bar indicator reflects real connection state.
- **Promote to Reference** — promote any chat or doc to a `*-reference.md` in `loom/refs/`.
- **Thread-create from node** — create a new thread directly from a weave node in the tree.
- **Chat custom names** — chats show a custom title in the tree view.
- **Status filter** — filter the tree by status (active, implementing, draft, done, archived).
- **Sort archive / sort reference** — archive and reference nodes sorted by modification time.
- **Dynamic tree title** — reflects current workspace and filter state.

### Changed
- All AI toolbar buttons (`Weave Idea`, `Weave Design`, `Weave Plan`, `Chat Reply`, `Summarise`, `Refine`, `Do Step`, etc.) now go through MCP sampling — no direct `app` imports remain in the extension.
- `packages/vscode` vsix is now 370 KB (down from ~774 MB) — fixed by moving bundled deps to `devDependencies` and tightening `.vscodeignore`.

### Fixed
- `weaveCreate` / `threadCreate` path bug: files were written to `weaves/` instead of `loom/`.
- Selection context wiring: `loom.selectedWeaveId` now set when any descendant doc is clicked, not just weave nodes.
