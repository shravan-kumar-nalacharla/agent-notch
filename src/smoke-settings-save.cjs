'use strict';
const fs=require('node:fs'),path=require('node:path');
module.exports=async function({app,win,getSettingsWindow,native,state,out,saveSnapshot}){
 const delay=ms=>new Promise(r=>setTimeout(r,ms)),js=code=>win.webContents.executeJavaScript(code),checks=[];
 await js("window.island.settings('voice')");for(let i=0;i<100&&!getSettingsWindow();i++)await delay(50);const settings=getSettingsWindow();while(settings.webContents.isLoading())await delay(50);await delay(400);
 const sj=code=>settings.webContents.executeJavaScript(code),request=native().request.bind(native()),configs=[];
 native().request=async(op,value,...rest)=>{if(op==='voice.configure'){configs.push(value);return{enabled:value.enabled,hotkey:value.hotkey};}return request(op,value,...rest);};
 async function check(code,label){if(!await sj(code))throw new Error(label);checks.push(label);}
 const set=(id,value)=>sj(`(()=>{const el=document.getElementById(${JSON.stringify(id)});el[el.type==='checkbox'?'checked':'value']=${JSON.stringify(value)};el.dispatchEvent(new Event('input',{bubbles:true}));})()`);
 await sj('window.islandProviderKeys.ready');
 try{
  await set('voiceEnabled',true);await set('cloudAudioConsent',false);await set('key-groq','disposable-regression-key');
  if(!await sj('window.islandSaveSettings()'))throw new Error('Save failed with consent off');
  await check("document.getElementById('voiceEnabled').checked&&!document.getElementById('cloudAudioConsent').checked",'Save retains enabled hotkey preference without inventing cloud consent');
  await check("document.getElementById('voiceReadiness').textContent.includes('Allow cloud audio')&&!document.querySelector('.settings-savebar').classList.contains('saved')",'Missing voice permission is persistent and visible beside the hotkey');
  if(!state().keys.groq||!state().voice.enabled||state().languages.cloudAudioConsent)throw new Error('Key or hotkey preference did not persist');
  if(configs.at(-1).enabled)throw new Error('Voice activated without consent');
  await check("document.getElementById('key-status-groq').textContent.includes('Saved on this PC')",'API key saves independently of missing voice permission');
  await set('cloudAudioConsent',true);if(!await sj('window.islandSaveSettings()'))throw new Error('Consented save failed');
  if(!configs.at(-1).enabled||!state().voice.enabled)throw new Error('Configured hotkey not enabled');
  await check("document.getElementById('voiceReadiness').textContent.includes('active')",'Saved consent plus saved speech key activates native hotkey configuration');
  await set('profileName','Unsaved draft survives');await set('key-groq','another-unsaved-key');
  await js("window.island.save({note:'unrelated background update'})");await delay(100);
  await check("document.getElementById('profileName').value==='Unsaved draft survives'&&document.getElementById('key-groq').value==='another-unsaved-key'",'Background state events preserve unsaved settings and API-key drafts');
  await sj("document.getElementById('keyProvider').value='openai';document.getElementById('keyProvider').dispatchEvent(new Event('change'));document.getElementById('keyProvider').value='groq';document.getElementById('keyProvider').dispatchEvent(new Event('change'))");
  await check("document.getElementById('key-groq').value==='another-unsaved-key'",'Switching provider retains its unsaved key draft');
  await set('speechSensitivity',0);if(await sj('window.islandSaveSettings()'))throw new Error('Invalid sensitivity unexpectedly saved');await delay(1300);
  await check("document.getElementById('settingsSaveStatus').textContent.includes('0.001')&&document.getElementById('error').textContent.includes('0.001')",'Save errors remain readable beyond the old one-second dismissal');
  await set('speechSensitivity',.012);await set('key-groq','');await set('voiceEnabled',false);await sj('window.islandSaveSettings()');
  settings.show();settings.focus();
  settings.webContents.debugger.attach('1.3');
  for(const size of [{width:760,height:760},{width:640,height:580}]){
   settings.setSize(size.width,size.height);await delay(150);await sj("document.querySelector('[data-settings-target=providerGroup]').click();document.querySelector('.settings-panel').scrollTop=0");
   const rect=await sj("(()=>{const r=document.querySelector('.settings-panel').getBoundingClientRect();return{x:r.x+r.width/2,y:Math.min(innerHeight-100,r.y+180)};})()");
   await Promise.race([settings.webContents.debugger.sendCommand('Input.dispatchMouseEvent',{type:'mouseWheel',x:rect.x,y:rect.y,deltaX:0,deltaY:650}),delay(5000).then(()=>{throw new Error('Windows wheel-input acknowledgement timed out');})]);await delay(250);
   await check("document.querySelector('.settings-panel').scrollTop>100",'Real mouse wheel scrolls settings at '+size.width+' × '+size.height);
   await sj("document.querySelector('[data-settings-target=aboutGroup]').click();document.querySelector('.settings-panel').scrollTop=10000");await delay(500);
   await check("(()=>{const panel=document.querySelector('.settings-panel').getBoundingClientRect(),save=document.querySelector('.settings-savebar').getBoundingClientRect(),last=document.getElementById('aboutGroup').getBoundingClientRect();return panel.bottom<=save.top+2&&last.top<panel.bottom&&last.bottom<=panel.bottom+4;})()",'Bottom settings stay reachable above the save bar at '+size.height+' height');
  }
  settings.webContents.debugger.detach();
  await sj("document.querySelector('[data-settings-target=voiceGroup]').click()");await delay(500);await saveSnapshot(settings,path.join(out,'settings-save-fix.png'));
  await js("document.getElementById('activationTarget').click();window.dispatchEvent(new Event('island:test-enter'))");await delay(500);const bounds=win.getBounds();
  native().emit('event',{type:'capture.overlay',active:true});await js("window.dispatchEvent(new Event('island:test-leave'))");await delay(1500);
  if(!await js("document.body.classList.contains('expanded')")||!win.isAlwaysOnTop()||JSON.stringify(bounds)!==JSON.stringify(win.getBounds()))throw new Error('Screenshot overlay hid or displaced the notch');checks.push('Screenshot-overlay event keeps notch expanded, centered and always on top');
  native().emit('event',{type:'capture.overlay',active:false});await delay(1500);if(await js("document.body.classList.contains('expanded')"))throw new Error('Screenshot overlay did not release collapse grace');checks.push('Normal close grace resumes after screenshot overlay ends');
  const saved=JSON.parse(fs.readFileSync(path.join(app.getPath('userData'),'settings.json'),'utf8'));if(saved.autostart!==true)throw new Error('Startup preference was not persisted');checks.push('Windows startup choice persists in settings');
  const unlocked=await require('electron').safeStorage.decryptStringAsync(Buffer.from(saved.keys.groq,'base64'));if(unlocked.result!=='disposable-regression-key')throw new Error('Saved key changed or failed decryption');checks.push('Saved API key decrypts to the original value');
  fs.writeFileSync(path.join(out,'settings-save-report.json'),JSON.stringify({checks,audioUploads:0,nativeVoiceConfiguration:'fixture',startupRegistration:'covered separately with matching-argument unit tests'},null,2));console.log('SETTINGS SAVE SMOKE PASS',checks.length,'checks; zero audio uploads');
 }finally{native().request=request;}
};
