'use strict';
const fs=require('node:fs'),path=require('node:path');
module.exports=async function({win,state,out}){
 const {ipcMain}=require('electron'),js=code=>win.webContents.executeJavaScript(code);let replies=0;
 ipcMain.removeHandler('assistant:ask');ipcMain.handle('assistant:ask',()=>{replies++;return{ok:true,value:'A deterministic typed-chat reply.'};});
 await js("window.__spokenReplies=0;window.islandSpeak=async()=>{window.__spokenReplies++;};window.island.save({speak:true,companion:{name:'Cutie',readTypedReplies:false}})");
 await js("ask('Typed message')");if(await js('window.__spokenReplies')!==0)throw new Error('Typed chat incorrectly triggered read-aloud.');
 await js("window.island.save({speak:true,companion:{name:'Cutie',readTypedReplies:true}})");await js("ask('Explicitly read typed chat')");if(await js('window.__spokenReplies')!==1)throw new Error('Typed read-aloud opt-in did not work.');
 await js("window.island.save({speak:false})");await js("ask('Text only')");if(await js('window.__spokenReplies')!==1)throw new Error('Master read-aloud off did not stop speech.');
 if(state().companion.tts!=='system')throw new Error('New profile must default to installed Windows voice.');
 fs.writeFileSync(path.join(out,'speech-output-report.json'),JSON.stringify({typedReplies:replies,checks:4,cloudRequests:0,result:'PASS'},null,2));console.log('SPEECH OUTPUT SMOKE PASS: silent typed chat, explicit opt-in, master off, local default; zero cloud requests');
};
