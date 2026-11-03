'use strict';
const {catalog,localized}=require('./quotes.cjs');
const LINES=catalog.quotes;
const DEFAULTS=Object.freeze({schemaVersion:2,enabled:true,dnd:false,allDay:true,onHover:true,atBreaks:false,morningStart:7,morningEnd:11,eveningStart:17,eveningEnd:22,dailyCap:2,cooldownMinutes:240,category:'mixed',deepReflection:false,spiritual:false,role:'',workStart:'',workEnd:'',quietStart:'',quietEnd:'',snoozedUntil:0});
function validateQuiet(config){
 const value={...DEFAULTS,...config,schemaVersion:2};
 for(const key of ['enabled','dnd','allDay','onHover','atBreaks','deepReflection','spiritual'])if(typeof value[key]!=='boolean')throw new Error('Invalid quote setting: '+key);
 for(const key of ['morningStart','morningEnd','eveningStart','eveningEnd'])if(!Number.isInteger(value[key])||value[key]<0||value[key]>24)throw new Error('Quote hours must be 0–24.');
 if(!Number.isInteger(value.dailyCap)||value.dailyCap<0||value.dailyCap>3)throw new Error('Choose 0–3 automatic thoughts per day.');
 if(!Number.isFinite(value.cooldownMinutes)||value.cooldownMinutes<240||value.cooldownMinutes>43200)throw new Error('Choose at least 240 minutes between thoughts.');
 if(!['mixed','calm','focus','motivation','philosophy','resilience','self','spiritual'].includes(value.category))throw new Error('Unknown quote category.');
 for(const key of ['workStart','workEnd','quietStart','quietEnd'])if(typeof value[key]!=='string'||(value[key]&&!/^([01]\d|2[0-3]):[0-5]\d$/.test(value[key])))throw new Error('Use HH:MM for routine hours.');
 if(!['','student','employed','self_employed','mixed','other'].includes(value.role))throw new Error('Unknown optional role.');
 if(!Number.isFinite(value.snoozedUntil)||value.snoozedUntil<0)throw new Error('Invalid snooze.');return value;
}
function migrateQuiet(saved={}){return saved.schemaVersion===2?validateQuiet(saved):validateQuiet({...DEFAULTS,enabled:saved.enabled!==false,dnd:!!saved.dnd,legacyPreferences:saved});}
function inWindow(hour,start,end){return start===end?true:start<end?hour>=start&&hour<end:hour>=start||hour<end;}
const minutes=value=>Number(value.split(':')[0])*60+Number(value.split(':')[1]);
function quietHours(config,date){return !!(config.quietStart&&config.quietEnd&&inWindow(date.getHours()*60+date.getMinutes(),minutes(config.quietStart),minutes(config.quietEnd)));}
function daypart(config,date){const minute=date.getHours()*60+date.getMinutes();if(config.workStart&&config.workEnd){const start=minutes(config.workStart),end=minutes(config.workEnd),since=(minute-start+1440)%1440,duration=(end-start+1440)%1440;if(since<120)return'morning';if(since<duration)return'midday';return'evening';}return inWindow(date.getHours(),config.morningStart,config.morningEnd)?'morning':inWindow(date.getHours(),config.eveningStart,config.eveningEnd)?'evening':'midday';}
function pickMoment(config,history={},now=Date.now(),random=Math.random,activity={},language='en',tone='balanced'){
 const c={...DEFAULTS,...config},date=new Date(now),manual=activity.context==='manual';
 if(!c.enabled||c.dnd||activity.locked||activity.voiceRecording||activity.pomodoro||activity.meeting||activity.fullscreen||activity.typing||c.snoozedUntil>now)return null;
 if(!manual&&(activity.osDnd!==false||activity.systemKnown!==true||activity.foregroundChangedAt&&now-activity.foregroundChangedAt<20000||!activity.intentional||!activity.expanded||quietHours(c,date)||!c.onHover&&!(c.atBreaks&&activity.transition)))return null;
 const day=`${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`,period=daypart(c,date);
 if(!manual&&((history.day===day&&history.count>=c.dailyCap)||!c.dailyCap||now-(history.lastAt||0)<c.cooldownMinutes*60000||!c.allDay&&period==='midday'))return null;
 let candidates=LINES.filter(q=>!(history.muted||[]).includes(q.id)&&(!q.requires_opt_in||(q.display_category==='Spiritual'?c.spiritual:c.deepReflection))&&(manual||q.auto_eligible)&&(c.category==='mixed'||({calm:'Calm',focus:'Motivation',motivation:'Motivation',philosophy:'Philosophy',resilience:'Resilience',self:'Self & Life',spiritual:'Spiritual'})[c.category]===q.display_category));
 const recent=history.shown||{},fresh=candidates.filter(q=>now-(recent[q.id]||0)>30*86400000&&!history.recent?.includes(q.id));if(fresh.length)candidates=fresh;else candidates=candidates.filter(q=>q.id!==history.recent?.at(-1));
 const scored=candidates.map(q=>({q,score:(q.dayparts.includes(period)?4:0)+(activity.transition&&q.dayparts.includes('work_break')?5:0)+(history.favorites?.includes(q.id)?2:0)-(q.theme===history.lastTheme?8:0)+(tone==='cinematic'&&q.display_category==='Motivation'?3:0)+(tone==='quiet'&&q.tone==='reflective'?3:0)+random()})).sort((a,b)=>b.score-a.score);
 const q=scored[0]?.q;return q?{...localized(q,language,history.patches),day,manual,reason:manual?'Requested by you':activity.transition?'Chosen for your enabled task-break setting':`Chosen for your ${period} reflection setting`}:null;
}
module.exports={LINES,DEFAULTS,validateQuiet,migrateQuiet,inWindow,quietHours,daypart,pickMoment};
