'use strict';
(()=>{
  const api=window.island,settingsMode=new URLSearchParams(location.search).has('settings');
  let turn=0,audio,release,objectUrl,waking=false,cloudUnavailable=false;
  const notice=document.createElement('p');notice.id='speechNotice';notice.className='speech-notice';notice.hidden=true;notice.setAttribute('role','status');document.querySelector('#assistant .page-head').after(notice);
  function speechNotice(text){notice.textContent=text;notice.hidden=!text;if(text)window.dispatchEvent(new CustomEvent('island:speech',{detail:{phase:'error',message:text}}));}
  async function systemSpeech(text,language,companion){
    await new Promise((resolve,reject)=>{const utterance=new SpeechSynthesisUtterance(text),matching=speechSynthesis.getVoices().filter(v=>v.lang.toLowerCase().startsWith(language));utterance.voice=matching.find(v=>v.voiceURI===companion.systemVoice)||matching[0]||null;if(!utterance.voice){reject(new Error('No installed '+language+' voice is available. The reply remains as text.'));return;}utterance.onstart=()=>window.dispatchEvent(new CustomEvent('island:speech',{detail:{phase:'speaking'}}));utterance.lang=utterance.voice.lang;utterance.rate=companion.rate||1;utterance.volume=companion.volume??1;utterance.onend=resolve;utterance.onerror=e=>reject(new Error(e.error));release=resolve;speechSynthesis.speak(utterance);});
  }
  const stop=document.createElement('button');stop.id='stopSpeech';stop.textContent='■';stop.title='Stop speaking';stop.setAttribute('aria-label','Stop speaking');stop.hidden=true;document.querySelector('.header-actions').prepend(stop);
  function cancel(resume=true){turn++;api.cancelSpeech?.().catch(()=>{});audio?.pause();audio=null;release?.();release=null;if(objectUrl)URL.revokeObjectURL(objectUrl);objectUrl=null;speechSynthesis.cancel();window.dispatchEvent(new CustomEvent('island:speech',{detail:{phase:'ready'}}));stop.hidden=true;if(resume)api.wakePause(false);}
  stop.onclick=()=>{waking=false;cancel();};window.islandStopSpeech=cancel;
  async function playCloud(value,companion){
    const bytes=Uint8Array.from(atob(value.audio),c=>c.charCodeAt(0)),url=URL.createObjectURL(new Blob([bytes],{type:value.mime})),playing=new Audio(url);objectUrl=url;audio=playing;playing.playbackRate=companion.rate||1;playing.volume=companion.volume??1;
    try{await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('Voice playback timed out.')),60000);release=()=>{clearTimeout(timer);resolve();};playing.onended=release;playing.onerror=()=>{clearTimeout(timer);reject(new Error('Voice audio could not play.'));};playing.onplaying=()=>window.dispatchEvent(new CustomEvent('island:speech',{detail:{phase:'speaking'}}));playing.play().catch(e=>{clearTimeout(timer);reject(e);});});}finally{playing.pause();URL.revokeObjectURL(url);if(audio===playing){audio=null;objectUrl=null;release=null;}}
  }
  async function speak(text,{preview=false,provider:requestedProvider}={}){
    cancel(false);const own=turn,config=await api.get();if(!config.ok)throw new Error(config.error);const companion=config.value.companion||{};
    if(own!==turn||config.value.microphoneStatus?.blocked)return false;
    if(!preview&&!config.value.speak)return true;
    if(preview)cloudUnavailable=false;
    await api.wakePause(true);stop.hidden=false;window.dispatchEvent(new CustomEvent('island:speech',{detail:{phase:'processing',message:'Preparing voice'}}));
    try{
      const prefs=config.value.languages||{},input=prefs.dictationMode==='follow_ui'?prefs.uiLanguage:prefs.dictationMode,mode=prefs.voiceResponseLanguage==='follow_ui'?prefs.uiLanguage:prefs.voiceResponseLanguage==='follow_input'?input:prefs.voiceResponseLanguage,language=prefs.spokenLanguage&&prefs.spokenLanguage!=='follow_response'?prefs.spokenLanguage:/[\u0c00-\u0c7f]/u.test(text)?'te':/[\u0900-\u097f]/u.test(text)?'hi':['te','tenglish'].includes(mode)?'te':['hi','hinglish'].includes(mode)?'hi':'en';
      const provider=requestedProvider||(companion.chatEngine==='sarvam'?'sarvam':companion.tts);
      if(provider==='sarvam'){
        await cloudSpeech('sarvam');
      }else if(provider!=='groq'||language!=='en'||cloudUnavailable){
        try{await systemSpeech(text,language,companion);}catch(e){if(preview)throw e;speechNotice(e.message);}
      }else await cloudSpeech('groq');
      async function cloudSpeech(provider){
        try{
          const parts=await api.speechSegments({text,provider});if(!parts.ok)throw new Error(parts.error);
          for(const part of parts.value){if(own!==turn)return false;const reply=await api.synthesize({text:part,provider,language});if(!reply.ok)throw new Error(reply.error);if(own!==turn)return false;await playCloud(reply.value,companion);}
          speechNotice('');
        }catch(e){if(own!==turn)return false;if(preview)throw e;if(provider==='sarvam'){speechNotice(e.message+' Your answer remains visible as text.');return false;}cloudUnavailable=true;speechNotice(e.message+' Cloud read-aloud is paused; using Windows voice. Use Save & hear voice in Settings to retry.');try{await systemSpeech(text,language,companion);}catch{speechNotice(e.message+' Spoken audio is unavailable; your text reply is unchanged.');}}
      }

      return own===turn;
    }finally{if(own===turn){stop.hidden=true;if(notice.hidden)window.dispatchEvent(new CustomEvent('island:speech',{detail:{phase:'ready'}}));await api.wakePause(false);}}
  }
  window.islandSpeak=speak;
  api.onSpeech?.(({text,provider})=>{if(!settingsMode)speak(text,{provider}).catch(window.islandShowError);});
  api.onMicrophone?.(value=>{if(value.blocked){waking=false;cancel(false);}});
  api.onSettings?.(value=>{if(!value.speak&&!settingsMode)cancel();});
  api.onWake?.(async({name})=>{
    if(settingsMode)return;if(waking||nativeRecording||busy){if(!audio)api.wakePause(false);return;}
    waking=true;try{await window.islandOpenVoiceAssistant({start:true});}catch(e){window.islandShowError(e);api.wakePause(false);}finally{waking=false;}
  });
  api.onVoice?.(event=>{if(settingsMode)return;if(event.phase==='listening'){cancel(false);api.wakePause(true);}else if(['answer','done','error','idle'].includes(event.phase)&&!audio)api.wakePause(false);});
  window.addEventListener('pagehide',()=>cancel(!!audio||!!release));
})();
