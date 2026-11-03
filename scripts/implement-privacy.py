from pathlib import Path
root=Path(__file__).resolve().parents[1]
def edit(name, changes):
 p=root/name; s=p.read_text(encoding='utf-8-sig')
 for before,after in changes:
  if before not in s: raise Exception('Missing '+name+': '+before[:100])
  s=s.replace(before,after)
 p.write_text(s,encoding='utf-8')
edit('native/IslandNative/Program.cs',[
 ('"ping","system"','"privacy.configure","privacy.status","privacy.calls","privacy.ptt","ping","system"'),
 ('var copy=line;','var copy=line;\n                try{using var urgent=JsonDocument.Parse(copy);if(S(urgent.RootElement,"action")=="privacy.configure"&&urgent.RootElement.TryGetProperty("value",out var pv)&&B(pv,"blocked",true))PrivacyBlocked=true;}catch{}'),
 ('ReminderSound?.Dispose();','StopMicrophone(); ReminderSound?.Dispose();'),
 ('if(samples.Length==0)return;','if(PrivacyBlocked||samples.Length==0)return;'),
 ('if(Capture!=null) { var elapsed','if(PrivacyBlocked&&Capture!=null){StopMicrophone();return;}\n            if(Capture!=null) { var elapsed'),
 ('if(MeetingMic!=null)throw new Exception("Stop the meeting recording before starting voice.");','RequireMicrophone();var privacyGeneration=PrivacyEpoch;\n        if(MeetingMic!=null)throw new Exception("Stop the meeting recording before starting voice.");'),
 ('SessionId=Guid.NewGuid()', 'RequireMicrophone();if(privacyGeneration!=PrivacyEpoch||kind=="ptt"&&Ptt?.Held!=true)throw new Exception("Recording activation expired.");\n        SessionId=Guid.NewGuid()'),
 ('ChatOnSilence){','ChatOnSilence){'),
 ('if(AudioMath.IsSilent(samples))return;','if(PrivacyBlocked||AudioMath.IsSilent(samples))return;'),
 ('if(Capture==null)return;var id=SessionId;', 'if(PrivacyBlocked){CancelVoice();return;}if(Capture==null)return;var id=SessionId;'),
 ('if(id==SessionId&&!VoiceCancelled)Emit','if(!PrivacyBlocked&&id==SessionId&&!VoiceCancelled)Emit'),
 ('switch(action)\n        {','switch(action)\n        {\n            case "privacy.configure":return ConfigurePrivacy(v);\n            case "privacy.status":return PrivacyState();\n            case "privacy.calls":return await CallingMicrophones(v);\n            case "privacy.ptt":return ConfigurePtt(v);'),
 ('if(B(v,"enabled")){var hk=', 'if(!PrivacyBlocked&&ListeningMode!="ptt"&&B(v,"enabled")){var hk='),
 ('case "voice.start": var voiceKind=', 'case "voice.start": RequireMicrophone();if(ListeningMode=="ptt")throw new Exception("Hold the push-to-talk key.");var voiceKind='),
 ('case "voice.insert":\n', 'case "voice.insert":\n                RequireMicrophone();\n'),
 ('case "meeting.start": if(', 'case "meeting.start": RequireMicrophone();if(ListeningMode=="ptt")throw new Exception("Use manual mode for meeting recording.");if('),
 ('case "speak": return Speak', 'case "speak": RequireMicrophone();return Speak'),
 ('static object DrainMeeting() { var mic=', 'static object DrainMeeting() { RequireMicrophone();var mic='),
])
edit('native/IslandNative/WakeWord.cs',[
 ('if(!B(value,"enabled"))return', 'if(PrivacyBlocked||ListeningMode!="always"||!B(value,"enabled"))return'),
 ('if(WakePaused||Capture!=null', 'if(PrivacyBlocked||ListeningMode!="always"||WakePaused||Capture!=null')])
edit('native/IslandNative/Desktop.cs',[
 ('var type=Type.GetTypeFromProgID("SAPI.SpVoice");if(type==null)throw new Exception("Windows speech is unavailable.");dynamic voice=Activator.CreateInstance(type)!;voice.Speak(text,1);return true;', 'RequireMicrophone();VoiceOutput??=new System.Speech.Synthesis.SpeechSynthesizer();VoiceOutput.SpeakAsync(text);return true;')])
edit('src/voice-main.cjs',[
 ("prepareProductivity=null})", "prepareProductivity=null,privacy=null})"),
 ("async function startLive(){", "async function startLive(){\n    privacy?.assertAllowed({capture:true});"),
 ("async function transcription(audio,mime='audio/wav',snapshot=getState(),signal){", "async function transcription(audio,mime='audio/wav',snapshot=getState(),signal){privacy?.assertAllowed();"),
 ("if(event.kind==='command'||event.kind==='chat'){", "if(event.kind==='command'||event.kind==='chat'||event.kind==='ptt'){"),
 ("event.kind==='chat'||event.kind==='command'?", "event.kind==='chat'||event.kind==='command'||event.kind==='ptt'?"),
 ("event.kind==='command'||event.kind==='chat'?'command'", "event.kind==='command'||event.kind==='chat'||event.kind==='ptt'?'command'"),
 ("runCommand(raw,{signal:session.controller.signal})", "runCommand(raw,{signal:session.controller.signal,source:'voice',utteranceId:event.id})"),
 ("native.on('event',event=>{", "native.on('event',event=>{\n    if(privacy?.view().blocked&&event.type.startsWith('voice.')){if(event.type==='voice.begin')native.request('voice.cancel').catch(()=>{});return;}"),
 ("handle('native:voice',async value=>{", "handle('native:voice',async value=>{\n    if(['start','insertDraft'].includes(value?.op))privacy?.assertAllowed({capture:value.op==='start'});\n    if(value?.op==='configure'&&privacy)throw new Error('Save voice preferences in Settings.');"),
 ("if(value?.op==='start'&&(live", "if(value?.op==='start')privacy?.assertAllowed({capture:true});\n    if(value?.op==='start'&&(live"),
 ("let meeting=null,meetingTimer=null,meetingBusy=false", "let meeting=null,meetingTimer=null,meetingBusy=false"),
 ("const sessions=new Map(),drafts=new Map();let meeting=null,meetingTimer=null,meetingBusy=false;", "const sessions=new Map(),drafts=new Map();let meeting=null,meetingTimer=null,meetingBusy=false,meetingController=new AbortController();"),
 ("if(!meeting||meetingBusy)return;meetingBusy=true;", "if(!meeting||meetingBusy)return;const current=meeting;meetingBusy=true;"),
 ("transcription(audio[key]);meeting.lines.push", "transcription(audio[key],'audio/wav',getState(),meetingController.signal);if(meeting!==current)return;meeting.lines.push"),
 ("meeting.errors.push(e.message)", "if(meeting===current)meeting.errors.push(e.message)"),
 ("emit('meeting:state',meeting);}finally", "if(meeting===current)emit('meeting:state',meeting);}finally"),
 ("meeting={id:randomUUID()", "meetingController=new AbortController();meeting={id:randomUUID()"),
 ("while(meetingBusy)await new Promise(r=>setTimeout(r,100));await drainMeeting(true);const finished=meeting;", "while(meetingBusy){if(!meeting)throw new Error('Meeting cancelled.');await new Promise(r=>setTimeout(r,100));}await drainMeeting(true);if(!meeting)throw new Error('Meeting cancelled.');const finished=meeting;"),
 ("model:s.models[s.assistant]?.chat});}catch(e){notes=", "model:s.models[s.assistant]?.chat,signal:meetingController.signal});}catch(e){notes="),
 ("if(finished.errors.length)notes+=", "if(meetingController.signal.aborted)return null;if(finished.errors.length)notes+="),
 ("return{stop(){stopLive();clearInterval(meetingTimer);for(const session of sessions.values()){session.cancelled=true;session.controller.abort();}sessions.clear();drafts.clear();}};", "return{stop(){stopLive();meetingController.abort();clearInterval(meetingTimer);meeting=null;emit('meeting:state',null);for(const session of [...sessions.values(),...drafts.values()]){session.cancelled=true;session.controller.abort();}sessions.clear();drafts.clear();status({phase:'idle'});}};")
])
