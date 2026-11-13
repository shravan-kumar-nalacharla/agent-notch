const{test}=require('node:test'),assert=require('node:assert/strict'),{palette}=require('../src/theme-palette.js');
test('accent palettes derive adjacent edge hues and reject arbitrary CSS',()=>{const blue=palette('#538dff'),green=palette('#38bb70');assert.notEqual(blue.edgeA,blue.edgeB);assert.notEqual(blue.edgeB,green.edgeB);assert.equal(blue.accent,'#538dff');assert.equal(palette('url(secret)').accent,'#d6ed83');for(const hex of ['#000000','#ffffff','#ff0000','#00ff00','#0000ff'])assert.doesNotMatch(JSON.stringify(palette(hex)),/NaN|Infinity/);});
test('extreme accents remain readable on both themes with contrasting button ink',()=>{
 const {contrast}=require('../src/theme-palette.js'),rgb=hex=>hex.slice(1).match(/../g).map(c=>parseInt(c,16)/255);
 for(const light of [false,true])for(const hex of ['#000000','#ffffff','#0000ff','#ff0000','#d6ed83','#538dff']){
  const p=palette(hex,light),background=light?rgb('#f1f1f3'):rgb('#222327');
  assert.equal(p.accent,hex);assert.ok(contrast(rgb(p.readable),background)>=4.5,JSON.stringify(p));
  assert.ok(contrast(rgb(p.readable),rgb(p.onAccent))>=4.5,JSON.stringify(p));
 }
 assert.match(palette('#000000').edgeA,/ 0% /);
});

