import * as path from 'path';
import * as fs from 'fs-extra';
import * as fsNative from 'fs';
import * as os from 'os';
import { runLoom, assert } from './test-utils.ts';

async function testWeaveWorkflow() {
    console.log('🧵 Running weave workflow tests...\n');

    const globalLoomPath = path.join(os.homedir(), 'looms', 'default');
    const weavePath = path.join(globalLoomPath, 'loom', 'workflow-test');
    const threadPath = path.join(weavePath, 'workflow-test');

    await fs.remove(weavePath);
    await fs.ensureDir(weavePath);
    process.chdir(globalLoomPath);

    // ── test 1: weave idea — thread with ULID id ────────────────────────────
    console.log('  • Testing `loom weave idea` (thread)...');
    let result = runLoom('weave idea "Workflow Test" --weave workflow-test --thread workflow-test');
    assert(result.exitCode === 0, `weave idea failed: ${result.stderr}`);

    // IDs are now ULIDs: id_{26-char-ulid}
    const idMatch = result.stdout.match(/ID:\s*(id_[0-9A-Z]{26})/);
    assert(idMatch !== null, `ULID idea id not found in output. stdout: ${result.stdout}`);
    const ideaUlid = idMatch![1];
    console.log(`    ✅ Idea created with ULID: ${ideaUlid}`);

    // Filename is thread-named (inside thread subdir)
    const ideaPath = path.join(threadPath, 'workflow-test-idea.md');
    assert(fsNative.existsSync(ideaPath), `Idea file not at expected path: ${ideaPath}`);

    const ideaContent = fsNative.readFileSync(ideaPath, 'utf8');
    // id field in frontmatter should be a ULID
    assert(/^id:\s*id_[0-9A-Z]{26}/m.test(ideaContent), 'Idea frontmatter id is not a ULID');

    // ── test 2: weave design — parent_id is idea ULID ──────────────────────
    console.log('  • Testing `loom weave design` (parent = idea ULID)...');
    result = runLoom('weave design workflow-test --thread workflow-test');
    assert(result.exitCode === 0, `weave design failed: ${result.stderr}`);

    const designIdMatch = result.stdout.match(/ID:\s*(de_[0-9A-Z]{26})/);
    assert(designIdMatch !== null, `ULID design id not found in output. stdout: ${result.stdout}`);
    const designUlid = designIdMatch![1];
    console.log(`    ✅ Design created with ULID: ${designUlid}`);

    // Design parent_id should be the idea's ULID (not a slug string)
    const designFiles = fsNative.readdirSync(threadPath).filter(f => f.endsWith('-design.md'));
    assert(designFiles.length === 1, `Expected one design file, got: ${designFiles}`);
    const designContent = fsNative.readFileSync(path.join(threadPath, designFiles[0]), 'utf8');
    assert(
        designContent.includes(`parent_id: ${ideaUlid}`),
        `Design parent_id should be idea ULID ${ideaUlid}, got: ${designContent.match(/parent_id:.*/)?.[0]}`
    );

    // ── test 3: weave plan ──────────────────────────────────────────────────
    console.log('  • Testing `loom weave plan`...');
    result = runLoom('weave plan workflow-test --thread workflow-test');
    assert(result.exitCode === 0, `weave plan failed: ${result.stderr}`);

    const planIdMatch = result.stdout.match(/ID:\s*(pl_[0-9A-Z]{26})/);
    assert(planIdMatch !== null, `ULID plan id not found in output. stdout: ${result.stdout}`);
    console.log(`    ✅ Plan created with ULID: ${planIdMatch![1]}`);

    const plansDir = path.join(threadPath, 'plans');
    const planFiles = fsNative.readdirSync(plansDir).filter(f => f.endsWith('.md'));
    assert(planFiles.length === 1, `Expected one plan file, got: ${planFiles}`);

    const planContent = fsNative.readFileSync(path.join(plansDir, planFiles[0]), 'utf8');
    // Plan id in frontmatter should be a ULID
    assert(/^id:\s*pl_[0-9A-Z]{26}/m.test(planContent), 'Plan frontmatter id is not a ULID');
    // Plan filename follows convention: {scope}-plan-001.md
    assert(planFiles[0].match(/-plan-\d+\.md$/), `Plan filename doesn't follow convention: ${planFiles[0]}`);

    // ── test 4: status ──────────────────────────────────────────────────────
    console.log('  • Verifying weave status...');
    result = runLoom('status workflow-test --verbose');
    assert(result.exitCode === 0, `status failed: ${result.stderr}`);
    assert(result.stdout.includes('Status:  ACTIVE'), `Weave status should be ACTIVE. Got: ${result.stdout}`);
    assert(result.stdout.includes('Phase:   planning'), `Weave phase should be planning. Got: ${result.stdout}`);
    assert(result.stdout.includes('Threads: 1'), `Thread count not shown. Got: ${result.stdout}`);
    assert(result.stdout.includes('Plans:   1 (0 done)'), `Plan count not shown. Got: ${result.stdout}`);
    console.log('    ✅ Weave status verified');

    await fs.remove(weavePath);
    console.log('\n✨ All weave workflow tests passed!\n');
}

testWeaveWorkflow().catch(err => {
    console.error('❌ Test suite failed:', err.message);
    process.exit(1);
});
