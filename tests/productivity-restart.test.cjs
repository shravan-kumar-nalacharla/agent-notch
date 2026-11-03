'use strict';
const{test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const{openProductivityStore,DEFAULT_NOTIFICATIONS}=require('../src/productivity-store.cjs'),{createReminderEngine}=require('../src/reminder-engine.cjs'),{createRoutines}=require('../src/routines.cjs');
test('closing and reopening the actual database retains migration, occurrence dedup and water action receipts',t=>{
  const folder=fs.mkdtempSync(path.join(os.tmpdir(),'notch-restart-'));let at=Date.parse('2026-11-03T10:00Z'),store;
  t.after(()=>{store?.close();fs.rmSync(folder,{recursive:true,force:true});});
  fs.writeFileSync(path.join(folder,'library.json'),JSON.stringify({water:{enabled:false,logs:[{id:'legacy',at,ml:250}]}}));
  const options={now:()=>at,timezone:()=> 'UTC'},sent=[];store=openProductivityStore(folder,options);store.setSetting('notifications',{...structuredClone(DEFAULT_NOTIFICATIONS),delivery:'windows',quietEnabled:false,grouping:false});store.waterAction('water:settings',{enabled:true,from:0,to:24,interval:5});at+=300000;
  const first=createReminderEngine({store,deliver:value=>{sent.push(value);value.onShow();}});first.tick();assert.equal(sent.length,1);const action={ids:sent[0].ids,token:sent[0].token,source:'windows',action:'drink'};first.action(action);assert.equal(store.water().today,500);store.close();store=null;
  store=openProductivityStore(folder,options);const next=createReminderEngine({store,deliver:value=>sent.push(value)});next.tick();next.action(action);assert.equal(sent.length,1);assert.equal(store.water().today,500);assert.equal(next.history().length,1);assert.equal(next.history()[0].state,'completed');
});
test('a fresh database connection restores committed pages, notes and an activity checkpoint paused',t=>{
  const folder=fs.mkdtempSync(path.join(os.tmpdir(),'notch-session-restart-'));let at=Date.parse('2026-11-03T10:00Z'),store;t.after(()=>{store?.close();fs.rmSync(folder,{recursive:true,force:true});});const options={now:()=>at,timezone:()=> 'UTC'};
  store=openProductivityStore(folder,options);let routines=createRoutines(store);const book=routines.action('book:save',{title:'Persistent book',totalPages:300});routines.action('book:log',{id:book.id,mode:'delta',value:4});routines.action('note:save',{recordId:book.id,body:'Original note',pageFrom:24});routines.action('session:start',{id:book.id});at+=65000;routines.checkpoint();store.close();store=null;
  store=openProductivityStore(folder,options);routines=createRoutines(store);const state=routines.snapshot();assert.equal(state.books[0].pagesCompleted,4);assert.equal(state.notes[0].body,'Original note');assert.equal(state.notes[0].pageFrom,24);assert.equal(state.sessions[0].elapsedMs,65000);assert.equal(state.sessions[0].status,'paused');
});
