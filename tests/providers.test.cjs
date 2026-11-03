const { test } = require('node:test');
const assert = require('node:assert/strict');
const { chat, transcribe, config } = require('../src/providers.cjs');
test('provider and model validation rejects unknown destinations', () => { assert.throws(() => config('evil', 'key')); assert.throws(() => config('groq', '')); assert.throws(() => config('groq', 'key', '../bad?key=x')); });
test('Windows planner requests provider JSON mode without obsolete thinking-budget overrides',async()=>{for(const provider of ['groq','openai','deepseek','gemini'])await chat({provider,key:'test',text:'Return one JSON step.',json:true},async(_url,request)=>{const body=JSON.parse(request.body);if(provider==='gemini'){assert.equal(body.generationConfig.responseMimeType,'application/json');assert.ok(body.generationConfig.maxOutputTokens>=1024);assert.equal(body.generationConfig.thinkingConfig,undefined);}else assert.deepEqual(body.response_format,{type:'json_object'});return{ok:true,json:async()=>provider==='gemini'?{candidates:[{content:{parts:[{text:'{"action":"answer","message":"Hi"}'}]}}]}:{choices:[{message:{content:'{"action":"answer","message":"Hi"}'}}]}};});});
test('each assistant uses its own authenticated endpoint and parses output', async () => {
  for (const provider of ['groq', 'openai', 'gemini']) {
    const text = await chat({ provider, key: 'test-key', text: 'hello' }, async (url, req) => {
      assert.ok(url.startsWith(provider === 'gemini' ? 'https://generativelanguage.googleapis.com/' : provider === 'groq' ? 'https://api.groq.com/' : 'https://api.openai.com/'));
      assert.ok(req.headers.authorization === 'Bearer test-key' || req.headers['x-goog-api-key'] === 'test-key');
      return { ok: true, json: async () => provider === 'gemini' ? { candidates: [{ content: { parts: [{ text: 'Hi' }] } }] } : { choices: [{ message: { content: 'Hi' } }] } };
    }); assert.equal(text, 'Hi');
  }
});
test('transcription sends multipart to Groq/OpenAI and inline audio to Gemini', async () => {
  for (const provider of ['groq', 'openai', 'gemini']) {
    assert.equal(await transcribe({ provider, key: 'key', audio: Buffer.alloc(100), mime: 'audio/webm' }, async (url, req) => {
      if (provider === 'gemini') assert.ok(JSON.parse(req.body).contents[0].parts[1].inlineData.data);
      else { assert.equal(req.body.get('file').name, 'recording.webm'); assert.ok(url.endsWith('/audio/transcriptions')); }
      return { ok: true, json: async () => provider === 'gemini' ? { candidates: [{ content: { parts: [{ text: 'hello' }] } }] } : { text: 'hello' } };
    }), 'hello');
  }
});
test('limit errors and empty responses are visible; invalid audio never uploads', async () => {
  await assert.rejects(chat({ provider: 'groq', key: 'key', text: 'hi' }, async () => ({ ok: false, status: 429 })), /limit/);
  await assert.rejects(chat({ provider: 'openai', key: 'key', text: 'hi' }, async () => ({ ok: true, json: async () => ({}) })), /no text/);
  await assert.rejects(transcribe({ provider: 'groq', key: 'key', audio: Buffer.alloc(0) }, () => { throw new Error('must not upload'); }), /Recording must/);
});
test('DeepSeek uses the official endpoint, current defaults and rejects speech/vision',async()=>{
  assert.throws(()=>config('deepseek','key',null,'speech'),/does not support/);assert.throws(()=>config('deepseek','key',null,'vision'),/does not support/);
  let usage;
  assert.equal(await chat({provider:'deepseek',key:'secret',text:'Hello',onUsage:u=>usage=u},async(url,req)=>{assert.equal(url,'https://api.deepseek.com/chat/completions');const body=JSON.parse(req.body);assert.equal(body.model,'deepseek-flash');assert.deepEqual(body.thinking,{type:'disabled'});return{ok:true,json:async()=>({choices:[{message:{content:'Hi'}}],usage:{prompt_tokens:2,completion_tokens:1,total_tokens:3,private:'ignored'}})};}),'Hi');assert.equal(usage.total_tokens,3);assert.equal(usage.private,undefined);
});
test('DeepSeek streams fragmented UTF-8 content, filters reasoning, exposes usage and supports cancellation',async()=>{
  const chunks=[],usage=[],controller=new AbortController();
  const result=await chat({provider:'deepseek',key:'key',text:'Hello',onDelta:s=>chunks.push(s),onUsage:u=>usage.push(u),signal:controller.signal},async()=>({ok:true,body:(async function*(){const text='data: '+JSON.stringify({choices:[{delta:{reasoning_content:'private reasoning'}}]})+'\n\ndata: '+JSON.stringify({choices:[{delta:{content:'హలో'}}]})+'\n\ndata: '+JSON.stringify({choices:[],usage:{total_tokens:5}})+'\n\ndata: [DONE]\n';const bytes=Buffer.from(text);for(let i=0;i<bytes.length;i+=7)yield bytes.subarray(i,i+7);})()}));assert.equal(result,'హలో');assert.equal(chunks.join(''),'హలో');assert.equal(usage[0].total_tokens,5);
  await assert.rejects(chat({provider:'deepseek',key:'key',text:'Hello',signal:controller.signal,onDelta:()=>{}},async()=>({ok:true,body:(async function*(){controller.abort();yield Buffer.from('data: [DONE]\n');})()})),{name:'AbortError'});
});
