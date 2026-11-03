'use strict';
const{test}=require('node:test'),assert=require('node:assert/strict'),{parseLyrics}=require('../src/lrc.cjs');
test('LRC supports repeated cues, bounded offsets, word timings and malformed input',()=>{
 const cues=parseLyrics('[ar:Example]\n[offset:-500]\n[00:01.50][00:03.50]<00:01.50>Hello <00:01.80>world\n[99:99]bad\n[00:00.10]Intro');assert.equal(cues.length,3);assert.equal(cues[0].at,0);assert.deepEqual(cues[1],{at:1000,text:'Hello world',words:[{at:1000,text:'Hello'},{at:1300,text:'world'}]});assert.equal(cues[2].words[0].at,3000);assert.equal(parseLyrics('[00:03] <script>alert(1)</script>')[0].text,'<script>alert(1)</script>');
});
