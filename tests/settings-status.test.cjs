'use strict';
const{test}=require('node:test'),assert=require('node:assert/strict'),{voiceStatus,loginOptions,setStartup,shouldHideFullscreen}=require('../src/settings-status.cjs');
test('missing consent and keys explain inactive voice without changing the saved checkbox',()=>{
 const state={voice:{enabled:true},languages:{cloudAudioConsent:false},speech:'groq'};
 assert.equal(voiceStatus(state,()=>true).needs,'consent');assert.equal(state.voice.enabled,true);
 state.languages.cloudAudioConsent=true;assert.equal(voiceStatus(state,()=>false).needs,'key');assert.equal(state.voice.enabled,true);assert.equal(voiceStatus(state,()=>true).ready,true);
});
test('startup uses matching executable and arguments for registration and readback',()=>{
 for(const packaged of [true,false]){let registered,queried;const app={isPackaged:packaged,getAppPath:()=>'/app with spaces',setLoginItemSettings:value=>registered=value,getLoginItemSettings:value=>{queried=value;return{openAtLogin:registered.openAtLogin};}};assert.equal(setStartup(app,true).openAtLogin,true);assert.deepEqual(queried,loginOptions(app));assert.deepEqual(registered.args,packaged?[]:['/app with spaces']);assert.equal(registered.path,'"'+process.execPath+'"');assert.equal(registered.name,'app.agentnotch.desktop');assert.equal(setStartup(app,false).openAtLogin,false);}
});
test('screenshot overlays do not trigger fullscreen hiding while games still do',()=>{
 assert.equal(shouldHideFullscreen({hideFullscreen:true},{fullscreen:true,captureOverlay:true}),false);assert.equal(shouldHideFullscreen({hideFullscreen:true},{fullscreen:true,captureOverlay:false}),true);assert.equal(shouldHideFullscreen({hideFullscreen:false},{fullscreen:true}),false);
});
test('startup registration failure cannot be reported as successful',()=>{
 const app={isPackaged:true,setLoginItemSettings(){},getLoginItemSettings:()=>({openAtLogin:false,executableWillLaunchAtLogin:false})};assert.throws(()=>setStartup(app,true),/did not confirm/);
});
