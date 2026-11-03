'use strict';
const fs=require('node:fs');const path=require('node:path');
module.exports=async function({win,widgets,native,artifacts,saveSnapshot}){
  const js=code=>win.webContents.executeJavaScript(code);
  const delay=ms=>new Promise(r=>setTimeout(r,ms));
  async function check(code,message){if(!await js(code)){await saveSnapshot(win,path.join(artifacts,'polish-failure.png'));const layout=await js("({chat:document.getElementById('chat').getBoundingClientRect().toJSON(),nav:document.querySelector('nav').getBoundingClientRect().toJSON(),messages:document.getElementById('messages').getBoundingClientRect().toJSON(),height:innerHeight,view:document.body.className})");throw new Error(message+' '+JSON.stringify(layout));}}
  const originalBounds=win.getBounds();
  await js("document.querySelector('[data-tab=assistant]').click()");
  for(let i=0;i<8;i++)await js(`(()=>{const m=document.createElement('div');m.className='message assistant';m.textContent='Readable chat message ${i}. '.repeat(12);document.getElementById('messages').append(m);})()`);
  win.webContents.send('voice:state',{phase:'listening',kind:'chat'});
  win.webContents.send('voice:state',{phase:'answer',kind:'chat',raw:'Hello',text:'Hello! This is a deterministic layout test.'});
  await delay(450);
  if(win.getBounds().height!==originalBounds.height)throw new Error('Voice result shrank the expanded native window.');
  await check("(()=>{const r=document.getElementById('chat').getBoundingClientRect(),n=document.querySelector('nav').getBoundingClientRect(),m=document.getElementById('messages');return r.bottom<=n.top&&m.clientHeight>30&&getComputedStyle(m).scrollbarWidth==='none';})()",'Chat composer is clipped or message area is too short.');
  await saveSnapshot(win,path.join(artifacts,'polish-chat.png'));
  const sampleFile=path.join(artifacts,'shelf-test.txt');fs.writeFileSync(sampleFile,'Original file must survive removal.');
  await js(`window.island.library('shelf:add',{paths:[${JSON.stringify(sampleFile)}]})`);
  await js("window.islandOpenTool('shelf')");await delay(100);
  await check("!!document.querySelector('[data-do=removeFile]')",'Shelf has no individual remove control.');
  await js("document.querySelector('[data-do=removeFile]').click()");await delay(120);
  if(widgets.library.view().shelf.length||!fs.existsSync(sampleFile))throw new Error('Shelf removal failed or deleted the original.');
  await js("window.island.library('clips:enable',{enabled:true})");
  await js("window.island.library('clips:add',{text:'Clipboard test preview'})");
  await js("window.islandOpenTool('clips')");await delay(100);
  await check("document.querySelector('.widget-row').textContent.includes('Clipboard test preview')",'Clipboard preview missing.');
  await check("!!document.querySelector('[data-do=copyClip]')",'Clipboard copy control missing.');
  await js("document.querySelector('[data-do=copyClip]').focus();window.island.library('clips:add',{text:'New external clipboard entry'})");await delay(120);
  await check("document.querySelector('.widget-row').textContent.includes('New external clipboard entry')",'New clipboard entries stopped updating while a button had focus.');
  await js("document.querySelector('[data-do=removeClip]').click()");await delay(120);
  if(widgets.library.view().clips.length!==1)throw new Error('Individual clipboard deletion removed the wrong number of entries.');
  await js("document.querySelector('[data-do=clearClips]').click()");await delay(100);
  if(widgets.library.view().clips.length)throw new Error('Individual clipboard deletion failed.');
  await js("window.island.library('clips:enable',{enabled:false})");
  await js("window.islandOpenTool('timer');document.getElementById('focusMinutes').value='47';document.querySelector('[data-do=applyFocus]').click()");await delay(160);
  if(widgets.library.view().timer.seconds!==2820)throw new Error('Focus Time did not use the entered custom duration.');
  await js("window.islandOpenTool('timer');document.querySelector('[data-do=timerMode][data-mode=stopwatch]').click();document.querySelector('[data-do=timerPrimary]').click()");await delay(1200);
  await check("document.getElementById('widgetTimer').textContent!=='00:00'",'Stopwatch did not count upward.');
  await js("document.querySelector('[data-do=timerPrimary]').click()");await delay(120);
  if(widgets.library.view().stopwatch.running)throw new Error('Stopwatch did not pause.');
  await saveSnapshot(win,path.join(artifacts,'polish-stopwatch.png'));
  await js("window.islandOpenTool('prompter');document.getElementById('prompterText').value='A script entered without saving first. '.repeat(70);document.querySelector('[data-do=runPrompter]').click()");await delay(700);
  await check("document.getElementById('prompterViewport').scrollTop>5&&document.getElementById('prompterPlay').textContent==='Pause'",'Teleprompter did not scroll the freshly typed script.');
  await saveSnapshot(win,path.join(artifacts,'polish-prompter.png'));
  await js("document.querySelector('[data-do=runPrompter]').click()");const scroll=await js("document.getElementById('prompterViewport').scrollTop");await delay(200);
  await check(`document.getElementById('prompterViewport').scrollTop===${scroll}`,'Teleprompter did not pause.');
  await js("window.islandOpenTool('mirror')");
  await check("(()=>{const r=document.getElementById('mirrorVideo').getBoundingClientRect();return Math.abs(r.width-r.height)<2;})()",'Mirror preview is not square.');
  for(const tool of ['mirror','system','clips','timer','media']){
    await js(`window.islandOpenTool('${tool}')`);await delay(80);
    if(win.getBounds().height!==originalBounds.height)throw new Error('Tool changed fixed surface dimensions: '+tool);
    await check("(()=>{const n=document.querySelector('nav').getBoundingClientRect();return n.height>20&&n.bottom<innerHeight;})()",'Bottom dock disappeared in '+tool);
  }
  const request=native.request.bind(native);let playing=false;
  native.request=async(action,...args)=>{
    if(action==='media')return{available:true,title:'Deterministic player test',artist:'UI fixture',duration:180000,position:12000,playing};
    if(action==='media.control'){playing=!playing;return true;}
    if(action==='volume')return{level:50,muted:false};
    return request(action,...args);
  };
  try{
    await js("window.islandOpenTool('media')");for(let i=0;i<100;i++){if(await js("document.getElementById('mediaTitle')?.textContent==='Deterministic player test'"))break;await delay(100);}
    await js("document.querySelector('[data-command=toggle]').focus();document.querySelector('[data-command=toggle]').click()");await delay(1200);
    await check("document.querySelector('[data-command=toggle]').getAttribute('aria-label')==='Pause'",'Focused player control did not update to Pause.');
    await js("document.querySelector('[data-command=toggle]').click()");await delay(1200);
    await check("document.querySelector('[data-command=toggle]').getAttribute('aria-label')==='Play'",'Player control did not update to Play.');
  }finally{native.request=request;}
  await js("document.querySelector('[data-tab=home]').click()");
  console.log('POLISH SMOKE PASS: chat bounds, fixed geometry, dock, shelf removal, clipboard actions, stopwatch, square mirror, teleprompter, media controls (fixture).');
};
