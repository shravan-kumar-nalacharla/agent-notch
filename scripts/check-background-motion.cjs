'use strict';
const{app}=require('electron'),fs=require('fs'),path=require('path'),os=require('os');
const profile=fs.mkdtempSync(path.join(os.tmpdir(),'notch-background-'));app.setPath('userData',profile);fs.writeFileSync(path.join(profile,'settings.json'),JSON.stringify({voice:{enabled:false},speak:false,keys:{},appearance:{autoClose:false,hideFullscreen:false},quietMoments:{enabled:false,frequencyMigration:true}}));
setTimeout(()=>app.exit(1),30000);let first=true;
app.on('browser-window-created',(_,win)=>{if(!first)return;first=false;win.webContents.once('did-finish-load',async()=>{
  try{const sleep=ms=>new Promise(r=>setTimeout(r,ms));await sleep(1500);const results=[];
    for(const allowed of [true,false]){win.webContents.setBackgroundThrottling(allowed);await win.webContents.executeJavaScript('expand(false)');await sleep(600);const frames=await win.webContents.executeJavaScript(`new Promise(resolve=>{const values=[],start=performance.now();expand(true);function tick(t){values.push(t-start);if(t-start<1200)requestAnimationFrame(tick);else resolve({values,visibility:document.visibilityState});}requestAnimationFrame(tick);})`);results.push({backgroundThrottling:allowed,focused:win.isFocused(),visible:win.isVisible(),...frames});}
    fs.writeFileSync('F:/AgentNotch-builds/0.6.0/evidence/background-motion.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results.map(r=>({...r,values:r.values.length}))));app.exit(0);
  }catch(e){console.error(e.stack);app.exit(1);}
});});require('../src/main.cjs');
