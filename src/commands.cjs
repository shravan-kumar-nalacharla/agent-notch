'use strict';
const fs=require('node:fs/promises');const path=require('node:path');
const {SITES,parseWorkflow,createWindowsApps}=require('./windows-apps.cjs');
const {routeIntent}=require('./intent-router.cjs');
function parseCommand(input){
 const text=String(input||'').trim().replace(/[.!?]+$/,'').replace(/^(?:please |can you |could you |would you )/i,'').replace(/ please$/i,'');let m;
 const workflow=parseWorkflow(text);if(workflow)return workflow;
 const route=routeIntent(text);if(route.intent==='multi_step_action')return null;
 if((m=/^(?:set |start )?(?:a )?(timer|focus|pomodoro)(?: for)? (\d+(?:\.\d+)?)\s*(seconds?|minutes?|hours?)$/i.exec(text)))return{op:'timer:start',seconds:Number(m[2])*({s:1,m:60,h:3600}[m[3][0].toLowerCase()]),kind:/focus|pomodoro/i.test(m[1])?'focus':'timer'};
 if(/^(?:pause|resume|stop|cancel) (?:the |my )?(?:timer|focus|pomodoro)$/i.test(text))return{op:'timer:'+(/pause/i.test(text)?'pause':/resume/i.test(text)?'resume':'stop')};
 if((m=/^(?:add (?:a )?(?:task|to-?do)|remember to)\s+(.+)$/i.exec(text)))return{op:'todo:add',text:m[1]};
 if((m=/^(?:take (?:a )?note|note|save (?:a )?note)[: ]+(.+)$/i.exec(text)))return{op:'note',text:m[1]};
 if((m=/^remind me (?:in (\d+) (seconds?|minutes?|hours?) to (.+)|to (.+) in (\d+) (seconds?|minutes?|hours?))$/i.exec(text)))return{op:'reminder:add',seconds:Number(m[1]||m[5])*({s:1,m:60,h:3600}[(m[2]||m[6])[0].toLowerCase()]),text:m[3]||m[4]};
 if((m=/^(?:set )?(?:the )?volume(?: to)? (\d{1,3})(?:\s*(?:percent|%))?$/i.exec(text)))return{op:'volume',level:Number(m[1])};
 if(/^(mute|unmute)(?: (?:the )?(?:volume|sound))?$/i.test(text))return{op:'volume',muted:!/^unmute/i.test(text)};
 if((m=/^(?:set )?(?:the )?brightness(?: to)? (\d{1,3})(?:\s*(?:percent|%))?$/i.exec(text)))return{op:'brightness',level:Number(m[1])};
 if((m=/^(play|pause|resume|next|previous|skip)(?: (?:the )?(?:music|song|track|media))$/i.exec(text)))return{op:'media.control',command:({resume:'play',skip:'next'})[m[1].toLowerCase()]||m[1].toLowerCase()};
 if(/^(?:log|drink|drank)(?: (?:a|one))? (?:water|bottle(?: of water)?)$/i.test(text))return{op:'water:drink'};
 if((m=/^(?:show|open) (?:my )?(settings|assistant|chat|notes|focus|widgets|agents|tools)$/i.exec(text)))return{op:'ui',page:/chat/i.test(m[1])?'assistant':/widgets|tools/i.test(m[1])?'tools':m[1].toLowerCase()};
 if((m=/^(?:open|launch) (.+)$/i.exec(text))){const name=m[1].trim();if(SITES[name.toLowerCase()])return{op:'website',url:SITES[name.toLowerCase()]};if(/\b(?:and|then)\b|[,;]/i.test(name))return null;if(/^(?:https:\/\/)?(?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/[^\s]*)?$/i.test(name))return{op:'website',url:name.startsWith('https://')?name:'https://'+name};if(/^[\p{L}\p{N} _-]{1,80}$/u.test(name))return{op:'app',name};}
 if((m=/^(?:find|search for) (?:a |the |my )?file (.+)$/i.exec(text)))return{op:'fileSearch',query:m[1]};
 if(route.intent==='search_only')return{op:'webSearch',query:route.searchQuery,...(route.exact?{exact:true}:{})};
 if((m=/^(?:press|use|send) (?:the )?keyboard shortcut (.+)$/i.exec(text))){const keys=m[1].trim().toLowerCase();if(['copy','paste','undo','save','find','select all','escape','enter','tab','next tab','previous tab'].includes(keys))return{op:'shortcut',keys};}
 return null;
}
async function findFiles(roots,query,{maxEntries=20000,maxResults=25,extensions=null}={}){
 const results=[],stack=roots.map(p=>({path:p,depth:0})),needle=query.toLocaleLowerCase();let scanned=0;
 while(stack.length&&scanned<maxEntries&&results.length<maxResults){const folder=stack.pop();let entries;try{entries=await fs.readdir(folder.path,{withFileTypes:true});}catch{continue;}for(const item of entries){if(++scanned>maxEntries)break;if(item.isSymbolicLink())continue;const full=path.join(folder.path,item.name);if(item.isDirectory()){if(folder.depth<6&&!item.name.startsWith('.')&&!['node_modules','Windows','$RECYCLE.BIN'].includes(item.name))stack.push({path:full,depth:folder.depth+1});}else if(item.name.toLocaleLowerCase().includes(needle)&&(!extensions||extensions.includes(path.extname(item.name).toLowerCase()))){results.push(full);if(results.length>=maxResults)break;}}}
 return results;
}
function createCommands({app,shell,native,library,emit,saveNote,openSettings=()=>{},prepareProductivity=()=>null,apps=createWindowsApps({shell,findFiles})}){
 return async function run(text){const productivity=await prepareProductivity(text);if(productivity)return productivity.message+(productivity.summary?' '+productivity.summary:'');const plan=parseCommand(text);if(!plan)return null;
  if(plan.op==='browser')return apps.browser(plan.browser,plan.url);
  if(plan.op==='website'){await shell.openExternal(plan.url);return`Opened ${new URL(plan.url).hostname}.`;}
  if(plan.op==='webSearch'){if(!plan.query||plan.query.length>500)throw new Error('Enter a shorter web search.');const url='https://www.google.com/search?q='+encodeURIComponent(plan.exact?'"'+plan.query+'"':plan.query);await shell.openExternal(url);return`Searching the web for ${plan.query}.`;}
  if(plan.op==='ui'){if(plan.page==='settings')openSettings();else emit('command:ui',{page:plan.page});return`Opened ${plan.page}.`;}
  if(plan.op==='app')return apps.open(plan.name);
  if(plan.op==='fileSearch'){const files=await findFiles(['documents','downloads','desktop'].map(name=>app.getPath(name)),plan.query);if(files.length){library.action('shelf:add',{paths:files});emit('library:changed',library.view());}return files.length?`Added ${files.length} matching files to the shelf:\n${files.map(p=>path.basename(p)).join('\n')}`:'No matching files found in Documents, Downloads or Desktop.';}
  if(plan.op==='note'){saveNote(plan.text);return 'Saved your note.';}
  if(['media.control','volume','brightness'].includes(plan.op)){if(plan.level!==undefined&&(plan.level<0||plan.level>100))throw new Error('Choose a level between 0 and 100.');const outcome=await native.request(plan.op,plan);if(outcome===false)throw new Error('The media player could not perform that action.');return plan.op==='media.control'?`Media: ${plan.command}.`:plan.muted!==undefined?(plan.muted?'Muted.':'Unmuted.'):`${plan.op==='volume'?'Volume':'Brightness'} set to ${plan.level}%.`;}
  if(plan.op==='shortcut'){await native.request('shortcut',{keys:plan.keys});return`Pressed ${plan.keys}.`;}
  if(plan.op==='reminder:add'){if(plan.seconds<=0||plan.seconds>86400*365)throw new Error('Reminder must be within one year.');plan.at=Date.now()+plan.seconds*1000;}
  library.action(plan.op,plan);emit('library:changed',library.view());return plan.op==='todo:add'?'Added your task.':plan.op==='reminder:add'?'Reminder saved.':plan.op==='water:drink'?'Water logged.':plan.op==='timer:start'?'Timer started.':'Timer updated.';
 };
}
module.exports={parseCommand,findFiles,createCommands};
