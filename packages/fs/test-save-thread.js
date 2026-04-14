const { loadThread } = require('./dist/loadThread');
const { saveThread } = require('./dist/saveThread');

async function test() {
  try {
    const thread = await loadThread('example');
    console.log('✅ Loaded:', thread.id);

    // Make a small change
    thread.design.updated = new Date().toISOString().split('T')[0];
    
    await saveThread(thread);
    console.log('✅ Saved thread successfully');
    
    // Reload and verify
    const reloaded = await loadThread('example');
    console.log('✅ Reloaded, updated field present:', !!reloaded.design.updated);
  } catch (e) {
    console.error('❌', e.message);
  }
}

test();