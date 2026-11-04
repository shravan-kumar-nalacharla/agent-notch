'use strict';
function createManualTerminal({app,native,dialog,mainWindow,store}){
 let directory=app.getPath('documents'),starting=false,pasteReview=false,sessionId='',keepAlive=false;
 const size=(v)=>{if(!Number.isInteger(v.cols)||v.cols<2||v.cols>500||!Number.isInteger(v.rows)||v.rows<2||v.rows>200)throw new Error('Invalid terminal dimensions.');return{cols:v.cols,rows:v.rows};};
 return{async action(op,v={}){
  if(op==='terminal:folder'){const result=await dialog.showOpenDialog({defaultPath:directory,properties:['openDirectory']});if(!result.canceled)directory=result.filePaths[0];return{directory};}
  if(op==='terminal:status'){const status=await native.request('terminal.status'),capabilities=await native.request('terminal.capabilities');return{...status,...capabilities,chosenDirectory:directory,keepAlive:status.id===sessionId&&keepAlive,font:store?.view().terminalFont||11};}
  if(op==='terminal:font'){if(!Number.isInteger(v.font)||v.font<10||v.font>20)throw new Error('Choose a terminal font size between 10 and 20.');if(!store)throw new Error('Workspace settings are unavailable.');store.set('terminalFont',v.font);return true;}
  if(op==='terminal:start'){
   if(starting)throw new Error('A terminal launch is already being reviewed.');if(!['powershell','pwsh','cmd'].includes(v.shell))throw new Error('Choose a supported Windows shell.');const dimensions=size(v),chosenDirectory=directory,chosenKeepAlive=v.keepAlive===true;starting=true;
   try{const result=await dialog.showMessageBox({type:'warning',title:'Open a manual terminal?',message:'Start '+(v.shell==='cmd'?'Command Prompt':v.shell==='pwsh'?'PowerShell 7':'Windows PowerShell')+' in Agent Notch?',detail:'Commands you type run with your Windows user permissions. This session is separate from the AI assistant. Agent Notch saves no command or output history; child programs can write their own files.\n\n'+(chosenKeepAlive?'This session keeps running when the island closes. Stop it explicitly with Close session.':'This session terminates when you close or leave the terminal view. Pin the island for long work, or enable Keep session before starting.')+'\n\nWorking folder: '+chosenDirectory,buttons:['Cancel','Open terminal'],defaultId:0,cancelId:0,noLink:true});if(result.response!==1)return{cancelled:true};const session=await native.request('terminal.start',{shell:v.shell,directory:chosenDirectory,...dimensions},20000);sessionId=session.id;keepAlive=chosenKeepAlive;return{...session,keepAlive};}finally{starting=false;}
  }
  if(typeof v.id!=='string'||!/^[a-f0-9]{32}$/.test(v.id))throw new Error('Terminal session expired.');
  if(op==='terminal:read'){const value=await native.request('terminal.drain',{id:v.id});return{...value,keepAlive:v.id===sessionId&&keepAlive};}
  if(op==='terminal:leave'){if(v.id===sessionId&&!keepAlive){await native.request('terminal.close',{id:v.id},15000);sessionId='';}return true;}
  if(op==='terminal:resize')return native.request('terminal.resize',{id:v.id,...size(v)});
  if(op==='terminal:close'){const value=await native.request('terminal.close',{id:v.id},15000);if(v.id===sessionId)sessionId='';return value;}
  if(op==='terminal:write'){
   if(pasteReview)throw new Error('Finish the current paste review first.');
   if(typeof v.text!=='string'||v.text.length>16384)throw new Error('Terminal input exceeds its limit.');
   const protocolReply=/^(?:\x1b\[[IO]|\x1b\[\??\d{1,4};\d{1,4}R|\x1b\[\??[\d;]{0,40}c)$/.test(v.text);
   if(!protocolReply&&!mainWindow()?.isFocused())throw new Error('Focus the Agent Notch terminal before typing.');
   if(v.text.length>1&&/[\r\n]/.test(v.text)){
    if(pasteReview)throw new Error('Finish the current paste review first.');if(v.text.length>4000)throw new Error('Multiline paste is limited to 4,000 characters. Split the script or open it in an editor.');pasteReview=true;
    try{const r=await dialog.showMessageBox({type:'warning',title:'Review terminal paste',message:'Paste multiple lines into the terminal?',detail:'Newlines can execute commands immediately. Review every line before continuing.\n\n'+v.text.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g,'�'),buttons:['Cancel','Paste lines'],defaultId:0,cancelId:0,noLink:true});if(r.response!==1)return false;}finally{pasteReview=false;}
   }
   return native.request('terminal.write',{id:v.id,text:v.text});
  }
  throw new Error('Unsupported manual terminal operation.');
 }};
}
module.exports={createManualTerminal};
