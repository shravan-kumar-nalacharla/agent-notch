'use strict';
const { app, BrowserWindow, ipcMain, screen, safeStorage, clipboard, globalShortcut, Tray, Menu, nativeImage, session, dialog, shell, Notification, powerMonitor, protocol, net } = require('electron');
const fs = require('node:fs');
const{liveContents,trustedWindowEvent}=require('./window-lifecycle.cjs');
const{transformBitmap}=require('./image-transform.cjs');
const pdfTools=require('./pdf-tools.cjs'),documentTools=require('./document-tools.cjs'),archiveTools=require('./archive-tools.cjs'),subtitleTools=require('./subtitle-tools.cjs'),mediaTools=require('./media-tools.cjs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { PROVIDERS, chat, transcribe } = require('./providers.cjs');
const localization=require('./localization.cjs');
const quoteRepository=require('./quotes.cjs');
const keyCache=new Map(),keyErrors={};
const {voiceStatus,pushToTalkStatus,loginOptions,setStartup,shouldHideFullscreen}=require('./settings-status.cjs');
const{windowBehavior,validateWindowRules}=require('./window-policy.cjs');
let dictationRuntime={},pttRuntime={},wakeRuntime={enabled:false};let quotePopups,quotePopupTimer;let speechController;let voiceRuntime={active:false,message:''},voiceConfiguration=Promise.resolve(),startupError='';
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
const {createUpdateService}=require('./updater.cjs');
const {busyReason}=require('./update-policy.cjs');
const releaseNotes=require('./release-notes.json');
const {highlightBounds}=require('./guidance.cjs');const{randomUUID}=require('node:crypto');
if(process.argv.includes('--smoke-test')&&!process.argv.includes('--gpu-smoke'))app.disableHardwareAcceleration();
app.setAppUserModelId('app.agentnotch.desktop');
protocol.registerSchemesAsPrivileged([{scheme:'studio-file',privileges:{standard:true,secure:true,supportFetchAPI:true,stream:true}}]);
ipcMain.on('app:version',event=>{event.returnValue=app.getVersion();});
const {IslandGeometry}=require('./geometry.cjs');
const smokeMode=process.argv.includes('--smoke-test');
if(smokeMode&&['--sarvam-ptt-check','--voice-experience-check'].some(flag=>process.argv.includes(flag)))globalThis.fetch=require('./smoke-sarvam-ptt.cjs').fetcher;
if(smokeMode){const smokeData=fs.mkdtempSync(path.join(process.env.TEMP||process.env.TMP||'.','agent-notch-smoke-'));app.setPath('userData',smokeData);fs.writeFileSync(path.join(smokeData,'settings.json'),JSON.stringify({speak:false,quietMoments:{enabled:false,frequencyMigration:true}}));}
const updateTestMode=process.argv.includes('--update-test');
if(updateTestMode&&!smokeMode){app.setPath('userData',fs.mkdtempSync(path.join(process.env.TEMP||process.env.TMP||'.','agent-notch-update-test-')));}
let win, settingsWindow, fileStudioWindow, tray, state, native, widgets, voiceEngine,agents,pluginHub,cursorTimer,boundsTimer,animatingBounds=false,lastCursorX=null,lastCursorY=null,lastBoundsKey='';
let updateService,updateShutdown=null;
let shortcutStatus={open:{accelerator:'',ok:false},voice:{accelerator:'',ok:false}};
let fullscreenHidden=false,userHidden=false,quitting=false;
let windowRule='normal',windowOverride=false;
let surfaceExpanded=false,geometry,voiceHudActive=false;
const geometryTrace=[],askRequests=new Map();
let lastGuide,guideOverlay,windowsTask,taskCoordinator;
const page = pathToFileURL(path.join(__dirname, 'index.html')).href;
const fileStudioPage=pathToFileURL(path.join(__dirname,'file-studio.html')).href;
const studioAllowed=new Set();
const studioUrl=file=>`studio-file://local/${encodeURIComponent(file)}`;
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
  const defaults = { uiSounds:{...require('./ui-sounds-policy.js').DEFAULTS},microphone:{...MIC_DEFAULTS},groqDefaultsMigration:true, assistant: 'groq', speech: 'groq', models: {}, keys: {}, note: '', focusEnd: 0, speak: false, autostart:true, languages:{...localization.DEFAULTS}, companion:{chatEngine:'standard',name:'Cutie',wakeEnabled:false,tts:'system',readTypedReplies:false,voice:'hannah',systemVoice:''}, profileName:'', shortcuts:{open:'CommandOrControl+Shift+Space',voice:'CommandOrControl+Shift+Alt+Space'}, voice:{enabled:false,hotkey:'ctrlShiftWin',inputDeviceId:'',cleanup:'light',style:'casual',autoInsert:true,whisper:true,language:'',telugu:'',ctrlShiftWinMigration:true},deepseek:{thinking:false,stream:true},quickAccess:[],quickAccessRecent:{},quietMoments:{...require('./quiet.cjs').DEFAULTS},appearance:{display:'primary',minimal:false,mascot:true,hideFullscreen:true,autoClose:true,pinned:false,shape:'notch',theme:'system',density:'default',lineWidthDip:100,lineHeightDip:2,lineOpacity:.35,hoverIntentMs:100,mouseleaveGraceMs:1000,motion:'standard',compactMigration:true,face:{enabled:false,seed:'Agent Notch',shape:'organic',hue:165,expression:'idle'}} };
  try { const original=JSON.parse(fs.readFileSync(file(), 'utf8'));groqMigrationPending=original.groqDefaultsMigration!==true;const saved=groqDefaults(original);const voice={...defaults.voice,...saved.voice};if(!saved.languages&&!fs.existsSync(file()+'.pre-multilingual'))fs.copyFileSync(file(),file()+'.pre-multilingual');if(!saved.appearance?.compactMigration)saved.appearance={...saved.appearance,compactMigration:true,density:'default'};if(!saved.voice?.ctrlShiftWinMigration)voice.hotkey='ctrlShiftWin';return {...defaults,...saved,microphone:validatePrivacy({...MIC_DEFAULTS,...saved.microphone}),profileName:typeof saved.profileName==='string'?saved.profileName.slice(0,50):'',shortcuts:{...defaults.shortcuts,...saved.shortcuts},voice,companion:{...defaults.companion,...saved.companion},deepseek:{...defaults.deepseek,...saved.deepseek},languages:localization.validateLanguages({...defaults.languages,...saved.languages}),quietMoments:require('./quiet.cjs').migrateQuiet(saved.quietMoments),appearance:{...defaults.appearance,...saved.appearance}}; } catch { return defaults; }
}
const publicState = () => ({ ...state,microphoneStatus:privacy?.view()||{...state.microphone,blocked:state.microphone.muted}, autostart:state.autostart, startupStatus:app.getLoginItemSettings(loginOptions(app)),startupError,pushToTalkStatus:{...pushToTalkStatus(state,p=>keyCache.has(p)),...pttRuntime},dictationStatus:{...voiceStatus(state,p=>keyCache.has(p)),...dictationRuntime},wakeStatus:wakeRuntime,voiceStatus:{...(state.microphone.mode==='ptt'?pushToTalkStatus:voiceStatus)(state,p=>keyCache.has(p)),...voiceRuntime},keyErrors, keys: undefined, shortcutStatus, configured: Object.fromEntries(Object.keys(PROVIDERS).map(p => [p, keyCache.has(p)])), providers: PROVIDERS });
function persist() { fs.mkdirSync(path.dirname(file()), { recursive: true }); fs.writeFileSync(file() + '.tmp', JSON.stringify(state)); fs.renameSync(file() + '.tmp', file()); }
function key(provider) { const value=keyCache.get(provider);if(!value)throw new Error(keyErrors[provider]||`Save your ${provider} API key in Settings.`);return value; }
function resize(expanded, view='home', contentHeight, voiceHud=false){
  if(expanded&&geometry?.reminder)expanded=false;
  if(!expanded&&windowOverride&&!voiceHud){windowOverride=false;win?.webContents.send('window:policy',{behavior:windowRule});}
  if(expanded&&!windowOverride&&windowRule!=='normal')expanded=false;
  surfaceExpanded=expanded;voiceHudActive=voiceHud;
  return geometry?.present(expanded,voiceHud||geometry.reminder||geometry.quote);
}
function activateIsland(value={}){if(!liveContents(win))return;userHidden=false;if(geometry?.reminder&&!value?.force){if(!win.isVisible())win.showInactive();return;}if(value?.force){geometry.reminder=false;geometry.quote=false;}windowOverride=true;win.webContents.send('window:policy',{behavior:'normal'});win.showInactive();resize(true);win.webContents.send(value?.force?'window:force-open':value?.revealOnly?'window:restore':'window:open',{explicit:true});}
function openSettings(target='') {
  target=['quotes','voice','providers'].includes(target)?target:'';
  if(!liveContents(win))return;win.webContents.send('window:collapse'); resize(false);
  if (settingsWindow && !settingsWindow.isDestroyed()) { settingsWindow.show(); settingsWindow.focus();settingsWindow.webContents.send('settings:section',target); return; }
  settingsWindow = new BrowserWindow({ parent:win,show:false,width: 760, height: Math.min(760,screen.getPrimaryDisplay().workArea.height-32), minWidth: 620, minHeight: 580, title: 'Agent Notch Settings', icon:path.join(__dirname,'assets','icon-256.png'), backgroundColor: '#0c0d10', autoHideMenuBar: true, webPreferences: { backgroundThrottling:false, preload: path.join(__dirname, 'preload.cjs'), sandbox: true, contextIsolation: true, nodeIntegration: false } });
  settingsWindow.webContents.on('will-navigate', e => e.preventDefault());
  settingsWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  const opening=settingsWindow;opening.once('ready-to-show',()=>{if(!opening.isDestroyed()){opening.show();opening.moveTop();opening.focus();}});
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
  shortcutStatus.screenText={accelerator:'Control+Alt+F',ok:globalShortcut.register('Control+Alt+F',()=>{activateIsland({revealOnly:true});win.webContents.send('command:ui',{page:'tools',tool:'screenText'});})};
  if(widgets){widgets.emit('settings:changed',publicState());if(failed.length)widgets.notify('Shortcut unavailable',`Could not register ${failed.join(', ')}. Choose another shortcut in Settings.`);}
}
async function settingsDirty(){
  if(!settingsWindow||settingsWindow.isDestroyed())return false;
  try{return await Promise.race([settingsWindow.webContents.executeJavaScript('window.islandSettingsDirty===true',true),new Promise(resolve=>setTimeout(()=>resolve(false),500))]);}catch{return false;}
}
async function updateBusy(){
  return busyReason({voiceRecording:!!quoteActivity.voiceRecording,capturing:!!widgets?.captures?.capturing,terminalActive:!!widgets?.workspace?.terminalActive?.(),taskActive:!!taskCoordinator?.active,unsaved:await settingsDirty()});
}
async function prepareUpdateShutdown(){
  if(updateShutdown)return updateShutdown;
  updateShutdown=(async()=>{
    quitting=true;
    clearInterval(callTimer);clearInterval(quotePopupTimer);clearInterval(cursorTimer);
    quotePopups?.cancel();
    for(const request of askRequests.values())request.abort();
    privacy?.close();
    voiceEngine?.stop();
    pluginHub?.close();
    try{await agents?.stop();}catch{}
    try{await taskCoordinator?.close();}catch{}
    widgets?.captures?.close?.();
    native?.close();
    try{widgets?.close?.();}catch{}
    try{persist();}catch{}
    await new Promise(resolve=>setTimeout(resolve,150));
  })();
  return updateShutdown;
}
function handle(name, fn, settingsOnly=false) {
  ipcMain.handle(name, async (event, value) => {
    if(quitting)return{ok:false,error:'Agent Notch is closing.'};
    const mainTrusted=trustedWindowEvent(event,settingsOnly?[settingsWindow]:[win,settingsWindow],page);const detailTrusted=['productivity:action','state:get','text:copy'].includes(name)&&trustedWindowEvent(event,[widgets?.productivity?.getWindow()],pathToFileURL(path.join(__dirname,'productivity.html')).href);if(!mainTrusted&&!detailTrusted){if(settingsOnly)return{ok:false,error:'Open Settings to view saved API keys.'};return{ok:false,error:'Untrusted window.'};}
    try { return { ok: true, value: await fn(value) }; } catch (error) { return { ok: false, error: error.message }; }
  });
}
function handleStudio(name,fn){ipcMain.handle(name,async(event,value)=>{if(!trustedWindowEvent(event,[fileStudioWindow],fileStudioPage))return{ok:false,error:'Untrusted window.'};try{return{ok:true,value:await fn(value)}}catch(error){return{ok:false,error:error.message}}});}
async function studioInspect({paths=[]}={}){
  const out=[];
  for(const file of paths.filter(x=>typeof x==='string'&&fs.existsSync(x)).slice(0,50)){
    studioAllowed.add(file);const stat=fs.statSync(file),ext=path.extname(file).slice(1).toLowerCase(),base={path:file,url:studioUrl(file),name:path.basename(file),ext,size:stat.size};
    const image=nativeImage.createFromPath(file);if(!image.isEmpty()){const size=image.getSize();out.push({...base,kind:'image',width:size.width,height:size.height});continue;}
    const pdf=await pdfTools.probe(file);if(pdf){out.push({...base,...pdf});continue;}
    const archive=await archiveTools.probe(file);if(archive){out.push({...base,...archive});continue;}
    const subtitle=subtitleTools.probe(file);if(subtitle){out.push({...base,...subtitle});continue;}
    const doc=documentTools.probe(file);if(doc){out.push({...base,...doc});continue;}
    const media=mediaTools.probe(file);if(media){out.push({...base,...media,fps:media.fps||null});continue;}
    if(['txt','md','csv','json','log','srt','vtt'].includes(ext)&&stat.size<2*1024*1024){out.push({...base,kind:'text',text:fs.readFileSync(file,'utf8').slice(0,300000)});continue;}
    out.push({...base,kind:'unsupported',message:'Preview is not available for this format.'});
  }
  return out;
}
function studioBounds(){try{const value=JSON.parse(fs.readFileSync(path.join(app.getPath('userData'),'file-studio-bounds.json'),'utf8'));if(Number.isFinite(value.width)&&Number.isFinite(value.height))return{width:Math.max(850,value.width),height:Math.max(560,value.height),x:Number.isFinite(value.x)?value.x:undefined,y:Number.isFinite(value.y)?value.y:undefined};}catch{}return{width:1100,height:720};}
async function openFileStudio(files=[]){
  const paths=[...new Set(files.filter(file=>typeof file==='string'&&fs.existsSync(file)))].slice(0,50);for(const file of paths)studioAllowed.add(file);
  if(fileStudioWindow&&!fileStudioWindow.isDestroyed()){if(!fileStudioWindow.isVisible())fileStudioWindow.show();fileStudioWindow.focus();if(paths.length)fileStudioWindow.webContents.send('studio:add',paths);return true;}
  fileStudioWindow=new BrowserWindow({...studioBounds(),minWidth:850,minHeight:560,show:false,title:'Agent Notch — File Studio',icon:path.join(__dirname,'assets','icon-256.png'),backgroundColor:'#0f1113',autoHideMenuBar:true,webPreferences:{backgroundThrottling:false,preload:path.join(__dirname,'preload.cjs'),sandbox:true,contextIsolation:true,nodeIntegration:false}});
  fileStudioWindow.webContents.setWindowOpenHandler(()=>( {action:'deny'}));fileStudioWindow.webContents.on('will-navigate',event=>event.preventDefault());
  fileStudioWindow.once('ready-to-show',()=>{if(!fileStudioWindow.isDestroyed()){fileStudioWindow.show();fileStudioWindow.focus();}});
  fileStudioWindow.webContents.on('did-finish-load',()=>{if(paths.length)setTimeout(()=>{if(fileStudioWindow&&!fileStudioWindow.isDestroyed())fileStudioWindow.webContents.send('studio:add',paths);},900);});
  let studioBoundsTimer;const saveStudioBounds=()=>{if(!fileStudioWindow||fileStudioWindow.isDestroyed())return;const b=fileStudioWindow.getBounds();try{fs.writeFileSync(path.join(app.getPath('userData'),'file-studio-bounds.json'),JSON.stringify(b));}catch{}};fileStudioWindow.on('resize',()=>{clearTimeout(studioBoundsTimer);studioBoundsTimer=setTimeout(saveStudioBounds,400);});fileStudioWindow.on('move',()=>{clearTimeout(studioBoundsTimer);studioBoundsTimer=setTimeout(saveStudioBounds,400);});
  fileStudioWindow.on('closed',()=>{fileStudioWindow=null;});fileStudioWindow.loadFile(path.join(__dirname,'file-studio.html'));return true;
}
async function studioImage(value={}){
  if(typeof value.path!=='string'||!fs.existsSync(value.path))throw new Error('Choose an image.');
  let image=nativeImage.createFromPath(value.path);if(image.isEmpty())throw new Error('This image could not be decoded.');
  if(value.crop){const c=value.crop,size=image.getSize(),x=Math.max(0,Math.min(size.width-1,Math.round(Number(c.x)||0))),y=Math.max(0,Math.min(size.height-1,Math.round(Number(c.y)||0))),w=Math.max(1,Math.min(size.width-x,Math.round(Number(c.width)||size.width))),h=Math.max(1,Math.min(size.height-y,Math.round(Number(c.height)||size.height)));image=image.crop({x,y,width:w,height:h});}
  const rotate=[0,90,180,270].includes(Number(value.rotate))?Number(value.rotate):0,flip=!!value.flip;if(rotate||flip){const s=image.getSize(),r=transformBitmap(image.toBitmap(),s.width,s.height,rotate,flip);image=nativeImage.createFromBitmap(r.data,{width:r.width,height:r.height});}
  if(Number(value.width)>0||Number(value.height)>0){const s=image.getSize(),w=Math.max(1,Math.round(Number(value.width)||s.width)),h=Math.max(1,Math.round(Number(value.height)||s.height));if(w*h<40000000)image=image.resize({width:w,height:h,quality:'best'});}
  const format=value.format==='jpeg'?'jpeg':'png',ext=format==='jpeg'?'jpg':'png',r=await dialog.showSaveDialog({defaultPath:path.join(path.dirname(value.path),path.basename(value.path,path.extname(value.path))+'-studio.'+ext),filters:[{name:format==='jpeg'?'JPEG':'PNG',extensions:[ext]}]});if(r.canceled)return false;if(path.resolve(r.filePath).toLowerCase()===path.resolve(value.path).toLowerCase())throw new Error('Choose a new output file; the original is never overwritten.');fs.writeFileSync(r.filePath,format==='jpeg'?image.toJPEG(92):image.toPNG());return{path:r.filePath,name:path.basename(r.filePath),size:fs.statSync(r.filePath).size,width:image.getSize().width,height:image.getSize().height};
}
async function studioMedia(value={}){
  if(typeof value.path!=='string'||!fs.existsSync(value.path))throw new Error('Choose a media file.');const info=mediaTools.probe(value.path);if(!info)throw new Error('Choose a video or audio file.');if(!info.available)throw new Error(info.message);
  const action=['trim','crop','mute','speed','snapshot','render'].includes(value.action)?value.action:'trim',ext=action==='snapshot'?'png':info.kind==='video'?'mp4':'mp3',r=await dialog.showSaveDialog({defaultPath:path.join(path.dirname(value.path),path.basename(value.path,path.extname(value.path))+'-studio.'+ext),filters:[{name:ext.toUpperCase(),extensions:[ext]}]});if(r.canceled)return false;if(path.resolve(r.filePath).toLowerCase()===path.resolve(value.path).toLowerCase())throw new Error('Choose a new output file; the original is never overwritten.');
  await mediaTools.edit({input:value.path,output:r.filePath,action,start:value.start,end:value.end,crop:value.crop,speed:value.speed,mute:value.mute,volume:value.volume,time:value.time});
  return{path:r.filePath,name:path.basename(r.filePath),size:fs.statSync(r.filePath).size};
}

async function studioMetadata({path:file}={}){
  if(typeof file!=='string'||!fs.existsSync(file))throw new Error('Choose a file.');const image=nativeImage.createFromPath(file),base=path.basename(file,path.extname(file));
  if(!image.isEmpty()){const ext=path.extname(file).toLowerCase()==='.jpg'||path.extname(file).toLowerCase()==='.jpeg'?'jpg':'png',r=await dialog.showSaveDialog({defaultPath:path.join(path.dirname(file),base+'-clean.'+ext),filters:[{name:ext.toUpperCase(),extensions:[ext]}]});if(r.canceled)return false;fs.writeFileSync(r.filePath,ext==='jpg'?image.toJPEG(92):image.toPNG());return{path:r.filePath,name:path.basename(r.filePath),size:fs.statSync(r.filePath).size};}
  const pdf=await pdfTools.probe(file);if(pdf){const r=await dialog.showSaveDialog({defaultPath:path.join(path.dirname(file),base+'-clean.pdf'),filters:[{name:'PDF',extensions:['pdf']}]});if(r.canceled)return false;await pdfTools.stripMetadata(file,r.filePath);return{path:r.filePath,name:path.basename(r.filePath),size:fs.statSync(r.filePath).size};}
  const media=mediaTools.probe(file);if(media){const ext=media.kind==='video'?'mp4':'mp3',r=await dialog.showSaveDialog({defaultPath:path.join(path.dirname(file),base+'-clean.'+ext),filters:[{name:ext.toUpperCase(),extensions:[ext]}]});if(r.canceled)return false;await mediaTools.stripMetadata(file,r.filePath);return{path:r.filePath,name:path.basename(r.filePath),size:fs.statSync(r.filePath).size};}
  throw new Error('Metadata removal supports images, PDFs, video and audio.');
}
async function studioPdfRead({path:file}={}){
  if(typeof file!=='string'||!fs.existsSync(file))throw new Error('Choose a PDF.');const stat=fs.statSync(file);if(stat.size>120*1024*1024)throw new Error('This PDF is larger than the 120 MB preview limit.');studioAllowed.add(file);return{name:path.basename(file),data:fs.readFileSync(file).toString('base64')};
}
async function studioPdfSave(value={}){
  if(typeof value.path!=='string'||!fs.existsSync(value.path))throw new Error('Choose a PDF.');const r=await dialog.showSaveDialog({defaultPath:path.join(path.dirname(value.path),path.basename(value.path,path.extname(value.path))+'-studio.pdf'),filters:[{name:'PDF',extensions:['pdf']}]});if(r.canceled)return false;const result=await pdfTools.compose(value.path,value.pages||[],r.filePath);return{...result,name:path.basename(r.filePath),size:fs.statSync(r.filePath).size};
}
async function studioPdfMerge(value={}){
  const r=await dialog.showOpenDialog({properties:['openFile','multiSelections'],filters:[{name:'PDF',extensions:['pdf']}]});if(r.canceled||r.filePaths.length<2)return false;const s=await dialog.showSaveDialog({defaultPath:'merged-studio.pdf',filters:[{name:'PDF',extensions:['pdf']}]});if(s.canceled)return false;const result=await pdfTools.merge(r.filePaths,s.filePath);return{...result,name:path.basename(s.filePath),size:fs.statSync(s.filePath).size};
}
async function studioWriteImages(value={}){
  const r=await dialog.showOpenDialog({properties:['openDirectory','createDirectory']});if(r.canceled)return false;const outputs=[];for(const image of value.images||[]){const match=/^data:image\/png;base64,(.+)$/.exec(image.data||'');if(!match)continue;const name=String(image.name||'page').replace(/[\\/:*?"<>|]/g,'-')+'.png',target=path.join(r.filePaths[0],name);fs.writeFileSync(target,Buffer.from(match[1],'base64'));outputs.push(target);}return{outputs,folder:r.filePaths[0]};
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
    let screenLocked=false;const lock=()=>{quoteActivity.locked=true;widgets?.captures?.close();taskCoordinator?.cancel();windowsTask?.cancel();privacy?.suspend(true);widgets?.emit('quiet:suppress',{});},unlock=()=>{screenLocked=false;quoteActivity.locked=false;quoteTransition=0;privacy?.suspend(false);quotePopups?.wake();};
    const screenLock=()=>{screenLocked=true;lock();},resume=()=>{if(!screenLocked)unlock();};powerMonitor.on('lock-screen',screenLock);powerMonitor.on('suspend',lock);powerMonitor.on('unlock-screen',unlock);powerMonitor.on('resume',resume);
    app.once('will-quit',()=>{powerMonitor.off('lock-screen',screenLock);powerMonitor.off('suspend',lock);powerMonitor.off('unlock-screen',unlock);powerMonitor.off('resume',resume);keyCache.clear();});
    session.defaultSession.setPermissionRequestHandler((contents, permission, callback, details) => callback(!privacy?.view().blocked&&privacy?.view().mode!=='ptt'&&[liveContents(win),liveContents(settingsWindow)].includes(contents) && contents?.getURL().split('?')[0] === page && permission === 'media' && details.mediaTypes?.every(t => contents===liveContents(win)?['audio','video'].includes(t):t==='audio')));
    session.defaultSession.setPermissionCheckHandler((contents, permission) => !privacy?.view().blocked&&privacy?.view().mode!=='ptt'&&[liveContents(win),liveContents(settingsWindow)].includes(contents) && contents?.getURL().split('?')[0] === page && permission === 'media');
    protocol.handle('studio-file',request=>{try{const file=decodeURIComponent(new URL(request.url).pathname.slice(1));if(!studioAllowed.has(file))return new Response('Forbidden',{status:403});return net.fetch(pathToFileURL(file).href);}catch{return new Response('Not found',{status:404});}});
    win = new BrowserWindow({ width: 174, height: 42, frame: false, transparent: true, resizable: false, alwaysOnTop: true, skipTaskbar: true, show:false, icon:path.join(__dirname,'assets','icon-32.png'), webPreferences: { backgroundThrottling:false, preload: path.join(__dirname, 'preload.cjs'), sandbox: true, contextIsolation: true, nodeIntegration: false } });
    geometry=new IslandGeometry({win,screen,getAppearance:()=>state.appearance,trace:value=>{if(smokeMode||process.argv.includes('--trace-motion')){geometryTrace.push(value);if(geometryTrace.length>1000)geometryTrace.shift();}}});
    win.once('closed',()=>{clearInterval(cursorTimer);if(!quitting)app.quit();});
    for(const [name,visible] of [['hide',false],['show',true]])win.on(name,()=>{if(!widgets?.captures?.capturing)liveContents(win)?.send('window:visibility',visible);});
    geometry.reflow();
    win.setAlwaysOnTop(true, 'screen-saver');
    win.webContents.once('did-finish-load',()=>{if(liveContents(win)){geometry.reflow();win.showInactive();}});
    if(smokeMode)win.webContents.on('console-message',event=>console.log('RENDERER',event.message,event.sourceId||'',event.lineNumber||''));
    win.webContents.on('will-navigate', e => e.preventDefault());
    win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    win.loadFile(path.join(__dirname, 'index.html'), process.argv.includes('--smoke-test') ? {query:{test:'1',...(process.argv.includes('--notch-pointer-check')?{pointerTest:'1'}:{})}} : {}); resize(false);
    win.on('will-move',()=>{geometry.userMove=true;});
    win.on('moved',()=>{const position=geometry.userPosition();if(position){state.appearance.float=position;persist();}setTimeout(()=>geometry.userMove=false,100);});
    for(const event of ['display-added','display-removed','display-metrics-changed'])screen.on(event,()=>{if(!win.isDestroyed())geometry.reflow();});
    if(smokeMode)win.webContents.once('did-finish-load',async()=>{try{await require('./smoke.cjs').run({app,win,screen,getSettingsWindow:()=>settingsWindow,native:()=>native,widgets:()=>widgets,geometry,geometryTrace,saveSnapshot,state:()=>state,quotePopups:()=>quotePopups,quoteActivity});app.exit(0);}catch(e){console.error('SMOKE FAIL',e.stack);app.exit(1);}});
    function quickPaths(){state.quickAccess=require('./quick-access.cjs').normalizeQuick(state.quickAccess);return state.quickAccess;}
    async function quickIcons(){const paths=quickPaths();return Promise.all(paths.map(async(file,index)=>{try{return{...await widgets.resolveIcon(file),index,recent:state.quickAccessRecent?.[file]||0,unavailable:!fs.existsSync(file)};}catch{return{path:file,name:path.basename(file),type:'missing',icon:'',cachePath:null,index,recent:state.quickAccessRecent?.[file]||0,unavailable:true};}}));}
    async function addQuickDialog(properties,filters){const r=await dialog.showOpenDialog({properties,filters});if(r.canceled)return quickPaths();state.quickAccess=require('./quick-access.cjs').addQuick(state.quickAccess,r.filePaths);persist();widgets.emit('settings:changed',publicState());return quickPaths();}
    handle('quick:get',()=>quickPaths());
    handle('quick:icons',()=>quickIcons());
    handle('quick:add',()=>addQuickDialog(['openFile','multiSelections']));
    handle('quick:addFolder',()=>addQuickDialog(['openDirectory','multiSelections']));
    handle('quick:addApp',()=>addQuickDialog(['openFile','multiSelections'],[{name:'Applications',extensions:['exe','lnk','appref-ms','bat','cmd']}]))
    handle('quick:addPaths',async value=>{if(!Array.isArray(value?.paths))throw new Error('No paths.');state.quickAccess=require('./quick-access.cjs').addQuick(state.quickAccess,value.paths.slice(0,20));persist();widgets.emit('settings:changed',publicState());return quickPaths();});
    handle('quick:remove',async value=>{const file=value?.path;state.quickAccess=require('./quick-access.cjs').removeQuick(state.quickAccess,file);persist();widgets.emit('settings:changed',publicState());return quickPaths();});
    handle('quick:reorder',value=>{state.quickAccess=require('./quick-access.cjs').reorderQuick(state.quickAccess,value?.from,value?.to);persist();return quickPaths();});
    handle('quick:reveal',value=>{const file=value?.path;if(!quickPaths().includes(file)||!fs.existsSync(file))throw new Error('That quick-access item is unavailable.');shell.showItemInFolder(file);return true;});
    handle('quick:menu',value=>{const file=value?.path;if(!quickPaths().includes(file))throw new Error('Quick-access item not found.');Menu.buildFromTemplate([{label:'Open',enabled:fs.existsSync(file),click:()=>shell.openPath(file)},{label:'Show in folder',enabled:fs.existsSync(file),click:()=>shell.showItemInFolder(file)},{type:'separator'},{label:'Remove from Quick Access',click:()=>{state.quickAccess=require('./quick-access.cjs').removeQuick(state.quickAccess,file);persist();widgets.emit('settings:changed',publicState());}}]).popup({window:win});return true;});
    handle('quick:open',async value=>{const file=value?.path;if(!quickPaths().includes(file)||!fs.existsSync(file))throw new Error('That quick-access item is unavailable.');const error=await shell.openPath(file);if(error)throw new Error(error);state.quickAccessRecent={...(state.quickAccessRecent||{}),[file]:Date.now()};persist();return true;});
    handle('state:get', publicState);
    handle('window:tool',value=>{
      const id=value?.id;if(typeof id!=='string'||id!==''&&!/^[a-zA-Z][a-zA-Z0-9-]{0,39}$/.test(id))throw new Error('Invalid tool identifier.');
      if(value.size!==undefined){if(!id||!['auto','compact','standard','spacious'].includes(value.size))throw new Error('Choose a supported panel size.');const sizes={...(state.appearance.toolSizes||{})};if(value.size==='auto')delete sizes[id];else sizes[id]=value.size;if(Object.keys(sizes).length>50)throw new Error('Too many panel overrides.');state.appearance.toolSizes=sizes;persist();geometry.activeTool=id;return geometry.reflow();}
      return geometry.tool(id);
    });
    handle('provider:pricing',()=>shell.openExternal('https://api-docs.deepseek.com/quick_start/pricing/'));
    handle('system:installation',()=>require('./installation.cjs').getInstallation(app.getPath('exe')));
    handle('system:uninstall',async value=>{
      const info=await require('./installation.cjs').getInstallation(app.getPath('exe'));if(!info.installed)throw new Error(info.message);
      const erase=value?.deleteData===true;const answer=await dialog.showMessageBox(settingsWindow||win,{type:'warning',buttons:['Cancel',erase?'Uninstall and erase data':'Uninstall, remove API keys'],defaultId:0,cancelId:0,message:'Uninstall Agent Notch?',detail:erase?'Permanently remove Agent Notch settings, encrypted keys, notes and history. Your documents and third-party applications stay on disk.':'Remove the installed application and its saved API keys. Notes, reminders, history and other settings are kept for a possible reinstall.'});if(answer.response!==1)return false;
      app.setLoginItemSettings({openAtLogin:false});globalShortcut.unregisterAll();voiceEngine?.stop();native?.close();agents?.stop();
      const child=require('node:child_process').spawn(info.uninstaller,[...info.args,...(erase?['--delete-app-data']:[])],{detached:true,stdio:'ignore',windowsHide:false});child.unref();setTimeout(()=>app.quit(),150);return true;
    });
    handle('external:open',async value=>{if(typeof value!=='string'||value.length>2048)throw new Error('Invalid link.');const url=new URL(value);if(!['http:','https:'].includes(url.protocol)||url.username||url.password)throw new Error('Only public HTTP or HTTPS links can open.');await shell.openExternal(url.href);return true;});
    handle('quiet:action',async value=>{
      if(value?.op==='status')return quotePopups?.status();
      if(value?.op==='shown')return !!win?.isVisible()&&!win.isMinimized()&&(quotePopups?.shown(value.token)||false);
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
    native.on('event',event=>{if(quitting||!liveContents(win))return;if((event.type==='voice.begin'||event.type==='error'&&event.activation==='ptt')&&!privacy?.view().blocked&&!win.isVisible()){userHidden=false;win.showInactive();}});
    native.on('diagnostic',message=>console.log('[native]',message));
    native.on('event',event=>{if(event.type!=='capture.overlay'||!liveContents(win))return;win.webContents.send('window:capture-overlay',{active:event.active});if(event.active&&!userHidden){fullscreenHidden=false;geometry.reflow();win.setAlwaysOnTop(true,'screen-saver');win.showInactive();win.moveTop();}});
    widgets=setupWidgets({app,BrowserWindow,clipboard,dialog,shell,Notification,powerMonitor,safeStorage,screen,nativeImage,native,handle,mainWindow:()=>win,canRestore:()=>!userHidden&&!quitting&&!quoteActivity.locked,getProviderKey:p=>keyCache.get(p)||'',getState:()=>({...state,interactive:surfaceExpanded&&win.isVisible(),microphoneStatus:privacy?.view()}),onFunctionalNotification:()=>{quoteTransition=Date.now();widgets?.emit('quiet:suppress',{});},onTransition:()=>{quoteTransition=Date.now();},onSystem:value=>{if(value.foreground!==quoteActivity.foreground)quoteActivity.foregroundChangedAt=Date.now();Object.assign(quoteActivity,{foreground:value.foreground,systemKnown:true,fullscreen:!!value.fullscreen,osDnd:value.notificationState==null?'unknown':value.notificationState!==5,meeting:!!value.meetingRecording});if(value.fullscreen||value.notificationState!=null&&value.notificationState!==5)widgets?.emit('quiet:suppress',{});if(quitting||!liveContents(win)||process.argv.includes('--smoke-test'))return;let onIslandDisplay=true;try{if(value.monitorBounds){const dip=screen.screenToDipRect(null,value.monitorBounds);onIslandDisplay=String(screen.getDisplayMatching(dip).id)===geometry.layout.displayId;}}catch{}const behavior=windowBehavior(state.appearance,{...value,onIslandDisplay});if(behavior!==windowRule){windowRule=behavior;widgets.emit('window:policy',{behavior:windowOverride?'normal':behavior});}if(behavior==='hide'&&!windowOverride){if(win.isVisible()){fullscreenHidden=true;win.hide();}}else if(fullscreenHidden){fullscreenHidden=false;if(!userHidden&&liveContents(win)){geometry.reflow();win.setAlwaysOnTop(true,'screen-saver');win.showInactive();}}if(value.captureOverlay&&!userHidden){geometry.reflow();win.setAlwaysOnTop(true,'screen-saver');win.moveTop();}}});
    pluginHub=require('./plugins-main.cjs').createPluginHub({root:path.join(app.getPath('userData'),'plugins'),dialog,shell,clipboard,emit:value=>widgets.emit('plugins:changed',value),show:id=>{activateIsland({revealOnly:true});if(liveContents(win))win.webContents.send('command:ui',{page:'tools',tool:'plugins',plugin:id});}});
    handle('plugins:action',value=>pluginHub.action(value));
    pluginHub.start();

quotePopups=require('./quote-popups.cjs').createQuotePopups({getConfig:()=>state.quietMoments,getHistory:()=>widgets.library.quoteState().quiet,getLocale:()=>({language:localization.outputLanguage(state.languages,'quoteLanguage'),tone:state.languages.quoteTone}),getActivity:()=>{const l=widgets.library.quoteState();return{...quoteActivity,meeting:quoteActivity.meeting||state.microphone.gaming||!!(state.microphone.autoMuteCalls&&privacy?.view().callActive),hidden:userHidden||fullscreenHidden||quitting,busy:surfaceExpanded||settingsWindow?.isVisible()||geometry.reminder||!!taskCoordinator?.active,pomodoro:!!(l.focus||widgets.productivity.hasActiveSession())};},emit:value=>{if(!liveContents(win))return;geometry.quote=true;geometry.present(false,true);win.setAlwaysOnTop(true,'screen-saver');win.showInactive();win.moveTop();win.webContents.send('quiet:popup',value);},record:value=>widgets.library.action('quiet:shown',value)});quotePopupTimer=setInterval(()=>quotePopups.tick(),1000);quotePopupTimer.unref();
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
    voiceEngine=setupVoice({privacy,native,clipboard,runCommand:runAssistant,runWindowsTask:runAssistant,cancelWindowsTask:()=>taskCoordinator.cancel(),prepareProductivity:text=>widgets.productivity.prepareIntent(text),library:widgets.library,getState:()=>state,getKey:key,emit:(channel,value)=>{if(channel==='voice:state'){if(['listening','connecting'].includes(value.phase)){quoteActivity.voiceRecording=true;widgets.emit('quiet:suppress',{});}if(['idle','answer','done','error','draft'].includes(value.phase))quoteActivity.voiceRecording=false;}if(channel==='meeting:state')quoteActivity.meeting=!!value;widgets.emit(channel,value);},handle,notify:widgets.notify,speak:(text,options={})=>widgets.emit('speech:request',{text,...options})});
    native.on('stopped',()=>{if(!quitting)privacy.unavailable();});
    native.on('ready',()=>{if(!quitting)privacy.apply().then(()=>widgets.emit('settings:changed',publicState()));});
    callTimer=setInterval(async()=>{if(!state.microphone.autoMuteCalls)return;try{const value=await native.request('privacy.calls',{apps:state.microphone.callApps},2500);await privacy.calls(value);}catch{await privacy.calls({known:false});}},1000);
    native.on('event',event=>{if(quitting||!liveContents(win))return;if(event.type==='wake.detected'&&!privacy.view().blocked&&state.microphone.mode==='always'){userHidden=false;win.showInactive();widgets.emit('wake:detected',{name:event.name});}});
    if(!process.argv.includes('--smoke-test'))try{native.start();}catch(e){console.log('[native]',e.message);}
    function configureVoice(){
      const pending=voiceConfiguration.then(async()=>{const status=state.microphone.mode==='ptt'?pushToTalkStatus(state,p=>keyCache.has(p)):voiceStatus(state,p=>keyCache.has(p));voiceRuntime=status;
      try{const blocked=privacy?.view().blocked,dictation=voiceStatus(state,p=>keyCache.has(p)),pttStatus=pushToTalkStatus(state,p=>keyCache.has(p));
        const response=await native.request('voice.configure',{...state.voice,enabled:dictation.ready&&!blocked});dictationRuntime={...dictation,active:response.enabled===true,message:blocked?privacy.view().reason:response.enabled?'Hold Ctrl + Shift + Windows to type in the focused app.':dictation.message};
        const ptt=await native.request('privacy.ptt',{enabled:!blocked&&['ptt','always'].includes(state.microphone.mode)&&shortcutStatus.ptt?.ok===true,shortcut:state.microphone.pttShortcut,ready:pttStatus.ready,reason:pttStatus.message});
        pttRuntime={...pttStatus,active:ptt.enabled===true&&pttStatus.ready,message:blocked?privacy.view().reason:shortcutStatus.ptt?.ok!==true?'Push-to-talk shortcut is unavailable. Choose another shortcut.':pttStatus.message};
        try{wakeRuntime=await native.request('wake.configure',{name:state.companion.name,enabled:!blocked&&state.microphone.mode==='always'});}catch(e){wakeRuntime={enabled:false,name:state.companion.name,error:e.message};}
        voiceRuntime=state.microphone.mode==='ptt'?{...status,active:ptt.enabled===true&&pttStatus.ready,message:blocked?privacy.view().reason:shortcutStatus.ptt?.ok!==true?'Push-to-talk shortcut is unavailable. Choose another shortcut.':pttStatus.message}:{...dictationRuntime};}
      catch{voiceRuntime={...status,active:false,message:'Preferences saved, but the Windows voice engine could not start. Run Check voice engine to retry.'};}
      });voiceConfiguration=pending.catch(()=>{});return pending;
    }
    let saveQueue=Promise.resolve();
    const saveSettings=async value => {
      if (!value || typeof value !== 'object') throw new Error('Invalid settings.');
      const next = structuredClone(state);
      if(value.uiSounds)next.uiSounds=require('./ui-sounds-policy.js').validate({...next.uiSounds,...value.uiSounds});
      if(value.languages){if(quoteActivity.voiceRecording)throw new Error('Finish or cancel the active recording before changing languages.');next.languages=localization.validateLanguages({...next.languages,...value.languages});next.speak=next.languages.spokenReplyEnabled;}
      if(quoteActivity.voiceRecording&&(value.speech||value.models||value.voice))throw new Error('Finish or cancel recording before changing voice providers.');
      for (const field of ['assistant', 'speech']) if (value[field] !== undefined) { const supported=(value[field]==='local'||value[field]==='whisper')?field==='speech':Object.hasOwn(PROVIDERS,value[field])&&(field!=='speech'||PROVIDERS[value[field]].speech); if(!supported)throw new Error('Provider does not support that capability.'); next[field] = value[field]; }
      if (typeof value.note === 'string') next.note = value.note.slice(0, 20000);
      if (typeof value.profileName === 'string') next.profileName = value.profileName.trim().slice(0,50);
      if (typeof value.speak === 'boolean') next.speak = value.speak;
      if(value.companion){if(quoteActivity.voiceRecording)throw new Error('Stop recording before changing voice settings.');const c=value.companion;if(c.chatEngine!==undefined){if(!['gemini_live','standard','sarvam'].includes(c.chatEngine))throw new Error('Invalid voice chat engine.');next.companion.chatEngine=c.chatEngine;}for(const[k,min,max]of [['rate',.8,1.2],['volume',0,1]])if(c[k]!==undefined){if(!Number.isFinite(c[k])||c[k]<min||c[k]>max)throw new Error('Invalid voice '+k);next.companion[k]=c[k];}const name=c.name===undefined?next.companion.name:c.name;if(typeof name!=='string'||!/^([\p{L}\p{N}]| ){2,30}$/u.test(name.trim()))throw new Error('Use 2–30 letters, spaces or numbers for the companion name.');next.companion={...next.companion,name:name.trim()};if(c.readingContext!==undefined)next.companion.readingContext=require('./voice-conversation.cjs').readingContext(c.readingContext);if(typeof c.readTypedReplies==='boolean')next.companion.readTypedReplies=c.readTypedReplies;if(typeof c.wakeEnabled==='boolean')next.companion.wakeEnabled=c.wakeEnabled;if(['groq','system','sarvam'].includes(c.tts))next.companion.tts=c.tts;if(c.sarvamVoice!==undefined){if(!require('./sarvam.cjs').VOICES.includes(c.sarvamVoice))throw new Error('Choose a supported Sarvam voice.');next.companion.sarvamVoice=c.sarvamVoice;}if(require('./speech.cjs').VOICES.includes(c.voice))next.companion.voice=c.voice;if(typeof c.systemVoice==='string')next.companion.systemVoice=c.systemVoice.slice(0,300);}

      if(value.voice&&typeof value.voice==='object'){
        for(const k of ['enabled','autoInsert','whisper','chatOnSilence'])if(typeof value.voice[k]==='boolean')next.voice[k]=value.voice[k];
        if(value.voice.sensitivity!==undefined){if(!Number.isFinite(value.voice.sensitivity)||value.voice.sensitivity<.001||value.voice.sensitivity>.1)throw new Error('Speech sensitivity must be 0.001–0.1.');next.voice.sensitivity=value.voice.sensitivity;}
        if(typeof value.voice.inputDeviceId==='string')next.voice.inputDeviceId=value.voice.inputDeviceId.slice(0,500);
        for(const [k,allowed]of Object.entries({hotkey:['rightAlt','rightCtrl','ctrlShiftWin'],cleanup:['none','light','medium'],style:['formal','casual','very casual','excited','code'],telugu:['','telugu','mixed','roman']}))if(allowed.includes(value.voice[k]))next.voice[k]=value.voice[k];
        if(typeof value.voice.language==='string'&&/^[a-z]{0,3}$/.test(value.voice.language))next.voice.language=value.voice.language;
      }
      if(value.appearance&&typeof value.appearance==='object'){for(const k of ['minimal','mascot','hideFullscreen','autoClose','pinned'])if(typeof value.appearance[k]==='boolean')next.appearance[k]=value.appearance[k];if(typeof value.appearance.display==='string')next.appearance.display=value.appearance.display.slice(0,30);if(typeof value.appearance.shape==='string'&&['notch','pill','line','corner'].includes(value.appearance.shape))next.appearance.shape=value.appearance.shape;if(['dark','light','system'].includes(value.appearance.theme))next.appearance.theme=value.appearance.theme;if(Array.isArray(value.appearance.favorites))next.appearance.favorites=[...new Set(value.appearance.favorites.filter(x=>['media','timer','water','shelf','todo','reminders','clips','dictionary','snippets','history','meetings','projects','weather','calendar','mirror','prompter','system'].includes(x)))].slice(0,8);const f=value.appearance.face;if(f&&typeof f==='object'){const face={...next.appearance.face};if(typeof f.enabled==='boolean')face.enabled=f.enabled;if(['round','organic','boxy','capsule','nub','cloud','droplet','hexagon','sun','triangle'].includes(f.shape))face.shape=f.shape;if(['idle','happy','sad','mad','surprised','wink','sleepy','smug','unsure','scared','love','shy','sick','thinking'].includes(f.expression))face.expression=f.expression;if(Number.isFinite(f.hue))face.hue=Math.max(0,Math.min(360,Math.round(f.hue)));if(typeof f.seed==='string')face.seed=f.seed.slice(0,80);next.appearance.face=face;}}
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
      next.microphone=validatePrivacy({...state.microphone,...value.microphone},next.shortcuts);if(value.companion?.wakeEnabled!==undefined&&!value.microphone?.mode)next.microphone.mode=value.companion.wakeEnabled?'always':next.microphone.mode==='always'?'manual':next.microphone.mode;next.companion.wakeEnabled=next.microphone.mode==='always';
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
    handle('sarvam:setup',()=>shell.openExternal('https://dashboard.sarvam.ai/'));
    handle('speech:segments',value=>{const speech=require('./speech.cjs'),selected=speech.selection(state,value);return speech.chunks(selected.text,selected.provider==='sarvam'?1000:200);});
    handle('speech:interruption',enabled=>{if(enabled===true)privacy.assertAllowed();return native.request('wake.interruption',{enabled:enabled===true&&state.microphone.mode==='always'});});
    native.on('event',event=>{if(event.type!=='voice.interrupt'||privacy.view().blocked)return;voiceEngine?.interrupt();if(taskCoordinator?.voiceActive)taskCoordinator.cancel();speechController?.abort();widgets.emit('voice:interrupt',{command:event.command==='hide'?'hide':'stop'});});
    handle('speech:cancel',()=>{speechController?.abort();return true;});
    handle('speech:synthesize',async value=>{privacy.assertAllowed();const selected=require('./speech.cjs').selection(state,value),controller=new AbortController();speechController?.abort();speechController=controller;privacy.uploads.add(controller);try{return await require(selected.provider==='sarvam'?'./sarvam.cjs':'./speech.cjs').synthesize({...selected,key:key(selected.provider),signal:controller.signal});}finally{privacy.uploads.delete(controller);if(speechController===controller)speechController=null;}});
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
    handle('voice:transcribe', async value => {privacy.assertAllowed();const controller=new AbortController();privacy.uploads.add(controller);try{if(state.speech==='local'){const local=await native.request('voice.local',{audio:value?.audio||''},30000);return local.text;}if(state.speech==='whisper'){const local=await require('./local-whisper.cjs').transcribe(value?.audio||'');return local.text;}if(!state.languages.cloudAudioConsent)throw new Error('Allow cloud audio in Voice & typing before recording.');return transcribe({ provider: state.speech, key: key(state.speech), model: state.models[state.speech]?.speech, audio: Buffer.from(value?.audio || []), mime: value?.mime,signal:controller.signal,...localization.speechOptions(state.languages) });}finally{privacy.uploads.delete(controller);}});
    handle('text:copy', text => { if (typeof text !== 'string' || text.length > 100000) throw new Error('Invalid text.'); clipboard.writeText(text); });
    handleStudio('studio:metadata',studioMetadata);
    handleStudio('studio:choose',async()=>{const r=await dialog.showOpenDialog({properties:['openFile','multiSelections'],filters:[{name:'Supported files',extensions:['png','jpg','jpeg','webp','bmp','gif','svg','mp4','mov','mkv','webm','avi','mp3','wav','m4a','flac','pdf','docx','doc','odt','rtf','txt','md','pptx','xlsx','csv','zip','tar','gz','srt','vtt']},{name:'All files',extensions:['*']}]});return r.canceled?[]:studioInspect({paths:r.filePaths});});
    handleStudio('studio:frames',async({path:file}={})=>{if(typeof file!=='string'||!fs.existsSync(file))throw new Error('Choose a video.');return mediaTools.frames(file,12);});
    handleStudio('studio:inspect',studioInspect);
    handleStudio('studio:image',studioImage);
    handleStudio('studio:media',studioMedia);
    handleStudio('studio:pdfRead',studioPdfRead);
    handleStudio('studio:pdfSave',studioPdfSave);
    handleStudio('studio:pdfMerge',studioPdfMerge);
    handleStudio('studio:writeImages',studioWriteImages);
    handleStudio('studio:openExternal',async({path:file})=>{if(typeof file!=='string'||!studioAllowed.has(file))throw new Error('File is not part of this studio session.');const error=await shell.openPath(file);if(error)throw new Error(error);return true;});
    handle('files:open',value=>{const paths=(Array.isArray(value?.paths)?value.paths:value?.path?[value.path]:[]).filter(file=>typeof file==='string'&&fs.existsSync(file));if(value?.paths?.length&&!paths.length)throw new Error('That file is no longer available.');if(paths.length&&liveContents(win))win.webContents.send('file:detected',{name:path.basename(paths[0]),count:paths.length});return openFileStudio(paths);});
    handle('window:activate',activateIsland);
    handle('window:expand', value => resize(value === true || value?.on === true, value?.view, value?.height,value?.hud===true));

    handle('window:layout',()=>geometry.layout);
    handle('window:geometry-diagnostics',()=>({layout:geometry.layout,bounds:win.getBounds(),content:win.getContentBounds(),ignored:geometry.ignored,trace:geometryTrace}));
    ipcMain.on('window:hitbox',(event,rect)=>{if(trustedWindowEvent(event,[win],page))geometry.hitbox(rect);});
    handle('window:reminder-hud',value=>{geometry.reminder=value===true;geometry.present(surfaceExpanded,voiceHudActive||geometry.reminder||geometry.quote);return true;});
    handle('window:quote-hud',value=>{geometry.quote=value===true;geometry.present(surfaceExpanded,voiceHudActive||geometry.reminder||geometry.quote);return true;});
    handle('window:voice-hud', value => { if(!surfaceExpanded&&!win.isDestroyed()&&!win.webContents.isDestroyed())resize(false,'assistant',42,value===true); return true; });
    handle('window:settings', openSettings);
    handle('window:close', () => { if (settingsWindow && !settingsWindow.isDestroyed()) settingsWindow.close(); else win.hide(); return true; });
    handle('window:hide', () => {userHidden=true;win.hide();});
    handle('shelf:drag',async value=>{const files=(Array.isArray(value?.paths)?value.paths:[]).filter(p=>widgets.library.view().shelf.includes(p)&&fs.existsSync(p));if(!files.length)throw new Error('No shelf files selected.');const resolved=await widgets.resolveIcon(files[0]);const icon=resolved?.icon?nativeImage.createFromDataURL(resolved.icon):await app.getFileIcon(files[0],{size:'normal'});win.webContents.startDrag({file:files[0],files,icon});return true;});
    const icon = nativeImage.createFromPath(path.join(__dirname,'assets','icon-32.png')).resize({width:16,height:16});
    tray = new Tray(icon); tray.setToolTip('Agent Notch');
    function refreshTray(){tray.setToolTip('Agent Notch'+(updateService?.hasUpdate()?' · Update ready':' · '+(privacy?.view().reason||'Manual activation only')));tray.setContextMenu(Menu.buildFromTemplate([
      {label:'Open Agent Notch',click:()=>activateIsland({revealOnly:true})},
      {label:privacy?.view().blocked?'Microphone muted / paused':'Microphone available · '+state.microphone.mode,enabled:false},
      {label:state.microphone.muted?'Unmute microphone':'Mute microphone',click:()=>privacy.set({muted:!state.microphone.muted}).catch(()=>{})},
      {label:'Gaming / Meeting Mode',type:'checkbox',checked:state.microphone.gaming,click:item=>privacy.set({gaming:item.checked}).catch(()=>{})},
      {label:'Show active task',click:()=>{userHidden=false;win.showInactive();win.webContents.send('window:open');const task=taskCoordinator.view();if(task)widgets.emit('task:state',task);}},
      {label:'Stop active task',enabled:!!taskCoordinator.active,click:()=>taskCoordinator.cancel()},
      {label:'Settings',click:openSettings},
      ...(updateService?.trayItem()?[{label:updateService.trayItem().label,enabled:updateService.trayItem().enabled,click:()=>updateService.prompt(true).catch(()=>{})}]:[]),
      {label:userHidden?'Resume Notch':'Pause Notch',click:()=>{userHidden=!userHidden;userHidden?win.hide():win.showInactive();refreshTray();}},
      {label:'Start with Windows',type:'checkbox',checked:state.autostart,click:item=>{state.autostart=item.checked;persist();try{setStartup(app,item.checked);startupError='';}catch{startupError='Windows startup registration failed.';}widgets.emit('settings:changed',publicState());refreshTray();}},
      {label:state.appearance.pinned?'Unpin':'Pin open',click:()=>{state.appearance.pinned=!state.appearance.pinned;persist();widgets.emit('settings:changed',publicState());if(state.appearance.pinned){win.showInactive();win.webContents.send('window:restore');}refreshTray();}},
      {label:'Quit',click:()=>app.quit()}
    ]));}
    trayRefresh=refreshTray;refreshTray();tray.on('click',()=>activateIsland({revealOnly:true}));
    updateService=createUpdateService({
      app,dialog,
      getMainWindow:()=>win,
      getSettingsWindow:()=>settingsWindow,
      getBusy:updateBusy,
      prepareShutdown:prepareUpdateShutdown,
      isEnabled:()=>app.isPackaged&&!smokeMode,
      testMode:updateTestMode,
      onState:value=>{widgets?.emit('update:state',value);try{refreshTray();}catch{}}
    });
    handle('update:status',()=>updateService.status());
    handle('update:check',()=>updateService.check(true));
    handle('update:install',()=>updateService.install());
    handle('releases:notes',()=>({current:app.getVersion(),releases:releaseNotes}));
    updateService.start();
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
  app.on('before-quit',()=>{quitting=true;updateService?.stop();taskCoordinator?.close().catch(()=>{});clearInterval(callTimer);clearInterval(quotePopupTimer);quotePopups?.cancel();privacy?.close();windowsTask?.cancel();for(const request of askRequests.values())request.abort();clearInterval(cursorTimer);voiceEngine?.stop();pluginHub?.close();native?.close();agents?.stop();});
}




