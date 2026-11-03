'use strict';
const fs=require('node:fs'),path=require('node:path'),{randomUUID}=require('node:crypto');
function createIntegrationSecrets({folder,safeStorage}){
  const cache=new Map(),errors=new Map();let queue=Promise.resolve();
  function file(label){if(!['spotify','youtube','agent-task'].includes(label))throw new Error('Unknown integration credential.');return path.join(folder,'integration-'+label+'.json');}
  async function get(label){if(cache.has(label))return cache.get(label);const target=file(label);if(!fs.existsSync(target))return null;try{const content=JSON.parse(fs.readFileSync(target,'utf8')),decoded=await safeStorage.decryptStringAsync(Buffer.from(content.encrypted,'base64'));if(typeof decoded.result!=='string')throw new Error('Unavailable');const value=JSON.parse(decoded.result);cache.set(label,value);errors.delete(label);if(decoded.shouldReEncrypt)await set(label,value);return value;}catch{errors.set(label,'Windows could not unlock '+label+' credentials. Reconnect or enter the key again.');return null;}}
  function set(label,value){const pending=queue.then(async()=>{const target=file(label);if(value===null){if(fs.existsSync(target))fs.unlinkSync(target);cache.delete(label);errors.delete(label);return;}if(!safeStorage||!await safeStorage.isAsyncEncryptionAvailable())throw new Error('Windows secure storage is unavailable.');const encrypted=(await safeStorage.encryptStringAsync(JSON.stringify(value))).toString('base64'),temporary=target+'.'+randomUUID()+'.tmp';fs.writeFileSync(temporary,JSON.stringify({version:1,encrypted}),{mode:0o600,flag:'wx'});try{fs.renameSync(temporary,target);}catch(error){fs.unlinkSync(temporary);throw error;}cache.set(label,value);errors.delete(label);});queue=pending.catch(()=>{});return pending;}
  return{get,set,error:label=>errors.get(label)||'',clearCache:()=>cache.clear()};
}
module.exports={createIntegrationSecrets};
