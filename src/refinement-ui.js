'use strict';
(()=>{
  const names={home:'house-simple',assistant:'chat-circle',notes:'note-pencil',focus:'hourglass-medium',agents:'robot',settings:'sliders-horizontal',tools:'squares-four',media:'music-notes',timer:'timer',water:'drop',shelf:'tray',files:'paperclip',todo:'check-circle',reminders:'bell',clips:'clipboard-text',dictionary:'book-open',snippets:'text-align-left',history:'clock-counter-clockwise',meetings:'microphone',projects:'folder-simple',weather:'cloud-sun',calendar:'calendar-blank',mirror:'camera',prompter:'text-t',system:'gauge',book:'book',course:'graduation-cap',workout:'barbell',spotify:'spotify-logo',notifications:'bell-ringing',plugins:'puzzle-piece'};
  const markup=id=>`<i class="ph ph-${names[id]||'circle'}" aria-hidden="true"></i>`;
  window.IslandIcons={markup};
  names.voiceAssistant='waveform';
  document.querySelectorAll('nav [data-tab]').forEach(button=>{const label=button.querySelector('span');button.innerHTML=markup(button.dataset.tab)+(label?.outerHTML||'');});
  for(const [id,name] of [['pin','push-pin'],['openFileActions','paperclip'],['collapse','caret-up'],['mic','microphone']]){const button=document.getElementById(id);if(button)button.innerHTML=`<i class="ph ph-${name}" aria-hidden="true"></i>`;}
  document.getElementById('chatHistory').onclick=()=>window.islandOpenTool?.('history');
  const reduced=()=>document.body.dataset.motion==='off'||matchMedia('(prefers-reduced-motion: reduce)').matches;
  function applyStyle(state){const appearance=state.appearance||{},accent=/^#[0-9a-f]{6}$/i.test(appearance.accentColor||'')?appearance.accentColor:'#d6ed83',fonts={system:'"Segoe UI Variable Text","Segoe UI",sans-serif',arial:'Arial,sans-serif',serif:'Georgia,serif',mono:'"Cascadia Code",Consolas,monospace'};document.body.style.setProperty('--user-accent',accent);document.body.style.setProperty('--user-font',fonts[appearance.uiFont]||fonts.system);const rgb=accent.slice(1).match(/../g).map(value=>parseInt(value,16)),luma=rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;document.body.style.setProperty('--on-user-accent',luma>145?'#17200c':'#ffffff');}
  window.island.get().then(reply=>{if(reply.ok)applyStyle(reply.value);});window.island.onSettings(applyStyle);
  const targets=new WeakMap();
  document.addEventListener('wheel',event=>{
    if(event.defaultPrevented||event.ctrlKey||event.shiftKey||Math.abs(event.deltaX)>Math.abs(event.deltaY)||event.target.closest('input,textarea,select,[role=slider],.home-quick-grid,.carousel-head,.widget-heading,.focus-heading'))return;
    let el=event.target instanceof Element?event.target:null;
    while(el&&el!==document.body){if(el.scrollHeight>el.clientHeight+2&&/(auto|scroll)/.test(getComputedStyle(el).overflowY))break;el=el.parentElement;}
    if(!el||el===document.body)return;event.preventDefault();const delta=Math.sign(event.deltaY)*Math.min(18,Math.abs(event.deltaY)*(event.deltaMode===1?5:.18));let state=targets.get(el);if(!state){state={target:el.scrollTop,frame:0};targets.set(el,state);}state.target=Math.max(0,Math.min(el.scrollHeight-el.clientHeight,Math.max(el.scrollTop-32,Math.min(el.scrollTop+32,state.target+delta))));if(reduced()){el.scrollTop=state.target;return;}if(state.frame)return;
    function frame(){const gap=state.target-el.scrollTop;if(!el.isConnected||Math.abs(gap)<1){el.scrollTop=state.target;state.frame=0;return;}el.scrollTop+=Math.sign(gap)*Math.max(1,Math.min(4,Math.abs(gap)*.1));state.frame=requestAnimationFrame(frame);}state.frame=requestAnimationFrame(frame);
  },{passive:false});
  const tools=document.getElementById('tools');let tick=0;
  function paintWheel(){tick=0;const grid=tools?.querySelector('.widget-grid');if(!grid)return;const rect=grid.getBoundingClientRect(),center=rect.top+rect.height*.5;grid.querySelectorAll('button').forEach(button=>{const r=button.getBoundingClientRect(),distance=Math.min(1,Math.abs(r.top+r.height/2-center)/Math.max(1,rect.height*.6));button.style.setProperty('--wheel-scale',String(1-distance*.16));button.style.setProperty('--wheel-opacity',String(1-distance*.72));});}
  tools?.addEventListener('scroll',()=>{if(!tick)tick=requestAnimationFrame(paintWheel);},{passive:true,capture:true});
  if(tools)new MutationObserver(()=>{if(!tick)tick=requestAnimationFrame(paintWheel);}).observe(tools,{childList:true});
})();
