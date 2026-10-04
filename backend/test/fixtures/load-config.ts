// Used by config.test.ts: loads the environment module in a fresh process.
await import('../../src/config/env.js');
console.log('CONFIG_OK');
