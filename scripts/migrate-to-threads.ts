#!/usr/bin/env ts-node
/**
 * scripts/migrate-to-threads.ts
 *
 * Migrates loom's flat per-weave layout to the Weave/Thread graph layout.
 *
 * Usage:
 *   npx ts-node --project tests/tsconfig.json scripts/migrate-to-threads.ts [loomRoot] [--dry-run]
 *
 * Default loomRoot: repository root (resolved from script location)
 * --dry-run: print proposed moves without touching the filesystem
 *
 * Algorithm per weave:
 *   1. Collect all flat .md docs (root + plans/ + done/)
 *   2. Skip already-threaded subdirs (any non-reserved dir = existing thread)
 *   3. Group docs by parent_id chain: each design → thread; ideas w/o design → idea-rooted thread
 *   4. Classify each thread AUTO (clean chain) or REVIEW (ambiguity / cross-thread refs)
 *   5. Print dry-run report or execute moves
 */

import fs from 'fs-extra';
import path from 'path';
import matter from 'gray-matter';

const DRY_RUN = process.argv.includes('--dry-run');
const loomRoot = (() => {
  const arg = process.argv.slice(2).find(a => !a.startsWith('-'));
  return arg ? path.resolve(arg) : path.resolve(__dirname, '..');
})();
const weavesDir = path.join(loomRoot, 'weaves');

const RESERVED_SUBDIRS = new Set([
  'plans', 'done', 'ai-chats', 'chats', 'ctx', 'references', '_archive',
]);

// ─── Types ───────────────────────────────────────────────────────────────────

interface FlatDoc {
  id: string;
  type: string;
  parentId: string | null;
  relPath: string;       // relative to weavePath, e.g. "core-engine-design.md" or "plans/foo.md"
  section: 'root' | 'plans' | 'done';
}

interface MoveOp {
  from: string;          // relative to weavePath
  to: string;            // relative to weavePath
}

interface ThreadResult {
  threadId: string;
  moves: MoveOp[];
  classification: 'AUTO' | 'REVIEW';
  reviewNote: string;
}

interface WeaveReport {
  weaveId: string;
  threads: ThreadResult[];
  looseFibers: FlatDoc[];
  alreadyMigrated: string[];
  skipped: string[];
}

// ─── Collect flat docs from one weave ────────────────────────────────────────

async function collectFlatDocs(weavePath: string): Promise<{
  docs: FlatDoc[];
  skipped: string[];
  alreadyMigrated: string[];
}> {
  const docs: FlatDoc[] = [];
  const skipped: string[] = [];
  const alreadyMigrated: string[] = [];

  async function parseFile(absPath: string, section: 'root' | 'plans' | 'done'): Promise<void> {
    const relPath = path.relative(weavePath, absPath).replace(/\\/g, '/');
    try {
      const raw = await fs.readFile(absPath, 'utf8');
      const { data } = matter(raw);
      if (!data.type || !data.id) {
        skipped.push(relPath);
        return;
      }
      docs.push({
        id: String(data.id),
        type: String(data.type),
        parentId: data.parent_id ? String(data.parent_id) : null,
        relPath,
        section,
      });
    } catch {
      skipped.push(relPath);
    }
  }

  const entries = await fs.readdir(weavePath, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (!RESERVED_SUBDIRS.has(entry.name)) {
        alreadyMigrated.push(entry.name);
      }
      continue;
    }
    if (entry.isFile() && entry.name.endsWith('.md')) {
      await parseFile(path.join(weavePath, entry.name), 'root');
    }
  }

  const plansDir = path.join(weavePath, 'plans');
  if (await fs.pathExists(plansDir)) {
    for (const f of (await fs.readdir(plansDir)).filter(f => f.endsWith('.md'))) {
      await parseFile(path.join(plansDir, f), 'plans');
    }
  }

  const doneDir = path.join(weavePath, 'done');
  if (await fs.pathExists(doneDir)) {
    for (const f of (await fs.readdir(doneDir)).filter(f => f.endsWith('.md'))) {
      await parseFile(path.join(doneDir, f), 'done');
    }
  }

  return { docs, skipped, alreadyMigrated };
}

// ─── Destination path within thread ──────────────────────────────────────────

function destPath(doc: FlatDoc, threadId: string): string {
  const fileName = doc.relPath.split('/').pop()!;
  if (doc.type === 'plan') {
    return doc.section === 'done'
      ? `${threadId}/done/${fileName}`
      : `${threadId}/plans/${fileName}`;
  }
  // idea, design, reference, ctx → thread root
  return `${threadId}/${fileName}`;
}

// ─── Build thread groups from flat docs ──────────────────────────────────────

function buildThreads(docs: FlatDoc[], weavePath: string): {
  threads: ThreadResult[];
  looseFibers: FlatDoc[];
} {
  const docById = new Map(docs.map(d => [d.id, d]));
  const assigned = new Set<string>();
  const threads: ThreadResult[] = [];

  // Phase A: design-rooted threads
  for (const design of docs.filter(d => d.type === 'design')) {
    const threadId = design.id.replace(/-(design|idea).*$/, '');
    const moves: MoveOp[] = [];
    const notes: string[] = [];

    moves.push({ from: design.relPath, to: destPath(design, threadId) });
    assigned.add(design.id);

    // Include parent idea if it lives in this weave
    if (design.parentId && docById.has(design.parentId)) {
      const parentDoc = docById.get(design.parentId)!;
      if (parentDoc.type === 'idea') {
        if (assigned.has(parentDoc.id)) {
          notes.push(`idea ${parentDoc.id} already claimed by another thread`);
        } else {
          moves.push({ from: parentDoc.relPath, to: destPath(parentDoc, threadId) });
          assigned.add(parentDoc.id);
          // Flag cross-thread parent_id on the idea itself
          if (parentDoc.parentId && docById.has(parentDoc.parentId)) {
            notes.push(`${parentDoc.id}.parent_id → ${parentDoc.parentId} is cross-thread after migration (set to null)`);
          }
        }
      }
    }

    // Plans whose parent is this design
    for (const plan of docs.filter(d => d.type === 'plan' && d.parentId === design.id)) {
      if (assigned.has(plan.id)) {
        notes.push(`plan ${plan.id} already assigned`);
        continue;
      }
      moves.push({ from: plan.relPath, to: destPath(plan, threadId) });
      assigned.add(plan.id);
    }

    threads.push({
      threadId,
      moves,
      classification: notes.length ? 'REVIEW' : 'AUTO',
      reviewNote: notes.join('; '),
    });
  }

  // Phase B: idea-rooted threads (ideas not yet assigned, no design child)
  for (const idea of docs.filter(d => d.type === 'idea' && !assigned.has(d.id))) {
    const hasDesignChild = docs.some(d => d.type === 'design' && d.parentId === idea.id);
    const threadId = idea.id.replace(/-(design|idea).*$/, '');
    const notes: string[] = [];

    if (hasDesignChild) {
      // Design wasn't processed yet (shouldn't happen if we process designs first)
      notes.push(`idea ${idea.id} has unassigned design child`);
      threads.push({ threadId, moves: [], classification: 'REVIEW', reviewNote: notes.join('; ') });
      continue;
    }

    const moves: MoveOp[] = [];
    moves.push({ from: idea.relPath, to: destPath(idea, threadId) });
    assigned.add(idea.id);

    for (const plan of docs.filter(d => d.type === 'plan' && d.parentId === idea.id)) {
      moves.push({ from: plan.relPath, to: destPath(plan, threadId) });
      assigned.add(plan.id);
    }

    if (idea.parentId && docById.has(idea.parentId)) {
      notes.push(`${idea.id}.parent_id → ${idea.parentId} is cross-thread after migration (set to null)`);
    }

    threads.push({
      threadId,
      moves,
      classification: notes.length ? 'REVIEW' : 'AUTO',
      reviewNote: notes.join('; '),
    });
  }

  // Remaining unassigned = loose fibers (references, orphan plans, etc.)
  const looseFibers = docs.filter(d => !assigned.has(d.id));

  return { threads, looseFibers };
}

// ─── Execute moves ────────────────────────────────────────────────────────────

async function executeMoves(weavePath: string, moves: MoveOp[]): Promise<void> {
  for (const { from, to } of moves) {
    const src = path.join(weavePath, from);
    const dst = path.join(weavePath, to);
    await fs.ensureDir(path.dirname(dst));
    await fs.move(src, dst, { overwrite: false });
  }
}

// ─── Print report ─────────────────────────────────────────────────────────────

function printReport(report: WeaveReport): void {
  const sep = '═'.repeat(50);
  console.log(`\n${sep}`);
  console.log(`  weave: ${report.weaveId}`);
  console.log(sep);

  if (report.alreadyMigrated.length) {
    console.log(`\n  Already threaded (skipped): ${report.alreadyMigrated.join(', ')}`);
  }

  const auto = report.threads.filter(t => t.classification === 'AUTO');
  const review = report.threads.filter(t => t.classification === 'REVIEW');

  if (auto.length) {
    console.log(`\n  AUTO — ${auto.length} thread(s):`);
    for (const t of auto) {
      console.log(`\n    Thread: ${t.threadId}  (${t.moves.length} docs)`);
      for (const m of t.moves) {
        console.log(`      ${m.from.padEnd(60)} → ${m.to}`);
      }
    }
  }

  if (review.length) {
    console.log(`\n  REVIEW — ${review.length} thread(s) need attention:`);
    for (const t of review) {
      console.log(`\n    Thread: ${t.threadId}  ⚠️  ${t.reviewNote}`);
      for (const m of t.moves) {
        console.log(`      ${m.from.padEnd(60)} → ${m.to}`);
      }
    }
  }

  if (report.looseFibers.length) {
    console.log(`\n  LOOSE — ${report.looseFibers.length} doc(s) stay at weave root:`);
    for (const d of report.looseFibers) {
      console.log(`      ${d.relPath}  [${d.type}]`);
    }
  }

  if (report.skipped.length) {
    console.log(`\n  SKIPPED — no parseable frontmatter:`);
    for (const s of report.skipped) {
      console.log(`      ${s}`);
    }
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log(`\n🧵 migrate-to-threads  root=${loomRoot}  ${DRY_RUN ? '[DRY RUN]' : '[EXECUTE]'}\n`);

  if (!await fs.pathExists(weavesDir)) {
    console.error(`❌ weaves/ directory not found at ${weavesDir}`);
    process.exit(1);
  }

  const weaveDirs = (await fs.readdir(weavesDir, { withFileTypes: true }))
    .filter(e => e.isDirectory() && !e.name.startsWith('_') && !e.name.startsWith('.'))
    .map(e => e.name);

  const reports: WeaveReport[] = [];

  for (const weaveId of weaveDirs) {
    const weavePath = path.join(weavesDir, weaveId);
    const { docs, skipped, alreadyMigrated } = await collectFlatDocs(weavePath);
    const { threads, looseFibers } = buildThreads(docs, weavePath);

    const report: WeaveReport = { weaveId, threads, looseFibers, alreadyMigrated, skipped };
    reports.push(report);
    printReport(report);

    if (!DRY_RUN) {
      for (const t of threads) {
        await executeMoves(weavePath, t.moves);
      }
      const reviewCount = threads.filter(t => t.classification === 'REVIEW').length;
      const autoCount = threads.filter(t => t.classification === 'AUTO').length;
      console.log(`\n  ✅ Executed: ${autoCount} AUTO thread(s) migrated`);
      if (reviewCount) {
        console.log(`  ⚠️  ${reviewCount} REVIEW thread(s) also executed — fix flagged parent_ids manually`);
      }
    }
  }

  // Summary
  const totalAuto = reports.flatMap(r => r.threads).filter(t => t.classification === 'AUTO').length;
  const totalReview = reports.flatMap(r => r.threads).filter(t => t.classification === 'REVIEW').length;
  const totalLoose = reports.reduce((n, r) => n + r.looseFibers.length, 0);

  console.log(`\n${'─'.repeat(50)}`);
  console.log(`  Summary:`);
  console.log(`    AUTO:   ${totalAuto} threads`);
  console.log(`    REVIEW: ${totalReview} threads`);
  console.log(`    LOOSE:  ${totalLoose} docs`);
  if (DRY_RUN) {
    console.log(`\n  Dry run complete — no files were moved.`);
    console.log(`  Resolve REVIEW items, then run without --dry-run to execute.`);
  }
  console.log('');
}

main().catch(e => { console.error(e); process.exit(1); });
