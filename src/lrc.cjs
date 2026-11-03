'use strict';
function parseLyrics(input){
 const source=String(input||'').slice(0,400000),offsets=[...source.matchAll(/\[offset:([+-]?\d+)\]/gi)],offset=Math.max(-60000,Math.min(60000,Number(offsets.at(-1)?.[1])||0));
 const stamp=(m,s)=>Number(s)<60?(Number(m)*60+Number(s))*1000:null,rows=[];
 for(const line of source.split(/\r?\n/)){
  const times=[...line.matchAll(/\[(\d{1,4}):(\d{1,2}(?:\.\d{1,3})?)\]/g)].map(m=>stamp(m[1],m[2])).filter(x=>x!==null);
  if(!times.length)continue;
  const body=line.replace(/\[[^\]]*\]/g,'').trim(),tags=[...body.matchAll(/<(\d{1,4}):(\d{1,2}(?:\.\d{1,3})?)>/g)];
  const text=body.replace(/<\d{1,4}:\d{1,2}(?:\.\d{1,3})?>/g,'').trim();
  for(const at of times){const words=[];for(let i=0;i<tags.length;i++){const time=stamp(tags[i][1],tags[i][2]);if(time===null)continue;const word=body.slice(tags[i].index+tags[i][0].length,tags[i+1]?.index).trim();if(word)words.push({at:Math.max(0,time+offset+at-times[0]),text:word});}rows.push({at:Math.max(0,at+offset),text,...(words.length?{words:words.sort((a,b)=>a.at-b.at)}:{})});}
 }
 return rows.sort((a,b)=>a.at-b.at);
}
module.exports={parseLyrics};
