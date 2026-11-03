'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),{randomUUID}=require('node:crypto');
function cleanupHooks(profile,settingsFile=path.join(os.homedir(),'.claude','settings.json')){
  let token,bytes;try{token=fs.readFileSync(path.join(profile,'agent-token'),'utf8').trim();bytes=fs.readFileSync(settingsFile,'utf8');}catch(e){if(e.code==='ENOENT')return{removed:0};throw e;}
  if(!/^[a-f0-9]{64}$/.test(token))return{removed:0};
  const settings=JSON.parse(bytes);let removed=0;
  for(const[event,groups]of Object.entries(settings.hooks||{})){
    if(!Array.isArray(groups))continue;
    const next=groups.flatMap(group=>{if(!Array.isArray(group?.hooks))return[group];const hooks=group.hooks.filter(h=>{const owned=h?.type==='http'&&h.url==='http://127.0.0.1:47829/island-agent'&&h.headers?.['X-Island-Fusion']===token;if(owned)removed++;return!owned;});if(hooks.length===group.hooks.length)return[group];return hooks.length?[{...group,hooks}]:[];});
    if(next.length)settings.hooks[event]=next;else delete settings.hooks[event];
  }
  if(removed){const temp=settingsFile+'.'+randomUUID()+'.tmp';fs.writeFileSync(temp,JSON.stringify(settings,null,2)+'\n',{mode:0o600,flag:'wx'});fs.renameSync(temp,settingsFile);}
  return{removed};
}
module.exports={cleanupHooks};
if(require.main===module){try{const name=process.argv[2];if(!/^agent-notch(?:-qa)?$/.test(name||''))throw new Error('Unknown application profile.');cleanupHooks(path.join(process.env.APPDATA,name));}catch{console.error('Agent Notch could not safely remove its own Claude hooks. Shared settings were left unchanged.');process.exitCode=1;}}
