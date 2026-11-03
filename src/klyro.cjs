'use strict';
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const {vision}=require('./providers.cjs');
const root = path.resolve(__dirname, '..', 'research', 'Klyro');
function parseWorkerOutput(text) {
  const objects = text.split(/\r?\n/).flatMap(line => { try { return [JSON.parse(line)]; } catch { return []; } });
  const result = objects.findLast(item => item && typeof item === 'object' && !['status','observation'].includes(item.type));
  if (!result) throw new Error('Klyro returned no result. Check its Python dependencies.');
  if (result.error) throw new Error(String(result.error));
  return result;
}
function locations(resources=process.resourcesPath){
 const packaged=resources&&path.join(resources,'klyro');
 if(packaged&&fs.existsSync(path.join(packaged,'worker.py')))return{root:path.join(packaged,'source'),script:path.join(packaged,'worker.py'),python:path.join(packaged,'python','python.exe')};
 const portable=path.join(__dirname,'..','tools','klyro-runtime','python.exe');
 return{root,script:path.join(__dirname,'..','native','klyro_worker.py'),python:fs.existsSync(portable)?portable:path.join(root,'.venv','Scripts','python.exe')};
}
function runWorker(payload,{onObservation,paths=locations(),spawnProcess=spawn}={}){
 for(const name of ['root','script','python'])if(!fs.existsSync(paths[name]))return Promise.reject(new Error('The screen engine is missing. Build the Klyro runtime first.'));
 return new Promise((resolve,reject)=>{
  const env={...process.env,PYTHONUTF8:'1',PYTHONDONTWRITEBYTECODE:'1'};for(const name of Object.keys(env))if(/API_KEY|TOKEN|SECRET/i.test(name)||['PYTHONHOME','PYTHONPATH'].includes(name))delete env[name];
  const child=spawnProcess(paths.python,['-u',paths.script,paths.root],{cwd:paths.root,windowsHide:true,shell:false,env,stdio:['pipe','pipe','pipe']});
  let buffer='',bytes=0,result,observed=false,settled=false;
  const timer=setTimeout(()=>finish(new Error('Screen analysis timed out.')),120000);
  function finish(error,value){if(settled)return;settled=true;clearTimeout(timer);if(error)child.kill();error?reject(error):resolve(value);}
  function receive(message){
   if(message.type==='status')return;
   if(message.type==='observation'){
    if(observed||!onObservation){finish(new Error('Unexpected screen observation.'));return;}observed=true;
    Promise.resolve().then(()=>onObservation(message)).then(answer=>{if(!settled)child.stdin.end(JSON.stringify(answer)+'\n');}).catch(finish);return;
   }
   if(message.error)finish(new Error(String(message.error)));else result=message;
  }
  child.stdout.setEncoding('utf8');child.stdout.on('data',chunk=>{bytes+=Buffer.byteLength(chunk);if(bytes>16*1024*1024)return finish(new Error('Screen response exceeded its limit.'));buffer+=chunk;let at;while((at=buffer.indexOf('\n'))>=0){const line=buffer.slice(0,at);buffer=buffer.slice(at+1);if(!line.trim())continue;try{receive(JSON.parse(line));}catch{finish(new Error('Screen engine returned invalid JSON.'));}}});
  child.stderr.on('data',()=>{});child.stdin.on('error',()=>{});child.on('error',()=>finish(new Error('The screen engine could not start.')));
  child.on('close',code=>{if(settled)return;if(code!==0)return finish(new Error('The screen engine stopped unexpectedly.'));if(!result)return finish(new Error('The screen engine returned no guidance.'));finish(null,result);});
  child.stdin.write(JSON.stringify(payload)+'\n');if(!onObservation)child.stdin.end();
 });
}
function guide(question,provider,apiKey,models={},options={}){
 if(typeof question!=='string'||!question.trim()||question.length>4000)return Promise.reject(new Error('Enter a screen question of up to 4,000 characters.'));
 return runWorker({question},{onObservation:observation=>{options.onCaptured?.();return vision({provider,key:apiKey,model:models.vision,prompt:observation.prompt,image:observation.image});}});
}
const probe=()=>runWorker({action:'probe'});
module.exports={guide,probe,locations,runWorker,parseWorkerOutput};
