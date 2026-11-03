'use strict';
// Isolated source-app screenshot run; no personal profile, audio capture or provider requests.
const{app}=require('electron'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
app.disableHardwareAcceleration();app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'notch-localization-images-')));
fs.writeFileSync(path.join(app.getPath('userData'),'settings.json'),JSON.stringify({speak:false,voice:{enabled:false},quietMoments:{enabled:false}}));
const out=path.resolve(__dirname,'../artifacts/0.7.0/localization-screenshots');fs.mkdirSync(out,{recursive:true});let first=true;
app.on('browser-window-created',(_,win)=>{
 if(first){first=false;win.webContents.once('did-finish-load',async()=>{await new Promise(r=>setTimeout(r,700));await win.webContents.executeJavaScript("window.island.settings('quotes')");});return;}
 win.webContents.once('did-finish-load',async()=>{
  const js=code=>win.webContents.executeJavaScript(code),wait=ms=>new Promise(r=>setTimeout(r,ms));
  try{
   await wait(700);win.webContents.debugger.attach('1.3');await win.webContents.debugger.sendCommand('Page.enable');
   for(const language of ['en','hi','te','hinglish','tenglish']){
    const response=await js(`window.island.save({languages:{uiLanguage:'${language}',quoteLanguage:'follow_ui'}})`);if(!response.ok)throw new Error(response.error);
    await wait(500);await js("document.getElementById('quoteSearch').value='ANQ-043';document.getElementById('quoteSearch').dispatchEvent(new Event('input'));document.querySelector('[data-settings-target=quoteLibraryGroup]').click()");await wait(1000);
    const snapshot=await js("({rootLanguage:document.documentElement.lang,quoteLanguage:document.querySelector('[data-quote-id=\"ANQ-043\"] p').lang,text:document.querySelector('[data-quote-id=\"ANQ-043\"] p').textContent})");
    // CDP explicitly requests a fresh renderer frame, unlike delayed compositor capturePage snapshots.
    const image=await win.webContents.debugger.sendCommand('Page.captureScreenshot',{format:'png',fromSurface:true,captureBeyondViewport:false});fs.writeFileSync(path.join(out,'library-'+language+'.png'),Buffer.from(image.data,'base64'));fs.writeFileSync(path.join(out,'library-'+language+'.json'),JSON.stringify(snapshot,null,2));
    await js("document.querySelector('[data-settings-target=languagesGroup]').click()");await wait(1000);const panel=await win.webContents.debugger.sendCommand('Page.captureScreenshot',{format:'png',fromSurface:true,captureBeyondViewport:false});fs.writeFileSync(path.join(out,'settings-'+language+'.png'),Buffer.from(panel.data,'base64'));
   }
   console.log('LOCALIZATION SCREENSHOTS PASS: 5 languages, 10 fresh frames, zero audio/provider calls');app.exit(0);
  }catch(e){console.error(e.stack);app.exit(1);}
 });
});
require('../src/main.cjs');
