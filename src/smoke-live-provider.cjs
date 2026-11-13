'use strict';
module.exports=async({app,out})=>{
 const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{safeStorage}=require('electron'),sarvam=require('./sarvam.cjs'),providers=require('./providers.cjs');
 const saved=JSON.parse(fs.readFileSync(path.join(app.getPath('appData'),'agent-notch','settings.json'),'utf8'));
 if(!saved.keys?.sarvam)throw Error('No saved Sarvam key is available for this check.');
 const decrypted=await safeStorage.decryptStringAsync(Buffer.from(saved.keys.sarvam,'base64')),key=decrypted.result;
 if(!key)throw Error('The saved Sarvam key could not be unlocked for this check.');
 const checks=[];let audio;
 const answer=await providers.chat({provider:'sarvam',key,model:saved.models?.sarvam?.chat,text:'Reply with the single word Hello.',system:'This is a brief connection test.'});assert.ok(answer.trim());checks.push('Saved Sarvam key produced a real chat response');
 audio=await sarvam.synthesize({key,text:'Hello. What is a rainbow?',language:'en',voice:'priya'});assert.equal(audio.mime,'audio/wav');checks.push('Sarvam Bulbul generated valid speech audio');
 const transcript=await sarvam.transcribe({key,model:sarvam.STT_MODEL,audio:Buffer.from(audio.audio,'base64'),mime:'audio/wav',language:'en',detailed:true});assert.ok(transcript.text.length>0);checks.push('Sarvam Saaras recognized the generated test audio');
 fs.writeFileSync(path.join(out,'live-provider-verification.json'),JSON.stringify({version:app.getVersion(),checks,audioBytes:Buffer.from(audio.audio,'base64').length,transcriptCharacters:transcript.text.length,microphoneCapture:false},null,2));console.log('LIVE PROVIDER PASS',checks.length);
};
