'use strict';
const{NativeClient}=require('../src/native.cjs'),fs=require('node:fs'),path=require('node:path');
const out='F:\\AgentNotch-builds\\0.6.0\\evidence',native=new NativeClient({executable:path.resolve('native/bin/IslandNative.exe')});
(async()=>{const result={};try{
  result.wake=await native.request('wake.status',{},20000);result.screen=await native.request('screen.probe');if(!result.screen.ready)throw new Error('Native Windows OCR not ready');
  const observation=await native.request('screen.observe',{},30000);result.observation={width:observation.width,height:observation.height,ocrItems:observation.items.filter(x=>x.source==='ocr').length,uiaItems:observation.items.filter(x=>x.source==='uia').length,warnings:observation.warnings,imageBytes:observation.image.length};if(!result.observation.ocrItems)throw new Error('Native OCR returned no visible lines');
  const sample=path.join(out,'wake-phrase-16k.wav');if(fs.existsSync(sample)){result.syntheticWake=await native.request('wake.test',{audio:fs.readFileSync(sample).toString('base64'),name:'Cutie'},15000);if(!result.syntheticWake.recognized)throw new Error('Synthetic wake phrase did not pass the recognizer threshold');}
  else{result.syntheticWake=await native.request('wake.test',{audio:'',name:'Cutie'},15000);if(!result.syntheticWake.recognized)throw new Error('Synthetic wake phrase did not pass the recognizer threshold');}
  result.status='PASS';
}catch(e){result.status='FAILED';result.error=e.message;process.exitCode=1;}finally{fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'native-experience.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));native.close();}})();
