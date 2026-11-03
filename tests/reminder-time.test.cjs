'use strict';
const{test}=require('node:test'),assert=require('node:assert/strict');const{validateRule,nextOccurrence,dateKey,inWindow}=require('../src/reminder-time.cjs');
const daily=(time,extra={})=>validateRule({kind:'book',enabled:true,mode:'daily-time',localTimes:[time],timezone:'America/New_York',...extra});
test('DST gap is skipped and a repeated wall time fires once at its first occurrence',()=>{
  assert.equal(new Date(nextOccurrence(daily('02:30'),Date.parse('2026-03-08T05:00:00Z')).at).toISOString(),'2026-03-09T06:30:00.000Z');
  const rule=daily('01:30');assert.equal(new Date(nextOccurrence(rule,Date.parse('2026-11-01T04:00:00Z')).at).toISOString(),'2026-11-01T05:30:00.000Z');assert.equal(new Date(nextOccurrence(rule,Date.parse('2026-11-01T05:31:00Z')).at).toISOString(),'2026-11-02T06:30:00.000Z');
});
test('local timezone, weekdays, multiple times and overnight intervals are calculated by wall time',()=>{
  const india=daily('09:00',{timezone:'Asia/Kolkata',localTimes:['09:00','21:00'],daysOfWeek:[1,3,5]});assert.equal(new Date(nextOccurrence(india,Date.parse('2026-11-02T04:00Z')).at).toISOString(),'2026-11-02T15:30:00.000Z');
  const night=validateRule({kind:'water',enabled:true,mode:'interval-in-window',windowStart:'22:00',windowEnd:'02:00',intervalMinutes:60,daysOfWeek:[1],timezone:'Asia/Kolkata'});assert.equal(new Date(nextOccurrence(night,Date.parse('2026-11-02T18:40Z')).at).toISOString(),'2026-11-02T19:30:00.000Z');assert.equal(dateKey(Date.parse('2026-11-02T19:30Z'),'Asia/Kolkata'),'2026-11-03');
  assert.ok(inWindow(Date.parse('2026-11-02T19:30Z'),'22:00','07:00','Asia/Kolkata'));
});
test('bad times, timezones, empty days and zero intervals are rejected; disabled schedules stay disabled',()=>{
  assert.throws(()=>daily('25:00'));assert.throws(()=>daily('09:00',{timezone:'Unknown/Zone'}));assert.throws(()=>daily('09:00',{daysOfWeek:[]}));assert.equal(nextOccurrence(daily('09:00',{enabled:false}),Date.now()),null);
});
