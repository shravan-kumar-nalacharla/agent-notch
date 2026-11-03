'use strict';
function groqDefaults(saved={}){
 if(saved.groqDefaultsMigration===true)return saved;
 return{...saved,assistant:'groq',speech:'groq',companion:{...saved.companion,chatEngine:'standard'},groqDefaultsMigration:true};
}
function keyChanges(value,providers){
 const changes=new Map();
 const add=(provider,text,allowBlank)=>{if(!Object.hasOwn(providers,provider)||typeof text!=='string'||text.length>1000||!allowBlank&&!text.trim())throw new Error('Invalid provider API key.');changes.set(provider,text.trim());};
 if(value.providerKeys!==undefined){if(!value.providerKeys||typeof value.providerKeys!=='object'||Array.isArray(value.providerKeys))throw new Error('Invalid provider API keys.');for(const[provider,text]of Object.entries(value.providerKeys))add(provider,text,false);}
 if(value.removeProviderKeys!==undefined){if(!Array.isArray(value.removeProviderKeys))throw new Error('Invalid key removal.');for(const provider of value.removeProviderKeys){if(changes.has(provider))throw new Error('Choose either a replacement or removal for a provider.');add(provider,'',true);}}
 if(value.key)add(value.key.provider,value.key.text,true);
 return changes;
}
module.exports={groqDefaults,keyChanges};
