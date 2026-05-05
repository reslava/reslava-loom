---
type: design
id: doc-ids-design
title: Doc IDs — ULID-based identity with slug presentation
status: active
created: "2026-05-03T00:00:00.000Z"
updated: 2026-05-03
version: 2
tags: []
parent_id: doc-ids-idea
child_ids: []
requires_load: []
---
# Doc IDs — Design

Implementation design for ULID-based doc identity, slug-on-refs, auto-loaded ctx, `requires_load` for refs only, and `child_ids` removal. Companion to `doc-ids-idea.md`.

## 1. Frontmatter shape

### All docs (canonical key order)

```yaml
---
type: idea | design | plan | chat | ctx | done | reference
id: {prefix}_{ulid}            # e.g. pl_01JT8Y3R4P7M6K2N9D5QF8A1BC
title: "Human Readable Title"
status: draft | active | ...
created: YYYY-MM-DD
version: 1
tags: []
parent_id: {prefix}_{ulid} | null
requires_load: []              # refs only; ctx is auto-loaded by level
# reference docs only:
slug: kebab-case-slug
loadWhen: null                 # future; reserved
# design-specific (unchanged):
role: primary | supporting
target_release: "0.x.0"
actual_release: null
---
```

**Removed fields:** `child_ids` (computed from `parent_id` via link index).

**Type prefix table:**

| Type | Prefix |
|------|--------|
| chat | `ch_` |
| idea | `id_` |
| design | `de_` |
| plan | `pl_` |
| done | `dn_` |
| ctx | `cx_` |
| reference | `rf_` |

## 2. Identity, filename, slug

| Concern | Source of truth |
|---------|----------------|
| Doc identity | `id` field in frontmatter (ULID + prefix) |
| Cross-doc references | `parent_id` and `requires_load` resolve via link index |
| Filename (refs) | `{slug}.md` |
| Filename (ctx) | `loom-ctx.md`, `{weave}-ctx.md`, `{weave}-{thread}-ctx.md` |
| Filename (other docs) | Existing convention: `{thread}-idea.md`, `{thread}-design.md`, `{thread}-plan-NNN.md`, `{thread}-chat-NNN.md`, `{step}-done.md` |

**Slug is on refs only.** Other doc types do not have a `slug` field.

**Slug rules:**
- Set on creation (kebab-cased from title).
- Stable forever — never auto-updated when title changes.
- Unique across the global refs namespace.
- Renamed only via `loom_rename(id, newSlug)`, which atomically updates every `requires_load` referencing the old slug.

## 3. Ctx auto-loading

Ctx docs are not listed in `requires_load`. The loader resolves them by path scoping when reading any doc:

1. Always load `loom/loom-ctx.md` (global).
2. If the doc is inside `loom/{weave}/`, load `loom/{weave}/{weave}-ctx.md` if it exists.
3. If the doc is inside `loom/{weave}/{thread}/`, load `loom/{weave}/{thread}/{weave}-{thread}-ctx.md` if it exists.

**Convention:** every weave has at most one ctx doc; every thread has at most one ctx doc; the global ctx is single. Multiple ctx docs per level are not supported.

**Ctx docs still have ULIDs** in their `id` field — filename is presentation, ULID is durable identity. If a thread folder is renamed, the ctx doc's filename changes but its ULID and any references to it remain intact.

## 4. `requires_load` semantics

- Accepts only **reference docs**, listed by **slug**.
- Resolves slug → ULID via the link index, then ULID → file path.
- Future: each entry may carry a `loadWhen:` filter (e.g. phase, doc type) — reserved as a frontmatter convention, not implemented in this migration.

```yaml
requires_load: [vision, workflow]
```

is shorthand for:

```yaml
requires_load:
  - slug: vision
  - slug: workflow
```

When `loadWhen:` lands, the long form will carry the filter:

```yaml
requires_load:
  - slug: migration-runbook
    loadWhen: { phase: implementing }
```

**Validation:** if a slug in `requires_load` does not resolve to a reference doc (or resolves to a non-ref), validation surfaces a diagnostic via `validate-state`.

## 5. Refs scoping

**Global only for this migration.**

- All refs live in `loom/refs/`.
- Slug uniqueness scope: this single folder.
- Filename: `{slug}.md` (e.g. `vision.md`, `architecture-reference.md`).

**Future expansion (deferred):** if a weave grows local refs, the convention is `loom/{weave}/refs/{weave}-{slug}.md` with slug uniqueness scoped per weave. The resolver would walk doc → thread refs → weave refs → global refs. Not implemented now.

## 6. Link index changes

Today the link index maps slug-based IDs to file paths. After the migration:

- **Primary index:** ULID `id` → file path.
- **Slug index (refs only):** `slug` → ULID. Used to resolve `requires_load` entries.
- **Backlink index:** ULID → list of doc ULIDs that reference it via `parent_id` or `requires_load`. Replaces `child_ids` for the "what points at me" query.

The link index is rebuilt once per `getState` call (no N+1), as today.

## 7. Repo and reducer changes

- `weaveRepository`, `threadRepository`, `linkRepository`: lookup by `id`-in-frontmatter, not path. File path becomes a derived value from the index.
- `loadThread`: walks the thread folder, parses frontmatter, registers each doc by ULID.
- Reducers stay pure. Identity migration is a pre-reducer concern (loading) and a post-reducer concern (saving).
- `serializeFrontmatter`: enforces canonical key order, drops any `child_ids` field encountered, validates ULID prefix matches `type`.

## 8. MCP surface adjustments

| Tool / Resource | Change |
|---|---|
| `loom_create_*` | Mint ULID + prefix on creation. Refs get a slug parameter. |
| `loom_rename` | For refs: takes `(id, newSlug)`; updates `requires_load` references atomically. For other docs: still updates filename, no cross-doc effect. |
| `loom_find_doc` | Accepts ULID or, for refs, slug. |
| `loom://thread-context/{weave}/{thread}` | Unchanged — folder-based URIs. Bundled docs identified by ULID internally. |
| `loom://doc/{id}` | New shape: takes a ULID. |
| `validate-state` | New diagnostic: `requires_load` slug doesn't resolve to a ref doc. |

## 9. Migration script

One-shot, idempotent, runs from `scripts/migrate-to-ulid.ts`. Ordered passes:

1. **Inventory.** Walk `loom/`, parse every doc's frontmatter, build a map: old-slug-id → file path, type, content.
2. **Mint ULIDs.** For each doc, generate a ULID with the type prefix. Build a mapping: old-slug-id → new ULID.
3. **Rewrite frontmatter.** For each doc:
   - Replace `id` with the new ULID.
   - Replace `parent_id` (lookup via the mapping; fail loudly on missing).
   - Drop `child_ids`.
   - For refs: ensure `slug` field is set (derive from old id if missing).
   - For non-refs: drop `slug` field if present.
   - Reorder keys via `serializeFrontmatter`.
4. **Rewrite `requires_load`.** Resolve each entry against the slug index. If an entry currently points at a non-ref (e.g. an idea), surface as a migration error — the author must reclassify or remove it before re-running.
5. **Rename ctx files.** Move ctx docs to the level-scoped naming convention (`loom-ctx.md`, `{weave}-ctx.md`, `{weave}-{thread}-ctx.md`).
6. **Regenerate link index.** Build fresh from disk; verify every `parent_id` and `requires_load` entry resolves.
7. **Verify.** Run full test suite. Any failure means abort and restore from the pre-migration commit.

**Atomicity:** the script writes to a scratch directory first, runs verification, then swaps it into place via a single `git mv`-style rename pass. If verification fails, the original tree is untouched.

**Test fixtures** are regenerated by re-running the same script on the fixture trees.

## 10. Sequencing

1. Land this design as `doc-ids-design.md` (this doc).
2. Plan `doc-ids-plan-001.md` — one or more steps covering: ULID minter, frontmatter migrator, link index rewrite, repo lookups, MCP surface updates, migration script + fixtures, validation diagnostics.
3. Ship before any user-facing rename / move / drag-and-drop work in the VS Code extension. Those features depend on this being in place.

## 11. Risks

- **Migration miscount.** A `parent_id` pointing at a missing doc, or a `requires_load` slug that doesn't resolve, must fail the migration loudly rather than silently dropping.
- **Slug collisions in refs.** Today there's no enforced uniqueness. The migration script must check and fail with a clear error if duplicates exist.
- **External tooling.** Anything outside this repo that hardcoded slug-based IDs (rare; mostly `.mcp.json` env or scripts) needs auditing.

## 12. Out of scope

- Implementing `loadWhen:` (reserved field only).
- Weave-level or thread-level refs folders.
- Reverse migration (ULID → slug). One-way.
- Visual UI in VS Code for editing slug fields — handled by future ref-management UX.

## Acceptance

- Every doc in `loom/` has a ULID `id` with correct type prefix.
- No doc has `child_ids`.
- Only refs have `slug`.
- Every `parent_id` and `requires_load` entry resolves via the link index.
- `getState` builds successfully and tests pass.
- Ctx docs live at the level-scoped paths and are auto-loaded by the resolver.
