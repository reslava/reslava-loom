/**
 * migrate-archive.ts
 *
 * Migrates old archive layouts to the canonical loom/.archive/ structure:
 *
 * 1. Flatten legacy category subdirs under loom/.archive/:
 *    loom/.archive/{cancelled|deferred|superseded}/*.md
 *    → loom/.archive/*.md
 *    (removes empty category dirs after move)
 *
 * 2. Move per-weave thread archives to the central location:
 *    loom/{weaveId}/.archive/{threadId}/
 *    → loom/.archive/{weaveId}/{threadId}/
 *    (removes empty per-weave .archive dirs after move)
 *
 * Usage:
 *   npx ts-node --project tests/tsconfig.json scripts/migrate-archive.ts [--dry-run] [--loom-root <path>]
 */

import { existsSync, promises as fsp } from 'fs';
import * as fse from 'fs-extra';
import * as path from 'path';

const LEGACY_CATEGORY_DIRS = ['cancelled', 'deferred', 'superseded'];

function parseArgs(): { dryRun: boolean; loomRoot: string } {
    const args = process.argv.slice(2);
    const dryRun = args.includes('--dry-run');
    const rootIdx = args.indexOf('--loom-root');
    const loomRoot = rootIdx !== -1 && args[rootIdx + 1]
        ? path.resolve(args[rootIdx + 1])
        : path.resolve(process.cwd());
    return { dryRun, loomRoot };
}

function log(dryRun: boolean, msg: string): void {
    const prefix = dryRun ? '[DRY-RUN] ' : '';
    console.log(prefix + msg);
}

async function move(src: string, dst: string, dryRun: boolean): Promise<void> {
    if (!dryRun) {
        await fse.ensureDir(path.dirname(dst));
        await fse.move(src, dst, { overwrite: false });
    }
}

async function flattenLegacyCategoryDirs(archiveDir: string, dryRun: boolean): Promise<number> {
    let moved = 0;
    for (const category of LEGACY_CATEGORY_DIRS) {
        const categoryDir = path.join(archiveDir, category);
        if (!existsSync(categoryDir)) continue;

        const stat = await fsp.stat(categoryDir);
        if (!stat.isDirectory()) continue;

        const entries = await fsp.readdir(categoryDir);
        for (const entry of entries) {
            const src = path.join(categoryDir, entry);
            const dst = path.join(archiveDir, entry);
            if (existsSync(dst)) {
                console.warn(`  SKIP (conflict): ${src} → ${dst} (destination already exists)`);
                continue;
            }
            log(dryRun, `  ${src} → ${dst}`);
            await move(src, dst, dryRun);
            moved++;
        }

        // Remove dir if now empty
        const remaining = dryRun ? entries : await fsp.readdir(categoryDir);
        if (remaining.length === 0) {
            log(dryRun, `  rmdir ${categoryDir}`);
            if (!dryRun) await fsp.rmdir(categoryDir);
        }
    }
    return moved;
}

async function isRealThread(dirPath: string, dirName: string): Promise<boolean> {
    // A real thread has {name}-idea.md, {name}-design.md, or a non-empty plans/ subdir
    if (existsSync(path.join(dirPath, `${dirName}-idea.md`))) return true;
    if (existsSync(path.join(dirPath, `${dirName}-design.md`))) return true;
    const plansDir = path.join(dirPath, 'plans');
    if (existsSync(plansDir)) {
        const plans = await fsp.readdir(plansDir).catch(() => [] as string[]);
        if (plans.some(f => f.endsWith('.md'))) return true;
    }
    return false;
}

async function migratePerWeaveArchives(loomDir: string, archiveDir: string, dryRun: boolean): Promise<number> {
    let moved = 0;
    const weaveEntries = await fsp.readdir(loomDir).catch(() => [] as string[]);

    for (const weaveId of weaveEntries) {
        if (weaveId === '.archive' || weaveId.startsWith('.')) continue;
        const weavePath = path.join(loomDir, weaveId);
        const stat = await fsp.stat(weavePath).catch(() => null);
        if (!stat?.isDirectory()) continue;

        const perWeaveArchive = path.join(weavePath, '.archive');
        if (!existsSync(perWeaveArchive)) continue;

        const entries = await fsp.readdir(perWeaveArchive).catch(() => [] as string[]);
        for (const entry of entries) {
            const src = path.join(perWeaveArchive, entry);
            const entryStat = await fsp.stat(src).catch(() => null);
            if (!entryStat?.isDirectory()) continue;

            if (await isRealThread(src, entry)) {
                // Proper thread dir → move to loom/.archive/{weaveId}/{threadId}/
                const dst = path.join(archiveDir, weaveId, entry);
                if (existsSync(dst)) {
                    console.warn(`  SKIP (conflict): ${src} → ${dst} (destination already exists)`);
                    continue;
                }
                log(dryRun, `  ${src} → ${dst} (thread)`);
                await move(src, dst, dryRun);
                moved++;
            } else {
                // Category dir (e.g. superseded/) → flatten files to loom/.archive/
                const files = await fsp.readdir(src).catch(() => [] as string[]);
                for (const f of files) {
                    if (!f.endsWith('.md')) continue;
                    const fsrc = path.join(src, f);
                    const fdst = path.join(archiveDir, f);
                    if (existsSync(fdst)) {
                        console.warn(`  SKIP (conflict): ${fsrc} → ${fdst}`);
                        continue;
                    }
                    log(dryRun, `  ${fsrc} → ${fdst} (flattened from category)`);
                    await move(fsrc, fdst, dryRun);
                    moved++;
                }
                // Remove empty category dir
                const remaining = dryRun ? files : await fsp.readdir(src).catch(() => [] as string[]);
                if (remaining.length === 0) {
                    log(dryRun, `  rmdir ${src}`);
                    if (!dryRun) await fsp.rmdir(src);
                }
            }
        }

        // Clean up empty per-weave .archive dir
        const remaining = dryRun ? entries : await fsp.readdir(perWeaveArchive).catch(() => [] as string[]);
        if (remaining.length === 0) {
            log(dryRun, `  rmdir ${perWeaveArchive}`);
            if (!dryRun) await fsp.rmdir(perWeaveArchive);
        }
    }
    return moved;
}

async function main(): Promise<void> {
    const { dryRun, loomRoot } = parseArgs();
    const loomDir = path.join(loomRoot, 'loom');
    const archiveDir = path.join(loomDir, '.archive');

    console.log(`Loom root: ${loomRoot}`);
    console.log(`Archive:   ${archiveDir}`);
    if (dryRun) console.log('Mode: DRY RUN — no files will be moved\n');
    else console.log('Mode: APPLY\n');

    if (!existsSync(loomDir)) {
        console.error(`ERROR: loom dir not found at ${loomDir}`);
        process.exit(1);
    }

    if (!existsSync(archiveDir)) {
        log(dryRun, `Creating archive dir: ${archiveDir}`);
        if (!dryRun) await fse.ensureDir(archiveDir);
    }

    console.log('=== Step 1: Flatten legacy category subdirs ===');
    const flatMoved = await flattenLegacyCategoryDirs(archiveDir, dryRun);
    console.log(`  ${flatMoved} file(s) moved\n`);

    console.log('=== Step 2: Migrate per-weave thread archives ===');
    const weaveMoved = await migratePerWeaveArchives(loomDir, archiveDir, dryRun);
    console.log(`  ${weaveMoved} thread dir(s) moved\n`);

    const total = flatMoved + weaveMoved;
    console.log(`=== Done: ${total} item(s) ${dryRun ? 'would be ' : ''}migrated ===`);
}

main().catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
});
