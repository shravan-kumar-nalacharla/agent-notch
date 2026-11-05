'use strict';
(()=>{
  if(new URLSearchParams(location.search).has('settings'))return;
  const api=window.island,$=id=>document.getElementById(id);
  let config,recording=false,answer='',kind='';
  const page=document.createElement('section');page.id='voiceAssistant';page.className='page voice-assistant';page.hidden=true;page.dataset.phase='ready';
  page.innerHTML='<div class="page-head"><h1>Voice assistant</h1><button id="voiceAssistantSettings" class="soft-chip">Voice settings</button></div><div class="voice-stage"><div class="voice-orb" aria-hidden="true"><i></i><span class="agent-wave"><b></b><b></b><b></b><b></b><b></b><b></b><b></b></span></div><div class="voice-copy"><strong id="agentVoiceStatus" role="status">Ready</strong><small id="agentWakeStatus"></small><small id="agentVoiceHint"></small></div></div><div class="voice-exchange"><p id="agentHeard" dir="auto"></p><p id="agentAnswer" dir="auto"></p></div><div class="voice-actions"><button id="agentStart">Start listening</button><button id="agentStop">Stop</button><button id="agentWake">Enable calling by name</button></div>';
  document.querySelector('.view-stack').append(page);
  const nav=document.createElement('button');nav.dataset.tab='voiceAssistant';nav.title='Voice assistant';nav.setAttribute('aria-label','Voice assistant');nav.innerHTML='<svg viewBox="0 0 24 24"><path d="M4 10v4M8 6v12M12 3v18M16 6v12M20 10v4"/></svg><span>Voice</span>';document.querySelector('nav').insertBefore(nav,document.querySelector('nav [data-tab=notes]'));nav.onclick=()=>tab('voiceAssistant');
  function phase(value,label){page.dataset.phase=value;$('agentVoiceStatus').textContent=label;}
  function render(s){config=s;const p=s.microphoneStatus||s.microphone,name=s.companion?.name||'Cutie';
    $('agentStart').disabled=!!p.blocked||p.mode==='ptt';$('agentStart').textContent=recording?'Finish question':'Start listening';
    $('agentVoiceHint').textContent=p.blocked?p.reason:p.mode==='ptt'?'Hold '+p.pttShortcut+' to ask; release for an answer.':'Ask a question or give a Windows command. Finish manually or pause after speaking.';
    $('agentWakeStatus').textContent=s.wakeStatus?.error?s.wakeStatus.error:p.blocked?'Name activation paused while microphone is muted.':s.wakeStatus?.enabled?'Listening for “Hey '+name+'”':p.mode==='always'?'Starting name activation…':'Name activation is off.';
    $('agentWake').textContent=p.mode==='always'?'Turn off name activation':'Enable calling by name';
    if(p.blocked){recording=false;phase('muted',p.reason||'Microphone muted');}else if(page.dataset.phase==='muted')phase('ready','Ready');
  }
  async function refresh(){const s=await result(api.get());render(s);return s;}
  window.islandOpenVoiceAssistant=async({start=false}={})=>{tab('voiceAssistant');await expand(true);const s=await refresh();if(start){if(s.microphone.mode==='ptt')return;await startNativeVoice('chat');}};
  $('voiceAssistantSettings').onclick=()=>api.settings('voice');
  $('agentStart').onclick=async()=>{try{if(recording)await result(api.nativeVoice('finish'));else await window.islandOpenVoiceAssistant({start:true});}catch(e){phase('error',e.message);showError(e);}};
  $('agentStop').onclick=async()=>{await api.nativeVoice('cancel');window.islandStopSpeech?.();recording=false;phase('ready','Stopped');};
  $('agentWake').onclick=async()=>{try{const s=await refresh(),mode=s.microphone.mode==='always'?'manual':'always';await result(api.save({microphone:{mode},companion:{...s.companion,wakeEnabled:mode==='always'}}));await refresh();}catch(e){phase('error',e.message);}};
  api.onSettings(render);api.onMicrophone(()=>refresh().catch(showError));refresh().catch(showError);
  api.onVoice(event=>{
    if(event.phase==='listening'){kind=event.kind;if(!['chat','command','ptt','live'].includes(kind))return;recording=true;answer='';$('agentHeard').textContent='';$('agentAnswer').textContent='';phase('listening','Listening');$('agentStart').textContent='Finish question';document.body.classList.remove('has-voice-hud');api.setVoiceHud(false);tab('voiceAssistant');expand(true).catch(showError);}
    if(!['chat','command','ptt','live'].includes(kind))return;
    if(event.phase==='level'){page.style.setProperty('--agent-level',String(Math.min(1,Math.max(0,Number(event.level)||0))));return;}
    if(event.phase==='partial')$('agentHeard').textContent=event.text;
    if(event.phase==='processing'){recording=false;phase('processing','Thinking');}
    if(event.phase==='delta'){if(event.raw)$('agentHeard').textContent=event.raw;answer+=event.delta;$('agentAnswer').textContent=answer;}
    if(event.phase==='answer'){recording=false;$('agentHeard').textContent=event.raw||'';$('agentAnswer').textContent=event.text;phase('ready','Answer ready');}
    if(event.phase==='liveText'){if(event.raw)$('agentHeard').textContent=event.raw;if(event.text)$('agentAnswer').textContent=event.text;}
    if(event.phase==='liveTurn')phase('listening','Listening');
    if(['idle','liveStop','error'].includes(event.phase)){recording=false;phase(event.error?'error':'ready',event.error||'Ready');}
    if(!recording)$('agentStart').textContent='Start listening';
  });
  window.addEventListener('island:speech',e=>{if(['chat','command','ptt','live'].includes(kind))phase(e.detail.phase,e.detail.message||({speaking:'Speaking',ready:'Ready',error:'Voice unavailable'}[e.detail.phase]||'Ready'));});
})();
