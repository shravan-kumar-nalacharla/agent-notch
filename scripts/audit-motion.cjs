'use strict';
const {app,screen}=require('electron');const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),{spawn}=require('node:child_process');
app.disableHardwareAcceleration();
const output=path.resolve('artifacts/0.5.0');fs.mkdirSync(output,{recursive:true});
const profile=fs.mkdtempSync(path.join(os.tmpdir(),'notch-baseline-'));app.setPath('userData',profile);fs.writeFileSync(path.join(profile,'settings.json'),'{}');
app.once('browser-window-created',(_,win)=>win.webContents.once('did-finish-load',async()=>{
  try{
    await new Promise(r=>setTimeout(r,900));fs.writeFileSync(path.join(output,'baseline-idle.png'),(await win.webContents.capturePage()).toPNG());
    const display=screen.getDisplayMatching(win.getBounds()),native=[];const start=performance.now();const timer=setInterval(()=>native.push({at:performance.now()-start,bounds:win.getBounds(),content:win.getContentBounds()}),16);
    const recording=spawn('ffmpeg',['-hide_banner','-loglevel','error','-f','gdigrab','-framerate','60','-draw_mouse','0','-i','desktop','-t','3','-vf','pad=ceil(iw/2)*2:ceil(ih/2)*2','-c:v','libx264','-preset','ultrafast','-crf','28','-y',path.join(output,'baseline-motion.mp4')],{windowsHide:true,stdio:'ignore'});
    const capture=await win.webContents.executeJavaScript(`new Promise(resolve=>{const frames=[],start=performance.now();function frame(at){const r=document.getElementById('island').getBoundingClientRect(),f=document.getElementById('face').getBoundingClientRect();frames.push({at:at-start,screenX,screenY,innerWidth,rect:r.toJSON(),face:f.toJSON()});if(frames.length===1)document.getElementById('face').click();if(at-start<1300)requestAnimationFrame(frame);else resolve(frames);}requestAnimationFrame(frame);})`);
    clearInterval(timer);fs.writeFileSync(path.join(output,'baseline-expanded.png'),(await win.webContents.capturePage()).toPNG());
    fs.writeFileSync(path.join(output,'baseline-motion.json'),JSON.stringify({display,native,frames:capture},null,2));
    if(recording.exitCode===null)await new Promise(r=>recording.once('exit',r));console.log('BASELINE CAPTURED',JSON.stringify({frames:capture.length,display:display.bounds,scaleFactor:display.scaleFactor,expanded:win.getBounds()}));app.exit(0);
  }catch(e){console.error(e);app.exit(1);}
}));
require('../src/main.cjs');
