'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),{IslandGeometry}=require('../src/geometry.cjs');
test('follow cursor requires dwell and never relocates an open, voice, reminder or dragged island',()=>{
 const displays=[{id:1,bounds:{x:0,y:0,width:1920,height:1080},workArea:{x:0,y:0,width:1920,height:1040},scaleFactor:1},{id:2,bounds:{x:-1280,y:0,width:1280,height:720},workArea:{x:-1280,y:0,width:1280,height:680},scaleFactor:1.5}];let cursor={x:1,y:1},bounds={},at=0;
 const win={getBounds:()=>bounds,setBounds:value=>bounds=value,webContents:{send(){}},setIgnoreMouseEvents(){}};
 const screen={getAllDisplays:()=>displays,getPrimaryDisplay:()=>displays[0],getCursorScreenPoint:()=>cursor,getDisplayNearestPoint:p=>p.x<0?displays[1]:displays[0]};
 const geometry=new IslandGeometry({win,screen,getAppearance:()=>({display:'cursor'}),now:()=>at});geometry.reflow();cursor={x:-10,y:5};geometry.poll(cursor);at=649;geometry.poll(cursor);assert.equal(geometry.layout.displayId,'1');at=650;geometry.poll(cursor);assert.equal(geometry.layout.displayId,'2');
 for(const lock of ['expanded','voice','reminder','userMove']){geometry[lock]=true;cursor={x:1,y:5};geometry.poll(cursor);at+=1000;geometry.poll(cursor);geometry.reflow();assert.equal(geometry.layout.displayId,'2');geometry[lock]=false;}
 geometry.poll(cursor);at+=651;geometry.poll(cursor);assert.equal(geometry.layout.displayId,'1');
 for(let i=0;i<100;i++){geometry.present(true);geometry.present(false);assert.ok(Math.abs(bounds.x+bounds.width/2-960)<=.5);}
});
