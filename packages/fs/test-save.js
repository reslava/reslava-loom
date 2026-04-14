const { saveDoc } = require('./dist/save');

const doc = {
  type: 'design',
  id: 'test-save',
  title: 'Atomic Write Test',
  status: 'draft',
  created: '2026-04-15',
  version: 1,
  tags: [],
  parent_id: null,
  child_ids: [],
  requires_load: [],
  content: '# Goal\n\nTest atomic write.\n',
};

saveDoc(doc, './test-output.md')
  .then(() => console.log('✅ File written'))
  .catch(e => console.error('❌', e.message));