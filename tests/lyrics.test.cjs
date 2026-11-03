const {test}=require('node:test');const assert=require('node:assert/strict');
const{trackMetadata,selectLyrics,createLyricsClient}=require('../src/lyrics.cjs');
test('lyrics normalizes browser metadata and rejects unrelated results',()=>{
  const song={title:'Adele - Hello (Official Video)',artist:'AdeleVEVO',duration:295000};
  assert.deepEqual(trackMetadata(song),{title:'Hello',artist:'Adele'});
  const wrong={trackName:'Hello',artistName:'Someone else',duration:180,syncedLyrics:'bad'};
  const correct={trackName:'Hello',artistName:'Adele',duration:295,syncedLyrics:'ok'};
  assert.equal(selectLyrics([wrong,correct],song),correct);
  assert.equal(selectLyrics([wrong],song),null);
});
test('lyrics uses exact duration, caches results and respects retry-after',async()=>{
  const requests=[];let time=0;
  const lookup=createLyricsClient({now:()=>time,fetcher:async(url,options)=>{requests.push({url,options});return{ok:true,status:200,json:async()=>({syncedLyrics:'[00:01]Hello'})};}});
  const song={title:'Hello',artist:'Adele',duration:295000};await lookup(song);await lookup(song);
  assert.equal(requests.length,1);assert.match(requests[0].url,/duration=295/);assert.match(requests[0].options.headers['User-Agent'],/AgentNotch/);
  let calls=0;const limited=createLyricsClient({now:()=>time,fetcher:async()=>{calls++;return{ok:false,status:429,headers:{get:()=> '30'}};}});
  await assert.rejects(limited(song),/wait|unavailable/);await assert.rejects(limited(song),/wait|unavailable/);assert.equal(calls,1);time=31000;await assert.rejects(limited(song),/wait|unavailable/);assert.equal(calls,2);
});
test('lyrics falls back from missing exact record to a ranked search',async()=>{
  const requests=[];const lookup=createLyricsClient({fetcher:async(url)=>{requests.push(url);return url.includes('/get?')?{status:404}:{ok:true,status:200,json:async()=>[{trackName:'Hello',artistName:'Adele',duration:295,plainLyrics:'available'}]};}});
  const result=await lookup({title:'Hello (Official Audio)',artist:'Adele',duration:295000});assert.equal(result.plainLyrics,'available');assert.equal(requests.length,2);assert.match(requests[1],/search/);
});

test('same-title recordings with a materially different duration are rejected',()=>{assert.equal(selectLyrics([{trackName:'Hello',artistName:'Adele',duration:180,syncedLyrics:'wrong recording'}],{title:'Hello',artist:'Adele',duration:295000}),null);});

test('lyrics separates commentary, missing tracks, instrumental and network failures',async()=>{
 const{classifyError}=require('../src/lyrics.cjs');
 assert.equal(classifyError({cause:{code:'ENOTFOUND'}}).outcome,'DNS_FAILURE');assert.equal(classifyError({cause:{code:'CERT_HAS_EXPIRED'}}).outcome,'TLS_FAILURE');assert.equal(classifyError({name:'TimeoutError'}).outcome,'TIMEOUT');
 const client=createLyricsClient({fetcher:async()=>{throw new Error('must not fetch commentary');}});
 assert.equal((await client.detailed({title:'Tech Transfer Or Backdoor Sale? | Modi Govt',artist:'The Deshbhakt'})).outcome,'UNAVAILABLE_FOR_VIDEO');
 const song={title:'Hello',artist:'Adele',album:'25',duration:295000};
 const absent=createLyricsClient({fetcher:async url=>url.includes('/get?')?{status:404}:{ok:true,status:200,json:async()=>[]}});assert.equal((await absent.detailed(song)).outcome,'TRACK_NOT_FOUND');
 const instrumental=createLyricsClient({fetcher:async()=>({ok:true,status:200,json:async()=>({instrumental:true})})});assert.equal((await instrumental.detailed(song)).outcome,'INSTRUMENTAL');
 const malformed=createLyricsClient({fetcher:async()=>({ok:true,status:200,json:async()=>{throw new Error('bad json');}})});assert.equal((await malformed.detailed(song)).outcome,'PARSE_ERROR');
 const failing=createLyricsClient({fetcher:async()=>({ok:false,status:500})});assert.equal((await failing.detailed(song)).outcome,'UPSTREAM_5XX');
 const cancelled=new AbortController();cancelled.abort();assert.equal((await client.detailed(song,{signal:cancelled.signal})).outcome,'CANCELLED');
});
