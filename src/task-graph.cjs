'use strict';
const BROWSER=/\b(?:browser|brave|chrome|edge|firefox|website|web|google|youtube|github|chatgpt|search|https?:\/\/|tab|video|like|subscribe|play)\b/i;
const WINDOWS=/\b(?:file explorer|explorer|notepad|downloads?|documents?|desktop|folder|settings|calculator|task manager|paint|word|excel|powerpoint|application|program|window)\b/i;
function clean(value){return String(value||'').replace(/^[\s,;.]+|[\s,;.]+$/g,'').trim();}
function splitGoal(goal){
  const text=String(goal||'').replace(/\r/g,' ').replace(/\s+/g,' ').trim();
  if(!text)return{browserGoal:'',windowsGoal:'',both:false};
  // Break at explicit sentence/connector boundaries, but keep "and" inside a clause.
  let parts=text.split(/(?:\s*;\s*|\.\s+|\s+(?:and\s+then|then|also)\s+)/i).map(clean).filter(Boolean);
  // A single sentence can still contain both kinds: split before a Windows app clause.
  const expanded=[];
  for(const part of parts){const match=part.match(/\s+(?:and\s+)?(?=(?:open|launch|go to|navigate to)\s+(?:file explorer|explorer|notepad|downloads|documents|settings|calculator|task manager))/i);if(match&&match.index>0){expanded.push(clean(part.slice(0,match.index)),clean(part.slice(match.index)));}else expanded.push(part);}
  parts=expanded;
  const browserParts=[],windowsParts=[];
  for(const part of parts){
    const w=WINDOWS.test(part),b=BROWSER.test(part);
    if(w&&b){ // a clause mentioning both is split around the Windows verb when possible
      const index=part.search(/\b(?:file explorer|explorer|notepad|downloads|documents|settings|calculator|task manager)\b/i);
      if(index>0){browserParts.push(clean(part.slice(0,index)));windowsParts.push(clean(part.slice(index)));}
      else windowsParts.push(part);
    }else if(w)windowsParts.push(part);else if(b)browserParts.push(part);
  }
  const browserGoal=clean(browserParts.join(' and ')).replace(/\s+and$/i,''),windowsGoal=clean(windowsParts.join(' and ')).replace(/^and\s+/i,'').replace(/\band\s+and\b/gi,'and');
  return{browserGoal,windowsGoal,both:!!(browserGoal&&windowsGoal)};
}
module.exports={splitGoal,BROWSER,WINDOWS};

