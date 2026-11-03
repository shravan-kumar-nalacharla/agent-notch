'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {UNITS,convert,convertCurrency,parseRates,createCurrencyClient}=require('../src/converters.cjs'),{createWorkspaceStore}=require('../src/workspace-store.cjs');
test('units use dimension checks, finite numbers and absolute zero',()=>{
 assert.equal(convert({category:'length',from:'in',to:'cm',value:'2'}),5.08);assert.ok(Math.abs(convert({category:'temperature',from:'F',to:'C',value:32}))<1e-8);assert.equal(convert({category:'temperature',from:'C',to:'K',value:0}),273.15);
 for(const v of ['',null,'0x10','1,000','NaN',Infinity])assert.throws(()=>convert({category:'mass',from:'kg',to:'g',value:v}));
 assert.throws(()=>convert({category:'length',from:'m',to:'kg',value:1}));assert.throws(()=>convert({category:'temperature',from:'K',to:'F',value:-1}));
 for(const [category,units] of Object.entries(UNITS)){const [from,to]=Object.keys(units);const v=category==='temperature'?100:42;assert.ok(Math.abs(convert({category,from:to,to:from,value:convert({category,from,to,value:v})})-v)<1e-7);}
});
test('draft persistence preserves other drafts and refuses unsupported data versions',()=>{
 const folder=fs.mkdtempSync(path.join(os.tmpdir(),'notch-workspace-'));try{const store=createWorkspaceStore(folder);store.draft('python','print("hello")');store.draft('rust','fn main() {}');const second=createWorkspaceStore(folder);assert.equal(second.view().drafts.python,'print("hello")');assert.throws(()=>second.draft('__proto__','oops'));assert.throws(()=>second.draft('plain','x'.repeat(100001)));fs.writeFileSync(path.join(folder,'workspace-v1.json'),'{"version":99,"important":"preserve"}');assert.throws(()=>createWorkspaceStore(folder));assert.match(fs.readFileSync(path.join(folder,'workspace-v1.json'),'utf8'),/preserve/);}finally{fs.rmSync(folder,{recursive:true,force:true});}
});
function xml(){return `<Cube time="2026-11-04">${['USD','INR','GBP','JPY','AUD','CAD','CHF','CNY','SEK','NOK'].map((code,i)=>`<Cube currency="${code}" rate="${i+1}"/>`).join('')}</Cube>`;}
test('ECB rates reject entities and incomplete feeds, currencies cross through EUR',()=>{
 const now=Date.parse('2026-11-04T12:00Z'),rates=parseRates(xml(),now);assert.equal(convertCurrency({value:2,from:'INR',to:'USD'},rates),1);assert.throws(()=>convertCurrency({value:1,from:'ZZZ',to:'USD'},rates));assert.throws(()=>parseRates('<!DOCTYPE foo>'+xml(),now));assert.throws(()=>parseRates('<Cube time="2026-11-04"/>',now));assert.throws(()=>convertCurrency({value:Infinity,from:'EUR',to:'USD'},rates));
});
test('currency fetches share one request, bound responses and retain offline dated rates',async()=>{
 let now=Date.parse('2026-11-04T12:00Z'),value={rates:null},calls=0;const store={view:()=>value,set:(k,v)=>value[k]=v};const get=createCurrencyClient({store,now:()=>now,fetchImpl:async()=>{calls++;await new Promise(r=>setTimeout(r,10));return new Response(xml());}});
 const [a,b]=await Promise.all([get(),get()]);assert.equal(calls,1);assert.deepEqual(a,b);await get();assert.equal(calls,1);now+=7200000;const offline=createCurrencyClient({store,now:()=>now,fetchImpl:async()=>{throw Error('private diagnostic');}});const stale=await offline();assert.equal(stale.stale,true);assert.equal(stale.date,'2026-11-04');assert.doesNotMatch(stale.error,/private/);
 const huge=createCurrencyClient({store:{view:()=>({}),set:()=>assert.fail()},fetchImpl:async()=>new Response('x'.repeat(1000001))});await assert.rejects(huge(),/unavailable/);
});
