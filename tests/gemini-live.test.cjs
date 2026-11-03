'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),{EventEmitter}=require('node:events');
const {createLiveClient,MODEL}=require('../src/gemini-live.cjs');
const {setupVoice}=require('../src/voice-main.cjs');
const {LivePcmPlayer}=require('../src/live-playback.js');
const tick=()=>new Promise(resolve=>setImmediate(resolve));
class FakeSocket extends EventTarget {
  constructor(url){super();this.url=url;this.sent=[];this.bufferedAmount=0;FakeSocket.last=this;}
  send(value){this.sent.push(JSON.parse(value));}
  close(){this.closed=true;}
  receive(value){this.dispatchEvent(new MessageEvent('message',{data:JSON.stringify(value)}));}
}
test('Windows launch dispatch does not wait for speech playback and Live stays responsive during the task',async()=>{
 let calls=0,release,cancelled=0;const content=[];
 const client=createLiveClient({key:'test',instruction:'Execute requested tasks.',onContent:value=>content.push(value),onError:()=>{},onDesktopTask:async request=>{calls++;assert.equal(request,'open Chrome');return new Promise(resolve=>release=resolve);},onDesktopCancel:()=>{cancelled++;return{stopped:true};},WebSocketImpl:FakeSocket});
 const ready=client.connect(),ws=FakeSocket.last;ws.dispatchEvent(new Event('open'));const declarations=ws.sent[0].setup.tools[0].functionDeclarations;assert.equal(declarations.find(x=>x.name==='execute_windows_task').behavior,'NON_BLOCKING');ws.receive({setupComplete:{}});await ready;
 const call={toolCall:{functionCalls:[{id:'launch-one',name:'execute_windows_task',args:{request:'open Chrome'}}]}};ws.receive(call);ws.receive(call);await tick();assert.equal(calls,1);
 ws.receive({serverContent:{modelTurn:{parts:[{inlineData:{mimeType:'audio/pcm;rate=24000',data:'AAAA'}}]}}});assert.equal(content.length,1);assert.ok(!ws.sent.some(x=>x.toolResponse));
 ws.receive({toolCall:{functionCalls:[{id:'stop-one',name:'stop_windows_task',args:{}}]}});await tick();assert.equal(cancelled,1);
 release({status:'result',message:'Opened Chrome.'});await tick();assert.equal(ws.sent.at(-1).toolResponse.functionResponses[0].scheduling,'WHEN_IDLE');client.close();
});
test('Live handshake waits for setupComplete; sends PCM, transcripts and the documented model',async()=>{
  const content=[],errors=[],client=createLiveClient({key:'test secret',instruction:'Speak Telugu.',onContent:c=>content.push(c),onError:e=>errors.push(e),WebSocketImpl:FakeSocket});
  const connected=client.connect(),ws=FakeSocket.last;assert.ok(ws.url.endsWith('key=test%20secret'));
  client.sendAudio('AAAA');assert.equal(ws.sent.length,0);ws.dispatchEvent(new Event('open'));
  assert.equal(ws.sent[0].setup.model,'models/'+MODEL);assert.deepEqual(ws.sent[0].setup.generationConfig.responseModalities,['AUDIO']);assert.deepEqual(ws.sent[0].setup.inputAudioTranscription,{});
  ws.receive({setupComplete:{}});await connected;client.sendAudio('AAAA');assert.equal(ws.sent[1].realtimeInput.audio.mimeType,'audio/pcm;rate=16000');
  ws.receive({serverContent:{inputTranscription:{text:'హలో'},interrupted:true}});assert.equal(content[0].inputTranscription.text,'హలో');assert.equal(errors.length,0);client.close();
  ws.receive({serverContent:{turnComplete:true}});assert.equal(content.length,1);
});
test('rejected Live setup and disconnect errors are actionable and redact keys',async()=>{
  const errors=[],client=createLiveClient({key:'private-key',instruction:'Test',onContent:()=>{},onError:e=>errors.push(e.message),WebSocketImpl:FakeSocket});
  const connected=client.connect();FakeSocket.last.receive({error:{message:'private-key quota exhausted'}});
  await assert.rejects(connected,/quota/);assert.ok(errors[0].includes('Google AI Studio'));assert.ok(!errors[0].includes('private-key'));assert.ok(FakeSocket.last.closed);
});
test('cancelling pending setup closes the socket and rejects the waiting connection',async()=>{
  const client=createLiveClient({key:'test',instruction:'Test',onContent:()=>{},onError:()=>{},WebSocketImpl:FakeSocket});const connected=client.connect();client.close();await assert.rejects(connected,/cancelled/);assert.ok(FakeSocket.last.closed);
});
test('Live action tool prepares a confirmation and deduplicates repeated tool calls without performing actions',async()=>{
  let requests=0;const client=createLiveClient({key:'test',instruction:'Only prepare actions.',onContent:()=>{},onError:()=>{},onToolCall:async request=>{requests++;assert.equal(request,'Log four pages');return{status:'requires_confirmation',id:'preview'};},WebSocketImpl:FakeSocket});const connected=client.connect(),ws=FakeSocket.last;ws.dispatchEvent(new Event('open'));assert.equal(ws.sent[0].setup.tools[0].functionDeclarations[0].name,'prepare_productivity_action');ws.receive({setupComplete:{}});await connected;const call={toolCall:{functionCalls:[{id:'tool-one',name:'prepare_productivity_action',args:{request:'Log four pages'}}]}};ws.receive(call);ws.receive(call);await tick();assert.equal(requests,1);assert.equal(ws.sent.at(-1).toolResponse.functionResponses[0].response.status,'requires_confirmation');client.close();
});
test('upload backpressure ends the session instead of buffering microphone audio indefinitely',async()=>{
  const errors=[],client=createLiveClient({key:'test',instruction:'Test',onContent:()=>{},onError:e=>errors.push(e.message),WebSocketImpl:FakeSocket});const connected=client.connect();FakeSocket.last.receive({setupComplete:{}});await connected;FakeSocket.last.bufferedAmount=300000;client.sendAudio('AAAA');assert.match(errors[0],/fell behind/);assert.ok(FakeSocket.last.closed);
});
function fixture({consent=true,speak=true,connect=async()=>{}}={}){
  const native=new EventEmitter(),requests=[],events=[],history=[],handlers={},keys=[],clients=[];
  const state={assistant:'groq',speech:'groq',models:{},speak,voice:{cleanup:'none'},companion:{chatEngine:'gemini_live',name:'Cutie'},languages:{...require('../src/localization.cjs').DEFAULTS,cloudAudioConsent:consent}};
  native.request=async(action,value)=>{requests.push({action,value});if(action==='voice.start')native.emit('event',{type:'voice.begin',id:'live-1',kind:value.kind});if(action==='voice.cancel')native.emit('event',{type:'voice.cancel',id:'live-1'});return{};};
  const engine=setupVoice({native,clipboard:{writeText:()=>assert.fail('Live must never copy or type')},library:{view:()=>({dictionary:[]}),action:(...a)=>history.push(a)},getState:()=>state,getKey:provider=>{keys.push(provider);return'private-key';},emit:(channel,value)=>events.push({channel,...value}),handle:(name,fn)=>handlers[name]=fn,notify:()=>{},providers:{transcribe:()=>assert.fail('Live must not use transcription REST'),chat:()=>assert.fail('Live must not call chat REST')},liveFactory:options=>{const client={options,connect,sendAudio:data=>client.audio.push(data),audio:[],close(){this.closed=true;}};clients.push(client);return client;}});
  return{native,requests,events,history,handlers,keys,clients,engine,state,start:()=>handlers['native:voice']({op:'start',value:{kind:'chat'}})};
}
test('Live uses only the Gemini key and existing capture, supports multiple turns and interruption',async()=>{
  const f=fixture();await f.start();assert.deepEqual(f.keys,['gemini']);assert.equal(f.requests[0].value.kind,'live');
  f.native.emit('event',{type:'voice.audio',id:'live-1',audio:'AA=='});assert.deepEqual(f.clients[0].audio,['AA==']);
  const receive=f.clients[0].options.onContent;receive({inputTranscription:{text:'Hi'},outputTranscription:{text:'Hello'},modelTurn:{parts:[{inlineData:{mimeType:'audio/pcm;rate=24000',data:'AAA='}}]}});receive({interrupted:true,turnComplete:true});receive({inputTranscription:{text:'Next'},outputTranscription:{text:'Yes'},turnComplete:true});
  assert.equal(f.history.length,2);assert.ok(f.events.some(e=>e.phase==='liveInterrupt'));assert.equal(f.events.filter(e=>e.phase==='liveAudio').length,0);assert.equal(f.events.filter(e=>e.phase==='liveText').at(-1).turn,1);
  await f.handlers['native:voice']({op:'cancel'});receive({outputTranscription:{text:'Late'}});assert.equal(f.history.length,2);assert.ok(f.clients[0].closed);f.engine.stop();
});
test('consent blocks the Live connection and master read-aloud off suppresses Live audio',async()=>{
  const blocked=fixture({consent:false});await assert.rejects(blocked.start(),/cloud audio/);assert.equal(blocked.clients.length,0);assert.equal(blocked.requests.length,0);blocked.engine.stop();
  const f=fixture({speak:false});await f.start();f.clients[0].options.onContent({outputTranscription:{text:'Visible reply'},modelTurn:{parts:[{inlineData:{mimeType:'audio/pcm',data:'AAA='}}]},turnComplete:true});assert.ok(f.events.some(e=>e.phase==='liveText'));assert.ok(!f.events.some(e=>e.phase==='liveAudio'));f.engine.stop();
});
test('cancel while connecting cannot open the microphone later; network failure releases active capture',async()=>{
  let ready;const f=fixture({connect:()=>new Promise(resolve=>ready=resolve)});const pending=f.start();await f.handlers['native:voice']({op:'cancel'});ready();await pending;assert.ok(!f.requests.some(r=>r.action==='voice.start'));f.engine.stop();
  const active=fixture();await active.start();await active.clients[0].options.onError(new Error('Quota exhausted'));assert.ok(active.requests.some(r=>r.action==='voice.cancel'));assert.equal(active.events.at(-1).phase,'error');active.engine.stop();
});
test('a global dictation started during Live connection wins without its audio being sent to Gemini',async()=>{
  let ready;const f=fixture({connect:()=>new Promise(resolve=>ready=resolve)});const pending=f.start();f.native.emit('event',{type:'voice.begin',kind:'dictation',id:'dictation-1'});ready();await pending;assert.ok(f.clients[0].closed);assert.ok(!f.requests.some(r=>r.action==='voice.start'||r.action==='voice.cancel'));assert.equal(f.events.at(-1).kind,'dictation');f.engine.stop();
});
test('a stopped Windows helper closes Gemini and clears the listening indicator',async()=>{
  const f=fixture();await f.start();f.native.emit('stopped');assert.ok(f.clients[0].closed);assert.equal(f.events.at(-1).phase,'error');assert.match(f.events.at(-1).error,/microphone engine stopped/);f.engine.stop();
});
test('PCM playback queues samples on one clock and cancellation removes scheduled output',async()=>{
  const sources=[],context={currentTime:1,resume:async()=>{},destination:{},createBuffer:(_c,count,rate)=>({duration:count/rate,getChannelData:()=>new Float32Array(count)}),createGain:()=>({gain:{},connect(){},disconnect(){}}),createBufferSource:()=>{const source={connect(){},disconnect(){},start(at){this.at=at;},stop(){this.stopped=true;}};sources.push(source);return source;}};
  const player=new LivePcmPlayer(()=>context);await player.enqueue(Buffer.alloc(4800).toString('base64'));await player.enqueue(Buffer.alloc(4800).toString('base64'));assert.equal(sources[0].at,1.04);assert.ok(Math.abs(sources[1].at-1.14)<1e-9);player.stop();assert.ok(sources.every(s=>s.stopped));
  await assert.rejects(player.enqueue('AA=='),/invalid PCM/);await player.enqueue('AAA=');assert.equal(sources.length,3);
  let resume;context.resume=()=>new Promise(r=>resume=r);const pending=player.enqueue('AAA=');await tick();player.stop();resume();await pending;assert.equal(sources.length,3);
});
