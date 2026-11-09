const{test}=require('node:test'),assert=require('node:assert/strict'),{transformBitmap}=require('../src/image-transform.cjs');
const A=Buffer.from([0,0,255,255]),B=Buffer.from([0,255,0,255]),src=Buffer.concat([A,B]);
test('rotation and flip move complete pixels without corrupting channels',()=>{
  let r=transformBitmap(src,2,1,90,false);assert.equal(r.width,1);assert.equal(r.height,2);assert.deepEqual([...r.data.subarray(0,4)],[...A]);assert.deepEqual([...r.data.subarray(4)],[...B]);
  r=transformBitmap(src,2,1,270,false);assert.deepEqual([...r.data.subarray(0,4)],[...B]);assert.deepEqual([...r.data.subarray(4)],[...A]);
  r=transformBitmap(src,2,1,180,true);assert.equal(r.width,2);assert.equal(r.height,1);assert.deepEqual([...r.data.subarray(0,4)],[...A]);assert.deepEqual([...r.data.subarray(4)],[...B]);
});
test('invalid bitmaps and rotations are rejected',()=>{
  assert.throws(()=>transformBitmap(Buffer.alloc(7),2,1),/Invalid bitmap/);
  assert.throws(()=>transformBitmap(src,2,1,45),/Rotation/);
});
