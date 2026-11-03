'use strict';
const { app, BrowserWindow, ipcMain, screen, safeStorage, clipboard, globalShortcut, Tray, Menu, nativeImage, session, dialog, shell, Notification, powerMonitor } = require('electron');
const fs = require('node:fs');
const{liveContents,trustedWindowEvent}=require('./window-lifecycle.cjs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { PROVIDERS, chat, transcribe } = require('./providers.cjs');
const localization=require('./localization.cjs');
const quoteRepository=require('./quotes.cjs');
const keyCache=new Map(),keyErrors={};
const {voiceStatus,loginOptions,setStartup,shouldHideFullscreen}=require('./settings-status.cjs');
const{windowBehavior,validateWindowRules}=require('./window-policy.cjs');
let voiceRuntime={active:false,message:''},voiceConfiguration=Promise.resolve(),startupError='';
let quoteActivity={locked:false,voiceRecording:false,systemKnown:false,osDnd:'unknown'},quoteTransition=0;
const { clean } = require('./voiceflow.cjs');
const { guide,revalidate } = require('./screen-guide.cjs');
const {NativeClient,nativePath}=require('./native.cjs');
const {setupWidgets}=require('./widgets-main.cjs');
const {setupVoice}=require('./voice-main.cjs');
const {createCommands}=require('./commands.cjs');
const {groqDefaults,keyChanges}=require('./provider-settings.cjs');
let groqMigrationPending=false;
const {createWindowsApps}=require('./windows-apps.cjs');
const {createWindowsTask}=require('./windows-task.cjs');
const {isStopRequest}=require('./voice-intents.cjs');
const {DEFAULTS:MIC_DEFAULTS,validatePrivacy,createMicrophonePrivacy}=require('./microphone-privacy.cjs');
let privacy,callTimer;let trayRefresh=()=>{};
const {createAgentHub}=require('./agents.cjs');
const {highlightBounds}=require('./guidance.cjs');const{randomUUID}=require('node:crypto');
if(process.argv.includes('--smoke-test')&&!process.argv.includes('--gpu-smoke'))app.disableHardwareAcceleration();
app.setAppUserModelId('app.agentnotch.desktop');
const {IslandGeometry}=require('./geometry.cjs');
const smokeMode=process.argv.includes('--smoke-test');
if(smokeMode){const smokeData=fs.mkdtempSync(path.join(process.env.TEMP||process.env.TMP||'.','agent-notch-smoke-'));app.setPath('userData',smokeData);fs.writeFileSync(path.join(smokeData,'settings.json'),JSON.stringify({speak:false,quietMoments:{enabled:false,frequencyMigration:true}}));}
let win, settingsWindow, tray, state, native, widgets, voiceEngine,agents,cursorTimer,boundsTimer,animatingBounds=false,lastCursorX=null,lastCursorY=null,lastBoundsKey='';
let shortcutStatus={open:{accelerator:'',ok:false},voice:{accelerator:'',ok:false}};
let fullscreenHidden=false,userHidden=false,quitting=false;
let windowRule='normal',windowOverride=false;
let surfaceExpanded=false,geometry,voiceHudActive=false;
const geometryTrace=[],askRequests=new Map();
let lastGuide,guideOverlay,windowsTask,taskCoordinator;
const page = pathToFileURL(path.join(__dirname, 'index.html')).href;
const file = () => path.join(app.getPath('userData'), 'settings.json');
function migrateUserData(){
  const current=app.getPath('userData');
  if(fs.existsSync(file()))return;
  for(const name of ['island-fusion','Island Fusion']){
    const previous=path.join(app.getPath('appData'),name);
    if(previous===current||!fs.existsSync(path.join(previous,'settings.json')))continue;
    fs.mkdirSync(current,{recursive:true});
    for(const entry of ['settings.json','library.json','agent-token']){
      const source=path.join(previous,entry),destination=path.join(current,entry);
      if(fs.existsSync(source)&&!fs.existsSync(destination))fs.copyFileSync(source,destination);
    }
    return;
  }
}
function load() {
  const defaults = { microphone:{...MIC_DEFAULTS},groqDefaultsMigration:true, assistant: 'groq', speech: 'groq', models: {}, keys: {}, note: '', focusEnd: 0, speak: false, autostart:true, languages:{...localization.DEFAULTS}, companion:{chatEngine:'standard',name:'Cutie',wakeEnabled:false,tts:'system',readTypedReplies:false,voice:'hannah',systemVoice:''}, profileName:'', shortcuts:{open:'CommandOrControl+Shift+Space',voice:'CommandOrControl+Shift+Alt+Space'}, voice:{enabled:false,hotkey:'ctrlShiftWin',inputDeviceId:'',cleanup:'light',style:'casual',autoInsert:true,whisper:true,language:'',telugu:'',ctrlShiftWinMigration:true},deepseek:{thinking:false,stream:true},quietMoments:{...require('./quiet.cjs').DEFAULTS},appearance:{display:'primary',minimal:false,mascot:true,hideFullscreen:true,autoClose:true,pinned:false,shape:'notch',theme:'system',density:'default',lineWidthDip:100,lineHeightDip:2,lineOpacity:.35,hoverIntentMs:100,mouseleaveGraceMs:1000,motion:'standard',compactMigration:true} };
  try { const original=JSON.parse(fs.readFileSync(file(), 'utf8'));groqMigrationPending=original.groqDefaultsMigration!==true;const saved=groqDefaults(original);const voice={...defaults.voice,...saved.voice};if(!saved.languages&&!fs.existsSync(file()+'.pre-multilingual'))fs.copyFileSync(file(),file()+'.pre-multilingual');if(!saved.appearance?.compactMigration)saved.appearance={...saved.appearance,compactMigration:true,density:'default'};if(!saved.voice?.ctrlShiftWinMigration)voice.hotkey='ctrlShiftWin';return {...defaults,...saved,microphone:validatePrivacy({...MIC_DEFAULTS,...saved.microphone}),profileName:typeof saved.profileName==='string'?saved.profileName.slice(0,50):'',shortcuts:{...defaults.shortcuts,...saved.shortcuts},voice,companion:{...defaults.companion,...saved.companion},deepseek:{...defaults.deepseek,...saved.deepseek},languages:localization.validateLanguages({...defaults.languages,...saved.languages}),quietMoments:require('./quiet.cjs').migrateQuiet(saved.quietMoments),appearance:{...defaults.appearance,...saved.appearance}}; } catch { return defaults; }
}
const publicState = () => ({ ...state,microphoneStatus:privacy?.view()||{...state.microphone,blocked:state.microphone.muted}, autostart:state.autostart, startupStatus:app.getLoginItemSettings(loginOptions(app)),startupError,voiceStatus:{...voiceStatus(state,p=>keyCache.has(p)),...voiceRuntime},keyErrors, keys: undefined, shortcutStatus, configured: Object.fromEntries(Object.keys(PROVIDERS).map(p => [p, keyCache.has(p)])), providers: PROVIDERS });
function persist() { fs.mkdirSync(path.dirname(file()), { recursive: true }); fs.writeFileSync(file() + '.tmp', JSON.stringify(state)); fs.renameSync(file() + '.tmp', file()); }
function key(provider) { const value=keyCache.get(provider);if(!value)throw new Error(keyErrors[provider]||`Save your ${provider} API key in Settings.`);return value; }
function resize(expanded, view='home', contentHeight, voiceHud=false){
  if(!expanded&&windowOverride&&!voiceHud){windowOverride=false;win?.webContents.send('window:policy',{behavior:windowRule});}
  if(expanded&&!windowOverride&&windowRule!=='normal')expanded=false;
  surfaceExpanded=expanded;voiceHudActive=voiceHud;
  return geometry?.present(expanded,voiceHud||geometry.reminder);
}
function activateIsland(value={}){if(!liveContents(win))return;windowOverride=true;userHidden=false;win.webContents.send('window:policy',{behavior:'normal'});win.showInactive();resize(true);win.webContents.send(value?.revealOnly?'window:restore':'window:open');}
function openSettings(target='') {
  target=['quotes','voice','providers'].includes(target)?target:'';
  if(!liveContents(win))return;win.webContents.send('window:collapse'); resize(false);
  if (settingsWindow && !settingsWindow.isDestroyed()) { settingsWindow.show(); settingsWindow.focus();settingsWindow.webContents.send('settings:section',target); return; }
  settingsWindow = new BrowserWindow({ width: 760, height: Math.min(760,screen.getPrimaryDisplay().workArea.height-32), minWidth: 620, minHeight: 580, title: 'Agent Notch Settings', icon:path.join(__dirname,'assets','icon-256.png'), backgroundColor: '#0c0d10', autoHideMenuBar: true, webPreferences: { backgroundThrottling:false, preload: path.join(__dirname, 'preload.cjs'), sandbox: true, contextIsolation: true, nodeIntegration: false } });
  settingsWindow.webContents.on('will-navigate', e => e.preventDefault());
  settingsWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  settingsWindow.loadFile(path.join(__dirname, 'index.html'), { query: { settings: '1',pane:target } });
  settingsWindow.on('closed', () => { settingsWindow = null; if(state?.appearance?.pinned&&!win.isDestroyed()){win.show();resize(true);win.webContents.send('window:restore');} });
}
const SHORTCUT_VALUES={open:['CommandOrControl+Shift+Space','CommandOrControl+Alt+Space','CommandOrControl+Shift+I'],voice:['CommandOrControl+Shift+Alt+Space','CommandOrControl+Alt+Shift+V','CommandOrControl+Shift+D']};
function registerShortcuts(){
  globalShortcut.unregisterAll();
  const failed=[];
  for(const name of ['open','voice']){
    const accelerator=SHORTCUT_VALUES[name].includes(state.shortcuts[name])?state.shortcuts[name]:SHORTCUT_VALUES[name][0];
    const action=name==='open'
      ?activateIsland
      :()=>{try{privacy?.assertAllowed({capture:true});}catch{return;}activateIsland();win.webContents.send('voice:toggle');};
    shortcutStatus[name]={accelerator,ok:globalShortcut.register(accelerator,action)};
    if(!shortcutStatus[name].ok)failed.push(accelerator);
  }
  if(privacy){const p=state.microphone;for(const name of ['mute','ptt']){const accelerator=name==='mute'?p.muteShortcut:p.pttShortcut;let ok=false;try{ok=globalShortcut.register(accelerator,name==='mute'?()=>privacy.set({muted:!state.microphone.muted}).catch(()=>{}):()=>{});if(name==='ptt'&&ok)globalShortcut.unregister(accelerator);}catch{}shortcutStatus[name]={accelerator,ok};}}
  if(widgets){widgets.emit('settings:changed',publicState());if(failed.length)widgets.notify('Shortcut unavailable',`Could not register ${failed.join(', ')}. Choose another shortcut in Settings.`);}
}
function handle(name, fn, settingsOnly=false) {
  ipcMain.handle(name, async (event, value) => {
    if(quitting)return{ok:false,error:'Agent Notch is closing.'};
    const mainTrusted=trustedWindowEvent(event,settingsOnly?[settingsWindow]:[win,settingsWindow],page);const detailTrusted=['productivity:action','state:get','text:copy'].includes(name)&&trustedWindowEvent(event,[widgets?.productivity?.getWindow()],pathToFileURL(path.join(__dirname,'productivity.html')).href);if(!mainTrusted&&!detailTrusted){if(settingsOnly)return{ok:false,error:'Open Settings to view saved API keys.'};return{ok:false,error:'Untrusted window.'};}
    try { return { ok: true, value: await fn(value) }; } catch (error) { return { ok: false, error: error.message }; }
  });
}
async function saveSnapshot(window,file){
  for(let attempt=0;attempt<3;attempt++){try{fs.writeFileSync(file,(await Promise.race([window.webContents.capturePage(),new Promise((_,reject)=>setTimeout(()=>reject(new Error('Screenshot capture timed out.')),5000))])).toPNG());return;}catch(e){if(e.message!=='UnknownVizError')throw e;await new Promise(resolve=>setTimeout(resolve,300));}}
  console.warn('SCREENSHOT UNAVAILABLE',path.basename(file),'UnknownVizError');
}
if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', () => { win?.show(); });
  app.whenReady().then(async () => {
    if(!smokeMode)migrateUserData();
    state = load();
    if(groqMigrationPending){try{if(!fs.existsSync(file()+'.pre-groq-defaults'))fs.copyFileSync(file(),file()+'.pre-groq-defaults');persist();}catch{startupError='Groq defaults are active. Save changes to keep them for the next launch.';}}
    for(const[provider,cipher]of Object.entries(state.keys))try{const decrypted=await safeStorage.decryptStringAsync(Buffer.from(cipher,'base64'));if(typeof decrypted.result!=='string'||!decrypted.result.trim())throw new Error('Key unavailable');keyCache.set(provider,decrypted.result);if(decrypted.shouldReEncrypt){state.keys[provider]=(await safeStorage.encryptStringAsync(decrypted.result)).toString('base64');persist();}}catch{keyErrors[provider]='Windows could not unlock your '+provider+' key. Enter and save it again in AI & API keys.';}
    if(app.isPackaged&&!smokeMode)try{setStartup(app,state.autostart);}catch{startupError='Windows startup registration failed. Toggle Start with Windows to retry.';}
    const lock=()=>{quoteActivity.locked=true;taskCoordinator?.cancel();windowsTask?.cancel();privacy?.suspend(true);widgets?.emit('quiet:suppress',{});},unlock=()=>{quoteActivity.locked=false;quoteTransition=0;privacy?.suspend(false);};
    powerMonitor.on('lock-screen',lock);powerMonitor.on('suspend',lock);powerMonitor.on('unlock-screen',unlock);powerMonitor.on('resume',unlock);
    app.once('will-quit',()=>{powerMonitor.off('lock-screen',lock);powerMonitor.off('suspend',lock);powerMonitor.off('unlock-screen',unlock);powerMonitor.off('resume',unlock);keyCache.clear();});
    session.defaultSession.setPermissionRequestHandler((contents, permission, callback, details) => callback(!privacy?.view().blocked&&privacy?.view().mode!=='ptt'&&[liveContents(win),liveContents(settingsWindow)].includes(contents) && contents?.getURL().split('?')[0] === page && permission === 'media' && details.mediaTypes?.every(t => contents===liveContents(win)?['audio','video'].includes(t):t==='audio')));
    session.defaultSession.setPermissionCheckHandler((contents, permission) => !privacy?.view().blocked&&privacy?.view().mode!=='ptt'&&[liveContents(win),liveContents(settingsWindow)].includes(contents) && contents?.getURL().split('?')[0] === page && permission === 'media');
    win = new BrowserWindow({ width: 174, height: 42, frame: false, transparent: true, resizable: false, alwaysOnTop: true, skipTaskbar: true, show:false, icon:path.join(__dirname,'assets','icon-32.png'), webPreferences: { backgroundThrottling:false, preload: path.join(__dirname, 'preload.cjs'), sandbox: true, contextIsolation: true, nodeIntegration: false } });
    geometry=new IslandGeometry({win,screen,getAppearance:()=>state.appearance,trace:value=>{if(smokeMode||process.argv.includes('--trace-motion')){geometryTrace.push(value);if(geometryTrace.length>1000)geometryTrace.shift();}}});
    win.once('closed',()=>{clearInterval(cursorTimer);if(!quitting)app.quit();});
    geometry.reflow();
    win.setAlwaysOnTop(true, 'screen-saver');
    win.webContents.once('did-finish-load',()=>{if(liveContents(win)){geometry.reflow();win.showInactive();}});
    if(smokeMode)win.webContents.on('console-message',event=>console.log('RENDERER',event.message));
    win.webContents.on('will-navigate', e => e.preventDefault());
    win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    win.loadFile(path.join(__dirname, 'index.html'), process.argv.includes('--smoke-test') ? {query:{test:'1'}} : {}); resize(false);
    win.on('will-move',()=>{geometry.userMove=true;});
    win.on('moved',()=>{const position=geometry.userPosition();if(position){state.appearance.float=position;persist();}setTimeout(()=>geometry.userMove=false,100);});
    for(const event of ['display-added','display-removed','display-metrics-changed'])screen.on(event,()=>{if(!win.isDestroyed())geometry.reflow();});
    if(smokeMode)win.webContents.once('did-finish-load',async()=>{try{await require('./smoke.cjs').run({app,win,screen,getSettingsWindow:()=>settingsWindow,native:()=>native,widgets:()=>widgets,geometry,geometryTrace,saveSnapshot,state:()=>state});app.exit(0);}catch(e){console.error('SMOKE FAIL',e.stack);app.exit(1);}});
    handle('state:get', publicState);
    handle('provider:pricing',()=>shell.openExternal('https://api-docs.deepseek.com/quick_start/pricing/'));
    handle('system:installation',()=>require('./installation.cjs').getInstallation(app.getPath('exe')));
    handle('system:uninstall',async value=>{
      const info=await require('./installation.cjs').getInstallation(app.getPath('exe'));if(!info.installed)throw new Error(info.message);
      const erase=value?.deleteData===true;const answer=await dialog.showMessageBox(settingsWindow||win,{type:'warning',buttons:['Cancel',erase?'Uninstall and delete data':'Uninstall, keep data'],defaultId:0,cancelId:0,message:'Uninstall Agent Notch?',detail:erase?'Permanently remove Agent Notch settings, encrypted keys, notes and history. Your documents and third-party applications stay on disk.':'Remove the installed application and keep its local settings, keys, notes and history for a possible reinstall.'});if(answer.response!==1)return false;
      app.setLoginItemSettings({openAtLogin:false});globalShortcut.unregisterAll();voiceEngine?.stop();native?.close();agents?.stop();
      const child=require('node:child_process').spawn(info.uninstaller,[...info.args,...(erase?['--delete-app-data']:[])],{detached:true,stdio:'ignore',windowsHide:false});child.unref();setTimeout(()=>app.quit(),150);return true;
    });
    handle('quiet:action',async value=>{
      const language=localization.outputLanguage(state.languages,'quoteLanguage'),history=widgets.library.view().quiet;
      if(value?.op==='catalog')return {quotes:quoteRepository.catalog.quotes.map(q=>({...quoteRepository.localized(q,language,history.patches),requires_opt_in:q.requires_opt_in})),history};
      if(value?.op==='current'){const q=quoteRepository.byId.get(value.id);return q?quoteRepository.localized(q,language,history.patches):null;}
      if(['favorite','mute','unmute','reset'].includes(value?.op)){const result=widgets.library.action('quiet:'+value.op,value);widgets.emit('library:changed',result);return result;}
      if(['export','import','patch-import','patch-export'].includes(value?.op)){
        const patches=value.op.startsWith('patch');
        if(value.op.endsWith('export')){const r=await dialog.showSaveDialog(settingsWindow||win,{defaultPath:patches?'localization-patches.json':'quote-favorites.json',filters:[{name:'JSON',extensions:['json']}]});if(r.canceled)return false;fs.writeFileSync(r.filePath,JSON.stringify(patches?{schema:'agent-notch-localization-patches-v1',quotes:history.patches}:{schema:'agent-notch-favorites-v1',favorites:history.favorites},null,2));return true;}
        const r=await dialog.showOpenDialog(settingsWindow||win,{properties:['openFile'],filters:[{name:'JSON',extensions:['json']}]});if(r.canceled)return false;if(fs.statSync(r.filePaths[0]).size>1024*1024)throw new Error('Import is limited to 1 MB.');const imported=JSON.parse(fs.readFileSync(r.filePaths[0],'utf8'));const result=widgets.library.action(patches?'quiet:patch':'quiet:import',imported);widgets.emit('library:changed',result);return true;
      }
      if(value?.op!=='request')throw new Error('Unknown thought operation.');
      if(!liveContents(win)||!win.isVisible()||!surfaceExpanded||settingsWindow?.isVisible())return null;
      const lib=widgets.library.view(),quote=require('./quiet.cjs').pickMoment(state.quietMoments,lib.quiet,Date.now(),Math.random,{...quoteActivity,expanded:surfaceExpanded,intentional:true,context:value.manual?'manual':'intentional_hover',typing:value.typing===true,pomodoro:!!(lib.timer&&!lib.timer.paused||lib.stopwatch?.running||widgets.productivity.hasActiveSession()),transition:Date.now()-quoteTransition<300000},language,state.languages.quoteTone);
      if(quote)widgets.library.action('quiet:shown',quote);quoteTransition=0;return quote;
    });
    handle('settings:keys',()=>Object.fromEntries(keyCache),true);
    handle('provider:test', async value => {
      if (!value || !Object.hasOwn(PROVIDERS, value.provider)) throw new Error('Choose a supported provider.');
      const model = typeof value.model === 'string' && /^[\w./:-]{1,160}$/.test(value.model) ? value.model : undefined;
      const temporary = typeof value.key === 'string' && value.key.trim() ? value.key.trim() : key(value.provider);
      if (temporary.length > 1000) throw new Error('API key is too long.');
      if(!PROVIDERS[value.provider].chat)throw new Error('Use Check voice engine for this speech-only provider; a real recording is required to verify transcription.');
      const reply = await chat({ provider: value.provider, key: temporary, model, text: 'Reply with exactly: Connection ready' });
      return { provider: value.provider, reply: reply.slice(0, 200) };
    });
    native=new NativeClient({executable:nativePath(app)});
    native.on('event',event=>{if(quitting||!liveContents(win))return;if(event.type==='voice.begin'&&!privacy?.view().blocked&&!win.isVisible()){userHidden=false;win.showInactive();}});
    native.on('diagnostic',message=>console.log('[native]',message));
    native.on('event',event=>{if(event.type!=='capture.overlay'||!liveContents(win))return;win.webContents.send('window:capture-overlay',{active:event.active});if(event.active&&!userHidden){fullscreenHidden=false;geometry.reflow();win.setAlwaysOnTop(true,'screen-saver');win.showInactive();win.moveTop();}});
    widgets=setupWidgets({app,BrowserWindow,clipboard,dialog,shell,Notification,powerMonitor,safeStorage,screen,nativeImage,native,handle,mainWindow:()=>win,getState:()=>({...state,microphoneStatus:privacy?.view()}),onFunctionalNotification:()=>{quoteTransition=Date.now();widgets?.emit('quiet:suppress',{});},onTransition:()=>{quoteTransition=Date.now();},onSystem:value=>{if(value.foreground!==quoteActivity.foreground)quoteActivity.foregroundChangedAt=Date.now();Object.assign(quoteActivity,{foreground:value.foreground,systemKnown:true,fullscreen:!!value.fullscreen,osDnd:value.notificationState==null?'unknown':value.notificationState!==5,meeting:!!value.meetingRecording});if(value.fullscreen||value.notificationState!==5)widgets?.emit('quiet:suppress',{});if(quitting||!liveContents(win)||process.argv.includes('--smoke-test'))return;let onIslandDisplay=true;try{if(value.monitorBounds){const dip=screen.screenToDipRect(null,value.monitorBounds);onIslandDisplay=String(screen.getDisplayMatching(dip).id)===geometry.layout.displayId;}}catch{}const behavior=windowBehavior(state.appearance,{...value,onIslandDisplay});if(behavior!==windowRule){windowRule=behavior;widgets.emit('window:policy',{behavior:windowOverride?'normal':behavior});}if(behavior==='hide'&&!windowOverride){if(win.isVisible()){fullscreenHidden=true;win.hide();}}else if(fullscreenHidden){fullscreenHidden=false;if(!userHidden&&liveContents(win)){geometry.reflow();win.setAlwaysOnTop(true,'screen-saver');win.showInactive();}}if(value.captureOverlay&&!userHidden){geometry.reflow();win.setAlwaysOnTop(true,'screen-saver');win.moveTop();}}});
    const runCommand=createCommands({app,shell,native,prepareProductivity:text=>widgets.productivity.prepareIntent(text),library:widgets.library,emit:widgets.emit,openSettings,saveNote:text=>{state.note=[state.note,text].filter(Boolean).join('\n').slice(-20000);persist();widgets.emit('settings:changed',publicState());}});
    windowsTask=createWindowsTask({...(smokeMode&&process.argv.includes('--windows-task-check')?{ask:require('./smoke-windows-task.cjs').planner}:{}),native,shell,apps:createWindowsApps({shell,findFiles:require('./commands.cjs').findFiles}),getConfig:()=>smokeMode&&process.argv.includes('--windows-task-check')?{}:({provider:state.assistant,key:key(state.assistant),model:state.models[state.assistant]?.chat,thinking:state.deepseek.thinking,taskInstruction:localization.languagePrompt(state.languages,''),onUsage:usage=>{state.lastUsage={provider:state.assistant,model:state.models[state.assistant]?.chat||PROVIDERS[state.assistant].chat,...usage,at:Date.now()};persist();widgets.emit('assistant:usage',state.lastUsage);}}),emit:(channel,value)=>{widgets.emit('quiet:suppress',{});widgets.emit(channel,value);},show:()=>{if(liveContents(win)){userHidden=false;win.showInactive();}}});
    const browser=require('./browser-controller.cjs').createBrowserController({folder:app.getPath('userData'),runtime:app.isPackaged?path.join(process.resourcesPath,'agent-browsers'):path.join(__dirname,'../tools/agent-browsers')});
    taskCoordinator=require('./task-coordinator.cjs').createTaskCoordinator({browser,nativeTask:windowsTask,runCommand,ask:chat,getConfig:()=>({provider:state.assistant,key:key(state.assistant),model:state.models[state.assistant]?.chat,thinking:state.deepseek.thinking}),storage:require('./integration-secrets.cjs').createIntegrationSecrets({folder:app.getPath('userData'),safeStorage}),emit:widgets.emit,show:()=>{if(liveContents(win)){userHidden=false;win.showInactive();}},traceFile:path.join(app.getPath('userData'),'task-diagnostics.json')});
    taskCoordinator.recover().catch(()=>{});
    const runAssistant=async(text,options={})=>{if(quoteActivity.locked)throw new Error('Unlock Windows before running a task.');return taskCoordinator.run(text,options);};
    handle('task:cancel',id=>taskCoordinator.cancel(id));
    handle('task:pause',id=>taskCoordinator.pause(id));handle('task:continue',id=>taskCoordinator.resume(id));handle('task:get',()=>taskCoordinator.view());
    handle('task:diagnostics',async()=>{const result=await dialog.showSaveDialog(settingsWindow||win,{defaultPath:'Agent-Notch-task-diagnostics.json',filters:[{name:'JSON',extensions:['json']}]});if(result.canceled)return false;fs.writeFileSync(result.filePath,JSON.stringify(taskCoordinator.trace(),null,2));return true;});
    handle('browser:clear',async()=>{const result=await dialog.showMessageBox(settingsWindow||win,{type:'question',buttons:['Cancel','Clear managed browser data'],defaultId:0,cancelId:0,message:'Clear Agent Notch browser data?',detail:'This removes logins and history from Agent Notch’s dedicated browser profiles. Your ordinary browser profiles are unaffected.'});if(result.response!==1)return false;taskCoordinator.cancel();await browser.clear();return true;},true);
    handle('task:confirm',value=>taskCoordinator.confirm(value));
    agents=createAgentHub({folder:app.getPath('userData'),onChange:value=>widgets.emit('agents:state',value),notify:widgets.notify});
    agents.start().catch(e=>console.log('[agents]',e.message));
    handle('agents:action',value=>{switch(value?.op){case'get':return agents.view();case'preview':return agents.prepare(value.install!==false);case'install':return agents.commit(value.id);case'decide':return agents.decide(value);default:throw new Error('Unsupported agent action.');}});
    privacy=createMicrophonePrivacy({getState:()=>state,persist,native,abortVoice:()=>{voiceEngine?.stop();if(taskCoordinator?.voiceActive)taskCoordinator.cancel();},emit:widgets.emit,changed:()=>{widgets.emit('settings:changed',publicState());trayRefresh();},configure:()=>configureVoice()});
    handle('microphone:set',async value=>{if(!value||typeof value!=='object')throw new Error('Invalid microphone preference.');const next=validatePrivacy({...state.microphone,...value},state.shortcuts);const changed=next.muteShortcut!==state.microphone.muteShortcut||next.pttShortcut!==state.microphone.pttShortcut;if(changed)shortcutStatus.ptt={accelerator:next.pttShortcut,ok:false};await privacy.set(next);if(changed){registerShortcuts();await configureVoice();}return publicState();});
    handle('microphone:get',()=>privacy.view());
    voiceEngine=setupVoice({privacy,native,clipboard,runCommand:runAssistant,runWindowsTask:runAssistant,cancelWindowsTask:()=>taskCoordinator.cancel(),prepareProductivity:text=>widgets.productivity.prepareIntent(text),library:widgets.library,getState:()=>state,getKey:key,emit:(channel,value)=>{if(channel==='voice:state'){if(['listening','connecting'].includes(value.phase)){quoteActivity.voiceRecording=true;widgets.emit('quiet:suppress',{});}if(['idle','answer','done','error','draft'].includes(value.phase))quoteActivity.voiceRecording=false;}if(channel==='meeting:state')quoteActivity.meeting=!!value;widgets.emit(channel,value);},handle,notify:widgets.notify,speak:text=>widgets.emit('speech:request',{text})});
    native.on('stopped',()=>{if(!quitting)privacy.unavailable();});
    native.on('ready',()=>{if(!quitting)privacy.apply().then(()=>widgets.emit('settings:changed',publicState()));});
    callTimer=setInterval(async()=>{if(!state.microphone.autoMuteCalls)return;try{const value=await native.request('privacy.calls',{apps:state.microphone.callApps},2500);await privacy.calls(value);}catch{await privacy.calls({known:false});}},1000);
    native.on('event',event=>{if(quitting||!liveContents(win))return;if(event.type==='wake.detected'&&!privacy.view().blocked&&state.microphone.mode==='always'){userHidden=false;win.showInactive();widgets.emit('wake:detected',{name:event.name});}});
    if(!process.argv.includes('--smoke-test'))try{native.start();}catch(e){console.log('[native]',e.message);}
    function configureVoice(){
      const pending=voiceConfiguration.then(async()=>{const status=voiceStatus(state,p=>keyCache.has(p));voiceRuntime=status;
      try{const response=await native.request('voice.configure',{...state.voice,enabled:status.ready&&!privacy?.view().blocked&&state.microphone.mode!=='ptt'});await native.request('privacy.ptt',{enabled:!privacy?.view().blocked&&state.microphone.mode==='ptt'&&!!state.languages.cloudAudioConsent&&keyCache.has(state.speech)&&shortcutStatus.ptt?.ok===true,shortcut:state.microphone.pttShortcut});await native.request('wake.configure',{name:state.companion.name,enabled:!privacy?.view().blocked&&state.microphone.mode==='always'});voiceRuntime={...status,active:response.enabled===true,message:response.enabled?'Global voice hotkey is active. Hold the selected key to dictate.':status.message};}
      catch{voiceRuntime={...status,active:false,message:'Preferences saved, but the Windows voice engine could not start. Run Check voice engine to retry.'};}
      });voiceConfiguration=pending.catch(()=>{});return pending;
    }
    let saveQueue=Promise.resolve();
    const saveSettings=async value => {
      if (!value || typeof value !== 'object') throw new Error('Invalid settings.');
      const next = structuredClone(state);
      if(value.languages){if(quoteActivity.voiceRecording)throw new Error('Finish or cancel the active recording before changing languages.');next.languages=localization.validateLanguages({...next.languages,...value.languages});next.speak=next.languages.spokenReplyEnabled;}
      if(quoteActivity.voiceRecording&&(value.speech||value.models||value.voice))throw new Error('Finish or cancel recording before changing voice providers.');
      for (const field of ['assistant', 'speech']) if (value[field] !== undefined) { if (!Object.hasOwn(PROVIDERS, value[field])||field==='speech'&&!PROVIDERS[value[field]].speech) throw new Error('Provider does not support that capability.'); next[field] = value[field]; }
      if (typeof value.note === 'string') next.note = value.note.slice(0, 20000);
      if (typeof value.profileName === 'string') next.profileName = value.profileName.trim().slice(0,50);
      if (typeof value.speak === 'boolean') next.speak = value.speak;
      if(value.companion){if(quoteActivity.voiceRecording)throw new Error('Stop recording before changing voice settings.');const c=value.companion;if(c.chatEngine!==undefined){if(!['gemini_live','standard'].includes(c.chatEngine))throw new Error('Invalid voice chat engine.');next.companion.chatEngine=c.chatEngine;}for(const[k,min,max]of [['rate',.8,1.2],['volume',0,1]])if(c[k]!==undefined){if(!Number.isFinite(c[k])||c[k]<min||c[k]>max)throw new Error('Invalid voice '+k);next.companion[k]=c[k];}if(typeof c.name!=='string'||!/^([\p{L}\p{N}]| ){2,30}$/u.test(c.name.trim()))throw new Error('Use 2–30 letters, spaces or numbers for the companion name.');next.companion={...next.companion,name:c.name.trim()};if(typeof c.readTypedReplies==='boolean')next.companion.readTypedReplies=c.readTypedReplies;if(typeof c.wakeEnabled==='boolean')next.companion.wakeEnabled=c.wakeEnabled;if(['groq','system'].includes(c.tts))next.companion.tts=c.tts;if(require('./speech.cjs').VOICES.includes(c.voice))next.companion.voice=c.voice;if(typeof c.systemVoice==='string')next.companion.systemVoice=c.systemVoice.slice(0,300);}

      if(value.voice&&typeof value.voice==='object'){
        for(const k of ['enabled','autoInsert','whisper','chatOnSilence'])if(typeof value.voice[k]==='boolean')next.voice[k]=value.voice[k];
        if(value.voice.sensitivity!==undefined){if(!Number.isFinite(value.voice.sensitivity)||value.voice.sensitivity<.001||value.voice.sensitivity>.1)throw new Error('Speech sensitivity must be 0.001–0.1.');next.voice.sensitivity=value.voice.sensitivity;}
        if(typeof value.voice.inputDeviceId==='string')next.voice.inputDeviceId=value.voice.inputDeviceId.slice(0,500);
        for(const [k,allowed]of Object.entries({hotkey:['rightAlt','rightCtrl','ctrlShiftWin'],cleanup:['none','light','medium'],style:['formal','casual','very casual','excited','code'],telugu:['','telugu','mixed','roman']}))if(allowed.includes(value.voice[k]))next.voice[k]=value.voice[k];
        if(typeof value.voice.language==='string'&&/^[a-z]{0,3}$/.test(value.voice.language))next.voice.language=value.voice.language;
      }
      if(value.appearance&&typeof value.appearance==='object'){for(const k of ['minimal','mascot','hideFullscreen','autoClose','pinned'])if(typeof value.appearance[k]==='boolean')next.appearance[k]=value.appearance[k];if(typeof value.appearance.display==='string')next.appearance.display=value.appearance.display.slice(0,30);if(typeof value.appearance.shape==='string'&&['notch','pill','line'].includes(value.appearance.shape))next.appearance.shape=value.appearance.shape;if(['dark','light','system'].includes(value.appearance.theme))next.appearance.theme=value.appearance.theme;if(Array.isArray(value.appearance.favorites))next.appearance.favorites=[...new Set(value.appearance.favorites.filter(x=>['media','timer','water','shelf','todo','reminders','clips','dictionary','snippets','history','meetings','projects','weather','calendar','mirror','prompter','system'].includes(x)))].slice(0,8);}
      if(value.appearance){const a=value.appearance;if(a.windowRules!==undefined)next.appearance.windowRules=validateWindowRules(a.windowRules);for(const k of ['fullscreenBehavior','maximizedBehavior'])if(a[k]!==undefined){if(!['normal','line','hide'].includes(a[k]))throw new Error('Invalid window rule behavior.');next.appearance[k]=a[k];}for(const [k,min,max] of [['lineWidthDip',82,118],['lineHeightDip',2,3],['lineOpacity',.12,.75],['hoverIntentMs',0,400],['mouseleaveGraceMs',1000,5000]])if(Number.isFinite(a[k]))next.appearance[k]=Math.max(min,Math.min(max,a[k]));if(['compact','default','roomy'].includes(a.density))next.appearance.density=a.density;if(['standard','subtle','off'].includes(a.motion))next.appearance.motion=a.motion;}
      if(value.deepseek){for(const key of ['thinking','stream'])if(typeof value.deepseek[key]==='boolean')next.deepseek[key]=value.deepseek[key];}
      if(value.visionProvider&&PROVIDERS[value.visionProvider]?.vision)next.visionProvider=value.visionProvider;
      if(value.quietMoments)next.quietMoments=require('./quiet.cjs').validateQuiet({...next.quietMoments,...value.quietMoments});
      if(value.shortcuts&&typeof value.shortcuts==='object')for(const k of ['open','voice'])if(typeof value.shortcuts[k]==='string'&&SHORTCUT_VALUES[k].includes(value.shortcuts[k]))next.shortcuts[k]=value.shortcuts[k];
      if (Number.isFinite(value.focusEnd)) next.focusEnd = Math.max(0, Math.min(Date.now() + 86400000, value.focusEnd));
      if (value.models) for (const p of Object.keys(PROVIDERS)) if (value.models[p]) {
        next.models[p] = {...next.models[p]};
        for (const kind of ['chat', 'speech','vision']) { const m = value.models[p][kind]; if (typeof m === 'string' && /^[\w./:-]{1,160}$/.test(m)) next.models[p][kind] = m; }
      }
      const changes=keyChanges(value,PROVIDERS);
      if([...changes.values()].some(Boolean)&&!await safeStorage.isAsyncEncryptionAvailable())throw new Error('Windows secure storage is unavailable.');
      for(const[provider,text]of changes){if(text)next.keys[provider]=(await safeStorage.encryptStringAsync(text)).toString('base64');else delete next.keys[provider];}
      if(typeof value.autostart==='boolean')next.autostart=value.autostart;
      const shortcutsChanged=JSON.stringify(state.shortcuts)!==JSON.stringify(next.shortcuts);
      next.microphone=validatePrivacy({...state.microphone,...value.microphone},next.shortcuts);
      const microphoneChanged=JSON.stringify(next.microphone)!==JSON.stringify(state.microphone);
      const microphoneShortcutsChanged=next.microphone.muteShortcut!==state.microphone.muteShortcut||next.microphone.pttShortcut!==state.microphone.pttShortcut;
      const previous=state;state=next;try{persist();}catch(error){state=previous;throw error;}
      for(const[provider,text]of changes){delete keyErrors[provider];if(text)keyCache.set(provider,text);else keyCache.delete(provider);}
      
      if(shortcutsChanged||microphoneShortcutsChanged)registerShortcuts();
      if(microphoneChanged)await privacy.apply();
      else if(value.voice||changes.size||value.speech||value.languages||value.companion)await configureVoice();
      geometry.reflow();
      if(typeof value.autostart==='boolean'){try{if(!smokeMode)setStartup(app,state.autostart);startupError='';}catch{startupError='Settings saved, but Windows startup registration failed. Try the Start with Windows toggle again.';}refreshTray();}
      widgets.emit('settings:changed',publicState());
      return publicState();
    };
    handle('state:save',value=>{const pending=saveQueue.then(()=>saveSettings(value));saveQueue=pending.catch(()=>{});return pending;});
    handle('speech:setup',()=>shell.openExternal(require('./speech.cjs').SETUP_URL));
    handle('gemini:setup',()=>shell.openExternal('https://aistudio.google.com/api-keys'));
    handle('gemini:check',async()=>{const client=require('./gemini-live.cjs').createLiveClient({key:key('gemini'),instruction:'Connection check. Do not speak.',onContent:()=>{},onError:()=>{}});try{await client.connect();return 'Gemini Live connected. Microphone was not opened.';}finally{client.close();}});
    handle('speech:segments',text=>require('./speech.cjs').chunks(text));
    handle('speech:synthesize',async text=>{privacy.assertAllowed();const controller=new AbortController();privacy.uploads.add(controller);try{return await require('./speech.cjs').synthesize({text,key:key('groq'),voice:state.companion.voice,signal:controller.signal});}finally{privacy.uploads.delete(controller);}});
    handle('companion:pause',paused=>native.request('wake.pause',{paused:paused===true}));
    handle('companion:check',()=>native.request('wake.status'));
    handle('assistant:cancel',id=>{askRequests.get(id)?.abort();return true;});
    handle('assistant:ask',async value=>{
      const text=typeof value==='string'?value:value?.text,id=typeof value?.id==='string'?value.id:randomUUID();if(typeof text!=='string'||text.length>20000||id.length>100)throw new Error('Invalid message.');
      const controller=new AbortController();askRequests.set(id,controller);
      try{return await runAssistant(text,{signal:controller.signal,source:'typed',utteranceId:id});}finally{askRequests.delete(id);}
    });
    handle('voice:clean', text => clean(text, { provider: state.assistant, key: key(state.assistant), model: state.models[state.assistant]?.chat }));
    handle('screen:guide', async question => {
      win.hide();
      try { const visionProvider=state.visionProvider||(PROVIDERS[state.assistant].vision?state.assistant:state.speech);const value=await guide(question, visionProvider, key(visionProvider),state.models[visionProvider]||{},{native,onCaptured:()=>{if(!userHidden&&liveContents(win))win.showInactive();}});lastGuide={...value,id:randomUUID(),at:Date.now(),display:screen.getPrimaryDisplay().bounds};return lastGuide; }
      finally { if(!userHidden&&liveContents(win))win.showInactive(); }
    });
    handle('screen:probe',()=>native.request('screen.probe'));
    handle('screen:highlight',value=>{
      if(!lastGuide||value?.id!==lastGuide.id||Date.now()-lastGuide.at>90000)throw new Error('Refresh screen guidance before highlighting.');
      if(!Number.isInteger(value.index))throw new Error('Choose a guide step.');
      const display=screen.getPrimaryDisplay().bounds;
      if(JSON.stringify(display)!==JSON.stringify(lastGuide.display))throw new Error('The display changed. Refresh guidance first.');
      const bounds=highlightBounds(lastGuide,display,value.index);
      if(guideOverlay&&!guideOverlay.isDestroyed())guideOverlay.close();
      guideOverlay=new BrowserWindow({...bounds,frame:false,transparent:true,focusable:false,skipTaskbar:true,resizable:false,show:false,webPreferences:{sandbox:true,contextIsolation:true,nodeIntegration:false}});
      guideOverlay.setAlwaysOnTop(true,'screen-saver');guideOverlay.setIgnoreMouseEvents(true);
      const overlay=guideOverlay;
      overlay.loadFile(path.join(__dirname,'highlight.html'),{query:{label:lastGuide.steps[value.index].target_text||'Next step'}});
      overlay.once('ready-to-show',()=>{if(!overlay.isDestroyed())overlay.showInactive();});
      overlay.on('closed',()=>{if(guideOverlay===overlay)guideOverlay=null;});
      setTimeout(()=>{if(!overlay.isDestroyed())overlay.close();},5000);return true;
    });
    handle('screen:act',async value=>{
      if(!lastGuide||value?.id!==lastGuide.id||Date.now()-lastGuide.at>90000)throw new Error('Refresh screen guidance before taking an action.');
      if(!Number.isInteger(value.index)||!lastGuide.steps[value.index]?.match)throw new Error('That step has no grounded target. Refresh guidance and try again.');
      const display=screen.getPrimaryDisplay().bounds;
      if(JSON.stringify(display)!==JSON.stringify(lastGuide.display))throw new Error('The display changed. Refresh guidance first.');
      const bounds=highlightBounds(lastGuide,display,value.index);
      win.hide();
      try{const observation=await native.request('screen.observe',{},30000);if(!revalidate(lastGuide.steps[value.index].match,observation))throw new Error('The target moved or changed. Refresh guidance first.');const point=screen.dipToScreenPoint({x:Math.round(bounds.x+bounds.width/2),y:Math.round(bounds.y+bounds.height/2)});await native.request('click',point,5000);return true;}
      finally{if(!userHidden&&liveContents(win))win.showInactive();}
    });
    handle('voice:transcribe', async value => {privacy.assertAllowed();const controller=new AbortController();privacy.uploads.add(controller);try{if(!state.languages.cloudAudioConsent)throw new Error('Allow cloud audio in Voice & typing before recording.');return transcribe({ provider: state.speech, key: key(state.speech), model: state.models[state.speech]?.speech, audio: Buffer.from(value?.audio || []), mime: value?.mime,signal:controller.signal,...localization.speechOptions(state.languages) });}finally{privacy.uploads.delete(controller);}});
    handle('text:copy', text => { if (typeof text !== 'string' || text.length > 100000) throw new Error('Invalid text.'); clipboard.writeText(text); });
    handle('window:activate',activateIsland);
    handle('window:expand', value => resize(value === true || value?.on === true, value?.view, value?.height,value?.hud===true));
    handle('window:layout',()=>geometry.layout);
    handle('window:geometry-diagnostics',()=>({layout:geometry.layout,bounds:win.getBounds(),content:win.getContentBounds(),ignored:geometry.ignored,trace:geometryTrace}));
    ipcMain.on('window:hitbox',(event,rect)=>{if(trustedWindowEvent(event,[win],page))geometry.hitbox(rect);});
    handle('window:reminder-hud',value=>{geometry.reminder=value===true;geometry.present(surfaceExpanded,voiceHudActive||geometry.reminder);return true;});
    handle('window:voice-hud', value => { if(!surfaceExpanded&&!win.isDestroyed()&&!win.webContents.isDestroyed())resize(false,'assistant',42,value===true); return true; });
    handle('window:settings', openSettings);
    handle('window:close', () => { if (settingsWindow && !settingsWindow.isDestroyed()) settingsWindow.close(); else win.hide(); return true; });
    handle('window:hide', () => {userHidden=true;win.hide();});
    handle('shelf:drag',async value=>{const files=(Array.isArray(value?.paths)?value.paths:[]).filter(p=>widgets.library.view().shelf.includes(p)&&fs.existsSync(p));if(!files.length)throw new Error('No shelf files selected.');win.webContents.startDrag({file:files[0],files,icon:await app.getFileIcon(files[0],{size:'normal'})});return true;});
    const icon = nativeImage.createFromPath(path.join(__dirname,'assets','icon-32.png')).resize({width:16,height:16});
    tray = new Tray(icon); tray.setToolTip('Agent Notch');
    function refreshTray(){tray.setToolTip('Agent Notch · '+(privacy?.view().reason||'Manual activation only'));tray.setContextMenu(Menu.buildFromTemplate([
      {label:'Open Agent Notch',click:()=>activateIsland({revealOnly:true})},
      {label:privacy?.view().blocked?'Microphone muted / paused':'Microphone available · '+state.microphone.mode,enabled:false},
      {label:state.microphone.muted?'Unmute microphone':'Mute microphone',click:()=>privacy.set({muted:!state.microphone.muted}).catch(()=>{})},
      {label:'Gaming / Meeting Mode',type:'checkbox',checked:state.microphone.gaming,click:item=>privacy.set({gaming:item.checked}).catch(()=>{})},
      {label:'Show active task',click:()=>{userHidden=false;win.showInactive();win.webContents.send('window:open');const task=taskCoordinator.view();if(task)widgets.emit('task:state',task);}},
      {label:'Stop active task',enabled:!!taskCoordinator.active,click:()=>taskCoordinator.cancel()},
      {label:'Settings',click:openSettings},
      {label:userHidden?'Resume Notch':'Pause Notch',click:()=>{userHidden=!userHidden;userHidden?win.hide():win.showInactive();refreshTray();}},
      {label:'Start with Windows',type:'checkbox',checked:state.autostart,click:item=>{state.autostart=item.checked;persist();try{setStartup(app,item.checked);startupError='';}catch{startupError='Windows startup registration failed.';}widgets.emit('settings:changed',publicState());refreshTray();}},
      {label:state.appearance.pinned?'Unpin':'Pin open',click:()=>{state.appearance.pinned=!state.appearance.pinned;persist();widgets.emit('settings:changed',publicState());if(state.appearance.pinned){win.showInactive();win.webContents.send('window:restore');}refreshTray();}},
      {label:'Quit',click:()=>app.quit()}
    ]));}
    trayRefresh=refreshTray;refreshTray();tray.on('click',()=>activateIsland({revealOnly:true}));
    registerShortcuts();
    cursorTimer=setInterval(()=>{
      if(win.isDestroyed()||!win.isVisible()||win.webContents.isDestroyed())return;
      const point=screen.getCursorScreenPoint(),hit=geometry.poll(point);
      if(hit.changed)win.webContents.send('window:hover',{inside:hit.inside});
      if((surfaceExpanded||voiceHudActive)&&(point.x!==lastCursorX||point.y!==lastCursorY)){lastCursorX=point.x;lastCursorY=point.y;win.webContents.send('cursor:state',hit);}
    },50);
    cursorTimer.unref();
  });
  app.on('will-quit', () => globalShortcut.unregisterAll());
  app.on('before-quit',()=>{quitting=true;taskCoordinator?.close().catch(()=>{});clearInterval(callTimer);privacy?.close();windowsTask?.cancel();for(const request of askRequests.values())request.abort();clearInterval(cursorTimer);voiceEngine?.stop();native?.close();agents?.stop();});
}
