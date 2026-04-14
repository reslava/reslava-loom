const { runEvent } = require('./dist/runEvent');
const { loadThread } = require('./dist/loadThread');

async function test() {
  try {
    console.log('📋 Before event:');
    const before = await loadThread('example');
    console.log('   Design version:', before.design.version);
    console.log('   Design status:', before.design.status);

    // Apply REFINE_DESIGN event
    await runEvent('example', { type: 'REFINE_DESIGN' });
    console.log('✅ REFINE_DESIGN applied');

    console.log('\n📋 After event:');
    const after = await loadThread('example');
    console.log('   Design version:', after.design.version);
    console.log('   Design status:', after.design.status);
    console.log('   Refined flag:', after.design.refined);
  } catch (e) {
    console.error('❌', e.message);
  }
}

test();