'use strict';
module.exports=async({app,win,native,out,saveSnapshot})=>{
 const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),checks=[],js=c=>win.webContents.executeJavaScript(c),sleep=ms=>new Promise(r=>setTimeout(r,ms));
 async function until(c){for(let i=0;i<160;i++){if(await js(c))return;await sleep(50);}throw Error('Timed out: '+c);}
 const client=native(),request=client.request.bind(client);let starts=0;
 client.request=async(action,value)=>{if(action==='voice.start'){starts++;client.emit('event',{type:'voice.begin',kind:'chat',id:'test-'+starts});return{};}if(action==='voice.cancel')return{};return request(action,value);};
 const voice=e=>win.webContents.send('voice:state',e),speech=p=>js(`window.dispatchEvent(new CustomEvent('island:speech',{detail:{phase:${JSON.stringify(p)}}}));true`);
 try{
  await js("window.island.save({providerKeys:{groq:'test'},assistant:'groq',speak:true,microphone:{mode:'manual',muted:false},companion:{provider:'groq',speechProvider:'groq',tts:'sarvam'},appearance:{pinned:true,panelSize:'auto'}}).then(r=>{if(!r.ok)throw Error(r.error);return window.island.activate({revealOnly:true})})");
  await js("document.querySelector('[data-tab=voiceAssistant]').click()");await until("!!document.querySelector('.el-voice-stage canvas')");await sleep(500);
  await js("window.__mainOrb=document.querySelector('.el-voice-stage canvas');true");
  for(let i=0;i<3;i++){
   await js("[...document.querySelectorAll('.el-selector-row [role=combobox]')].at(-1).click()");await until("document.querySelectorAll('[data-slot=command-item]').length===37");
   assert.equal(await js("document.querySelectorAll('[data-slot=popover-content] canvas').length"),0);
   await js(`document.querySelectorAll('[data-slot=command-item]')[${i+1}].click()`);await sleep(250);
   assert.ok(await js("window.__mainOrb===document.querySelector('.el-voice-stage canvas')&&!window.__mainOrb.hidden&&!window.__mainOrb.getContext('webgl2').isContextLost()"));
  }
  checks.push('Selecting among 37 voices preserves the main ElevenLabs WebGL orb without creating picker contexts');
  await js("window.__orbExtension=window.__mainOrb.getContext('webgl2').getExtension('WEBGL_lose_context');window.__orbExtension.loseContext();true");await sleep(200);await js("window.__orbExtension.restoreContext();true");await until("!window.__mainOrb.hidden&&!window.__mainOrb.getContext('webgl2').isContextLost()");checks.push('The ElevenLabs shader recovers after WebGL context loss instead of showing a fallback sphere');
  const layout=await js("(()=>{const row=document.querySelector('.el-voice-footer').getBoundingClientRect(),r=[...document.querySelectorAll('.el-voice-footer>*')].map(n=>n.getBoundingClientRect().toJSON());return{row:row.toJSON(),r}})()");
  console.log('FOOTER LAYOUT',JSON.stringify(layout));for(let i=1;i<layout.r.length;i++)assert.ok(layout.r[i].left>=layout.r[i-1].right-1,JSON.stringify(layout));assert.ok(layout.r.at(-1).right<=layout.row.right+1,JSON.stringify(layout));
  checks.push('Spoken replies, Replay and Copy have separate nonoverlapping layout slots');await saveSnapshot(win,path.join(out,'voice-picker-and-controls.png'));
  await js("document.getElementById('el-agentStart').click()");await until("document.getElementById('voiceAssistant').dataset.phase==='listening'");assert.equal(starts,1);
  for(let round=1;round<=2;round++){
   voice({phase:'processing',kind:'chat',id:'test-'+round});voice({phase:'answer',text:'Answer '+round,raw:'Question '+round});await speech('speaking');
   if(round===1){voice({phase:'turnComplete',kind:'chat',id:'test-'+round});await sleep(450);assert.equal(starts,round);await speech('ready');}
   else{await speech('ready');await sleep(450);assert.equal(starts,round);voice({phase:'turnComplete',kind:'chat',id:'test-'+round});}
   await until(`document.getElementById('voiceAssistant').dataset.phase==='listening'&&document.getElementById('agentHeard').textContent===''`);await sleep(350);assert.equal(starts,round+1);
  }
  checks.push('Start listening automatically rearms across replies after both playback completion and native microphone release, in either order');
  await saveSnapshot(win,path.join(out,'continuous-listening.png'));await js("document.getElementById('el-agentStop').click()");await sleep(200);voice({phase:'turnComplete',kind:'chat',id:'test-3'});await speech('ready');await sleep(500);assert.equal(starts,3);assert.equal(await js("document.getElementById('voiceAssistant').dataset.continuous"),'false');
  checks.push('Stop cancels continuous listening and late playback/completion events cannot restart capture');
  await js("document.getElementById('el-agentStart').click()");await until("document.getElementById('voiceAssistant').dataset.phase==='listening'");await js("document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))");await until("document.getElementById('voiceAssistant').dataset.continuous==='false'");
  await js("document.getElementById('el-agentStart').click()");await until("document.getElementById('voiceAssistant').dataset.phase==='listening'");await js("window.island.microphone({muted:true})");await until("document.getElementById('voiceAssistant').dataset.continuous==='false'");checks.push('Escape and microphone mute also end continuous mode');
  fs.writeFileSync(path.join(out,'continuous-voice-verification.json'),JSON.stringify({version:app.getVersion(),checks,starts,layout,limitations:['Physical microphone and acoustic echo behavior require a hardware check; capture and provider calls are simulated.']},null,2));console.log('CONTINUOUS VOICE PASS',checks.length);
 }finally{client.request=request;}
};
