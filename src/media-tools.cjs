'use strict';
const{spawn,spawnSync}=require('node:child_process'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const VIDEO=new Set(['.mp4','.mov','.mkv','.webm','.avi','.m4v']),AUDIO=new Set(['.mp3','.wav','.m4a','.aac','.flac','.ogg','.opus']);
function findTool(name){
  const explicit=process.env['AGENT_NOTCH_'+name.toUpperCase()];
  if(explicit&&fs.existsSync(explicit))return explicit;
  try{const result=spawnSync('where.exe',[name+'.exe'],{encoding:'utf8',windowsHide:true,timeout:5000});const first=result.stdout?.split(/\r?\n/).map(x=>x.trim()).find(x=>x&&fs.existsSync(x));if(first)return first;}catch{}
  return null;
}
function tools(){return{ffmpeg:findTool('ffmpeg'),ffprobe:findTool('ffprobe')};}
function probe(file){
  if(typeof file!=='string'||!fs.existsSync(file))throw new Error('Choose a media file.');
  const ext=path.extname(file).toLowerCase(),kind=VIDEO.has(ext)?'video':AUDIO.has(ext)?'audio':null;
  if(!kind)return null;
  const{ffprobe}=tools();if(!ffprobe)return{kind,duration:0,width:null,height:null,available:false,message:'FFmpeg is not installed. Install it to trim or convert video and audio.'};
  const result=spawnSync(ffprobe,['-v','error','-print_format','json','-show_format','-show_streams',file],{encoding:'utf8',windowsHide:true,timeout:15000,maxBuffer:4*1024*1024});
  if(result.status!==0)throw new Error('FFmpeg could not read this media file.');
  let data;try{data=JSON.parse(result.stdout);}catch{throw new Error('FFmpeg returned unreadable metadata.');}
  const streams=data.streams||[],video=streams.find(x=>x.codec_type==='video'),audio=streams.find(x=>x.codec_type==='audio');
  return{kind,duration:Number(data.format?.duration)||0,width:video?.width||null,height:video?.height||null,available:true,message:''};
}
function buildArgs({input,output,start=0,end=0,kind='video'}){
  if(!input||!output)throw new Error('Choose input and output files.');
  if(path.resolve(input).toLowerCase()===path.resolve(output).toLowerCase())throw new Error('Choose a new output file; the original is never overwritten.');
  if(!['video','audio'].includes(kind))throw new Error('Unsupported media kind.');
  const begin=Math.max(0,Number(start)||0),finish=Math.max(0,Number(end)||0);
  if(finish&&finish<=begin)throw new Error('End time must be after start time.');
  const args=['-y','-ss',String(begin),'-i',input];
  if(finish)args.push('-t',String(finish-begin));
  if(kind==='video')args.push('-c:v','libx264','-preset','veryfast','-crf','23','-c:a','aac','-b:a','160k','-movflags','+faststart');
  else args.push('-vn','-c:a','libmp3lame','-q:a','2');
  args.push(output);return args;
}
function transcode(options){
  const{ffmpeg}=tools();if(!ffmpeg)return Promise.reject(new Error('FFmpeg is not installed. Install FFmpeg, then try again.'));
  const args=buildArgs(options);
  return new Promise((resolve,reject)=>{const child=spawn(ffmpeg,args,{windowsHide:true,stdio:['ignore','ignore','pipe']});let error='';child.stderr.on('data',d=>{error+=d;if(error.length>12000)error=error.slice(-12000);});child.on('error',reject);child.on('close',code=>code===0?resolve({output:options.output}):reject(new Error('FFmpeg failed: '+(error.trim().split(/\r?\n/).pop()||'unknown error'))));});
}
function stripMetadata(input,output){
  const{ffmpeg}=tools();if(!ffmpeg)return Promise.reject(new Error('FFmpeg is not installed.'));
  if(path.resolve(input).toLowerCase()===path.resolve(output).toLowerCase())throw new Error('Choose a new output file; the original is never overwritten.');
  return new Promise((resolve,reject)=>{const child=spawn(ffmpeg,['-y','-i',input,'-map_metadata','-1','-c','copy',output],{windowsHide:true,stdio:['ignore','ignore','pipe']});let error='';child.stderr.on('data',d=>{error+=d;if(error.length>8000)error=error.slice(-8000);});child.on('error',reject);child.on('close',code=>code===0?resolve({output}):reject(new Error('FFmpeg failed: '+(error.trim().split(/\r?\n/).pop()||'unknown error'))));});
}
function mediaAction({input,output,action,speed=1,time=0}){
  const{ffmpeg}=tools();if(!ffmpeg)return Promise.reject(new Error('FFmpeg is not installed.'));
  if(path.resolve(input).toLowerCase()===path.resolve(output).toLowerCase())throw new Error('Choose a new output file; the original is never overwritten.');
  let args;
  if(action==='mute')args=['-y','-i',input,'-an','-c:v','copy',output];
  else if(action==='snapshot')args=['-y','-ss',String(Math.max(0,Number(time)||0)),'-i',input,'-frames:v','1',output];
  else if(action==='speed'){const factor=Math.max(.25,Math.min(4,Number(speed)||1));args=['-y','-i',input,'-filter:v',`setpts=${(1/factor).toFixed(4)}*PTS`,'-filter:a',`atempo=${factor.toFixed(2)}`,output];}
  else return Promise.reject(new Error('Unsupported media action.'));
  return new Promise((resolve,reject)=>{const child=spawn(ffmpeg,args,{windowsHide:true,stdio:['ignore','ignore','pipe']});let error='';child.stderr.on('data',d=>{error+=d;if(error.length>8000)error=error.slice(-8000);});child.on('error',reject);child.on('close',code=>code===0?resolve({output}):reject(new Error('FFmpeg failed: '+(error.trim().split(/\r?\n/).pop()||'unknown error'))));});
}
function join(inputs,output){
  if(!Array.isArray(inputs)||inputs.length<2)throw new Error('Choose at least two videos to join.');
  const{ffmpeg}=tools();if(!ffmpeg)return Promise.reject(new Error('FFmpeg is not installed.'));
  const list=path.join(os.tmpdir(),`agent-notch-join-${process.pid}-${Date.now()}.txt`);
  fs.writeFileSync(list,inputs.map(file=>`file '${file.replace(/'/g,"'\\''")}'`).join('\n'));
  return new Promise((resolve,reject)=>{const child=spawn(ffmpeg,['-y','-f','concat','-safe','0','-i',list,'-c','copy',output],{windowsHide:true,stdio:['ignore','ignore','pipe']});let error='';child.stderr.on('data',d=>{error+=d;if(error.length>8000)error=error.slice(-8000);});const done=code=>{try{fs.unlinkSync(list);}catch{}code===0?resolve({output}):reject(new Error('FFmpeg failed: '+(error.trim().split(/\r?\n/).pop()||'unknown error')));};child.on('error',reject);child.on('close',done);});
}
function edit({input,output,action='trim',start=0,end=0,crop=null,speed=1,mute=false,volume=1,time=0}){
  const{ffmpeg}=tools();if(!ffmpeg)return Promise.reject(new Error('FFmpeg is not installed.'));
  if(path.resolve(input).toLowerCase()===path.resolve(output).toLowerCase())throw new Error('Choose a new output file; the original is never overwritten.');
  let args;
  if(action==='snapshot')args=['-y','-i',input,'-ss',String(Math.max(0,Number(time)||0)),'-frames:v','1','-update','1',output];
  else{
    const begin=Math.max(0,Number(start)||0),finish=Math.max(0,Number(end)||0),factor=Math.max(.25,Math.min(4,Number(speed)||1));
    args=['-y'];if(finish>begin)args.push('-ss',String(begin),'-t',String(finish-begin));args.push('-i',input);
    const vf=[],af=[];
    if(crop&&Number(crop.width)>0&&Number(crop.height)>0){const w=Math.max(2,Math.floor(Number(crop.width)/2)*2),h=Math.max(2,Math.floor(Number(crop.height)/2)*2),x=Math.max(0,Math.floor(Number(crop.x)||0)),y=Math.max(0,Math.floor(Number(crop.y)||0));vf.push(`crop=${w}:${h}:${x}:${y}`);}
    if(factor!==1){vf.push(`setpts=${(1/factor).toFixed(4)}*PTS`);let rest=factor;while(rest>2){af.push('atempo=2.00');rest/=2;}while(rest<.5){af.push('atempo=0.50');rest/=.5;}af.push(`atempo=${rest.toFixed(2)}`);}
    if(vf.length)args.push('-vf',vf.join(','));
    if(af.length)args.push('-af',af.join(','));
    if(mute)args.push('-an');else{const v=Math.max(0,Math.min(1,Number(volume)||1));if(v!==1)af.push(`volume=${v.toFixed(3)}`);if(af.length)args.push('-af',af.join(','));args.push('-c:a','aac','-b:a','160k');}
    args.push('-c:v','libx264','-preset','veryfast','-crf','23','-movflags','+faststart',output);
  }
  return new Promise((resolve,reject)=>{const child=spawn(ffmpeg,args,{windowsHide:true,stdio:['ignore','ignore','pipe']});let error='';child.stderr.on('data',d=>{error+=d;if(error.length>8000)error=error.slice(-8000);});child.on('error',reject);child.on('close',code=>code===0?resolve({output}):reject(new Error('FFmpeg failed: '+(error.trim().split(/\r?\n/).pop()||'unknown error'))));});
}
async function frames(input,count=10){
  const{ffmpeg,ffprobe}=tools();if(!ffmpeg||!ffprobe)return[];
  const meta=probe(input);const duration=meta?.duration||0;if(!duration)return[];
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'agent-notch-frames-'));
  try{const rate=Math.max(.1,Math.min(2,count/duration));await new Promise((resolve,reject)=>{const child=spawn(ffmpeg,['-y','-i',input,'-vf',`fps=${rate.toFixed(4)},scale=180:-2`,'-q:v','4',path.join(dir,'thumb-%03d.jpg')],{windowsHide:true,stdio:'ignore'});child.on('error',reject);child.on('close',code=>code===0?resolve():reject(new Error('FFmpeg could not create the filmstrip.')));});return fs.readdirSync(dir).filter(x=>x.endsWith('.jpg')).sort().map(name=>'data:image/jpeg;base64,'+fs.readFileSync(path.join(dir,name)).toString('base64'));}finally{try{fs.rmSync(dir,{recursive:true,force:true});}catch{}}
}
module.exports={probe,buildArgs,transcode,stripMetadata,mediaAction,join,edit,frames,tools};
