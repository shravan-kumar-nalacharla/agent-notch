const{test}=require('node:test'),assert=require('node:assert/strict');
const{validateView,validatePluginMessage}=require('../src/plugin-protocol.cjs');
test('plugin protocol keeps declarative components and strips unknown fields',()=>{
  const view=validateView({type:'card',secret:'no',children:[{type:'text',text:'Hello',bold:true},{type:'future-component',value:1}]});
  assert.deepEqual(view,{type:'card',children:[{type:'text',text:'Hello',bold:true}]});
  assert.equal(validatePluginMessage({type:'not-a-message'}),null);
});
test('plugin protocol bounds tree depth',()=>{let view={type:'card'};for(let i=0;i<22;i++)view={type:'card',children:[view]};assert.throws(()=>validateView(view),/large/);});

test('plugin text input values preserve URLs and empty strings',()=>{assert.equal(validateView({type:'input',value:'https://example.com/video'}).value,'https://example.com/video');assert.equal(validateView({type:'input',value:''}).value,'');});
