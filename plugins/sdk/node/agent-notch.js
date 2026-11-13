'use strict';
const readline=require('node:readline');
const send=value=>process.stdout.write(JSON.stringify(value)+'\n');
function host(){const listeners=new Set();readline.createInterface({input:process.stdin}).on('line',line=>{try{const message=JSON.parse(line);for(const listener of listeners)listener(message);}catch{}});return{send,tile:view=>send({type:'tile',view}),page:(view,actions=[])=>send({type:'page',view,actions}),badge:badge=>send({type:'badge',badge}),active:active=>send({type:'active',active}),log:(message,level='info')=>send({type:'log',level,message}),on:listener=>{listeners.add(listener);return()=>listeners.delete(listener);}};}
module.exports={host,send};
