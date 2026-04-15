import * as path from 'path';
import { setupTestLoom, cleanupTestLoom, runLoom, assert } from './test-utils';

async function testMultiLoom() {
    console.log('🧵 Running multi‑loom tests...\n');

    // Generate unique names to avoid registry conflicts
    const timestamp = Date.now();
    const testLoomName = `test-loom-${timestamp}`;

    // 1. Setup a clean test environment
    const testLoomPath = await setupTestLoom('multi-loom-suite');
    process.chdir(testLoomPath);

    // 2. Initialize the default loom
    console.log('  • Testing `loom init`...');
    let result = runLoom('init --force');
    assert(result.exitCode === 0, `loom init failed: ${result.stderr}`);
    assert(result.stdout.includes('Loom initialized'), 'Missing success message');
    console.log('    ✅ loom init works');

    // 3. Create a second loom with unique name
    console.log(`  • Testing \`loom setup ${testLoomName}\`...`);
    result = runLoom(`setup ${testLoomName}`);
    assert(result.exitCode === 0, `loom setup failed: ${result.stderr}`);
    assert(result.stdout.includes('created and activated'), 'Missing activation message');
    console.log('    ✅ loom setup works');

    // 4. Switch back to default
    console.log('  • Testing `loom switch default`...');
    result = runLoom('switch default');
    assert(result.exitCode === 0, `loom switch failed: ${result.stderr}`);
    assert(result.stdout.includes('Switched to loom'), 'Missing switch message');
    console.log('    ✅ loom switch works');

    // 5. List looms and verify both are present
    console.log('  • Testing `loom list`...');
    result = runLoom('list');
    assert(result.exitCode === 0, `loom list failed: ${result.stderr}`);
    assert(result.stdout.includes('default'), 'default loom missing from list');
    assert(result.stdout.includes(testLoomName), `${testLoomName} missing from list`);
    assert(result.stdout.includes('★'), 'Active loom indicator missing');
    console.log('    ✅ loom list works');

    // 6. Check current loom
    console.log('  • Testing `loom current`...');
    result = runLoom('current');
    assert(result.exitCode === 0, `loom current failed: ${result.stderr}`);
    assert(result.stdout.includes('default'), 'Current loom not reported correctly');
    console.log('    ✅ loom current works');

    // 7. Switch to a non‑existent loom (should fail)
    console.log('  • Testing `loom switch non-existent` (expected to fail)...');
    result = runLoom('switch does-not-exist');
    assert(result.exitCode !== 0, 'Should have failed for non‑existent loom');
    console.log('    ✅ Correctly rejected invalid switch');

    // 8. Clean up (ignore EBUSY errors on Windows)
    try {
        await cleanupTestLoom(testLoomPath);
    } catch (e: any) {
        if (e.code === 'EBUSY' || e.code === 'EPERM') {
            console.warn('    ⚠️ Cleanup locked (ignored)');
        } else {
            throw e;
        }
    }
    console.log('\n✨ All multi‑loom tests passed!\n');
}

// Run the tests
testMultiLoom().catch(err => {
    console.error('❌ Test suite failed:', err.message);
    process.exit(1);
});