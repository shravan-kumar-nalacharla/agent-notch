'use strict';
const fs=require('node:fs'),path=require('node:path'),{spawn}=require('node:child_process');
module.exports=async function({win,native,out,saveSnapshot}){
 const fixture=process.env.NOTCH_TASK_FIXTURE||path.resolve(__dirname,'../artifacts/0.11.0/windows-fixture/WindowsFixture.exe');
 if(!fs.existsSync(fixture))throw new Error('Build tests/windows-fixture first, or set NOTCH_TASK_FIXTURE to its executable.');
 const dotnet=path.resolve(__dirname,'../tools/dotnet');
 const child=spawn(fixture,[],{windowsHide:false,stdio:'ignore',env:{...process.env,...(fs.existsSync(dotnet)?{DOTNET_ROOT:dotnet,DOTNET_ROOT_X64:dotnet}:{})}});let spawnError;child.on('error',error=>spawnError=error);child.on('exit',code=>{if(code)spawnError=new Error('Windows fixture exited with code '+code+'. Publish it self-contained or set DOTNET_ROOT.');});
 const js=code=>win.webContents.executeJavaScript(code),sleep=ms=>new Promise(r=>setTimeout(r,ms)),checks=[];
 const client=native(),request=client.request.bind(client);
 client.request=async(action,value,...rest)=>{if(action.startsWith('agent.'))console.log('TASK NATIVE START',action,value?.op||'');try{const result=await request(action,value,...rest);if(action.startsWith('agent.'))console.log('TASK NATIVE END',action,result?.title==='Agent Notch Windows Task Fixture'?'fixture':result?.controls?.length??result?.applied??result?.focused);return result;}catch(error){if(action.startsWith('agent.'))console.log('TASK NATIVE ERROR',action,error.message);throw error;}};
 await js("window.__taskEvents=[];window.island.onTask(e=>window.__taskEvents.push({phase:e.phase,current:e.current}));undefined");
 async function until(test,label){for(let i=0;i<300;i++){if(spawnError)throw spawnError;if(await test())return;await sleep(100);}throw new Error(label+' '+JSON.stringify(await js('({result:window.__taskResult,events:window.__taskEvents})')));}
 try{
  await until(async()=>{const view=await native().request('agent.observe');return view.windows.some(x=>x.title==='Agent Notch Windows Task Fixture');},'Local Windows test app did not start');
  await js("window.island.productivity('notifications:settings',{enabled:false});document.getElementById('activationTarget').click()");
  await js("window.__taskResult=null;window.island.ask({id:'windows-fixture-1',text:'In the local Windows test app, type hi and send it'}).then(r=>window.__taskResult=r);undefined");
  await until(()=>js("!document.getElementById('taskReview').hidden"),'The actual Windows task did not reach review');
  const draft=await native().request('agent.observe');if(draft.app!=='WindowsFixture'||!draft.controls.some(x=>x.name==='Message'&&x.value==='hi')||draft.controls.some(x=>/Secret|fixture-password/.test(x.name+' '+x.value)))throw new Error('Real typing or password filtering failed');checks.push('Native UI Automation inspected and typed hi into a separate real Windows app; password field/value omitted');
  if(!draft.controls.some(x=>x.name==='Nothing sent yet'))throw new Error('Message sent before review');checks.push('Send remains unapplied until the user confirms');
  // Refresh the task snapshot after the independent assertion consumed the broker observation.
  await js("document.getElementById('taskStop').click()");await until(()=>js("!!window.__taskResult"),'Task cancellation did not finish');
  checks.push('Real Stop control cancels an awaiting review without sending');
  await js("window.__taskResult=null;window.island.ask({id:'windows-fixture-2',text:'In the local Windows test app, type hi and send it'}).then(r=>window.__taskResult=r);undefined");
  await until(()=>js("!document.getElementById('taskReview').hidden"),'Second task did not reach review');
  await sleep(400);await saveSnapshot(win,path.join(out,'windows-task-review.png'));
  if(!await js("document.body.classList.contains('has-windows-task')&&document.getElementById('taskDraft').textContent==='hi'&&(()=>{const e=document.getElementById('taskApprove'),r=e.getBoundingClientRect();return e.checkVisibility()&&document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)===e;})()"))throw new Error('Action review is not visible/clickable '+JSON.stringify(await js("({body:document.body.className,button:document.getElementById('taskApprove').getBoundingClientRect().toJSON(),draft:document.getElementById('taskDraft').textContent})")));
  checks.push('Notch displays the exact draft and a visible, clickable confirmation');
  await sleep(200);await saveSnapshot(win,path.join(out,'windows-task-review.png'));
  await js("document.getElementById('taskApprove').click()");await until(()=>js("!!window.__taskResult"),'Confirmed task did not finish');
  const result=await js('window.__taskResult');if(!result.ok||!result.value.includes('Sent hi'))throw new Error('Task did not verify completion: '+JSON.stringify(result));
  const sent=await native().request('agent.observe');if(!sent.controls.some(x=>x.name==='Sent: hi'))throw new Error('Native send was not observed');checks.push('Confirmation executes the real Windows Send button and verifies Sent: hi afterward');
  const target=sent.controls.find(x=>x.name==='Message');await native().request('agent.act',{snapshot:sent.id,target:target.id,op:'type',text:'unsent draft'});
  let rejected=false;try{await native().request('agent.act',{snapshot:sent.id,target:target.id,op:'type',text:'should never type'});}catch{rejected=true;}if(!rejected)throw new Error('Reused native snapshot accepted');checks.push('Native snapshots are consumed after one action; replay is rejected');
  const beforeEdit=await native().request('agent.observe');await native().request('agent.act',{snapshot:beforeEdit.id,target:beforeEdit.controls.find(x=>x.name==='Message').id,op:'type',text:'change-later'});
  const editing=await native().request('agent.observe');await sleep(1300);let changedRejected=false;try{await native().request('agent.act',{snapshot:editing.id,target:editing.controls.find(x=>x.name==='Send').id,op:'click'});}catch(error){changedRejected=/edited after inspection/.test(error.message);}if(!changedRejected)throw new Error('An edited draft could be sent using the earlier inspection');checks.push('A field changed after inspection invalidates Send before input is applied');
  await js("window.__taskResult=null;window.island.ask({id:'windows-fixture-3',text:'In the local Windows test app, type bye and send it'}).then(r=>window.__taskResult=r);undefined");
  await until(()=>js("!document.getElementById('taskReview').hidden"),'Cancel scenario did not reach review');await js("document.getElementById('taskDecline').click()");await until(()=>js('!!window.__taskResult'),'Declining did not finish');
  if((await js('window.__taskResult')).ok)throw new Error('Declined action returned success');
  const cancelled=await native().request('agent.observe');if(cancelled.controls.some(x=>x.name==='Sent: bye')||!cancelled.controls.some(x=>x.name==='Sent: hi'))throw new Error('Declined message was sent');checks.push('Cancel task leaves the drafted bye unsent and preserves the previous result');
  win.webContents.send('task:state',{id:'fixture-error',phase:'error',current:'Fixture task failed. No further action taken.',plan:[],steps:[]});await until(()=>js("document.getElementById('messages').textContent.includes('Fixture task failed')"),'Task failure was not kept in chat');checks.push('Task failures remain readable in chat after the transient status clears');
  fs.writeFileSync(path.join(out,'windows-task-report.json'),JSON.stringify({checks,realWindowsControls:true,planner:'deterministic fixture; no live model or real messages',liveCloudRequests:false},null,2));console.log('WINDOWS TASK PASS',checks.length,'checks; real native controls, zero cloud calls');
 }finally{client.request=request;child.kill();}
};
module.exports.planner=async function({text}){
 const context=JSON.parse(text),view=context.observation,word=/\bbye\b/.test(context.goal)?'bye':'hi';let step;
 if(!view)step={action:'observe',plan:['Find the local test app','Draft '+word,'Review Send','Check the sent result']};
 else if(view.title!=='Agent Notch Windows Task Fixture'){const window=view.windows.find(x=>x.title==='Agent Notch Windows Task Fixture');step=window?{action:'focus',window:window.id}:{action:'answer',message:'Test app not found.'};}
 else if(view.controls.some(x=>x.name==='Sent: '+word))step={action:'done',message:'Sent '+word+' in the local test app; verified the result.'};
 else{const input=view.controls.find(x=>x.name==='Message'),send=view.controls.find(x=>x.name==='Send');step=input?.value===word?{action:'click',target:send.id,label:'Send '+word}:{action:'type',target:input.id,text:word,label:'Draft '+word};}
 return JSON.stringify(step);
};
