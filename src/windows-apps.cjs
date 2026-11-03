'use strict';
const fs=require('node:fs/promises'),path=require('node:path'),{spawn}=require('node:child_process');
const SITES=Object.freeze({youtube:'https://www.youtube.com/',chatgpt:'https://chatgpt.com/',google:'https://www.google.com/',gmail:'https://mail.google.com/',spotify:'https://open.spotify.com/',github:'https://github.com/'});
const BROWSERS=Object.freeze({brave:['BraveSoftware/Brave-Browser/Application/brave.exe','brave.exe'],chrome:['Google/Chrome/Application/chrome.exe','chrome.exe'],edge:['Microsoft/Edge/Application/msedge.exe','msedge.exe'],firefox:['Mozilla Firefox/firefox.exe','firefox.exe']});
function browserName(value){return String(value||'').toLowerCase().replace(/^(?:google|microsoft|mozilla) /,'').replace(/ browser$/,'');}
function website(value){const name=String(value||'').trim();if(SITES[name.toLowerCase()])return SITES[name.toLowerCase()];try{const url=new URL(/^https?:\/\//i.test(name)?name:'https://'+name);if(!['https:','http:'].includes(url.protocol)||url.username||url.password||!url.hostname.includes('.')||/\s/.test(name)||name.length>2000)return null;return url.href;}catch{return null;}}
function parseWorkflow(input){
 const text=String(input||'').trim().replace(/[.!?]+$/,'').replace(/^(?:please |can you |could you )/i,'');
 const match=/^(?:open|launch) (.+?) (?:and(?: then)?|then) (?:open|go to|visit) (.+)$/i.exec(text);
 if(!match)return null;const browser=browserName(match[1]),url=website(match[2]);
 return BROWSERS[browser]&&url?{op:'browser',browser,url}:null;
}
function createWindowsApps({shell,findFiles,spawnProcess=spawn,env=process.env}){
 const roots=[path.join(env.APPDATA||'','Microsoft/Windows/Start Menu/Programs'),path.join(env.ProgramData||'C:/ProgramData','Microsoft/Windows/Start Menu/Programs')];
 const shortcuts=query=>findFiles(roots,query,{extensions:['.lnk'],maxResults:30});
 async function launch(executable,args){await new Promise((resolve,reject)=>{const child=spawnProcess(executable,args,{shell:false,windowsHide:false,detached:true,stdio:'ignore'});child.once('error',reject);child.once('spawn',()=>{child.unref();resolve();});});}
 async function browser(name,url=''){name=browserName(name);if(!BROWSERS[name])throw new Error('Choose Brave, Chrome, Edge or Firefox.');if(url&&(!website(url)||!/^https?:\/\//i.test(url)))throw new Error('Use an HTTP or HTTPS website.');const [relative,exe]=BROWSERS[name],args=url?['--new-tab',url]:[],message=url?`Opened ${new URL(url).hostname} in ${name}.`:`Opened ${name}.`;
  for(const base of [env.LOCALAPPDATA,env.ProgramFiles,env['ProgramFiles(x86)']].filter(Boolean)){const file=path.join(base,relative);try{await fs.access(file);}catch{continue;}await launch(file,args);return message;}
  for(const file of await shortcuts(name)){let link;try{link=shell.readShortcutLink(file);}catch{continue;}if(path.basename(link.target).toLowerCase()!==exe)continue;await launch(link.target,args);return message;}
  throw new Error(`${name} was not found. Install it or choose another browser.`);
 }
 async function open(name){if(typeof name!=='string'||!name.trim()||!/^[\p{L}\p{N} ._()-]{1,80}$/u.test(name))throw new Error('Use an installed application name.');const site=SITES[name.toLowerCase()];if(site){await shell.openExternal(site);return `Opened ${name}.`;}
  if(BROWSERS[browserName(name)])return browser(name);
  const matches=await shortcuts(name),exact=matches.filter(p=>path.basename(p,path.extname(p)).toLowerCase()===name.toLowerCase());const choices=exact.length?exact:matches;
  if(choices.length!==1)throw new Error(choices.length?`Several apps match: ${choices.map(p=>path.basename(p,'.lnk')).join(', ')}. Use the full name.`:`No installed Start menu app matches “${name}”.`);
  const error=await shell.openPath(choices[0]);if(error)throw new Error(error);return `Opened ${path.basename(choices[0],'.lnk')}.`;
 }
 return{browser,open};
}
module.exports={SITES,BROWSERS,browserName,website,parseWorkflow,createWindowsApps};
