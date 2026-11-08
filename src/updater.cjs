'use strict';
const fs=require('node:fs');
const path=require('node:path');
const {randomUUID}=require('node:crypto');
const {CHECK_INTERVAL_MS,STARTUP_DELAY_MS,PROMPT_RETRY_MS,updateStatusText,trayItem}=require('./update-policy.cjs');

function cleanError(error){
  const text=String(error?.message||error||'Update failed.').replace(/\s+/g,' ').trim();
  return text.length>300?text.slice(0,300)+'…':text;
}

function createUpdateService({app,dialog,getMainWindow,getSettingsWindow,getBusy,prepareShutdown,onState,isEnabled,testMode=false}){
  let updater=null,startupTimer=null,intervalTimer=null,promptTimer=null,prompting=false,installing=false,deferred=false,promptedVersion='';
  const currentVersion=app.getVersion();
  let state={status:'idle',currentVersion,availableVersion:'',percent:0,message:'',detail:'',checkedAt:0};

  const enabled=()=>!!isEnabled?.();
  const snapshot=()=>({...state,enabled:enabled()});
  function publish(patch={}){
    state={...state,...patch};
    state.message=updateStatusText(state);
    try{onState?.(snapshot());}catch(error){console.warn('[update] state listener:',error.message);}
  }
  function log(level,message){try{console[level]?.('[update]',message);}catch{}}

  function startPromptPoll(){
    if(promptTimer)return;
    promptTimer=setInterval(async()=>{
      if(state.status!=='ready'||!deferred){clearInterval(promptTimer);promptTimer=null;return;}
      const busy=await getBusy().catch(()=>'');
      if(busy)return;
      clearInterval(promptTimer);promptTimer=null;deferred=false;
      prompt(true).catch(()=>{});
    },PROMPT_RETRY_MS);
    promptTimer.unref?.();
  }

  function wire(){
    const {autoUpdater}=require('electron-updater');
    updater=autoUpdater;
    updater.autoDownload=true;
    updater.autoInstallOnAppQuit=false;
    updater.allowPrerelease=false;
    updater.allowDowngrade=false;
    updater.logger={info:m=>log('log',m),warn:m=>log('warn',m),error:m=>log('error',m),debug:()=>{}};
    updater.on('checking-for-update',()=>publish({status:'checking',detail:'',checkedAt:Date.now()}));
    updater.on('update-available',info=>publish({status:'available',availableVersion:String(info?.version||''),percent:0,detail:''}));
    updater.on('update-not-available',()=>publish({status:'current',availableVersion:'',percent:0,detail:'',checkedAt:Date.now()}));
    updater.on('download-progress',progress=>publish({status:'downloading',percent:Math.round(Number(progress?.percent)||0)}));
    updater.on('update-downloaded',info=>{
      publish({status:'ready',availableVersion:String(info?.version||''),percent:100,detail:''});
      prompt(false).catch(error=>log('warn','prompt: '+cleanError(error)));
    });
    updater.on('error',error=>publish({status:'error',detail:'',message:cleanError(error)}));
  }

  async function check(manual=false){
    if(!enabled()){
      if(manual)throw new Error('Updates are available in installed builds.');
      return snapshot();
    }
    if(installing)throw new Error('The update is already installing.');
    if(!updater)wire();
    if(state.status==='checking'||state.status==='downloading')return snapshot();
    if(state.status==='ready'){
      if(manual)await prompt(true);
      return snapshot();
    }
    publish({status:'checking',detail:''});
    try{await updater.checkForUpdates();}
    catch(error){
      const message=cleanError(error);
      publish({status:'error',detail:'',message});
      if(manual)throw new Error(message);
    }
    return snapshot();
  }

  async function prompt(force=false){
    if(state.status!=='ready'||!updater||installing||prompting)return false;
    if(!force&&promptedVersion===state.availableVersion)return false;
    const busy=await getBusy().catch(()=> '');
    if(busy){
      deferred=true;
      publish({detail:busy});
      startPromptPoll();
      return false;
    }
    promptedVersion=state.availableVersion;
    prompting=true;
    try{
      const result=await dialog.showMessageBox(getSettingsWindow()||getMainWindow(),{
        type:'info',
        title:'Agent Notch update ready',
        message:`Agent Notch ${state.availableVersion} is ready to install.`,
        detail:'Restart to finish installing. Your settings, encrypted keys, notes, reminders and local data are kept. Active recording, capture, terminal, task or unsaved settings are never interrupted.',
        buttons:['Restart now','Later'],
        defaultId:0,
        cancelId:1,
        noLink:true
      });
      if(result.response===0)await install();
      else publish({detail:'Use Restart to update in the tray or Settings when convenient.'});
      return true;
    }finally{prompting=false;}
  }

  async function install(){
    if(state.status!=='ready'||!updater)throw new Error('No downloaded update is ready to install.');
    const busy=await getBusy().catch(error=>cleanError(error));
    if(busy)throw new Error(busy);
    if(installing)return true;
    installing=true;
    publish({status:'installing',detail:''});
    try{
      await prepareShutdown();
      const installerPath=updater.installerPath;
      if(!installerPath)throw new Error('The downloaded installer is unavailable.');
      // The app is in a job that kills ordinary children when it exits. Create
      // the waiting helper through WMI so the installer process lives outside
      // that job, waits for this PID, then runs the verified NSIS package.
      const quoted=installerPath.replace(/'/g,"''");
      const argumentsList=testMode?"@('--updated','/S')":"@('--updated','/S','--force-run')";
      const helperPath=path.join(app.getPath('temp'),`agent-notch-update-${randomUUID()}.ps1`);
      fs.writeFileSync(helperPath,[
        `$target=${process.pid}`,
        'while(Get-Process -Id $target -ErrorAction SilentlyContinue){Start-Sleep -Milliseconds 500}',
        'Start-Sleep -Seconds 2',
        'Remove-Item Env:ELECTRON_RUN_AS_NODE -ErrorAction SilentlyContinue',
        `$p=Start-Process -FilePath '${quoted}' -ArgumentList ${argumentsList} -Wait -PassThru`,
        'Remove-Item -LiteralPath $MyInvocation.MyCommand.Path -Force -ErrorAction SilentlyContinue',
        'exit $p.ExitCode'
      ].join('\r\n'),'utf8');
      const helperCommand=`powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "${helperPath}"`;
      const createProcess=`Invoke-CimMethod -ClassName Win32_Process -MethodName Create -Arguments @{CommandLine='${helperCommand.replace(/'/g,"''")}'} | Out-Null`;
      require('node:child_process').execFileSync('powershell.exe',['-NoProfile','-NonInteractive','-Command',createProcess],{windowsHide:true,stdio:'ignore',timeout:15000});
      setImmediate(()=>app.quit());
      return true;
    }catch(error){
      installing=false;
      publish({status:'error',detail:'',message:cleanError(error)});
      throw error;
    }
  }

  function start(){
    if(!enabled()){publish({status:'disabled',detail:''});return;}
    if(!updater)wire();
    publish({status:'idle',detail:''});
    startupTimer=setTimeout(()=>check(false).catch(()=>{}),STARTUP_DELAY_MS);
    startupTimer.unref?.();
    intervalTimer=setInterval(()=>check(false).catch(()=>{}),CHECK_INTERVAL_MS);
    intervalTimer.unref?.();
  }

  function stop(){
    clearTimeout(startupTimer);clearInterval(intervalTimer);clearInterval(promptTimer);
    startupTimer=intervalTimer=promptTimer=null;
  }

  return {
    start,stop,check,install,prompt,
    status:snapshot,
    trayItem:()=>trayItem(state),
    hasUpdate:()=>state.status==='ready'
  };
}

module.exports={createUpdateService,cleanError};
