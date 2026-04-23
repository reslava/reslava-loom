import * as path from 'path';
import * as fs from 'fs-extra';
import * as os from 'os';
import { assert } from './test-utils.ts';
import { loadWeave } from '../packages/fs/dist/index.js';

const TMP = path.join(os.tmpdir(), 'loom-repo-tests');

async function setupLoomRoot(loomRoot: string): Promise<void> {
    await fs.ensureDir(path.join(loomRoot, '.loom'));
    await fs.outputFile(path.join(loomRoot, '.loom', 'workflow.yml'), 'version: 1\n');
}

async function setupWeave(loomRoot: string, weaveId: string): Promise<string> {
    const weavePath = path.join(loomRoot, 'weaves', weaveId);
    await fs.ensureDir(path.join(weavePath, 'plans'));
    await fs.ensureDir(path.join(weavePath, 'done'));
    return weavePath;
}

async function writePlan(dir: string, id: string, status = 'implementing'): Promise<void> {
    await fs.outputFile(path.join(dir, `${id}.md`), `---
type: plan
id: ${id}
title: Plan ${id}
status: ${status}
created: 2026-04-23
version: 1
tags: []
parent_id: null
child_ids: []
requires_load: []
---

## Steps
| Done | # | Step | Files touched | Blocked by |
|------|---|------|---------------|------------|
| 🔳 | 1 | First step | src/ | — |
`);
}

async function writeDoneDoc(dir: string, id: string, parentId: string): Promise<void> {
    await fs.outputFile(path.join(dir, `${id}.md`), `---
type: done
id: ${id}
title: Done — ${parentId}
status: final
created: 2026-04-23
version: 1
tags: []
parent_id: ${parentId}
child_ids: []
requires_load: []
---

## What was built
Test done doc.
`);
}

async function testWeaveRepository() {
    console.log('📦 Running weaveRepository tests...\n');

    await fs.remove(TMP);
    const loomRoot = TMP;
    await setupLoomRoot(loomRoot);

    // ── test 1: load weave with done docs in done/ ──────────────────────────
    console.log('  • loadWeave: done docs in done/ populate weave.dones...');
    {
        const weaveId = 'repo-test-weave';
        const weavePath = await setupWeave(loomRoot, weaveId);

        await writePlan(path.join(weavePath, 'plans'), `${weaveId}-plan-001`);
        await writeDoneDoc(path.join(weavePath, 'done'), `${weaveId}-plan-001-done`, `${weaveId}-plan-001`);

        const weave = await loadWeave(loomRoot, weaveId);
        assert(weave !== null, 'loadWeave must return a weave');
        assert(weave.dones.length === 1, `Expected 1 done doc, got ${weave.dones.length}`);
        assert(weave.dones[0].type === 'done', 'done doc type must be "done"');
        assert(weave.dones[0].parent_id === `${weaveId}-plan-001`, 'done doc parent_id must link to plan');
        assert(weave.dones[0].status === 'final', 'done doc status must be "final"');
        console.log('    ✅ weave.dones populated correctly');
    }

    // ── test 2: moved plan (status:done in done/) appears in weave.plans ────
    console.log('  • loadWeave: moved plan in done/ appears in weave.plans...');
    {
        const weaveId = 'repo-test-weave2';
        const weavePath = await setupWeave(loomRoot, weaveId);

        // Active plan in plans/
        await writePlan(path.join(weavePath, 'plans'), `${weaveId}-plan-001`, 'implementing');
        // Completed plan moved to done/ (type is still 'plan')
        await writePlan(path.join(weavePath, 'done'), `${weaveId}-plan-002`, 'done');
        await writeDoneDoc(path.join(weavePath, 'done'), `${weaveId}-plan-002-done`, `${weaveId}-plan-002`);

        const weave = await loadWeave(loomRoot, weaveId);
        assert(weave !== null, 'loadWeave must return a weave');
        assert(weave.plans.length === 2, `Expected 2 plans (1 active + 1 moved), got ${weave.plans.length}`);
        assert(weave.dones.length === 1, `Expected 1 done doc, got ${weave.dones.length}`);

        const movedPlan = weave.plans.find((p: any) => p.id === `${weaveId}-plan-002`);
        assert(movedPlan !== undefined, 'moved plan must appear in weave.plans');
        assert(movedPlan.status === 'done', 'moved plan status must be "done"');
        console.log('    ✅ moved plan found in weave.plans');
    }

    // ── test 3: multiple done docs each link to their plan ──────────────────
    console.log('  • loadWeave: multiple done docs with correct parent links...');
    {
        const weaveId = 'repo-test-weave3';
        const weavePath = await setupWeave(loomRoot, weaveId);

        await writePlan(path.join(weavePath, 'done'), `${weaveId}-plan-001`, 'done');
        await writeDoneDoc(path.join(weavePath, 'done'), `${weaveId}-plan-001-done`, `${weaveId}-plan-001`);
        await writePlan(path.join(weavePath, 'done'), `${weaveId}-plan-002`, 'done');
        await writeDoneDoc(path.join(weavePath, 'done'), `${weaveId}-plan-002-done`, `${weaveId}-plan-002`);

        const weave = await loadWeave(loomRoot, weaveId);
        assert(weave.dones.length === 2, `Expected 2 done docs, got ${weave.dones.length}`);

        const ids = weave.dones.map((d: any) => d.parent_id).sort();
        assert(ids[0] === `${weaveId}-plan-001`, 'first done doc parent_id wrong');
        assert(ids[1] === `${weaveId}-plan-002`, 'second done doc parent_id wrong');
        console.log('    ✅ multiple done docs parent links correct');
    }

    await fs.remove(TMP);
    console.log('\n✨ All weaveRepository tests passed!\n');
}

testWeaveRepository().catch(err => {
    console.error('❌ weave-repository.test.ts failed:', err.message);
    process.exit(1);
});
