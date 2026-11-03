'use strict';
const formatters=new Map();
const offsetCache=new Map();
function zoneValid(zone){try{new Intl.DateTimeFormat('en',{timeZone:zone}).format();return true;}catch{return false;}}
function wall(at,zone){let formatter=formatters.get(zone);if(!formatter){formatter=new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});formatters.set(zone,formatter);}return Object.fromEntries(formatter.formatToParts(new Date(at)).filter(p=>p.type!=='literal').map(p=>[p.type,Number(p.value)]));}
function dateKey(at,zone){const d=wall(at,zone);return `${d.year}-${String(d.month).padStart(2,'0')}-${String(d.day).padStart(2,'0')}`;}
function minutes(value){if(typeof value!=='string'||!/^([01]\d|2[0-3]):[0-5]\d$/.test(value))throw new Error('Use a time from 00:00 to 23:59.');return Number(value.slice(0,2))*60+Number(value.slice(3));}
function validateRule(value){
  if(!value||typeof value!=='object')throw new Error('Invalid reminder rule.');
  const keys=['id','kind','targetId','enabled','timezone','followSystem','mode','localTimes','daysOfWeek','windowStart','windowEnd','intervalMinutes','quietHourPolicy','soundId','priority','title','body','at','skippedDay','test','rest','restSessionId'];const r=Object.fromEntries(keys.filter(key=>Object.hasOwn(value,key)).map(key=>[key,value[key]]));if(!['book','course','workout','water','general','timer','todo'].includes(r.kind))throw new Error('Invalid reminder category.');
  if(r.soundId!==undefined&&r.soundId!==null&&!['default','book','course','workout','silent'].includes(r.soundId))throw new Error('Invalid reminder sound.');if(r.priority!==undefined&&!['low','normal','high'].includes(r.priority))throw new Error('Invalid reminder priority.');
  for(const[key,max]of [['id',100],['targetId',100],['title',2000],['body',4000]])if(r[key]!==undefined&&r[key]!==null&&(typeof r[key]!=='string'||!r[key].trim()||r[key].length>max))throw new Error('Invalid reminder '+key+'.');
  if(r.enabled!==undefined&&typeof r.enabled!=='boolean')throw new Error('Invalid reminder enabled state.');if(r.followSystem!==undefined&&typeof r.followSystem!=='boolean')throw new Error('Invalid timezone preference.');
  if(!['daily-time','weekdays','interval-in-window','one-off'].includes(r.mode))throw new Error('Invalid reminder recurrence.');
  if(!zoneValid(r.timezone))throw new Error('Choose a valid IANA timezone.');
  r.enabled=r.enabled===true;r.followSystem=r.followSystem!==false;r.quietHourPolicy=r.quietHourPolicy==='skip'?'skip':'defer';
  if(r.mode==='one-off'){if(!Number.isSafeInteger(r.at)||r.at<=0)throw new Error('Choose a valid reminder date and time.');}
  else{
    r.daysOfWeek=r.daysOfWeek??[0,1,2,3,4,5,6];if(!Array.isArray(r.daysOfWeek)||!r.daysOfWeek.length||r.daysOfWeek.some(d=>!Number.isInteger(d)||d<0||d>6))throw new Error('Choose at least one weekday.');r.daysOfWeek=[...new Set(r.daysOfWeek)].sort();
    if(r.mode==='interval-in-window'){minutes(r.windowStart);minutes(r.windowEnd);if(!Number.isInteger(r.intervalMinutes)||r.intervalMinutes<5||r.intervalMinutes>1440)throw new Error('Reminder interval must be 5–1440 minutes.');}
    else{if(!Array.isArray(r.localTimes)||!r.localTimes.length||r.localTimes.length>24)throw new Error('Choose 1–24 reminder times.');r.localTimes=[...new Set(r.localTimes)];r.localTimes.forEach(minutes);r.localTimes.sort();}
  }
  return r;
}
function epochForWall(year,month,day,hour,minute,zone){
  const utc=Date.UTC(year,month-1,day,hour,minute),key=`${zone}:${year}-${month}-${day}`;let offsets=offsetCache.get(key);
  if(!offsets){offsets=new Set();const middle=Date.UTC(year,month-1,day,12);for(const delta of [-36,0,36]){const at=middle+delta*3600000,d=wall(at,zone);offsets.add(Date.UTC(d.year,d.month-1,d.day,d.hour,d.minute,d.second)-Math.floor(at/1000)*1000);}offsetCache.set(key,offsets);if(offsetCache.size>4096)offsetCache.delete(offsetCache.keys().next().value);}
  const candidates=[...offsets].map(offset=>utc-offset).filter(at=>{const d=wall(at,zone);return d.year===year&&d.month===month&&d.day===day&&d.hour===hour&&d.minute===minute;}).sort((a,b)=>a-b);
  // A missing DST wall time is skipped; a repeated time fires only at its first occurrence.
  return candidates[0]??null;
}
function nextOccurrence(rule,after){
  if(!rule.enabled)return null;
  if(rule.mode==='one-off')return rule.at>after?{at:rule.at,key:'once:'+rule.at}:null;
  const local=wall(after,rule.timezone),base=Date.UTC(local.year,local.month-1,local.day);let best=null;
  for(let day=-1;day<15;day++){
    const anchor=new Date(base+day*86400000);if(!rule.daysOfWeek.includes(anchor.getUTCDay()))continue;
    let slots;
    if(rule.mode==='interval-in-window'){const start=minutes(rule.windowStart),end=minutes(rule.windowEnd),finish=end<=start?end+1440:end;slots=[];for(let minute=start+rule.intervalMinutes;minute<finish;minute+=rule.intervalMinutes)slots.push(minute);}
    else slots=rule.localTimes.map(minutes);
    for(const minute of slots){const d=new Date(anchor.getTime()+Math.floor(minute/1440)*86400000),h=Math.floor(minute%1440/60),m=minute%60,at=epochForWall(d.getUTCFullYear(),d.getUTCMonth()+1,d.getUTCDate(),h,m,rule.timezone);if(at===null||at<=after)continue;const key=`${d.toISOString().slice(0,10)}T${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;if(!best||at<best.at)best={at,key};}
    if(best)break;
  }
  return best;
}
function inWindow(at,start,end,zone){const d=wall(at,zone),value=d.hour*60+d.minute,a=minutes(start),b=minutes(end);return a===b?false:a<b?value>=a&&value<b:value>=a||value<b;}
module.exports={wall,dateKey,minutes,zoneValid,validateRule,nextOccurrence,epochForWall,inWindow};
