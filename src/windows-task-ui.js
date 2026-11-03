'use strict';
(()=>{
 if(new URLSearchParams(location.search).has('settings'))return;
 const panel=document.createElement('aside');panel.id='windowsTask';panel.hidden=true;
 panel.innerHTML='<div class="task-heading"><strong id="taskCurrent" role="status"></strong><button id="taskPause" type="button">Pause</button><button id="taskContinue" type="button" hidden>Continue</button><button id="taskStop" type="button">Stop</button></div><details id="taskDetails"><summary>Task steps</summary><ol id="taskSteps"></ol></details><div id="taskReview" hidden><small id="taskTarget"></small><pre id="taskDraft"></pre><div class="row"><button id="taskApprove" type="button">Confirm action</button><button id="taskDecline" type="button">Cancel task</button></div></div>';
 document.getElementById('messages').before(panel);let latest;
 const $=id=>document.getElementById(id),report=value=>{if(!value.ok)window.islandShowError?.(value.error);};
 $('taskPause').onclick=()=>window.island.pauseTask(latest?.id).then(report);$('taskContinue').onclick=()=>window.island.continueTask(latest?.id).then(report);
 $('taskStop').onclick=()=>window.island.cancelTask(latest?.id).then(report);
 const decide=allow=>{if(!latest?.review)return;const {id,review}=latest;$('taskApprove').disabled=true;$('taskDecline').disabled=true;window.island.confirmTask({id,approval:review.id,allow}).then(report).catch(window.islandShowError);};
 $('taskApprove').onclick=()=>decide(true);$('taskDecline').onclick=()=>decide(false);
 function render(value){if(!value)return;
  latest=value;const active=['planning','running','review','paused','auth','interrupted'].includes(value.phase);
  document.body.classList.toggle('has-windows-task',active);panel.hidden=!active;
  $('taskCurrent').textContent=value.current;$('taskStop').hidden=!active;
  $('taskPause').hidden=!['planning','running'].includes(value.phase);$('taskContinue').hidden=!['paused','auth','interrupted'].includes(value.phase);$('taskReview').hidden=value.phase!=='review';$('taskApprove').disabled=false;$('taskDecline').disabled=false;
  $('taskDetails').hidden=!(value.plan?.length||value.steps?.length);
  const list=$('taskSteps');list.replaceChildren();for(const text of value.plan?.length?value.plan:(value.steps||[]).map(x=>x.label)){const li=document.createElement('li');li.textContent=text;list.append(li);}
  if(value.review){$('taskTarget').textContent=[value.review.app,value.review.target].filter(Boolean).join(' · ');$('taskDraft').textContent=value.review.text||'Review the selected action before continuing.';}
  if(active){window.dispatchEvent(new CustomEvent('island:navigate',{detail:'assistant'}));$('status').textContent=value.phase==='review'?'Review action':value.current;}
  if(value.phase==='error'){window.islandShowError?.(value.current);window.dispatchEvent(new CustomEvent('island:task-error',{detail:value.current}));}
  window.dispatchEvent(new Event('island:layout-change'));
 }
 window.island.onTask(render);window.island.taskState().then(reply=>{if(reply.ok)render(reply.value);});
})();
