'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),{EventEmitter}=require('node:events');
const {createSecureCalendar,meetingURL}=require('../src/secure-calendar.cjs'),{publicURL,publicIP,getPublicText}=require('../src/public-https.cjs');
test('meeting links require real provider hosts and explicit HTTPS',()=>{
 assert.equal(meetingURL({description:'Join https://meet.google.com/abc-defg-hij'}),'https://meet.google.com/abc-defg-hij');
 for(const url of ['https://zoom.us.attacker.com/a','https://attacker.com/zoom.us','https://user:pass@zoom.us/a','http://zoom.us/a','https://zoom.us:8443/a'])assert.equal(meetingURL({url}),null);
 assert.equal(meetingURL({location:'https://us02web.zoom.us/j/123'}),'https://us02web.zoom.us/j/123');
});
test('public network policy rejects local, mixed DNS, credentials and rebinding',async()=>{
 for(const ip of ['127.0.0.1','10.0.0.1','169.254.1.2','172.16.1.1','192.168.1.1','100.64.0.1','198.18.0.1','::1','::ffff:127.0.0.1','fc00::1','fe80::1','2001:db8::1'])assert.equal(publicIP(ip),false,ip);
 for(const ip of ['1.1.1.1','8.8.8.8','2606:4700:4700::1111','2001:4860:4860::8888'])assert.equal(publicIP(ip),true,ip);
 for(const url of ['file:///a','http://example.org','https://localhost/a','https://127.0.0.1/a','https://user:pass@example.org/a','https://example.org:444/a'])assert.throws(()=>publicURL(url));
 await assert.rejects(getPublicText('https://example.org',{lookup:async()=>[{address:'1.1.1.1',family:4},{address:'10.0.0.1',family:4}],request:()=>assert.fail()}),/public/);
 let pinned;const text=await getPublicText('https://example.org/calendar',{lookup:async()=>[{address:'1.1.1.1',family:4}],request:(url,options,cb)=>{const req=new EventEmitter();req.end=()=>{options.lookup('example.org',{all:false},(_e,address)=>pinned=address);const res=new EventEmitter();res.statusCode=200;res.headers={};cb(res);res.emit('data',Buffer.from('ical'));res.emit('end');};req.destroy=()=>{};return req;}});assert.equal(text,'ical');assert.equal(pinned,'1.1.1.1');
});
function fixture(overrides={}){let legacy='https://calendar.example.org/private-secret',data=null,opened=[];const secrets={get:async()=>structuredClone(data),set:async(_k,v)=>{data=structuredClone(v)},error:()=>''},library={view:()=>({calendarUrl:legacy}),action:()=>legacy=''};const service=createSecureCalendar({secrets,legacyLibrary:library,shell:{openExternal:async url=>opened.push(url)},now:()=>1000,fetchText:async()=>'',parse:async()=>[{title:'Meet',uid:'a',start:2000,end:3000,url:'https://meet.google.com/abc',description:'private notes',location:''}],...overrides});return{service,secrets,library,opened,data:()=>data};}
test('calendar migration encrypts before removing legacy URL, exposes no feed or notes, cache survives offline',async()=>{
 const f=fixture();await f.service.ready;assert.equal(f.library.view().calendarUrl,'');assert.match(f.data().sources[0].url,/private-secret/);const result=await f.service.refresh(true);assert.equal(result.events[0].canJoin,true);assert.doesNotMatch(JSON.stringify(result),/private-secret|private notes|meet.google/);await assert.rejects(f.service.join('fake'),/No supported/);await f.service.join(result.events[0].id);assert.equal(f.opened.length,1);
 const offline=createSecureCalendar({secrets:f.secrets,legacyLibrary:f.library,shell:{},now:()=>1500,fetchText:async()=>{throw Error('https://private-secret')},parse:async()=>[]});const stale=await offline.refresh(true);assert.equal(stale.events.length,1);assert.doesNotMatch(JSON.stringify(stale),/private-secret/);assert.match(stale.sources[0].error,/Could not refresh/);
});
test('unavailable encryption preserves legacy data and yields a recoverable error',async()=>{
 const f=fixture({secrets:{get:async()=>null,error:()=>'',set:async()=>{throw Error('Secure storage unavailable')}}});await assert.rejects(f.service.ready,/Secure storage/);assert.match(f.library.view().calendarUrl,/private-secret/);
});
