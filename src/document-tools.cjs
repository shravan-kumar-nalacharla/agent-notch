'use strict';
const{spawnSync}=require('node:child_process'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const DOCUMENTS=new Set(['.docx','.doc','.odt','.rtf','.txt','.pptx','.xlsx','.csv']);
function findSoffice(){
  const explicit=process.env.AGENT_NOTCH_SOFFICE;if(explicit&&fs.existsSync(explicit))return explicit;
  const candidates=[path.join(process.env.ProgramFiles||'','LibreOffice','program','soffice.exe'),path.join(process.env['ProgramFiles(x86)']||'','LibreOffice','program','soffice.exe')];
  for(const candidate of candidates)if(fs.existsSync(candidate))return candidate;
  try{const r=spawnSync('where.exe',['soffice.exe'],{encoding:'utf8',windowsHide:true,timeout:5000});return r.stdout?.split(/\r?\n/).map(x=>x.trim()).find(x=>x&&fs.existsSync(x))||null;}catch{return null;}
}
function probe(file){
  if(typeof file!=='string'||!fs.existsSync(file))throw new Error('Choose a document.');
  const ext=path.extname(file).toLowerCase();if(!DOCUMENTS.has(ext))return null;
  const soffice=findSoffice();
  return{kind:'document',format:ext.slice(1),available:!!soffice,message:soffice?'':'LibreOffice is not installed. Install it to convert documents to PDF.'};
}
function convert({input,output}){
  if(!DOCUMENTS.has(path.extname(input).toLowerCase()))throw new Error('This document type is not supported.');
  if(path.resolve(input).toLowerCase()===path.resolve(output).toLowerCase())throw new Error('Choose a new output file; the original is never overwritten.');
  const soffice=findSoffice();if(!soffice)throw new Error('LibreOffice is not installed. Install it, then try again.');
  const work=fs.mkdtempSync(path.join(os.tmpdir(),'agent-notch-doc-')),profile=path.join(work,'profile');
  try{
    const result=spawnSync(soffice,['--headless','--norestore',`-env:UserInstallation=file:///${profile.replace(/\\/g,'/')}`,'--convert-to','pdf','--outdir',work,input],{windowsHide:true,timeout:90000,maxBuffer:4*1024*1024});
    if(result.status!==0)throw new Error('LibreOffice could not convert this document.');
    const produced=path.join(work,path.basename(input,path.extname(input))+'.pdf');
    if(!fs.existsSync(produced))throw new Error('LibreOffice did not produce a PDF.');
    fs.copyFileSync(produced,output);return{output};
  }finally{try{fs.rmSync(work,{recursive:true,force:true});}catch{}}
}
module.exports={probe,convert,findSoffice};
