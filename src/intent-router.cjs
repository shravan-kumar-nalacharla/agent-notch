'use strict';
// Quoted search phrases are data, never action separators.
function unquoted(text){return text.replace(/"[^"]*"|'[^']*'|“[^”]*”/g,m=>' '.repeat(m.length));}
function routeIntent(input){
 const text=String(input||'').trim(),plain=unquoted(text);let searchQuery=null;
 if(/^(?:stop|cancel)(?: this| the| my)? (?:task|automation)\b|^(?:stop|cancel)$/i.test(text))return{intent:'cancel_active_task',searchQuery};
 if(/^(?:translate\s*:|tell me|explain|what\b|why\b|how (?:can|do|to|would|does)\b)/i.test(text))return{intent:'conversation',searchQuery};
 if(/^(?:actually|instead|correction|no[, ])/i.test(text))return{intent:'correction',searchQuery};
 const search=/^(?:please\s+)?(?:search|look up|google(?!\s+(?:AI Studio|खोलो|open|kholo)))(?: the web)?(?: for)?\s+/i.exec(text);
 const boundary=/(?:\s+(?:and(?: then)?|then)\s+(?=(?:go|open|click|select|navigate|summari[sz]e|read|visit|find|play|fill|type)\b)|[,;]\s*(?=(?:and\s+)?(?:go|open|click|navigate|select|summari[sz]e)\b))/i.exec(plain);
 if(search){let query=text.slice(search[0].length,boundary?.index??text.length).trim().replace(/[.!?]+$/,'');query=query.replace(/\s+as an exact phrase$/i,'');if(/^(['"“]).*['"”]$/.test(query))query=query.slice(1,-1);searchQuery=query;}
 const action=/\b(?:open|go to|click|navigate|select|fill|type|copy|move|rename|close|launch|summari[sz]e|kholo|jao|chalo|ch[eai]si|vellu)\b|खोल|जाओ|తెరిచి|వెళ్ల|వెళ్ళ/i.test(plain);
 const compound=!!boundary||action&&(/\b(?:and|then|aur|ch[eai]si)\b|[,;]|खोलकर|తెరిచి/i.test(plain)||/\bAPI keys?\b/i.test(plain)&&/\b(?:go|open|click|navigate|kholo|vellu)\b/i.test(plain));
 return{exact:!!search&&/as an exact phrase[.!?]*$/i.test(text),intent:compound?'multi_step_action':search?'search_only':action?'action':'conversation',searchQuery,browser:[...plain.matchAll(/\b(brave|chrome|edge)\b/gi)].at(-1)?.[1].toLowerCase()||null};
}
module.exports={routeIntent,unquoted};
