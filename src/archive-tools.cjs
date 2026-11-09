'use strict';
const fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process');
const EXTS=new Set(['.zip','.tar','.gz','.tgz']);
function kind(file){const ext=path.extname(String(file||'')).toLowerCase();return EXTS.has(ext)?ext:null;}
function safeDir(root,relative){
  const target=path.resolve(root,relative),base=path.resolve(root);
  if(target!==base&&!target.startsWith(base+path.sep))throw new Error('Archive contains an unsafe path.');
  return target;
}
async function probe(file){
  const ext=kind(file);if(!ext)return null;
  if(!fs.existsSync(file))throw new Error('Archive not found.');
  let entries=0;
  try{
    if(ext==='.zip'){const{Open}=require('unzipper'),dir=await Open.file(file);entries=dir.files.length;}
    else{const listed=execFileSync('tar.exe',['-tf',file],{encoding:'utf8',windowsHide:true,timeout:15000,maxBuffer:4*1024*1024});entries=listed.split(/\r?\n/).filter(Boolean).length;}
  }catch{return{kind:'archive',format:ext.slice(1),entries:0,available:false,message:'This archive is unreadable or uses an unsupported compression method.'};}
  return{kind:'archive',format:ext.slice(1),entries,available:true,message:''};
}
async function extract(file,outputDir){
  const ext=kind(file);if(!ext)throw new Error('Choose a ZIP, TAR, GZ or TGZ archive.');
  fs.mkdirSync(outputDir,{recursive:true});let total=0,count=0;
  if(ext==='.zip'){
    const{Open}=require('unzipper'),dir=await Open.file(file);
    for(const entry of dir.files){
      const name=entry.path.replace(/\\/g,'/');if(name.includes('\0')||name.split('/').some(part=>part==='..'))throw new Error('Archive contains an unsafe path.');
      const target=safeDir(outputDir,name);
      if(entry.type==='Directory'){fs.mkdirSync(target,{recursive:true});continue;}
      total+=entry.uncompressedSize||0;if(++count>10000||total>2*1024*1024*1024)throw new Error('Archive expands beyond the 2 GB / 10,000-entry limit.');
      fs.mkdirSync(path.dirname(target),{recursive:true});
      await new Promise((resolve,reject)=>{const input=entry.stream(),out=fs.createWriteStream(target);input.on('error',reject);out.on('error',reject);out.on('finish',resolve);input.pipe(out);});
    }
  }else{
    const listed=execFileSync('tar.exe',['-tf',file],{encoding:'utf8',windowsHide:true,timeout:15000,maxBuffer:8*1024*1024}).split(/\r?\n/).filter(Boolean);
    for(const name of listed){if(name.includes('\0')||name.split('/').some(part=>part==='..'))throw new Error('Archive contains an unsafe path.');}
    execFileSync('tar.exe',['-xf',file,'-C',outputDir],{windowsHide:true,timeout:120000,maxBuffer:4*1024*1024});count=listed.length;
  }
  return{outputDir,entries:count};
}
module.exports={probe,extract,kind};
