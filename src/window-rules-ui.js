'use strict';
(()=>{
 if(!new URLSearchParams(location.search).has('settings'))return;
 document.addEventListener('DOMContentLoaded',()=>{
  const card=document.createElement('div');card.className='settings-card';card.id='windowRulesSettings';card.innerHTML='<h4>Fullscreen and app rules</h4><p>Keep the idle line and apply rules on the island’s display. Clicking the line, using a shortcut or opening from the tray temporarily overrides the rule until you close the panel.</p><label>When hiding fullscreen apps is enabled<select id="fullscreenBehavior"><option value="hide">Hide</option><option value="line">Line only</option><option value="normal">Normal</option></select></label><label>Maximized windows<select id="maximizedBehavior"><option value="normal">Normal</option><option value="line">Line only</option><option value="hide">Hide</option></select></label><p>App rules override these defaults. Use a Windows process name such as brave or game.exe.</p><div id="windowRuleRows"></div><button type="button" id="addWindowRule">Add app rule</button>';
  document.getElementById('islandGroup').append(card);const rows=document.getElementById('windowRuleRows');
  const dirty=()=>card.dispatchEvent(new Event('input',{bubbles:true}));
  function add(value={process:'',fullscreen:'hide',maximized:'normal'}){
   const row=document.createElement('div');row.dataset.windowRule='';row.className='window-rule-row';
   const name=document.createElement('input');name.type='text';name.maxLength=100;name.value=value.process;name.placeholder='Process name';name.dataset.ruleProcess='';name.setAttribute('aria-label','Application process name');row.append(name);
   for(const key of ['fullscreen','maximized']){const label=document.createElement('label');label.textContent=key==='fullscreen'?'Fullscreen':'Maximized';const select=document.createElement('select');select.dataset.ruleMode=key;for(const mode of ['normal','line','hide'])select.add(new Option(mode,mode));select.value=value[key];label.append(select);row.append(label);}
   const remove=document.createElement('button');remove.type='button';remove.textContent='Remove';remove.onclick=()=>{row.remove();dirty();};row.append(remove);rows.append(row);
  }
  document.getElementById('addWindowRule').onclick=()=>{if(rows.children.length>=40)return;add();dirty();};
  window.islandWindowRulesValue=()=>({fullscreenBehavior:document.getElementById('fullscreenBehavior').value,maximizedBehavior:document.getElementById('maximizedBehavior').value,windowRules:[...rows.children].map(row=>({process:row.querySelector('[data-rule-process]').value.trim(),fullscreen:row.querySelector('[data-rule-mode=fullscreen]').value,maximized:row.querySelector('[data-rule-mode=maximized]').value}))});
  window.islandLoadWindowRules=appearance=>{document.getElementById('fullscreenBehavior').value=appearance.fullscreenBehavior||'hide';document.getElementById('maximizedBehavior').value=appearance.maximizedBehavior||'normal';rows.replaceChildren();for(const rule of appearance.windowRules||[])add(rule);};
  window.island.get().then(r=>{if(r.ok)window.islandLoadWindowRules(r.value.appearance);});
 },{once:true});
})();
