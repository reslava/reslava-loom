---
type: plan
id: pl_01KSAW3YTZ4YK0WBZK3R6ABMGV
title: Doc title H1 sync, section demotion, refs tree fix
status: implementing
created: 2026-05-23
version: 1
design_version: 1
tags: []
parent_id: de_01KQYDFDDEQ81VMM0SPD1P1DBM
requires_load: []
target_version: 0.1.0
---

| | |
|---|---|
| **Created** | 2026-05-23 |
| **Status** | DRAFT |
| **Design** | `{design-id}.md` |
| **Target version** | {X.X.X} |

---

# Goal

Make frontmatter `title` the single source of truth for doc titles, with a derived `# {Title}` H1 in every body kept in sync at the save-path chokepoint (so VS Code markdown preview renders a title). All other body H1s become H2s (with cascading demotion — H2→H3, H3→H4, etc., to preserve hierarchy). Drop dead `# CHAT` scaffolding from designs and chats. Fix the refs tree section so an empty `refs/` folder still renders (enabling Create Reference). Migrate existing docs with a dry-run script that skips old design docs (preserve their inline chat history).
---

# Steps

| Done | # | Step | Files touched | Blocked by |
|---|---|---|---|---|
| 🔳 | 1 | Commit and push current focus/select fixes (revealDoc.ts, threadCreate.ts, weaveCreate.ts) so the upcoming sweeping changes land on a clean base. | — | — |
| 🔳 | 2 | Grep all H1 + H2 readers/parsers across packages (planTableUtils, doStep, step-table locators, ctx generators, anything that anchors on `# Heading` or `## Heading`) and list every site that needs to handle the new format. No edits yet — produce a map. | — | — |
| 🔳 | 3 | Add `syncBodyH1(body, title): string` helper in packages/core (idempotent: replaces first H1 line with `# ${title}` or prepends one if missing). Wire it into the fs save chokepoint (packages/fs document write path) so every MCP write goes through it. Unit test the helper (no H1, matching H1, mismatched H1, H1 not on first line). | — | — |
| 🔳 | 4 | Update generators to stop emitting redundant section H1s: planBody.ts (`# Goal`→`## Goal`, `# Steps`→`## Steps`), refineDesign.ts + refinePlan.ts (`# Additional Context`→`## Additional Context`), installWorkspace.ts (`# Global Context`→`## Global Context`). Generators that emit `# ${title}` directly (promote*, refine*, createReference) keep doing so — the sync helper is idempotent. | — | — |
| 🔳 | 5 | Update chat-doc generators: chatNew.ts and doStep.ts replace `# CHAT\n\n## ${name}\n` with `# ${title}\n\n## ${name}\n`. Drop `# CHAT` from designBody.ts entirely (designs no longer host inline chat). | — | — |
| 🔳 | 6 | Update parsers to match the new heading levels: planTableUtils.ts:75 regex matches `## Steps` (accept both `# Steps` and `## Steps` during transition for backward compat). Update any step-table locator in doStep / app that anchors on `# Steps`. | — | — |
| 🔳 | 7 | Fix refs tree render: treeProvider.ts:192 — drop the `refsChats.length > 0 || allGlobalRefs.length > 0` guard so an empty `refs/` folder still renders the section node, enabling the Create Reference context menu. | — | — |
| 🔳 | 8 | Build (`cd packages/vscode && npm run package`) and manually verify in the extension: create idea/design/plan/chat → markdown preview shows the title; rename a doc → both frontmatter and `# Title` update; refs section appears on empty `refs/` and Create Reference works. | — | — |
| 🔳 | 9 | Write scripts/migrate-h1-titles.ts. For each loom/**/*.md (skip .archive/): ensure first H1 matches frontmatter title (frontmatter wins); cascade-demote all *other* headings — every remaining `# X` → `## X`, `## X` → `### X`, etc. — to preserve hierarchy; SKIP body for old design docs that contain a `# CHAT` section (preserve historical conversation). Dry-run by default, print full diff sample, require --apply to write. | — | — |
| 🔳 | 10 | Run migration dry-run, share diff sample for approval. On `go`, run with --apply. | — | — |
| 🔳 | 11 | Run full test suite (./scripts/test-all.sh) — fix any heading-anchor breakage the parser update missed. Build all packages (./scripts/build-all.sh). | — | — |
| 🔳 | 12 | Commit migration + format changes with clear message; push. | — | — |
---

## Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Done |
| 🔄 | In Progress |
| 🔳 | Pending |
| ❌ | Cancelled |
