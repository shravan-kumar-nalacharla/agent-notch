const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),browserRoot=path.join(root,'tools/agent-browsers');
const shell=fs.existsSync(browserRoot)&&fs.readdirSync(browserRoot).find(name=>name.startsWith('chromium_headless_shell-'));
const executable=shell&&path.join(browserRoot,shell,'chrome-headless-shell-win64/chrome-headless-shell.exe');

test('lyrics retain their last text and animate upward through lookup gaps and blank cues',{skip:!executable||!fs.existsSync(executable)},async()=>{
 const browser=await require('playwright-core').chromium.launch({executablePath:executable,headless:true});
 try{
  const page=await browser.newPage({viewport:{width:600,height:360}});
  const html=fs.readFileSync(path.join(root,'src/index.html'),'utf8').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'');
  await page.route('http://notch.test/**',async route=>{
   const url=new URL(route.request().url()),file=path.resolve(root,'.'+decodeURIComponent(url.pathname));
   assert.ok(file.startsWith(root+path.sep));
   if(url.pathname==='/src/index.html')return route.fulfill({contentType:'text/html',body:html});
   return fs.existsSync(file)?route.fulfill({path:file}):route.fulfill({status:404,body:''});
  });
  await page.goto('http://notch.test/src/index.html');
  await page.evaluate(()=>{
   window.island={get:async()=>({ok:true,value:{}}),onSettings(){},onMicrophone(){},onVoice(){}};
   document.body.className='expanded rich-media';document.body.dataset.motion='standard';
   document.getElementById('body').hidden=false;
   document.querySelectorAll('.view-stack>.page').forEach(el=>el.hidden=true);
   const tools=document.createElement('section');tools.id='tools';tools.className='page';
   tools.innerHTML='<div class="carousel-head">Music</div><div class="carousel-body"><div id="elevenMediaSurface"></div></div><div class="carousel-foot"><div class="carousel-dots"><button class="active"></button></div></div>';
   document.querySelector('.view-stack').append(tools);
  });
  await page.addScriptTag({url:'http://notch.test/src/vendor/eleven-components.js'});
  await page.evaluate(()=>{
   window.value={receivedAt:Date.now(),media:{available:true,title:'Fixture',sessionId:'a',position:0,duration:60000,playing:false,capabilities:{}},lyrics:[],lyricsStatus:'Looking for lyrics…'};
   window.player=window.ElevenUI.mountMedia(document.getElementById('elevenMediaSurface'),{lyrics:async()=>{}},window.value);
  });
  await page.locator('.el-lyrics-toggle').click();
  assert.equal(await page.locator('#elevenLyrics').innerText(),'');
  const cues=[{at:1000,text:'First'},{at:2000,text:'Second'},{at:2500,text:''},{at:3000,text:'Third'},{at:4000,text:'Fourth'},{at:5000,text:'Fifth'}];
  async function update(position,lyrics=cues,title='Fixture'){
   await page.evaluate(({position,lyrics,title})=>{window.value={...window.value,receivedAt:Date.now(),media:{...window.value.media,position,title},lyrics};window.player.update(window.value)},{position,lyrics,title});
   await page.waitForTimeout(60);
  }
  await update(1000);
  assert.equal(await page.locator('.el-lyric-line.current').innerText(),'First');
  await page.waitForTimeout(650);
  const bounds=await page.evaluate(()=>{
   const lyric=document.querySelector('.el-lyric-line.current').getBoundingClientRect();
   return {bottom:lyric.bottom,clips:['.el-lyrics','.el-player','.carousel-body','.view-stack'].map(s=>document.querySelector(s).getBoundingClientRect().bottom)};
  });
  assert.ok(bounds.clips.every(bottom=>bounds.bottom<=bottom),JSON.stringify(bounds));
  await page.evaluate(()=>window.first=document.querySelector('.el-lyric-line.current'));
  await page.waitForTimeout(400);
  await update(2000);
  assert.equal(await page.evaluate(()=>window.first===document.querySelector('.el-lyric-line.previous')),true);
  // Only the current and previous lines are rendered, so the old line must sit
  // above the new one without a third clipped row.
  const motion=await page.evaluate(()=>({previous:window.first.getBoundingClientRect().top,current:document.querySelector('.el-lyric-line.current').getBoundingClientRect().top,entering:document.querySelector('.el-lyric-line.current').getAnimations().length,lines:document.querySelectorAll('.el-lyric-line').length}));
  assert.ok(motion.previous<motion.current,JSON.stringify(motion));
  assert.equal(motion.lines,2);assert.ok(motion.entering>0);
  await update(2500);
  assert.equal(await page.locator('.el-lyric-line.current').innerText(),'Second');
  await update(3000);await page.waitForTimeout(400);
  await update(4000);
  assert.equal(await page.locator('.el-lyric-line.current').innerText(),'Fourth');
  assert.equal(await page.locator('.el-lyric-line.previous').innerText(),'Third');
  assert.equal(await page.locator('.el-lyric-line.older,.el-lyric-line.departing').count(),0);
  const lines=await page.evaluate(()=>document.querySelectorAll('.el-lyric-line').length);
  assert.equal(lines,2);
  const fitData=await page.evaluate(()=>{const box=document.querySelector('.el-lyrics').getBoundingClientRect();return {box:box.toJSON(),lines:[...document.querySelectorAll('.el-lyric-line')].map(e=>({text:e.textContent,rect:e.getBoundingClientRect().toJSON(),height:getComputedStyle(e).height,lineHeight:getComputedStyle(e).lineHeight}))};});
  const fits=fitData.lines.every(({rect})=>rect.top>=fitData.box.top-1&&rect.bottom<=fitData.box.bottom+1);
  assert.equal(fits,true,JSON.stringify(fitData));
  await update(5000);const previous=await page.locator('#elevenLyrics').innerText();
  await update(0,[],'Missing lyrics');
  assert.equal(await page.locator('#elevenLyrics').innerText(),previous);
  await update(10000,[],'Missing lyrics');
  assert.equal(await page.locator('#elevenLyrics').innerText(),previous);
  await update(0,[{at:15000,text:'New track'}],'Next track');
  assert.equal(await page.locator('#elevenLyrics').innerText(),previous);
  await update(15000,[{at:15000,text:'New track'}],'Next track');
  assert.equal(await page.locator('.el-lyric-line.current').innerText(),'New track');
 }finally{await browser.close()}
});
