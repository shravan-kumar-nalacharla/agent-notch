'use strict';

const $ = id => document.getElementById(id);
const settingsMode = new URLSearchParams(location.search).has('settings');
const isSmoke = new URLSearchParams(location.search).has('test');


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
let nativeRecording = false;
let nativeProcessing = false;
let lastHeight = 0;
let errorTimer;
let surfaceSerial=0;
let suppressHover=false;
let rawTranscript='',pendingDraftId='',voiceStreamMessage,voiceStreamUser;
let keyboardFocus=false,disposed=false,captureOverlayActive=false;

if (settingsMode) document.title = 'Agent Notch Settings';

function setMascot(mode) {
  for (const name of ['closed', 'open', 'listening', 'thinking', 'success', 'error']) {
    document.body.classList.toggle(`mascot-${name}`, mode === name);
  }
}
setMascot('closed');

window.island.onCollapse(() => expand(false));
window.island.onRestore?.(() => expand(true).catch(showError));

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
  for (const item of ['home', 'assistant', 'notes', 'focus', 'tools', 'agents']) {
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
function canAutoClose(){return !document.body.classList.contains('is-capturing')&&!document.body.classList.contains('has-windows-task')&&!document.body.classList.contains('has-reminder-hud')&&!captureOverlayActive&&!state?.appearance?.pinned&&state?.appearance?.autoClose!==false&&!nativeRecording&&!nativeProcessing&&recorder?.state!=='recording'&&!document.body.classList.contains('is-dragging')&&!(document.hasFocus()&&/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName||''))&&!(keyboardFocus&&document.hasFocus()&&$('island').contains(document.activeElement));}
const motion=new IslandMotion({open:()=>setExpanded(true),close:()=>setExpanded(false),canClose:canAutoClose,changed:value=>document.body.dataset.motionState=value});
async function expand(on=true){if(settingsMode)return;return on?motion.open():motion.close();}
window.island.onCaptureOverlay?.(({active})=>{captureOverlayActive=active;if(active){motion.cancel('leave');}else if(!motion.inside&&expanded)motion.leave();});
window.island.onHover?.(({inside})=>{if(settingsMode||isSmoke||windowPolicy!=='normal')return;inside?motion.enter():motion.leave();});
window.island.onLayout?.(layout=>{document.body.style.setProperty('--island-width',layout.panelWidth+'px');document.body.style.setProperty('--compact-height',layout.panelHeight+'px');document.body.style.setProperty('--rich-height',layout.richHeight+'px');requestAnimationFrame(sendHitbox);});
window.island.layout?.().then(r=>{if(r.ok){document.body.style.setProperty('--island-width',r.value.panelWidth+'px');document.body.style.setProperty('--compact-height',r.value.panelHeight+'px');document.body.style.setProperty('--rich-height',r.value.richHeight+'px');requestAnimationFrame(sendHitbox);}});
$('activationTarget').onclick=()=>window.island.activate?window.island.activate({revealOnly:true}).then(result).catch(showError):expand(true);
function tab(name) {
  if (name === 'focus') { window.islandOpenTool?.('timer'); return; }
  if (name === 'settings' && !settingsMode) {
    window.island.settings();
    return;
  }
  const page = $(name);
  if (!page) return;
  activeView = name;
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
  error(value?.message || String(value || ''));
}
window.islandShowError = showError;

window.addEventListener('island:navigate', event => {
  tab(event.detail);
  expand(true).catch(showError);
});
window.addEventListener('island:reminder-closed',()=>{if(!state?.appearance?.pinned)expand(false).catch(showError);});
window.addEventListener('island:layout-change',()=>requestAnimationFrame(sendHitbox));
window.islandSurfaceResize = () => syncSurfaceHeight(true).catch(() => {});

document.querySelectorAll('nav [data-tab]').forEach(button => {
  button.addEventListener('click', () => tab(button.dataset.tab));
});

$('face').onclick = () => expand(true);
$('collapse').onclick = () => {
  if (state?.appearance?.pinned) {
    $('status').textContent = 'Pinned open';
    return;
  }
  expand(false);
};
$('hide').onclick = () => window.island.hide();
$('openSettings').onclick = () => window.island.settings();
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

$('island').addEventListener('mouseenter',()=>{if(!settingsMode&&!isSmoke&&windowPolicy==='normal')motion.enter();});
$('island').addEventListener('mouseleave',()=>{if(!settingsMode&&!isSmoke)motion.leave();});
function scheduleAutoClose(){motion.leave();}
window.addEventListener('island:test-leave',()=>motion.leave());
window.addEventListener('island:test-enter',()=>motion.enter());
document.addEventListener('focusin',()=>{motion.cancel('leave');if(expanded)motion.phase('INTERACTING');});
document.addEventListener('focusout',()=>setTimeout(()=>{if(!motion.inside&&expanded)motion.leave();},0));
document.addEventListener('pointerdown', () => { keyboardFocus = false; });
document.addEventListener('keydown', event => { if (event.key === 'Tab') keyboardFocus = true; });
window.addEventListener('dragenter', () => { motion.cancel('leave'); document.body.classList.add('is-dragging'); });
window.addEventListener('dragend', () => document.body.classList.remove('is-dragging'));
window.addEventListener('drop', () => document.body.classList.remove('is-dragging'));
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
let quietTimer,currentQuote,quietSerial=0,quotePinned=false;
$('island').append($('quietMoment'));
function hideQuietMoment(){quietSerial++;clearTimeout(quietTimer);$('quietMoment').hidden=true;}
async function maybeQuietMoment(manual=false){
 if(settingsMode||!expanded||activeView!=='home'||busy||nativeRecording||nativeProcessing||!manual&&!$('quietMoment').hidden)return;
 const serial=++quietSerial;
 try{const r=await result(window.island.quiet('request',{manual,typing:/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName||'')}));if(!r||serial!==quietSerial||!expanded||activeView!=='home'||busy||nativeRecording||nativeProcessing)return;
 currentQuote=r;quotePinned=false;$('quietPin').setAttribute('aria-pressed','false');$('quietText').textContent=r.text;$('quietText').lang=r.lang;$('quietText').title=r.reason;$('quietMoment').dataset.id=r.id;$('quietMoment').hidden=false;$('quietFavorite').textContent='♡';quietTimer=setTimeout(()=>hideQuietMoment(),8000);
 }catch(e){if(manual)showError(e);}
}
$('quietMoment').onmouseenter=()=>clearTimeout(quietTimer);
$('quietMoment').onmouseleave=()=>{if(!quotePinned)quietTimer=setTimeout(hideQuietMoment,8000);};
$('quietMoment').onfocusin=()=>clearTimeout(quietTimer);
$('quietDismiss').onclick=()=>{quotePinned=false;hideQuietMoment();};
$('quietPin').onclick=()=>{quotePinned=!quotePinned;$('quietPin').setAttribute('aria-pressed',String(quotePinned));clearTimeout(quietTimer);if(!quotePinned)quietTimer=setTimeout(hideQuietMoment,8000);};
$('quietSkip').onclick=()=>maybeQuietMoment(true);
$('quietFavorite').onclick=async()=>{const r=await result(window.island.quiet('favorite',{id:currentQuote.id}));$('quietFavorite').textContent=r.quiet.favorites.includes(currentQuote.id)?'♥':'♡';};
window.island.onQuietSuppress?.(hideQuietMoment);
window.island.onSettings?.(async value=>{if(!value.quietMoments.enabled){hideQuietMoment();return;}if(currentQuote&&!$('quietMoment').hidden){const id=currentQuote.id,r=await window.island.quiet('current',{id});if(r.ok&&currentQuote.id===id){currentQuote={...currentQuote,...r.value};$('quietText').textContent=r.value.text;$('quietText').lang=r.value.lang;}}});
window.islandAnotherQuote=()=>maybeQuietMoment(true);
window.addEventListener('pagehide',()=>{disposed=true;motion.dispose();stopBlink();clearTimeout(quietTimer);});

function message(text, role) {
  const element = document.createElement('div');
  element.className = `message ${role}`;
  element.textContent = text;
  $('messages').append(element);
  $('messages').scrollTop = $('messages').scrollHeight;
  return element;
}

let activeAskId='',streamMessage;
window.addEventListener('island:task-error',event=>{if(!activeAskId){message(event.detail,'assistant');tab('assistant');}});
window.island.onAssistantDelta?.(({id,delta})=>{if(id!==activeAskId||!streamMessage)return;streamMessage.textContent+=delta;$('messages').scrollTop=$('messages').scrollHeight;});
async function ask(text) {
  if (busy || !text.trim()) return;
  busy = true;
  error();
  activeAskId=crypto.randomUUID();$('send').title='Stop response';$('send').setAttribute('aria-label','Stop response');
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
    activeAskId='';streamMessage=null;busy = false;
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
  const provider=kind==='chat'&&state.companion?.chatEngine==='gemini_live'?'gemini':state.speech;
  if (!state.configured[provider]) {
    $('status').textContent = 'API key needed';
    await result(window.island.settings());
    throw new Error(`Add your ${provider} API key in AI & API keys to start voice.`);
  }
  if(!state.languages.cloudAudioConsent){await result(window.island.settings('voice'));throw new Error('Allow cloud audio beside Enable the global voice hotkey, then save.');}
  await result(window.island.nativeVoice('start', { kind }));
}

$('homeVoice').onclick = async () => {
  try {
    tab('assistant');
    await startNativeVoice('chat');
  } catch (caught) {
    showError(caught);
  }
};

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
    if (!state.configured[state.companion?.chatEngine === 'gemini_live' ? 'gemini' : state.speech]) {
      $('status').textContent = 'API key needed';
      await result(window.island.settings());
      throw new Error(`Add your ${state.companion?.chatEngine === 'gemini_live' ? 'Gemini' : state.speech} API key in AI & API keys to start voice chat.`);
    }
    if(!state.languages.cloudAudioConsent){await result(window.island.settings('voice'));throw new Error('Allow cloud audio in Voice typing, then save.');}
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
      $('mic').title = 'Voice chat';
      $('mic').setAttribute('aria-label', 'Start voice chat');
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
    $('status').textContent = event.kind==='live'?'Gemini Live · listening · mic to stop':'Listening...';
    recordingTimer = setTimeout(() => {
      if (recorder.state === 'recording') recorder.stop();
    }, 120000);
  } catch (caught) {
    stream?.getTracks().forEach(track => track.stop());
    showError(caught);
  }
}

$('insertDraft').onclick=async()=>{try{await result(window.island.nativeVoice('insertDraft',{id:pendingDraftId,text:$('transcript').value}));$('insertDraft').hidden=true;}catch(e){showError(e);}};
$('mic').onclick = toggleChatVoice;
window.island.onToggle(toggleChatVoice);
window.island.onOpen(() => {
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
  if(event.phase==='partial'&&!settingsMode){$('transcript').value=event.text;rawTranscript=event.text;$('transcriptBox').hidden=false;return;}
  if(event.phase==='delta'&&!settingsMode){if(!voiceStreamMessage){voiceStreamUser=event.raw?message(event.raw,'user'):null;voiceStreamMessage=message('','assistant');}voiceStreamMessage.textContent+=event.delta;tab('assistant');return;}
  if (event.phase === 'connecting' && !settingsMode) {nativeProcessing=true;busy=true;motion.lock(true);$('status').textContent='Connecting to Gemini Live…';return;}
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
    $('status').textContent = event.kind==='live'?'Gemini Live · listening · mic to stop':'Listening...';
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
    motion.lock(false);
    nativeRecording = false;
    busy = false;
    $('mic').classList.remove('recording');
    $('mic').title = 'Voice chat';
    $('mic').setAttribute('aria-label', 'Start voice chat');
    $('mic').style.opacity = '';
    document.querySelectorAll('.voice-wave i').forEach(bar => bar.style.transform = 'scaleY(.18)');
    document.querySelectorAll('.audio-bars i').forEach(bar => bar.style.transform = 'scaleY(.18)');
    document.body.classList.remove('has-voice-hud');
    window.island.setVoiceHud?.(false);
    if(event.phase==='draft'){pendingDraftId=event.id;$('insertDraft').hidden=false;$('transcriptBox').open=true;tab('assistant');expand(true);}else{pendingDraftId='';$('insertDraft').hidden=true;}
    if (event.phase === 'answer') {
      if(voiceStreamMessage)voiceStreamMessage.textContent=event.text;else{if(event.raw)message(event.raw,'user');message(event.text,'assistant');}
      voiceStreamMessage=null;voiceStreamUser=null;
      tab('assistant');
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
  const light = appearance.theme === 'light' ||
    (appearance.theme === 'system' && window.matchMedia?.('(prefers-color-scheme: light)').matches);
  document.body.classList.toggle('theme-light', !!light);
  $('pin').classList.toggle('active', !!appearance.pinned);
  $('pin').title = appearance.pinned ? 'Unpin island' : 'Pin island open';
  $('homeTitle').textContent = value.profileName ? `Hi, ${value.profileName}.` : "Hey, I'm here.";
  window.islandUpdateDock?.(appearance.favorites || []);
  if (!busy && !nativeRecording) $('status').textContent = value.profileName ? `Ready, ${value.profileName}` : 'Ready';
  if (appearance.pinned && !expanded && !settingsMode) expand(true).catch(showError);
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

const assistantMic = document.createElement('button');
assistantMic.className = 'screen-guide';
assistantMic.textContent = 'Voice assistant';
assistantMic.title = 'Speak a command or question. Shift + the voice hotkey also starts assistant mode.';
$('assistant').insertBefore(assistantMic, screenButton);
assistantMic.onclick = async () => {
  try {
    if (nativeRecording) await result(window.island.nativeVoice('finish'));
    else await result(window.island.nativeVoice('start', { kind: 'chat' }));
  } catch (caught) {
    showError(caught);
  }
};

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
  $('settingsSaveStatus').textContent = 'Saving…';
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
    $('settingsSaveStatus').textContent = window.islandSettingsDirty?'Saved. Newer edits are not saved yet.':state.startupError|| (voicePending?state.voiceStatus.message:'✓ Changes saved');
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
