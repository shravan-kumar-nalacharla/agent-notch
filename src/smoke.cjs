'use strict';
const fs=require('node:fs'),path=require('node:path'),{spawn}=require('node:child_process');
exports.run=async function({app,win,screen,getSettingsWindow,native,widgets,geometry,geometryTrace,saveSnapshot,state,quotePopups,quoteActivity}){
  const out=process.env.NOTCH_SMOKE_OUTPUT|| (app.isPackaged?path.join(app.getPath('temp'),`agent-notch-${app.getVersion()}-smoke`):path.resolve(__dirname,'../artifacts',app.getVersion()));fs.mkdirSync(out,{recursive:true});
  const js=code=>win.webContents.executeJavaScript(code),sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const evidence={platform:process.platform,windows:require('node:os').release(),display:screen.getPrimaryDisplay(),checks:[]};
  async function check(code,label){const value=await js(code);if(!value){await saveSnapshot(win,path.join(out,'failure.png'));throw new Error(label+' '+JSON.stringify(await js("({body:document.body.className,status:document.getElementById('status').textContent,html:document.getElementById('tools').innerHTML.slice(0,300)})")));}evidence.checks.push(label);}
  async function until(code){for(let i=0;i<100;i++){if(await js(code))return;await sleep(100);}throw new Error('Timed out: '+code);}
  await until("!!window.islandOpenTool&&document.getElementById('assistantProvider').options.length>=4");await sleep(400);
  await check(`window.island.version===${JSON.stringify(app.getVersion())}`,'Preload reports the packaged version');
  if(!['--notch-reminder-check','--notch-pointer-check','--background-reminder-check'].some(flag=>process.argv.includes(flag)))await js("window.island.productivity('notifications:settings',{enabled:false})");
  if(process.argv.includes('--player-fixes-check'))return require('./smoke-player-fixes.cjs')({app,win,getSettingsWindow,widgets,state,out,saveSnapshot});
  if(process.argv.includes('--eleven-components-check'))return require('./smoke-eleven-components.cjs')({app,win,native,widgets,state,out,saveSnapshot});
  if(process.argv.includes('--sound-feedback-check'))return require('./smoke-sound-feedback.cjs')({app,win,getSettingsWindow,widgets,state,out});
  if(process.argv.includes('--voice-polish-check'))return require('./smoke-voice-polish.cjs')({app,win,getSettingsWindow,widgets,state,out,saveSnapshot});
  if(process.argv.includes('--quote-popup-check'))return require('./smoke-quote-popups.cjs')({app,win,native,widgets,state,out,saveSnapshot,quotePopups,quoteActivity});
  if(process.argv.includes('--reading-check'))return require('./smoke-reading.cjs')({app,win,getSettingsWindow,widgets,state,out,saveSnapshot});
  if(process.argv.includes('--voice-experience-check'))return require('./smoke-voice-experience.cjs')({app,win,getSettingsWindow,native,widgets,state,out,saveSnapshot});
  if(process.argv.includes('--sarvam-ptt-check'))return require('./smoke-sarvam-ptt.cjs')({app,win,getSettingsWindow,native,widgets,state,out,saveSnapshot});
  if(process.argv.includes('--crest-check'))return require('./smoke-crest.cjs')({app,win,getSettingsWindow,native,widgets,geometry,state,out,saveSnapshot});
  if(process.argv.includes('--workspace-check'))return require('./smoke-workspace.cjs')({app,win,native,widgets,out,saveSnapshot});
  if(process.argv.includes('--terminal-check'))return require('./smoke-terminal.cjs')({app,win,native,widgets,geometry,out,saveSnapshot});
  if(process.argv.includes('--tools-scroll-check'))return require('./smoke-tools-scroll.cjs')({app,win,widgets,out,saveSnapshot});
  if(process.argv.includes('--plugins-check'))return require('./smoke-plugins.cjs')({win,out,saveSnapshot});
  if(process.argv.includes('--render-gallery'))return require('./smoke-render-gallery.cjs')({win,getSettingsWindow,out,saveSnapshot});
  if(process.argv.includes('--pulse-check'))return require('./smoke-pulse.cjs')({win,out,saveSnapshot});
  if(process.argv.includes('--refinement-check'))return require('./smoke-refinement.cjs')({win,out,saveSnapshot});
  if(process.argv.includes('--astryx-check'))return require('./smoke-astryx.cjs')({win,getSettingsWindow,native,out,saveSnapshot});
  if(process.argv.includes('--notch-reminder-check'))return require('./smoke-notch.cjs')({win,widgets,getSettingsWindow,out,saveSnapshot});
  if(process.argv.includes('--notch-pointer-check'))return require('./smoke-notch-pointer.cjs')({app,win,screen,widgets,geometry,out,saveSnapshot});
  if(process.argv.includes('--privacy-check'))return require('./smoke-privacy.cjs')({app,win,getSettingsWindow,native,state,out,saveSnapshot});
  if(process.argv.includes('--spotify-access-check'))return require('./smoke-spotify-access.cjs')({win,widgets,out,saveSnapshot});
  if(process.argv.includes('--windows-task-check'))return require('./smoke-windows-task.cjs')({win,native,out,saveSnapshot});
  if(process.argv.includes('--settings-redesign-check'))return require('./smoke-settings-redesign.cjs')({app,win,getSettingsWindow,native,state,out,saveSnapshot});
  if(process.argv.includes('--multilingual-only')){await js("window.island.settings()");for(let i=0;i<100&&!getSettingsWindow();i++)await sleep(50);const settings=getSettingsWindow();await new Promise(r=>settings.webContents.isLoading()?settings.webContents.once('did-finish-load',r):r());await sleep(500);await require('./smoke-multilingual.cjs')({win,settings,state,widgets:widgets(),out,saveSnapshot,evidence});console.log('MULTILINGUAL SMOKE PASS',evidence.checks.length);return;}
  if(process.argv.includes('--settings-save-check'))return require('./smoke-settings-save.cjs')({app,win,getSettingsWindow,native,state,out,saveSnapshot});
  if(process.argv.includes('--speech-output-check'))return require('./smoke-speech-output.cjs')({win,state,out});
  if(process.argv.includes('--gemini-live-check'))return require('./smoke-gemini-live.cjs')({win,getSettingsWindow,widgets,state,out,saveSnapshot});
  if(process.argv.includes('--productivity-check')||process.argv.includes('--background-reminder-check'))return require('./smoke-productivity.cjs')({win,widgets,out,saveSnapshot,background:process.argv.includes('--background-reminder-check')});
  if(win.webContents.getBackgroundThrottling())throw new Error('The unfocused island must not throttle animation frames');evidence.checks.push('Unfocused island rendering is not background-throttled');
  if(process.argv.includes('--hit-test'))return require('./hit-test.cjs').run({win,geometry,out});
  await check("!document.body.classList.contains('expanded')&&getComputedStyle(document.getElementById('island')).visibility==='hidden'&&getComputedStyle(document.querySelector('.eye-lid')).display==='none'",'Dormant line has no panel or eyes');
  await saveSnapshot(win,path.join(out,'idle.png'));
  const recording=spawn('ffmpeg',['-hide_banner','-loglevel','error','-f','gdigrab','-framerate','60','-draw_mouse','0','-i','desktop','-t','4','-vf','pad=ceil(iw/2)*2:ceil(ih/2)*2','-c:v','libx264','-preset','ultrafast','-crf','28','-y',path.join(out,'motion-60fps.mp4')],{windowsHide:true,stdio:'ignore'});recording.on('error',()=>{});
  const frames=await js(`new Promise(resolve=>{const samples=[],start=performance.now();function frame(at){const r=document.getElementById('island').getBoundingClientRect(),f=document.getElementById('face').getBoundingClientRect();samples.push({at:at-start,screenX,innerWidth,rect:r.toJSON(),face:f.toJSON()});if(samples.length===1){document.getElementById('activationTarget').click();window.dispatchEvent(new Event('island:test-enter'));}if(at-start<1200)requestAnimationFrame(frame);else resolve(samples);}requestAnimationFrame(frame);})`);
  const anchor=geometry.layout.centerX,bounds=win.getBounds();const maxError=Math.max(...frames.map(f=>Math.abs(bounds.x+f.rect.x+f.rect.width/2-anchor)));
  if(maxError>2)throw new Error('Center drift exceeded 2 DIP: '+maxError);evidence.center={frames:frames.length,maxErrorDIP:maxError};fs.writeFileSync(path.join(out,'motion.json'),JSON.stringify({frames,bounds,anchor,trace:geometryTrace},null,2));
  await check("(()=>{const r=document.getElementById('island').getBoundingClientRect();return Math.abs(r.width-470)<2&&Math.abs(r.height-250)<2;})()",'Default compact card is 470 × 250 DIP');
  await saveSnapshot(win,path.join(out,'home.png'));
  await js("window.dispatchEvent(new Event('island:test-leave'))");await sleep(700);await js("window.dispatchEvent(new Event('island:test-enter'))");await sleep(450);
  await check("document.body.classList.contains('expanded')",'Reentry cancels close grace');
  await js("window.dispatchEvent(new Event('island:test-leave'))");await sleep(850);await check("document.body.classList.contains('expanded')",'Close grace does not expire early');await sleep(450);
  await check("!document.body.classList.contains('expanded')",'Card collapses after close grace');
  await js("document.getElementById('activationTarget').click();window.dispatchEvent(new Event('island:test-enter'))");await sleep(350);
  await js("window.islandOpenTool('timer')");await js("window.__ring=document.getElementById('timerRing');window.island.library('timer:start',{seconds:15,kind:'focus'})");
  const ringSamples=[];for(let i=0;i<15;i++){ringSamples.push(await js("({same:window.__ring===document.getElementById('timerRing'),stroke:getComputedStyle(document.getElementById('timerProgress')).stroke,opacity:getComputedStyle(document.getElementById('timerProgress')).opacity,text:document.getElementById('widgetTimer').textContent})"));if(i%3===0)await saveSnapshot(win,path.join(out,'focus-ring-'+i+'.png'));if(i===2)await saveSnapshot(win,path.join(out,'focus-running.png'));await sleep(1000);}
  if(ringSamples.some(s=>!s.same||s.stroke!=='rgb(255, 83, 99)'||s.opacity!=='1'))throw new Error('Focus ring remounted or changed brightness.');evidence.ring={samples:ringSamples,domStable:true};
  await js("document.querySelector('[data-do=timerMode][data-mode=stopwatch]').click();document.querySelector('[data-do=timerPrimary]').click()");await until("document.getElementById('widgetTimer').textContent!=='00:00'");await saveSnapshot(win,path.join(out,'stopwatch-running.png'));
  await js("window.__watchRing=document.getElementById('timerRing')");for(let i=0;i<15;i++){await check("window.__watchRing===document.getElementById('timerRing')&&getComputedStyle(document.getElementById('timerProgress')).stroke==='rgb(255, 83, 99)'&&getComputedStyle(document.getElementById('timerProgress')).opacity==='1'",'Stopwatch ring steady sample '+i);if(i%3===0)await saveSnapshot(win,path.join(out,'stopwatch-ring-'+i+'.png'));await sleep(1000);}
  await check("document.getElementById('widgetTimer').textContent!=='00:00'",'Stopwatch counts upward');
  await js("document.querySelector('[data-do=timerPrimary]').click()");
  for(let i=0;i<10;i++){await js("document.getElementById('collapse').click()");await sleep(280);await js("document.getElementById('activationTarget').click();window.dispatchEvent(new Event('island:test-enter'))");await sleep(330);}
  const shape=geometry.layout;geometry.poll({x:bounds.x+4,y:bounds.y+100});if(!geometry.ignored)throw new Error('Transparent margin did not enable click-through.');evidence.checks.push('Transparent margin enables native ignore-mouse-events');
  await js("document.querySelector('[data-tab=home]').click()");
  await js("window.islandOpenTool('timer');document.querySelector('[data-do=timerMode][data-mode=focus]').click()");
  await require('./smoke-polish.cjs')({win,widgets:widgets(),native:native(),artifacts:out,saveSnapshot});
  const request=native().request.bind(native());native().request=async(action,...args)=>action==='media'?{available:true,title:'Tech Transfer Or Backdoor Sale? | Modi Govt Boosting',artist:'The Deshbhakt',app:'Brave',duration:1200000,position:60000,playing:false}:request(action,...args);
  try{await js("window.islandOpenTool('media')");await sleep(1100);await js("document.querySelector('[data-do=lyrics]').click()");await until("document.getElementById('lyricsRows').textContent.includes('video')");await saveSnapshot(win,path.join(out,'media-lyrics.png'));await check("document.getElementById('island').getBoundingClientRect().height<=317",'Lyrics remains within compact rich-media cap');}finally{native().request=request;}
  await js("window.island.library('timer:stop');window.island.library('stopwatch:reset')");
  await js("document.querySelector('[data-tab=settings]').click()");await sleep(700);const settings=getSettingsWindow();if(!settings)throw new Error('Settings did not open');
  const sj=code=>settings.webContents.executeJavaScript(code);await sj("document.getElementById('keyProvider').value='deepseek';document.getElementById('keyProvider').dispatchEvent(new Event('change'))");
  if(!await sj("(()=>{const control=document.getElementById('assistantProvider'),r=control.getBoundingClientRect();return control.checkVisibility({checkOpacity:true,checkVisibilityCSS:true})&&document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)===control&&Math.abs(document.getElementById('island').getBoundingClientRect().left)<1;})()"))throw new Error('Settings controls are hidden, displaced or unclickable');
  evidence.checks.push('Settings controls are visible, centered and receive pointer hits');
  if(!await sj("document.getElementById('assistantProvider').querySelector('[value=deepseek]')&&!document.getElementById('speechProvider').querySelector('[value=deepseek]')&&document.getElementById('speechModel').disabled"))throw new Error('DeepSeek provider capabilities are not filtered');
  await sj("document.getElementById('profileName').value='Alex';document.getElementById('islandDensity').value='compact';document.querySelector('[data-save-settings]').click()");await sleep(600);
  if(state().profileName!=='Alex'||state().appearance.density!=='compact')throw new Error('Settings did not persist new controls');
  await saveSnapshot(settings,path.join(out,'settings.png'));
  await sj("document.getElementById('islandDensity').value='default';document.querySelector('[data-save-settings]').click()");await sleep(450);
  await require('./smoke-multilingual.cjs')({win,settings,state,widgets:widgets(),out,saveSnapshot,evidence});
  const diagnostic=await native().request('voice.diagnostics');if(!diagnostic.hotkeySelfTest?.began||!diagnostic.hotkeySelfTest?.finished)throw new Error('Native voice chord self-test failed');evidence.checks.push('Native chord begin/finish deterministic self-test');fs.writeFileSync(path.join(out,'native-voice-diagnostics.json'),JSON.stringify({ready:diagnostic.ready,recording:diagnostic.recording,devices:diagnostic.devices,hotkeySelfTest:diagnostic.hotkeySelfTest},null,2));
  await sj("document.getElementById('closeSettings').click()");await sleep(150);
  await js("document.getElementById('activationTarget').click();document.querySelector('[data-tab=home]').click()");await sleep(330);
  await js("document.getElementById('quietText').textContent=\"Talent opens doors. Action is what walks through them.\";document.getElementById('quietMoment').hidden=false");await saveSnapshot(win,path.join(out,'quote.png'));
  await js("document.querySelector('[data-tab=tools]').click()");await saveSnapshot(win,path.join(out,'full-navigation.png'));
  await check("document.querySelector('nav').lastElementChild.dataset.tab==='tools'&&!document.querySelector('#tools [data-page=timer],#tools [data-page=focus]')&&document.querySelectorAll('nav [data-tab=focus]').length===1",'All features stays last and Focus Time has no duplicate in the feature menu');
  await js("window.islandUpdateDock(['media','timer','clips','media'])");await check("document.querySelector('nav').lastElementChild.dataset.tab==='tools'&&!document.querySelector('nav [data-tool=timer]')&&document.querySelectorAll('nav [data-tool=media]').length===1",'Favorite shortcuts retain final All features position without duplicate Focus Time');
  await js("document.querySelector('nav [data-tab=focus]').click()");await check("document.getElementById('timerRing')&&document.querySelector('nav [data-tab=focus]').classList.contains('active')&&!document.querySelector('nav [data-tab=tools]').classList.contains('active')",'Focus Time opens from its single shortcut and highlights it');
  for(const widget of ['water','shelf','todo','reminders','clips','dictionary','snippets','history','meetings','projects','weather','calendar','mirror','prompter','system']){await js(`window.islandOpenTool('${widget}')`);await check("document.querySelector('nav').getBoundingClientRect().height>20",'Navigation reachable in '+widget);}
  win.webContents.send('voice:state',{phase:'listening',kind:'dictation'});win.webContents.send('voice:state',{phase:'level',level:.7});await sleep(100);win.webContents.send('voice:state',{phase:'error',error:'No speech heard'});await sleep(1250);await check("!document.getElementById('outsideError').textContent",'Voice errors dismiss without blocking');
  evidence.limitations=['Live paid DeepSeek/Groq requests not run','Physical microphone and target app insertion not run','Multi-monitor/display DPI modeled by unit tests; runtime here is one Windows display','60fps recording is capture rate, not an application frame-rate guarantee'];
  fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(evidence,null,2));
  if(recording.exitCode===null)await new Promise(r=>{const timeout=setTimeout(r,2000);recording.once('exit',()=>{clearTimeout(timeout);r();});});
  console.log('COMPACT SMOKE PASS',JSON.stringify({checks:evidence.checks.length,maxCenterErrorDIP:maxError,artifacts:out}));
};
