'use strict';
const {outputLanguage,detectLanguage}=require('./localization.cjs');
// Conversational spellings are editable in the existing local dictionary.
const words={कल:'Kal',करना:'karna',है:'hai',को:'ko',से:'se',खोलो:'kholo',करो:'karo',असाइनमेंट:'assignment',सबमिट:'submit',रేపు:'Repu',రేపు:'Repu',ఉంది:'undi',నోట్స్:'notes',రెడీ:'ready',చెయ్:'chey',ప్రాజెక్ట్:'project',రివ్యూ:'review',నా:'Naa',మీటింగ్:'meeting',కి:'ki'};
const roman={क:'k',ख:'kh',ग:'g',घ:'gh',ङ:'ng',च:'ch',छ:'chh',ज:'j',झ:'jh',ञ:'ny',ट:'t',ठ:'th',ड:'d',ढ:'dh',ण:'n',त:'t',थ:'th',द:'d',ध:'dh',न:'n',प:'p',फ:'ph',ब:'b',भ:'bh',म:'m',य:'y',र:'r',ल:'l',व:'v',श:'sh',ष:'sh',स:'s',ह:'h',ळ:'l',क़:'q',క:'k',ఖ:'kh',గ:'g',ఘ:'gh',ఙ:'ng',చ:'ch',ఛ:'chh',జ:'j',ఝ:'jh',ఞ:'ny',ట:'t',ఠ:'th',డ:'d',ఢ:'dh',ణ:'n',త:'t',థ:'th',ద:'d',ధ:'dh',న:'n',ప:'p',ఫ:'ph',బ:'b',భ:'bh',మ:'m',య:'y',ర:'r',ల:'l',వ:'v',శ:'sh',ష:'sh',స:'s',హ:'h',ళ:'l',ఱ:'r'};
const vowels={अ:'a',आ:'aa',इ:'i',ई:'ee',उ:'u',ऊ:'oo',ए:'e',ऐ:'ai',ओ:'o',औ:'au',ऋ:'ri',అ:'a',ఆ:'aa',ఇ:'i',ఈ:'ee',ఉ:'u',ఊ:'oo',ఎ:'e',ఏ:'e',ఐ:'ai',ఒ:'o',ఓ:'o',ఔ:'au',ఋ:'ru'};
const marks={'ा':'aa','ि':'i','ी':'ee','ु':'u','ू':'oo','े':'e','ै':'ai','ो':'o','ौ':'au','ृ':'ri','ా':'aa','ి':'i','ీ':'ee','ు':'u','ూ':'oo','ె':'e','ే':'e','ై':'ai','ొ':'o','ో':'o','ౌ':'au','ృ':'ru'};
function romanWord(word){if(words[word])return words[word];let out='';const chars=[...word];for(let i=0;i<chars.length;i++){const c=chars[i],next=chars[i+1];if(roman[c]){out+=roman[c];if(marks[next]){out+=marks[next];i++;}else if(next==='्'||next==='్')i++;else if(i<chars.length-1||/[\u0c00-\u0c7f]/u.test(c))out+='a';}else out+=vowels[c]??({'ं':'n','ँ':'n','ः':'h','ం':'m','ః':'h','్':'','्':'','़':'','।':'.'}[c]??c);}return out;}
function renderTranscript(raw,settings,dictionary=[]){
 const mode=outputLanguage(settings),native=detectLanguage(raw);let text=raw,changed=false,review=false;
 if(['hinglish','tenglish'].includes(mode)&&native!=='unknown'){
   // Protect literals before transliterating only native-script word runs.
   text=raw.replace(/https?:\/\/\S+|[\w.+-]+@[\w.-]+\.[a-z]+|[A-Za-z]:\\[^\s]+|`[^`]*`|[\u0900-\u097f]+|[\u0c00-\u0c7f]+/gu,part=>/^[\u0900-\u097f\u0c00-\u0c7f]+$/u.test(part)?romanWord(part):part);changed=text!==raw;review=changed;
 }else if((mode==='hi'&&native!=='hi')||(mode==='te'&&native!=='te')){
   const common=mode==='hi'?{kal:'कल',karna:'करना',hai:'है',ko:'को',se:'से',karo:'करो',kholo:'खोलो'}:{repu:'రేపు',undi:'ఉంది',chey:'చెయ్',cheyyi:'చెయ్యి',naa:'నా',ki:'కి'};
   if(!settings.preserveEnglishTerms)Object.assign(common,mode==='hi'?{assignment:'असाइनमेंट',submit:'सबमिट',project:'प्रोजेक्ट',meeting:'मीटिंग'}:{project:'ప్రాజెక్ట్',review:'రివ్యూ',notes:'నోట్స్',ready:'రెడీ',meeting:'మీటింగ్'});
   text=raw.replace(/https?:\/\/\S+|[\w.+-]+@[\w.-]+\.[a-z]+|[A-Za-z]:\\[^\s]+|`[^`]*`|\b[a-z]+\b/giu,word=>common[word.toLowerCase()]||word);review=true;
 }else if(mode==='en'&&native!=='unknown')review=true;
 for(const entry of dictionary)if(entry.from){const escaped=entry.from.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');text=text.replace(new RegExp(`(?<![\\p{L}\\p{N}_])${escaped}(?![\\p{L}\\p{N}_])`,'gu'),()=>entry.term);}
 if(settings.punctuation&&text.trim()&&!/[.!?।]$/u.test(text.trim()))text=text.trim()+(mode==='hi'?'।':'.');
 return{text,mode,recognizedLanguage:native,review,warning:review?'Review the output script before insertion. Transliteration is a draft; original speech is preserved.':''};
}
module.exports={renderTranscript,romanWord};
