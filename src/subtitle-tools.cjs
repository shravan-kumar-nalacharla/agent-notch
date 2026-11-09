'use strict';
const fs=require('node:fs'),path=require('node:path');
const SUBS=new Set(['.srt','.vtt']);
function kind(file){const ext=path.extname(String(file||'')).toLowerCase();return SUBS.has(ext)?ext:null;}
function parseSrt(text){
  return text.replace(/\r/g,'').trim().split(/\n{2,}/).filter(Boolean).map(block=>{
    const lines=block.split('\n'),time=lines.find(line=>line.includes('-->'));if(!time)return null;
    const at=lines.indexOf(time),start=time.split('-->')[0].trim(),end=time.split('-->')[1].trim(),body=lines.slice(at+1).join('\n');
    return{start:start.replace(',','.'),end:end.replace(',','.'),text:body};
  }).filter(Boolean);
}
function parseVtt(text){
  return text.replace(/\r/g,'').replace(/^WEBVTT[^\n]*\n+/i,'').trim().split(/\n{2,}/).filter(Boolean).map(block=>{
    const lines=block.split('\n'),time=lines.find(line=>line.includes('-->'));if(!time)return null;
    const at=lines.indexOf(time),start=time.split('-->')[0].trim(),end=time.split('-->')[1].trim().split(/\s+/)[0],body=lines.slice(at+1).join('\n');
    return{start,end,text:body};
  }).filter(Boolean);
}
function toVtt(cues){return 'WEBVTT\n\n'+cues.map((cue,index)=>`${index+1}\n${cue.start.replace(',','.')} --> ${cue.end.replace(',','.')}\n${cue.text}`).join('\n\n')+'\n';}
function toSrt(cues){return cues.map((cue,index)=>`${index+1}\n${cue.start.replace('.',',')} --> ${cue.end.replace('.',',')}\n${cue.text}`).join('\n\n')+'\n';}
function probe(file){const ext=kind(file);return ext?{kind:'subtitle',format:ext.slice(1),available:true,message:''}:null;}
function convert({input,output}){
  const from=kind(input),to=kind(output);if(!from||!to)throw new Error('Choose SRT or VTT input and output.');
  if(path.resolve(input).toLowerCase()===path.resolve(output).toLowerCase())throw new Error('Choose a new output file; the original is never overwritten.');
  const text=fs.readFileSync(input,'utf8'),cues=from==='.srt'?parseSrt(text):parseVtt(text);
  if(!cues.length)throw new Error('No subtitle cues were found.');
  fs.writeFileSync(output,to==='.vtt'?toVtt(cues):toSrt(cues));return{cues:cues.length,output};
}
module.exports={probe,convert,parseSrt,parseVtt,toSrt,toVtt};
