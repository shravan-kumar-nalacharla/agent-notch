const{test}=require('node:test'),assert=require('node:assert/strict');
const{createTaskCoordinator}=require('../src/task-coordinator.cjs'),{splitGoal}=require('../src/task-graph.cjs');
test('mixed browser and Windows instructions split into independent workflows',()=>{
  const split=splitGoal('Open Chrome, go to YouTube, open the first video and like it. Then open File Explorer and navigate to Downloads.');
  assert.equal(split.both,true);assert.match(split.browserGoal,/YouTube/);assert.match(split.windowsGoal,/File Explorer/);assert.doesNotMatch(split.windowsGoal,/YouTube/);
  assert.equal(splitGoal('Open File Explorer and go to Downloads').both,false);
});
test('the orchestrator executes both branches and reports both results',async()=>{
  let observation={id:'s1',url:'https://www.youtube.com/',headings:['YouTube'],controls:[],auth:false,error:false};
  const browser={current:observation,page:null,open:async()=>observation,navigate:async()=>{observation={...observation,id:'s2'};return observation;},observe:async()=>observation,act:async()=>observation,facts:async()=>'',bind:()=>()=>{},close:async()=>{}};
  let windowsGoal='';const nativeTask={run:async(goal)=>{windowsGoal=goal;return 'File Explorer opened at Downloads.';},cancel:()=>true,confirm:()=>true,get active(){return null;}};
  let call=0;const ask=async()=>{call++;return call===1?JSON.stringify({action:'navigate',url:'https://www.youtube.com/',verify:{origin:'https://www.youtube.com',path:'/',heading:'YouTube'}}):JSON.stringify({action:'done'});};
  const coordinator=createTaskCoordinator({browser,nativeTask,runCommand:async()=>{throw new Error('unexpected');},ask,getConfig:()=>({provider:'groq',model:'test'}),storage:null});
  const result=await coordinator.run('Open Chrome, go to YouTube, open the first video and like it. Then open File Explorer and navigate to Downloads.');
  assert.match(result,/Browser:/);assert.match(result,/Windows:/);assert.match(windowsGoal,/File Explorer/);assert.match(windowsGoal,/Downloads/);
});
