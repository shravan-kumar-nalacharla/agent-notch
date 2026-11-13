'use strict';
((root)=>{
 const names={groq:'Groq',gemini:'Gemini',openai:'OpenAI',anthropic:'Anthropic',openrouter:'OpenRouter',deepseek:'DeepSeek',sarvam:'Sarvam',xai:'Grok (xAI)',deepgram:'Deepgram',local:'Windows offline',whisper:'Whisper offline'};
 const female=['ritu','priya','neha','pooja','simran','kavya','ishita','shreya','roopa','tanya','shruti','suhani','kavitha','rupali'];
 const geminiVoices=[{id:'Kore',label:'Kore · Firm'},{id:'Aoede',label:'Aoede · Breezy'},{id:'Puck',label:'Puck · Upbeat'},{id:'Charon',label:'Charon · Informative'},{id:'Fenrir',label:'Fenrir · Excitable'}];
 const groqVoices=['hannah','diana','autumn','austin','daniel','troy'].map(id=>({id,label:id[0].toUpperCase()+id.slice(1)}));
 const sarvamVoices=['shubh','aditya','ritu','priya','neha','rahul','pooja','rohan','simran','kavya','amit','dev','ishita','shreya','ratan','varun','manan','sumit','roopa','kabir','aayan','ashutosh','advait','anand','tanya','tarun','sunny','mani','gokul','vijay','shruti','suhani','mohit','kavitha','rehan','soham','rupali'].map(id=>({id,label:id[0].toUpperCase()+id.slice(1)+' · '+(female.includes(id)?'Female':'Male')}));
 function text(state,role='chat'){
  const c=state.companion||{},provider=role==='tasks'?state.taskProvider||state.assistant:role==='voice'?c.provider||(c.chatEngine==='sarvam'?'sarvam':state.assistant):state.assistant;
  const model=(role==='tasks'?state.taskModel:role==='voice'?c.model:'')||state.models?.[provider]?.chat;
  return{provider:provider||'groq',model};
 }
 function speech(state,voice=false){const c=state.companion||{},provider=voice?(c.speechProvider||(c.chatEngine==='sarvam'?'sarvam':state.speech)):state.speech;return{provider:provider||'groq',model:(voice?c.speechModel:'')||state.models?.[provider]?.speech};}
 function validate(value,next,providers){
  const chat=p=>typeof p==='string'&&providers[p]?.capabilities?.chat===true;
  const recognition=p=>['local','whisper'].includes(p)||providers[p]?.capabilities?.speech===true;
  const model=m=>typeof m==='string'&&(m===''||/^[\w./:-]{1,160}$/.test(m));
  for(const [key,check] of [['taskProvider',chat],['taskModel',model]])if(value[key]!==undefined){if(!check(value[key]))throw Error('Choose a valid agentic task '+key);next[key]=value[key];}
  if(value.companion)for(const [key,check] of [['provider',chat],['model',model],['speechProvider',recognition],['speechModel',model]])if(value.companion[key]!==undefined){if(!check(value.companion[key]))throw Error('Choose a valid voice '+key);next.companion[key]=value.companion[key];}
 }
 function voiceField(s){return s.companion?.chatEngine==='gemini_live'?'geminiVoice':s.companion?.chatEngine==='sarvam'||s.companion?.tts==='sarvam'?'sarvamVoice':'voice';}
 function voices(s){return voiceField(s)==='geminiVoice'?geminiVoices:voiceField(s)==='sarvamVoice'?sarvamVoices:s.companion?.tts==='groq'?groqVoices:[];}
 const api={names,sarvamVoices,geminiVoices,voices,voiceField,text,speech,validate};if(typeof module!=='undefined')module.exports=api;else root.NotchProviders=api;
})(globalThis);
