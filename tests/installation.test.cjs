const{test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const{validateInstallation}=require('../src/installation.cjs');
test('uninstall accepts only an existing quoted uninstaller in the current installed directory',t=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'notch-install-')),file=path.join(dir,'Uninstall Agent Notch.exe');fs.writeFileSync(file,'fixture');t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
  const exe=path.join(dir,'Agent Notch.exe'),entry={DisplayVersion:'0.5.0',UninstallString:`"${file}" /currentuser`};assert.equal(validateInstallation(entry,exe).installed,true);assert.deepEqual(validateInstallation(entry,exe).args,['/currentuser']);
  assert.equal(validateInstallation({...entry,UninstallString:`"${file}" && calc`},exe).installed,false);assert.equal(validateInstallation(entry,path.join(dir,'other','Agent Notch.exe')).installed,false);assert.equal(validateInstallation(null,exe).installed,false);
});
test('uninstall removes only hooks with the exact local profile token',t=>{
  const{cleanupHooks}=require('../installer/cleanup-hooks.cjs'),dir=fs.mkdtempSync(path.join(os.tmpdir(),'notch-hook-cleanup-')),file=path.join(dir,'settings.json'),token='a'.repeat(64);t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));fs.writeFileSync(path.join(dir,'agent-token'),token);
  const owned={type:'http',url:'http://127.0.0.1:47829/island-agent',headers:{'X-Island-Fusion':token}},other={...owned,headers:{'X-Island-Fusion':'b'.repeat(64)}};
  fs.writeFileSync(file,JSON.stringify({model:'keep',hooks:{Stop:[{hooks:[owned,other,{type:'command',command:'keep this'}]},{hooks:[]},null]}}));assert.equal(cleanupHooks(dir,file).removed,1);const data=JSON.parse(fs.readFileSync(file));assert.equal(data.model,'keep');assert.equal(data.hooks.Stop[0].hooks.length,2);assert.deepEqual(data.hooks.Stop.slice(1),[{hooks:[]},null]);assert.equal(cleanupHooks(dir,file).removed,0);
});
