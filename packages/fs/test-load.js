const { loadThread } = require('./dist/loadThread');

async function test() {
  try {
    const thread = await loadThread('example');
    console.log('✅ Thread loaded:', thread.id);
    console.log('   Design:', thread.design.title);
    console.log('   Documents:', thread.allDocs.length);
  } catch (e) {
    console.error('❌', e.message);
  }
}

test();