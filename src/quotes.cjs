'use strict';
const {LANGUAGES,LOCALES}=require('./localization.cjs');
const catalog=require('./assets/Agent_Notch_Quotes_5_Languages.json');
function validateCatalog(data){
 if(data?.schema!=='agent-notch-curated-quotes-multilingual-v2'||!Array.isArray(data.quotes)||data.quotes.length!==129)throw new Error('Expected the curated 129-quote multilingual collection.');
 const ids=new Set();for(const q of data.quotes){
  if(!/^ANQ-\d{3}$/.test(q.id)||ids.has(q.id))throw new Error('Invalid or duplicate quote ID.');ids.add(q.id);
  if(q.origin!=='user_collection'||q.attribution!==null||!/^quotes\.txt:L\d+$/.test(q.source_ref)||!q.source_excerpt?.trim()||!['verbatim','light_edit','adapted','dialogue_adaptation'].includes(q.edit_type))throw new Error('Invalid quote provenance: '+q.id);
  if(typeof q.auto_eligible!=='boolean'||typeof q.requires_opt_in!=='boolean'||!Number.isInteger(q.intensity)||q.intensity<1||q.intensity>5||!Array.isArray(q.dayparts)||!q.theme||!q.display_category)throw new Error('Invalid quote metadata: '+q.id);
  for(const lang of LANGUAGES)if(typeof q.variants?.[lang]!=='string'||!q.variants[lang].trim()||q.variants[lang].length>2000)throw new Error('Missing or oversized variant: '+q.id+'/'+lang);
 }return data;
}
validateCatalog(catalog);
const byId=new Map(catalog.quotes.map(q=>[q.id,q]));
function localized(q,language='en',patches={}){if(!LANGUAGES.includes(language))throw new Error('Unknown quote language.');return{id:q.id,text:patches[q.id]?.[language]||q.variants[language],lang:LOCALES[language],theme:q.theme,category:q.display_category,source_ref:q.source_ref,edit_type:q.edit_type,sourceNote:q.edit_type.includes('adapt')?'Adapted from your collection':'From your collection',max_display_ms:q.max_display_ms};}
function validatePatches(value){
 if(!value||value.schema!=='agent-notch-localization-patches-v1'||!value.quotes||typeof value.quotes!=='object'||Array.isArray(value.quotes)||Object.keys(value.quotes).length>129)throw new Error('Invalid localization patch file.');
 const result={};for(const[id,variants]of Object.entries(value.quotes)){if(!byId.has(id)||!variants||typeof variants!=='object'||Array.isArray(variants))throw new Error('Unknown quote in patch.');result[id]={};for(const[lang,text]of Object.entries(variants)){if(!LANGUAGES.includes(lang)||typeof text!=='string'||!text.trim()||text.length>2000)throw new Error('Invalid localization correction.');result[id][lang]=text.trim().normalize('NFC');}}return result;
}
module.exports={catalog,byId,validateCatalog,localized,validatePatches};
