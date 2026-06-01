import * as path from 'path';
import * as fs from 'fs-extra';
import { ContextPrefs, ContextPrefsEntry } from '../../../core/dist';

/**
 * Read/write `.loom/context-prefs.json` — the persisted sidebar CONTEXT overrides
 * (Phase 3, design §4 Option B). Mode-agnostic per-target schema (§3 Option A):
 *
 *   { "<targetId>": { "include": string[], "exclude": string[] }, ... }
 *
 * This is the single source of write truth for context prefs; the MCP tools
 * (`loom_set_context_prefs` / `loom_get_context_prefs`) and the context resource
 * read path both go through here.
 */

const PREFS_RELATIVE = path.join('.loom', 'context-prefs.json');

function prefsPath(root: string): string {
    return path.join(root, PREFS_RELATIVE);
}

function arr(v: unknown): string[] {
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
}

function normalizeEntry(entry: unknown): ContextPrefsEntry {
    const e = entry && typeof entry === 'object' ? (entry as Record<string, unknown>) : {};
    return { include: arr(e.include), exclude: arr(e.exclude) };
}

/**
 * Read the whole prefs document. Missing file → `{}`. Malformed JSON (or a
 * non-object root) → `{}` — the file self-repairs on the next write rather than
 * throwing. Entry shapes are normalised so callers always get string arrays.
 */
export async function readContextPrefs(root: string): Promise<ContextPrefs> {
    try {
        const raw = await fs.readFile(prefsPath(root), 'utf8');
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
        const out: ContextPrefs = {};
        for (const [id, entry] of Object.entries(parsed as Record<string, unknown>)) {
            out[id] = normalizeEntry(entry);
        }
        return out;
    } catch {
        return {};
    }
}

/** Overrides for a single target. Missing entry → empty include/exclude. */
export async function readContextPrefsEntry(root: string, targetId: string): Promise<ContextPrefsEntry> {
    const prefs = await readContextPrefs(root);
    return prefs[targetId] ?? { include: [], exclude: [] };
}

async function writeContextPrefs(root: string, prefs: ContextPrefs): Promise<void> {
    const file = prefsPath(root);
    await fs.ensureDir(path.dirname(file));
    await fs.writeFile(file, JSON.stringify(prefs, null, 2) + '\n', 'utf8');
}

export interface SetContextPrefsInput {
    include?: string[];
    exclude?: string[];
    reset?: boolean;
}

/**
 * Update one target's overrides and persist. **Replace semantics**: a provided
 * `include`/`exclude` array replaces that list wholesale (an unspecified list is
 * preserved) — this is what lets the sidebar express "un-exclude doc X" by sending
 * the new arrays without X. `reset: true` removes the target entry entirely (back to
 * pure auto). An entry that ends up empty is pruned so the file never accumulates
 * `{ include: [], exclude: [] }` noise. Returns the full updated prefs document.
 */
export async function setContextPrefs(
    root: string,
    targetId: string,
    input: SetContextPrefsInput,
): Promise<ContextPrefs> {
    const prefs = await readContextPrefs(root);

    if (input.reset) {
        delete prefs[targetId];
        await writeContextPrefs(root, prefs);
        return prefs;
    }

    const current = prefs[targetId] ?? { include: [], exclude: [] };
    const dedupe = (xs: string[]) => Array.from(new Set(xs));
    const next: ContextPrefsEntry = {
        include: dedupe(input.include ?? current.include),
        exclude: dedupe(input.exclude ?? current.exclude),
    };

    if (next.include.length === 0 && next.exclude.length === 0) {
        delete prefs[targetId];
    } else {
        prefs[targetId] = next;
    }

    await writeContextPrefs(root, prefs);
    return prefs;
}
