'use strict';
// Shared update rules. Keep this file free of Electron imports so tests can
// exercise the decision logic without starting the application.
const CHECK_INTERVAL_MS=6*60*60*1000;
const STARTUP_DELAY_MS=15*1000;
const PROMPT_RETRY_MS=30*1000;

function busyReason(value={}){
  if(value.voiceRecording)return 'Finish or cancel the active voice recording first.';
  if(value.capturing)return 'Finish the current screen capture first.';
  if(value.terminalActive)return 'Close the manual terminal session first.';
  if(value.taskActive)return 'Let the running task finish or stop it first.';
  if(value.unsaved)return 'Save or discard your settings changes first.';
  return '';
}

function updateStatusText(value={}){
  switch(value.status){
    case 'disabled':return 'Updates are available in installed builds.';
    case 'checking':return 'Checking for updates…';
    case 'available':return `Version ${value.availableVersion||''} is available. Downloading…`;
    case 'downloading':return `Downloading version ${value.availableVersion||''}… ${Math.max(0,Math.min(100,Number(value.percent)||0))}%`;
    case 'ready':return `Version ${value.availableVersion||''} is ready to install.`;
    case 'installing':return 'Closing Agent Notch to install the update…';
    case 'current':return `${value.currentVersion||'Agent Notch'} is up to date.`;
    case 'error':return value.message||'The update check failed. The current version stays usable.';
    default:return value.message||'Updates have not been checked yet.';
  }
}

function trayItem(value={}){
  if(value.status==='downloading')return {label:`Downloading update… ${Math.max(0,Math.min(100,Number(value.percent)||0))}%`,enabled:false};
  if(value.status==='ready')return {label:`Restart to update to ${value.availableVersion||'the new version'}`,enabled:true};
  if(value.status==='checking')return {label:'Checking for updates…',enabled:false};
  return null;
}

module.exports={CHECK_INTERVAL_MS,STARTUP_DELAY_MS,PROMPT_RETRY_MS,busyReason,updateStatusText,trayItem};
