'use strict';
const fs=require('node:fs'),path=require('node:path');
module.exports=async function({win,widgets,out,saveSnapshot}){
  const product=widgets().productivity,checks=[],sleep=ms=>new Promise(r=>setTimeout(r,ms)),js=code=>win.webContents.executeJavaScript(code),originalState=product.spotify.state;
  async function until(test,label){for(let i=0;i<100;i++){if(await test())return;await sleep(70);}throw new Error(label);}
  await js("window.island.productivity('notifications:settings',{enabled:false})");await js("window.island.productivity('open',{section:'spotify'})");await until(()=>!!product.getWindow(),'Spotify window did not open');const detail=product.getWindow(),dj=code=>detail.webContents.executeJavaScript(code);await until(()=>dj("!!window.NotchProductivity?.data&&!!document.querySelector('[data-form=spotifyConfig]')"),'Spotify setup did not load');
  try{
    const publish=extra=>{product.spotify.state=()=>({...originalState(),...extra});widgets().emit('productivity:changed',product.snapshot());};
    const help='Spotify account access is not verified. The developer-app owner must have Spotify Premium. Confirm the signed-in account is allowed under Users Management in the Spotify developer dashboard, then reconnect.';
    publish({hasCredentials:true,accountVerified:false,connected:false,needsReconnect:true,connecting:false,error:help});
    await until(()=>dj("document.getElementById('routineContent').textContent.includes('Account access not verified')"),'Incomplete OAuth still looks connected');
    if(await dj("Array.from(document.querySelectorAll('#routineContent p')).some(p=>p.textContent.trim()==='Connected')"))throw new Error('False Connected state remains');checks.push('Incomplete prior OAuth session renders Account access not verified, never Connected');
    if(!await dj("!document.querySelector('[data-action=disconnectSpotify]').disabled&&document.querySelector('[data-action=connectSpotify]').textContent==='Reconnect'"))throw new Error('Incomplete session cannot be reset');checks.push('Reconnect and Disconnect remain available for incomplete stored credentials');
    if(!await dj("document.querySelector('[data-form=spotifyConfig]').closest('details').open&&document.getElementById('routineContent').textContent.includes('Users Management')"))throw new Error('Account setup recovery is not visible');checks.push('Setup expands and explains developer-owner Premium and Users Management');
    if(await dj("!!document.querySelector('[data-action=playSpotify], [data-action=transferSpotify]')"))throw new Error('Playback controls appeared before account verification');checks.push('Playback controls stay hidden until account verification succeeds');await dj('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');await sleep(150);await saveSnapshot(detail,path.join(out,'spotify-access-required.png'));
    publish({hasCredentials:true,accountVerified:false,connected:false,needsReconnect:false,connecting:true,error:''});await until(()=>dj("document.getElementById('routineContent').textContent.includes('Finishing Spotify sign-in')"),'Pending verification has no pending state');checks.push('Pending authorization is labeled as finishing sign-in');
    product.spotify.state=originalState;widgets().emit('productivity:changed',product.snapshot());await until(()=>dj("document.getElementById('routineContent').textContent.includes('Not connected')"),'Reset did not return to disconnected');checks.push('Cleared credentials render Not connected');
    fs.writeFileSync(path.join(out,'spotify-access-report.json'),JSON.stringify({checks,realCloudRequests:false,realCredentialsRead:false,note:'UI status fixtures; actual loopback HTTP OAuth/profile-failure behavior is covered by unit integration tests.'},null,2));console.log('SPOTIFY ACCESS PASS',checks.length,'checks; zero real account requests');
  }finally{product.spotify.state=originalState;}
};
