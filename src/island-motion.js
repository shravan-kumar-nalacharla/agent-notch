'use strict';
((root)=>{
  class IslandMotion{
    constructor({open,close,canClose,canOpen=()=>true,changed=()=>{},intent=100,grace=1000,duration=700,setTimer=(fn,ms)=>setTimeout(fn,ms),clearTimer=id=>clearTimeout(id)}){Object.assign(this,{onOpen:open,onClose:close,canClose,canOpen,changed,intent,grace,duration,setTimer,clearTimer});this.state='DORMANT_LINE';this.timers={};this.inside=false;this.locked=false;this.pinned=false;}
    phase(value){this.state=value;this.changed(value);}
    cancel(key){this.clearTimer(this.timers[key]);delete this.timers[key];}
    later(key,ms,fn){this.cancel(key);this.timers[key]=this.setTimer(()=>{delete this.timers[key];fn();},ms);}
    enter(){this.inside=true;this.cancel('leave');if(['DORMANT_LINE','COLLAPSING'].includes(this.state))this.later('intent',this.intent,()=>this.open());else if(this.state==='CLOSING_GRACE')this.phase('COMPACT_ACTIVE');}
    leave(){this.inside=false;this.cancel('intent');if(this.state==='DORMANT_LINE'||this.state==='COLLAPSING'||this.locked||this.pinned)return;this.phase('CLOSING_GRACE');this.later('leave',this.grace,()=>{if(!this.inside&&this.canClose())this.close();else if(!this.inside)this.phase('INTERACTING');});}
    open(){this.cancel('intent');if(!this.canOpen())return;this.cancel('leave');this.cancel('finish');this.phase(this.pinned?'PINNED':this.locked?'VOICE_LOCKED':'REVEALING');const result=this.onOpen();this.later('finish',this.duration,()=>this.phase(this.pinned?'PINNED':this.locked?'VOICE_LOCKED':'COMPACT_ACTIVE'));return result;}
    close(){this.cancel('intent');this.cancel('leave');this.cancel('finish');this.phase('COLLAPSING');const result=this.onClose();this.later('finish',440,()=>this.phase('DORMANT_LINE'));return result;}
    lock(value){this.locked=value;if(value){this.cancel('leave');this.phase('VOICE_LOCKED');}else if(!this.inside)this.leave();else this.phase('COMPACT_ACTIVE');}
    pin(value){this.pinned=value;if(value)return this.open();if(!this.inside)this.leave();}
    dispose(){Object.keys(this.timers).forEach(k=>this.cancel(k));}
  }
  if(typeof module!=='undefined')module.exports={IslandMotion};else root.IslandMotion=IslandMotion;
})(globalThis);
