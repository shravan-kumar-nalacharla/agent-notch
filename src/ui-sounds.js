'use strict';
(()=>{
 const api=window.island,policy=window.NotchSoundPolicy;let config=policy.DEFAULTS,state={},recording=false,speaking=false,previousMute,lastAt=0,lastHover=0,active;
 const names=new Set(['click','hover','mute','notification','timer','error','open']);
 const context=()=>({recording,speaking,meeting:state.microphone?.gaming||state.microphoneStatus?.callActive,dnd:state.quietMoments?.dnd});
 function stop(){if(active){active.pause();active.src='';active=null;}}
 async function play(name,volume=1){if(!names.has(name)||!policy.allowed(config,context(),name))return false;const time=performance.now();if(time-lastAt<(name==='hover'?180:55))return false;lastAt=time;stop();const sound=new Audio(new URL('assets/sounds/'+name+'.mp3',location.href).href);active=sound;sound.volume=Math.max(0,Math.min(.65,config.volume*volume*(name==='hover'?.22:1)));sound.onended=()=>{if(active===sound)active=null;};try{await sound.play();return true;}catch{if(active===sound)active=null;return false;}}
 function render(value){state=value;config=policy.validate(value.uiSounds||{});if(!config.enabled||config.volume===0)stop();}
 api.get().then(r=>{if(r.ok)render(r.value);});api.onSettings(render);
 api.onVoice?.(e=>{if(['connecting','listening','processing'].includes(e.phase)){recording=true;stop();}else if(['answer','done','error','idle','draft','liveStop'].includes(e.phase))recording=false;});
 window.addEventListener('island:speech',e=>{speaking=['queued','processing','speaking'].includes(e.detail.phase);if(speaking)stop();});
 api.onMicrophone?.(v=>{state={...state,microphoneStatus:v};if(previousMute!==undefined&&v.muted!==previousMute)play('mute');previousMute=v.muted;if(v.blocked)recording=false;});
 api.onUiSound?.(v=>play(v.name,v.volume??1));window.addEventListener('island:ui-error',()=>play('error'));
 document.addEventListener('click',e=>{const b=e.target.closest('button,[role=switch]');if(e.isTrusted&&b&&!b.disabled&&!b.closest('#microphonePrivacy')&&!b.closest('#agentStart'))play(b.dataset.tab==='tools'?'open':'click');},true);
 document.addEventListener('pointerover',e=>{if(e.pointerType==='touch')return;const b=e.target.closest('button');if(e.isTrusted&&b&&!b.disabled&&!b.contains(e.relatedTarget)&&performance.now()-lastHover>350){lastHover=performance.now();play('hover');}});
 window.addEventListener('pagehide',stop);window.NotchSounds={play,stop};
})();
