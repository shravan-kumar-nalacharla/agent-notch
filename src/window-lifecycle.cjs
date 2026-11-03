'use strict';
function liveContents(window){try{if(!window||window.isDestroyed())return null;const contents=window.webContents;return contents&&!contents.isDestroyed()?contents:null;}catch{return null;}}
function trustedWindowEvent(event,windows,page){try{return !event.sender.isDestroyed()&&windows.some(window=>liveContents(window)===event.sender)&&event.senderFrame?.url?.split('?')[0]===page;}catch{return false;}}
module.exports={liveContents,trustedWindowEvent};
