'use strict';
// Check the production GitHub updater anonymously without installing anything.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {NsisUpdater}=require('electron-updater'),{NodeHttpExecutor}=require('builder-util/out/nodeHttpExecutor');
const arg=(name,fallback)=>{const at=process.argv.indexOf(name);return at<0?fallback:process.argv[at+1];};
async function verify({from,expected,installer}){
 const root=path.resolve(__dirname,'../artifacts/public-update-check');fs.mkdirSync(root,{recursive:true});
 const adapter={version:from,name:'agent-notch',isPackaged:true,userDataPath:root,baseCachePath:root,whenReady:async()=>{},onQuit(){},quit(){throw Error('Verification must not install');},relaunch(){throw Error('Verification must not relaunch');}};
 const updater=new NsisUpdater(null,adapter);updater.httpExecutor=new NodeHttpExecutor();updater.autoDownload=false;updater.autoInstallOnAppQuit=false;updater.allowPrerelease=false;updater.logger=null;
 updater.setFeedURL({provider:'github',owner:'shravan-kumar-nalacharla',repo:'agent-notch-releases'});
 let available=false;updater.on('update-available',()=>{available=true;});
 const result=await updater.checkForUpdates();assert.ok(available,'The old installed version must receive update-available');assert.equal(result?.updateInfo.version,expected);
 const file=result.updateInfo.files.find(f=>f.url===`Agent-Notch-Setup-${expected}.exe`);assert.ok(file,'Metadata must reference the versioned Windows installer');
 if(installer){const bytes=fs.readFileSync(installer);assert.equal(file.sha512,crypto.createHash('sha512').update(bytes).digest('base64'));assert.equal(file.size,bytes.length);}
 const proof={from,availableVersion:result.updateInfo.version,installer:file.url,size:file.size,sha512:file.sha512,autoDownload:updater.autoDownload,verifiedAt:new Date().toISOString()};fs.writeFileSync(path.join(root,'verification.json'),JSON.stringify(proof,null,2));return proof;
}
if(require.main===module)verify({from:arg('--from','0.34.3'),expected:arg('--expected',require('../package.json').version),installer:arg('--installer','')}).then(proof=>console.log(JSON.stringify(proof,null,2)),error=>{console.error('PUBLIC UPDATE VERIFY FAILED:',error.message);process.exitCode=1;});
module.exports={verify};
