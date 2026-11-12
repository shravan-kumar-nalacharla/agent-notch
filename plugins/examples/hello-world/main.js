'use strict';
const{host}=require('./agent-notch.js'),notch=host();
const view={type:'card',children:[{type:'text',text:'Hello, Agent Notch',bold:true},{type:'text',text:'A declarative plugin view.'},{type:'button',id:'wave',label:'Wave'}]};
notch.tile(view);notch.on(event=>{if(event.type==='event'&&event.id==='wave')notch.badge({text:'👋'});});
