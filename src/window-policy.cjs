'use strict';
const MODES=['normal','line','hide'];
const processName=value=>String(value||'').trim().toLowerCase().replace(/\.exe$/,'');
function validateWindowRules(rules){if(!Array.isArray(rules)||rules.length>40)throw new Error('Use up to 40 application rules.');return rules.map(rule=>{if(!rule||typeof rule.process!=='string'||!/^[a-zA-Z0-9_. -]{1,100}$/.test(rule.process)||!MODES.includes(rule.fullscreen)||!MODES.includes(rule.maximized))throw new Error('Each application rule needs a process name and normal, line or hide behavior.');return{process:processName(rule.process),fullscreen:rule.fullscreen,maximized:rule.maximized};});}
function windowBehavior(appearance,system){
 if(system.captureOverlay||system.onIslandDisplay===false)return'normal';
 const rule=Array.isArray(appearance.windowRules)?appearance.windowRules.find(r=>processName(r.process)===processName(system.processName)):null;
 if(system.fullscreen)return rule?.fullscreen||(appearance.hideFullscreen?appearance.fullscreenBehavior||'hide':'normal');
 if(system.maximized)return rule?.maximized||appearance.maximizedBehavior||'normal';
 return'normal';
}
module.exports={MODES,validateWindowRules,windowBehavior};
