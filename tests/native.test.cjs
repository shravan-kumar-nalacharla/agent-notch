const{test}=require('node:test');const assert=require('node:assert/strict');const{EventEmitter}=require('node:events');const{PassThrough}=require('node:stream');const{NativeClient}=require('../src/native.cjs');
test('native RPC preserves fragmented Unicode JSON, request errors and process exits',async()=>{
 const child=new EventEmitter();child.stdout=new PassThrough();child.stderr=new PassThrough();child.stdin=new PassThrough();child.kill=()=>child.emit('exit');
 const c=new NativeClient({executable:__filename,spawnProcess:()=>child});c.start();
 let event;c.on('event',e=>event=e);child.stdout.write('{"type":"voice.begin","app":"తెలు');child.stdout.write('గు"}\n');assert.equal(event.app,'తెలుగు');
 const good=c.request('ping');child.stdout.write('{"id":"1","ok":true,"value":{"version":1}}\n');assert.deepEqual(await good,{version:1});
 const bad=c.request('bad');child.stdout.write('{"id":"2","ok":false,"error":"Unsupported"}\n');await assert.rejects(bad,/Unsupported/);
 const lost=c.request('system');child.emit('exit');await assert.rejects(lost,/stopped/);assert.equal(c.pending.size,0);c.close();
});
test('native operation timeout removes its request',async()=>{const c=new NativeClient();c.child={stdin:{write(){}}};await assert.rejects(c.request('ping',{},5),/timed out/);assert.equal(c.pending.size,0);c.child=null;});
