'use strict';
const{contextBridge,ipcRenderer,webUtils}=require('electron');
const invoke=(name,value)=>ipcRenderer.invoke(name,value);
contextBridge.exposeInMainWorld('studio',{
  inspect:paths=>invoke('studio:inspect',{paths}),
  metadata:options=>invoke('studio:metadata',options),
  choose:()=>invoke('studio:choose'),\n  frames:path=>invoke('studio:frames',{path}),
  onAdd:callback=>ipcRenderer.on('studio:add',(_event,paths)=>callback(paths)),
  filePath:file=>{try{return webUtils.getPathForFile(file);}catch{return'';}},
  image:options=>invoke('studio:image',options),
  media:options=>invoke('studio:media',options),
  pdfRead:path=>invoke('studio:pdfRead',{path}),
  pdfSave:options=>invoke('studio:pdfSave',options),
  pdfMerge:options=>invoke('studio:pdfMerge',options),
  writeImages:options=>invoke('studio:writeImages',options),
  openExternal:path=>invoke('studio:openExternal',{path})
});

