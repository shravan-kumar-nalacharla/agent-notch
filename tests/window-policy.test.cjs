'use strict';
const{test}=require('node:test'),assert=require('node:assert/strict'),{validateWindowRules,windowBehavior}=require('../src/window-policy.cjs');
test('application rules distinguish maximized/fullscreen, monitor and screenshot overlays',()=>{
 const a={hideFullscreen:true,maximizedBehavior:'normal',windowRules:validateWindowRules([{process:'Brave.exe',fullscreen:'line',maximized:'hide'}])};
 assert.equal(windowBehavior(a,{fullscreen:true,processName:'brave'}),'line');assert.equal(windowBehavior(a,{maximized:true,processName:'BRAVE.exe'}),'hide');assert.equal(windowBehavior(a,{fullscreen:true,processName:'game'}),'hide');assert.equal(windowBehavior(a,{fullscreen:true,processName:'game',onIslandDisplay:false}),'normal');assert.equal(windowBehavior(a,{fullscreen:true,captureOverlay:true}),'normal');assert.equal(windowBehavior({...a,hideFullscreen:false},{fullscreen:true,processName:'game'}),'normal');assert.throws(()=>validateWindowRules([{process:'x',fullscreen:'execute',maximized:'normal'}]));
});
