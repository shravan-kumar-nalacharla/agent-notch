'use strict';
const VOICES=['autumn','diana','hannah','austin','daniel','troy'];
const MODEL='canopylabs/orpheus-v1-english';
const SETUP_URL='https://console.groq.com/playground?model=canopylabs%2Forpheus-v1-english';
function chunks(text,max=200){
  if(typeof text!=='string'||!text.trim()||text.length>20000)throw new Error('Enter speech text of up to 20,000 characters.');
  const words=text.replace(/[`*_#]/g,'').trim().split(/\s+/),out=[];let current='';
  for(const word of words){if(current.length+word.length+1>max&&current){out.push(current);current='';}const chars=Array.from(word);while(chars.join('').length>max){if(current){out.push(current);current='';}let piece='',n=0;while(n<chars.length&&piece.length+chars[n].length<=max)piece+=chars[n++];out.push(piece);chars.splice(0,n);}current+=(current?' ':'')+chars.join('');}if(current)out.push(current);return out;
}
async function synthesize({text,key,voice='hannah',signal},fetcher=fetch){
  if(!key)throw new Error('Save a Groq API key in AI & API keys to use the natural voice.');
  if(!VOICES.includes(voice)||typeof text!=='string'||!text.trim()||text.length>200)throw new Error('Invalid voice or speech segment.');
  const response=await fetcher('https://api.groq.com/openai/v1/audio/speech',{method:'POST',headers:{authorization:`Bearer ${key}`,'content-type':'application/json'},body:JSON.stringify({model:MODEL,voice,input:text,response_format:'wav'}),signal:signal?AbortSignal.any([signal,AbortSignal.timeout(30000)]):AbortSignal.timeout(30000)});
  if(!response.ok){
    let data={};try{data=await response.json();}catch{}const code=String(data.error?.code||'');
    if(code==='model_terms_required')throw new Error('Groq read-aloud needs model terms approval by you or your organization admin. Review them at '+SETUP_URL+'. You can use Installed Windows voice instead.');
    if(response.status===401||response.status===403)throw new Error('Groq read-aloud access was rejected. Check the Groq key and model permissions, or use Installed Windows voice.');
    if(response.status===429)throw new Error('Groq read-aloud rate limit reached. Try again later or use Installed Windows voice.');
    const detail=String(data.error?.message||'').replaceAll(key,'[redacted]').replace(/[\r\n]+/g,' ').slice(0,350);
    throw new Error(`Groq read-aloud failed (HTTP ${response.status})${code?' ['+code.replace(/[^\w.-]/g,'').slice(0,80)+']':''}${detail?': '+detail:'. Choose Installed Windows voice or check the voice model in Groq.'}`);
  }
  if(Number(response.headers?.get('content-length')||0)>8*1024*1024)throw new Error('Voice response is too large.');
  const audio=Buffer.from(await response.arrayBuffer());if(audio.length>8*1024*1024||audio.toString('ascii',0,4)!=='RIFF'||audio.toString('ascii',8,12)!=='WAVE')throw new Error('Voice service returned invalid WAV audio.');return{audio:audio.toString('base64'),mime:'audio/wav'};
}
module.exports={VOICES,MODEL,SETUP_URL,chunks,synthesize};
