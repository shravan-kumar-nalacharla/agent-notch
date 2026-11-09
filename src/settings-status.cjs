'use strict';
function pushToTalkStatus(state,hasKey){const provider=state.companion?.chatEngine==='sarvam'?'sarvam':state.speech,base={ready:false,active:false,provider};if(!['ptt','always'].includes(state.microphone?.mode))return{...base,needs:'mode',message:'Push-to-talk is off. Select Push-to-Talk in Listening mode and save.'};if(state.companion?.chatEngine==='gemini_live')return{...base,needs:'engine',message:'For push-to-talk choose Sarvam or Standard conversation. Gemini Live uses manual conversation activation.'};if(provider==='local')return{...base,ready:true,message:`Hold ${state.microphone.pttShortcut} while asking; release for local Windows transcription.`};if(!state.languages?.cloudAudioConsent)return{...base,needs:'consent',message:'Allow cloud audio in Voice & typing, then save.'};if(!hasKey(provider))return{...base,needs:'key',message:`Save your ${provider==='sarvam'?'Sarvam':provider} API key in AI & API keys to use push-to-talk.`};return{...base,ready:true,message:`Hold ${state.microphone.pttShortcut} while asking; release to get an answer.`};}
function voiceStatus(state,hasKey){
 if(!state.voice?.enabled)return{ready:false,active:false,message:'Global voice hotkey is off.'};
 if(state.speech==='local')return{ready:true,active:false,message:'Local Windows speech is ready; no microphone audio leaves this PC.'};
 if(!state.languages?.cloudAudioConsent)return{ready:false,active:false,needs:'consent',message:'Hotkey preference saved. Allow cloud audio in Voice typing to activate it.'};
 if(!hasKey(state.speech))return{ready:false,active:false,needs:'key',message:`Hotkey preference saved. Save a working ${state.speech} transcription API key in AI & API keys to activate it.`};
 return{ready:true,active:false,message:'Starting the global voice hotkey…'};
}
// Windows readback parses this path as a command line, including spaces in Agent Notch.exe.
function loginOptions(app){return{path:'"'+process.execPath+'"',args:app.isPackaged?[]:[app.getAppPath()]};}
function setStartup(app,enabled){const options=loginOptions(app);app.setLoginItemSettings({...options,name:'app.agentnotch.desktop',enabled,openAtLogin:enabled});const status=app.getLoginItemSettings(options);if(enabled&&(!status.openAtLogin||status.executableWillLaunchAtLogin===false))throw new Error('Windows did not confirm startup registration.');return status;}
function shouldHideFullscreen(appearance,system){return !!appearance.hideFullscreen&&!!system.fullscreen&&!system.captureOverlay;}
module.exports={voiceStatus,pushToTalkStatus,loginOptions,setStartup,shouldHideFullscreen};
