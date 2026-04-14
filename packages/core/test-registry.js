const { ConfigRegistry } = require('./dist/registry');

const registry = new ConfigRegistry();
console.log('Looms:', registry.listLooms());

registry.addLoom('test', '/fake/path/test-loom');
console.log('Added test loom');
console.log('Looms:', registry.listLooms());