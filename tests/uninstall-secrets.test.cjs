const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),script=path.join(root,'installer','scrub-keys.cjs');

test('uninstall removes saved provider keys but keeps ordinary settings',()=>{
  const appData=fs.mkdtempSync(path.join(os.tmpdir(),'agent-notch-scrub-')),profile=path.join(appData,'agent-notch');
  fs.mkdirSync(profile,{recursive:true});
  fs.writeFileSync(path.join(profile,'settings.json'),JSON.stringify({profileName:'Keep me',keys:{groq:'ciphertext'},integrationSecrets:{calendar:'ciphertext'},note:'keep'}));
  fs.writeFileSync(path.join(profile,'integration-secrets.json'),'{"spotify":"ciphertext"}');
  fs.writeFileSync(path.join(profile,'agent-token'),'a'.repeat(64));
  execFileSync(process.execPath,[script,'agent-notch'],{env:{...process.env,APPDATA:appData},windowsHide:true});
  const settings=JSON.parse(fs.readFileSync(path.join(profile,'settings.json'),'utf8'));
  assert.equal(settings.keys,undefined);
  assert.equal(settings.integrationSecrets,undefined);
  assert.equal(settings.profileName,'Keep me');
  assert.equal(settings.note,'keep');
  assert.equal(fs.existsSync(path.join(profile,'integration-secrets.json')),false);
  assert.equal(fs.existsSync(path.join(profile,'agent-token')),false);
});
