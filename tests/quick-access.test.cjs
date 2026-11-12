const{test}=require('node:test'),assert=require('node:assert/strict');
const{normalizeQuick,addQuick,removeQuick}=require('../src/quick-access.cjs');
test('quick access is path-based, deduplicated and separate from Shelf',()=>{
  const exists=path=>path!=='C:\\missing.exe';
  const base=['C:\\a.txt',{path:'C:\\b.txt'}];
  assert.deepEqual(normalizeQuick(base),['C:\\a.txt','C:\\b.txt']);
  assert.deepEqual(addQuick(base,['C:\\a.txt','C:\\c.txt','C:\\missing.exe'],exists),['C:\\a.txt','C:\\b.txt','C:\\c.txt']);
  assert.deepEqual(removeQuick(addQuick(base,['C:\\c.txt'],exists),'C:\\b.txt'),['C:\\a.txt','C:\\c.txt']);
});
