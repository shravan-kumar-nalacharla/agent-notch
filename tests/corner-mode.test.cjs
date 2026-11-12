const{test}=require('node:test'),assert=require('node:assert/strict');
const{layoutFor}=require('../src/geometry.cjs');
const display={id:1,bounds:{x:0,y:0,width:1920,height:1080},workArea:{x:0,y:0,width:1920,height:1040},scaleFactor:1};
test('corner mode docks at the top-right of the work area',()=>{
  const layout=layoutFor(display,{shape:'corner'});
  assert.equal(layout.bounds.x+layout.bounds.width,1920-12);
  assert.equal(layout.bounds.y,10);
});
test('notch mode remains centered',()=>{
  const layout=layoutFor(display,{shape:'notch'});
  assert.equal(layout.bounds.x+layout.bounds.width/2,960);
});
