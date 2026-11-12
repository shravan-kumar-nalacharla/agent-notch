const{test}=require('node:test'),assert=require('node:assert/strict');
const{migrateQuickAccess}=require('../src/shelf-migration.cjs');
test('legacy quick access paths migrate into Shelf once and are cleared',()=>{
  const calls=[];const library={action(op,value){calls.push([op,value]);}};const state={quickAccess:[{path:'C:\\a.txt'},{path:'C:\\b.txt'},'C:\\a.txt']};
  assert.equal(migrateQuickAccess(state,library),2);assert.deepEqual(calls,[ ['shelf:add',{paths:['C:\\a.txt','C:\\b.txt']}] ]);assert.deepEqual(state.quickAccess,[]);
  assert.equal(migrateQuickAccess(state,library),0);assert.equal(calls.length,1);
});
test('migration ignores malformed legacy entries',()=>{
  const library={action(){throw new Error('should not be called');}};const state={quickAccess:[null,{nope:true},42]};
  assert.equal(migrateQuickAccess(state,library),0);assert.deepEqual(state.quickAccess,[]);
});
