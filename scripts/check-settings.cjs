'use strict';
const {app}=require('electron'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const out=process.env.NOTCH_SETTINGS_EVIDENCE||'F:\\AgentNotch-builds\\logs\\settings-check';
fs.mkdirSync(out,{recursive:true});
app.disableHardwareAcceleration();
const profile=fs.mkdtempSync(path.join(os.tmpdir(),'notch-settings-check-'));
app.setPath('userData',profile);
fs.writeFileSync(path.join(profile,'settings.json'),JSON.stringify({voice:{enabled:false},keys:{},appearance:{pinned:false},quietMoments:{enabled:false}}));
let first=true;
app.on('browser-window-created',(_,win)=>{
  if(first){first=false;win.webContents.once('did-finish-load',async()=>{await new Promise(r=>setTimeout(r,900));await win.webContents.executeJavaScript("document.getElementById('openSettings').click()");});return;}
  win.webContents.once('did-finish-load',async()=>{
    try{
      const js=code=>win.webContents.executeJavaScript(code),sleep=ms=>new Promise(r=>setTimeout(r,ms));
      for(let i=0;i<50&&!await js("document.body.classList.contains('settings-window')");i++)await sleep(100);
      const results=[];
      win.webContents.debugger.attach('1.3');
      for(const reduced of ['no-preference','reduce'])for(const motion of ['standard','subtle','off']){
        await win.webContents.debugger.sendCommand('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:reduced}]});
        await js(`document.body.dataset.motion='${motion}'`);await sleep(300);
        const result=await js(`(()=>{const root=document.getElementById('island'),control=document.getElementById('assistantProvider'),r=root.getBoundingClientRect(),c=control.getBoundingClientRect();return{motion:document.body.dataset.motion,visible:control.checkVisibility({checkOpacity:true,checkVisibilityCSS:true}),visibility:getComputedStyle(root).visibility,left:r.left,width:r.width,clickable:document.elementFromPoint(c.x+c.width/2,c.y+c.height/2)===control};})()`);
        results.push({...result,reduced});
      }
      fs.writeFileSync(path.join(out,'visibility.json'),JSON.stringify(results,null,2));
      win.webContents.debugger.detach();await js("document.body.dataset.motion='standard'");await sleep(300);
      fs.writeFileSync(path.join(out,'settings.png'),(await win.webContents.capturePage()).toPNG());
      if(results.some(r=>!r.visible||!r.clickable||Math.abs(r.left)>1))throw new Error('Settings controls are hidden or displaced: '+JSON.stringify(results));
      await js("document.querySelector('[data-settings-target=islandGroup]').click();document.getElementById('profileName').value='Settings check';document.querySelector('[data-save-settings]').click()");await sleep(500);
      if(!await js("document.getElementById('settingsSaveStatus').textContent.includes('Changes saved')"))throw new Error('Settings save acknowledgement missing');
      console.log('SETTINGS CHECK PASS: visible, clickable, centered in all motion modes; navigation and save work.');app.exit(0);
    }catch(e){console.error(e.message);app.exit(1);}
  });
});
require('../src/main.cjs');
