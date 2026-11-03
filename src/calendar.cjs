'use strict';
const ICAL=require('ical.js');const{Worker,isMainThread,parentPort,workerData}=require('node:worker_threads');
function calendarDate(raw,zone){const m=raw.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z)?)?/);if(!m)return NaN;const p=m.slice(1,7).map(x=>Number(x)||0);const wall=Date.UTC(p[0],p[1]-1,p[2],p[3],p[4],p[5]);let at=wall;if(m[7])return at;if(zone){const fmt=new Intl.DateTimeFormat('en-GB',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});for(let i=0;i<3;i++){const v=Object.fromEntries(fmt.formatToParts(new Date(at)).map(x=>[x.type,x.value]));at+=wall-Date.UTC(+v.year,+v.month-1,+v.day,+v.hour,+v.minute,+v.second);}return at;}return new Date(p[0],p[1]-1,p[2],p[3],p[4],p[5]).getTime();}
function milliseconds(time,component,field){
 const zone=component.getFirstProperty(field)?.getParameter('tzid')||component.getFirstProperty('dtstart')?.getParameter('tzid');
 if(zone&&time.zone.tzid==='floating'){
  const pad=n=>String(n).padStart(2,'0');const raw=`${time.year}${pad(time.month)}${pad(time.day)}T${pad(time.hour)}${pad(time.minute)}${pad(time.second)}`;
  return calendarDate(raw,zone);
 }
 return time.toJSDate().getTime();
}
function parseCalendar(text,now=Date.now()){
 if(typeof text!=='string'||text.length>5_000_000)throw new Error('Calendar is too large.');
 const wrapped=text.includes('BEGIN:VCALENDAR')?text:`BEGIN:VCALENDAR\nVERSION:2.0\n${text}\nEND:VCALENDAR`;
 const root=new ICAL.Component(ICAL.parse(wrapped));for(const component of root.getAllSubcomponents('vtimezone')){const zone=new ICAL.Timezone(component);ICAL.TimezoneService.register(zone.tzid,zone);}
 const components=root.getAllSubcomponents('vevent'),events=[],deadline=Date.now()+2500,horizon=now+90*86400000;
 if(components.length>10000)throw new Error('Calendar contains too many events.');
 for(const component of components){if(component.hasProperty('recurrence-id')||component.getFirstPropertyValue('status')==='CANCELLED')continue;
  const uid=component.getFirstPropertyValue('uid');const exceptions=components.filter(c=>c.hasProperty('recurrence-id')&&c.getFirstPropertyValue('uid')===uid);
  const event=new ICAL.Event(component,{exceptions});if(!component.hasProperty('dtstart'))continue;
  function add(start,end,item){if(item.component.getFirstPropertyValue('status')==='CANCELLED')return;const at=milliseconds(start,item.component,'dtstart'),until=milliseconds(end,item.component,'dtend');events.push({title:String(item.summary||'Event'),start:at,end:until,allDay:start.isDate,uid:String(uid||'')});}
  if(!event.isRecurring()){add(event.startDate,event.endDate,event);continue;}
  const iterator=event.iterator();let count=0,occurrence;
  while((occurrence=iterator.next())){
   if(++count>100000||Date.now()>deadline)throw new Error('Calendar recurrence processing limit reached.');
   const details=event.getOccurrenceDetails(occurrence),at=milliseconds(details.startDate,details.item.component,'dtstart'),end=milliseconds(details.endDate,details.item.component,'dtend');
   if(at>horizon)break;if(end>now)add(details.startDate,details.endDate,details.item);
   if(events.length>10000)throw new Error('Calendar has too many upcoming occurrences.');
  }
 }
 return events.sort((a,b)=>a.start-b.start);
}
function readCalendar(text,now=Date.now()){return new Promise((resolve,reject)=>{const worker=new Worker(__filename,{workerData:{text,now},resourceLimits:{maxOldGenerationSizeMb:96}});let settled=false;const timer=setTimeout(()=>finish(new Error('Calendar processing timed out.')),5000);function finish(error,value){if(settled)return;settled=true;clearTimeout(timer);worker.terminate();error?reject(error):resolve(value);}worker.once('message',m=>m.error?finish(new Error(m.error)):finish(null,m.events));worker.once('error',e=>finish(e));worker.once('exit',code=>{if(!settled)finish(new Error(`Calendar worker stopped (${code}).`));});});}
if(!isMainThread){try{parentPort.postMessage({events:parseCalendar(workerData.text,workerData.now)});}catch(e){parentPort.postMessage({error:e.message});}}
module.exports={calendarDate,parseCalendar,readCalendar};
