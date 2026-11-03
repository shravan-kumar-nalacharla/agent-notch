const{test}=require('node:test');const assert=require('node:assert/strict');const{EventEmitter}=require('node:events');const{setupVoice}=require('../src/voice-main.cjs');
const tick=()=>new Promise(resolve=>setImmediate(resolve));
test('cancelling during cleanup or selected-text generation never inserts, copies or saves the result',async()=>{
 for(const kind of ['dictation','command']){
  const native=new EventEmitter(),requests=[],writes=[],history=[];native.request=async(action,value)=>{requests.push({action,value});return{outcome:'Pasted'};};let resolveModel,startedResolve;const started=new Promise(r=>startedResolve=r);const deferred=()=>{startedResolve();return new Promise(r=>resolveModel=r);};
  const engine=setupVoice({native,clipboard:{writeText:text=>writes.push(text)},library:{view:()=>({dictionary:[]}),transform:t=>t,action:(...x)=>history.push(x)},getState:()=>({assistant:'groq',speech:'groq',models:{},voice:{cleanup:'light',autoInsert:true}}),getKey:()=> 'test',emit:()=>{},handle:()=>{},notify:()=>{},providers:{transcribe:async()=> 'Make this formal',chat:deferred,clean:deferred}});
  native.emit('event',{type:'voice.begin',id:'1',selected:kind==='command'?'hello':''});native.emit('event',{type:'voice.segment',id:'1',index:0,audio:'AA=='});native.emit('event',{type:'voice.finish',id:'1',kind});await started;native.emit('event',{type:'voice.cancel',id:'1'});resolveModel(kind==='command'?'{"mode":"replace","text":"Hello."}':{text:'Hello.'});await tick();await tick();assert.ok(!requests.some(x=>x.action==='voice.insert'));assert.deepEqual(writes,[]);assert.deepEqual(history,[]);assert.ok(requests.some(x=>x.action==='voice.release'));engine.stop();
 }
});
