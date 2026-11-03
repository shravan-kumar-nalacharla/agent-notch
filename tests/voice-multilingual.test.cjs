'use strict';
const{test}=require('node:test'),assert=require('node:assert/strict'),{EventEmitter}=require('node:events'),{setupVoice}=require('../src/voice-main.cjs'),{DEFAULTS}=require('../src/localization.cjs');
const tick=()=>new Promise(r=>setImmediate(r));
function fixture(options={}){
 const native=new EventEmitter(),requests=[],writes=[],history=[],events=[],handlers={};let current={assistant:'deepseek',speech:'deepgram',models:{},voice:{cleanup:'none',autoInsert:true},languages:{...DEFAULTS,cloudAudioConsent:true,dictationMode:'tenglish',...options.languages}};
 native.request=async(action,value)=>{requests.push({action,value});return{outcome:'Pasted'};};
 const engine=setupVoice({native,clipboard:{writeText:text=>writes.push(text)},library:{view:()=>({dictionary:[]}),transform:t=>t,action:(op,value)=>history.push({op,value})},getState:()=>current,getKey:()=> 'test',emit:(_,event)=>events.push(event),handle:(name,handler)=>handlers[name]=handler,notify:()=>{},providers:{transcribe:options.transcribe||async function(){return{text:'రేపు project review ఉంది',confidence:.95,detectedLanguage:'te'};},chat:options.chat||async function(){return'Hello';},clean:async text=>({text})}});
 function begin(){native.emit('event',{type:'voice.begin',id:'s',kind:options.kind||'dictation'});native.emit('event',{type:'voice.segment',id:'s',index:0,audio:'AA==',mime:'audio/wav'});}
 function finish(){native.emit('event',{type:'voice.finish',id:'s',kind:options.kind||'dictation',seconds:1});}
 return{native,requests,writes,history,events,handlers,engine,begin,finish,update:value=>current=value};
}
test('a script-changing dictation remains a draft until explicit insertion, then inserts once',async()=>{
 const f=fixture();f.begin();f.finish();for(let i=0;i<10;i++)await tick();const draft=f.events.find(e=>e.phase==='draft');assert.ok(draft);assert.equal(draft.text,'Repu project review undi.');assert.equal(f.requests.filter(r=>r.action==='voice.insert').length,0);assert.equal(f.requests.filter(r=>r.action==='voice.release').length,0);assert.deepEqual(f.writes,[]);
 await f.handlers['native:voice']({op:'insertDraft',value:{id:'s',text:draft.text}});assert.equal(f.requests.filter(r=>r.action==='voice.insert').length,1);assert.equal(f.history[0].value.raw,'రేపు project review ఉంది');await assert.rejects(f.handlers['native:voice']({op:'insertDraft',value:{id:'s',text:'duplicate'}}),/expired/);f.engine.stop();
});
test('cancelled drafts never insert or copy and consent denial never uploads',async()=>{
 const f=fixture();f.begin();f.finish();for(let i=0;i<10;i++)await tick();f.native.emit('event',{type:'voice.cancel',id:'s'});await assert.rejects(f.handlers['native:voice']({op:'insertDraft',value:{id:'s',text:'cancelled'}}),/expired/);assert.deepEqual(f.writes,[]);assert.deepEqual(f.history,[]);f.engine.stop();
 let uploads=0;const denied=fixture({languages:{cloudAudioConsent:false},transcribe:async()=>{uploads++;return'private';}});denied.begin();await tick();assert.equal(uploads,0);await assert.rejects(denied.handlers['native:voice']({op:'start'}),/cloud audio/);denied.engine.stop();
});
test('duplicate finish does not release an in-flight recording or duplicate its answer',async()=>{
 let resolve;const f=fixture({kind:'chat',transcribe:()=>new Promise(r=>resolve=r)});f.begin();f.finish();f.finish();await tick();assert.equal(f.requests.filter(r=>r.action==='voice.release').length,0);resolve({text:'Hello',confidence:.95});for(let i=0;i<10;i++)await tick();assert.equal(f.events.filter(e=>e.phase==='answer').length,1);assert.equal(f.requests.filter(r=>r.action==='voice.release').length,1);f.engine.stop();
});
test('speech settings are snapshotted for an utterance and low confidence requires review',async()=>{
 let seen;const f=fixture({languages:{dictationMode:'en',speechInput:'en-IN'},transcribe:async input=>{seen=input;return{text:'Call at 3:30',confidence:.5};}});f.begin();f.update({languages:{...DEFAULTS,speechInput:'te-IN'}});f.finish();for(let i=0;i<10;i++)await tick();assert.equal(seen.language,'en');assert.ok(f.events.some(e=>e.phase==='draft'));assert.ok(!f.requests.some(r=>r.action==='voice.insert'));f.engine.stop();
});
