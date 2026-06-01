import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';
import { assert } from './test-utils.ts';
import {
    readContextPrefs,
    readContextPrefsEntry,
    setContextPrefs,
} from '../packages/fs/dist/index.js';

// Real-fs unit test for the .loom/context-prefs.json repository (Phase 3, step 1).
// Covers replace/merge semantics, reset clearing, missing-file create, malformed repair.

const ROOT = path.join(os.tmpdir(), 'loom-context-prefs-test');
const PREFS = path.join(ROOT, '.loom', 'context-prefs.json');

async function reset() {
    await fs.remove(ROOT);
    await fs.ensureDir(ROOT);
}

async function run() {
    console.log('\n▶ context-prefs repository\n');

    // ── missing file → {} ─────────────────────────────────────────────────────
    await reset();
    console.log('  • missing file reads as empty...');
    assert(Object.keys(await readContextPrefs(ROOT)).length === 0, 'missing file should read {}');
    const emptyEntry = await readContextPrefsEntry(ROOT, 'x');
    assert(emptyEntry.include.length === 0 && emptyEntry.exclude.length === 0, 'missing entry empty');
    console.log('    ✅');

    // ── set creates the file + entry (missing-file create) ────────────────────
    console.log('  • set creates the file and entry...');
    await setContextPrefs(ROOT, 'ch_1', { exclude: ['rf_a'] });
    assert(await fs.pathExists(PREFS), 'prefs file should be created');
    let e = await readContextPrefsEntry(ROOT, 'ch_1');
    assert(e.exclude.join() === 'rf_a', 'exclude persisted');
    assert(e.include.length === 0, 'include untouched');
    console.log('    ✅');

    // ── replace semantics: provided list replaces, omitted list preserved ─────
    console.log('  • provided list replaces; omitted list preserved...');
    await setContextPrefs(ROOT, 'ch_1', { include: ['rf_b'] });
    e = await readContextPrefsEntry(ROOT, 'ch_1');
    assert(e.include.join() === 'rf_b', 'include replaced');
    assert(e.exclude.join() === 'rf_a', 'exclude preserved when only include given');
    await setContextPrefs(ROOT, 'ch_1', { exclude: ['rf_c', 'rf_d'] });
    e = await readContextPrefsEntry(ROOT, 'ch_1');
    assert(e.exclude.join() === 'rf_c,rf_d', 'exclude replaced wholesale');
    assert(e.include.join() === 'rf_b', 'include still preserved');
    console.log('    ✅');

    // ── un-exclude via replace (send the shorter array) ───────────────────────
    console.log('  • un-exclude via replace (shorter array)...');
    await setContextPrefs(ROOT, 'ch_1', { exclude: ['rf_c'] });
    e = await readContextPrefsEntry(ROOT, 'ch_1');
    assert(e.exclude.join() === 'rf_c', 'rf_d removed by replace');
    console.log('    ✅');

    // ── dedupe within a provided list ─────────────────────────────────────────
    console.log('  • dedupe within a provided list...');
    await setContextPrefs(ROOT, 'ch_1', { exclude: ['rf_x', 'rf_x', 'rf_y'] });
    e = await readContextPrefsEntry(ROOT, 'ch_1');
    assert(e.exclude.join() === 'rf_x,rf_y', 'duplicates collapsed');
    console.log('    ✅');

    // ── an entry emptied to []/[] is pruned ───────────────────────────────────
    console.log('  • emptied entry is pruned...');
    await setContextPrefs(ROOT, 'ch_1', { include: [], exclude: [] });
    assert((await readContextPrefs(ROOT))['ch_1'] === undefined, 'empty entry pruned');
    console.log('    ✅');

    // ── reset:true clears only the target ─────────────────────────────────────
    console.log('  • reset:true clears the target entry only...');
    await setContextPrefs(ROOT, 'pl_2', { exclude: ['rf_q'] });
    await setContextPrefs(ROOT, 'ch_3', { include: ['rf_w'] });
    await setContextPrefs(ROOT, 'pl_2', { reset: true });
    const all = await readContextPrefs(ROOT);
    assert(all['pl_2'] === undefined, 'pl_2 cleared');
    assert(all['ch_3'] !== undefined, 'ch_3 untouched by reset of pl_2');
    console.log('    ✅');

    // ── malformed JSON repairs on read, overwritten on next write ─────────────
    console.log('  • malformed JSON repairs...');
    await fs.writeFile(PREFS, '{ this is not json', 'utf8');
    assert(Object.keys(await readContextPrefs(ROOT)).length === 0, 'malformed reads as {}');
    await setContextPrefs(ROOT, 'ch_5', { exclude: ['rf_z'] });
    const repaired = await readContextPrefs(ROOT);
    assert(repaired['ch_5'] && repaired['ch_5'].exclude.join() === 'rf_z', 'write repairs the file');
    console.log('    ✅');

    // ── array/non-object root repairs to {} ───────────────────────────────────
    console.log('  • array/non-object root repairs to {}...');
    await fs.writeFile(PREFS, '[]', 'utf8');
    assert(Object.keys(await readContextPrefs(ROOT)).length === 0, 'array root → {}');
    console.log('    ✅');

    await fs.remove(ROOT);
    console.log('\n✅ context-prefs repository tests passed\n');
}

run().catch(e => { console.error('❌', e); process.exit(1); });
