import * as path from 'path';
import * as fs from 'fs-extra';
import * as os from 'os';
import { runLoom, assert, createDesignDoc } from './test-utils';

async function testCommands() {
    console.log('🧵 Running CLI commands tests...\n');

    // Use the global default loom directly instead of a temp directory
    const globalLoomPath = path.join(os.homedir(), 'looms', 'default');
    
    // Ensure clean state by removing existing example thread if present
    const threadPath = path.join(globalLoomPath, 'threads', 'example');
    await fs.remove(threadPath);
    
    // Initialize the global loom (idempotent)
    console.log('  • Ensuring global loom exists...');
    let result = runLoom('init');
    // init may exit with non-zero if already exists, that's fine
    
    // Create a test thread
    await fs.ensureDir(threadPath);
    await createDesignDoc(threadPath, 'example', { role: 'primary', status: 'active' });
    console.log('    ✅ Test thread created');

    // Run commands from the global loom directory so paths resolve correctly
    process.chdir(globalLoomPath);

    // Test refine-design
    console.log('  • Testing `loom refine-design`...');
    result = runLoom('refine-design example');
    assert(result.exitCode === 0, `refine-design failed: ${result.stderr}`);
    assert(result.stdout.includes('REFINE_DESIGN'), 'Missing REFINE_DESIGN message');
    console.log('    ✅ loom refine-design works');

    // Test summarise-context
    console.log('  • Testing `loom summarise-context`...');
    result = runLoom('summarise-context example');
    assert(result.exitCode === 0, `summarise-context failed: ${result.stderr}`);
    const ctxPath = path.join(threadPath, 'example-ctx.md');
    assert(fs.existsSync(ctxPath), 'Context summary not created');
    const ctxContent = fs.readFileSync(ctxPath, 'utf8');
    assert(ctxContent.includes('tags: [ctx, summary]'), 'Inline arrays not used');
    console.log('    ✅ loom summarise-context works');

    // Create a plan
    console.log('  • Creating test plan...');
    const plansDir = path.join(threadPath, 'plans');
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
    await fs.writeFile(planPath, planContent);
    console.log('    ✅ Test plan created');

    // Test start-plan
    console.log('  • Testing `loom start-plan`...');
    result = runLoom('start-plan example-plan-001');
    assert(result.exitCode === 0, `start-plan failed: ${result.stderr}`);
    console.log('    ✅ loom start-plan works');

    // Test complete-step
    console.log('  • Testing `loom complete-step`...');
    result = runLoom('complete-step example-plan-001 --step 1');
    assert(result.exitCode === 0, `complete-step failed: ${result.stderr}`);
    console.log('    ✅ loom complete-step works');

    // Verify plan progress
    result = runLoom('status example --verbose');
    assert(result.stdout.includes('1/2 steps'), 'Step progress not updated');
    console.log('    ✅ Plan progress tracked correctly');

    // Clean up the test thread
    await fs.remove(threadPath);
    console.log('\n✨ All CLI commands tests passed!\n');
}

testCommands().catch(err => {
    console.error('❌ Test suite failed:', err.message);
    process.exit(1);
});