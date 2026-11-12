'use strict';
const{contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('regionCapture',{onImage:fn=>ipcRenderer.on('region:image',(_,v)=>fn(v)),finish:region=>ipcRenderer.send('region:finish',region)});
