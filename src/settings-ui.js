'use strict';
(()=>{
 if(!new URLSearchParams(location.search).has('settings'))return;
 const $=id=>document.getElementById(id);
 document.addEventListener('DOMContentLoaded',()=>{
  const voice=$('voiceGroup');
  function controls(title,ids,description=''){
   const card=document.createElement('div');card.className='settings-card';const heading=document.createElement('h4');heading.textContent=title;card.append(heading);
   if(description){const p=document.createElement('p');p.textContent=description;card.append(p);}
   for(const id of ids){const element=$(id);if(element)card.append(element.matches('input,select')?element.closest('label'):element);}
   return card;
  }
  const intro=document.createElement('div');intro.className='group-heading';intro.innerHTML='<h3>Voice & typing</h3><p>Groq is the default for transcription and replies. Gemini Live is available when you choose it.</p>';
  const typing=controls('Dictation',['voiceEnabled','cloudAudioConsent','voiceReadiness','voiceHotkey','voiceDevice','voiceInsert','testMic','stopMicTest','micMeter','micTestStatus'],'Hold Ctrl + Shift + Windows to type into your focused app. Escape cancels.');
  const conversation=controls('Voice conversation',['chatEngine']);
  const engineHint=document.createElement('p');engineHint.id='conversationHint';conversation.append(engineHint);
  const gemini=controls('Gemini Live setup',['geminiLiveStatus','geminiKeySetup','geminiKeySettings','checkGeminiLive','geminiLiveCheckStatus']);gemini.id='geminiOptions';conversation.append(gemini);
  const replies=controls('Spoken replies',['speak','companionTts','companionSystemVoice','companionVoice','readTypedReplies','voicePreview','companionStatus'],'Installed Windows voices work offline. Groq natural voices may require model access in your Groq account.');
  const advanced=document.createElement('details');advanced.id='advancedVoice';advanced.innerHTML='<summary>Advanced voice options</summary>';
  advanced.append(controls('Recognition & cleanup',['voiceCleanup','voiceStyle','voiceWhisper','voiceTelugu','chatOnSilence','speechSensitivity','ttsRate','ttsVolume']));
  advanced.append(controls('Wake name & diagnostics',['companionName','wakeCheck','engineCheck','screenCheck','engineStatus','groqVoiceSetup']));
  const legacyWake=$('wakeEnabled').closest('label');legacyWake.hidden=true;advanced.append(legacyWake);
  voice.replaceChildren(intro,typing,conversation,replies,advanced);
  if($('wipeTranscripts'))$('historyGroup').append($('wipeTranscripts'));
  $('languagesGroup').querySelector('h3').textContent='Language';
  const titleMap={providerGroup:'AI & API keys',voiceGroup:'Voice & typing',islandGroup:'Appearance',historyGroup:'History & privacy',diagnosticsGroup:'Diagnostics',aboutGroup:'About',languagesGroup:'Language',quietGroup:'Quiet Moments',quoteLibraryGroup:'Thought library',notificationsGroup:'Reminders',integrationsGroup:'Integrations'};
  const order=['providerGroup','voiceGroup','languagesGroup','islandGroup','notificationsGroup','integrationsGroup','historyGroup','quietGroup','quoteLibraryGroup','diagnosticsGroup','aboutGroup'],nav=document.querySelector('.settings-nav');
  for(const id of order){const button=nav.querySelector(`[data-settings-target="${id}"]`);if(button){button.textContent=titleMap[id];button.setAttribute('aria-controls',id);nav.append(button);}}
  function show(id){if(!$(id))return;document.querySelectorAll('#settings .settings-group').forEach(group=>group.hidden=group.id!==id);nav.querySelectorAll('button').forEach(button=>{const selected=button.dataset.settingsTarget===id;button.classList.toggle('active',selected);if(selected)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');});document.querySelector('.settings-heading h2').textContent=titleMap[id]||'Settings';document.querySelector('.settings-panel').scrollTop=0;}
  window.islandShowSettingsSection=show;
  show(({voice:'voiceGroup',providers:'providerGroup',quotes:'quietGroup'})[new URLSearchParams(location.search).get('pane')]||nav.querySelector('.active')?.dataset.settingsTarget||'providerGroup');
  function switches(){document.querySelectorAll('#settings input[type=checkbox]').forEach(input=>input.setAttribute('role','switch'));}
  switches();new MutationObserver(switches).observe($('settings'),{childList:true,subtree:true});
  function engine(){const live=$('chatEngine').value==='gemini_live';gemini.hidden=!live;engineHint.textContent=live?'Gemini Live sends conversation audio to Google. Dictation still uses the transcription provider selected in AI & API keys.':'Uses the transcription and assistant providers in AI & API keys. Groq is selected by default.';const cloudVoice=$('companionTts').value==='groq';$('companionVoice').closest('label').hidden=!cloudVoice;$('companionSystemVoice').closest('label').hidden=cloudVoice;}
  $('chatEngine').addEventListener('change',engine);$('companionTts').addEventListener('change',engine);window.island.onSettings(engine);window.island.get().then(engine);engine();
  document.querySelector('.settings-heading p').textContent='Choose a section. Your changes are saved together with Save changes.';
  window.islandSettingsUIReady=true;
 },{once:true});
})();
