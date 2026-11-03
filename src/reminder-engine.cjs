'use strict';
const{randomUUID,randomBytes}=require('node:crypto');const{nextOccurrence,inWindow,dateKey}=require('./reminder-time.cjs');
const{DEFAULT_NOTIFICATIONS}=require('./productivity-store.cjs');
function createReminderEngine({store,deliver,openItem=()=>{},onChange=()=>{},contentForRule=defaultContent}){
  const{db,now}=store;let ticking=false,lastZone=store.timezone(),lastTickAt=now();
  // A crash after dispatch must not replay a possibly visible toast on restart.
  db.prepare("UPDATE reminder_occurrences SET state='unknown',reason='App restarted during Windows submission; check notification history.' WHERE state='dispatching'").run();
  const settings=()=>{const value=store.getSetting('notifications',DEFAULT_NOTIFICATIONS);return{...structuredClone(DEFAULT_NOTIFICATIONS),...value,categories:Object.fromEntries(Object.entries(DEFAULT_NOTIFICATIONS.categories).map(([kind,defaults])=>[kind,{...defaults,...value.categories?.[kind]}]))};};
  function occurrence(row){return{...row,content:JSON.parse(row.content)};}
  function policy(row,context,prefs){
    const kind=row.content.kind,category=prefs.categories[kind];
    if(!prefs.enabled)return'App notifications are off.';if(prefs.busy)return'Busy mode is on.';if(prefs.delivery==='windows'&&!prefs.windowsEnabled)return'Windows delivery is turned off in Agent Notch.';if(category?.enabled===false)return'This notification category is off.';
    if(context.meeting)return'Gaming / Meeting Mode is suppressing notices.';if(context.locked)return'Screen is locked.';if(context.suspended)return'Windows is asleep.';
    if(prefs.delivery==='windows'&&context.osEnabled===false)return'Windows notifications are disabled.';
    if(context.fullscreen||context.shellBlocked)return'Windows presentation or notification state is blocking interruptions.';
    if(prefs.quietEnabled&&inWindow(now(),prefs.quietStart,prefs.quietEnd,store.timezone()))return'Quiet hours are active.';
    if(context.focus&&(row.content.priority||category?.priority)!=='high'&&kind!=='timer'&&!row.content.rest)return'Waiting for the focus session to finish.';
    if(context.activity&&['book','course','workout'].includes(kind)&&!row.content.rest)return'An activity session is already running.';
    return'';
  }
  function enqueue(rule,scheduledFor,key,{state='queued',reason='',immediate=false}={}){
    const prefs=settings();if(prefs.delivery!=='windows'&&!rule.test&&!rule.rest&&db.prepare("SELECT id FROM reminder_occurrences WHERE state IN ('dispatching','delivered','unknown','snoozed') AND (action_at IS NULL OR state='snoozed') AND json_extract(content,'$.surface')='notch' AND json_extract(content,'$.kind')=? AND COALESCE(json_extract(content,'$.targetId'),'')=? LIMIT 1").get(rule.kind,rule.targetId||'')){state='skipped';reason='A reminder for this item is already pinned or snoozed.';}let content;try{content=contentForRule(rule,store);}catch{content=defaultContent(rule,store);}content={...content,soundId:rule.soundId,priority:rule.priority};const id=randomUUID();
    db.prepare('INSERT OR IGNORE INTO reminder_occurrences(id,reminder_id,occurrence_key,scheduled_for,state,content,reason,not_before) VALUES(?,?,?,?,?,?,?,?)').run(id,rule.id,key,scheduledFor,state,JSON.stringify(content),reason,immediate||prefs.delivery!=='windows'||!prefs.grouping||(rule.priority||prefs.categories[rule.kind]?.priority)==='high'?now():now()+prefs.groupMinutes*60000);
  }
  function tick(context={}){
    if(ticking||context.suspended)return;ticking=true;
    try{
      const zone=store.timezone(),prefs=settings();
      if(now()<lastTickAt-60000){store.tx(()=>{for(const row of db.prepare('SELECT * FROM reminder_rules WHERE deleted_at IS NULL').all()){const rule=store.ruleView(row);if(rule.mode!=='one-off')store.saveRule(rule);}});}lastTickAt=now();
      if(zone!==lastZone){store.tx(()=>{for(const row of db.prepare('SELECT * FROM reminder_rules WHERE deleted_at IS NULL').all()){const rule=store.ruleView(row);if(rule.followSystem)store.saveRule({...rule,timezone:zone});}});lastZone=zone;}
      let missedCount=0;
      store.tx(()=>{
        for(const row of db.prepare('SELECT * FROM reminder_rules WHERE deleted_at IS NULL AND next_at<=? ORDER BY next_at').all(now())){
          const rule=store.ruleView(row),stale=now()-row.next_at>300000,goalReached=rule.id==='water'&&!store.water().continueAfterGoal&&store.water().today>=store.water().goal;
          if(rule.skippedDay===dateKey(now(),rule.timezone))enqueue(rule,row.next_at,row.next_key,{state:'skipped',reason:'Skipped for today.'});
          else if(goalReached)enqueue(rule,row.next_at,row.next_key,{state:'skipped',reason:'Daily water goal reached.'});
          else{enqueue(rule,row.next_at,row.next_key,{state:stale?'missed':'queued',reason:stale?'Missed while the app was unavailable; no repeated catch-up alerts.':'',immediate:rule.test===true||rule.rest===true});if(stale)missedCount++;}
          const next=nextOccurrence(rule,now());db.prepare('UPDATE reminder_rules SET next_at=?,next_key=? WHERE id=?').run(next?.at??null,next?.key??null,rule.id);
        }
        if(missedCount&&prefs.catchUp){const id='system:catchup:'+Math.floor(now()/60000),rule=store.saveRule({id,kind:'general',mode:'one-off',enabled:false,timezone:zone,at:now(),title:'Agent Notch · Missed reminders',body:missedCount+' reminders were missed. Review them when convenient.'});enqueue(rule,now(),'summary',{immediate:true});}
      });
      const candidates=db.prepare("SELECT * FROM reminder_occurrences WHERE state IN ('queued','deferred','snoozed') ORDER BY scheduled_for LIMIT 100").all().map(occurrence),permitted=[];
      for(const row of candidates){
        const sourceRule=db.prepare('SELECT * FROM reminder_rules WHERE id=?').get(row.reminder_id);
        if(sourceRule&&JSON.parse(sourceRule.data).skippedDay===dateKey(now(),JSON.parse(sourceRule.data).timezone)){db.prepare("UPDATE reminder_occurrences SET state='skipped',reason='Skipped for today.' WHERE id=?").run(row.id);continue;}
        if(sourceRule?.target_id){const target=db.prepare('SELECT * FROM records WHERE id=?').get(sourceRule.target_id),status=target?JSON.parse(target.data).status:'';if(!target||target.deleted_at||target.archived||['paused','finished','abandoned','completed'].includes(status)){db.prepare("UPDATE reminder_occurrences SET state='skipped',reason='Item is paused, finished, archived or unavailable.' WHERE id=?").run(row.id);continue;}}
        if(sourceRule?.deleted_at||sourceRule&&JSON.parse(sourceRule.data).enabled===false&&!row.reminder_id.startsWith('system:')&&!row.reminder_id.startsWith('legacy:')){db.prepare("UPDATE reminder_occurrences SET state='skipped',reason='Schedule was disabled or removed.' WHERE id=?").run(row.id);continue;}
        if(row.reminder_id==='water'){const water=store.water();if(!water.continueAfterGoal&&water.today>=water.goal){db.prepare("UPDATE reminder_occurrences SET state='skipped',reason='Daily water goal reached.' WHERE id=?").run(row.id);continue;}}
        if(now()-row.scheduled_for>86400000&&row.state!=='snoozed'){db.prepare("UPDATE reminder_occurrences SET state='missed',reason='Expired without interrupting you.' WHERE id=?").run(row.id);continue;}
        const blocked=policy(row,context,prefs);
        if(blocked){const rule=store.ruleView(db.prepare('SELECT * FROM reminder_rules WHERE id=?').get(row.reminder_id));const skip=rule?.quietHourPolicy==='skip';db.prepare('UPDATE reminder_occurrences SET state=?,reason=? WHERE id=?').run(skip?'skipped':'deferred',blocked,row.id);continue;}
        if(row.state==='snoozed'&&row.snoozed_until>now())continue;permitted.push(row);
      }
      if(!permitted.some(row=>(row.not_before||0)<=now()))return;
      const deliveredToday=db.prepare('SELECT delivered_at FROM reminder_occurrences WHERE delivered_at IS NOT NULL').all().filter(row=>dateKey(row.delivered_at,zone)===dateKey(now(),zone)).length;
      if(deliveredToday>=prefs.maxPerDay){for(const row of permitted)db.prepare("UPDATE reminder_occurrences SET state='deferred',reason='Daily notification limit reached.' WHERE id=?").run(row.id);return;}
      const backlog=permitted.some(row=>now()-row.scheduled_for>300000);
      const batches=prefs.delivery!=='windows'?permitted.map(row=>[row]):prefs.grouping||backlog?[permitted]:permitted.filter(row=>(row.not_before||0)<=now()).slice(0,Math.max(0,prefs.maxPerDay-deliveredToday)).map(row=>[row]);
      for(const rows of batches){
        const token=randomBytes(24).toString('hex');store.tx(()=>{for(const row of rows)db.prepare("UPDATE reminder_occurrences SET state='dispatching',reason='',action_at=NULL,action_token=?,attempts=attempts+1 WHERE id=?").run(token,row.id);});
        const ids=rows.map(row=>row.id),content=rows.length===1?rows[0].content:{kind:'general',title:'Agent Notch · Reminders',body:rows.length+' reminders are ready. '+rows.map(row=>row.content.title).slice(0,3).join(' · '),digest:true};
        const report=(state,reason='')=>{for(const id of ids)db.prepare("UPDATE reminder_occurrences SET state=?,reason=?,delivered_at=CASE WHEN ?='delivered' THEN ? ELSE delivered_at END WHERE id=? AND state='dispatching'").run(state,reason,state,now(),id);onChange();};
        try{deliver({ids,token,content,settings:prefs,context,onShow:()=>report('delivered',prefs.delivery==='windows'?'Submitted to Windows; banner visibility and audibility are not confirmed.':'Displayed at the notch.'),onFailure:reason=>report('failed',String(reason).slice(0,500)),onUnknown:()=>report('unknown','Windows submission outcome is unknown. Check system settings before retrying.')});}catch(error){report('failed',error.message);}
      }
      onChange();
    }finally{ticking=false;}
  }
  function action({ids,action,token,source='ui',minutes}){
    if(!Array.isArray(ids)||!ids.length||ids.length>100||ids.some(id=>typeof id!=='string'||id.length>100))throw new Error('Invalid notification action.');
    if(!['open','done','drink','start','snooze','skip','dismiss','retry','read'].includes(action))throw new Error('Invalid notification action.');
    const output=store.tx(()=>{
      const affected=[];
      for(const id of [...new Set(ids)]){
        const row=db.prepare('SELECT * FROM reminder_occurrences WHERE id=?').get(id);if(!row)continue;
        if(source==='windows'&&(typeof token!=='string'||!row.action_token||row.action_token!==token))continue;
        if(['completed','skipped','dismissed'].includes(row.state)&&action!=='open'&&action!=='read')continue;
        if(source==='windows'&&row.action_at&&row.state==='snoozed')continue;
        const content=JSON.parse(row.content);
        if(action==='read'){db.prepare('UPDATE reminder_occurrences SET read_at=? WHERE id=?').run(now(),id);continue;}
        if(action==='retry'){db.prepare("UPDATE reminder_occurrences SET state='queued',not_before=?,action_at=NULL,action_token=NULL WHERE id=?").run(now(),id);affected.push(content);continue;}
        if(action==='snooze'){const duration=minutes??settings().snoozeMinutes;if(!Number.isInteger(duration)||duration<1||duration>1440)throw new Error('Choose 1–1440 snooze minutes.');db.prepare("UPDATE reminder_occurrences SET state='snoozed',snoozed_until=?,not_before=?,action_at=? WHERE id=?").run(now()+duration*60000,now()+duration*60000,now(),id);affected.push(content);continue;}
        if(action==='open'||action==='start'){db.prepare('UPDATE reminder_occurrences SET read_at=? WHERE id=?').run(now(),id);affected.push(content);continue;}
        if(action==='drink'){if(content.kind!=='water')throw new Error('This is not a water reminder.');store.drink({ml:store.water().bottle,requestId:'notification:'+id,source:'notification'});}
        if(action==='done'&&content.kind==='course'&&content.lessonId)affected.push({...content,completeLesson:true});
        if(action==='skip'){const rule=store.ruleView(db.prepare('SELECT * FROM reminder_rules WHERE id=?').get(row.reminder_id));store.saveRule({...rule,skippedDay:dateKey(now(),rule.timezone)});}
        db.prepare('UPDATE reminder_occurrences SET state=?,action_at=?,read_at=? WHERE id=?').run(action==='drink'||action==='done'?'completed':action==='skip'?'skipped':'dismissed',now(),now(),id);
      }
      return affected;
    });
    if(action==='open'||action==='start')for(const content of output)openItem(content,action);onChange();return{changed:output.length,history:history()};
  }
  function history(){return db.prepare('SELECT id,reminder_id,occurrence_key,scheduled_for,state,content,reason,delivered_at,action_at,snoozed_until,read_at FROM reminder_occurrences ORDER BY scheduled_for DESC LIMIT 500').all().map(occurrence);}
  function recordEvent(event){
    const id='legacy:'+event.kind+':'+(event.id||event.at||event.title),at=event.at||now();
    if(!db.prepare('SELECT id FROM reminder_rules WHERE id=?').get(id))store.saveRule({id,kind:event.kind==='todo'?'todo':event.kind==='timer'?'timer':'general',mode:'one-off',enabled:false,timezone:store.timezone(),at,title:event.title});
    enqueue({id,kind:event.kind,title:event.title,body:event.body},at,'event:'+at,{immediate:true});
  }
  function scheduleTest(delaySeconds=0){const id='test:'+randomUUID(),at=now()+delaySeconds*1000;const rule=store.saveRule({id,kind:'water',mode:'one-off',enabled:true,test:true,timezone:store.timezone(),at,title:'Agent Notch · Test reminder',body:'Scheduled reminder test. The island can stay collapsed.'},{after:at-1});if(delaySeconds===0){enqueue(rule,at,'once:'+at,{immediate:true});db.prepare('UPDATE reminder_rules SET next_at=NULL,next_key=NULL WHERE id=?').run(id);}return{id,at};}
  return{tick,action,history,recordEvent,scheduleTest,settings,blockReason:(content,context={})=>policy({content},context,settings())};
}
function defaultContent(rule,store){
  if(rule.kind==='water'){const water=store.water();return{kind:'water',title:rule.title||'Agent Notch · Water',body:rule.body||`Time for a sip. ${water.today} of ${water.goal} ml today.`,targetId:null};}
  return{kind:rule.kind,title:rule.title||'Agent Notch · Reminder',body:rule.body||rule.title||'A reminder is ready.',targetId:rule.targetId||null};
}
module.exports={createReminderEngine,defaultContent};
