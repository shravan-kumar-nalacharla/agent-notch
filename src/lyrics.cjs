'use strict';
const normalize=value=>String(value||'').normalize('NFKC').toLowerCase().replace(/\bvevo\b/g,'').replace(/[^\p{L}\p{N}]+/gu,' ').trim();
function trackMetadata(song){
  let title=String(song.title||'').replace(/[[(](?:official\s*)?(?:music\s*)?(?:video|audio|lyrics?|lyric video|visuali[sz]er)[^\])]*[\])]/gi,'').replace(/\s*\|.*$/,'').trim();
  let artist=String(song.artist||'').replace(/VEVO$/i,'').replace(/\s*-\s*Topic$/i,'').trim();
  const split=title.split(/\s+[-–—]\s+/);
  if(split.length===2&&normalize(split[0])===normalize(artist)){artist=split[0];title=split[1];}
  return {title,artist};
}
function selectLyrics(records,song){
  const meta=trackMetadata(song),title=normalize(meta.title),artist=normalize(meta.artist),duration=Number(song.duration)/1000;
  const candidates=records.filter(r=>typeof r.trackName==='string').map(record=>{
    const name=normalize(record.trackName),who=normalize(record.artistName),words=new Set(title.split(' '));
    const tokens=name.split(' '),overlap=tokens.filter(w=>words.has(w)).length/Math.max(tokens.length,words.size);
    const titleScore=name===title?1:overlap;
    const artistMatch=artist&&who&&(who===artist||who.includes(artist)||artist.includes(who));
    const delta=duration>0?Math.abs(Number(record.duration)-duration):0;
    // Avoid displaying an unrelated song for trailers, podcasts, or ambiguous short titles.
    if(duration>0&&(!Number.isFinite(Number(record.duration))||delta>3))return null;
    if(titleScore<.8||(artist&&!artistMatch)||(!artist&&(titleScore<1||delta>2||!(duration>0))))return null;
    return {record,score:titleScore*100+(artistMatch?30:0)+(delta<=2?10:0)+(record.syncedLyrics?2:0)};
  }).filter(Boolean).sort((a,b)=>b.score-a.score);
  return candidates[0]?.record||null;
}
const OUTCOMES={UNAVAILABLE_FOR_VIDEO:"Lyrics aren’t available for this video.",PODCAST_OR_SPEECH:"This appears to be spoken audio, not a song.",INSTRUMENTAL:"Instrumental — no lyrics.",TRACK_NOT_FOUND:"No matching lyrics found.",NO_SYNCED_LYRICS:"Only plain lyrics are available.",OFFLINE:"You appear to be offline. Try again when connected.",DNS_FAILURE:"The lyrics service address could not be resolved.",TLS_FAILURE:"A secure connection to the lyrics service could not be established.",TIMEOUT:"The lyrics lookup timed out. You can retry.",RATE_LIMITED:"The lyrics service asked us to wait before retrying.",UPSTREAM_5XX:"The lyrics service is temporarily unavailable.",INVALID_METADATA:"The player has not supplied enough track information.",METADATA_MISMATCH:"The lyrics returned do not match this track.",FORBIDDEN:"The lyrics service denied access.",PARSE_ERROR:"The lyrics service returned an unreadable response.",CANCELLED:"Lyrics lookup cancelled.",OK_SYNCED:"Synchronized lyrics · LRCLIB",OK_PLAIN:"Plain lyrics · LRCLIB"};
class LyricsError extends Error{constructor(outcome,status=0,retryAfter=0){super(OUTCOMES[outcome]||outcome);Object.assign(this,{outcome,status,retryAfter});}}
function classifyError(error){if(error instanceof LyricsError)return error;if(error?.name==='AbortError')return new LyricsError('CANCELLED');if(error?.name==='TimeoutError')return new LyricsError('TIMEOUT');const code=error?.cause?.code||error?.code||'';return new LyricsError(/ENOTFOUND|EAI_AGAIN/.test(code)?'DNS_FAILURE':/CERT|TLS|SSL/.test(code)?'TLS_FAILURE':/TIMEOUT/.test(code)?'TIMEOUT':'OFFLINE');}
function createLyricsClient({fetcher=fetch,now=Date.now}={}){
  const cache=new Map();let nextRequest=0,pending=Promise.resolve(),diagnostics=null;
  async function request(route,query,signal,trace){
    if(now()<nextRequest)throw new LyricsError('RATE_LIMITED',429,Math.ceil((nextRequest-now())/1000));
    const start=performance.now();let response;
    try{response=await fetcher('https://lrclib.net/api/'+route+'?'+new URLSearchParams(query),{headers:{'User-Agent':'AgentNotch/0.5.0 (https://github.com/shravan-kumar-nalacharla)'},signal:signal?AbortSignal.any([signal,AbortSignal.timeout(12000)]):AbortSignal.timeout(12000)});}catch(e){throw classifyError(e);}
    trace.push({route,status:response.status,elapsedMs:Math.round(performance.now()-start)});
    if(response.status===404)return null;
    if(response.status===429||response.status===503){const retry=response.headers.get('retry-after'),seconds=Number(retry),delay=Number.isFinite(seconds)?seconds*1000:Date.parse(retry)-now();nextRequest=now()+Math.max(1000,delay||60000);throw new LyricsError(response.status===429?'RATE_LIMITED':'UPSTREAM_5XX',response.status,Math.ceil((nextRequest-now())/1000));}
    if(response.status===403)throw new LyricsError('FORBIDDEN',403);
    if(!response.ok)throw new LyricsError(response.status>=500?'UPSTREAM_5XX':'INVALID_METADATA',response.status);
    try{return await response.json();}catch{throw new LyricsError('PARSE_ERROR',response.status);}
  }
  async function detailed(song,{signal}={}){
    const started=performance.now(),trace=[],meta=trackMetadata(song);let outcome,record=null,source='none',error=null,mismatched=false;
    const key=JSON.stringify([song.title,song.artist,song.album,song.duration]),saved=cache.get(key);
    const make=()=>{diagnostics={host:'lrclib.net',metadata:{title:song.title,artist:song.artist,album:song.album||'',durationSeconds:Number(song.duration)/1000,app:song.app||''},normalized:meta,source,outcome,requests:trace,elapsedMs:Math.round(performance.now()-started),retryAfter:error?.retryAfter||0};return{record,outcome,message:OUTCOMES[outcome],source,retryAfter:error?.retryAfter||0};};
    if(signal?.aborted){outcome='CANCELLED';return make();}
    if(saved&&now()<saved.expires){({record,outcome}=saved);source='cache';return make();}
    if(!meta.title){outcome='INVALID_METADATA';return make();}
    if(/podcast|\bepisode\b|interview/i.test(song.title)){outcome='PODCAST_OR_SPEECH';return make();}
    if(/backdoor sale|modi govt|political commentary|\bofficial trailer\b|news commentary/i.test(song.title)){outcome='UNAVAILABLE_FOR_VIDEO';return make();}
    try{
      const query={track_name:meta.title,artist_name:meta.artist};if(song.album)query.album_name=String(song.album).slice(0,300);const seconds=Math.round(song.duration/1000);if(seconds>=1&&seconds<=3600)query.duration=String(seconds);
      if(meta.artist){try{record=await request('get',query,signal,trace);source='exact';}catch(e){if(!['INVALID_METADATA','PARSE_ERROR'].includes(e.outcome))throw e;}}
      if(record?.trackName&&!selectLyrics([record],song)){record=null;mismatched=true;}
      if(!record){await new Promise((resolve,reject)=>{const timer=setTimeout(resolve,250);if(signal){if(signal.aborted){clearTimeout(timer);reject(new LyricsError('CANCELLED'));}else signal.addEventListener('abort',()=>{clearTimeout(timer);reject(new LyricsError('CANCELLED'));},{once:true});}});let records=await request('search',{track_name:meta.title,...(meta.artist?{artist_name:meta.artist}:{})},signal,trace);record=selectLyrics(Array.isArray(records)?records:[],song);if(Array.isArray(records)&&records.length&&!record)mismatched=true;source='search';}
      if(signal?.aborted)throw new LyricsError('CANCELLED');
      outcome=!record?(mismatched?'METADATA_MISMATCH':'TRACK_NOT_FOUND'):record.instrumental?'INSTRUMENTAL':record.syncedLyrics?'OK_SYNCED':record.plainLyrics?'OK_PLAIN':'TRACK_NOT_FOUND';
      if(cache.size>=80)cache.delete(cache.keys().next().value);cache.set(key,{record,outcome,expires:now()+(record?12*3600000:5*60000)});
    }catch(e){error=classifyError(e);outcome=error.outcome;}
    return make();
  }
  const client=(song,options)=>{const work=pending.then(()=>detailed(song,options)).then(r=>{if(!['OK_SYNCED','OK_PLAIN','TRACK_NOT_FOUND','INSTRUMENTAL','UNAVAILABLE_FOR_VIDEO','PODCAST_OR_SPEECH'].includes(r.outcome))throw new LyricsError(r.outcome,0,r.retryAfter);return r.record;});pending=work.catch(()=>{});return work;};
  client.detailed=detailed;client.diagnostics=()=>diagnostics;return client;
}
module.exports={createLyricsClient,trackMetadata,selectLyrics,OUTCOMES,LyricsError,classifyError};
