import * as path from 'path';
import * as fs from 'fs-extra';
import * as fsNative from 'fs';
import * as os from 'os';
import { runLoom, assert, createDesignDoc, createPlanDoc } from './test-utils.ts';
import { loadWeave, saveWeave } from '../packages/fs/dist/index.js';
import { completeStep } from '../packages/app/dist/completeStep.js';
import { runEvent } from '../packages/app/dist/runEvent.js';

async function testCommands() {
    console.log('🧵 Running CLI commands tests...\n');

    const globalLoomPath = path.join(os.homedir(), 'looms', 'default');
    
    const weavePath = path.join(globalLoomPath, 'weaves', 'example');
    await fs.remove(weavePath);
    
    console.log('  • Ensuring global loom exists...');
    let result = runLoom('init');
    
    await fs.ensureDir(weavePath);
    await createDesignDoc(weavePath, 'example', { role: 'primary', status: 'active' });
    console.log('    ✅ Test weave created');

    process.chdir(globalLoomPath);

    console.log('  • Testing `loom refine-design`...');
    result = runLoom('refine-design example');
    assert(result.exitCode === 0, `refine-design failed: ${result.stderr}`);
    assert(result.stdout.includes('REFINE_DESIGN'), 'Missing REFINE_DESIGN message');
    console.log('    ✅ loom refine-design works');

    console.log('  • Testing `loom summarise-context`...');
    result = runLoom('summarise-context example');
    if (result.stderr.includes('No AI client configured')) {
        console.log('    ⚠️  summarise-context skipped — no API key configured');
    } else {
        assert(result.exitCode === 0, `summarise-context failed: ${result.stderr}`);
        const ctxPath = path.join(weavePath, 'example-ctx.md');
        assert(fsNative.existsSync(ctxPath), 'Context summary not created');
        const ctxContent = fsNative.readFileSync(ctxPath, 'utf8');
        assert(ctxContent.includes('tags: [ctx, summary]'), 'Inline arrays not used');
        console.log('    ✅ loom summarise-context works');
    }

    console.log('  • Creating test plan...');
    const plansDir = path.join(weavePath, 'plans');
    await fs.ensureDir(plansDir);
    const planPath = path.join(plansDir, 'example-plan-001.md');
    const planContent = `---
type: plan
id: example-plan-001
title: Test Plan
status: draft
created: 2026-04-15
version: 1
design_version: 2
tags: []
parent_id: example-design
target_version: 1.0.0
requires_load: []
---

# Goal
Test plan.

# Steps
| Done | # | Step | Files touched | Blocked by |
|---|---|---|---|---|
| 🔳 | 1 | First step | src/ | — |
| 🔳 | 2 | Second step | src/ | Step 1 |
`;
    await fs.outputFile(planPath, planContent);
    console.log('    ✅ Test plan created');

    console.log('  • Testing `loom start-plan`...');
    result = runLoom('start-plan example-plan-001');
    assert(result.exitCode === 0, `start-plan failed: ${result.stderr}`);
    console.log('    ✅ loom start-plan works');

    console.log('  • Testing `loom complete-step`...');
    result = runLoom('complete-step example-plan-001 --step 1');
    assert(result.exitCode === 0, `complete-step failed: ${result.stderr}`);
    console.log('    ✅ loom complete-step works');

    result = runLoom('status example --verbose');
    assert(result.stdout.includes('1/2 steps'), 'Step progress not updated');
    console.log('    ✅ Plan progress tracked correctly');

    await fs.remove(weavePath);
    console.log('\n✨ All CLI commands tests passed!\n');
}

async function testCompleteStepUseCase() {
    console.log('\n🧩 Running completeStep use-case tests...\n');

    const loomRoot = path.join(os.tmpdir(), 'loom-complete-step-tests');
    await fs.remove(loomRoot);
    await fs.ensureDir(path.join(loomRoot, '.loom'));
    await fs.outputFile(path.join(loomRoot, '.loom', 'workflow.yml'), 'version: 1\n');

    const weaveId = 'cs-weave';
    const weavePath = path.join(loomRoot, 'weaves', weaveId);
    await fs.ensureDir(path.join(weavePath, 'plans'));

    const planId = `${weaveId}-plan-001`;
    await createPlanDoc(weavePath, planId, { status: 'implementing' });

    const loadWeaveOrThrow = async (root: string, id: string) => {
        const w = await loadWeave(root, id);
        if (!w) throw new Error(`Weave '${id}' is empty`);
        return w;
    };
    const runEventBound = (wid: string, evt: any) =>
        runEvent(wid, evt, { loadWeave: loadWeaveOrThrow, saveWeave, loomRoot });

    const deps = { loadWeave: loadWeaveOrThrow, runEvent: runEventBound, loomRoot };

    console.log('  • completeStep: mark step 1 done...');
    const r1 = await completeStep({ planId, step: 1 }, deps);
    assert(r1.plan.steps[0].done === true, 'step 1 must be marked done');
    assert(r1.autoCompleted === false, 'should not auto-complete with step 2 remaining');
    assert(r1.plan.status === 'implementing', 'status must remain implementing');
    console.log('    ✅ step 1 marked done, status still implementing');

    console.log('  • completeStep: mark last step done — plan auto-completes...');
    const r2 = await completeStep({ planId, step: 2 }, deps);
    assert(r2.plan.steps[1].done === true, 'step 2 must be marked done');
    assert(r2.autoCompleted === true, 'plan must auto-complete');
    assert(r2.plan.status === 'done', 'plan status must be done');
    console.log('    ✅ step 2 done — plan auto-completed');

    console.log('  • completeStep: already-done step throws...');
    let threw = false;
    try {
        await completeStep({ planId, step: 1 }, deps);
    } catch {
        threw = true;
    }
    assert(threw, 'completing an already-done step must throw');
    console.log('    ✅ already-done step throws correctly');

    await fs.remove(loomRoot);
    console.log('\n✨ All completeStep use-case tests passed!\n');
}

async function runAll() {
    await testCommands();
    await testCompleteStepUseCase();
}

runAll().catch(err => {
    console.error('❌ Test suite failed:', err.message);
    process.exit(1);
});