const{test}=require('node:test'),assert=require('node:assert/strict');
const{parseManifest,resolveExecutable}=require('../src/plugin-manifest.cjs');
test('plugin manifest parses the bounded Fenn-compatible surface',()=>{
  const manifest=parseManifest('id="hello"\nname="Hello"\nrun=["node","main.js"]\nmode="live"\npermissions=["clipboard:write"]\n');
  assert.equal(manifest.id,'hello');assert.deepEqual(manifest.run,['node','main.js']);assert.deepEqual(manifest.permissions,['clipboard:write']);
});
test('plugin manifest rejects path escapes and unsupported tables',()=>{
  assert.throws(()=>parseManifest('[plugin]\nid="x"'),/tables/);
  assert.throws(()=>resolveExecutable('C:\\plugins\\safe',['..\\evil.exe']),/escapes/);
});
