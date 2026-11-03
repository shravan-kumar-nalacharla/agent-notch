const {test}=require('node:test');const assert=require('node:assert/strict');const{parseLyrics,calendarDate,parseCalendar}=require('../src/widgets-main.cjs');
test('synced lyrics parse multiple timestamps and preserve order',()=>{assert.deepEqual(parseLyrics('[00:12.50][00:02.00]Hello\n[00:03]World').map(x=>x.at),[2000,3000,12500]);});
test('calendar timezone is interpreted independently from the PC timezone',()=>{assert.equal(calendarDate('20261101T100000','Asia/Kolkata'),Date.UTC(2026,10,1,4,30));assert.equal(calendarDate('20261101T100000Z'),Date.UTC(2026,10,1,10));});
test('calendar folded titles and all-day events are read',()=>{const e=parseCalendar('BEGIN:VEVENT\nDTSTART;VALUE=DATE:20300101\nDTEND;VALUE=DATE:20300102\nSUMMARY:Long\n  title\\, test\nEND:VEVENT')[0];assert.equal(e.title,'Long title, test');assert.equal(e.allDay,true);assert.equal(e.end-e.start,86400000);});
test('media reports a rejected native transport command instead of claiming success',async t=>{
  const{EventEmitter}=require('node:events'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
  const folder=fs.mkdtempSync(path.join(os.tmpdir(),'notch-media-')),app=new EventEmitter(),handlers=new Map();app.getPath=()=>folder;
  t.after(()=>{app.emit('before-quit');fs.rmSync(folder,{recursive:true,force:true});});
  let supported=false;
  const native=new EventEmitter();native.request=async()=>supported;
  require('../src/widgets-main.cjs').setupWidgets({app,BrowserWindow:{getAllWindows:()=>[]},Notification:{isSupported:()=>false},powerMonitor:new EventEmitter(),native,handle:(name,fn)=>handlers.set(name,fn)});
  const desktop=handlers.get('widgets:desktop');await assert.rejects(desktop({op:'media.control',value:{command:'toggle'}}),/does not support/);
  supported=true;assert.equal(await desktop({op:'media.control',value:{command:'toggle'}}),true);
});
