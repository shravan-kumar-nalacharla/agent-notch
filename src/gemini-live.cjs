'use strict';
const MODEL='gemini-3.8-live';
const ENDPOINT='wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent';

// The key and socket stay in the main process; only PCM and transcripts cross IPC.
function createLiveClient({key,instruction,onContent,onError,onToolCall,onDesktopTask,onDesktopCancel,WebSocketImpl=globalThis.WebSocket}){
  let socket,ready=false,closed=false,settled=false,timer,rejectConnect;
  const safe=message=>String(message).split(key).join('[redacted]').replace(/AIza[\w-]+/g,'[redacted]').slice(0,500);
  const toolResults=new Map();
  const declarations=[];
  if(onToolCall)declarations.push({name:'prepare_productivity_action',description:'Prepare a reading, course, workout, water or chosen Spotify-playlist action for on-screen user confirmation. This never executes the action. Use the exact user request.',parameters:{type:'OBJECT',properties:{request:{type:'STRING'}},required:['request']}});
  if(onDesktopTask)declarations.push({name:'execute_windows_task',behavior:'NON_BLOCKING',description:'Carry out a Windows task with multiple steps: open apps or websites, inspect real controls, enter text and interact with apps. Use the exact current user request. Call immediately for a launch request, before a long spoken acknowledgment. The task runs while you can keep talking; only report success after its result. Sending or destructive actions need review in Agent Notch. Never use for a hypothetical or a normal question.',parameters:{type:'OBJECT',properties:{request:{type:'STRING'}},required:['request']}});
  if(onDesktopCancel)declarations.push({name:'stop_windows_task',behavior:'NON_BLOCKING',description:'Stop the current Windows task when the user asks to stop or cancel it.',parameters:{type:'OBJECT',properties:{}}});
  const tools=declarations.length?[{functionDeclarations:declarations}]:undefined;
  function close(){if(closed)return;closed=true;ready=false;clearTimeout(timer);if(!settled){settled=true;rejectConnect?.(new Error('Gemini Live connection cancelled.'));}try{socket?.close();}catch{}}
  function fail(message){if(closed)return;const error=new Error(safe(message));if(!settled){settled=true;rejectConnect?.(error);}close();onError(error);}
  return {
    connect(){return new Promise((resolve,reject)=>{
      rejectConnect=reject;
      timer=setTimeout(()=>fail('Gemini Live timed out. Check your internet connection and Gemini API access.'),15000);
      try{socket=new WebSocketImpl(ENDPOINT+'?key='+encodeURIComponent(key));socket.binaryType='arraybuffer';}catch{fail('Gemini Live could not connect. Check your connection.');return;}
      socket.addEventListener('open',()=>{if(closed)return;socket.send(JSON.stringify({setup:{model:'models/'+MODEL,generationConfig:{responseModalities:['AUDIO'],speechConfig:{voiceConfig:{prebuiltVoiceConfig:{voiceName:'Kore'}}}},systemInstruction:{parts:[{text:instruction}]},...(tools?{tools}:{}),inputAudioTranscription:{},outputAudioTranscription:{},realtimeInputConfig:{automaticActivityDetection:{silenceDurationMs:900}},contextWindowCompression:{slidingWindow:{}}}}));});
      socket.addEventListener('message',event=>{
        if(closed)return;
        try{
          const raw=typeof event.data==='string'?event.data:Buffer.from(event.data).toString('utf8');
          if(raw.length>8_000_000)throw new Error('Gemini Live response was too large.');
          const message=JSON.parse(raw);
          if(message.error){fail('Gemini Live: '+(message.error.message||message.error.status||'request rejected')+'. Check your Gemini key, model access and quota in Google AI Studio.');return;}
          if(message.setupComplete){if(ready)return;ready=true;settled=true;clearTimeout(timer);resolve();}
          if(message.serverContent&&ready)onContent(message.serverContent);
          if(message.toolCall&&ready&&tools){for(const call of(message.toolCall.functionCalls||[]).slice(0,8)){if(typeof call.id!=='string'||call.id.length>100)continue;let result=toolResults.get(call.id);if(!result){result=Promise.resolve().then(()=>{if(closed)throw new Error('Conversation stopped.');if(toolResults.size>100)throw new Error('Too many actions in this conversation.');const handler=call.name==='prepare_productivity_action'?onToolCall:call.name==='execute_windows_task'?onDesktopTask:call.name==='stop_windows_task'?onDesktopCancel:null;if(!handler||(call.name!=='stop_windows_task'&&(typeof call.args?.request!=='string'||call.args.request.length>3000)))throw new Error('Unsupported action request.');return handler(call.args.request);}).catch(error=>({status:'not_applied',message:safe(error.message)}));toolResults.set(call.id,result);}result.then(response=>{if(!closed&&ready)socket.send(JSON.stringify({toolResponse:{functionResponses:[{id:call.id,name:call.name,...(call.name==='execute_windows_task'||call.name==='stop_windows_task'?{scheduling:'WHEN_IDLE'}:{}),response:response||{status:'not_applied',message:'No matching action.'}}]}}));}).catch(()=>{});}}
          if(message.goAway)fail('Gemini Live session is ending. Press the microphone to start a new conversation.');
        }catch(error){fail(error.message==='Gemini Live response was too large.'?error.message:'Gemini Live returned an unreadable response.');}
      });
      socket.addEventListener('error',()=>fail('Gemini Live could not connect. Check your internet connection, Gemini API key and project access.'));
      socket.addEventListener('close',event=>{if(!closed)fail('Gemini Live disconnected ('+event.code+'): '+(event.reason||'connection closed')+'. Check model access and quota in Google AI Studio, then retry.');});
    });},
    sendAudio(data){if(!ready||closed)return;if(socket.bufferedAmount>256000){fail('Gemini Live upload fell behind. Check your connection and retry.');return;}socket.send(JSON.stringify({realtimeInput:{audio:{data,mimeType:'audio/pcm;rate=16000'}}}));},
    close
  };
}
module.exports={MODEL,createLiveClient};
