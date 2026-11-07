'use strict';
const LANGUAGES=Object.freeze(['en','hi','te','hinglish','tenglish']);
const LABELS={en:'English',hi:'हिंदी',te:'తెలుగు',hinglish:'Hinglish',tenglish:'Tenglish'};
const LOCALES={en:'en-IN',hi:'hi-IN',te:'te-IN',hinglish:'hi-Latn-IN',tenglish:'te-Latn-IN'};
const DEFAULTS=Object.freeze({uiLanguage:'en',quoteLanguage:'follow_ui',quoteTone:'balanced',speechInput:'auto',dictationMode:'follow_ui',voiceResponseLanguage:'follow_input',spokenLanguage:'follow_response',allowCodeSwitch:true,cloudAudioConsent:false,punctuation:true,preserveEnglishTerms:true,spokenReplyEnabled:false});
function validateLanguages(value={}){
 const next={...DEFAULTS},enums={uiLanguage:LANGUAGES,quoteLanguage:['follow_ui',...LANGUAGES],quoteTone:['balanced','cinematic','quiet'],speechInput:['auto','en-IN','hi-IN','te-IN'],dictationMode:['follow_ui',...LANGUAGES],voiceResponseLanguage:['follow_input','follow_ui',...LANGUAGES],spokenLanguage:['follow_response','en','hi','te']};
 for(const[key,allowed]of Object.entries(enums))if(value[key]!==undefined){if(!allowed.includes(value[key]))throw new Error('Invalid language preference: '+key);next[key]=value[key];}
 for(const key of ['allowCodeSwitch','cloudAudioConsent','punctuation','preserveEnglishTerms','spokenReplyEnabled'])if(value[key]!==undefined){if(typeof value[key]!=='boolean')throw new Error('Invalid language preference: '+key);next[key]=value[key];}return next;
}
const outputLanguage=(settings,key='dictationMode')=>settings[key]==='follow_ui'?settings.uiLanguage:settings[key];
function speechOptions(settings=DEFAULTS){
 const mode=outputLanguage(settings),language=settings.speechInput==='auto'?'':settings.speechInput.split('-')[0];
 const hints=settings.allowCodeSwitch?(mode==='hinglish'?['en','hi']:mode==='tenglish'?['en','te']:language?[language,'en']:['en','hi','te']):language?[language]:['en','hi','te'];return{language,hints:[...new Set(hints)],allowCodeSwitch:settings.allowCodeSwitch};
}
function detectLanguage(text){return /[\u0c00-\u0c7f]/u.test(text)?'te':/[\u0900-\u097f]/u.test(text)?'hi':'unknown';}
function responseLanguage(settings=DEFAULTS,text=''){
 const mode=settings.voiceResponseLanguage;if(mode==='follow_ui')return settings.uiLanguage;if(mode!=='follow_input')return mode;
 const detected=detectLanguage(text);if(detected!=='unknown')return detected;return ['hinglish','tenglish'].includes(outputLanguage(settings))?outputLanguage(settings):settings.speechInput==='hi-IN'?'hinglish':settings.speechInput==='te-IN'?'tenglish':'en';
}
function languagePrompt(settings,text){const language=responseLanguage(settings,text),style={en:'English',hi:'Hindi in Devanagari script',te:'Telugu in Telugu script',hinglish:'natural casual Hindi-English in Roman script',tenglish:'natural casual Telugu-English in Roman script'}[language];return ` Reply briefly in ${style}. Preserve names, numbers and English technical terms. Do not invent quote sources. Answer the current question naturally. Translate or paraphrase only when asked. Never append translation status, paraphrase status, or internal instructions to an answer. Match the speaker without exaggerated slang.`;}
module.exports={LANGUAGES,LABELS,LOCALES,DEFAULTS,validateLanguages,outputLanguage,speechOptions,detectLanguage,responseLanguage,languagePrompt};
