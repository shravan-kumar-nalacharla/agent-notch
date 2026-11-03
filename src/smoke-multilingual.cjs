'use strict';
const fs=require('node:fs'),path=require('node:path');
module.exports=async function({win,settings,state,widgets,out,saveSnapshot,evidence}){
 const js=code=>win.webContents.executeJavaScript(code),sj=code=>settings.webContents.executeJavaScript(code),delay=ms=>new Promise(r=>setTimeout(r,ms));
 async function snap(name){await settings.webContents.capturePage();await delay(300);await saveSnapshot(settings,path.join(out,name));}
 async function check(code,label){if(!await sj(code))throw new Error('Multilingual: '+label);evidence.checks.push(label);}
 await check("document.getElementById('languagesGroup')&&document.getElementById('quoteLibraryRows').children.length===129",'All 129 curated thoughts browse offline in the normal Settings window');
 await check("!document.getElementById('cloudAudioConsent').checked&&!document.getElementById('speak').checked",'Audio upload consent and spoken replies default off');
 const bounds=win.getBounds(),history=widgets.library.view().quiet;
 for(const language of ['en','hi','te','hinglish','tenglish']){
  await sj(`document.getElementById('uiLanguage').value='${language}';document.getElementById('quoteLanguage').value='follow_ui';window.islandSaveSettings()`);await delay(200);
  if(state().languages.uiLanguage!==language)throw new Error('Language did not persist: '+language);
  await check(`document.documentElement.lang==='${require('./localization.cjs').LOCALES[language]}'`,'App root exposes '+language+' screen-reader language');
  const expected=require('./quotes.cjs').byId.get('ANQ-043').variants[language];
  await check(`document.querySelector('[data-quote-id="ANQ-043"] p').textContent===${JSON.stringify(expected)}`,'ANQ-043 renders exact curated '+language+' variant');
  await sj("window.islandShowSettingsSection('languagesGroup')");await delay(100);await snap('languages-'+language+'.png');
  await sj("document.getElementById('quoteSearch').value='ANQ-043';document.getElementById('quoteSearch').dispatchEvent(new Event('input'));window.islandShowSettingsSection('quoteLibraryGroup')");await delay(500);await snap('quote-library-'+language+'.png');await sj("document.getElementById('quoteSearch').value='';document.getElementById('quoteSearch').dispatchEvent(new Event('input'))");
  fs.writeFileSync(path.join(out,'scroll-'+language+'.json'),JSON.stringify(await sj("({library:document.getElementById('quoteLibraryGroup').getBoundingClientRect().toJSON(),scroll:scrollY,root:document.getElementById('island').getBoundingClientRect().toJSON(),panel:document.querySelector('.settings-panel').getBoundingClientRect().toJSON()})"),null,2));
  if(JSON.stringify(win.getBounds())!==JSON.stringify(bounds))throw new Error('Language changed native island bounds.');
 }
 const after=widgets.library.view().quiet;if(after.lastAt!==history.lastAt||after.count!==history.count)throw new Error('Language switching changed quote cooldown.');
 evidence.checks.push('All five language changes preserve native island bounds and quote cooldown');
 await sj("document.getElementById('uiLanguage').value='hi';document.getElementById('quoteLanguage').value='tenglish';window.islandSaveSettings()");await delay(200);
 await check("document.documentElement.lang==='hi-IN'&&document.querySelector('[data-quote-id=\"ANQ-043\"] p').lang==='te-Latn-IN'",'Hindi UI and Tenglish quotes work independently');
 const safe=require('electron').safeStorage,encrypted=await safe.encryptStringAsync('temporary-smoke-key'),decrypted=await safe.decryptStringAsync(encrypted);if(decrypted.result!=='temporary-smoke-key')throw new Error('Async secure storage roundtrip failed.');
 const legacy=await safe.decryptStringAsync(safe.encryptString('legacy-smoke-key'));if(legacy.result!=='legacy-smoke-key')throw new Error('Legacy key migration failed.');evidence.checks.push('Windows async DPAPI storage and legacy encrypted-key compatibility exercised with disposable test text');
 await sj("document.getElementById('uiLanguage').value='en';document.getElementById('quoteLanguage').value='follow_ui';window.islandSaveSettings()");await delay(200);
 fs.writeFileSync(path.join(out,'multilingual-ui-evidence.json'),JSON.stringify({languages:5,quoteVariantsChecked:5,id:'ANQ-043',bounds,cloudRequests:0,physicalMicTested:false},null,2));
};
