'use strict';
module.exports=async({app,win,getSettingsWindow,native,out})=>{
 const fs=require('node:fs'),path=require('node:path'),js=code=>win.webContents.executeJavaScript(code),sleep=ms=>new Promise(r=>setTimeout(r,ms));
 await native().request('privacy.status');await sleep(1800);
 function sample(label){const processes=app.getAppMetrics().map(p=>({type:p.type,pid:p.pid,...p.memory}));return{label,processes,privateMB:processes.reduce((n,p)=>n+(p.privateBytes||0),0)/1024,workingSetMB:processes.reduce((n,p)=>n+(p.workingSetSize||0),0)/1024};}
 const samples=[sample('idle')];await js("window.island.activate({revealOnly:true});document.querySelector('[data-tab=home]').click()");await sleep(1000);samples.push(sample('home'));
 await js("window.island.settings()");for(let i=0;i<80&&!getSettingsWindow();i++)await sleep(50);await sleep(1500);samples.push(sample('settings'));getSettingsWindow()?.close();await sleep(700);
 fs.writeFileSync(path.join(out,'resources.json'),JSON.stringify({version:app.getVersion(),gpu:process.argv.includes('--gpu-smoke'),samples},null,2));console.log('RESOURCE PROFILE',JSON.stringify(samples.map(({label,privateMB,workingSetMB})=>({label,privateMB,workingSetMB}))));
};
