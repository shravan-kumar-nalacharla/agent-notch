'use strict';
const{test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const{catalog,byId,localized,validateCatalog,validatePatches}=require('../src/quotes.cjs'),{DEFAULTS:languages,LANGUAGES,validateLanguages,speechOptions,languagePrompt}=require('../src/localization.cjs'),{DEFAULTS:quoteDefaults,pickMoment,quietHours,daypart,migrateQuiet}=require('../src/quiet.cjs'),{renderTranscript}=require('../src/transcript.cjs'),{createLibrary}=require('../src/library.cjs');
const quotes={...quoteDefaults,onHover:true};
const now=new Date(2026,10,2,10).getTime(),activity={expanded:true,intentional:true,osDnd:false,systemKnown:true};
test('the actual settings loader retains v3 preferences and provider ciphertext across restart',()=>{
 const main=path.resolve(__dirname,'../src/main.cjs'),source=fs.readFileSync(main,'utf8'),loadSource=source.slice(source.indexOf('function load()'),source.indexOf('const publicState'));
 const folder=fs.mkdtempSync(path.join(os.tmpdir(),'notch-settings-restart-')),file=path.join(folder,'settings.json');
 try{const load=require('node:vm').runInNewContext(loadSource+';load',{fs,MIC_DEFAULTS:require('../src/microphone-privacy.cjs').DEFAULTS,validatePrivacy:require('../src/microphone-privacy.cjs').validatePrivacy,groqDefaults:require('../src/provider-settings.cjs').groqDefaults,groqMigrationPending:false,localization:require('../src/localization.cjs'),require:require('node:module').createRequire(main),file:()=>file});
  for(const lang of LANGUAGES){fs.writeFileSync(file,JSON.stringify({profileName:'Saved profile',keys:{groq:'opaque-ciphertext'},languages:{...languages,uiLanguage:lang,quoteLanguage:'tenglish'},quietMoments:{...quotes,quietStart:'23:00',quietEnd:'05:00'}}));const loaded=load();assert.equal(loaded.profileName,'Saved profile');assert.equal(loaded.languages.uiLanguage,lang);assert.equal(loaded.languages.quoteLanguage,'tenglish');assert.equal(loaded.quietMoments.cooldownMinutes,60);assert.equal(loaded.quietMoments.quietStart,'23:00');assert.equal(loaded.keys.groq,'opaque-ciphertext');}
 }finally{fs.rmSync(folder,{recursive:true,force:true});}
});
test('129 stable IDs carry all 645 editorial texts, native scripts and original provenance',()=>{
 assert.equal(catalog.quotes.length,129);assert.equal(byId.size,129);let count=0;
 for(const q of catalog.quotes){assert.equal(q.attribution,null);assert.ok(q.source_ref&&q.source_excerpt);for(const lang of LANGUAGES){const text=q.variants[lang];assert.ok(text.trim());count++;const letters=[...text].filter(c=>/\p{L}/u.test(c));if(lang==='hi'||lang==='te'){const regex=lang==='hi'?/[\u0900-\u097f]/u:/[\u0c00-\u0c7f]/u;assert.ok(letters.filter(c=>regex.test(c)).length/letters.length>.5,q.id+'/'+lang);}else assert.ok(letters.filter(c=>/[a-z]/iu.test(c)).length/letters.length>.9,q.id+'/'+lang);}}
 assert.equal(count,645);const invalid=structuredClone(catalog);invalid.quotes[1].id=invalid.quotes[0].id;assert.throws(()=>validateCatalog(invalid),/duplicate/);invalid.quotes[1].id='ANQ-002';invalid.quotes[1].variants.te='';assert.throws(()=>validateCatalog(invalid),/variant/);
});
test('changing all five languages preserves the selected ID, favorites and cooldown',()=>{
 const q=byId.get('ANQ-043'),history={lastAt:now,favorites:[q.id]};for(const language of LANGUAGES){assert.equal(localized(q,language).id,q.id);assert.equal(localized(q,language).text,q.variants[language]);assert.equal(pickMoment(quotes,history,now,()=>0,activity,language),null);}assert.deepEqual(history,{lastAt:now,favorites:['ANQ-043']});
});
test('startup, collapsed, unknown OS status, typing, voice, focus and task switches suppress automatic quotes',()=>{
 assert.equal(pickMoment(quotes,{},now,()=>0),null);
 for(const veto of [{expanded:false},{intentional:false},{osDnd:'unknown'},{osDnd:true},{systemKnown:false},{locked:true},{fullscreen:true},{typing:true},{voiceRecording:true},{pomodoro:true},{meeting:true},{foregroundChangedAt:now-19000}])assert.equal(pickMoment(quotes,{},now,()=>0,{...activity,...veto}),null,JSON.stringify(veto));
 let history={};for(let i=0;i<20;i++){const q=pickMoment(quotes,history,now,()=>0,activity);if(q){assert.equal(i,0);history={lastAt:now,day:q.day,count:1};}}
});
test('heavy content never enters automatic rotation without its explicit opt-in',()=>{
 for(let i=0;i<100;i++){const q=pickMoment(quotes,{},now,()=>i/100,activity);assert.ok(q);assert.equal(byId.get(q.id).requires_opt_in,false);assert.equal(byId.get(q.id).auto_eligible,true);}
 const muted=catalog.quotes.map(q=>q.id);assert.equal(pickMoment(quotes,{muted},now,()=>0,{...activity,context:'manual'}),null);
});
test('night shifts, midnight quiet hours and local calendar days use user schedule',()=>{
 const config={...quotes,workStart:'22:00',workEnd:'06:00',quietStart:'07:00',quietEnd:'15:00'};
 assert.equal(daypart(config,new Date(2026,10,2,22,30)),'morning');assert.equal(daypart(config,new Date(2026,10,3,2)),'midday');assert.equal(daypart(config,new Date(2026,10,3,7)),'evening');
 assert.ok(quietHours({...quotes,quietStart:'22:00',quietEnd:'06:00'},new Date(2026,10,3,1)));assert.equal(pickMoment(config,{},new Date(2026,10,3,10).getTime(),()=>0,activity),null);
 const midnight=new Date(2026,10,3,0,1).getTime();assert.ok(pickMoment(quotes,{day:'2026-10-2',count:2,lastAt:midnight-5*3600000},midnight,()=>0,activity));
});
test('migration preserves disabled state and legacy settings while adopting scheduled thought defaults',()=>{
 const migrated=migrateQuiet({enabled:false,dailyCap:48,cooldownMinutes:5});assert.equal(migrated.enabled,false);assert.equal(migrated.dailyCap,8);assert.equal(migrated.cooldownMinutes,60);assert.equal(migrated.legacyPreferences.dailyCap,48);
 assert.throws(()=>validateLanguages({speechInput:'tenglish'}));assert.throws(()=>validateLanguages({cloudAudioConsent:'yes'}));
});
test('preferences persist independently and correction imports cannot change IDs or sources',()=>{
 const folder=fs.mkdtempSync(path.join(os.tmpdir(),'notch-quotes-test-'));try{
 fs.writeFileSync(path.join(folder,'library.json'),JSON.stringify({quiet:{favorites:['original-1','ANQ-043']}}));const lib=createLibrary(folder,()=>now);
 assert.deepEqual(lib.view().quiet.legacyFavorites,['original-1']);assert.deepEqual(lib.view().quiet.favorites,['ANQ-043']);lib.action('quiet:favorite',{id:'ANQ-043'});assert.deepEqual(lib.view().quiet.favorites,[]);
 lib.action('quiet:import',{schema:'agent-notch-favorites-v1',favorites:['ANQ-043','ANQ-043']});assert.deepEqual(createLibrary(folder).view().quiet.favorites,['ANQ-043']);assert.throws(()=>lib.action('quiet:import',{schema:'agent-notch-favorites-v1',favorites:['evil']}));
 const patches=validatePatches({schema:'agent-notch-localization-patches-v1',quotes:{'ANQ-043':{te:'సవరణ'}}});assert.equal(localized(byId.get('ANQ-043'),'te',patches).text,'సవరణ');assert.throws(()=>validatePatches({schema:'agent-notch-localization-patches-v1',quotes:{'ANQ-043':{source_ref:'fake'}}}));
 }finally{fs.rmSync(folder,{recursive:true,force:true});}
});
test('ASR uses genuine spoken codes while response policy stays independent',()=>{
 assert.deepEqual(speechOptions({...languages,dictationMode:'hinglish'}).hints,['en','hi']);assert.deepEqual(speechOptions({...languages,dictationMode:'tenglish'}).hints,['en','te']);assert.deepEqual(speechOptions({...languages,speechInput:'te-IN',allowCodeSwitch:false}).hints,['te']);assert.match(languagePrompt({...languages,voiceResponseLanguage:'tenglish'},'Hello'),/Roman script/);
});
test('Roman drafts preserve English entities, literals, times and the original transcript',()=>{
 const raw='రేపు project review ఉంది, notes ready చెయ్',r=renderTranscript(raw,{...languages,dictationMode:'tenglish',punctuation:true});assert.equal(r.text,'Repu project review undi, notes ready chey.');assert.equal(r.review,true);assert.equal(raw,'రేపు project review ఉంది, notes ready చెయ్');
 assert.equal(renderTranscript('कल assignment submit करना है',{...languages,dictationMode:'hinglish'}).text,'Kal assignment submit karna hai.');
 const entities='నా meeting 3:30 కి ఉంది C:\\work\\report.txt test@example.com https://example.com';const output=renderTranscript(entities,{...languages,dictationMode:'tenglish'}).text;for(const literal of ['3:30','C:\\work\\report.txt','test@example.com','https://example.com'])assert.ok(output.includes(literal));
 assert.equal(renderTranscript('I need to finish the report tomorrow',{...languages,dictationMode:'en'}).text,'I need to finish the report tomorrow.');assert.equal(renderTranscript('Kal assignment submit karna hai',{...languages,dictationMode:'hi'}).review,true);
});
test('Deepgram sends WAV bytes and safe hints to the official endpoint, never a display locale',async()=>{
 const{transcribe}=require('../src/providers.cjs');const result=await transcribe({provider:'deepgram',key:'secret',audio:Buffer.alloc(1000),mime:'audio/wav',allowCodeSwitch:true,hints:['en','te'],detailed:true},async(url,request)=>{const parsed=new URL(url);assert.equal(parsed.origin,'https://api.deepgram.com');assert.equal(parsed.searchParams.get('language'),'multi');assert.deepEqual(parsed.searchParams.getAll('language_hint'),['en','te']);assert.ok(!url.includes('secret'));assert.equal(request.headers.authorization,'Token secret');assert.ok(Buffer.isBuffer(request.body));return{ok:true,json:async()=>({results:{channels:[{detected_language:'te',alternatives:[{transcript:'రేపు meeting',confidence:.97}]}]}})};});assert.equal(result.confidence,.97);assert.equal(result.detectedLanguage,'te');
 for(const status of [400,401,403,429])await assert.rejects(transcribe({provider:'deepgram',key:'test',audio:Buffer.alloc(1000)},async()=>({ok:false,status})),/provider|Provider/);
 await assert.rejects(transcribe({provider:'deepgram',key:'test',audio:Buffer.alloc(1000),language:'hinglish'}),/spoken language/);
});
