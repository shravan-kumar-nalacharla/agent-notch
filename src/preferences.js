'use strict';

(() => {
  const api = window.island;
  const $ = id => document.getElementById(id);
  const choose = (id, label, options) => `<label>${label}<select id="${id}">${options.map(([value, text]) => `<option value="${value}">${text}</option>`).join('')}</select></label>`;
  const check = (id, label) => `<label class="check"><input id="${id}" type="checkbox">${label}</label>`;

  const panel = document.createElement('div');
  panel.id = 'preferences';
  panel.innerHTML = `
    <section class="settings-group" id="voiceGroup">
      <div class="group-heading"><h3>Voice typing</h3><small>Hold the chosen key to dictate. Double tap to keep listening.</small></div>
      ${check('voiceEnabled', 'Enable the global voice hotkey')}
      ${choose('voiceHotkey', 'System-wide dictation hotkey', [['ctrlShiftWin', 'Ctrl + Shift + Windows'], ['rightAlt', 'Right Alt'], ['rightCtrl', 'Right Ctrl']])}
      <label>Microphone<select id="voiceDevice"><option value="">Windows default microphone</option></select></label>
      ${choose('voiceCleanup', 'Cleanup', [['none', 'Original transcript'], ['light', 'Light - keep my words'], ['medium', 'Medium - improve clarity']])}
      ${choose('voiceStyle', 'Writing style', [['casual', 'Casual'], ['formal', 'Formal'], ['very casual', 'Very casual'], ['excited', 'Excited'], ['code', 'Code']])}
      ${choose('voiceTelugu', 'Telugu output', [['', 'Keep detected script'], ['telugu', 'Telugu script'], ['mixed', 'Telugu + English'], ['roman', 'Romanized Telugu']])}
      ${check('voiceInsert', 'Type into the app where dictation started')}
      ${check('voiceWhisper', 'Boost quiet speech')}
      <small class="settings-hint">Ctrl + Shift + Windows types in your focused app. Click the microphone for island chat. Escape cancels. Password fields and password managers are excluded.</small>
      <div class="row">
        <button type="button" id="engineCheck">Check voice engine</button>
        <button type="button" id="screenCheck">Check screen engine</button>
      </div>
      <p id="engineStatus" role="status"></p>
    </section>
    <section class="settings-group" id="islandGroup">
      <div class="group-heading"><h3>Island</h3><small>Appearance and Windows behavior.</small></div>
      <label>Your name<input id="profileName" maxlength="50" placeholder="How should Agent Notch address you?"></label>
      ${choose('islandShape', 'Shape', [['notch', 'Dynamic Notch'], ['corner', 'Corner Island'], ['pill', 'Floating pill'], ['line', 'Minimal line']])}
      ${choose('islandTheme', 'Theme', [['system', 'Follow Windows'], ['dark', 'Dark'], ['light', 'Light']])}
      <div class="settings-card"><h4>Size, colors and typography</h4>${choose('islandPanelSize','Application size',[['auto','Automatic — fit each panel'],['compact','Compact'],['standard','Medium'],['spacious','Large']])}<div class="row"><label>Panel width (0 = automatic)<input id="islandPanelWidth" type="number" min="0" max="800" step="10" value="0"></label><label>Panel height (0 = automatic)<input id="islandPanelHeight" type="number" min="0" max="650" step="10" value="0"></label></div><label>Accent color<input id="islandAccentColor" type="color" value="#d6ed83"></label>${choose('islandUIFont','Interface font',[['system','Segoe UI — Windows default'],['arial','Arial — clean sans serif'],['serif','Georgia — serif'],['mono','Cascadia / Consolas — monospace']])}<small>The accent colors panel lighting, timer controls and selected actions.</small></div>
      ${check('pinIsland', 'Keep the island fully open')}
      ${choose('islandDisplay', 'Screen', [['primary', 'Primary screen'], ['cursor', 'Screen under pointer']])}
      ${check('islandMinimal', 'Use a thin line when closed')}
      ${check('islandMascot', 'Show the eyes companion')}

      ${check('islandFullscreen', 'Hide while another app is full screen')}
      ${check('islandAutoClose', 'Close when the pointer leaves')}
      ${check('islandStartup', 'Start with Windows')}
      ${choose('openShortcut', 'Open island shortcut', [['CommandOrControl+Shift+Space', 'Ctrl + Shift + Space'], ['CommandOrControl+Alt+Space', 'Ctrl + Alt + Space'], ['CommandOrControl+Shift+I', 'Ctrl + Shift + I']])}
      ${choose('voiceShortcut', 'Voice chat shortcut', [['CommandOrControl+Shift+Alt+Space', 'Ctrl + Shift + Alt + Space'], ['CommandOrControl+Alt+Shift+V', 'Ctrl + Alt + Shift + V'], ['CommandOrControl+Shift+D', 'Ctrl + Shift + D']])}
    </section>
    <section class="settings-group" id="historyGroup">
      <div class="group-heading"><h3>History</h3><small>Local-only transcript and clipboard retention.</small></div>
      <label>Keep transcripts for days (0 = off)<input id="historyDays" type="number" min="0" max="365"></label>
      <small class="settings-hint">Clipboard history is off by default and can be enabled in Tools. Provider keys are encrypted locally.</small>
    </section>`;
  panel.insertAdjacentHTML('beforeend', `
    <section class="settings-group" id="diagnosticsGroup">
      <div class="group-heading"><h3>Voice diagnostics</h3><small>Checks run locally unless you explicitly test an API connection.</small></div>
      <div class="row"><button type="button" id="runDiagnostics">Run checks</button></div>
      <div id="diagnosticsOutput" class="diagnostics-output">No checks run yet.</div>
    </section>`);
  panel.insertAdjacentHTML('beforeend', `
    <section class="settings-group" id="aboutGroup">
      <div class="group-heading"><h3>About Agent Notch</h3><small>Version ${api.version || '0.4.0'}</small></div>
      <p>Agent Notch keeps tasks, notes, voice history and preferences on this computer. Provider requests contain only the content required for the action you start.</p>
      <small class="settings-hint">Installer builds are currently unsigned. Windows SmartScreen may show an unknown-publisher warning.</small>
    </section>`);

  $('providerGroup')?.insertAdjacentElement('afterend', panel);
  const savebar = document.createElement('div');
  savebar.className = 'settings-savebar';
  savebar.innerHTML = '<span id="settingsSaveStatus" role="status" aria-live="polite">Settings ready</span><button type="button" class="primary-button" data-save-settings>Save changes</button>';
  $('settings').append(savebar);
  savebar.querySelector('button').onclick = () => window.islandSaveSettings?.();
  $('islandGroup').addEventListener('change', event => {if(event.target.matches('[data-favorite]') && document.querySelectorAll('[data-favorite]:checked').length>8){event.target.checked=false;$('settingsSaveStatus').textContent='Choose up to eight extra shortcuts.';}});
  window.islandSettingsDirty=false;window.islandSettingsRevision=0;
  $('settings').addEventListener('input', () => {window.islandSettingsDirty=true;window.islandSettingsRevision++;$('settingsSaveStatus').textContent = 'Unsaved changes';savebar.classList.remove('saved');window.islandUpdateVoiceReadiness?.();});
  $('islandPanelSize').addEventListener('change',()=>{$('islandPanelWidth').value=0;$('islandPanelHeight').value=0;window.islandAstryx?.scan();});
  const favoriteTools = [['media','Media'],['water','Water'],['shelf','Shelf'],['todo','Tasks'],['clips','Clipboard'],['reminders','Reminders'],['mirror','Mirror'],['prompter','Teleprompter'],['system','System'],['dictionary','Dictionary'],['snippets','Snippets'],['history','History'],['meetings','Meetings'],['projects','Projects'],['weather','Weather'],['calendar','Calendar']];
  $('islandGroup').insertAdjacentHTML('beforeend', '<h3 class="dock-heading">Bottom menu shortcuts</h3><small>Home, chat, notes, Focus Time, Agents and Settings stay available. All features stays last. Choose up to eight extra shortcuts.</small><div class="favorite-options">' + favoriteTools.map(([id,label]) => `<label class="check"><input type="checkbox" data-favorite="${id}">${label}</label>`).join('') + '</div>');

  $('islandGroup').insertAdjacentHTML('beforeend', `
    <h3 class="dock-heading">Compact activation</h3>
    ${choose('islandDensity','Card size',[['compact','Compact · 410 DIP'],['default','Default · 470 DIP'],['roomy','Roomy · 540 DIP']])}
    ${choose('islandMotion','Motion',[['standard','Standard'],['subtle','Subtle'],['off','Off']])}
    <div class="field-grid two"><label>Idle line width (82–118 DIP)<input id="lineWidth" type="number" min="82" max="118"></label><label>Idle line thickness (2–3 DIP)<input id="lineHeight" type="number" min="2" max="3"></label><label>Line opacity (0.12–0.75)<input id="lineOpacity" type="number" min="0.12" max="0.75" step="0.05"></label><label>Hover intent (0–400 ms)<input id="hoverIntent" type="number" min="0" max="400"></label><label>Close delay (100–5000 ms)<input id="closeGrace" type="number" min="100" max="5000"></label></div>`);
  $('islandGroup').insertAdjacentHTML('beforeend',`<div class="settings-card"><h4>Sound feedback</h4>${check('uiSoundsEnabled','Enable all app sound effects')}${check('uiSoundsHover','Subtle button hover sounds')}<label>Sound effect volume<input id="uiSoundsVolume" type="range" min="0" max="100" step="5"></label><small>Turn this off to disable every app sound effect, including clicks, Enter, mute, no-speech/errors, timers and reminders. Spoken answers and music have their own volume. Silent during capture and spoken replies.</small></div>`);
  $('historyGroup').insertAdjacentHTML('beforebegin', `<section id="quietGroup" class="settings-group"><h3>Quiet Moments</h3><small>Curated offline thoughts stay inside the open island. Paused during voice, focus and Do not disturb.</small>${check('quietEnabled','Enable Quiet Moments')}${check('quietDnd','Do not disturb')}${check('quietAllDay','Show throughout the day')}${choose('quietCategory','Category',[['mixed','Mixed'],['calm','Calm'],['focus','Focus'],['motivation','Motivation'],['philosophy','Philosophy']])}<div class="field-grid two">${[['quietMorningStart','Morning from',6],['quietMorningEnd','Morning until',11],['quietEveningStart','Evening from',17],['quietEveningEnd','Evening until',22],['quietCap','Thoughts per day',8],['quietCooldown','Average interval in minutes',45]].map(([id,label,value])=>`<label>${label}<input id="${id}" type="number" value="${value}"></label>`).join('')}</div><small id="quietFavorites"></small></section>`);
  $('providerAdvancedOptions').innerHTML=`<div id="deepseekOptions" hidden><small>Official DeepSeek API. Flash is the default; use Pro deliberately for more complex requests. Speech and screen capture use separate providers.</small><label>Model presets<select id="deepseekPreset"><option value="deepseek-flash">DeepSeek Flash</option><option value="deepseek-v4-pro">DeepSeek V4 Pro</option></select></label>${check('deepseekThinking','Enable thinking for typed chat')}${check('deepseekStream','Stream typed chat replies')}<small id="providerUsage">No token usage recorded yet.</small><button type="button" id="deepseekPricing">Official models & pricing</button></div>`;
  $('deepseekPreset').onchange=()=>{$('chatModel').value=$('deepseekPreset').value;};
  $('deepseekPricing').onclick=()=>api.openPricing();
  $('diagnosticsGroup').insertAdjacentHTML('beforeend', `<h3 class="dock-heading">Lyrics diagnostics</h3><small>Shows only the current lookup. No persistent media-history or lyric logging.</small><div class="row"><button id="lyricsDiagnostics" type="button">Current lookup details</button><button id="lyricsNetwork" type="button">Test LRCLIB with a public sample track</button></div><pre id="lyricsDiagnosticsOutput" class="diagnostics-output"></pre>`);
  $('lyricsDiagnostics').onclick=async()=>{const r=await api.desktop('lyrics:diagnostics');$('lyricsDiagnosticsOutput').textContent=r.ok?JSON.stringify(r.value||{status:'No lookup yet'},null,2):r.error;};
  $('lyricsNetwork').onclick=async()=>{$('lyricsDiagnosticsOutput').textContent='Testing…';const r=await api.desktop('lyrics:network-test');$('lyricsDiagnosticsOutput').textContent=r.ok?JSON.stringify(r.value,null,2):r.error;};
  $('voiceGroup').insertAdjacentHTML('afterbegin', `<div class="group-heading"><h3>Your companion</h3><small>The wake name uses the installed Windows recognizer locally. It listens only when enabled. Cloud voice uses your selected provider. Mute stops the wake recognizer; unmute restores the saved listening mode.</small></div><label>Companion name<input id="companionName" maxlength="30" placeholder="Cutie"></label>${check('wakeEnabled','Listen for hey + companion name')}${choose('companionTts','Reply voice engine',[['sarvam','Sarvam Bulbul — natural Indian voice'],['groq','Groq Orpheus — natural voice'],['system','Installed Windows voice — offline']])}${choose('companionVoice','Natural voice',['hannah','diana','autumn','austin','daniel','troy'].map(v=>[v,v]))}<label>Installed voice<select id="companionSystemVoice"><option value="">Best available installed voice</option></select></label><div class="row"><button type="button" id="voicePreview">Save & hear voice</button><button type="button" id="wakeCheck">Wake engine status</button></div><small id="companionStatus"></small>`);
  $('voiceGroup').insertAdjacentHTML('afterbegin', `<div class="group-heading"><h3>Voice conversation</h3><small>Standard uses your selected transcription and assistant providers. Gemini Live streams audio to Google only when you select it. Tap the microphone or press Escape to stop. Use headphones to prevent speaker echo.</small></div>${choose('chatEngine','Conversation mode',[['standard','Selected voice provider'],['sarvam','Sarvam — speech, answers & natural voice'],['gemini_live','Gemini Live — optional Google voice']])}<p id="geminiLiveStatus" role="status"></p><div class="row"><button type="button" id="geminiKeySetup">Get a Gemini API key</button><button type="button" id="geminiKeySettings">Enter Gemini key</button></div><small>Save the Gemini key under AI & API keys. Allow cloud audio and enable Read assistant answers aloud for spoken Live replies. Standard chat and global dictation keep their selected speech provider. Windows task actions are available in both conversation modes.</small>`);
  $('voiceGroup').insertAdjacentHTML('afterbegin','<label>Current book or topic (optional)<textarea id="readingContext" maxlength="1000" rows="2" placeholder="For example: Thus Spoke Zarathustra; explain older English in modern English"></textarea></label><small>This saved context is sent to your selected voice provider when you ask a question. Recent voice questions are remembered in memory for 30 minutes; New conversation clears them.</small>');
  $('voiceGroup').insertAdjacentHTML('afterbegin',`${choose('sarvamVoice','Sarvam natural voice',window.NotchProviders.sarvamVoices.map(v=>[v.id,v.label]))}<p id="sarvamStatus" role="status"></p><div id="sarvamActions" class="row"><button type="button" id="sarvamKeySettings">Enter Sarvam key</button><button type="button" id="sarvamKeySetup">Get a Sarvam API key</button><button type="button" id="enableSarvamPtt">Use Sarvam with push-to-talk</button></div>`);
  $('sarvamKeySetup').onclick=()=>api.openSarvamSetup();
  $('sarvamKeySettings').onclick=()=>{document.querySelector('[data-settings-target="providerGroup"]').click();$('key-sarvam').scrollIntoView({block:'center'});$('key-sarvam').focus();};
  $('enableSarvamPtt').onclick=async()=>{$('chatEngine').value='sarvam';$('companionTts').value='sarvam';$('listeningMode').value='ptt';$('speak').checked=true;$('chatEngine').dispatchEvent(new Event('change',{bubbles:true}));if(!$('cloudAudioConsent').checked){$('sarvamStatus').textContent='Allow cloud audio below before enabling Sarvam push-to-talk.';return;}const saved=await window.islandSaveSettings(),status=await api.get();$('sarvamStatus').textContent=saved?'Settings saved. '+(status.value?.voiceStatus?.message||'Check voice readiness above.'):'Not saved. Check the save status.';};
  $('geminiKeySetup').onclick=()=>api.openGeminiSetup();
  $('geminiKeySettings').onclick=()=>{document.querySelector('[data-settings-target="providerGroup"]').click();$('key-gemini').scrollIntoView({block:'center'});$('key-gemini').focus();};
  $('geminiLiveStatus').insertAdjacentHTML('afterend','<button type="button" id="checkGeminiLive">Save & check Gemini Live</button><p id="geminiLiveCheckStatus" role="status"></p>');
  $('checkGeminiLive').onclick=async()=>{if(!await window.islandSaveSettings())return;const button=$('checkGeminiLive');button.disabled=true;$('geminiLiveCheckStatus').textContent='Checking Gemini Live access without opening the microphone…';try{const response=await api.checkGeminiLive();$('geminiLiveCheckStatus').textContent=response.ok?response.value:response.error;}catch(error){$('geminiLiveCheckStatus').textContent=error.message;}finally{button.disabled=false;}};
  $('voiceGroup').insertAdjacentHTML('beforeend', `${check('readTypedReplies','Also read typed chat replies aloud')}<button id="groqVoiceSetup" type="button">Groq voice setup / model terms</button><small>Installed Windows voice works offline. Groq voice may need a separate model-access or terms step in your Groq account. Typed chat stays silent unless explicitly enabled above.</small>`);
  $('groqVoiceSetup').onclick=()=>api.openVoiceSetup();
  function installedVoices(){const selected=$('companionSystemVoice').value;$('companionSystemVoice').replaceChildren(new Option('Best available installed voice',''));for(const voice of speechSynthesis.getVoices())$('companionSystemVoice').add(new Option(voice.name+' · '+voice.lang,voice.voiceURI));$('companionSystemVoice').value=selected;}
  if(!new URLSearchParams(location.search).has('settings'))installedVoices();else document.addEventListener('click',event=>{if(event.target.closest('[data-settings-target=voiceGroup]'))installedVoices();});speechSynthesis.addEventListener('voiceschanged',installedVoices);
  $('voicePreview').onclick=async()=>{if(!await window.islandSaveSettings())return;try{$('companionStatus').textContent='Preparing voice…';await window.islandSpeak("Hi. I'm "+$('companionName').value+'. How can I help?',{preview:true});$('companionStatus').textContent='Voice preview complete.';}catch(e){$('companionStatus').textContent=e.message;}};
  $('wakeCheck').onclick=async()=>{const r=await api.companionCheck();$('companionStatus').textContent=r.ok?(r.value.enabled?'Listening for hey '+r.value.name:'Wake name is off')+' · Recognizers: '+(r.value.recognizers.join(', ')||'none'):r.error;};
  $('aboutGroup').insertAdjacentHTML('beforeend', `<h3 class="dock-heading">Updates</h3><p id="updateState" role="status">Checking for updates…</p><div class="row"><button type="button" id="checkUpdates">Check for updates</button><button type="button" id="installUpdate" hidden>Restart and install</button></div><small>Updates come from the public Agent Notch release channel. Settings, encrypted keys and local data are kept. Restart waits while recording, capturing, using the terminal, editing unsaved settings or running a task.</small>`);
  const showUpdate=value=>{
    if(!value||!$('updateState'))return;
    $('updateState').textContent=(value.message||'Updates have not been checked yet.')+(value.detail?' '+value.detail:'');
    const busy=['checking','downloading','installing'].includes(value.status);
    $('checkUpdates').disabled=busy||!value.enabled;
    $('installUpdate').hidden=value.status!=='ready';
    $('installUpdate').disabled=busy;
  };
  api.updateStatus?.().then(r=>{if(!r.ok)$('updateState').textContent=r.error;else showUpdate(r.value);}).catch(error=>{$('updateState').textContent=error.message;});
  api.onUpdate?.(showUpdate);
  $('checkUpdates').onclick=async()=>{
    $('checkUpdates').disabled=true;$('updateState').textContent='Checking for updates…';
    const r=await api.checkForUpdates();
    if(!r.ok)$('updateState').textContent=r.error;else showUpdate(r.value);
  };
  $('installUpdate').onclick=async()=>{
    $('installUpdate').disabled=true;$('updateState').textContent='Closing Agent Notch to install the update…';
    const r=await api.installUpdate();
    if(!r.ok){$('installUpdate').disabled=false;$('updateState').textContent=r.error;}
  };
  $('aboutGroup').insertAdjacentHTML('beforeend', `<h3 class="dock-heading">What’s new</h3><div id="whatsNew" class="release-notes">Loading release notes…</div><button type="button" id="openReleases">Open full release history</button>`);
  const escapeNote=text=>String(text).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  api.releaseNotes?.().then(r=>{
    if(!r.ok){$('whatsNew').textContent=r.error;return;}
    const releases=r.value?.releases||[];
    $('whatsNew').innerHTML=releases.slice(0,4).map((release,index)=>`<details ${index===0?'open':''}><summary><strong>v${escapeNote(release.version)}</strong> · ${escapeNote(release.title)} <small>${escapeNote(release.date)}</small></summary><ul>${release.notes.map(note=>`<li>${escapeNote(note)}</li>`).join('')}</ul></details>`).join('')||'<small>No release notes are bundled with this build.</small>';
  }).catch(error=>{$('whatsNew').textContent=error.message;});
  $('openReleases').onclick=()=>api.openExternalLink('https://github.com/shravan-kumar-nalacharla/agent-notch-releases/releases');
  $('aboutGroup').insertAdjacentHTML('beforeend', `<h3 class="dock-heading">Installation</h3><p id="installationState">Checking installation…</p>${check('uninstallDeleteData','Also permanently delete Agent Notch settings, keys and history')}<button type="button" id="uninstallApp">Uninstall Agent Notch…</button><small>Default uninstall keeps your personal data. Removal always uses the registered Windows uninstaller.</small>`);
  api.installation().then(r=>{$('installationState').textContent=r.ok&&r.value.installed?'Installed '+r.value.version+' · '+r.value.location:r.value?.message||r.error||'Portable development build';$('uninstallApp').disabled=!r.ok||!r.value.installed;});
  $('uninstallApp').onclick=async()=>{const r=await api.uninstall({deleteData:$('uninstallDeleteData').checked});if(!r.ok)$('installationState').textContent=r.error;};
  $('providerHint').textContent = 'Keys are encrypted with Windows secure storage. While recording, dictation audio goes to the speech provider; Gemini Live streams audio to Google. Raw audio is not retained.';

  const visionLabel = document.createElement('label');
  visionLabel.textContent = 'Screen guidance model';
  const visionInput = document.createElement('input');
  visionInput.id = 'visionModel';
  visionLabel.append(visionInput);
  $('speechModel').closest('label').insertAdjacentElement('afterend', visionLabel);
  visionLabel.insertAdjacentHTML('beforebegin','<label>Screen guidance provider<select id="visionProvider"></select></label>');

  async function voiceDevices() {
    $('engineStatus').textContent = 'Checking the Windows voice engine...';
    try {
      const response = await api.nativeVoice('devices');
      if (!response.ok) throw new Error(response.error);
      $('engineStatus').textContent = `Connected: ${response.value.inputs.length} microphone(s), ${response.value.outputs.length} output(s).`;
    } catch (caught) {
      $('engineStatus').textContent = caught.message;
    }
  }

  async function screenEngine() {
    $('engineStatus').textContent = 'Checking OCR, UI Automation and grounding...';
    try {
      const response = await api.probeScreen();
      if (!response.ok) throw new Error(response.error);
      $('engineStatus').textContent = response.value.ready
        ? 'Screen engine connected: OCR, UI Automation and grounding.'
        : response.value.error || 'Screen engine unavailable.';
    } catch (caught) {
      $('engineStatus').textContent = caught.message;
    }
  }

  function load(state) {
    if (!state) return;
    const voice = state.voice || {};
    const appearance = state.appearance || {};window.islandLoadWindowRules?.(appearance);
    $('islandDensity').value=appearance.density||'default';$('islandMotion').value=appearance.motion||'standard';$('lineWidth').value=appearance.lineWidthDip||100;$('lineHeight').value=appearance.lineHeightDip||2;$('lineOpacity').value=appearance.lineOpacity??.35;$('hoverIntent').value=appearance.hoverIntentMs??100;$('closeGrace').value=appearance.mouseleaveGraceMs??300;
    const q=state.quietMoments||{};$('quietEnabled').checked=q.enabled!==false;$('quietDnd').checked=!!q.dnd;$('quietAllDay').checked=q.allDay!==false;$('quietCategory').value=q.category||'mixed';for(const [id,key,fallback]of [['quietMorningStart','morningStart',6],['quietMorningEnd','morningEnd',11],['quietEveningStart','eveningStart',17],['quietEveningEnd','eveningEnd',22],['quietCap','dailyCap',8],['quietCooldown','cooldownMinutes',45]])$(id).value=q[key]??fallback;
    $('deepseekThinking').checked=!!state.deepseek?.thinking;$('deepseekStream').checked=state.deepseek?.stream!==false;
    if(!$('visionProvider').options.length)for(const[p,config]of Object.entries(state.providers)){if(config.vision){const option=document.createElement('option');option.value=p;option.textContent=p;$('visionProvider').append(option);}}$('visionProvider').value=state.visionProvider||(state.providers[state.assistant]?.vision?state.assistant:state.speech);
    $('voiceEnabled').checked = !!voice.enabled;
    $('voiceHotkey').value = voice.hotkey === 'ctrlWin' ? 'ctrlShiftWin' : (voice.hotkey || 'ctrlShiftWin');
    if([...$('voiceDevice').options].some(option=>option.value===(voice.inputDeviceId||'')))$('voiceDevice').value=voice.inputDeviceId||'';
    $('voiceCleanup').value = voice.cleanup || 'light';
    $('voiceStyle').value = voice.style || 'casual';
    $('voiceTelugu').value = voice.telugu || '';
    $('language').value = voice.language || '';
    $('voiceInsert').checked = voice.autoInsert !== false;
    $('uiSoundsEnabled').checked=state.uiSounds?.enabled!==false;$('uiSoundsHover').checked=state.uiSounds?.hover!==false;$('uiSoundsVolume').value=Math.round((state.uiSounds?.volume??.25)*100);
    const companion=state.companion||{};$('chatEngine').value=companion.chatEngine||'standard';$('geminiLiveStatus').textContent=state.keyErrors?.gemini||(!state.configured.gemini?'Gemini key needed — enter it under AI & API keys.':!state.languages?.cloudAudioConsent?'Gemini key saved. Allow cloud audio, then save.':!state.speak?'Gemini ready for text replies. Enable Read assistant answers aloud for spoken replies.':'Gemini Live ready. Start a conversation with the microphone.');$('companionName').value=companion.name||'Cutie';$('readingContext').value=companion.readingContext||'';$('wakeEnabled').checked=state.microphone?.mode==='always';$('companionTts').value=companion.tts||'system';$('readTypedReplies').checked=!!companion.readTypedReplies;$('companionVoice').value=companion.voice||'hannah';$('sarvamVoice').value=companion.sarvamVoice||'priya';$('sarvamStatus').textContent=state.configured.sarvam?'Sarvam key saved. Use push-to-talk or Save & hear voice.':'Sarvam key needed — add it in AI & API keys. Audio and reply text are sent to Sarvam when used.';$('companionSystemVoice').value=companion.systemVoice||'';
    $('voiceWhisper').checked = voice.whisper !== false;
    document.querySelectorAll('[data-favorite]').forEach(el => el.checked = (appearance.favorites || []).includes(el.dataset.favorite));
    $('islandDisplay').value = appearance.display || 'primary';
    $('profileName').value = state.profileName || '';
    $('islandShape').value = appearance.shape || 'notch';
    $('islandTheme').value = appearance.theme || 'system';
    $('islandPanelSize').value=appearance.panelSize||'auto';$('islandPanelWidth').value=appearance.panelWidth||0;$('islandPanelHeight').value=appearance.panelHeight||0;$('islandAccentColor').value=appearance.accentColor||'#d6ed83';$('islandUIFont').value=appearance.uiFont||'system';
    $('pinIsland').checked = !!appearance.pinned;
    $('islandMinimal').checked = !!appearance.minimal;
    $('islandMascot').checked = appearance.mascot !== false;
    $('islandFullscreen').checked = appearance.hideFullscreen !== false;
    $('islandAutoClose').checked = appearance.autoClose !== false;
    $('islandStartup').checked = !!state.autostart;
    $('openShortcut').value = state.shortcuts?.open || 'CommandOrControl+Shift+Space';
    $('voiceShortcut').value = state.shortcuts?.voice || 'CommandOrControl+Shift+Alt+Space';
    document.body.classList.toggle('minimal', !!appearance.minimal);
    document.body.classList.toggle('no-mascot', appearance.mascot === false);
  }

  window.islandPreferences = () => ({
    uiSounds:{enabled:$('uiSoundsEnabled').checked,hover:$('uiSoundsHover').checked,volume:+$('uiSoundsVolume').value/100},
    companion:{chatEngine:$('chatEngine').value,readTypedReplies:$('readTypedReplies').checked,name:$('companionName').value,wakeEnabled:$('wakeEnabled').checked,tts:$('companionTts').value,voice:$('companionVoice').value,systemVoice:$('companionSystemVoice').value,sarvamVoice:$('sarvamVoice').value,readingContext:$('readingContext').value},
    profileName: $('profileName').value,
    visionProvider:$('visionProvider').value,
    deepseek:{thinking:$('deepseekThinking').checked,stream:$('deepseekStream').checked},
    quietMoments:{enabled:$('quietEnabled').checked,dnd:$('quietDnd').checked,allDay:$('quietAllDay').checked,category:$('quietCategory').value,morningStart:+$('quietMorningStart').value,morningEnd:+$('quietMorningEnd').value,eveningStart:+$('quietEveningStart').value,eveningEnd:+$('quietEveningEnd').value,dailyCap:+$('quietCap').value,cooldownMinutes:+$('quietCooldown').value},
    voice: {
      enabled: $('voiceEnabled').checked,
      hotkey: $('voiceHotkey').value,
      inputDeviceId: $('voiceDevice').value,
      cleanup: $('voiceCleanup').value,
      style: $('voiceStyle').value,
      telugu: $('voiceTelugu').value,
      language: $('language').value.trim().toLowerCase(),
      autoInsert: $('voiceInsert').checked,
      whisper: $('voiceWhisper').checked
    },
    appearance: {
      ...(window.islandWindowRulesValue?.()||{}),
      density:$('islandDensity').value,motion:$('islandMotion').value,lineWidthDip:+$('lineWidth').value,lineHeightDip:+$('lineHeight').value,lineOpacity:+$('lineOpacity').value,hoverIntentMs:+$('hoverIntent').value,mouseleaveGraceMs:+$('closeGrace').value,
      favorites: [...document.querySelectorAll('[data-favorite]:checked')].map(el => el.dataset.favorite).slice(0,8),
      display: $('islandDisplay').value,
      shape: $('islandShape').value,
      theme: $('islandTheme').value,
      accentColor:$('islandAccentColor').value,uiFont:$('islandUIFont').value,panelSize:$('islandPanelSize').value,panelWidth:+$('islandPanelWidth').value,panelHeight:+$('islandPanelHeight').value,
      pinned: $('pinIsland').checked,
      minimal: $('islandMinimal').checked,
      mascot: $('islandMascot').checked,
      hideFullscreen: $('islandFullscreen').checked,
      autoClose: $('islandAutoClose').checked
    },
    autostart: $('islandStartup').checked
    ,
    shortcuts: {
      open: $('openShortcut').value,
      voice: $('voiceShortcut').value
    }
  });

  window.islandSaveHistory = async () => {
    const days = Number($('historyDays').value);
    if (!Number.isInteger(days) || days < 0 || days > 365) throw new Error('History retention must be between 0 and 365 days.');
    const response = await api.library('config', { retentionDays: days });
    if (!response.ok) throw new Error(response.error);
  };

  $('engineCheck').onclick = voiceDevices;
  $('screenCheck').onclick = screenEngine;
  $('runDiagnostics').onclick = async () => {
    $('diagnosticsOutput').textContent = 'Checking...';
    try {
      const [nativeResponse, stateResponse] = await Promise.all([api.nativeVoice('diagnostics'), api.get()]);
      if (!nativeResponse.ok) throw new Error(nativeResponse.error);
      if (!stateResponse.ok) throw new Error(stateResponse.error);
      const native = nativeResponse.value;
      const state = stateResponse.value;
      const rows = [
        ['Native helper', native.ready ? 'Ready' : 'Unavailable'],
        ['Keyboard hook', native.hookRunning ? 'Listening' : 'Not running'],
        ['Dictation hotkey', native.hotkey || state.voice?.hotkey || 'Not configured'],
        ['Chord self-test', native.hotkeySelfTest?.began && native.hotkeySelfTest?.finished ? 'Passed' : 'Failed'],
        ['Microphones', `${native.devices?.inputs?.length || 0} detected`],
        ['Speech provider', `${state.speech} / ${state.configured[state.speech] ? 'key saved' : 'key missing'}`],
        ['Assistant provider', `${state.assistant} / ${state.configured[state.assistant] ? 'key saved' : 'key missing'}`],
        ['Last target', native.target?.title || native.target?.app || 'None'],
        ['Recording', native.recording ? 'Active' : 'Idle'],
        ['Open shortcut', state.shortcutStatus?.open?.ok ? state.shortcutStatus.open.accelerator : 'Registration failed or unavailable'],
        ['Voice-chat shortcut', state.shortcutStatus?.voice?.ok ? state.shortcutStatus.voice.accelerator : 'Registration failed or unavailable']
      ];
      $('diagnosticsOutput').replaceChildren(...rows.map(([label,value])=>{const row=document.createElement('div'),name=document.createElement('span'),result=document.createElement('b');name.textContent=label;result.textContent=value;row.append(name,result);return row;}));
    } catch (caught) {
      $('diagnosticsOutput').textContent = caught.message;
    }
  };
  window.islandLoadPreferences=load;
  api.onSettings(value=>{if(!window.islandSettingsDirty)load(value);});
  api.onUsage(value=>{$('providerUsage').textContent=`Last request: ${value.prompt_tokens??'?'} input / ${value.completion_tokens??'?'} output tokens. See official pricing for cost.`;});

  Promise.all([api.get(), api.library(), api.desktop('screens')]).then(([state, library, displays]) => {
    api.nativeVoice('devices').then(result=>{if(result.ok)for(const device of result.value.inputs){const option=document.createElement('option');option.value=device.id;option.textContent=device.name;$('voiceDevice').append(option);}if(state.ok)$('voiceDevice').value=state.value.voice?.inputDeviceId||'';}).catch(()=>{});
    if (displays.ok) {
      for (const display of displays.value) {
        const option = document.createElement('option');
        option.value = String(display.id);
        option.textContent = display.label || `Display ${display.id}`;
        $('islandDisplay').append(option);
      }
    }
    if (state.ok) {
      load(state.value);
      const provider = $('keyProvider')?.value || state.value.assistant;
      if ($('keyProvider') && !$('keyProvider').value) $('keyProvider').value = provider;
      visionInput.value = state.value.models[provider]?.vision || state.value.providers[provider].vision;
    }
    if (library.ok){$('historyDays').value = library.value.retentionDays;$('quietFavorites').textContent=`${library.value.quiet?.favorites?.length||0} favorite thoughts saved locally.`;}
  }).catch(caught => {
    $('engineStatus').textContent = caught.message;
  });
})();
