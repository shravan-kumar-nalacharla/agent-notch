'use strict';
const {test:nodeTest}=require('node:test'),assert=require('node:assert/strict');
const test=(name,run)=>nodeTest(name,{timeout:5000},run);
const {EventEmitter}=require('node:events');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {createWindowsTask,decode,needsReview,contextFor}=require('../src/windows-task.cjs');
const {parseCommand,createCommands}=require('../src/commands.cjs');
const {website,createWindowsApps}=require('../src/windows-apps.cjs');
const {cleanCommandTranscript,isStopRequest}=require('../src/voice-intents.cjs');
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function fixture(steps,overrides={}){
 const calls=[],events=[];let n=0,engine;
 const snapshot=()=>({id:'snapshot-'+n++,app:'Fixture',windows:[{id:'win-1',title:'Test app'}],controls:[{id:'input',name:'Message',editable:true},{id:'send',name:'Send',editable:false}]});
 engine=createWindowsTask({native:{request:async(op,args)=>{calls.push({op,args});return op==='agent.observe'?snapshot():{applied:true};}},apps:{open:async app=>{calls.push({op:'launch',app});return 'Launch accepted';},browser:async(browser,url)=>{calls.push({op:'browser',browser,url});return 'Launch accepted';}},shell:{openExternal:async url=>calls.push({op:'url',url})},getConfig:()=>({provider:'fixture',key:'not-a-real-key'}),settle:async()=>{},ask:async options=>{assert.doesNotThrow(()=>JSON.parse(options.text));const next=steps.shift();assert.ok(next,'Unexpected extra model turn');return JSON.stringify(next);},emit:(_,value)=>events.push(value),...overrides});return{engine,calls,events};
}
test('compound browser command is one browser-aware action, unsupported clauses go to the task planner intact',async()=>{
 assert.deepEqual(parseCommand('open brave and open youtube'),{op:'browser',browser:'brave',url:'https://www.youtube.com/'});
 assert.deepEqual(parseCommand('Please open Google Chrome then visit chatgpt'),{op:'browser',browser:'chrome',url:'https://chatgpt.com/'});
 assert.equal(parseCommand('open brave and search for cats'),null);assert.equal(parseCommand('open ChatGPT, tell hi'),null);
 assert.equal(parseCommand('open chatgpt').url,'https://chatgpt.com/');
 const calls=[],run=createCommands({apps:{browser:async(...args)=>{calls.push(args);return 'Opened';}}});assert.equal(await run('open brave and open youtube'),'Opened');assert.deepEqual(calls,[['brave','https://www.youtube.com/']]);
});
test('app/browser launch uses known executable and separate arguments, rejects unsafe URLs',async()=>{
 const folder=fs.mkdtempSync(path.join(os.tmpdir(),'notch-browser-test-')),file=path.join(folder,'BraveSoftware/Brave-Browser/Application/brave.exe');fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,'test');let launched;
 try{const apps=createWindowsApps({env:{LOCALAPPDATA:folder},findFiles:async()=>[],shell:{},spawnProcess:(exe,args,options)=>{launched={exe,args,options};const child=new EventEmitter();child.unref=()=>{};setImmediate(()=>child.emit('spawn'));return child;}});await apps.browser('brave','https://www.youtube.com/');assert.equal(launched.exe,file);assert.deepEqual(launched.args,['--new-tab','https://www.youtube.com/']);assert.equal(launched.options.shell,false);await assert.rejects(apps.browser('brave','javascript:alert(1)'),/HTTP/);await assert.rejects(apps.browser('powershell','https://example.com/'),/Choose/);}finally{fs.rmSync(folder,{recursive:true,force:true});}
 for(const url of ['javascript:alert(1)','file:///C:/a','https://a:b@example.com/','https://example.com/ x'])assert.equal(website(url),null);
});
test('multi-step app interaction observes after every action, drafts, reviews, submits and verifies',async()=>{
 const f=fixture([{action:'navigate',url:'https://chatgpt.com/',plan:['Open ChatGPT','Draft hi','Send and verify']},{action:'type',target:'input',text:'hi'},{action:'click',target:'send',label:'Send hi'},{action:'done',message:'Sent hi.'}]);
 const pending=f.engine.run('Open ChatGPT and say hi');for(let i=0;i<30&&!f.events.some(x=>x.phase==='review');i++)await tick();const review=f.events.find(x=>x.phase==='review');assert.ok(review);assert.equal(review.review.text,'hi');assert.equal(f.calls.filter(x=>x.op==='agent.act').length,1);
 assert.throws(()=>f.engine.confirm({id:review.id,approval:'stale',allow:true}),/expired/);f.engine.confirm({id:review.id,approval:review.review.id,allow:true});assert.equal(await pending,'Sent hi.');
 assert.deepEqual(f.calls.map(x=>x.op),['url','agent.observe','agent.act','agent.observe','agent.act','agent.observe']);assert.equal(f.calls[2].args.snapshot,'snapshot-0');assert.equal(f.calls[4].args.snapshot,'snapshot-1');assert.equal(f.engine.active,null);
});
test('declining or cancelling a review never submits the drafted message',async()=>{
 for(const cancel of [false,true]){const f=fixture([{action:'observe'},{action:'click',target:'send'}]),pending=f.engine.run('Send hi');const rejected=cancel?pending:assert.rejects(pending,/declined/);for(let i=0;i<30&&!f.events.some(x=>x.phase==='review');i++)await tick();const review=f.events.find(x=>x.phase==='review');if(cancel)f.engine.cancel(review.id);else f.engine.confirm({id:review.id,approval:review.review.id,allow:false});const result=await rejected;if(cancel)assert.match(result,/stopped/);assert.equal(f.calls.filter(x=>x.op==='agent.act').length,0);assert.equal(f.engine.active,null);}
});
test('ordinary conversation uses no Windows inspection or actions',async()=>{const f=fixture([{action:'answer',message:'Hello!'}]);assert.equal(await f.engine.run('Hi'),'Hello!');assert.equal(f.calls.length,0);});
test('a model cannot report a finished Windows task without an observation',async()=>{const f=fixture([{action:'done',message:'Opened it.'}]);await assert.rejects(f.engine.run('Open something'),/could not be verified/);assert.equal(f.calls.length,0);});
test('simple polite launch commands take the direct path without a model, and voice noise does not erase meaningful text',async()=>{let calls=0;const run=createCommands({apps:{open:async app=>{calls++;assert.equal(app,'Chrome');return'Opened Chrome.';}}});assert.equal(await run('Could you open Chrome please?'),'Opened Chrome.');assert.equal(calls,1);assert.equal(cleanCommandTranscript('[BLANK_AUDIO] open Chrome (for work)'),'open Chrome (for work)');assert.equal(cleanCommandTranscript('(silence)'),'');assert.ok(isStopRequest('Please stop the Windows task.'));assert.ok(!isStopRequest('stopwatch for ten minutes'));assert.ok(!isStopRequest('explain how to stop a task'));});
test('invalid model JSON, unsupported operations and invented targets do not reach native input',async()=>{
 assert.throws(()=>decode('not JSON'),/invalid/);assert.throws(()=>decode('{"action":"shell","command":"format"}'),/unsupported/);
 const f=fixture([{action:'observe'},{action:'click',target:'invented'},{action:'answer',message:'Could not find the button.'}]);assert.match(await f.engine.run('Click a missing button'),/Could not/);assert.equal(f.calls.filter(x=>x.op==='agent.act').length,0);
});
test('bounded recovery stops after three failures and never claims completion',async()=>{
 const f=fixture([{action:'observe'},{action:'click',target:'input'},{action:'click',target:'input'},{action:'click',target:'input'}],{native:{request:async op=>{if(op==='agent.observe')return{id:'s',controls:[{id:'input',name:'Next',role:'Button'}]};throw new Error('The control changed.');}}});await assert.rejects(f.engine.run('Click Next'),/Inspect|control|inspection/i);assert.equal(f.events.at(-1).phase,'error');
});
test('Stop during a provider turn cancels before any action, concurrent tasks are refused',async()=>{
 let release;const f=fixture([],{ask:()=>new Promise(resolve=>release=resolve)});const pending=f.engine.run('Open an app');await assert.rejects(f.engine.run('Other task'),/Another Windows task/);f.engine.cancel();release('{"action":"launch","app":"Notepad"}');assert.match(await pending,/stopped/);assert.equal(f.calls.length,0);
});
test('review policy covers sending, destructive controls, Enter and model-requested reviews',()=>{for(const name of ['Send','Delete file','Pay now','Uninstall','Allow access'])assert.ok(needsReview({action:'click'},{name}));assert.ok(needsReview({action:'press',keys:'enter'},{}));assert.ok(needsReview({action:'click',review:true},{name:'Next'}));assert.ok(!needsReview({action:'click'},{name:'Next'}));});
test('review shows the current draft and refuses truncated input',async()=>{
 for(const truncated of [false,true]){const f=fixture([{action:'observe'},{action:'click',target:'send'},{action:'answer',message:'Draft too long; nothing sent.'}],{native:{request:async()=>({id:'view',app:'Fixture',controls:[{id:'input',name:'Message',editable:true,focused:true,value:'existing draft',truncated},{id:'send',name:'Send',role:'Button'}]})}});const pending=f.engine.run('Send the existing draft');for(let i=0;i<30&&!f.events.some(x=>x.phase==='review')&&f.engine.active;i++)await tick();if(!truncated){const review=f.events.find(x=>x.phase==='review');assert.equal(review.review.text,'existing draft');f.engine.confirm({id:review.id,approval:review.review.id,allow:false});await assert.rejects(pending,/declined/);}else{assert.match(await pending,/too long/);assert.ok(!f.events.some(x=>x.phase==='review'));}}
});
test('large visible UI context stays valid JSON and retains editable controls',()=>{const view={windows:[],controls:Array.from({length:140},(_,i)=>({id:String(i),name:'x'.repeat(500),editable:i===139,value:'y'.repeat(2000)}))};const text=contextFor('Write hi',[],[],view);assert.ok(text.length<=19800);assert.equal(JSON.parse(text).observation.controls[0].id,'139');assert.equal(view.controls[0].name.length,500);});
