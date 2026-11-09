'use strict';
const{spawn}=require('node:child_process'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
function findWhisper(){
  const explicit=process.env.AGENT_NOTCH_WHISPER;if(explicit&&fs.existsSync(explicit))return explicit;
  const local=process.env.LOCALAPPDATA||'',candidates=[];
  try{for(const entry of fs.readdirSync(path.join(local,'Python')))candidates.push(path.join(local,'Python',entry,'Scripts','whisper.exe'));}catch{}
  candidates.push(path.join(local,'Programs','Python','Python311','Scripts','whisper.exe'),path.join(local,'Programs','Python','Python312','Scripts','whisper.exe'));
  for(const candidate of candidates)if(fs.existsSync(candidate))return candidate;
  try{const{spawnSync}=require('node:child_process');const r=spawnSync('where.exe',['whisper.exe'],{encoding:'utf8',windowsHide:true,timeout:5000});return r.stdout?.split(/\r?\n/).map(x=>x.trim()).find(x=>x&&fs.existsSync(x))||null;}catch{return null;}
}
function available(){const whisper=findWhisper();return{available:!!whisper,path:whisper,model:'base.en',offline:true};}
function transcribe(audio){
  const whisper=findWhisper();if(!whisper)return Promise.reject(new Error('Whisper CLI is not installed. Install openai-whisper or use Local (Windows).'));
  if(typeof audio!=='string'||!audio)return Promise.reject(new Error('No audio was provided.'));
  let bytes;try{bytes=Buffer.from(audio,'base64');}catch{return Promise.reject(new Error('Audio is not valid base64.'));}
  if(bytes.length<100||bytes.length>8_000_000)return Promise.reject(new Error('Recording must be between 100 bytes and 8 MB.'));
  const work=fs.mkdtempSync(path.join(os.tmpdir(),'agent-notch-whisper-')),file=path.join(work,'audio.wav'),out=path.join(work,'out');
  fs.writeFileSync(file,bytes);fs.mkdirSync(out);
  return new Promise((resolve,reject)=>{
    const child=spawn(whisper,[file,'--model','base.en','--output_format','txt','--output_dir',out,'--fp16','False','--language','en'],{windowsHide:true,stdio:['ignore','ignore','pipe']});
    let error='';const timer=setTimeout(()=>{child.kill();reject(new Error('Whisper timed out.'));},180000);
    child.stderr.on('data',d=>{error+=d;if(error.length>8000)error=error.slice(-8000);});
    child.on('error',e=>{clearTimeout(timer);reject(e);});
    child.on('close',code=>{clearTimeout(timer);try{if(code!==0)throw new Error('Whisper failed: '+(error.trim().split(/\r?\n/).pop()||'unknown error'));const textFile=path.join(out,'audio.txt');if(!fs.existsSync(textFile))throw new Error('Whisper produced no transcript.');const text=fs.readFileSync(textFile,'utf8').trim();if(!text)throw new Error('No speech was recognized.');resolve({text,engine:'Whisper base.en',offline:true});}catch(e){reject(e);}finally{try{fs.rmSync(work,{recursive:true,force:true});}catch{}}});
  });
}
module.exports={available,transcribe,findWhisper};
