'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
if(!process.versions.electron){
 const {spawnSync}=require('node:child_process'),profile=fs.mkdtempSync(path.join(os.tmpdir(),'notch-privacy-restart-'));
 fs.writeFileSync(path.join(profile,'settings.json'),JSON.stringify({speak:false,quietMoments:{enabled:false,frequencyMigration:true}}));
 try{
  for(const phase of ['save','restart']){
   const result=spawnSync(require('electron'),[__filename],{windowsHide:true,encoding:'utf8',timeout:45000,env:{...process.env,NOTCH_PRIVACY_RESTART_PROFILE:profile,NOTCH_PRIVACY_RESTART_PHASE:phase}});
   if(result.status!==0)throw new Error([phase,result.error?.message,result.stderr,result.stdout].filter(Boolean).join('\n'));
  }
  const out=path.resolve(__dirname,'../artifacts/0.13.0');fs.mkdirSync(out,{recursive:true});
  fs.writeFileSync(path.join(out,'privacy-restart.json'),JSON.stringify({windows:os.release(),checks:['Two separate Electron app processes use the same temporary profile','Muted state and push-to-talk selection survive actual app restart','Restarted muted app refuses microphone activation','Timers remain available after restarting muted'],userProfileModified:false},null,2));
  console.log('PRIVACY RESTART PASS');
 }finally{assert.ok(path.resolve(profile).startsWith(path.resolve(os.tmpdir())+path.sep));fs.rmSync(profile,{recursive:true,force:true});}
}else{
 const {app}=require('electron'),profile=process.env.NOTCH_PRIVACY_RESTART_PROFILE;
 assert.ok(profile&&path.resolve(profile).startsWith(path.resolve(os.tmpdir(),'notch-privacy-restart-')));
 app.disableHardwareAcceleration();app.setPath('userData',profile);
 app.once('browser-window-created',(_,win)=>win.webContents.once('did-finish-load',async()=>{
  const js=code=>win.webContents.executeJavaScript(code),sleep=ms=>new Promise(r=>setTimeout(r,ms));
  try{
   for(let i=0;i<100;i++){if(await js('window.island.microphoneState().then(r=>r.ok&&!r.value.blocked||r.ok&&r.value.muted)'))break;await sleep(100);}
   if(process.env.NOTCH_PRIVACY_RESTART_PHASE==='save'){
    const reply=await js("window.island.microphone({muted:true,mode:'ptt'})");assert.equal(reply.ok,true,reply.error);
    assert.equal(JSON.parse(fs.readFileSync(path.join(profile,'settings.json'),'utf8')).microphone.muted,true);
   }else{
    const reply=await js('window.island.get()');assert.equal(reply.value.microphone.muted,true);assert.equal(reply.value.microphone.mode,'ptt');
    assert.equal((await js('window.island.microphoneState()')).value.blocked,true);
    assert.equal((await js("window.island.nativeVoice('start',{kind:'chat'})")).ok,false);
    assert.equal((await js("window.island.library('timer:start',{seconds:60,kind:'timer'})")).ok,true);
   }
   console.log('RESTART SESSION PASS',process.env.NOTCH_PRIVACY_RESTART_PHASE);app.quit();
  }catch(error){console.error(error);app.exit(1);}
 }));
 require('../src/main.cjs');
}
