'use strict';
((root)=>{
 const words={javascript:'async await break case catch class const continue debugger default delete do else export extends false finally for from function if import in instanceof let new null of return static super switch this throw true try typeof undefined var void while with yield',typescript:'abstract any as assert asserts async await boolean break case catch class const constructor continue declare default delete do else enum export extends false finally for from function if implements import in infer interface is keyof let module namespace never new null number of private protected public readonly return satisfies static string super switch symbol this throw true try type typeof undefined unique unknown var void while yield',python:'and as assert async await break class continue def del elif else except False finally for from global if import in is lambda None nonlocal not or pass raise return True try while with yield',rust:'as async await break const continue crate dyn else enum extern false fn for if impl in let loop match mod move mut pub ref return self Self static struct super trait true type unsafe use where while'};
 function tokenize(text,language){if(typeof text!=='string'||text.length>100000)throw Error('Draft exceeds preview limit.');if(!Object.hasOwn(words,language))return[{kind:'plain',text}];const keywords=new Set(words[language].split(' ')),tokens=[];let i=0;function push(kind,start){const part=text.slice(start,i),last=tokens.at(-1);if(last?.kind===kind)last.text+=part;else tokens.push({kind,text:part});}
  while(i<text.length){const start=i,c=text[i];if(c==='"'||c==="'"||c==='`'&&language!=='python'){i++;while(i<text.length){if(text[i]==='\\'){i=Math.min(text.length,i+2);continue;}if(text[i++]===c)break;}push('string',start);}
   else if(language==='python'&&c==='#'||language!=='python'&&text.startsWith('//',i)){while(i<text.length&&text[i]!=='\n')i++;push('comment',start);}
   else if(language!=='python'&&text.startsWith('/*',i)){i+=2;let depth=1;while(i<text.length&&depth){if(language==='rust'&&text.startsWith('/*',i)){depth++;i+=2;}else if(text.startsWith('*/',i)){depth--;i+=2;}else i++;}push('comment',start);}
   else if(/[A-Za-z_$]/.test(c)){while(i<text.length&&/[A-Za-z0-9_$]/.test(text[i]))i++;push(keywords.has(text.slice(start,i))?'keyword':'plain',start);}
   else if(/[0-9]/.test(c)){while(i<text.length&&/[0-9A-Fa-f_xXobn.eE]/.test(text[i]))i++;push('number',start);}
   else{i++;push('plain',start);}
  }return tokens;
 }
 if(typeof module==='object')module.exports={tokenize};else root.islandTokenize=tokenize;
})(globalThis);
