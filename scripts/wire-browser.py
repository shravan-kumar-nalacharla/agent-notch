from pathlib import Path
import json
root=Path(__file__).resolve().parents[1]
def edit(name,changes):
 p=root/name;s=p.read_text(encoding='utf-8-sig')
 for a,b in changes:
  if a not in s:
   if b in s:continue
   raise Exception(name+': '+a[:120])
  s=s.replace(a,b)
 p.write_text(s,encoding='utf-8')
edit('native/IslandNative/Privacy.cs', [('using var devices=enumerator.EnumerateAudioEndPoints','var devices=enumerator.EnumerateAudioEndPoints')])
edit('src/main.cjs',[
 ('let lastGuide,guideOverlay,windowsTask;', 'let lastGuide,guideOverlay,windowsTask,taskCoordinator;'),
 ("const runAssistant=async(text,options={})=>{if(isStopRequest(text))return windowsTask.cancel()?'Task stopped. Earlier completed steps were kept.':'No Windows task is running.';if(quoteActivity.locked)throw new Error('Unlock Windows before running a task.');if(windowsTask.active)throw new Error('Another Windows task is running. Stop it first.');options.signal?.throwIfAborted();const command=await runCommand(text);options.signal?.throwIfAborted();return command??windowsTask.run(text,options);};", "const browser=require('./browser-controller.cjs').createBrowserController({folder:app.getPath('userData'),runtime:app.isPackaged?path.join(process.resourcesPath,'agent-browsers'):path.join(__dirname,'../tools/agent-browsers')});\n    taskCoordinator=require('./task-coordinator.cjs').createTaskCoordinator({browser,nativeTask:windowsTask,runCommand,ask:chat,getConfig:()=>({provider:state.assistant,key:key(state.assistant),model:state.models[state.assistant]?.chat,thinking:state.deepseek.thinking}),storage:require('./integration-secrets.cjs').createIntegrationSecrets({folder:app.getPath('userData'),safeStorage}),emit:widgets.emit,show:()=>{if(liveContents(win)){userHidden=false;win.showInactive();}},traceFile:path.join(app.getPath('userData'),'task-diagnostics.json')});\n    taskCoordinator.recover().catch(()=>{});\n    const runAssistant=async(text,options={})=>{if(quoteActivity.locked)throw new Error('Unlock Windows before running a task.');return taskCoordinator.run(text,options);};"),
 ("handle('task:cancel',id=>windowsTask.cancel(id));", "handle('task:cancel',id=>taskCoordinator.cancel(id));\n    handle('task:pause',id=>taskCoordinator.pause(id));handle('task:continue',id=>taskCoordinator.resume(id));handle('task:get',()=>taskCoordinator.view());\n    handle('task:diagnostics',async()=>{const result=await dialog.showSaveDialog(settingsWindow||win,{defaultPath:'Agent-Notch-task-diagnostics.json',filters:[{name:'JSON',extensions:['json']}]});if(result.canceled)return false;fs.writeFileSync(result.filePath,JSON.stringify(taskCoordinator.trace(),null,2));return true;});\n    handle('browser:clear',async()=>{const result=await dialog.showMessageBox(settingsWindow||win,{type:'question',buttons:['Cancel','Clear managed browser data'],defaultId:0,cancelId:0,message:'Clear Agent Notch browser data?',detail:'This removes logins and history from Agent Notch’s dedicated browser profiles. Your ordinary browser profiles are unaffected.'});if(result.response!==1)return false;taskCoordinator.cancel();await browser.clear();return true;},true);"),
 ("handle('task:confirm',value=>windowsTask.confirm(value));", "handle('task:confirm',value=>taskCoordinator.confirm(value));"),
 ("cancelWindowsTask:()=>windowsTask.cancel()", "cancelWindowsTask:()=>taskCoordinator.cancel()"),
 ("runAssistant(text,{signal:controller.signal})", "runAssistant(text,{signal:controller.signal,source:'typed',utteranceId:id})"),
 ("enabled:!privacy?.view().blocked&&state.microphone.mode==='always'&&state.companion.wakeEnabled", "enabled:!privacy?.view().blocked&&state.microphone.mode==='always'"),
 ("quitting=true;windowsTask?.cancel();", "quitting=true;taskCoordinator?.close();clearInterval(callTimer);privacy?.close();windowsTask?.cancel();"),
 ("quoteActivity.locked=true;windowsTask?.cancel();", "quoteActivity.locked=true;taskCoordinator?.cancel();windowsTask?.cancel();"),
 ("handle('gemini:setup',()=>shell.openExternal('https://aistudio.google.com/apikey'));", "handle('gemini:setup',()=>shell.openExternal('https://aistudio.google.com/api-keys'));"),
 ("if(taskCoordinator?.voiceActive)taskCoordinator.cancel();", "if(taskCoordinator?.voiceActive)taskCoordinator.cancel();"),
 ("if(shortcutsChanged)registerShortcuts();", "if(shortcutsChanged)registerShortcuts();"),
])
edit('src/integration-secrets.cjs',[("['spotify','youtube']", "['spotify','youtube','agent-task']")])
edit('src/preload.cjs',[("onTask:callback=>", "pauseTask:id=>ipcRenderer.invoke('task:pause',id),\n  continueTask:id=>ipcRenderer.invoke('task:continue',id),\n  taskState:()=>ipcRenderer.invoke('task:get'),\n  exportTaskDiagnostics:()=>ipcRenderer.invoke('task:diagnostics'),\n  clearManagedBrowser:()=>ipcRenderer.invoke('browser:clear'),\n  onTask:callback=>")])
edit('src/languages-ui.js',[("$('stopMicTest').onclick=stopMic;", "window.islandStopMicTest=stopMic;window.island.onMicrophone?.(value=>{if(value.blocked||value.mode==='ptt')stopMic();});$('stopMicTest').onclick=stopMic;"),
 ("micStream=await navigator.mediaDevices.getUserMedia({audio:true});micContext=", "micStream=await navigator.mediaDevices.getUserMedia({audio:true});const permission=await window.island.microphoneState();if(!permission.ok||permission.value.blocked||permission.value.mode==='ptt'){stopMic();throw new Error('Agent Notch microphone is muted or requires push-to-talk.');}micContext=")])
edit('src/task-coordinator.cjs',[
 ("const {randomUUID}=require('node:crypto'),", "const {parseCommand}=require('./commands.cjs');\nconst {randomUUID}=require('node:crypto'),"),
 ("route:BROWSER.test(goal)?'browser':'native'", "route:route.intent!=='multi_step_action'&&parseCommand(goal)&&!AI_STUDIO.test(goal)?'command':BROWSER.test(goal)?'browser':'native'"),
 ("if(route.intent==='conversation')return ask", "if(route.intent==='conversation'&&!parseCommand(goal))return ask"),
])
edit('src/windows-task-ui.js',[
 ("<button id=\"taskStop\"", "<button id=\"taskPause\" type=\"button\">Pause</button><button id=\"taskContinue\" type=\"button\" hidden>Continue</button><button id=\"taskStop\""),
 ("$('taskStop').onclick=", "$('taskPause').onclick=()=>window.island.pauseTask(latest?.id).then(report);$('taskContinue').onclick=()=>window.island.continueTask(latest?.id).then(report);\n $('taskStop').onclick="),
 ("window.island.onTask(value=>{", "function render(value){if(!value)return;"),
 ("['planning','running','review'].includes(value.phase)", "['planning','running','review','paused','auth','interrupted'].includes(value.phase)"),
 ("$('taskReview').hidden=value.phase!=='review';", "$('taskPause').hidden=!['planning','running'].includes(value.phase);$('taskContinue').hidden=!['paused','auth','interrupted'].includes(value.phase);$('taskReview').hidden=value.phase!=='review';"),
 (" });\n})();", " }\n window.island.onTask(render);window.island.taskState().then(reply=>{if(reply.ok)render(reply.value);});\n})();")])
p=root/'package.json';data=json.loads(p.read_text(encoding='utf-8-sig'));data['version']='0.13.0';data['build']['extraResources'].append({'from':'tools/agent-browsers','to':'agent-browsers','filter':['chromium-*/**/*','ffmpeg-*/**/*']});p.write_text(json.dumps(data,indent=2)+'\n',encoding='utf-8')
