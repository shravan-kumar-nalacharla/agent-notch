'use strict';
const path=require('node:path'),fs=require('node:fs'),{createHash}=require('node:crypto');
function createIconResolver({app,shell,nativeImage,cacheDir}){
  const memory=new Map();
  if(cacheDir)fs.mkdirSync(cacheDir,{recursive:true});
  function typeFor(file){let stat;try{stat=fs.statSync(file);}catch{return'file';}if(stat.isDirectory())return'folder';const ext=path.extname(file).toLowerCase();if(['.exe','.com','.appref-ms'].includes(ext))return'application';if(ext==='.lnk')return'shortcut';if(['.png','.jpg','.jpeg','.webp','.gif','.bmp','.ico','.avif'].includes(ext))return'image';if(['.mp4','.mov','.mkv','.webm','.avi','.m4v'].includes(ext))return'video';if(['.mp3','.wav','.m4a','.aac','.flac','.ogg','.opus'].includes(ext))return'audio';if(['.pdf','.doc','.docx','.xls','.xlsx','.ppt','.pptx','.txt','.md','.rtf','.csv'].includes(ext))return'document';return'file';}
  function shortcutTarget(file){try{const detail=shell.readShortcutLink(file);const declared=typeof detail.icon==='string'?detail.icon.replace(/,\s*-?\d+$/,''):'';const candidates=[declared,detail.target].filter(Boolean);for(const candidate of candidates){try{if(fs.existsSync(candidate))return{source:candidate,target:detail.target||''};}catch{}}return{target:detail.target||''};}catch{return{};}}
  async function extract(source,file,type){
    try{
      if(type==='image'&&nativeImage?.createThumbnailFromPath){const image=await nativeImage.createThumbnailFromPath(file,{width:64,height:64});if(image&&!image.isEmpty())return{image,kind:'thumbnail'};}
      if(type==='video'&&nativeImage?.createThumbnailFromPath){const image=await nativeImage.createThumbnailFromPath(file,{width:64,height:64});if(image&&!image.isEmpty())return{image,kind:'thumbnail'};}
      if(path.extname(source).toLowerCase()==='.ico'){const image=nativeImage.createFromPath(source);if(image&&!image.isEmpty())return{image,kind:'icon'};}
      const image=await app.getFileIcon(source,{size:'large'});if(image&&!image.isEmpty())return{image,kind:'shell'};
    }catch{}
    return null;
  }
  async function resolve(file){
    if(typeof file!=='string'||!fs.existsSync(file))return{path:file,name:path.basename(String(file||'')),type:'missing',icon:'',cachePath:null};
    let stat;try{stat=fs.statSync(file);}catch{return{path:file,name:path.basename(file),type:'missing',icon:'',cachePath:null};}
    const type=typeFor(file),detail=type==='shortcut'?shortcutTarget(file):{},source=detail.source||file;
    let sourceStat=stat;try{sourceStat=fs.statSync(source);}catch{}
    const key=createHash('sha256').update(`${source}|${sourceStat.mtimeMs||0}|${sourceStat.size||0}|${type}`).digest('hex');
    const cachedPath=cacheDir?path.join(cacheDir,key+'.png'):null;
    if(memory.has(key))return{...memory.get(key),cachePath:cachedPath};
    if(cachedPath&&fs.existsSync(cachedPath)){try{const icon='data:image/png;base64,'+fs.readFileSync(cachedPath).toString('base64');const value={path:file,name:path.basename(file),type,icon,cachePath:cachedPath,source:source===file?null:source,kind:'cache',size:stat.isDirectory()?0:stat.size};memory.set(key,value);return value;}catch{}}
    const found=await extract(source,type==='shortcut'?source:file,type);
    let icon='',cachePath=null;
    if(found?.image){try{const png=found.image.toPNG();cachePath=cacheDir?path.join(cacheDir,key+'.png'):null;if(cachePath)fs.writeFileSync(cachePath,png);icon='data:image/png;base64,'+png.toString('base64');}catch{}}
    const value={path:file,name:path.basename(file),type,icon,cachePath,source:source===file?null:source,kind:found?.kind||'',size:stat.isDirectory()?0:stat.size};
    memory.set(key,value);return value;
  }
  return{resolve,typeFor,clear(){memory.clear();}};
}
module.exports={createIconResolver};
