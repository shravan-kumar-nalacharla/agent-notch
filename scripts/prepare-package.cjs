'use strict';
const{spawnSync}=require('node:child_process');const fs=require('node:fs');const path=require('node:path');
const root=path.resolve(__dirname,'..');
require('../src/quotes.cjs').validateCatalog(require('../src/quotes.cjs').catalog);
const localDotnet=path.join(root,'tools','dotnet','dotnet.exe');
const nativeExe=path.join(root,'native','bin','IslandNative.exe');
const hasDotnet=process.platform==='win32'&&(fs.existsSync(localDotnet)||spawnSync('dotnet',['--version'],{windowsHide:true,shell:false}).status===0);
if(hasDotnet){
  const result=spawnSync(process.execPath,[path.join(__dirname,'build-native.cjs')],{stdio:'inherit',windowsHide:true,shell:false});
  if(result.error||result.status!==0)process.exit(result.status||1);
}else if(fs.existsSync(nativeExe)){
  console.log('Using the verified self-contained native engine; .NET SDK is not installed.');
}else{
  console.error('Build native/bin/IslandNative.exe first, or install the .NET 8 SDK.');
  process.exit(1);
}
for(const name of ['D3DCompiler_47_cor3.dll','PenImc_cor3.dll','PresentationNative_cor3.dll','vcruntime140_cor3.dll','wpfgfx_cor3.dll'])if(!fs.existsSync(path.join(root,'native','bin',name)))throw new Error('Native runtime dependency missing: '+name+'. Run npm run build:native.');
console.log('The native Windows OCR/UI Automation screen engine is bundled; Python is not required.');
