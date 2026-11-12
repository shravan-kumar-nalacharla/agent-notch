'use strict';
const fs=require('node:fs');
function normalizeQuick(items){return [...new Set((Array.isArray(items)?items:[]).map(item=>typeof item==='string'?item:item?.path).filter(item=>typeof item==='string'&&item))].slice(0,50);}
function addQuick(items,paths,exists=fs.existsSync){return normalizeQuick([...(Array.isArray(items)?items:[]),...(Array.isArray(paths)?paths:[]).filter(item=>typeof item==='string'&&exists(item))]);}
function removeQuick(items,path){return normalizeQuick(items).filter(item=>item!==path);}
module.exports={normalizeQuick,addQuick,removeQuick};
