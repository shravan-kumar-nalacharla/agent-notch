'use strict';
function voiceStatus(state,hasKey){
 if(!state.voice?.enabled)return{ready:false,active:false,message:'Global voice hotkey is off.'};
 if(!state.languages?.cloudAudioConsent)return{ready:false,active:false,needs:'consent',message:'Hotkey preference saved. Allow cloud audio in Voice typing to activate it.'};
 if(!hasKey(state.speech))return{ready:false,active:false,needs:'key',message:`Hotkey preference saved. Save a working ${state.speech} transcription API key in AI & API keys to activate it.`};
 return{ready:true,active:false,message:'Starting the global voice hotkey…'};
}
// Windows readback parses this path as a command line, including spaces in Agent Notch.exe.
function loginOptions(app){return{path:'"'+process.execPath+'"',args:app.isPackaged?[]:[app.getAppPath()]};}
function setStartup(app,enabled){const options=loginOptions(app);app.setLoginItemSettings({...options,name:'app.agentnotch.desktop',enabled,openAtLogin:enabled});const status=app.getLoginItemSettings(options);if(enabled&&(!status.openAtLogin||status.executableWillLaunchAtLogin===false))throw new Error('Windows did not confirm startup registration.');return status;}
function shouldHideFullscreen(appearance,system){return !!appearance.hideFullscreen&&!!system.fullscreen&&!system.captureOverlay;}
module.exports={voiceStatus,loginOptions,setStartup,shouldHideFullscreen};
