'use strict';
const fs=require('node:fs'),path=require('node:path'),{randomUUID}=require('node:crypto');
const {DatabaseSync}=require('node:sqlite');const{validateRule,nextOccurrence,dateKey}=require('./reminder-time.cjs');
const CATEGORIES=['book','course','workout','water','general','timer','todo'];
const DEFAULT_NOTIFICATIONS={enabled:true,delivery:'notch',windowsEnabled:true,busy:false,sounds:true,volume:.5,soundMode:'windows',quietEnabled:true,quietStart:'22:00',quietEnd:'08:00',grouping:true,groupMinutes:2,snoozeMinutes:10,catchUp:false,privacy:false,muteDuringMedia:false,maxPerDay:20,categories:Object.fromEntries(CATEGORIES.map(kind=>[kind,{enabled:true,sound:'default',priority:'normal'}]))};
const waterWindowMinutes=water=>((water.to-water.from+24)%24||24)*60;
const autoWaterInterval=water=>Math.max(5,Math.floor((waterWindowMinutes(water)-1)/Math.max(1,Math.ceil(water.goal/water.bottle))));
const DEFAULT_WATER={goal:3000,bottle:250,interval:60,schedule:'custom',from:8,to:22,enabled:false,daysOfWeek:[0,1,2,3,4,5,6],times:[],continueAfterGoal:false};
function requiredText(value,max=200){if(typeof value!=='string'||!value.trim()||value.length>max)throw new Error('Enter text of up to '+max+' characters.');return value.trim();}
function number(value,min,max,label='value'){if(!Number.isFinite(value)||value<min||value>max)throw new Error('Invalid '+label+'.');return value;}
function openProductivityStore(folder,{now=Date.now,timezone=()=>Intl.DateTimeFormat().resolvedOptions().timeZone}={}){
  fs.mkdirSync(folder,{recursive:true});const file=path.join(folder,'productivity.sqlite'),db=new DatabaseSync(file);db.exec('PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA busy_timeout=3000;');
  let depth=0,savepoint=0;
  const tx=fn=>{const nested=depth>0,name='notch_'+(++savepoint);db.exec(nested?'SAVEPOINT '+name:'BEGIN IMMEDIATE');depth++;try{const result=fn();if(result?.then)throw new Error('Database transactions must be synchronous.');db.exec(nested?'RELEASE '+name:'COMMIT');return result;}catch(error){db.exec(nested?'ROLLBACK TO '+name:'ROLLBACK');if(nested)db.exec('RELEASE '+name);throw error;}finally{depth--;}};
  const getSetting=(key,fallback)=>{const row=db.prepare('SELECT value FROM preferences WHERE key=?').get(key);return row?JSON.parse(row.value):structuredClone(fallback);};
  const setSetting=(key,value)=>db.prepare('INSERT INTO preferences(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').run(key,JSON.stringify(value));
  const version=db.prepare('PRAGMA user_version').get().user_version;if(version>1){db.close();throw new Error('This productivity database belongs to a newer Agent Notch version.');}
  if(version===0){
    const backup=path.join(folder,'backups','before-productivity-v1');fs.mkdirSync(backup,{recursive:true});
    for(const name of ['settings.json','library.json']){const source=path.join(folder,name),dest=path.join(backup,name);if(fs.existsSync(source)&&!fs.existsSync(dest))fs.copyFileSync(source,dest,fs.constants.COPYFILE_EXCL);}
    tx(()=>{db.exec(`
      CREATE TABLE preferences(key TEXT PRIMARY KEY,value TEXT NOT NULL);
      CREATE TABLE records(id TEXT PRIMARY KEY,kind TEXT NOT NULL CHECK(kind IN ('book','course','workout')),data TEXT NOT NULL,archived INTEGER NOT NULL DEFAULT 0,deleted_at INTEGER,created_at INTEGER NOT NULL,updated_at INTEGER NOT NULL);
      CREATE INDEX records_kind ON records(kind,deleted_at,archived);
      CREATE TABLE notes(id TEXT PRIMARY KEY,record_id TEXT NOT NULL REFERENCES records(id),data TEXT NOT NULL,deleted_at INTEGER,created_at INTEGER NOT NULL,updated_at INTEGER NOT NULL);
      CREATE INDEX notes_record ON notes(record_id,deleted_at);
      CREATE TABLE book_progress(id TEXT PRIMARY KEY,book_id TEXT NOT NULL REFERENCES records(id),mode TEXT NOT NULL,value INTEGER NOT NULL,undone INTEGER NOT NULL DEFAULT 0,created_at INTEGER NOT NULL);
      CREATE INDEX book_progress_book ON book_progress(book_id,created_at);
      CREATE TABLE lessons(id TEXT PRIMARY KEY,course_id TEXT NOT NULL REFERENCES records(id),position INTEGER NOT NULL,data TEXT NOT NULL,deleted_at INTEGER);
      CREATE INDEX lessons_course ON lessons(course_id,position);
      CREATE TABLE activity_sessions(id TEXT PRIMARY KEY,record_id TEXT NOT NULL REFERENCES records(id),started_at INTEGER NOT NULL,segment_started INTEGER,elapsed_ms INTEGER NOT NULL DEFAULT 0,status TEXT NOT NULL,data TEXT NOT NULL,ended_at INTEGER);
      CREATE INDEX sessions_record ON activity_sessions(record_id,status,started_at);
      CREATE UNIQUE INDEX one_active_activity ON activity_sessions((1)) WHERE status='active';
      CREATE TABLE water_drinks(id TEXT PRIMARY KEY,occurred_at INTEGER NOT NULL,volume_ml INTEGER NOT NULL CHECK(volume_ml BETWEEN 10 AND 3000),source TEXT NOT NULL,deleted_at INTEGER);
      CREATE INDEX drinks_day ON water_drinks(occurred_at,deleted_at);
      CREATE TABLE reminder_rules(id TEXT PRIMARY KEY,kind TEXT NOT NULL,target_id TEXT REFERENCES records(id),data TEXT NOT NULL,next_at INTEGER,next_key TEXT,deleted_at INTEGER);
      CREATE INDEX rules_due ON reminder_rules(next_at,deleted_at);
      CREATE TABLE reminder_occurrences(id TEXT PRIMARY KEY,reminder_id TEXT NOT NULL REFERENCES reminder_rules(id),occurrence_key TEXT NOT NULL,scheduled_for INTEGER NOT NULL,state TEXT NOT NULL,content TEXT NOT NULL,reason TEXT NOT NULL DEFAULT '',delivered_at INTEGER,action_at INTEGER,snoozed_until INTEGER,action_token TEXT,read_at INTEGER,not_before INTEGER,attempts INTEGER NOT NULL DEFAULT 0,UNIQUE(reminder_id,occurrence_key));
      CREATE INDEX occurrences_state ON reminder_occurrences(state,scheduled_for);
      CREATE TABLE action_receipts(id TEXT PRIMARY KEY,result TEXT NOT NULL,created_at INTEGER NOT NULL);
      PRAGMA user_version=1;
    `);setSetting('notifications',DEFAULT_NOTIFICATIONS);setSetting('water',DEFAULT_WATER);setSetting('migration',{version:1,at:now(),timezone:timezone()});});
  }
  function ruleView(row){return row?{...JSON.parse(row.data),id:row.id,targetId:row.target_id,nextAt:row.next_at,nextKey:row.next_key}:null;}
  function saveRule(value,{after=now()}={}){
    const rule=validateRule({...value,timezone:value.timezone||timezone()}),id=rule.id||randomUUID();
    if(rule.targetId&&!db.prepare('SELECT id FROM records WHERE id=? AND deleted_at IS NULL').get(rule.targetId))throw new Error('The reminder item no longer exists.');
    const next=nextOccurrence(rule,after);db.prepare('INSERT INTO reminder_rules(id,kind,target_id,data,next_at,next_key) VALUES(?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET kind=excluded.kind,target_id=excluded.target_id,data=excluded.data,next_at=excluded.next_at,next_key=excluded.next_key,deleted_at=NULL').run(id,rule.kind,rule.targetId||null,JSON.stringify({...rule,id}),next?.at??null,next?.key??null);return ruleView(db.prepare('SELECT * FROM reminder_rules WHERE id=?').get(id));
  }
  function water(){
    const settings=getSetting('water',DEFAULT_WATER),zone=timezone(),logs=db.prepare('SELECT id,occurred_at AS at,volume_ml AS ml,source FROM water_drinks WHERE deleted_at IS NULL ORDER BY occurred_at').all().map(r=>({...r})),today=logs.filter(log=>dateKey(log.at,zone)===dateKey(now(),zone)).reduce((sum,log)=>sum+log.ml,0),rule=ruleView(db.prepare("SELECT * FROM reminder_rules WHERE id='water' AND deleted_at IS NULL").get());
    return{...settings,logs,today,remaining:Math.max(0,settings.goal-today),percent:Math.min(100,today/settings.goal*100),plan:{interval:rule?.intervalMinutes||settings.interval,nextAt:rule?.nextAt??null,startsAt:0,count:settings.schedule==='fixed'?(settings.times||[]).length:Math.floor((waterWindowMinutes(settings)-1)/(rule?.intervalMinutes||settings.interval))},hours:Array.from({length:24},(_,hour)=>logs.filter(log=>dateKey(log.at,zone)===dateKey(now(),zone)&&new Date(log.at).getHours()===hour).reduce((sum,log)=>sum+log.ml,0))};
  }
  function configureWater(input){
    const settings={...getSetting('water',DEFAULT_WATER)};for(const key of ['logs','today','hours','plan','lastReminder','snoozedUntil'])delete settings[key];
    for(const[key,min,max]of [['goal',250,10000],['bottle',50,3000],['interval',5,240],['from',0,23],['to',1,24]])if(input[key]!==undefined)settings[key]=number(input[key],min,max,'water '+key);
    const capacity=input.capacityMl??getSetting('waterBottle',null)?.capacityMl;if(capacity!==undefined&&settings.bottle>capacity)throw new Error('Bottle capacity must fit one default drink. Choose a larger bottle or smaller drink.');
    if(settings.from===settings.to)throw new Error('Choose different hydration start and end hours, or 00:00–24:00 for a full day.');
    for(const key of ['enabled','continueAfterGoal'])if(input[key]!==undefined){if(typeof input[key]!=='boolean')throw new Error('Invalid water toggle.');settings[key]=input[key];}
    if(input.schedule!==undefined){if(!['auto','custom','fixed'].includes(input.schedule))throw new Error('Invalid water schedule.');settings.schedule=input.schedule;}
    if(input.daysOfWeek!==undefined)settings.daysOfWeek=input.daysOfWeek;if(input.times!==undefined)settings.times=input.times;
    const interval=settings.schedule==='auto'?autoWaterInterval(settings):settings.interval;
    const old=ruleView(db.prepare("SELECT * FROM reminder_rules WHERE id='water'").get());
    const rule={id:'water',kind:'water',enabled:settings.enabled,timezone:timezone(),mode:settings.schedule==='fixed'?'daily-time':'interval-in-window',localTimes:settings.times,daysOfWeek:settings.daysOfWeek,windowStart:String(settings.from).padStart(2,'0')+':00',windowEnd:settings.to===24?'00:00':String(settings.to).padStart(2,'0')+':00',intervalMinutes:interval};
    validateRule(rule);tx(()=>{setSetting('water',settings);saveRule({...old,...rule});});return water();
  }
  function drink(input={}){
    const ml=number(input.ml??getSetting('water',DEFAULT_WATER).bottle,10,3000,'drink volume');if(!Number.isInteger(ml))throw new Error('Use a whole number of millilitres.');
    const id=typeof input.requestId==='string'?requiredText(input.requestId,100):randomUUID();db.prepare('INSERT OR IGNORE INTO water_drinks(id,occurred_at,volume_ml,source) VALUES(?,?,?,?)').run(id,now(),ml,input.source||'manual');return water();
  }
  function waterAction(op,value={}){
    if(op==='water:settings')return configureWater(value);if(op==='water:drink')return drink(value);
    if(op==='water:undo'){const today=water().logs.filter(log=>dateKey(log.at,timezone())===dateKey(now(),timezone()));if(today.length)db.prepare('UPDATE water_drinks SET deleted_at=? WHERE id=?').run(now(),today.at(-1).id);return water();}
    if(op==='water:remove'){db.prepare('UPDATE water_drinks SET deleted_at=? WHERE id=?').run(now(),requiredText(value.id,100));return water();}
    if(op==='water:correct'){const ml=number(value.ml,10,3000,'drink volume');db.prepare('UPDATE water_drinks SET volume_ml=? WHERE id=? AND deleted_at IS NULL').run(ml,requiredText(value.id,100));return water();}
    if(op==='water:snooze'){const minutes=number(value.minutes??15,1,1440,'snooze');db.prepare("UPDATE reminder_rules SET next_at=?,next_key=? WHERE id='water'").run(now()+minutes*60000,'snooze:'+now());return water();}
    throw new Error('Unsupported water action.');
  }
  function importLegacy(){
    if(getSetting('legacyImported',false))return;const legacyFile=path.join(folder,'library.json');let legacy={};if(fs.existsSync(legacyFile))legacy=JSON.parse(fs.readFileSync(legacyFile,'utf8'));
    const settings={...DEFAULT_WATER,...legacy.water};for(const key of ['logs','today','hours','plan','lastReminder','snoozedUntil'])delete settings[key];settings.schedule=legacy.water?.schedule||'custom';const interval=settings.schedule==='auto'?autoWaterInterval(settings):settings.interval;
    tx(()=>{
      setSetting('water',settings);
      for(const log of legacy.water?.logs||[])if(Number.isFinite(log.at)&&Number.isInteger(log.ml)&&log.ml>=10&&log.ml<=3000)db.prepare('INSERT OR IGNORE INTO water_drinks(id,occurred_at,volume_ml,source) VALUES(?,?,?,?)').run(log.id||randomUUID(),log.at,log.ml,'legacy');
      saveRule({id:'water',kind:'water',enabled:settings.enabled,mode:'interval-in-window',timezone:timezone(),daysOfWeek:settings.daysOfWeek,windowStart:String(settings.from).padStart(2,'0')+':00',windowEnd:settings.to===24?'00:00':String(settings.to).padStart(2,'0')+':00',intervalMinutes:interval});
      for(const reminder of legacy.reminders||[])if(reminder.id&&typeof reminder.text==='string'&&Number.isSafeInteger(reminder.at))saveRule({id:reminder.id,kind:'general',enabled:!reminder.fired,mode:'one-off',timezone:timezone(),at:reminder.at,title:reminder.text},{after:Math.min(now(),reminder.at-1)});
      setSetting('legacyImported',{at:now(),drinkCount:(legacy.water?.logs||[]).length});
    });
  }
  try{importLegacy();}catch(error){db.close();throw new Error('Productivity migration stopped; original files were preserved: '+error.message);}
  return{db,file,tx,now,timezone,getSetting,setSetting,saveRule,ruleView,water,drink,waterAction,close(){db.close();}};
}
module.exports={openProductivityStore,DEFAULT_NOTIFICATIONS,DEFAULT_WATER,CATEGORIES,requiredText,number};
