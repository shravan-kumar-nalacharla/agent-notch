'use strict';
((root)=>{
 const DEFAULTS={enabled:true,hover:true,volume:.25};
 function validate(value={}){for(const k of ['enabled','hover'])if(value[k]!==undefined&&typeof value[k]!=='boolean')throw Error('Invalid sound setting.');if(value.volume!==undefined&&(!Number.isFinite(value.volume)||value.volume<0||value.volume>1))throw Error('Sound volume must be between zero and one.');return{...DEFAULTS,...value};}
 function allowed(config,context,name){if(!config.enabled||config.volume===0||context.recording||context.speaking||context.meeting||context.dnd)return false;return name!=='hover'||config.hover;}
 const ASSETS=Object.freeze({click:'mute',open:'mute',enter:'mute',mute:'open',hover:'hover',notification:'notification',timer:'timer',error:'error'});
 const exported={DEFAULTS,validate,allowed,ASSETS};if(typeof module!=='undefined')module.exports=exported;else root.NotchSoundPolicy=exported;
})(globalThis);
