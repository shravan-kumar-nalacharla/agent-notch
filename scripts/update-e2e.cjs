'use strict';
// End-to-end installed update proof. Run only against an isolated APPDATA and a
// test installation directory; never against the real agent-notch profile.
const {chromium}=require('playwright-core');
const {execFileSync}=require('node:child_process');
const asar=require('@electron/asar');
const fs=require('node:fs'),path=require('node:path');
const arg=(name,fallback)=>{const i=process.argv.indexOf(name);return i>0&&process.argv[i+1]?process.argv[i+1]:fallback;};
const installer=path.resolve(arg('--installer',''));
const target=arg('--target','');
const installDir=path.resolve(arg('--install-dir','F:\\AgentNotch-e2e'));
const port=Number(arg('--port','9333'));
const workRoot=path.resolve(arg('--work-root','F:\\AgentNotch-e2e-work'));
fs.rmSync(workRoot,{recursive:true,force:true});
const profile=path.join(workRoot,'profile'),appData=path.join(profile,'Roaming'),localAppData=path.join(workRoot,'Local'),temp=path.join(workRoot,'Temp');
fs.mkdirSync(appData,{recursive:true});fs.mkdirSync(localAppData,{recursive:true});fs.mkdirSync(temp,{recursive:true});
const exe=path.join(installDir,'Agent Notch.exe');
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const fail=message=>{console.error('UPDATE E2E FAILED:',message);process.exit(1);};
const versionFromAsar=()=>JSON.parse(asar.extractFile(path.join(installDir,'resources','app.asar'),'package.json').toString()).version;
const safeVersion=()=>{try{return versionFromAsar();}catch{return '';}};
function launch(extra=[]){
  const script=path.join(workRoot,'launch.cmd');
  fs.writeFileSync(script,[
    '@echo off',
    `set APPDATA=${appData}`,
    `set LOCALAPPDATA=${localAppData}`,
    `set TEMP=${temp}`,
    `set TMP=${temp}`,
    'set ELECTRON_RUN_AS_NODE=',
    `start "" /B "${exe}" --update-test --remote-debugging-port=${port} --remote-allow-origins=* ${extra.join(' ')} > "${path.join(workRoot,'app.log')}" 2>&1`
  ].join('\r\n'),'ascii');
  execFileSync('powershell.exe',['-NoProfile','-Command',`Invoke-CimMethod -ClassName Win32_Process -MethodName Create -Arguments @{CommandLine='cmd.exe /c "${script}"'} | Out-Null`],{windowsHide:true,stdio:'ignore'});
  return 0;
}
function stopInstalled(){
  try{execFileSync('taskkill.exe',['/IM','Agent Notch.exe','/T','/F'],{windowsHide:true,stdio:'ignore'});}catch{}
}
process.on('exit',()=>stopInstalled());
async function connect(){
  for(let i=0;i<120;i++){
    try{
      const response=await fetch(`http://127.0.0.1:${port}/json/version`,{signal:AbortSignal.timeout(1000)});
      if(response.ok)return chromium.connectOverCDP(`http://127.0.0.1:${port}`);
    }catch{}
    await sleep(500);
  }
  throw new Error('The installed app did not expose its debug port.');
}
async function pageWithBridge(browser){
  for(let i=0;i<60;i++){
    for(const context of browser.contexts())for(const page of context.pages()){
      try{if(await page.evaluate(()=>!!window.island?.updateStatus))return page;}catch{}
    }
    await sleep(250);
  }
  throw new Error('The island page did not expose the preload bridge.');
}
(async()=>{
  if(!installer||!fs.existsSync(installer))fail('pass --installer with the built 0.17.2 setup file.');
  if(fs.existsSync(installDir))fs.rmSync(installDir,{recursive:true,force:true});
  console.log('INSTALL',installer,'->',installDir);
  execFileSync(installer,['/S',`/D=${installDir}`],{windowsHide:false,timeout:900000});
  for(let i=0;i<120&&!fs.existsSync(exe);i++)await sleep(1000);
  if(!fs.existsSync(exe))fail('the installer did not produce Agent Notch.exe');
  const base=versionFromAsar();
  console.log('BASE VERSION',base);
  launch();let browser,settingsFile;
  try{
    browser=await connect();
    const page=await pageWithBridge(browser);
    const version=await page.evaluate(()=>window.island.version);
    if(version!==base)fail(`preload reported ${version}, packaged version is ${base}`);
    await page.evaluate(()=>window.island.save({profileName:'Update E2E'}));
    const before=await page.evaluate(()=>window.island.get());
    if(before.value?.profileName!=='Update E2E')fail('the isolated profile did not accept the pre-update marker.');
    const profiles=fs.readdirSync(temp).filter(name=>name.startsWith('agent-notch-update-test-')).map(name=>path.join(temp,name)).sort((a,b)=>fs.statSync(b).mtimeMs-fs.statSync(a).mtimeMs);
    if(!profiles.length)fail('the isolated profile directory was not created.');
    const settingsCandidate=path.join(profiles[0],'settings.json');
    if(!fs.existsSync(settingsCandidate))fail('the isolated profile settings file was not written.');
    settingsFile=settingsCandidate;
    const status=await page.evaluate(()=>window.island.updateStatus());
    if(!status.ok||!status.value.enabled)fail('the installed build reports updates disabled: '+JSON.stringify(status));
    console.log('CHECK FOR UPDATES');
    const checked=await page.evaluate(()=>window.island.checkForUpdates());
    if(!checked.ok)fail(checked.error);
    let ready=null;
    for(let i=0;i<1800;i++){
      const current=await page.evaluate(()=>window.island.updateStatus());
      if(!current.ok)fail(current.error);
      if(current.value.status==='ready'){ready=current.value;break;}
      if(current.value.status==='error')fail(current.value.message);
      if(i%30===0)console.log('  ',current.value.status,current.value.message);
      await sleep(2000);
    }
    if(!ready)fail('the update did not download within the test window.');
    if(target&&ready.availableVersion!==target)fail(`downloaded ${ready.availableVersion}, expected ${target}`);
    console.log('READY',ready.availableVersion);
    try{
      const install=await page.evaluate(()=>window.island.installUpdate());
      if(!install.ok)fail(install.error);
    }catch(error){console.log('APP CLOSED FOR INSTALL',error.message.split('\n')[0]);}
  }finally{try{await browser?.close();}catch{}}
  for(let i=0;i<300;i++){if(safeVersion()===target)break;await sleep(1000);}
  const installed=versionFromAsar();
  if(target&&installed!==target)fail(`installed asar is ${installed}, expected ${target}`);
  const preserved=JSON.parse(fs.readFileSync(settingsFile,'utf8'));
  if(preserved.profileName!=='Update E2E')fail('the isolated profile marker did not survive the update.');
  stopInstalled();
  await sleep(2000);
  console.log('INSTALLED VERSION',installed,'BASE PROFILE PRESERVED');
  launch();
  try{
    browser=await connect();
    const page=await pageWithBridge(browser);
    const version=await page.evaluate(()=>window.island.version);
    if(version!==installed)fail(`relaunched app reports ${version}, expected ${installed}`);
    console.log('RESTARTED',version);
  }finally{try{await browser?.close();}catch{}stopInstalled()}
  console.log('UPDATE E2E PASS',{from:base,to:installed,profile});
})().catch(error=>fail(error.stack||error.message));
