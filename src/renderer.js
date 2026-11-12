'use strict';

const $ = id => document.getElementById(id);
const settingsMode = new URLSearchParams(location.search).has('settings');
const isSmoke = new URLSearchParams(location.search).has('test');
const hoverEnabled = !isSmoke || new URLSearchParams(location.search).has('pointerTest');


let state;
let expanded = false;let windowPolicy='normal';window.island.onWindowPolicy?.(value=>{windowPolicy=value.behavior;if(windowPolicy!=='normal'&&!settingsMode)expand(false).catch(showError);});
let recorder;
let stream;
window.island.onMicrophone?.(value=>{if(value.blocked){cancelled=true;clearTimeout(recordingTimer);if(recorder?.state==='recording')recorder.stop();stream?.getTracks().forEach(track=>track.stop());window.islandStopMicTest?.();window.islandStopSpeech?.(false);}});
let chunks = [];
let recordingTimer;
let cancelled = false;
let busy = false;
let noteTimer;
let activeView = 'home';
let leaveTimer;
let nativeRecording = false;let currentVoiceKind='';
let nativeProcessing = false;
let lastHeight = 0;
let errorTimer;
let surfaceSerial=0;
let suppressHover=false;
let rawTranscript='',pendingDraftId='',voiceStreamMessage,voiceStreamUser;
let disposed=false,captureOverlayActive=false,lastInteractionAt=0;
if (settingsMode) document.title = 'Agent Notch Settings';

function setMascot(mode) {
  for (const name of ['closed', 'open', 'listening', 'thinking', 'success', 'error']) {
    document.body.classList.toggle(`mascot-${name}`, mode === name);
  }
}
setMascot('closed');

window.island.onCollapse(() => expand(false));
window.island.onRestore?.(value=>{if(value?.explicit)window.islandVoiceDismissed=false;expand(true).catch(showError);});

function error(message = '') {
  const settingsError = $('error');
  const outsideError = $('outsideError');
  clearTimeout(errorTimer);
  if (settingsError) settingsError.textContent = settingsMode ? message : '';
  if (outsideError) outsideError.textContent = settingsMode ? '' : message;
  if (!settingsMode) $('status').textContent = message || 'Ready';
  if (message) {
    setMascot('error');
    if(settingsMode)return;
    errorTimer = setTimeout(() => {
      if (settingsError) settingsError.textContent = '';
      if (outsideError) outsideError.textContent = '';
      if (!settingsMode && $('status').textContent === message) {
        $('status').textContent = state?.profileName ? `Ready, ${state.profileName}` : 'Ready';
      }
      setMascot(expanded ? 'open' : 'closed');
    }, 1100);
  }
}

async function result(promise) {
  const response = await promise;
  if (!response.ok) throw new Error(response.error);
  return response.value;
}

function syncViewClass(name) {
  for (const item of ['home', 'assistant', 'voiceAssistant', 'notes', 'focus', 'tools', 'agents']) {
    document.body.classList.toggle(`view-${item}`, item === name);
  }
}

function sendHitbox(){
  if(settingsMode||disposed)return;const el=expanded||document.body.classList.contains('has-reminder-hud')||document.body.classList.contains('has-voice-hud')||document.body.classList.contains('has-quote-hud')?$('island'):$('activationTarget');
  window.island.hitbox(el.getBoundingClientRect().toJSON());
}
async function syncSurfaceHeight(){sendHitbox();}
async function setExpanded(on){
  if(settingsMode||expanded===on)return;
  const peek=on&&document.body.classList.contains('has-quote-hud')?$('island').getBoundingClientRect():null;
  if(on)document.body.classList.remove('has-quote-hud');
  const serial=++surfaceSerial;expanded=on;setMascot(on?'open':'closed');document.body.classList.add('surface-animating');document.body.classList.toggle('expanded',on);if(on)$('body').hidden=false;
  if(on){syncViewClass(activeView);startBlink();maybeQuietMoment();}else{stopBlink();hideQuietMoment();}
  result(window.island.expand({on,view:activeView})).catch(showError);
  const style=getComputedStyle(document.body),animation=IslandSurface.animateSurface($('island'),on,{width:parseFloat(style.getPropertyValue('--island-width'))||470,height:parseFloat(style.getPropertyValue(document.body.classList.contains('rich-media')?'--rich-height':'--compact-height'))||250,mode:state?.appearance?.motion||'standard',floating:document.body.classList.contains('shape-pill'),initial:peek?{width:peek.width,height:peek.height,y:peek.y,scale:1,opacity:1,radius:22}:null});
  if(on&&state?.appearance?.motion!=='off')$('body').animate([{opacity:0,transform:'translateY(-8px)'},{opacity:1,transform:'translateY(0)'}],{delay:85,duration:300,easing:'ease-out'});
  const start=performance.now();function frame(){sendHitbox();if(performance.now()-start<750)requestAnimationFrame(frame);}requestAnimationFrame(frame);
  animation.then(()=>{if(surfaceSerial===serial&&expanded===on){document.body.classList.remove('surface-animating');if(!on)$('body').hidden=true;sendHitbox();}});
  window.dispatchEvent(new CustomEvent('island:expanded',{detail:on}));
}
function canAutoClose(){return !window.islandVoiceHold?.()&&!document.body.classList.contains('is-capturing')&&!document.body.classList.contains('has-windows-task')&&!document.body.classList.contains('has-reminder-hud')&&!captureOverlayActive&&!state?.appearance?.pinned&&state?.appearance?.autoClose!==false&&!nativeRecording&&!nativeProcessing&&recorder?.state!=='recording'&&!document.body.classList.contains('is-dragging')&&!(document.hasFocus()&&/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName||'')&&Date.now()-lastInteractionAt<8000);}
let forceFileOpen=false;const motion=new IslandMotion({open:()=>setExpanded(true),close:()=>setExpanded(false),canOpen:()=>!window.islandVoiceDismissed&&(forceFileOpen||!document.body.classList.contains('has-reminder-hud')&&!document.body.classList.contains('has-quote-hud')),canClose:canAutoClose,changed:value=>document.body.dataset.motionState=value});
window.addEventListener('island:control-drag',e=>motion.lock(e.detail===true||nativeRecording||nativeProcessing||!!window.islandVoiceHold?.()));
window.addEventListener('island:voice-hold',e=>motion.lock(nativeRecording||nativeProcessing||e.detail===true));
async function expand(on=true){if(settingsMode)return;return on?motion.open():motion.close();}
window.island.onCaptureOverlay?.(({active})=>{captureOverlayActive=active;if(active){motion.cancel('leave');}else if(!motion.inside&&expanded)motion.leave();});
window.island.onVisibility?.(visible=>{if(!visible&&expanded)expand(false).catch(showError);});
window.island.onHover?.(({inside})=>{if(settingsMode||!hoverEnabled||windowPolicy!=='normal')return;inside?motion.enter():motion.leave();});
let panelResize;
window.island.onLayout?.(layout=>{
  const panel=$('island'),before=panel.getBoundingClientRect();panelResize?.cancel();
  document.body.style.setProperty('--island-width',layout.panelWidth+'px');document.body.style.setProperty('--compact-height',layout.panelHeight+'px');document.body.style.setProperty('--rich-height',layout.richHeight+'px');
  const height=document.body.classList.contains('rich-media')?layout.richHeight:layout.panelHeight;
  if(expanded&&!document.body.classList.contains('surface-animating')&&state?.appearance?.motion!=='off'&&!matchMedia('(prefers-reduced-motion: reduce)').matches&&(Math.abs(before.width-layout.panelWidth)>1||Math.abs(before.height-height)>1)){
    const animation=panel.animate([{width:before.width+'px',height:before.height+'px'},{width:layout.panelWidth+'px',height:height+'px'}],{duration:180,easing:'ease-out',fill:'both'});panelResize=animation;animation.finished.catch(()=>{}).finally(()=>{animation.cancel();if(panelResize===animation)panelResize=null;sendHitbox();});
  }
  requestAnimationFrame(sendHitbox);
});
window.island.layout?.().then(r=>{if(r.ok){document.body.style.setProperty('--island-width',r.value.panelWidth+'px');document.body.style.setProperty('--compact-height',r.value.panelHeight+'px');document.body.style.setProperty('--rich-height',r.value.richHeight+'px');requestAnimationFrame(sendHitbox);}});
$('activationTarget').onclick=()=>{window.islandVoiceDismissed=false;return window.island.activate?window.island.activate({revealOnly:true}).then(result).catch(showError):expand(true);};
function tab(name) {
  if (name === 'focus') { window.islandOpenTool?.('timer'); return; }
  if (name === 'settings' && !settingsMode) {
    window.island.settings();
    return;
  }
  const page = $(name);
  if (!page) return;
  activeView = name;
  if(name!=='tools'){document.body.classList.toggle('rich-media',name==='voiceAssistant'||name==='assistant');window.island.toolSurface?.({id:''}).catch(showError);}
  if(name!=='home')hideQuietMoment();
  syncViewClass(name);
  document.querySelectorAll('.page').forEach(element => {
    element.hidden = element.id !== name;
  });
  document.querySelectorAll('nav [data-tab]').forEach(button => {
    button.classList.toggle('active', button.dataset.tab === name);
  });
  if(name!=='home')hideQuietMoment();
  if (expanded && !settingsMode) syncSurfaceHeight(true).catch(showError);
  window.dispatchEvent(new CustomEvent('island:view', { detail: name }));if(!settingsMode&&expanded)IslandSurface.animatePage(page,1,state?.appearance?.motion);
}

function showError(value) {
  if(value)window.dispatchEvent(new Event('island:ui-error'));
  error(value?.message || String(value || ''));
}
window.islandShowError = showError;

window.addEventListener('island:navigate', event => {
  tab(event.detail);
  expand(true).catch(showError);
});
window.addEventListener('island:reminder-closed',()=>expand(!!state?.appearance?.pinned).catch(showError));
window.addEventListener('island:layout-change',()=>requestAnimationFrame(sendHitbox));
window.islandSurfaceResize = () => syncSurfaceHeight(true).catch(() => {});

document.querySelectorAll('nav [data-tab]').forEach(button => {
  button.addEventListener('click', () => tab(button.dataset.tab));
});

$('face').onclick = () => expand(true);
$('face').addEventListener('pointerdown',()=>{ $('face').classList.remove('face-poke'); void $('face').offsetWidth; $('face').classList.add('face-poke'); setTimeout(()=>$('face').classList.remove('face-poke'),360); });
$('collapse').onclick = () => {
  if (state?.appearance?.pinned) {
    $('status').textContent = 'Pinned open';
    return;
  }
  expand(false);
};
$('hide').onclick = () => window.island.hide();
$('openSettings').onclick = () => window.island.settings();
const openFileActions=paths=>window.island.openFileActions?.(paths).catch(showError);
$('openFileActions').onclick = () => openFileActions();
$('homeFiles').onclick = () => openFileActions();

$('closeSettings').onclick = () => window.island.closeWindow ? window.island.closeWindow() : window.close();
$('pin').onclick = async () => {
  try {
    const pinned = !state?.appearance?.pinned;
    state = await result(window.island.save({ appearance: { pinned } }));
    applyState(state);
    if (pinned) await expand(true);
  } catch (caught) {
    showError(caught);
  }
};

$('island').addEventListener('mouseenter',()=>{if(!settingsMode&&hoverEnabled&&windowPolicy==='normal')motion.enter();});
$('island').addEventListener('mouseleave',()=>{if(!settingsMode&&hoverEnabled)motion.leave();});
function scheduleAutoClose(){motion.leave();}
window.addEventListener('island:test-leave',()=>motion.leave());
window.island.onFileDetected?.(({name,count})=>{$('status').textContent=count>1?`${count} files detected`:`${name} detected`;clearTimeout(window.__fileStatusTimer);window.__fileStatusTimer=setTimeout(()=>{if($('status').textContent.includes('detected'))$('status').textContent='Ready';},3500);});
window.island.onForceOpen?.(()=>{const panel=document.getElementById('notchReminder');if(panel)panel.hidden=true;document.body.classList.remove('has-reminder-hud','has-quote-hud');forceFileOpen=true;expand(true).finally(()=>setTimeout(()=>{forceFileOpen=false;},1200));});
window.addEventListener('island:test-enter',()=>motion.enter());
document.addEventListener('focusout',()=>setTimeout(()=>{if(!motion.inside&&expanded)motion.leave();},0));
document.addEventListener('pointerdown',()=>{lastInteractionAt=Date.now();});
document.addEventListener('keydown',()=>{lastInteractionAt=Date.now();});
document.documentElement.addEventListener('mouseleave',()=>{motion.inside=false;if(!settingsMode&&expanded)scheduleAutoClose();});
window.addEventListener('blur',()=>setTimeout(()=>{if(!motion.inside&&expanded&&!settingsMode)scheduleAutoClose();},150));
setInterval(()=>{if(settingsMode||!expanded||motion.inside||document.body.classList.contains('surface-animating')||['CLOSING_GRACE','COLLAPSING'].includes(motion.state))return;if(canAutoClose())scheduleAutoClose();},1000);
window.addEventListener('dragenter', () => { motion.cancel('leave'); document.body.classList.add('is-dragging'); });
window.addEventListener('dragend', () => document.body.classList.remove('is-dragging'));
window.addEventListener('drop', () => document.body.classList.remove('is-dragging'));
window.addEventListener('dragover', event => {if(event.dataTransfer?.types?.includes('Files')){event.preventDefault();document.body.classList.add('file-dragging');}});
window.addEventListener('dragleave', event => {if(!event.relatedTarget)document.body.classList.remove('file-dragging');});
document.addEventListener('drop', async event => {const files=[...event.dataTransfer?.files||[]];if(!files.length)return;event.preventDefault();event.stopPropagation();document.body.classList.remove('file-dragging');const paths=files.map(file=>window.island.filePath?.(file)).filter(Boolean);if(!paths.length)return;if(event.target.closest('#homeShelf')){try{const lib=await window.island.library('shelf:add',{paths});renderHomeShelf();}catch(error){showError(error);}return;}await openFileActions(paths);},true);
document.addEventListener('contextmenu', event => {
  event.preventDefault();
  window.island.settings();
});

function updateClock() {
  const now = new Date();
  $('time').textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  $('date').textContent = now.toLocaleDateString([], { weekday: 'short', day: '2-digit', month: 'short' });
}
updateClock();
setInterval(updateClock, 15000);
const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)');
let blinkTimer,blinkCloseTimer;
function stopBlink(){clearTimeout(blinkTimer);clearTimeout(blinkCloseTimer);document.querySelectorAll('.eye-lid').forEach(el=>el.classList.remove('blinking'));}
function startBlink(){
  stopBlink();if(!expanded||state?.appearance?.motion==='off')return;
  blinkTimer=setTimeout(()=>{if(!expanded)return;const eyes=[...document.querySelectorAll('.eye-lid')];eyes.forEach(el=>el.classList.add('blinking'));blinkCloseTimer=setTimeout(()=>{eyes.forEach(el=>el.classList.remove('blinking'));if(Math.random()<.13){blinkCloseTimer=setTimeout(()=>{eyes.forEach(el=>el.classList.add('blinking'));blinkCloseTimer=setTimeout(()=>{eyes.forEach(el=>el.classList.remove('blinking'));startBlink();},140);},150);}else startBlink();},150);},3000+Math.random()*5000);
}
let quietTimer,currentQuote,quietSerial=0,quotePinned=false,quoteAutomatic=false,quoteAnimation;
$('island').append($('quietMoment'));
function hideQuietMoment(animate=false){const serial=++quietSerial;clearTimeout(quietTimer);quoteAnimation?.cancel();const finish=()=>{if(serial!==quietSerial)return;$('quietMoment').hidden=true;document.body.classList.remove('has-quote-hud');quoteAutomatic=false;window.island.setQuoteHud?.(false);requestAnimationFrame(sendHitbox);};if(animate===true&&quoteAutomatic&&state?.appearance?.motion!=='off'&&!matchMedia('(prefers-reduced-motion: reduce)').matches){quoteAnimation=$('quietMoment').animate([{opacity:1,transform:'translateY(0)'},{opacity:0,transform:'translateY(-36px)'}],{duration:750,easing:'cubic-bezier(.55,0,.8,.4)',fill:'forwards'});quoteAnimation.finished.catch(()=>{}).then(finish);}else finish();}
async function maybeQuietMoment(manual=false){
 if(settingsMode||!expanded||activeView!=='home'||busy||nativeRecording||nativeProcessing||!manual&&!$('quietMoment').hidden)return;
 const serial=++quietSerial;
 try{const r=await result(window.island.quiet('request',{manual,typing:/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName||'')}));if(!r||serial!==quietSerial||!expanded||activeView!=='home'||busy||nativeRecording||nativeProcessing)return;
 quoteAutomatic=false;$('quietMoment').dataset.mode='inline';currentQuote=r;quotePinned=false;$('quietPin').setAttribute('aria-pressed','false');$('quietText').textContent=r.text;$('quietText').lang=r.lang;$('quietText').title=r.reason;$('quietMoment').dataset.id=r.id;$('quietMoment').hidden=false;$('quietFavorite').textContent='â™¡';quietTimer=setTimeout(()=>hideQuietMoment(),8000);
 }catch(e){if(manual)showError(e);}
}
$('quietMoment').onmouseenter=()=>{if(!quoteAutomatic)clearTimeout(quietTimer);};
$('quietMoment').onmouseleave=()=>{if(!quoteAutomatic&&!quotePinned)quietTimer=setTimeout(hideQuietMoment,8000);};
$('quietMoment').onfocusin=()=>{if(!quoteAutomatic)clearTimeout(quietTimer);};
$('quietDismiss').onclick=()=>{quotePinned=false;hideQuietMoment();};
$('quietPin').onclick=()=>{quotePinned=!quotePinned;$('quietPin').setAttribute('aria-pressed',String(quotePinned));clearTimeout(quietTimer);if(!quoteAutomatic&&!quotePinned)quietTimer=setTimeout(hideQuietMoment,8000);};
$('quietSkip').onclick=()=>maybeQuietMoment(true);
$('quietFavorite').onclick=async()=>{const r=await result(window.island.quiet('favorite',{id:currentQuote.id}));$('quietFavorite').textContent=r.quiet.favorites.includes(currentQuote.id)?'â™¥':'â™¡';};
window.island.onThoughtPopup?.(async r=>{
 if(settingsMode)return;if(expanded||busy||nativeRecording||nativeProcessing||document.body.classList.contains('has-reminder-hud')||!state?.quietMoments?.enabled){window.island.setQuoteHud(false);return;}
 hideQuietMoment();const serial=++quietSerial;currentQuote=r;quoteAutomatic=true;quotePinned=false;$('quietMoment').dataset.mode='automatic';$('quietText').textContent=r.text;$('quietText').lang=r.lang;$('quietMoment').dataset.id=r.id;$('quietMoment').hidden=false;document.body.classList.add('has-quote-hud');
 const width=Math.max(250,Math.min(window.innerWidth-48,r.text.length<85?330:440));document.body.style.setProperty('--thought-width',width+'px');document.body.style.setProperty('--thought-height','92px');await new Promise(requestAnimationFrame);if(serial!==quietSerial)return;const height=Math.max(56,Math.min(196,$('quietText').scrollHeight+32));document.body.style.setProperty('--thought-height',height+'px');
 const reduced=state.appearance?.motion==='off'||matchMedia('(prefers-reduced-motion: reduce)').matches;if(!reduced){$('quietMoment').animate([{opacity:0,transform:'translateY(-10px) scale(.98)'},{opacity:1,transform:'translateY(0) scale(1)'}],{duration:750,easing:'cubic-bezier(.16,1,.3,1)'});$('quietText').animate([{opacity:0,transform:'translateY(-30px)'},{opacity:1,transform:'translateY(0)'}],{duration:750,easing:'cubic-bezier(.22,1,.36,1)',fill:'backwards'});}
 window.island.setQuoteHud(true);requestAnimationFrame(sendHitbox);quietTimer=setTimeout(()=>hideQuietMoment(true),6250);await new Promise(resolve=>setTimeout(resolve,800));if(serial===quietSerial&&!$('quietMoment').hidden&&document.visibilityState==='visible')await window.island.quiet('shown',{token:r.token});
});
window.island.onQuietSuppress?.(hideQuietMoment);
window.island.onSettings?.(async value=>{if(!value.quietMoments.enabled){hideQuietMoment();return;}if(currentQuote&&!$('quietMoment').hidden){const id=currentQuote.id,r=await window.island.quiet('current',{id});if(r.ok&&currentQuote.id===id){currentQuote={...currentQuote,...r.value};$('quietText').textContent=r.value.text;$('quietText').lang=r.value.lang;}}});
window.islandAnotherQuote=()=>maybeQuietMoment(true);
window.addEventListener('pagehide',()=>{disposed=true;motion.dispose();stopBlink();clearTimeout(quietTimer);});

function message(text, role) {
  if(window.ElevenUI?.message)return window.ElevenUI.message(text,role);
  const element = document.createElement('div');
  element.className = `message ${role}`;
  element.textContent = text;
  $('messages').append(element);
  $('messages').scrollTop = $('messages').scrollHeight;
  return element;
}

let activeAskId='',streamMessage;
window.addEventListener('island:task-error',event=>{if(!activeAskId){if(window.islandVoiceSession){$('agentAnswer').textContent=event.detail;tab('voiceAssistant');}else{message(event.detail,'assistant');tab('assistant');}}});
window.island.onAssistantDelta?.(({id,delta})=>{if(id!==activeAskId||!streamMessage)return;streamMessage.textContent+=delta;$('messages').scrollTop=$('messages').scrollHeight;});
async function ask(text) {
  if (busy || !text.trim()) return;
  busy = true;
  error();
  activeAskId=crypto.randomUUID();window.dispatchEvent(new CustomEvent('island:chat-busy',{detail:true}));$('send').title='Stop response';$('send').setAttribute('aria-label','Stop response');
  $('status').textContent = 'Thinking...';
  tab('assistant');
  message(text, 'user');
  try {
    streamMessage=message('', 'assistant');
    const answer = await result(window.island.ask({id:activeAskId,text}));
    streamMessage.textContent=answer;
    if (state?.speak && state.companion?.readTypedReplies) {
      window.islandSpeak(answer).catch(showError);
    }
  } catch (caught) {
    if(streamMessage)streamMessage.textContent=caught.message||String(caught);
    showError(caught);
  } finally {
    activeAskId='';streamMessage=null;busy = false;window.dispatchEvent(new CustomEvent('island:chat-busy',{detail:false}));
    $('send').title='Send';$('send').setAttribute('aria-label','Send message');
    $('send').disabled = false;
    $('status').textContent = 'Ready';
    syncSurfaceHeight(true).catch(() => {});
  }
}

$('chat').onsubmit = event => {
  event.preventDefault();
  if(activeAskId){window.island.cancelAsk(activeAskId);return;}
  const text = $('question').value;
  $('question').value = '';
  ask(text);
};

$('homeAsk').onclick = () => {
  tab('assistant');
  requestAnimationFrame(() => $('question').focus());
};

async function startNativeVoice(kind = 'chat') {
  state = await result(window.island.get());
  const conversation=['chat','command','ptt'].includes(kind),provider=conversation&&state.companion?.chatEngine==='gemini_live'?'gemini':conversation&&state.companion?.chatEngine==='sarvam'?'sarvam':state.speech,offline=provider==='local'||provider==='whisper';
  if (!offline&&!state.configured[provider]) {
    $('status').textContent = 'API key needed';
    await result(window.island.settings());
    throw new Error(`Add your ${provider} API key in AI & API keys to start voice.`);
  }
  if(!offline&&!state.languages.cloudAudioConsent){await result(window.island.settings('voice'));throw new Error('Allow cloud audio beside Enable the global voice hotkey, then save.');}
  await result(window.island.nativeVoice('start', { kind }));
}

$('homeVoice').onclick=()=>window.islandOpenVoiceAssistant({start:true}).catch(showError);

$('homeScreen').onclick = () => {
  tab('assistant');
  $('question').placeholder = 'What should I help you do on this screen?';
  $('question').focus();
  $('status').textContent = 'Describe the screen task, then use Screen guidance';
};

async function toggleChatVoice() {
  if (nativeRecording) {
    try {
      await result(window.island.nativeVoice('finish'));
    } catch (caught) {
      showError(caught);
    }
    return;
  }
  if (recorder?.state === 'recording') {
    recorder.stop();
    return;
  }
  if (busy) return;
  try {
    await expand();
    tab('assistant');
    error();
    cancelled = false;
    state = await result(window.island.get());
    const provider=state.companion?.chatEngine === 'gemini_live' ? 'gemini' : state.companion?.chatEngine === 'sarvam' ? 'sarvam' : state.speech,offline=provider==='local'||provider==='whisper';
    if (!offline&&!state.configured[provider]) {
      $('status').textContent = 'API key needed';
      await result(window.island.settings());
      throw new Error(`Add your ${provider} API key in AI & API keys to start voice chat.`);
    }
    if(!offline&&!state.languages.cloudAudioConsent){await result(window.island.settings('voice'));throw new Error('Allow cloud audio in Voice typing, then save.');}
    if (window.island.nativeVoice) {
      await result(window.island.nativeVoice('start', { kind: 'chat' }));
      return;
    }
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const permission=await window.island.microphoneState();if(!permission.ok||permission.value.blocked||permission.value.mode==='ptt'){stream.getTracks().forEach(track=>track.stop());throw new Error('Microphone is muted or requires Push-to-Talk.');}
    const mimeType = ['audio/webm;codecs=opus', 'audio/webm'].find(type => MediaRecorder.isTypeSupported(type));
    if (!mimeType) throw new Error('This system cannot record WebM audio.');
    recorder = new MediaRecorder(stream, { mimeType });
    chunks = [];
    recorder.ondataavailable = event => {
      if (event.data.size) chunks.push(event.data);
    };
    recorder.onstop = async () => {
      clearTimeout(recordingTimer);
      stream.getTracks().forEach(track => track.stop());
      $('mic').classList.remove('recording');
      $('mic').title = 'Voice assistant';
      $('mic').setAttribute('aria-label', 'Open voice assistant');
      if (cancelled) {
        chunks = [];
        $('status').textContent = 'Recording cancelled';
        return;
      }
      busy = true;
      $('status').textContent = 'Transcribing...';
      try {
        const blob = new Blob(chunks, { type: mimeType });
        const audio = await blob.arrayBuffer();
        chunks = [];
        const text = await result(window.island.transcribe({ audio, mime: mimeType, language: $('language').value }));
        $('transcript').value = text;
        rawTranscript = text;
        $('transcriptBox').hidden = false;
      } catch (caught) {
        showError(caught);
      } finally {
        busy = false;
        $('status').textContent = 'Ready';
      }
    };
    recorder.start();
    $('mic').classList.add('recording');
    $('mic').title = 'Stop recording';
    $('mic').setAttribute('aria-label', 'Stop recording');
    $('status').textContent = event.kind==='live'?'Gemini Live Â· listening Â· mic to stop':'Listening...';
    recordingTimer = setTimeout(() => {
      if (recorder.state === 'recording') recorder.stop();
    }, 120000);
  } catch (caught) {
    stream?.getTracks().forEach(track => track.stop());
    showError(caught);
  }
}

$('insertDraft').onclick=async()=>{try{await result(window.island.nativeVoice('insertDraft',{id:pendingDraftId,text:$('transcript').value}));$('insertDraft').hidden=true;}catch(e){showError(e);}};
$('mic').onclick=async()=>{try{if(nativeRecording)await result(window.island.nativeVoice('finish'));else await window.islandOpenVoiceAssistant({start:true});}catch(e){showError(e);}};
window.island.onToggle(()=>window.islandOpenVoiceAssistant({start:true}).catch(showError));
window.island.onOpen(() => {
  window.islandVoiceDismissed=false;
  tab('assistant');
  expand(true).catch(showError);
  $('question').focus();
});
window.island.onCommand?.(value => {
  if (!value?.page) return;
  if(value.page==='tools'&&value.tool){window.islandOpenTool?.(value.tool);expand(true).catch(showError);return;}
  tab(value.page);
  expand(true).catch(showError);
});

document.addEventListener('keydown', event => {
  if (expanded && !settingsMode && document.body.classList.contains('view-tools') && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName || '')) {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      const selector = event.key === 'ArrowLeft' ? '[data-do=carouselPrev]' : '[data-do=carouselNext]';
      const control = document.querySelector(selector);
      if (control) {
        event.preventDefault();
        control.click();
        return;
      }
    }
  }
  if (event.key !== 'Escape') return;
  speechSynthesis.cancel();
  window.islandStopSpeech?.();
  if (nativeRecording || nativeProcessing || pendingDraftId) {window.island.nativeVoice('cancel');pendingDraftId='';$('insertDraft').hidden=true;}
  else if (recorder?.state === 'recording') {
    cancelled = true;
    recorder.stop();
  } else if (!state?.appearance?.pinned) expand(false);
});

window.island.onVoice?.(event => {
  if(event.phase==='listening'){currentVoiceKind=event.kind;window.islandVoiceSession=['chat','command','ptt','live'].includes(event.kind);}
  if(event.phase==='partial'&&!settingsMode){if(currentVoiceKind==='chat_input')$('question').value=event.text;else if(currentVoiceKind==='dictation'){$('transcript').value=event.text;rawTranscript=event.text;$('transcriptBox').hidden=false;}return;}
  if(event.phase==='delta'&&!settingsMode)return;
  if (event.phase === 'connecting' && !settingsMode) {nativeProcessing=true;busy=true;motion.lock(true);$('status').textContent='Connecting to Gemini Liveâ€¦';return;}
  if (event.phase === 'processing') nativeProcessing = true;
  if (['done', 'answer', 'error', 'idle', 'listening','draft'].includes(event.phase)) nativeProcessing = false;
  if (settingsMode) return;
  if (event.phase === 'listening') {
    motion.lock(true);hideQuietMoment();
    setMascot('listening');
    document.body.style.setProperty('--voice-level', '0');
    nativeRecording = true;
    busy = false;
    $('mic').classList.add('recording');
    $('mic').title = 'Stop recording';
    $('status').textContent = event.kind==='live'?'Gemini Live Â· listening Â· mic to stop':'Listening...';
    if (!expanded && ['dictation','ptt'].includes(event.kind)) {
      document.body.classList.add('has-voice-hud');
      $('voiceHudText').textContent = 'Listening...';
      window.island.setVoiceHud?.(true);
    }
  }
  if (event.phase === 'processing') {
    motion.lock(true);
    setMascot('thinking');
    nativeRecording = false;
    busy = true;
    $('status').textContent = 'Transcribing...';
    if (document.body.classList.contains('has-voice-hud')) $('voiceHudText').textContent = 'Transcribing...';
  }
  if (['done', 'answer', 'error', 'idle','draft'].includes(event.phase)) {
    motion.lock(!!window.islandVoiceHold?.());
    nativeRecording = false;
    busy = false;
    $('mic').classList.remove('recording');
    $('mic').title = 'Voice assistant';
    $('mic').setAttribute('aria-label', 'Open voice assistant');
    $('mic').style.opacity = '';
    document.querySelectorAll('.voice-wave i').forEach(bar => bar.style.transform = 'scaleY(.18)');
    document.querySelectorAll('.audio-bars i').forEach(bar => bar.style.transform = 'scaleY(.18)');
    document.body.classList.remove('has-voice-hud');
    window.island.setVoiceHud?.(false);
    if(event.phase==='draft'){pendingDraftId=event.id;$('insertDraft').hidden=false;$('transcriptBox').open=true;tab('assistant');expand(true);}else{pendingDraftId='';$('insertDraft').hidden=true;}
    if(event.phase==='done'&&event.kind==='chat_input'){$('question').value=event.text||'';tab('assistant');$('question').focus();}
    else if(event.phase==='answer'){
      window.islandVoiceSession=false;
    } else if (event.text) {
      $('transcript').value = event.text;
      rawTranscript = event.raw || event.text;
      $('transcriptBox').hidden = false;
    }
    $('status').textContent = event.outcome === 'Pasted'
      ? 'Typed into your app'
      : event.phase === 'done'
        ? 'Dictation ready'
        : state?.profileName ? `Ready, ${state.profileName}` : 'Ready';
    showError(event.error || event.warning || '');
    if(['error','idle','done'].includes(event.phase))window.islandVoiceSession=false;
    if(['error','idle'].includes(event.phase)){voiceStreamMessage?.remove();voiceStreamUser?.remove();voiceStreamMessage=null;voiceStreamUser=null;}
    if (event.error) setMascot('error');
    else if (event.phase === 'done' || event.phase === 'answer') {
      setMascot('success');
      setTimeout(() => setMascot(expanded ? 'open' : 'closed'), 900);
    }
  }
  if (event.phase === 'level') {
    const level = Math.max(0, Math.min(1, Number(event.level) || 0));
    document.body.style.setProperty('--voice-level', String(level));
    document.querySelectorAll('.voice-wave i').forEach((bar, index) => {
      const variation = [1, .72, .9, .62, .82][index] || .75;
      bar.style.transform = `scaleY(${.18 + level * .82 * variation})`;
    });
    document.querySelectorAll('.audio-bars i').forEach((bar, index) => {
      const variation = [1, .7, .9, .62, .82][index] || .75;
      bar.style.transform = `scaleY(${.18 + level * .82 * variation})`;
    });
    $('mic').style.opacity = String(Math.max(.55, .65 + level * .35));
  }
});

let homeShelfSeq=0;
function shelfName(value){return String(value||'').split(/[\\/]/).pop()||'Item';}
async function renderHomeShelf(){
  const mount=$('homeShelfItems'),count=$('homeShelfCount'),more=$('homeShelfMore');if(!mount)return;
  const serial=++homeShelfSeq;
  try{
    const libReply=await window.island.library(),lib=libReply?.ok===false?null:(libReply?.value??libReply);const paths=Array.isArray(lib?.shelf)?lib.shelf:[];
    count.textContent=paths.length+' item'+(paths.length===1?'':'s');
    const iconsReply=paths.length?await window.island.desktop('shelf:icons'):null,icons=iconsReply?.ok===false?[]:(iconsReply?.value??iconsReply??[]);
    if(serial!==homeShelfSeq)return;
    const items=(icons||[]).slice(0,4);mount.replaceChildren();
    if(!paths.length){const empty=document.createElement('button');empty.className='shelf-widget-empty';empty.type='button';empty.innerHTML='<b>Your shelf is empty</b><small>Add files or drop them here for quick access.</small>';empty.onclick=()=>chooseShelfFiles();mount.append(empty);more.hidden=true;return;}
    for(const item of items){
      const button=document.createElement('button');button.className='shelf-widget-item';button.type='button';button.title=item.path;
      if(item.icon){const image=document.createElement('img');image.src=item.icon;image.alt='';button.append(image);}else{const fallback=document.createElement('i');fallback.className='shelf-fallback';fallback.textContent='▤';button.append(fallback);}
      const label=document.createElement('span');label.textContent=item.name||shelfName(item.path);button.append(label);
      button.onclick=()=>window.island.desktop('shelf:open',{path:item.path}).then(r=>{if(!r.ok)showError(r);});
      button.ondragover=event=>{event.preventDefault();button.classList.add('drag-over');};
      button.ondragleave=()=>button.classList.remove('drag-over');
      button.ondrop=event=>event.preventDefault();
      mount.append(button);
    }
    more.hidden=paths.length<=4;more.textContent=paths.length>4?`+${paths.length-4}`:'';
  }catch(error){if(serial===homeShelfSeq){mount.replaceChildren();count.textContent='Shelf unavailable';}}
}
async function chooseShelfFiles(){try{const reply=await window.island.desktop('shelf:choose');if(reply?.ok===false)throw reply.error;if(reply)renderHomeShelf();}catch(error){showError(error);}}
$('homeShelf')?.addEventListener('dragover',event=>{if(event.dataTransfer?.types?.includes('Files')){event.preventDefault();$('homeShelf').classList.add('drag-over');}});
$('homeShelf')?.addEventListener('dragleave',()=>$('homeShelf').classList.remove('drag-over'));
$('homeShelf')?.addEventListener('drop',()=>$('homeShelf').classList.remove('drag-over'));
$('homeShelf')?.addEventListener('click',event=>{const add=event.target.closest('[data-shelf-add]'),open=event.target.closest('[data-shelf-open]');if(add)chooseShelfFiles();else if(open)window.islandOpenTool?.('shelf');});
window.island.onLibrary?.(()=>renderHomeShelf());
function applyState(value) {
  state = value;
  const appearance = value.appearance || {};
  motion.intent=appearance.hoverIntentMs??100;motion.grace=appearance.mouseleaveGraceMs??1000;motion.pinned=!!appearance.pinned;
  document.body.dataset.density=appearance.density||'default';document.body.dataset.motion=appearance.motion||'standard';
  document.body.style.setProperty('--line-width',(appearance.lineWidthDip||100)+'px');document.body.style.setProperty('--line-height',(appearance.lineHeightDip||2)+'px');document.body.style.setProperty('--line-opacity',appearance.lineOpacity??.35);
  document.body.classList.toggle('minimal', !!appearance.minimal);
  document.body.classList.toggle('no-mascot', appearance.mascot === false);
  document.body.classList.toggle('pinned', !!appearance.pinned);
  document.body.classList.toggle('shape-pill', appearance.shape === 'pill');
  document.body.classList.toggle('shape-line', appearance.shape === 'line');
  const face=appearance.face||{};document.body.classList.toggle('blob-face',!!face.enabled);window.AgentFace?.apply($('face'),{enabled:!!face.enabled,seed:value.profileName||'Agent Notch',shape:face.shape,hue:face.hue,expression:face.expression,size:64});
  const light = appearance.theme === 'light' ||
    (appearance.theme === 'system' && window.matchMedia?.('(prefers-color-scheme: light)').matches);
  document.body.classList.toggle('theme-light', !!light);
  $('pin').classList.toggle('active', !!appearance.pinned);
  $('pin').title = appearance.pinned ? 'Unpin island' : 'Pin island open';
  $('homeTitle').textContent = value.profileName ? `Hi, ${value.profileName}.` : "Hey, I'm here.";
  window.islandUpdateDock?.(appearance.favorites || []);
  if (!busy && !nativeRecording) $('status').textContent = value.profileName ? `Ready, ${value.profileName}` : 'Ready';
  document.body.classList.toggle('shape-corner', appearance.shape === 'corner');
  renderHomeShelf();
  if (appearance.pinned && !window.islandVoiceDismissed && !expanded && !settingsMode) expand(true).catch(showError);
  else if (!appearance.pinned && expanded && !settingsMode && !motion.inside) scheduleAutoClose();
}

window.island.onSettings?.(applyState);
window.island.onCursor?.(({ x, y, width, height }) => {
  if(!expanded||state?.appearance?.motion==='off')return;
  const nx = Math.max(-1, Math.min(1, (x - width / 2) / Math.max(80, width / 2)));
  const ny = Math.max(-1, Math.min(1, (y - height / 2) / Math.max(35, height / 2)));
  document.querySelectorAll('.eye').forEach(eye => {
    eye.style.setProperty('--eye-x', `${(nx * 2.4).toFixed(2)}px`);
    eye.style.setProperty('--eye-y', `${(ny * 1.4).toFixed(2)}px`);
  });
});
window.matchMedia?.('(prefers-color-scheme: light)').addEventListener?.('change', () => {
  if (state?.appearance?.theme === 'system') applyState(state);
});

$('copy').onclick = async () => {
  try {
    await result(window.island.copy($('transcript').value));
    if(pendingDraftId){await window.island.nativeVoice('cancel');pendingDraftId='';$('insertDraft').hidden=true;}
    $('status').textContent = 'Copied. Paste into your app.';
  } catch (caught) {
    showError(caught);
  }
};
$('askTranscript').onclick = () => ask($('transcript').value);

const screenButton = document.createElement('button');
screenButton.className = 'screen-guide';
screenButton.textContent = 'Screen guidance';
screenButton.title = 'Uses a screenshot for grounded instructions.';
$('assistant').insertBefore(screenButton, $('screenGuide') || null);

$('chatVoiceInput').onclick=async()=>{try{if(nativeRecording)await result(window.island.nativeVoice('finish'));else{tab('assistant');await startNativeVoice('chat_input');}}catch(e){showError(e);}};

let lastScreenQuestion = '';
const guideBox = document.createElement('div');
guideBox.id = 'screenGuide';
$('assistant').append(guideBox);

function showGuide(guide) {
  guideBox.replaceChildren();
  const summary = document.createElement('p');
  summary.textContent = guide.summary;
  guideBox.append(summary);
  const list = document.createElement('ol');
  for (const [index, step] of (guide.steps || []).entries()) {
    const item = document.createElement('li');
    item.append(document.createTextNode(step.instruction));
    if (step.match) {
      const button = document.createElement('button');
      button.textContent = 'Highlight';
      button.onclick = async () => {
        try {
          await result(window.island.highlight(guide.id, index));
          error();
        } catch (caught) {
          showError(caught);
        }
      };
      item.append(button);
      const act = document.createElement('button');
      act.textContent = 'Click target';
      act.title = 'Clicks the matched control in the app. Use only when the target is correct.';
      act.onclick = async () => {
        act.disabled = true;
        try {
          await result(window.island.actOnScreen(guide.id, index));
          act.textContent = 'Clicked';
        } catch (caught) {
          showError(caught);
        } finally {
          act.disabled = false;
        }
      };
      item.append(act);
    } else {
      const hint = document.createElement('small');
      hint.textContent = 'Target is not visible yet.';
      item.append(hint);
    }
    list.append(item);
  }
  guideBox.append(list);
  if (guide.warnings?.length) {
    const warning = document.createElement('small');
    warning.textContent = guide.warnings.join(' / ');
    guideBox.append(warning);
  }
  const refresh = document.createElement('button');
  refresh.textContent = 'I did that - next step';
  refresh.onclick = () => readScreen(lastScreenQuestion);
  guideBox.append(refresh);
  syncSurfaceHeight(true).catch(() => {});
}

async function readScreen(question) {
  if (busy) return;
  if (!question) {
    showError('Type a question first. Screen guidance captures your desktop and sends it to the selected provider.');
    return;
  }
  lastScreenQuestion = question;
  busy = true;
  screenButton.disabled = true;
  screenButton.textContent = 'Reading screen...';
  error();
  try {
    const guide = await result(window.island.guide(question));
    showGuide(guide);
    await expand(true);
  } catch (caught) {
    showError(caught);
  } finally {
    busy = false;
    screenButton.disabled = false;
    screenButton.textContent = 'Screen guidance';
  }
}

screenButton.onclick = () => readScreen($('question').value.trim());

const cleanButton = document.createElement('button');
cleanButton.textContent = 'Polish';
cleanButton.title = 'Clean up the transcript';
$('copy').parentNode.append(cleanButton);
const undoCleanButton = document.createElement('button');
undoCleanButton.textContent = 'Undo polish';
undoCleanButton.hidden = true;
$('copy').parentNode.append(undoCleanButton);
cleanButton.onclick = async () => {
  cleanButton.disabled = true;
  try {
    rawTranscript = $('transcript').value;
    const response = await result(window.island.clean($('transcript').value));
    $('transcript').value = response.text;
    undoCleanButton.hidden = response.text === rawTranscript;
    error(response.warning || '');
  } catch (caught) {
    showError(caught);
  } finally {
    cleanButton.disabled = false;
  }
};
undoCleanButton.onclick = () => {
  $('transcript').value = rawTranscript;
  undoCleanButton.hidden = true;
};

$('note').oninput = () => {
  $('noteStatus').textContent = 'Saving...';
  clearTimeout(noteTimer);
  noteTimer = setTimeout(async () => {
    try {
      state = await result(window.island.save({ note: $('note').value }));
      $('noteStatus').textContent = 'Saved on this computer';
    } catch (caught) {
      showError(caught);
    }
  }, 400);
};

function showProvider() {
 if(!state||!$('keyProvider').value)return;const provider=$('keyProvider').value;
 $('chatModel').value=state.models[provider]?.chat||state.providers[provider].chat||'';
 $('speechModel').value=state.models[provider]?.speech||state.providers[provider].speech||'';
 $('chatModel').disabled=!state.providers[provider].chat;$('speechModel').disabled=!state.providers[provider].speech;
 if($('visionModel')){$('visionModel').disabled=!state.providers[provider].vision;$('visionModel').value=state.models[provider]?.vision||state.providers[provider].vision||'';}
 if($('providerEndpoint'))$('providerEndpoint').textContent=state.providers[provider].base;
 if($('deepseekOptions'))$('deepseekOptions').hidden=provider!=='deepseek';
}
$('keyProvider').onchange=showProvider;

async function saveSettings() {
  const controls = document.querySelectorAll('[data-save-settings]');
  controls.forEach(b => b.disabled = true);
  $('settingsSaveStatus').textContent = 'Savingâ€¦';
  const revision=window.islandSettingsRevision;
  try {
    await window.islandProviderKeys.ready;
    const keySave=window.islandProviderKeys.capture();
    const provider = $('keyProvider').value;
    const value = {
      ...keySave.value,
      ...(window.islandPreferences?.() || {}),
      ...(window.islandMicrophoneSettings?{microphone:window.islandMicrophoneSettings()}:{}),
      assistant: $('assistantProvider').value,
      speech: $('speechProvider').value,
      speak: $('speak').checked,
      models: {
        [provider]: {
          chat: $('chatModel').value,
          speech: $('speechModel').value,
          vision: $('visionModel')?.value || state.providers[provider].vision
        }
      }
    };
    state = await result(window.island.save(value));
    await window.islandProviderKeys.saved(keySave.revisions);
    await window.islandSaveHistory?.();
    await window.islandSaveReminderSettings?.();
    if(revision===window.islandSettingsRevision){window.islandSettingsDirty=false;window.islandLoadPreferences?.(state);window.islandLoadLanguages?.(state);window.islandLoadMicrophone?.(state);showProvider();}
    $('providerLabel').textContent = state.assistant;
    error();
    const voicePending=state.voice.enabled&&!state.voiceStatus?.active;
    $('settingsSaveStatus').textContent = window.islandSettingsDirty?'Saved. Newer edits are not saved yet.':state.startupError|| (voicePending?state.voiceStatus.message:'âœ“ Changes saved');
    document.querySelector('.settings-savebar').classList.toggle('saved',!voicePending&&!state.startupError&&!window.islandSettingsDirty);
    setTimeout(() => document.querySelector('.settings-savebar')?.classList.remove('saved'), 2000);
    return true;
  } catch (caught) {
    $('settingsSaveStatus').textContent = 'Not saved: '+caught.message;
    showError(caught);
  } finally { controls.forEach(b => b.disabled = false); }
}

window.islandSaveSettings = () => saveSettings();
document.querySelector('.settings-nav')?.addEventListener('click', event => {
  const button = event.target.closest('[data-settings-target]');
  if (!button) return;
  document.querySelectorAll('[data-settings-target]').forEach(item => item.classList.toggle('active', item === button));
  if(window.islandShowSettingsSection)window.islandShowSettingsSection(button.dataset.settingsTarget);else $(button.dataset.settingsTarget)?.scrollIntoView({block:'start'});
});

result(window.island.get()).then(value => {
  applyState(value);
  for (const id of ['assistantProvider', 'speechProvider', 'keyProvider']) {
    for (const provider of Object.keys(state.providers).filter(p=>id==='keyProvider'||(id==='speechProvider'?state.providers[p].speech:state.providers[p].chat))) {
      const option = document.createElement('option');
      option.value = provider;
      option.textContent = provider === 'openai' ? 'OpenAI' : provider[0].toUpperCase() + provider.slice(1);
      $(id).append(option);
    }
  }
  if(!$('speechProvider').querySelector('option[value="local"]')){const option=document.createElement('option');option.value='local';option.textContent='Local (Windows, offline)';$('speechProvider').append(option);}if(!$('speechProvider').querySelector('option[value="whisper"]')){const option=document.createElement('option');option.value='whisper';option.textContent='Local Whisper base.en (installed)';$('speechProvider').append(option);}
  $('assistantProvider').value = state.assistant;
  $('speechProvider').value = state.speech;
  $('keyProvider').value = state.assistant;
  $('speak').checked = state.speak;
  $('note').value = state.note;
  $('providerLabel').textContent = state.assistant;
  showProvider();
  if (settingsMode) {
    document.body.classList.add('settings-window');
    $('body').hidden = false;
    tab('settings');
  } else {
    tab('home');
  }
}).catch(showError);

