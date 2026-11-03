from pathlib import Path
root=Path(__file__).resolve().parents[1]
p=root/'src/voice-main.cjs';s=p.read_text(encoding='utf-8')
def replace(a,b):
 global s
 assert a in s,a[:100];s=s.replace(a,b)
replace("const {randomUUID}=require('node:crypto');", "const {randomUUID}=require('node:crypto');\nconst {routeIntent}=require('./intent-router.cjs');\nconst {parseCommand}=require('./commands.cjs');")
replace("turn:0,state:s,controller:new AbortController()", "turn:0,state:s,controller:new AbortController(),uid:randomUUID(),jobs:new Map(),pendingAudio:[],audioBytes:0")
replace("const instruction=language===", "function dispatch(request,turn=session.turn){privacy?.assertAllowed();if(live!==session)return Promise.reject(new Error('Conversation stopped.'));let job=session.jobs.get(turn);if(!job){status({phase:'liveInterrupt',id:session.id});job=Promise.resolve().then(()=>runWindowsTask(request,{signal:session.controller.signal,source:'gemini_live',utteranceId:session.uid+':'+turn}));session.jobs.set(turn,job);job.catch(()=>{});}return job;}\n    const instruction=language===")
replace("onDesktopTask:runWindowsTask?async request=>({status:'result',message:await runWindowsTask(request,{signal:session.controller.signal})}):undefined", "onDesktopTask:runWindowsTask?async request=>({status:'tool_result',message:await dispatch(request)}):undefined")
replace("if(content.interrupted)status({phase:'liveInterrupt',id:session.id});", "if(content.interrupted){session.pendingAudio=[];session.audioBytes=0;status({phase:'liveInterrupt',id:session.id});}")
replace("if(session.raw||session.text)status({phase:'liveText',id:session.id,turn:session.turn,raw:session.raw,text:session.text});", "const route=routeIntent(session.raw),action=!!runWindowsTask&&(route.intent!=='conversation'||!!parseCommand(session.raw)||session.jobs.has(session.turn));\n      if(session.raw||session.text)status({phase:'liveText',id:session.id,turn:session.turn,raw:session.raw,text:action?'Working on your request.':session.text});")
replace("status({phase:'liveAudio',id:session.id,audio:audio.data,rate:24000,volume:s.companion?.volume??1});", "{session.audioBytes+=audio.data.length;if(session.audioBytes<=8_000_000)session.pendingAudio.push(audio.data);}")
a="""if(session.raw||session.text){library.action('history:add',{kind:'command',raw:session.raw,text:session.text,app:'Gemini Live',recognizedLanguage:localization.detectLanguage(session.raw),responseLanguage:localization.responseLanguage(s.languages,session.raw)});emit('library:changed',library.view());}
        status({phase:'liveTurn',id:session.id});session.raw='';session.text='';session.turn++;"""
b="""const turn=session.turn,raw=session.raw,text=session.text,audio=session.pendingAudio;session.pendingAudio=[];session.audioBytes=0;
        const finish=answer=>{if(live!==session||session.controller.signal.aborted)return;status({phase:'liveText',id:session.id,turn,raw,text:answer});if(raw||answer){library.action('history:add',{kind:'command',raw,text:answer,app:'Gemini Live',recognizedLanguage:localization.detectLanguage(raw),responseLanguage:localization.responseLanguage(s.languages,raw)});emit('library:changed',library.view());}};
        if(action&&raw&&!content.interrupted){dispatch(raw,turn).then(answer=>{finish(answer);if(s.speak&&live===session)speak(answer);},error=>finish('Task incomplete: '+error.message));}
        else{for(const data of audio)if(!content.interrupted)status({phase:'liveAudio',id:session.id,audio:data,rate:24000,volume:s.companion?.volume??1});finish(text);}
        status({phase:'liveTurn',id:session.id});session.raw='';session.text='';session.turn++;"""
replace(a,b)
replace("if(privacy?.view().blocked&&event.type.startsWith('voice.'))", "if(privacy?.view().blocked&&event.type.startsWith('voice.'))")
p.write_text(s,encoding='utf-8')
p=root/'src/task-coordinator.cjs';s=p.read_text(encoding='utf-8').replace("route.intent!=='multi_step_action'&&parseCommand(goal)&&!AI_STUDIO.test(goal)","(route.intent==='search_only'||route.intent!=='multi_step_action'&&parseCommand(goal)&&!AI_STUDIO.test(goal))")
p.write_text(s,encoding='utf-8')
