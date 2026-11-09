'use strict';
const path=require('node:path');const fs=require('node:fs');const os=require('node:os');const{createLibrary}=require('./library.cjs');const{transformBitmap}=require('./image-transform.cjs');const mediaTools=require('./media-tools.cjs');
const{calendarDate,parseCalendar,readCalendar}=require('./calendar.cjs');
const{createLyricsClient}=require('./lyrics.cjs');
function setupWidgets({app,BrowserWindow,clipboard,dialog,shell,Notification,powerMonitor,safeStorage,screen,nativeImage,native,handle,mainWindow,canRestore=()=>true,getProviderKey=()=>'',getState=()=>({}),onFunctionalNotification=()=>{},onSystem=()=>{},onTransition=()=>{}}){
  const legacyLibrary=createLibrary(app.getPath('userData'));let productivity;
  const library={...legacyLibrary,view(){const value=legacyLibrary.view();value.calendarUrl='' ;if(productivity){value.productivity=productivity.summary();value.water=productivity.store.water();value.reminders=productivity.store.db.prepare("SELECT * FROM reminder_rules WHERE kind='general' AND deleted_at IS NULL AND id NOT LIKE 'legacy:%' AND id NOT LIKE 'test:%' AND id NOT LIKE 'system:%'").all().map(row=>{const r=productivity.store.ruleView(row);return{id:r.id,text:r.title,at:r.at||r.nextAt,fired:!r.nextAt};});}return value;},action(op,value={}){
    if(op.startsWith('water:')){productivity.waterAction(op,value);return library.view();}
    if(op.startsWith('reminder:')){const store=productivity.store,row=value.id?store.db.prepare('SELECT * FROM reminder_rules WHERE id=?').get(value.id):null,rule=store.ruleView(row);if(op==='reminder:remove')store.db.prepare('UPDATE reminder_rules SET deleted_at=?,next_at=NULL WHERE id=?').run(store.now(),String(value.id));else if(op==='reminder:add'||op==='reminder:edit'||op==='reminder:snooze'){if(op!=='reminder:add'&&!rule)throw new Error('Reminder not found.');const at=op==='reminder:snooze'?Date.now()+Math.max(1,Math.min(1440,Number(value.minutes)||10))*60000:value.at??rule?.at;if(!Number.isSafeInteger(at)||at<=Date.now())throw new Error('Choose a future reminder time.');store.saveRule({...rule,id:rule?.id,kind:'general',enabled:true,mode:'one-off',timezone:store.timezone(),at,title:require('./productivity-store.cjs').requiredText(value.text??rule?.title,2000)});}else throw new Error('Unsupported reminder action.');return library.view();}
    if(op==='config'&&Object.hasOwn(value,'calendarUrl'))throw new Error('Use the Calendar tool to manage encrypted feeds.');legacyLibrary.action(op,value);return library.view();
  }};
  const lookupLyrics=createLyricsClient();let lyricsAbort;let systemPending=false;let lastClip='',weatherCache=null,calendarCache=null,media=null,lastSystem=null;const icons=new Map();
  function emit(channel,value){for(const win of BrowserWindow.getAllWindows()){const contents=require('./window-lifecycle.cjs').liveContents(win);if(contents)contents.send(channel,value);}}
  productivity=require('./productivity-main.cjs').setupProductivity({app,BrowserWindow,Notification,powerMonitor,safeStorage,screen,native,handle,emit,shell,dialog,getState,getLibrary:()=>library.view(),getTimer:()=>legacyLibrary.view().timer,mainWindow,onFunctionalNotification});
  const calendar=require('./secure-calendar.cjs').createSecureCalendar({secrets:productivity.secrets,legacyLibrary,shell});
  const captures=require('./capture-tools.cjs').createCaptureTools({app,native,nativeImage,BrowserWindow,dialog,clipboard,library,screen,canRestore});
  const workspace=require('./workspace-main.cjs').setupWorkspace({app,handle,native,shell,dialog,clipboard,calendar,captures,secrets:productivity.secrets,getProviderKey,mainWindow});
  app.on('before-quit',()=>captures.close());
  function notify(title,body){productivity.engine.recordEvent({kind:'general',id:require('node:crypto').randomUUID(),title,body});}
  handle('library:action',value=>{if(!value||typeof value.op!=='string')throw new Error('Missing action.');const state=library.action(value.op,value.value);if(value.op==='todo:edit'&&value.value?.done)onTransition();emit('library:changed',state);return state;});
  handle('library:get',()=>library.view());
  handle('widgets:desktop',async value=>{
    const op=value?.op,v=value?.value||{};
    if(op==='media.level')return native.request('media.level');
    if(op==='media'){return native.request('media',{appId:library.view().mediaAppId||''});}
    if(op==='media:select'){if(typeof v.appId!=='string')throw new Error('Choose a media player.');const current=await native.request('media');if(v.sessionId!==undefined&&(typeof v.sessionId!=='string'||v.sessionId&&!current.sources?.some(source=>source.sessionId===v.sessionId&&source.appId===v.appId)))throw new Error('That media session is no longer available. Refresh the list.');if(v.appId&&!current.sources?.some(source=>source.appId===v.appId))throw new Error('That media player is no longer available. Refresh the list.');library.action('config',{mediaAppId:v.appId});return native.request('media',{appId:v.appId,...(v.sessionId!==undefined?{sessionId:v.sessionId}:{})});}
    if(['media.control','volume','brightness','devices','system'].includes(op)){const response=await native.request(op,v);if(op==='media.control'&&response===false)throw new Error('This media player does not support that control.');return response;}
    if(op==='shelf:choose'){const r=await dialog.showOpenDialog({properties:['openFile','multiSelections']});return r.canceled?library.view():library.action('shelf:add',{paths:r.filePaths});}
    if(op==='files:choose'||op==='files:inspect'){
      let file=v.path;
      if(op==='files:choose'){const r=await dialog.showOpenDialog({properties:['openFile'],filters:[{name:'Images, video and audio',extensions:['png','jpg','jpeg','webp','bmp','gif','mp4','mov','mkv','webm','avi','m4v','mp3','wav','m4a','aac','flac','ogg','opus']},{name:'All files',extensions:['*']}]});if(r.canceled)return null;file=r.filePaths[0];}
      if(typeof file!=='string'||file.length>32767)throw new Error('Choose a file.');
      const stat=fs.statSync(file);if(!stat.isFile())throw new Error('That path is not a file.');if(stat.size>2*1024*1024*1024)throw new Error('Files are limited to 2 GB.');
      const image=nativeImage.createFromPath(file),size=image.isEmpty()?null:image.getSize();
      if(size)return{path:file,name:path.basename(file),ext:path.extname(file).slice(1).toLowerCase(),bytes:stat.size,kind:'image',width:size.width,height:size.height,message:''};
      const media=mediaTools.probe(file);
      if(media)return{path:file,name:path.basename(file),ext:path.extname(file).slice(1).toLowerCase(),bytes:stat.size,...media};
      return{path:file,name:path.basename(file),ext:path.extname(file).slice(1).toLowerCase(),bytes:stat.size,kind:'unsupported',message:'Documents and other formats are not supported yet. Images, video and audio are available.'};
    }
    if(op==='files:convert'){
      if(typeof v.path!=='string'||v.path.length>32767)throw new Error('Choose a file first.');
      let image=nativeImage.createFromPath(v.path);
      if(!image.isEmpty()){
        if(v.crop==='square'){const size=image.getSize(),side=Math.min(size.width,size.height);if(side<16)throw new Error('Image is too small to crop.');image=image.crop({x:Math.floor((size.width-side)/2),y:Math.floor((size.height-side)/2),width:side,height:side});}
        const rotate=[0,90,180,270].includes(Number(v.rotate))?Number(v.rotate):0,flip=v.flip===true;
        if(rotate||flip){const size=image.getSize(),transformed=transformBitmap(image.toBitmap(),size.width,size.height,rotate,flip);image=nativeImage.createFromBitmap(transformed.data,{width:transformed.width,height:transformed.height});}
        const format=['png','jpeg'].includes(v.format)?v.format:'png',ext=format==='jpeg'?'jpg':'png',width=Number(v.width)||0;
        if(width&&(!Number.isInteger(width)||width<16||width>8000))throw new Error('Width must be 16–8,000 pixels.');
        const source=image.getSize(),targetWidth=width||source.width,targetHeight=width?Math.max(1,Math.round(source.height*width/source.width)):source.height;
        if(targetWidth*targetHeight>40000000)throw new Error('That output is too large.');
        const r=await dialog.showSaveDialog({defaultPath:path.join(path.dirname(v.path),path.basename(v.path,path.extname(v.path))+'-agent-notch.'+ext),filters:[{name:format==='jpeg'?'JPEG image':'PNG image',extensions:[ext]}]});if(r.canceled)return false;
        if(path.resolve(r.filePath).toLowerCase()===path.resolve(v.path).toLowerCase())throw new Error('Choose a new output file; the original is never overwritten.');
        const output=width||targetHeight!==source.height?image.resize({width:targetWidth,height:targetHeight,quality:'best'}):image;
        fs.writeFileSync(r.filePath,format==='jpeg'?output.toJPEG(92):output.toPNG());
        return{path:r.filePath,name:path.basename(r.filePath),bytes:fs.statSync(r.filePath).size,width:targetWidth,height:targetHeight,kind:'image'};
      }
      const media=mediaTools.probe(v.path);if(!media)throw new Error('This file type is not supported.');
      if(!media.available)throw new Error(media.message);
      const ext=media.kind==='video'?'mp4':'mp3',r=await dialog.showSaveDialog({defaultPath:path.join(path.dirname(v.path),path.basename(v.path,path.extname(v.path))+'-agent-notch.'+ext),filters:[{name:media.kind==='video'?'MP4 video':'MP3 audio',extensions:[ext]}]});if(r.canceled)return false;
      if(path.resolve(r.filePath).toLowerCase()===path.resolve(v.path).toLowerCase())throw new Error('Choose a new output file; the original is never overwritten.');
      await mediaTools.transcode({input:v.path,output:r.filePath,start:v.start,end:v.end,kind:media.kind});
      return{path:r.filePath,name:path.basename(r.filePath),bytes:fs.statSync(r.filePath).size,kind:media.kind};
    }
    if(op==='shelf:open'){if(!library.view().shelf.includes(v.path))throw new Error('File is not in the shelf.');const error=await shell.openPath(v.path);if(error)throw new Error(error);return true;}
    if(op==='shelf:reveal'){if(!library.view().shelf.includes(v.path))throw new Error('File is not in the shelf.');shell.showItemInFolder(v.path);return true;}
    if(op==='shelf:icons'){const files=library.view().shelf;return Promise.all(files.map(async file=>{let icon=icons.get(file);if(!icon){try{icon=(await app.getFileIcon(file,{size:'normal'})).toDataURL();icons.set(file,icon);}catch{}}let size=0;try{size=fs.statSync(file).size;}catch{}return{path:file,name:path.basename(file),size,icon};}));}
    if(op==='project:choose'){const r=await dialog.showOpenDialog({properties:['openDirectory']});return r.canceled?library.view():library.action('project:add',{path:r.filePaths[0]});}
    if(op==='project:open'){const project=library.view().projects.find(p=>p.id===v.id);if(!project)throw new Error('Project not found.');if(v.editor){const{spawn}=require('node:child_process');const vscode=path.join(process.env.LOCALAPPDATA||'','Programs','Microsoft VS Code','Code.exe');if(!fs.existsSync(vscode))throw new Error('VS Code is not installed at its usual location.');spawn(vscode,[project.path],{windowsHide:true,shell:false,detached:true,stdio:'ignore'}).unref();}else{const error=await shell.openPath(project.path);if(error)throw new Error(error);}return true;}
    if(op==='copy'){if(typeof v.text!=='string'||v.text.length>400000)throw new Error('Invalid text.');clipboard.writeText(v.text);return true;}
    if(op==='meeting:export'){const meeting=library.view().meetings.find(x=>x.id===v.id);if(!meeting)throw new Error('Meeting not found.');const r=await dialog.showSaveDialog({defaultPath:'meeting-notes.md',filters:[{name:'Markdown',extensions:['md']}]});if(r.canceled)return false;fs.writeFileSync(r.filePath,`# ${meeting.title}\n\n${meeting.notes}\n\n## Transcript\n\n${meeting.transcript}`);return true;}
    if(op==='export'){const data=library.view();const kind=['dictionary','snippets','history','meetings'].includes(v.kind)?v.kind:'history';const r=await dialog.showSaveDialog({defaultPath:`island-${kind}.json`,filters:[{name:'JSON',extensions:['json']}]});if(r.canceled)return false;fs.writeFileSync(r.filePath,JSON.stringify(data[kind],null,2));return true;}
    if(op==='import'){if(!['dictionary','snippets'].includes(v.kind))throw new Error('Unsupported import.');const r=await dialog.showOpenDialog({properties:['openFile'],filters:[{name:'JSON',extensions:['json']}]});if(r.canceled)return library.view();const stat=fs.statSync(r.filePaths[0]);if(stat.size>2*1024*1024)throw new Error('Import is limited to 2 MB.');const list=JSON.parse(fs.readFileSync(r.filePaths[0],'utf8'));if(!Array.isArray(list)||list.length>2000)throw new Error('Expected a JSON array of up to 2,000 entries.');for(const item of list){if(v.kind==='dictionary'&&(typeof item.term!=='string'||item.term.length>150))throw new Error('Invalid dictionary entry.');if(v.kind==='snippets'&&(typeof item.trigger!=='string'||typeof item.expansion!=='string'||item.trigger.length>100||item.expansion.length>10000))throw new Error('Invalid snippet.');}for(const item of list){try{library.action(v.kind==='dictionary'?'dictionary:add':'snippet:add',item);}catch(e){if(!/already/.test(e.message))throw e;}}return library.view();}
    if(op==='weather'){const city=library.view().city;if(!city)return null;if(weatherCache?.city===city&&Date.now()-weatherCache.at<900000)return weatherCache.value;const geo=await getJSON('https://geocoding-api.open-meteo.com/v1/search?count=1&name='+encodeURIComponent(city));const place=geo.results?.[0];if(!place)throw new Error('City not found.');const value=await getJSON(`https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}&current=temperature_2m,weather_code,is_day&daily=temperature_2m_max,temperature_2m_min&timezone=auto`);weatherCache={city,at:Date.now(),value:{city:place.name,...value}};return weatherCache.value;}
    if(op==='lyrics:cancel'){lyricsAbort?.abort();return true;}
    if(op==='lyrics:diagnostics')return lookupLyrics.diagnostics();
    if(op==='lyrics:network-test'){const r=await lookupLyrics.detailed({title:'Hello',artist:'Adele',album:'25',duration:295000,app:'Explicit connection test'});return{outcome:r.outcome,message:r.message,synced:!!r.record?.syncedLyrics};}
    if(op==='lyrics'){lyricsAbort?.abort();lyricsAbort=new AbortController();const controller=lyricsAbort;const song=await native.request('media',{appId:library.view().mediaAppId||''});if(v.expectedApp&&song.app!==v.expectedApp||v.expectedTitle&&song.title!==v.expectedTitle)throw new Error('The selected track changed. Refresh lyrics.');if(!song.available)return{lines:[],plain:'',outcome:'INVALID_METADATA',message:'No active track.'};const found=await lookupLyrics.detailed(song,{signal:controller.signal});return{song,lines:parseLyrics(found.record?.syncedLyrics||''),plain:found.record?.plainLyrics||'',outcome:found.outcome,message:found.message,retryAfter:found.retryAfter};}
    if(op==='screens')return screen.getAllDisplays().map(d=>({id:d.id,label:d.label||`Display ${d.id}`,bounds:d.bounds}));
    if(op==='calendar')return(await calendar.refresh(v.refresh===true)).events;
    throw new Error('Unsupported desktop operation.');
  });
  const timer=setInterval(async()=>{
    const events=legacyLibrary.tick({managedReminders:true});for(const event of events){if(event.kind==='timer')onTransition();productivity.engine.recordEvent(event);}if(events.length)emit('library:changed',library.view());
    if(library.view().clipboardEnabled){try{const safe=await native.request('clipboard.safe',{},1200);if(safe){const value=clipboard.readText();if(value!==lastClip){lastClip=value;library.action('clips:add',{text:value});emit('library:changed',library.view());}}}catch{}}
  },1000);timer.unref();
  const systemTimer=setInterval(async()=>{if(systemPending)return;systemPending=true;try{lastSystem=await native.request('system',{},3000);productivity.setSystem(lastSystem);emit('desktop:system',lastSystem);onSystem(lastSystem);}catch{}finally{systemPending=false;}},3000);systemTimer.unref();
  app.on('before-quit',()=>closeWidgets());
  function closeWidgets(){clearInterval(timer);clearInterval(systemTimer);productivity.close();}
  return{library,productivity,workspace,captures,emit,notify,getSystem:()=>lastSystem,close:closeWidgets};
}
async function getJSON(url){const response=await fetch(url,{signal:AbortSignal.timeout(12000)});if(!response.ok)throw new Error(`Service HTTP ${response.status}`);return response.json();}
const{parseLyrics}=require('./lrc.cjs');
module.exports={setupWidgets,parseLyrics,calendarDate,parseCalendar};
