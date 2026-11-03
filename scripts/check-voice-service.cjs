'use strict';
const{app,safeStorage}=require('electron'),fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
const out='F:\\AgentNotch-builds\\0.6.0\\evidence';fs.mkdirSync(out,{recursive:true});
app.setPath('userData',path.join(app.getPath('appData'),'agent-notch'));app.setName('agent-notch');
app.whenReady().then(async()=>{
  const result={provider:'Groq Orpheus',voice:'hannah',text:'Hey Cutie.',microphoneUsed:false};
  try{
    const file=path.join(app.getPath('appData'),'agent-notch','settings.json'),state=JSON.parse(fs.readFileSync(file,'utf8'));
    if(!state.keys?.groq){result.status='NOT_TESTED';result.reason='No saved Groq key';}
    else{
      const key=safeStorage.decryptString(Buffer.from(state.keys.groq,'base64'));const value=await require('../src/speech.cjs').synthesize({text:result.text,key,voice:'hannah'});fs.writeFileSync(path.join(out,'wake-phrase.wav'),Buffer.from(value.audio,'base64'));
      const convert=spawnSync('ffmpeg',['-hide_banner','-loglevel','error','-i',path.join(out,'wake-phrase.wav'),'-ar','16000','-ac','1','-c:a','pcm_s16le','-y',path.join(out,'wake-phrase-16k.wav')],{windowsHide:true});if(convert.status!==0)throw new Error('Synthetic wake sample conversion failed');
      result.status='PASS';result.bytes=Buffer.from(value.audio,'base64').length;
    }
  }catch(e){result.status='FAILED';result.reason=e.message;}
  fs.writeFileSync(path.join(out,'live-voice-service.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));app.exit(result.status==='FAILED'?1:0);
});
