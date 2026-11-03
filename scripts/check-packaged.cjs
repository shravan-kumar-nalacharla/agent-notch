'use strict';
const fs=require('node:fs'),path=require('node:path'),{spawn}=require('node:child_process'),assert=require('node:assert/strict'),{createHash}=require('node:crypto');
const root=path.resolve(__dirname,'..'),version=require('../package.json').version,out=path.join(root,'artifacts',version),directory=path.resolve(process.argv[2]||path.join(root,'release',version,'win-unpacked')),exe=path.join(directory,'Agent Notch.exe'),resources=path.join(directory,'resources');
fs.mkdirSync(out,{recursive:true});
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
async function run(name,args,env={}){
 const log=path.join(out,name+'.log'),output=fs.openSync(log,'w');
 try{await new Promise((resolve,reject)=>{
  const child=spawn(exe,args,{windowsHide:true,cwd:root,env:{...process.env,...env},stdio:['ignore',output,output]});
  const timer=setTimeout(()=>{child.kill();reject(new Error(name+' timed out; inspect '+log));},120000);
  child.on('error',error=>{clearTimeout(timer);reject(error);});child.on('exit',code=>{clearTimeout(timer);code===0?resolve():reject(new Error(name+' exited '+code+'; inspect '+log));});
 });console.log(name+' PASS');}finally{fs.closeSync(output);}
}
(async()=>{
 const archive=path.join(resources,'app.asar'),asar=require('@electron/asar'),files=[];
 function walk(folder){for(const entry of fs.readdirSync(path.join(root,folder),{withFileTypes:true})){const name=path.join(folder,entry.name);if(entry.isDirectory())walk(name);else files.push(name);}}
 walk('src');for(const name of files)assert.equal(sha(asar.extractFile(archive,name)),sha(fs.readFileSync(path.join(root,name))),name+' differs from source');
 assert.equal(JSON.parse(asar.extractFile(archive,'package.json')).version,version);
 assert.equal(sha(asar.extractFile(archive,'THIRD-PARTY-NOTICES.md')),sha(fs.readFileSync(path.join(root,'THIRD-PARTY-NOTICES.md'))));
 for(const name of ['LICENSE','NOTICE'])assert.ok(asar.extractFile(archive,path.join('node_modules','playwright-core',name)).length);
 const native=fs.readdirSync(path.join(root,'native/bin')).filter(name=>!name.endsWith('.pdb'));
 assert.ok(native.includes('PresentationNative_cor3.dll'),'UI Automation native runtime is missing');
 for(const name of native)assert.equal(sha(fs.readFileSync(path.join(resources,'native',name))),sha(fs.readFileSync(path.join(root,'native/bin',name))),name+' differs from native build');
 const chromium=fs.readdirSync(path.join(resources,'agent-browsers')).find(name=>/^chromium-\d+$/.test(name));assert.ok(chromium,'Bundled Chromium is missing');
 const browserExe=path.join('agent-browsers',chromium,'chrome-win64/chrome.exe');assert.equal(sha(fs.readFileSync(path.join(resources,browserExe))),sha(fs.readFileSync(path.join(root,'tools',browserExe))));
 fs.writeFileSync(path.join(out,'package-integrity.json'),JSON.stringify({version,sourceFiles:files.length,nativeResources:native.length,chromium,checks:['All packaged source files match the current working source','Native resources match the rebuilt helper','Bundled Chromium executable matches the tested runtime']},null,2));
 for(const check of process.env.NOTCH_PACKAGED_CHECKS?.split(',').filter(Boolean)||['privacy','settings-save','settings-redesign','notch-reminder','windows-task'])await run('packaged-'+check,['--smoke-test','--'+check+'-check'],check==='windows-task'?{NOTCH_TASK_FIXTURE:path.join(out,'windows-fixture/WindowsFixture.exe'),...(fs.existsSync(path.join(root,'tools/dotnet'))?{DOTNET_ROOT:path.join(root,'tools/dotnet'),DOTNET_ROOT_X64:path.join(root,'tools/dotnet')}:{})}:{});
 await run('browser-packaged',[path.join(__dirname,'check-browser-agent.cjs')],{ELECTRON_RUN_AS_NODE:'1',NOTCH_PACKAGE_RESOURCES:resources});
 const brave=path.join(process.env.PROGRAMFILES||'C:/Program Files','BraveSoftware/Brave-Browser/Application/brave.exe');
 if(fs.existsSync(brave))await run('browser-brave-packaged',[path.join(__dirname,'check-browser-agent.cjs')],{ELECTRON_RUN_AS_NODE:'1',NOTCH_PACKAGE_RESOURCES:resources,NOTCH_TEST_BROWSER_EXE:brave});
 const evidence=path.join(require('node:os').tmpdir(),'agent-notch-'+version+'-smoke');if(fs.existsSync(evidence))fs.cpSync(evidence,path.join(out,'packaged'),{recursive:true});
 console.log('PACKAGED CHECKS PASS');
})().catch(error=>{console.error(error);process.exitCode=1;});
