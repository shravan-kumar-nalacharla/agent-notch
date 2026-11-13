'use strict';
(()=>{
 if(new URLSearchParams(location.search).has('settings'))return;
 const api=window.island,$=id=>document.getElementById(id);
 let interrupted=null;let config,recording=false,answer='',kind='',keepOpen=false,waiting=false,speaking=false,input=0,output=0,frame=0,lastFrame=0,follow=true;
 const page=document.createElement('section');page.id='voiceAssistant';page.className='page voice-assistant';page.hidden=true;page.dataset.phase='ready';
 page.innerHTML=`<div class="page-head"><div><span class="voice-eyebrow">YOUR COMPANION</span><h1>Voice assistant</h1></div><button id="voiceAssistantSettings" class="soft-chip" aria-label="Voice settings">Settings</button></div>
 <div class="voice-stage"><div class="voice-orb" aria-hidden="true"><canvas id="agentOrb"></canvas></div><div class="voice-copy"><strong id="agentVoiceStatus" role="status" aria-live="polite">Ready when you are</strong><small id="agentProvider"></small><small id="agentWakeStatus"></small></div><div class="agent-bars" aria-hidden="true">${'<i></i>'.repeat(15)}</div></div>
 <p id="agentReadingContext" class="voice-reading-context"></p><div class="voice-exchange" tabindex="0" aria-label="Voice conversation"><p id="agentHeard" dir="auto"></p><div id="agentAnswer" dir="auto"></div></div>
 <div class="voice-toolbar"><small id="agentVoiceHint"></small><button id="agentReplay" title="Replay answer" aria-label="Replay answer" disabled>↻</button><button id="agentCopy" title="Copy answer" aria-label="Copy answer" disabled>Copy</button></div>
 <div class="voice-actions"><button id="agentStart" class="voice-primary"><span class="voice-button-icon" aria-hidden="true"></span><span id="agentStartLabel">Start listening</span></button><button id="agentStop" aria-label="Stop voice assistant">Stop</button><button id="agentNewConversation" title="Clear recent voice conversation">New conversation</button><button id="agentWake">Enable calling by name</button></div>
 <details class="voice-devices"><summary>Audio options</summary><div class="voice-device-row"><label>Microphone <select id="agentMic" aria-label="Voice microphone"><option value="">System default</option></select></label><label id="agentVoicePicker">Voice <select id="agentVoiceChoice" aria-label="Sarvam speaking voice"><option value="priya">Priya</option><option value="shubh">Shubh</option><option value="ishita">Ishita</option><option value="ratan">Ratan</option><option value="neha">Neha</option><option value="ritu">Ritu</option></select></label></div></details>`;
 document.querySelector('.view-stack').append(page);
 $('agentVoiceChoice').replaceChildren(...window.NotchProviders.sarvamVoices.map(v=>new Option(v.label,v.id)));
 const nav=document.createElement('button');nav.dataset.tab='voiceAssistant';nav.title='Voice assistant';nav.setAttribute('aria-label','Voice assistant');nav.innerHTML='<svg viewBox="0 0 24 24"><path d="M4 10v4M8 6v12M12 3v18M16 6v12M20 10v4"/></svg><span>Voice</span>';document.querySelector('nav').insertBefore(nav,document.querySelector('nav [data-tab=notes]'));nav.onclick=()=>tab('voiceAssistant');
 const orb=window.NOTCH_ELEVEN_REACT?{available:false,draw(){},dispose(){}}:window.ElevenOrb($('agentOrb'));$('agentOrb').hidden=!orb.available;
 window.islandVoiceHold=()=>!page.hidden&&(continuous.enabled||recording||waiting||speaking);
 const continuous=window.NotchVoiceLoop.createVoiceLoop({start:()=>startNativeVoice('chat'),cancelCapture:()=>api.nativeVoice('cancel'),spoken:()=>!!config?.speak,changed:enabled=>{page.dataset.continuous=String(enabled);keepOpen=enabled||waiting||speaking;$('agentStartLabel').textContent=recording?'Send question':enabled?'Listening on':'Start listening';hold();},error:e=>{waiting=false;phase('error',e.message);hold();showError(e);}});
 function hold(){window.dispatchEvent(new CustomEvent('island:voice-hold',{detail:window.islandVoiceHold()}));}
 function phase(value,label){page.dataset.phase=value;$('agentVoiceStatus').textContent=label;animate();}
 function animate(){if(window.NOTCH_ELEVEN_REACT||frame||page.hidden||!expanded)return;frame=requestAnimationFrame(draw);}
 function draw(time){frame=0;if(page.hidden||!expanded)return;const reduced=config?.appearance?.motion==='off'||matchMedia('(prefers-reduced-motion: reduce)').matches,phase=page.dataset.phase;if(time-lastFrame<33&&!reduced){animate();return;}lastFrame=time;input*=.94;output*=.96;const thinking=phase==='processing',inLevel=phase==='listening'?input:0,outLevel=phase==='speaking'?output:0;orb.draw(reduced?0:time*.0005,inLevel,outLevel,phase==='muted');page.querySelectorAll('.agent-bars i').forEach((bar,i)=>{const envelope=Math.sin((i+1)/16*Math.PI),processing=thinking&&!reduced?(.18+.12*Math.sin(time*.003-i*.4)):0;bar.style.height=(3+30*Math.min(1,envelope*(Math.max(inLevel,outLevel)*1.5+processing)))+'px';});if(!reduced&&['listening','processing','speaking'].includes(phase))animate();}
 function scroll(){const box=page.querySelector('.voice-exchange');if(follow)box.scrollTop=box.scrollHeight;}
 page.querySelector('.voice-exchange').onscroll=e=>{const b=e.currentTarget;follow=b.scrollHeight-b.scrollTop-b.clientHeight<30;};
 function render(s){config=s;const p=s.microphoneStatus||s.microphone,name=s.companion?.name||'Cutie';
  $('agentProvider').textContent=s.companion?.chatEngine==='gemini_live'?'Gemini Live':(window.NotchProviders.names[window.NotchProviders.text(s,'voice').provider]||'Voice')+' · tasks: '+window.NotchProviders.names[window.NotchProviders.text(s,'tasks').provider];
  const context=s.companion?.readingContext||'';$('agentReadingContext').textContent=context?'Reading · '+context.split(/[.\n]/)[0].replace(/^Reading /,'').slice(0,115):'';$('agentReadingContext').title=context;
  $('agentStart').disabled=!!p.blocked||p.mode==='ptt';$('agentStartLabel').textContent=recording?(kind==='live'?'Stop listening':'Send question'):continuous.enabled?'Listening on':'Start listening';
  $('agentVoiceHint').textContent=p.blocked?p.reason:p.mode==='ptt'?'Hold '+p.pttShortcut+' to ask.':'Speak naturally. Pause to finish.';
  $('agentWakeStatus').textContent=s.wakeStatus?.error?s.wakeStatus.error:p.blocked?'Microphone is muted':s.wakeStatus?.enabled?'Say “Hey '+name+'”':p.mode==='always'?'Starting name activation…':'Name activation off';
  $('agentWake').textContent=p.mode==='always'?'Name activation on':'Enable calling by name';$('agentWake').setAttribute('aria-pressed',String(p.mode==='always'));
  const choices=window.NotchProviders.voices(s);$('agentVoicePicker').hidden=!choices.length;$('agentVoiceChoice').replaceChildren(...choices.map(v=>new Option(v.label,v.id)));$('agentVoiceChoice').value=s.companion?.[window.NotchProviders.voiceField(s)]||choices[0]?.id||'';$('agentMic').value=s.voice?.inputDeviceId||'';
  $('agentReplay').disabled=!!p.blocked||!answer||!s.speak;for(const id of ['agentMic','agentVoiceChoice'])$(id).disabled=recording||waiting||speaking;
  if(p.blocked||p.mode==='ptt')continuous.stop();if(p.blocked){recording=false;waiting=false;speaking=false;phase('muted','Microphone muted');hold();}else if(page.dataset.phase==='muted')phase('ready','Ready when you are');
 }
 async function refresh(){const s=await result(api.get());render(s);return s;}
 async function devices(){try{const list=await result(api.nativeVoice('devices'));const items=Array.isArray(list)?list:list.inputs||list.devices||[];for(const d of items){const value=String(d.id??d.deviceId??''),name=d.name||d.label;if(!name||!value||[...$('agentMic').options].some(o=>o.value===value))continue;const o=document.createElement('option');o.value=value;o.textContent=name;$('agentMic').append(o);}if(config)$('agentMic').value=config.voice?.inputDeviceId||'';}catch{} }
 window.islandOpenVoiceAssistant=async({start=false}={})=>{interrupted=null;window.islandVoiceDismissed=false;keepOpen=true;tab('voiceAssistant');await expand(true);const s=await refresh();hold();if(start&&s.microphone.mode!=='ptt')await continuous.begin();};
 $('voiceAssistantSettings').onclick=()=>api.settings('voice');$('agentReadingContext').onclick=()=>api.settings('voice');
 $('agentStart').onclick=async()=>{try{if(recording)await result(api.nativeVoice('finish'));else await window.islandOpenVoiceAssistant({start:true});}catch(e){waiting=false;phase('error',e.message);hold();showError(e);}};
 $('agentNewConversation').onclick=async()=>{continuous.stop();interrupted=null;try{await result(api.nativeVoice('cancel'));await result(api.resetVoiceConversation());window.islandStopSpeech?.();answer='';$('agentHeard').textContent='';$('agentAnswer').textContent='';$('agentCopy').disabled=true;$('agentReplay').disabled=true;keepOpen=true;phase('ready','New conversation');hold();}catch(e){showError(e);}};
 const interrupt=async(command='stop')=>{continuous.stop();interrupted=command;window.islandVoiceDismissed=command==='hide';window.islandStopSpeech?.();await api.nativeVoice('cancel');recording=false;waiting=false;speaking=false;keepOpen=command!=='hide';phase('ready','Stopped');hold();if(command==='hide')await expand(false);};
 $('agentStop').onclick=()=>interrupt();api.onInterruption?.(({command})=>interrupt(command).catch(showError));
 $('agentCopy').onclick=()=>api.copy(answer);$('agentReplay').onclick=()=>{interrupted=null;return window.islandSpeak?.(answer).catch(showError);};
 $('agentWake').onclick=async()=>{try{const s=await refresh(),mode=s.microphone.mode==='always'?'manual':'always';await result(api.save({microphone:{mode},companion:{...s.companion,wakeEnabled:mode==='always'}}));await refresh();}catch(e){phase('error',e.message);}};
 $('agentMic').onchange=async()=>{try{await result(api.save({voice:{inputDeviceId:$('agentMic').value}}));await refresh();}catch(e){showError(e);await refresh();}};
 $('agentVoiceChoice').onchange=async()=>{try{await result(api.save({companion:{...config.companion,[window.NotchProviders.voiceField(config)]:$('agentVoiceChoice').value}}));await refresh();}catch(e){showError(e);await refresh();}};
 api.onSettings(render);api.onMicrophone(()=>refresh().catch(showError));refresh().then(devices).catch(showError);
 window.addEventListener('island:view',e=>{if(e.detail==='voiceAssistant'){keepOpen=true;hold();animate();devices();}else{keepOpen=false;hold();cancelAnimationFrame(frame);frame=0;}});
 window.addEventListener('island:expanded',e=>{if(e.detail)animate();else{cancelAnimationFrame(frame);frame=0;}});
 api.onVoice(event=>{
  continuous.voice(event);if(event.phase==='error'&&event.code==='no_speech'&&continuous.enabled){recording=false;waiting=false;speaking=false;keepOpen=true;phase('ready','Listening…');hold();return;}
  if(event.phase==='listening'){interrupted=null;kind=event.kind;if(!['chat','command','ptt','live'].includes(kind))return;recording=true;keepOpen=true;waiting=false;answer='';follow=true;$('agentHeard').textContent='';$('agentAnswer').textContent='';phase('listening','I’m listening');$('agentStartLabel').textContent=kind==='live'?'Stop listening':'Send question';document.body.classList.remove('has-voice-hud');api.setVoiceHud(false);tab('voiceAssistant');expand(true).catch(showError);hold();}
  if(!['chat','command','ptt','live'].includes(kind))return;
  if(event.phase==='level'){input=Math.min(1,Math.max(0,Number(event.level)||0));animate();return;}
  if(event.phase==='partial')$('agentHeard').textContent=event.text;
  if(event.phase==='processing'){recording=false;waiting=true;phase('processing','Thinking it through');hold();}
  if(event.phase==='delta'){if(event.raw)$('agentHeard').textContent=event.raw;answer+=event.delta;$('agentAnswer').textContent=answer;scroll();}
  if(event.phase==='answer'){recording=false;follow=true;answer=event.text;$('agentHeard').textContent=event.raw||'';$('agentAnswer').textContent=answer;$('agentCopy').disabled=!answer;$('agentReplay').disabled=!answer||!config?.speak;waiting=!!config?.speak;keepOpen=waiting;phase(waiting?'processing':'ready',waiting?'Preparing voice':'Answer ready · spoken replies off');hold();scroll();}
  if(event.phase==='liveText'){if(event.raw)$('agentHeard').textContent=event.raw;if(event.text){answer=event.text;$('agentAnswer').textContent=answer;}scroll();}
  if(event.phase==='liveTurn')phase('listening','Listening');
  if(interrupted&&['idle','liveStop'].includes(event.phase)){keepOpen=interrupted!=='hide';phase('ready','Stopped');hold();return;}
  if(['idle','liveStop','error'].includes(event.phase)){recording=false;waiting=false;speaking=false;keepOpen=false;phase(event.error?'error':'ready',event.error||'Ready when you are');hold();}
  if(!recording)$('agentStartLabel').textContent=continuous.enabled?'Listening on':'Start listening';
 });
 window.addEventListener('island:speech',e=>{if(interrupted)return;if(!['chat','command','ptt','live'].includes(kind)&&page.hidden)return;const p=e.detail.phase;continuous.speech(p);waiting=['queued','processing'].includes(p);speaking=p==='speaking';if(['ready','error'].includes(p))keepOpen=false;phase(waiting?'processing':p,e.detail.message||({speaking:'Speaking',ready:'Ready when you are',error:'Voice unavailable',queued:'Preparing voice'}[p]||'Preparing voice'));hold();});
 window.addEventListener('island:output-level',e=>{output=e.detail;animate();});
 api.onVisibility?.(visible=>{if(!visible&&continuous.enabled)interrupt('hide').catch(showError);});
 document.addEventListener('keydown',event=>{if(event.key==='Escape'&&continuous.enabled){event.preventDefault();event.stopImmediatePropagation();interrupt().catch(showError);}},{capture:true});
 window.addEventListener('pagehide',()=>{continuous.stop();cancelAnimationFrame(frame);orb.dispose();});
})();
