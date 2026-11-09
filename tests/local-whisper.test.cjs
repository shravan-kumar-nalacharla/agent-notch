const{test}=require('node:test'),assert=require('node:assert/strict'),{available}=require('../src/local-whisper.cjs');
test('local Whisper reports whether the keyless CLI is available',()=>{
  const status=available();
  assert.equal(typeof status.available,'boolean');assert.equal(status.model,'base.en');assert.equal(status.offline,true);if(status.available)assert.match(status.path,/whisper\.exe$/i);
});
