const {test}=require('node:test'),assert=require('node:assert/strict');
const face=require('../src/agent-face.js');

test('agent face is deterministic, bounded and shape-aware',()=>{
  const a=face.svg({seed:'shrav',shape:'droplet',hue:210,expression:'happy'}),b=face.svg({seed:'shrav',shape:'droplet',hue:210,expression:'happy'});
  assert.equal(a,b);
  assert.match(a,/^<svg class="agent-face-svg"/);
  assert.match(a,/viewBox="0 0 100 100"/);
  assert.match(a,/hsl\(210 /);
  assert.notEqual(face.svg({seed:'shrav',shape:'hexagon',hue:210}),a);
  assert.match(face.svg({seed:'x',shape:'not-real',hue:999,expression:'nope'}),/hsl\(360 /);
  assert.ok(face.svg({seed:'x'}).length<3000);
});
