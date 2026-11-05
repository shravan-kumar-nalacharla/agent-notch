'use strict';
const{test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');const{synthesize}=require('../src/speech.cjs');
test('speech terms errors explain the manual account step without exposing credentials',async()=>{
 await assert.rejects(synthesize({key:'secret-key',text:'Voice check.'},async()=>({ok:false,status:400,json:async()=>({error:{code:'model_terms_required',message:'account terms secret-key'}})})),error=>/model terms approval/.test(error.message)&&error.message.includes('console.groq.com/playground')&&!error.message.includes('secret-key'));
 await assert.rejects(synthesize({key:'secret-key',text:'Voice check.'},async()=>({ok:false,status:400,json:async()=>({error:{code:'invalid_voice',message:'Rejected secret-key'}})})),error=>/invalid_voice/.test(error.message)&&!error.message.includes('secret-key'));
});
function companionFixture(state){
 const callbacks={},elements=[],calls={cloud:0,local:0};const element=()=>{const el={hidden:false,textContent:'',setAttribute(){},prepend(){},after(){}};elements.push(el);return el;};
 const api={get:async()=>({ok:true,value:state}),wakePause:async()=>{},speechSegments:async()=>({ok:true,value:['Voice check.']}),synthesize:async()=>{calls.cloud++;return{ok:false,error:'Groq read-aloud needs model terms approval.'};},onSpeech:fn=>callbacks.speech=fn,onWake:fn=>callbacks.wake=fn,onVoice:fn=>callbacks.voice=fn,onSettings:fn=>callbacks.settings=fn};
 const context={window:{island:api,addEventListener(){},dispatchEvent(){},islandShowError:()=>{}},document:{createElement:element,querySelector:element},location:{search:''},CustomEvent:class{constructor(type,options){this.type=type;this.detail=options.detail;}},URLSearchParams,URL,SpeechSynthesisUtterance:function(text){this.text=text;},speechSynthesis:{cancel(){},getVoices:()=>[{lang:'en-IN',voiceURI:'local',name:'Windows voice'}],speak(utterance){calls.local++;queueMicrotask(()=>utterance.onend());}},nativeRecording:false,busy:false,setTimeout,clearTimeout};
 vm.runInNewContext(fs.readFileSync(require.resolve('../src/companion-ui.js'),'utf8'),context);return{...context,calls,elements,callbacks};
}
test('read-aloud off produces no cloud or local speech, including stale speech events',async()=>{
 const f=companionFixture({speak:false,companion:{tts:'groq'}});await f.window.islandSpeak('Private typed reply');await f.callbacks.speech({text:'Late voice reply'});await new Promise(r=>setImmediate(r));assert.deepEqual(f.calls,{cloud:0,local:0});
});
test('cloud read-aloud failure falls back locally once and stops repeated failing requests',async()=>{
 const f=companionFixture({speak:true,companion:{tts:'groq'},languages:{spokenLanguage:'en'}});await f.window.islandSpeak('First reply');await f.window.islandSpeak('Second reply');assert.deepEqual(f.calls,{cloud:1,local:2});assert.ok(f.elements.some(e=>e.textContent.includes('Cloud read-aloud is paused')));
 await assert.rejects(f.window.islandSpeak('Explicit retry',{preview:true}),/terms approval/);assert.equal(f.calls.cloud,2);
});
test('explicit system-voice preview works with automatic read-aloud disabled',async()=>{
 const f=companionFixture({speak:false,companion:{tts:'system'},languages:{spokenLanguage:'en'}});await f.window.islandSpeak('Local preview',{preview:true});assert.deepEqual(f.calls,{cloud:0,local:1});
});
