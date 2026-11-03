'use strict';
const{test}=require('node:test'),assert=require('node:assert/strict');
const{spring,frames,PRESETS}=require('../src/surface-motion.js');
const{chunks,synthesize}=require('../src/speech.cjs');
const{pickMoment,validateQuiet}=require('../src/quiet.cjs');
const{targets,ground,revalidate,guide}=require('../src/screen-guide.cjs');
test('Bloom spring trajectories grow through intermediate sizes, overshoot gently, and settle',()=>{
  const f=frames({width:174,height:26,y:-32,scale:.94,opacity:0,radius:14},{width:470,height:250,y:0,scale:1,opacity:1,radius:25});
  assert.equal(spring(0,PRESETS.height),0);assert.equal(f.length,61);assert.ok(f.filter(x=>parseFloat(x.width)>200&&parseFloat(x.width)<450).length>4);assert.ok(Math.max(...f.map(x=>parseFloat(x.height)))>250);assert.ok(Math.max(...f.map(x=>parseFloat(x.height)))<265);assert.equal(f.at(-1).width,'470px');assert.equal(f.at(-1).height,'250px');
});
test('curated thoughts respect conservative frequency and never revive startup popups',()=>{
 const config={...require('../src/quiet.cjs').DEFAULTS,category:'philosophy'},now=new Date(2026,10,2,13).getTime(),activity={expanded:true,intentional:true,osDnd:false,systemKnown:true};assert.equal(validateQuiet(config).cooldownMinutes,240);
 const q=pickMoment(config,{},now,()=>.99,activity);assert.ok(q);assert.equal(pickMoment(config,{lastAt:now-60000},now,()=>0,activity),null);assert.equal(pickMoment({...config,dnd:true},{},now,()=>0,activity),null);assert.equal(pickMoment(config,{day:q.day,count:2},now,()=>0,activity),null);assert.equal(pickMoment(config,{},now,()=>0,{...activity,expanded:false}),null);
});
test('natural voice splits long replies within the provider limit',()=>{const pieces=chunks('A sentence. '.repeat(100));assert.ok(pieces.length>1);assert.ok(pieces.every(x=>x.length<=200));assert.equal(pieces.join(' '),'A sentence. '.repeat(100).trim());assert.throws(()=>chunks(''));assert.ok(chunks('🙂'.repeat(250)).every(x=>x.length<=200&&!x.endsWith('\ud83d')));});
test('Orpheus uses the official endpoint and validates audio and authentication failures',async()=>{
  const wav=Buffer.from('RIFFxxxxWAVEdata');const r=await synthesize({text:'Hi, I am Cutie.',key:'secret',voice:'hannah'},async(url,request)=>{assert.equal(url,'https://api.groq.com/openai/v1/audio/speech');assert.equal(JSON.parse(request.body).model,'canopylabs/orpheus-v1-english');return{ok:true,headers:{get:()=>null},arrayBuffer:async()=>wav};});assert.equal(r.audio,wav.toString('base64'));
  await assert.rejects(synthesize({text:'Hi',key:'key'},async()=>({ok:false,status:429})),/rate limit/);await assert.rejects(synthesize({text:'Hi',key:'key'},async()=>({ok:true,arrayBuffer:async()=>Buffer.from('not audio')})),/invalid WAV/);await assert.rejects(synthesize({text:'Hi',key:'key',voice:'arbitrary'}),/Invalid voice/);
});
test('native screen grounding refuses ambiguous labels, invalid boxes, and moved targets',()=>{
  const observation={width:800,height:600,items:[{text:'Save',x:10,y:10,width:40,height:30},{text:'Save',x:100,y:10,width:40,height:30},{text:'Bad',x:-1,y:0,width:2,height:2}]},items=targets(observation);assert.equal(items.length,2);assert.equal(ground([{target_text:'Save'}],items)[0].match.ambiguous_candidate_count,2);const match=ground([{target_ref:'target-0'}],items)[0].match;assert.equal(match.score,1);assert.ok(revalidate(match,observation));assert.equal(revalidate(match,{...observation,items:[{...items[0],x:50}]}),null);
});
test('native guidance preserves provider boundary without Python',async()=>{
  const result=await guide('Where is Save?','groq','key',{}, {native:{request:async()=>({width:800,height:600,image:'fixture',items:[{text:'Save',x:10,y:10,width:40,height:30}]})},ask:async request=>{assert.match(request.prompt,/untrusted/);return{summary:'Use Save',steps:[{instruction:'Click Save',target_ref:'target-0',target_text:'Save'}]};}});assert.ok(result.readOnly);assert.equal(result.steps[0].match.text,'Save');
});
