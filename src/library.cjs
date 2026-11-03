'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const dayKey = (at = Date.now()) => { const d = new Date(at); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
const text = (v, limit = 2000) => { if(typeof v !== 'string' || !v.trim() || v.length > limit) throw new Error(`Enter text of up to ${limit} characters.`); return v.trim(); };
const todoDueAt = (date, time) => {
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date || '') || !/^\d{2}:\d{2}$/.test(time || '')) return 0;
  const at = new Date(`${date}T${time}:00`).getTime();
  return Number.isFinite(at) ? at : 0;
};
function createLibrary(folder, now = Date.now, monotonic = now===Date.now?()=>performance.now():now) {
  const wallAnchor=now(),monoAnchor=monotonic(),clockNow=()=>wallAnchor+Math.max(0,monotonic()-monoAnchor);
  const file = path.join(folder,'library.json');
  const defaults = { todos:[], reminders:[], water:{goal:3000,bottle:500,interval:90,schedule:'auto',from:8,to:17,enabled:false,logs:[],lastReminder:0}, shelf:[], projects:[], dictionary:[], snippets:[], history:[], meetings:[], clips:[], clipboardEnabled:false, quiet:{day:'',count:0,lastAt:0,recent:[],favorites:[]}, retentionDays:30, timer:null, stopwatch:null, focusMinutes:25, focusSessions:[], teleprompter:{text:'',speed:30,fontSize:26,mirror:false}, mediaAppId:'',lyricsOffsetMs:0,city:'',calendarUrl:'' };
  let data = structuredClone(defaults);
  try { const loaded = JSON.parse(fs.readFileSync(file,'utf8')); data = {...data,...loaded,water:{...data.water,...loaded.water}};if(loaded.water&&!loaded.water.schedule)data.water.schedule='custom'; } catch(e) { if(e.code !== 'ENOENT') { try { fs.copyFileSync(file,file+'.recovery-'+now()); } catch {} } }
  data.quiet={...defaults.quiet,...data.quiet};
  if(data.quiet.schemaVersion!==2){data.quiet.legacyFavorites=(data.quiet.favorites||[]).filter(id=>!require('./quotes.cjs').byId.has(id));data.quiet.favorites=(data.quiet.favorites||[]).filter(id=>require('./quotes.cjs').byId.has(id));data.quiet.recent=(data.quiet.recent||[]).filter(id=>require('./quotes.cjs').byId.has(id));data.quiet.schemaVersion=2;}
  data.quiet.muted??=[];data.quiet.shown??={};data.quiet.patches??={};
  const hadSavedClipboard=Array.isArray(data.clips)&&data.clips.length>0;data.clips=[];if(hadSavedClipboard)save();
  function clockSnapshot(){
    const timer=data.timer?{...data.timer}:null,stopwatch=data.stopwatch?{...data.stopwatch}:null;
    if(timer&&!timer.paused){timer.remaining=Math.max(0,Math.ceil((timer.end-clockNow())/1000));timer.end=now()+Math.max(0,timer.end-clockNow());}
    if(stopwatch?.running){stopwatch.elapsed=stopwatchElapsed(stopwatch,clockNow());stopwatch.started=now();}
    return{timer,stopwatch};
  }
  function save() {
    fs.mkdirSync(folder,{recursive:true});const tmp=file+'.'+randomUUID()+'.tmp';fs.writeFileSync(tmp,JSON.stringify({...data,clips:[],...clockSnapshot()}),{mode:0o600,flag:'wx'});
    // Windows antivirus can briefly hold the destination while clipboard history updates.
    for(let attempt=0;;attempt++){try{fs.renameSync(tmp,file);return;}catch(e){if(attempt>=4||!['EPERM','EBUSY','EACCES'].includes(e.code)){try{fs.unlinkSync(tmp);}catch{}throw e;}Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,10*(attempt+1));}}
  }
  function prune() { if(data.retentionDays === 0)data.history=[]; else if(data.retentionDays > 0) { const after = now()-data.retentionDays*86400000; data.history=data.history.filter(x=>x.at>=after); } data.clips=data.clips.slice(0,500); data.water.logs=data.water.logs.filter(x=>x.at>now()-90*86400000); }
  function view() { prune(); const logs=data.water.logs.filter(x=>dayKey(x.at)===dayKey(now())); return structuredClone({...data,...clockSnapshot(),water:{...data.water,today:logs.reduce((n,x)=>n+x.ml,0),plan:waterPlan(data.water,now()),hours:Array.from({length:24},(_,h)=>logs.filter(x=>new Date(x.at).getHours()===h).reduce((n,x)=>n+x.ml,0))},stats:stats(data.history)}); }
  function find(kind,id) { const item=data[kind].find(x=>x.id===id); if(!item) throw new Error('Item not found.'); return item; }
  function action(op, value={}) {
    switch(op) {
      case 'todo:add': {const date=/^\d{4}-\d{2}-\d{2}$/.test(value.date||'')?value.date:dayKey(now());const time=/^\d{2}:\d{2}$/.test(value.time||'')?value.time:'';const priority=['low','normal','high'].includes(value.priority)?value.priority:'normal';const repeat=['none','daily','weekly','monthly'].includes(value.repeat)?value.repeat:'none';data.todos.unshift({id:randomUUID(),text:text(value.text),date,time,priority,repeat,dueAt:todoDueAt(date,time),notified:false,done:false,at:now()});break;}
      case 'todo:edit': { const t=find('todos',value.id); if(value.text!==undefined)t.text=text(value.text); if(typeof value.date==='string' && /^\d{4}-\d{2}-\d{2}$/.test(value.date))t.date=value.date;if(typeof value.time==='string'&&(value.time===''||/^\d{2}:\d{2}$/.test(value.time)))t.time=value.time;if(['low','normal','high'].includes(value.priority))t.priority=value.priority;if(['none','daily','weekly','monthly'].includes(value.repeat))t.repeat=value.repeat;t.dueAt=todoDueAt(t.date,t.time);if(typeof value.done==='boolean'){if(value.done&&!t.done&&t.repeat!=='none'){const next=new Date(`${t.date}T${t.time||'09:00'}:00`);if(t.repeat==='daily')next.setDate(next.getDate()+1);if(t.repeat==='weekly')next.setDate(next.getDate()+7);if(t.repeat==='monthly')next.setMonth(next.getMonth()+1);const nextDate=dayKey(next.getTime());data.todos.unshift({...t,id:randomUUID(),date:nextDate,dueAt:todoDueAt(nextDate,t.time),notified:false,done:false,at:now()});}t.done=value.done;t.completedAt=value.done?now():0;t.notified=false;}break; }
      case 'todo:remove': data.todos=data.todos.filter(x=>x.id!==value.id); break;
      case 'reminder:add': { const at=Number(value.at); if(!Number.isFinite(at) || at<=now())throw new Error('Choose a future time.'); data.reminders.unshift({id:randomUUID(),text:text(value.text),at,fired:false}); break; }
      case 'reminder:snooze': { const r=find('reminders',value.id); r.at=now()+Math.max(1,Math.min(1440,Number(value.minutes)||10))*60000; r.fired=false; break; }
      case 'reminder:edit': { const r=find('reminders',value.id); if(value.text!==undefined)r.text=text(value.text); if(value.at!==undefined){const at=Number(value.at);if(!Number.isFinite(at)||at<=now())throw new Error('Choose a future time.');r.at=at;r.fired=false;} break; }
      case 'reminder:remove': data.reminders=data.reminders.filter(x=>x.id!==value.id); break;
      case 'water:drink': { const ml=Number(value.ml)||data.water.bottle; if(ml<10||ml>3000)throw new Error('Enter 10–3000 ml.'); data.water.logs.push({id:randomUUID(),at:now(),ml}); break; }
      case 'water:undo': { const today=data.water.logs.filter(x=>dayKey(x.at)===dayKey(now())); const last=today.at(-1); if(last)data.water.logs=data.water.logs.filter(x=>x.id!==last.id); break; }
      case 'water:settings': {const next={...data.water};for(const [k,min,max] of [['goal',250,10000],['bottle',50,3000],['interval',5,240],['from',0,23],['to',1,24]]) if(value[k]!==undefined){ const n=Number(value[k]); if(!Number.isFinite(n)||n<min||n>max)throw new Error('Invalid hydration setting.'); next[k]=n; }if(next.from>=next.to)throw new Error('The hydration end hour must follow its start hour.');if(typeof value.enabled==='boolean'){if(value.enabled&&!next.enabled)next.lastReminder=now();next.enabled=value.enabled;}if(['auto','custom'].includes(value.schedule))next.schedule=value.schedule;data.water=next;break;}
      case 'water:snooze': data.water.snoozedUntil=now()+Math.max(1,Math.min(240,Number(value.minutes)||15))*60000;break;
      case 'focus:duration': {const minutes=Number(value.minutes);if(!Number.isFinite(minutes)||minutes<1||minutes>1440)throw new Error('Choose 1–1440 minutes.');data.focusMinutes=minutes;break;}
      case 'stopwatch:start': data.stopwatch={elapsed:0,started:clockNow(),running:true};break;
      case 'stopwatch:pause': if(data.stopwatch?.running){data.stopwatch.elapsed=stopwatchElapsed(data.stopwatch,clockNow());data.stopwatch.running=false;}break;
      case 'stopwatch:resume': if(data.stopwatch&&!data.stopwatch.running){data.stopwatch.started=clockNow();data.stopwatch.running=true;}break;
      case 'stopwatch:reset': data.stopwatch=null;break;
      case 'timer:start': { const seconds=Number(value.seconds); if(!Number.isFinite(seconds)||seconds<1||seconds>86400)throw new Error('Timer must be 1 second to 24 hours.'); data.timer={seconds,remaining:seconds,end:clockNow()+seconds*1000,paused:false,kind:['focus','short','long','timer'].includes(value.kind)?value.kind:'timer',cycles:data.timer?.cycles||0}; break; }
      case 'timer:pause': if(data.timer&&!data.timer.paused){ data.timer.remaining=Math.max(0,Math.ceil((data.timer.end-clockNow())/1000)); data.timer.paused=true; } break;
      case 'timer:resume': if(data.timer?.paused){data.timer.end=clockNow()+data.timer.remaining*1000; data.timer.paused=false;} break;
      case 'timer:stop': data.timer=null; break;
      case 'dictionary:add': { const term=text(value.term,150),from=typeof value.from==='string'?value.from.trim().slice(0,150):''; if(data.dictionary.some(x=>x.term.toLowerCase()===term.toLowerCase()))throw new Error('That term is already in your dictionary.'); data.dictionary.push({id:randomUUID(),term,from}); break; }
      case 'dictionary:edit': { const item=find('dictionary',value.id);const term=text(value.term??item.term,150);if(data.dictionary.some(x=>x.id!==item.id&&x.term.toLowerCase()===term.toLowerCase()))throw new Error('That term is already in your dictionary.');item.term=term;item.from=typeof value.from==='string'?value.from.trim().slice(0,150):item.from;break; }
      case 'dictionary:remove': data.dictionary=data.dictionary.filter(x=>x.id!==value.id); break;
      case 'snippet:add': { const trigger=text(value.trigger,100),expansion=text(value.expansion,10000); if(data.snippets.some(x=>x.trigger.toLowerCase()===trigger.toLowerCase()))throw new Error('That spoken shortcut already exists.'); data.snippets.push({id:randomUUID(),trigger,expansion}); break; }
      case 'snippet:edit': { const item=find('snippets',value.id);const trigger=text(value.trigger??item.trigger,100);if(data.snippets.some(x=>x.id!==item.id&&x.trigger.toLowerCase()===trigger.toLowerCase()))throw new Error('That spoken shortcut already exists.');item.trigger=trigger;if(value.expansion!==undefined)item.expansion=text(value.expansion,10000);break; }
      case 'snippet:remove': data.snippets=data.snippets.filter(x=>x.id!==value.id); break;
      case 'shelf:add': for(const p of (Array.isArray(value.paths)?value.paths:[]).slice(0,100))if(typeof p==='string'&&path.isAbsolute(p)&&fs.existsSync(p)&&!data.shelf.includes(p))data.shelf.push(p); data.shelf=data.shelf.slice(-200); break;
      case 'shelf:remove': data.shelf=data.shelf.filter(x=>!(value.paths||[]).includes(x)); break;
      case 'shelf:clear': data.shelf=[]; break;
      case 'project:add': { const p=value.path; if(typeof p!=='string'||!path.isAbsolute(p)||!fs.statSync(p).isDirectory())throw new Error('Choose a project folder.'); if(!data.projects.some(x=>x.path===p))data.projects.push({id:randomUUID(),name:path.basename(p),path:p}); break; }
      case 'project:remove': data.projects=data.projects.filter(x=>x.id!==value.id); break;
      case 'history:add': if(data.retentionDays!==0)data.history.unshift({id:randomUUID(),at:now(),kind:String(value.kind||'dictation').slice(0,40),raw:String(value.raw||'').slice(0,20000),text:String(value.text||'').slice(0,40000),seconds:Math.max(0,Number(value.seconds)||0),app:String(value.app||'').slice(0,150),recognizedLanguage:String(value.recognizedLanguage||'unknown').slice(0,20),outputScript:String(value.outputScript||'auto').slice(0,20),responseLanguage:String(value.responseLanguage||'').slice(0,20)}); data.history=data.history.slice(0,5000); break;
      case 'history:clear': data.history=[]; break;
      case 'clips:enable': data.clipboardEnabled=value.enabled===true; break;
      case 'clips:add': if(data.clipboardEnabled && !require('./clipboard-privacy.cjs').sensitiveClipboard(value.text)){data.clips=[{id:randomUUID(),at:now(),text:value.text},...data.clips.filter(x=>x.text!==value.text)].slice(0,500);} break;
      case 'clips:remove': data.clips=data.clips.filter(x=>x.id!==value.id);break;
      case 'clips:clear': data.clips=[]; break;
      case 'meeting:save': { const item={id:value.id||randomUUID(),at:now(),title:text(value.title||'Meeting',200),transcript:String(value.transcript||'').slice(0,400000),notes:String(value.notes||'').slice(0,100000)}; data.meetings=[item,...data.meetings.filter(x=>x.id!==item.id)].slice(0,100); break; }
      case 'meeting:remove': data.meetings=data.meetings.filter(x=>x.id!==value.id); break;
      case 'teleprompter:save': if(typeof value.text==='string')data.teleprompter.text=value.text.slice(0,100000); if(Number.isFinite(value.speed))data.teleprompter.speed=Math.max(5,Math.min(150,value.speed)); if(Number.isFinite(value.fontSize))data.teleprompter.fontSize=Math.max(16,Math.min(72,value.fontSize)); if(typeof value.mirror==='boolean')data.teleprompter.mirror=value.mirror; break;
      case 'quiet:shown': {const q=data.quiet;const item=require('./quiet.cjs').LINES.find(x=>x.id===value.id);if(!item)throw new Error('Unknown thought.');const day=value.day;if(!value.manual){q.count=q.day===day?q.count+1:1;q.day=day;q.lastAt=now();}q.shown[item.id]=now();q.lastTheme=item.theme;q.recent=[...q.recent,item.id].slice(-129);break;}
      case 'quiet:favorite': {if(!require('./quiet.cjs').LINES.some(x=>x.id===value.id))throw new Error('Unknown thought.');data.quiet.favorites=data.quiet.favorites.includes(value.id)?data.quiet.favorites.filter(id=>id!==value.id):[...data.quiet.favorites,value.id];break;}
      case 'quiet:mute': {if(!require('./quotes.cjs').byId.has(value.id))throw new Error('Unknown thought.');data.quiet.muted=[...new Set([...data.quiet.muted,value.id])];break;}
      case 'quiet:unmute': data.quiet.muted=data.quiet.muted.filter(id=>id!==value.id);break;
      case 'quiet:reset': data.quiet={...defaults.quiet,schemaVersion:2,muted:[],shown:{},patches:data.quiet.patches,favorites:data.quiet.favorites,legacyFavorites:data.quiet.legacyFavorites};break;
      case 'quiet:import': {if(value.schema!=='agent-notch-favorites-v1'||!Array.isArray(value.favorites)||value.favorites.length>129||value.favorites.some(id=>!require('./quotes.cjs').byId.has(id)))throw new Error('Invalid favorites file.');data.quiet.favorites=[...new Set([...data.quiet.favorites,...value.favorites])];break;}
      case 'quiet:patch': data.quiet.patches=require('./quotes.cjs').validatePatches(value);break;
      case 'config': if(typeof value.mediaAppId==='string'&&value.mediaAppId.length<=1500)data.mediaAppId=value.mediaAppId;if(Number.isFinite(value.lyricsOffsetMs))data.lyricsOffsetMs=Math.max(-10000,Math.min(10000,value.lyricsOffsetMs));if(typeof value.city==='string')data.city=value.city.trim().slice(0,100); if(typeof value.calendarUrl==='string'){if(value.calendarUrl&&!/^https:\/\//.test(value.calendarUrl))throw new Error('Use an HTTPS calendar link.');data.calendarUrl=value.calendarUrl.slice(0,3000);} if(Number.isInteger(value.retentionDays)&&value.retentionDays>=-1&&value.retentionDays<=3650)data.retentionDays=value.retentionDays; break;
      default: throw new Error('Unknown library action.');
    }
    prune();if(!op.startsWith('clips:')||op==='clips:enable')save();return view();
  }
  function tick({managedReminders=false}={}) {
    const events=[];
    if(!managedReminders)for(const r of data.reminders)if(!r.fired && r.at<=now()){r.fired=true;events.push({kind:'reminder',id:r.id,title:'Reminder',body:r.text});}
    for(const todo of data.todos)if(!todo.done&&!todo.notified&&todo.dueAt&&todo.dueAt<=now()){todo.notified=true;events.push({kind:'todo',id:todo.id,title:'Task due',body:todo.text});}
    if(data.timer&&!data.timer.paused&&data.timer.end<=clockNow()){const t=data.timer;events.push({kind:'timer',title:t.kind==='focus'?'Focus complete':'Timer complete',body:t.kind==='focus'?'Time for a break.':'Your timer has finished.'});if(t.kind==='focus')t.cycles++;data.focusSessions.push({at:now(),seconds:t.seconds,kind:t.kind});data.focusSessions=data.focusSessions.slice(-365);t.remaining=0;t.paused=true;}
    const water=data.water,hour=new Date(now()).getHours(),plan=waterPlan(water,now());
    if(!managedReminders&&water.enabled&&hour>=water.from&&hour<water.to&&now()>=(water.snoozedUntil||0)&&now()-Math.max(water.lastReminder,plan.startsAt)>=plan.interval*60000&&view().water.today<water.goal){water.lastReminder=now();events.push({kind:'water',title:'Water reminder',body:`Time to drink water — ${Math.min(water.bottle,Math.max(0,water.goal-view().water.today))} ml toward your daily goal.`});}
    if(events.length)save();return events;
  }
  function transform(input) {
    let output=String(input||'');
    const esc = s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
    for(const item of data.dictionary)if(item.from)output=output.replace(new RegExp(`(?<![\\p{L}\\p{N}_])${esc(item.from)}(?![\\p{L}\\p{N}_])`,'giu'),()=>item.term);
    for(const item of [...data.snippets].sort((a,b)=>b.trigger.length-a.trigger.length))output=output.replace(new RegExp(`(?<![\\p{L}\\p{N}_])${esc(item.trigger)}(?![\\p{L}\\p{N}_])`,'giu'),()=>item.expansion);
    return output;
  }
  return {view,action,tick,transform,save};
}
function stats(history) {
  const dict=history.filter(x=>x.kind==='dictation');const words=dict.reduce((n,x)=>n+(x.text.trim()?x.text.trim().split(/\s+/).length:0),0);const seconds=dict.reduce((n,x)=>n+x.seconds,0);
  const days={};for(const item of history){const day=dayKey(item.at);days[day]=(days[day]||0)+1;} return {sessions:dict.length,words,seconds,wpm:seconds?Math.round(words/seconds*60):0,days,apps:dict.reduce((map,x)=>{map[x.app||'Unknown']=(map[x.app||'Unknown']||0)+1;return map;},{})};
}
function stopwatchElapsed(timer,at=Date.now()){return Math.max(0,(timer?.elapsed||0)+(timer?.running?at-timer.started:0));}
function waterPlan(w,at=Date.now()){
  const start=new Date(at);start.setHours(w.from,0,0,0);
  const servings=Math.max(1,Math.ceil(w.goal/w.bottle));
  const interval=w.schedule==='auto'?Math.max(5,Math.round((w.to-w.from)*60/servings)):w.interval;
  return {interval,count:Math.floor((w.to-w.from)*60/interval),startsAt:start.getTime(),nextAt:Math.max(start.getTime(),w.lastReminder||0)+interval*60000};
}
module.exports={createLibrary,dayKey,stats,stopwatchElapsed,waterPlan};
