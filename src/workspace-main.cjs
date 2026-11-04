'use strict';
const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto');
const {createWorkspaceStore,LANGUAGES}=require('./workspace-store.cjs'),{UNITS,convert,convertCurrency,createCurrencyClient}=require('./converters.cjs'),{findFiles}=require('./commands.cjs');
function setupWorkspace({app,handle,native,shell,dialog,clipboard,calendar,captures,secrets,getProviderKey,mainWindow}){
 let store,error;try{store=createWorkspaceStore(app.getPath('userData'));}catch(e){error=e.message;}const currency=store&&createCurrencyClient({store});let catalogue=[],catalogueAt=0;
 const power=require('./power-plans.cjs').createPowerPlans({dialog});let hardwareRequest,hardwareAt=0,hardwareValue;
 const {createGitHub,createBalances}=require('./account-tools.cjs'),github=createGitHub({secrets,shell}),balance=createBalances({secrets,getKey:getProviderKey});
 const terminal=require('./terminal-main.cjs').createManualTerminal({app,native,dialog,mainWindow,store});
 async function apps(refresh){if(catalogueAt&&Date.now()-catalogueAt<300000&&!refresh)return catalogue;const roots=[path.join(process.env.APPDATA||'','Microsoft/Windows/Start Menu/Programs'),path.join(process.env.ProgramData||'C:/ProgramData','Microsoft/Windows/Start Menu/Programs')],paths=await findFiles(roots,'',{extensions:['.lnk'],maxResults:1000,maxEntries:10000});const next=[];for(const file of paths){try{const canonical=await fs.realpath(file);if(!roots.some(root=>{const relative=path.relative(root,canonical);return relative&&!relative.startsWith('..')&&!path.isAbsolute(relative);}))continue;const link=shell.readShortcutLink(canonical);if(!link.target)continue;next.push({id:crypto.createHash('sha256').update(canonical.toLowerCase()).digest('hex'),name:path.basename(file,'.lnk'),file:canonical});}catch{}}catalogue=next.sort((a,b)=>a.name.localeCompare(b.name));catalogueAt=Date.now();return catalogue;}
 handle('workspace:action',async request=>{
  if(!request||request.version!==1||typeof request.op!=='string')throw new Error('Unsupported workspace request.');const v=request.value||{};
  if(/^(capture:|ocr:)/.test(request.op))return captures.action(request.op,v);
  if(request.op.startsWith('terminal:'))return terminal.action(request.op,v);
  if(error&&/^(scratch:|currency:|launcher:)/.test(request.op))throw new Error(error);
  switch(request.op){
   case 'github:get':return github.view();
   case 'github:save':return github.configure(v);
   case 'github:refresh':return github.refresh();
   case 'github:profile':return github.profile();
   case 'balances:get':return balance(v.provider);
   case 'calendar:get':return calendar.view();
   case 'calendar:refresh':return calendar.refresh(v.refresh===true);
   case 'calendar:add':return calendar.configure(v);
   case 'calendar:remove':return calendar.configure({id:v.id,remove:true});
   case 'calendar:join':return calendar.join(v.id);
   case 'scratch:get':return{languages:LANGUAGES,language:store.view().language,drafts:store.view().drafts};
   case 'scratch:save':store.draft(v.language,v.text);return true;
   case 'scratch:copy':case 'scratch:export':{if(!LANGUAGES.includes(v.language))throw new Error('Unknown draft language.');const text=store.view().drafts[v.language]||'';if(request.op==='scratch:copy'){clipboard.writeText(text);return true;}const ext={plain:'txt',javascript:'js',typescript:'ts',python:'py',rust:'rs'}[v.language],r=await dialog.showSaveDialog({defaultPath:'scratchpad.'+ext,filters:[{name:'Draft',extensions:[ext]}]});if(r.canceled)return false;await fs.writeFile(r.filePath,text,'utf8');return true;}
   case 'units:list':return Object.fromEntries(Object.entries(UNITS).map(([k,v])=>[k,Object.keys(v)]));
   case 'units:convert':return convert(v);
   case 'currency:rates':return currency(v.refresh===true);
   case 'currency:convert':return{value:convertCurrency(v,store.view().rates),date:store.view().rates?.date};
   case 'launcher:list':{const list=await apps(v.refresh===true),pins=store.view().pins;return list.map(({file,...item})=>({...item,pinned:pins.includes(item.id)}));}
   case 'launcher:pin':case 'launcher:open':{const item=(await apps(false)).find(a=>a.id===v.id);if(!item)throw new Error('Application no longer available. Refresh the launcher.');if(request.op==='launcher:pin'){const pins=store.view().pins.filter(id=>id!==v.id);if(v.pinned===true){if(pins.length>=40)throw new Error('Up to 40 apps can be pinned.');pins.push(v.id);}store.set('pins',pins);return true;}const real=await fs.realpath(item.file);if(real.toLowerCase()!==item.file.toLowerCase())throw new Error('Shortcut changed. Refresh the launcher.');const failure=await shell.openPath(item.file);if(failure)throw new Error(failure);return true;}
   case 'awake:get':return native.request('awake',{});
   case 'power:list':return power.list();
   case 'power:set':return power.set(v.id);
   case 'hardware:get':if(hardwareValue&&Date.now()-hardwareAt<2500)return hardwareValue;if(hardwareRequest)return hardwareRequest;hardwareRequest=native.request('hardware',{},15000).then(value=>{hardwareAt=Date.now();return hardwareValue=value;}).finally(()=>hardwareRequest=null);return hardwareRequest;
   case 'awake:set':if(typeof v.enabled!=='boolean'||v.enabled&&![15,30,60,120].includes(v.minutes))throw new Error('Choose 15, 30, 60 or 120 minutes.');return native.request('awake',v);
   default:throw new Error('Unsupported workspace operation.');
  }
 });return{store};
}
module.exports={setupWorkspace};
