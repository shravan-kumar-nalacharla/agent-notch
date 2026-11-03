'use strict';
const{app,screen}=require('electron'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),{spawn}=require('node:child_process');
const out='F:\\AgentNotch-builds\\0.5.0\\evidence';fs.mkdirSync(out,{recursive:true});
const profile=fs.mkdtempSync(path.join(os.tmpdir(),'notch-timer-demo-'));app.setPath('userData',profile);fs.writeFileSync(path.join(profile,'settings.json'),JSON.stringify({appearance:{pinned:true},quietMoments:{enabled:false}}));
app.once('browser-window-created',(_,win)=>win.webContents.once('did-finish-load',async()=>{
  const js=code=>win.webContents.executeJavaScript(code),sleep=ms=>new Promise(r=>setTimeout(r,ms));
  try{
    await sleep(1400);await js("window.islandOpenTool('timer');window.island.library('timer:start',{seconds:15,kind:'focus'})");await sleep(200);
    const b=win.getBounds(),d=screen.getDisplayMatching(b),top=screen.dipToScreenPoint({x:b.x,y:b.y}),w=Math.round(b.width*d.scaleFactor),h=Math.round(b.height*d.scaleFactor);
    const recorder=spawn('ffmpeg',['-hide_banner','-loglevel','error','-f','gdigrab','-framerate','60','-draw_mouse','0','-i','desktop','-t','33','-vf',`crop=${w}:${h}:${top.x}:${top.y},pad=ceil(iw/2)*2:ceil(ih/2)*2`,'-c:v','libx264','-preset','ultrafast','-crf','25','-y',path.join(out,'focus-stopwatch-hardware-60fps.mp4')],{windowsHide:true,stdio:['ignore','ignore','pipe']});let errors='';recorder.stderr.on('data',c=>errors+=c);
    await sleep(15500);await js("document.querySelector('[data-do=timerMode][data-mode=stopwatch]').click();document.querySelector('[data-do=timerPrimary]').click()");
    if(recorder.exitCode===null)await new Promise(r=>recorder.once('exit',r));if(recorder.exitCode!==0)throw new Error(errors||'Recording failed');
    fs.writeFileSync(path.join(out,'hardware-recording.json'),JSON.stringify({hardwareAcceleration:app.isHardwareAccelerationEnabled(),scaleFactor:d.scaleFactor,bounds:b,recordingFps:60,applicationFps:'not benchmarked'},null,2));console.log('TIMER RECORDING COMPLETE');app.exit(0);
  }catch(e){console.error(e.message);app.exit(1);}
}));require('../src/main.cjs');
