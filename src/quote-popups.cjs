'use strict';
const{randomUUID}=require('node:crypto'),{pickMoment,momentBlockReason}=require('./quiet.cjs');
function createQuotePopups({getConfig,getHistory,getActivity,getLocale,emit,record,now=Date.now,random=Math.random}){
 const boot=now();let wakePending=true,wakeAt=boot+8000,pending=null;
 function wake(){wakePending=true;wakeAt=now()+5000;pending=null;}
 function cancel(){pending=null;}
 function tick(){const time=now(),c=getConfig();if(!c.enabled||!c.automatic){cancel();return;}const h=getHistory();if(pending&&pending.expires>time)return;pending=null;
  const due=h.nextAt||((h.lastAt||boot)+c.cooldownMinutes*60000),startup=c.onStartup&&wakePending&&time>=wakeAt&&(!h.lastAt||time-h.lastAt>=5*60000);
  if(!startup&&time<due)return;
  const quote=pickMoment(c,h,time,random,{...getActivity(),context:'automatic'},getLocale().language,getLocale().tone);if(!quote)return;
  pending={token:randomUUID(),quote,nextAt:time+Math.round(c.cooldownMinutes*60000*(.75+random()*.5)),expires:time+15000};
  emit({...quote,token:pending.token,displayMs:5000});
 }
 function shown(token){const c=getConfig(),a=getActivity();if(!c.automatic||momentBlockReason(c,getHistory(),now(),{...a,context:'automatic'})){cancel();return false;}if(!pending||pending.token!==token||pending.expires<now())return false;record({...pending.quote,nextAt:pending.nextAt});pending=null;wakePending=false;return true;}
 function status(){const c=getConfig(),h=getHistory(),time=now(),date=new Date(time),day=`${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;return{enabled:c.enabled&&c.automatic,count:h.day===day?h.count||0:0,dailyCap:c.dailyCap,lastAt:h.lastAt||0,nextAt:h.nextAt||boot+c.cooldownMinutes*60000,averageMinutes:c.cooldownMinutes,reason:!c.automatic?'Automatic thoughts are off':momentBlockReason(c,h,time,{...getActivity(),context:'automatic'})};}
 return{tick,wake,cancel,shown,status};
}
module.exports={createQuotePopups};
