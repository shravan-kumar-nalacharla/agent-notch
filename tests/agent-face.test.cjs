const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const ctx={window:{},TextEncoder};vm.createContext(ctx);vm.runInContext(fs.readFileSync('src/vendor/blobatar.js','utf8'),ctx);globalThis.BlobatarLib=ctx.BlobatarLib;
const face=require('../src/agent-face.js');

test('agent face uses the vendored Blobatar and is deterministic and shape-aware',()=>{
  const a=face.svg({seed:'shrav',shape:'droplet',hue:210,expression:'happy'}),b=face.svg({seed:'shrav',shape:'droplet',hue:210,expression:'happy'});
  assert.equal(a,b);
  assert.match(a,/^<svg class="agent-face-svg"/);
  assert.match(a,/viewBox="0 0 100 100"/);
  assert.notEqual(face.svg({seed:'shrav',shape:'hexagon',hue:210}),a);
  assert.match(face.svg({seed:'x',shape:'not-real',hue:999,expression:'nope'}),/^<svg class="agent-face-svg"/);
  assert.ok(face.svg({seed:'x'}).length<3000);
  assert.deepEqual(face.shapes,['round','organic','boxy','capsule','nub','cloud','droplet','hexagon','sun','triangle']);
  assert.equal(face.expressions.length,14);
});
