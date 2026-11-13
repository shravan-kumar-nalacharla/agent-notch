const{test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{createLibrary}=require('../src/library.cjs');
test('periodic preference and timer reads do not clone clipboard or history snapshots',t=>{
 const folder=fs.mkdtempSync(path.join(os.tmpdir(),'notch-library-poll-'));t.after(()=>fs.rmSync(folder,{recursive:true,force:true}));
 const library=createLibrary(folder);library.action('timer:start',{seconds:60});library.action('clips:enable',{enabled:true});
 const clone=global.structuredClone;let copies=0;global.structuredClone=value=>{copies++;return clone(value);};t.after(()=>global.structuredClone=clone);
 for(let i=0;i<1000;i++){assert.equal(library.preferences().clipboardEnabled,true);assert.equal(library.clock().timer.seconds,60);}
 assert.equal(copies,0);const prefs=library.preferences();prefs.clipboardEnabled=false;assert.equal(library.preferences().clipboardEnabled,true);const clock=library.clock();clock.timer.seconds=1;assert.equal(library.clock().timer.seconds,60);
});
