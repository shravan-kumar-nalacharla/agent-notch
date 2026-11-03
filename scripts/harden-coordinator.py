from pathlib import Path
root=Path(__file__).resolve().parents[1]
def edit(name,a,b):
 p=root/name;s=p.read_text(encoding='utf-8');assert a in s,name+': '+a[:70];s=s.replace(a,b);p.write_text(s,encoding='utf-8')
for p in (root/'src').rglob('*'):
 if p.is_file() and p.suffix in {'.js','.cjs','.css','.html'}:
  s=p.read_text(encoding='utf-8');
  if '\x08' in s:p.write_text(s.replace('\x08',r'\b'),encoding='utf-8')
edit('src/intent-router.cjs',"const search=/", "if(/^(?:actually|instead|correction|no[, ])/i.test(text))return{intent:'correction',searchQuery};\n const search=/")
edit('src/task-coordinator.cjs',"if(route.intent==='conversation'&&!parseCommand(goal))", "if((route.intent==='conversation'||route.intent==='correction'&&!active)&&!parseCommand(goal))")
edit('src/task-coordinator.cjs',"if(!active)return nativeTask.cancel(id);", "if(!active){if(recovered&&(!id||id===recovered.id)){recovered=null;storage?.set('agent-task',null).catch(()=>{});last={...last,phase:'cancelled',current:'Interrupted task discarded.'};emit('task:state',last);return true;}return nativeTask.cancel(id);}")
edit('src/task-coordinator.cjs',"if(!active||id&&id!==active.id)return false;active.paused", "if(!active||id&&id!==active.id&&id!==nativeTask.active)return false;active.paused")
edit('src/task-coordinator.cjs',"async function hold(task,message,phase='paused',extra={}){task.paused=true;update(task,phase,message,extra);await checkpoint(task);show();await new Promise", "async function hold(task,message,phase='paused',extra={}){task.signal.throwIfAborted();task.paused=true;const waiting=new Promise")
edit('src/task-coordinator.cjs',"resolve();};});task.waiter=null;", "resolve();};});update(task,phase,message,extra);await checkpoint(task);show();await waiting;task.waiter=null;")
edit('src/task-coordinator.cjs',"result=await nativeTask.run(goal,{signal});", "result=await nativeTask.run(goal,{signal,beforeStep:async()=>{if(task.paused)await hold(task,'Task paused. Press Continue when ready.');}});")
edit('src/windows-task.cjs',"async function run(goal,{signal}={})", "async function run(goal,{signal,beforeStep=async()=>{}}={})")
edit('src/windows-task.cjs',"combined.throwIfAborted();const config=getConfig();", "combined.throwIfAborted();await beforeStep();combined.throwIfAborted();const config=getConfig();")
edit('src/task-coordinator.cjs',"async function apiFlow(task,route){", "async function apiFlow(task,route){await pausePoint(task);")
edit('src/task-coordinator.cjs',"if(!verifyApiKeys(observation,{origin:apiOrigin})){const link=", "await pausePoint(task);if(!verifyApiKeys(observation,{origin:apiOrigin})){const link=")
edit('src/task-coordinator.cjs',"async function apiFlow", "async function pausePoint(task){task.signal.throwIfAborted();if(task.paused)await hold(task,'Task paused. Press Continue when ready.');}\n async function apiFlow")
edit('src/task-coordinator.cjs',"then(()=>runOnce(corrected,{...options,taskId:previous.id,resumeUrl:checkpointUrl,steps},routeIntent(corrected)));}else result=runOnce(goal,options,route);if(active)active.result=result;", "then(()=>{const next=runOnce(corrected,{...options,taskId:previous.id,resumeUrl:checkpointUrl,steps},routeIntent(corrected));if(active)active.result=next;return next;});}else{result=runOnce(goal,options,route);if(active)active.result=result;}")
