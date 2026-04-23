import { assert } from './test-utils.ts';
import { serializeFrontmatter } from '../packages/core/dist/index.js';

async function testDoneDocEntity() {
    console.log('📄 Running DoneDoc entity tests...\n');

    // DoneDoc shape
    const done = {
        type: 'done' as const,
        id: 'my-weave-plan-001-done',
        title: 'Done — My Plan',
        status: 'final' as const,
        created: '2026-04-23',
        version: 1,
        tags: [],
        parent_id: 'my-weave-plan-001',
        child_ids: [],
        requires_load: [],
        content: '## What was built\nTest.',
    };

    console.log('  • type is "done"...');
    assert(done.type === 'done', 'type must be "done"');
    console.log('    ✅ type: done');

    console.log('  • status is "final"...');
    assert(done.status === 'final', 'status must be "final"');
    console.log('    ✅ status: final');

    console.log('  • parent_id links to plan...');
    assert(done.parent_id === 'my-weave-plan-001', 'parent_id must link to the plan');
    console.log('    ✅ parent_id set correctly');

    console.log('  • serializeFrontmatter output...');
    const { content: _content, ...frontmatter } = done;
    const yaml = serializeFrontmatter(frontmatter);
    assert(yaml.includes('type: done'), 'serialized YAML must include type: done');
    assert(yaml.includes('status: final'), 'serialized YAML must include status: final');
    assert(yaml.includes('parent_id: my-weave-plan-001'), 'serialized YAML must include parent_id');
    assert(!yaml.includes('## What was built'), 'content body must not appear in frontmatter');
    console.log('    ✅ serializeFrontmatter correct');

    console.log('  • id convention: ends with -done...');
    assert(done.id.endsWith('-done'), 'done doc id must end with "-done"');
    console.log('    ✅ id convention correct');

    console.log('\n✨ All DoneDoc entity tests passed!\n');
}

testDoneDocEntity().catch(err => {
    console.error('❌ entity.test.ts failed:', err.message);
    process.exit(1);
});
