'use strict';
const {routeIntent}=require('./intent-router.cjs'),{parseCommand}=require('./commands.cjs');
// Tool proposals and transcript fallback meet here only after a complete spoken turn.
function createLiveTaskTurns({run,signal}){
 const turns=new Map();let current=0,last;
 const normalize=text=>String(text).trim().toLowerCase().replace(/[.!?]+$/,'');
 function entry(id){let e=turns.get(id);if(!e){let resolve,reject;const result=new Promise((a,b)=>{resolve=a;reject=b;});result.catch(()=>{});e={id,result,resolve,reject,proposed:false};turns.set(id,e);if(turns.size>100)turns.delete(turns.keys().next().value);}return e;}
 signal.addEventListener('abort',()=>{for(const e of turns.values())e.reject(signal.reason||new Error('Conversation stopped.'));turns.clear();},{once:true});
 function propose(request){signal.throwIfAborted();if(last&&Date.now()-last.at<15000&&normalize(last.raw)===normalize(request))return entry(last.id).result;const e=entry(current);e.proposed=true;return e.result;}
 function finish(raw,{interrupted=false}={}){const e=entry(current),id=current++;const intent=routeIntent(raw).intent,action=!!raw&&(intent!=='conversation'||!!parseCommand(raw));if(interrupted){e.reject(new Error('Spoken turn interrupted.'));return null;}if(!raw){e.reject(new Error('No complete user transcript was available. No action was taken.'));return null;}if(!action){e.reject(new Error('This spoken turn is conversation, not a desktop action.'));return null;}last={id,raw,at:Date.now()};Promise.resolve().then(()=>{signal.throwIfAborted();return run(raw,id);}).then(e.resolve,e.reject);return e.result;}
 return{propose,finish,hasProposal:()=>turns.get(current)?.proposed===true};
}
module.exports={createLiveTaskTurns};
