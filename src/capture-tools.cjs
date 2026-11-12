'use strict';
const fs=require('node:fs/promises'),path=require('node:path'),{randomUUID}=require('node:crypto');
function validCrop(v,width,height){if(!v||!['x','y','width','height'].every(k=>Number.isInteger(v[k]))||v.x<0||v.y<0||v.width<1||v.height<1||v.x+v.width>width||v.y+v.height>height)throw new Error('Choose a region within the captured image.');return{x:v.x,y:v.y,width:v.width,height:v.height};}
function createCaptureTools({app,native,nativeImage,BrowserWindow,dialog,clipboard,library,screen,canRestore=()=>true,now=Date.now}){
 let current,busy=false,overlay,generation=0;
 async function selectRegion(value){const{ipcMain}=require('electron'),bounds=screen.screenToDipRect(null,{x:value.x,y:value.y,width:value.width,height:value.height});return new Promise((resolve,reject)=>{const chooser=new BrowserWindow({...bounds,frame:false,skipTaskbar:true,show:false,resizable:false,webPreferences:{preload:path.join(__dirname,'region-preload.cjs'),sandbox:true,contextIsolation:true,nodeIntegration:false}});overlay=chooser;let chosen=null;const finish=(event,region)=>{if(event.sender!==chooser.webContents||event.senderFrame!==chooser.webContents.mainFrame)return;try{chosen=region===null?null:validCrop(region,value.width,value.height);chooser.close();}catch{}};ipcMain.on('region:finish',finish);chooser.once('closed',()=>{ipcMain.removeListener('region:finish',finish);if(overlay===chooser)overlay=null;resolve(chosen);});chooser.setAlwaysOnTop(true,'screen-saver');chooser.loadFile(path.join(__dirname,'region-select.html')).then(()=>{chooser.webContents.send('region:image',value);chooser.show();chooser.focus();},error=>{chooser.close();reject(error);});});}

 function get(id){if(!current||id!==current.id||now()-current.at>600000)throw new Error('Capture expired. Take another screenshot.');return current;}
 const view=()=>current&&({id:current.id,image:current.image.toDataURL(),width:current.width,height:current.height,items:current.items,localOnly:true});
 return{get capturing(){return busy;},async action(op,v={}){
  if(op==='capture:sources')return native.request('capture.sources');
  if(op==='capture:clear'){if(current?.id===v.id){current=null;if(overlay&&!overlay.isDestroyed())overlay.close();overlay=null;}return true;}
  if(op==='capture:take'||op==='ocr:take'||op==='ocr:region'){
   if(busy)throw new Error('A capture is already in progress.');busy=true;const epoch=generation,windows=BrowserWindow.getAllWindows().filter(w=>!w.isDestroyed()&&w.isVisible());
   try{for(const w of windows)w.hide();await new Promise(r=>setTimeout(r,180));let value;if(op==='ocr:region'){const preview=await native.request('capture.desktop',{source:v.source},45000);const region=await selectRegion(preview);if(!region)return null;if(generation!==epoch)throw Error('Capture cancelled.');await new Promise(r=>setTimeout(r,100));value=await native.request('ocr.local',{source:v.source,region},45000);}else value=await native.request(op==='ocr:take'?'ocr.local':'capture.desktop',{source:v.source},45000);if(generation!==epoch)throw new Error('Capture was cancelled because the session closed or locked.');const image=nativeImage.createFromDataURL(value.image);if(image.isEmpty()||value.width*value.height>64000000)throw new Error('Windows returned an invalid capture.');current={id:randomUUID(),at:now(),image,width:value.width,height:value.height,x:value.x,y:value.y,items:value.items||[]};if(op==='ocr:region'){const text=current.items.map(item=>item.text).join('\n');if(text)await clipboard.writeText(text);}return view();}finally{try{if(canRestore())for(const w of windows)if(!w.isDestroyed())w.showInactive();}finally{busy=false;}}
  }
  const capture=get(v.id);
  if(op==='capture:crop'){const crop=validCrop(v.region,capture.width,capture.height);capture.image=capture.image.crop(crop);capture.x+=crop.x;capture.y+=crop.y;capture.width=crop.width;capture.height=crop.height;capture.items=[];return view();}
  if(op==='capture:copy'){await require('./clipboard-images.cjs').writeImage(clipboard,capture.image);return true;}
  if(op==='capture:save'||op==='capture:shelf'){const r=await dialog.showSaveDialog({defaultPath:path.join(app.getPath('pictures'),'Agent Notch '+new Date(now()).toISOString().replace(/[:.]/g,'-')+'.png'),filters:[{name:'PNG image',extensions:['png']}]});if(r.canceled)return false;await fs.writeFile(r.filePath,capture.image.toPNG());if(op==='capture:shelf')library.action('shelf:add',{paths:[r.filePath]});return true;}
  if(op==='ocr:copy'){await clipboard.writeText(capture.items.map(i=>i.text).join('\n'));return true;}
  if(op==='ocr:highlight'){
   const target=capture.items[v.index];if(!Number.isInteger(v.index)||!target)throw new Error('Select a text result.');if(now()-capture.at>90000)throw new Error('Refresh screen text before highlighting.');
   const physical={x:Math.round(capture.x+target.x),y:Math.round(capture.y+target.y),width:Math.max(4,Math.round(target.width)),height:Math.max(4,Math.round(target.height))},bounds=screen.screenToDipRect(null,physical);
   overlay?.close();overlay=new BrowserWindow({...bounds,frame:false,transparent:true,focusable:false,skipTaskbar:true,show:false,webPreferences:{sandbox:true,contextIsolation:true,nodeIntegration:false}});const shown=overlay;shown.setAlwaysOnTop(true,'screen-saver');shown.setIgnoreMouseEvents(true);await shown.loadFile(path.join(__dirname,'highlight.html'),{query:{label:target.text.slice(0,80)}});if(!shown.isDestroyed())shown.showInactive();setTimeout(()=>{if(!shown.isDestroyed())shown.close();},2500).unref();return true;
  }
  throw new Error('Unsupported capture action.');
 },close(){generation++;current=null;if(overlay&&!overlay.isDestroyed())overlay.close();}};
}
module.exports={createCaptureTools,validCrop};
