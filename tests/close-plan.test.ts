import * as path from 'path';
import * as fs from 'fs-extra';
import * as fsNative from 'fs';
import * as os from 'os';
import { assert, mockAIClient, createPlanDoc } from './test-utils.ts';
import { loadWeave, saveDoc } from '../packages/fs/dist/index.js';
import { closePlan } from '../packages/app/dist/closePlan.js';

const TMP = path.join(os.tmpdir(), 'loom-close-plan-tests');

async function makeLoomRoot(): Promise<string> {
    const loomRoot = TMP;
    await fs.remove(loomRoot);
    await fs.ensureDir(path.join(loomRoot, '.loom'));
    await fs.outputFile(path.join(loomRoot, '.loom', 'workflow.yml'), 'version: 1\n');
    return loomRoot;
}

function makeDeps(loomRoot: string, aiResponse = '## What was built\nTest output.') {
    const loadWeaveOrThrow = async (root: string, id: string) => {
        const w = await loadWeave(root, id);
        if (!w) throw new Error(`Weave '${id}' is empty`);
        return w;
    };
    return {
        loadWeave: loadWeaveOrThrow,
        saveDoc,
        fs,
        aiClient: mockAIClient(aiResponse),
        loomRoot,
    };
}

async function testClosePlan() {
    console.log('📦 Running closePlan use-case tests...\n');

    // ── test 1: done doc written + plan moved + original deleted ─────────────
    console.log('  • closePlan: done doc created, plan moved, original deleted...');
    {
        const loomRoot = await makeLoomRoot();
        const weaveId = 'cp-weave';
        const weavePath = path.join(loomRoot, 'weaves', weaveId);
        const planId = `${weaveId}-plan-001`;

        await createPlanDoc(weavePath, planId, { status: 'implementing' });

        const AI_BODY = '## What was built\nBuilt the thing.\n\n## Decisions made\n- Used approach A\n\n## Open items\n- Review B';
        const result = await closePlan({ planId }, makeDeps(loomRoot, AI_BODY));

        // done doc exists at done/{planId}-done.md
        const donePath = path.join(weavePath, 'done', `${planId}-done.md`);
        assert(await fs.pathExists(donePath), `done doc must exist at ${donePath}`);
        const doneContent = fsNative.readFileSync(donePath, 'utf8');
        assert(doneContent.includes('type: done'), 'done doc must have type: done');
        assert(doneContent.includes('status: final'), 'done doc must have status: final');
        assert(doneContent.includes(`parent_id: ${planId}`), 'done doc must link to plan');
        assert(doneContent.includes('Built the thing.'), 'done doc must include AI body');
        console.log('    ✅ done doc written correctly');

        // plan moved to done/{planId}.md with status: done
        const movedPlanPath = path.join(weavePath, 'done', `${planId}.md`);
        assert(await fs.pathExists(movedPlanPath), `plan must be moved to ${movedPlanPath}`);
        const movedContent = fsNative.readFileSync(movedPlanPath, 'utf8');
        assert(movedContent.includes('status: done'), 'moved plan must have status: done');
        console.log('    ✅ plan moved to done/ with status: done');

        // original plans/{planId}.md deleted
        const originalPath = path.join(weavePath, 'plans', `${planId}.md`);
        assert(!(await fs.pathExists(originalPath)), 'original plan file must be deleted');
        console.log('    ✅ original plan file deleted');

        assert(result.planId === planId, 'result.planId must match');
        assert(result.donePath === donePath, 'result.donePath must match');
    }

    // ── test 2: already-done plan (auto-completed) skips FINISH_PLAN ─────────
    console.log('  • closePlan: auto-completed plan (status:done) closes without error...');
    {
        const loomRoot = await makeLoomRoot();
        const weaveId = 'cp-weave2';
        const weavePath = path.join(loomRoot, 'weaves', weaveId);
        const planId = `${weaveId}-plan-001`;

        await createPlanDoc(weavePath, planId, {
            status: 'done',
            steps: [{ order: 1, description: 'Done step', done: true }],
        });

        await closePlan({ planId }, makeDeps(loomRoot));

        const donePath = path.join(weavePath, 'done', `${planId}-done.md`);
        assert(await fs.pathExists(donePath), 'done doc must exist for auto-completed plan');
        const movedPlanPath = path.join(weavePath, 'done', `${planId}.md`);
        assert(await fs.pathExists(movedPlanPath), 'plan must be moved');
        console.log('    ✅ auto-completed plan closes without error');
    }

    // ── test 3: unknown plan throws ──────────────────────────────────────────
    console.log('  • closePlan: unknown planId throws...');
    {
        const loomRoot = await makeLoomRoot();
        const weaveId = 'cp-weave3';
        const weavePath = path.join(loomRoot, 'weaves', weaveId);
        await fs.ensureDir(path.join(weavePath, 'plans'));
        // write a dummy file so weave is not empty
        await fs.outputFile(path.join(weavePath, `${weaveId}-design.md`), `---
type: design
id: ${weaveId}-design
title: Design
status: active
created: 2026-04-23
version: 1
tags: []
parent_id: null
child_ids: []
requires_load: []
---
`);
        let threw = false;
        try {
            await closePlan({ planId: `${weaveId}-plan-999` }, makeDeps(loomRoot));
        } catch {
            threw = true;
        }
        assert(threw, 'closePlan with unknown plan must throw');
        console.log('    ✅ unknown planId throws correctly');
    }

    // ── test 4: user notes are included in AI message ─────────────────────────
    console.log('  • closePlan: user notes passed to AI...');
    {
        const loomRoot = await makeLoomRoot();
        const weaveId = 'cp-weave4';
        const weavePath = path.join(loomRoot, 'weaves', weaveId);
        const planId = `${weaveId}-plan-001`;
        await createPlanDoc(weavePath, planId, { status: 'implementing' });

        let capturedMessages: any[] = [];
        const capturingDeps = {
            ...makeDeps(loomRoot),
            aiClient: {
                complete: async (msgs: any[]) => {
                    capturedMessages = msgs;
                    return '## What was built\nCapture test.';
                },
            },
        };

        await closePlan({ planId, notes: 'Important note from Rafa' }, capturingDeps);
        const userMsg = capturedMessages.find((m: any) => m.role === 'user')?.content ?? '';
        assert(userMsg.includes('Important note from Rafa'), 'user notes must appear in AI message');
        console.log('    ✅ user notes forwarded to AI');
    }

    await fs.remove(TMP);
    console.log('\n✨ All closePlan use-case tests passed!\n');
}

testClosePlan().catch(err => {
    console.error('❌ close-plan.test.ts failed:', err.message);
    process.exit(1);
});
