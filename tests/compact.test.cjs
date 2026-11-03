const{test}=require('node:test'),assert=require('node:assert/strict');
const{layoutFor}=require('../src/geometry.cjs'),{IslandMotion}=require('../src/island-motion.js'),{pickMoment,validateQuiet}=require('../src/quiet.cjs');
test('geometry stays on the same monitor center at all sizes and modeled DPI scales',()=>{
  for(const scaleFactor of [1,1.25,1.5,2])for(const x of [0,-1920])for(const density of ['compact','default','roomy']){
    const d={id:1,scaleFactor,bounds:{x,y:0,width:1536,height:864},workArea:{x:x+48,y:32,width:1488,height:800}},layout=layoutFor(d,{density});assert.ok(Math.abs(layout.bounds.x+layout.bounds.width/2-(d.workArea.x+d.workArea.width/2))*scaleFactor<=2);assert.equal(layout.bounds.y,d.workArea.y);assert.ok(layout.panelWidth<=540);assert.ok(layout.panelHeight<=280);
  }
  const d={id:2,scaleFactor:2,bounds:{x:0,y:0,width:683,height:384},workArea:{x:0,y:0,width:683,height:344}};assert.ok(layoutFor(d).bounds.height<=344);
});
test('motion debounce, exact grace, reentry, pin and voice lock cancel stale timers',()=>{
  let time=0,id=0;const timers=new Map(),events=[];const motion=new IslandMotion({open:()=>events.push('open'),close:()=>events.push('close'),canClose:()=>true,setTimer:(fn,ms)=>{const n=++id;timers.set(n,{fn,at:time+ms});return n;},clearTimer:id=>timers.delete(id)});
  const advance=ms=>{time+=ms;for(const[n,t]of [...timers])if(t.at<=time){timers.delete(n);t.fn();}};
  motion.enter();advance(99);assert.equal(events.length,0);advance(1);assert.equal(events[0],'open');motion.leave();advance(999);assert.equal(events.length,1);motion.enter();advance(1);assert.equal(events.length,1);motion.leave();advance(1000);assert.equal(events[1],'close');motion.open();motion.lock(true);motion.leave();advance(2000);assert.equal(events.at(-1),'open');motion.lock(false);motion.pin(true);motion.leave();advance(2000);assert.equal(events.at(-1),'open');motion.dispose();assert.equal(timers.size,0);
});
const config={enabled:true,dnd:false,morningStart:6,morningEnd:11,eveningStart:17,eveningEnd:22,dailyCap:3,cooldownMinutes:25,category:'mixed'};
test('offline thoughts require deliberate expansion and support overnight windows',()=>{
 const {DEFAULTS,inWindow}=require('../src/quiet.cjs'),config={...DEFAULTS,allDay:false,dailyCap:3},activity={expanded:true,intentional:true,osDnd:false,systemKnown:true};
 const now=new Date(2026,10,1,8).getTime(),pick=(history={},at=now)=>pickMoment(config,history,at,()=>0,activity),q=pick();assert.ok(q);assert.equal(pickMoment(config,{},now,()=>0),null);assert.equal(pick({day:q.day,count:3}),null);assert.equal(pick({lastAt:now-1000}),null);assert.equal(pick({},new Date(2026,10,1,13).getTime()),null);assert.notEqual(pick({recent:[q.id]}).id,q.id);assert.equal(validateQuiet(config).dailyCap,3);assert.ok(inWindow(23,22,6));assert.ok(inWindow(2,22,6));assert.ok(!inWindow(12,22,6));
});
