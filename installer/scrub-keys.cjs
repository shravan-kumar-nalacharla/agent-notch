'use strict';
// Uninstall-time secret scrub. Runs only on a real uninstall, never on an
// electron-updater update. Provider keys and integration secrets are removed
// even when the user chooses to keep notes, history and settings.
const fs=require('node:fs'),path=require('node:path'),{randomUUID}=require('node:crypto');
const name=process.argv[2];
if(!/^agent-notch(?:-qa)?$/.test(name||'')){console.error('Unknown application profile.');process.exit(1);}
const profile=path.join(process.env.APPDATA||'',name);
const settingsFile=path.join(profile,'settings.json');
try{
  if(fs.existsSync(settingsFile)){
    const settings=JSON.parse(fs.readFileSync(settingsFile,'utf8'));
    let changed=false;
    for(const field of ['keys','integrationSecrets'])if(field in settings){delete settings[field];changed=true;}
    if(changed){const temp=settingsFile+'.'+randomUUID()+'.tmp';fs.writeFileSync(temp,JSON.stringify(settings));fs.renameSync(temp,settingsFile);}
  }
}catch(error){console.error('Agent Notch could not scrub saved provider keys:',error.message);process.exitCode=1;}
for(const file of ['integration-secrets.json','agent-token']){try{fs.rmSync(path.join(profile,file),{force:true});}catch{}}
