'use strict';
const{spawnSync}=require('node:child_process');const fs=require('node:fs');const path=require('node:path');
const root=path.resolve(__dirname,'..');const local=path.join(root,'tools','dotnet','dotnet.exe');const exe=fs.existsSync(local)?local:'dotnet';
const result=spawnSync(exe,['publish',path.join(root,'native','IslandNative','IslandNative.csproj'),'-c','Release','-r','win-x64','--self-contained','true','-p:PublishSingleFile=true','-p:EnableCompressionInSingleFile=true','-o',path.join(root,'native','bin')],{cwd:root,windowsHide:true,shell:false,stdio:'inherit',env:{...process.env,DOTNET_CLI_TELEMETRY_OPTOUT:'1'}});
if(result.error){console.error('Install the .NET 8 SDK to build the Windows engine.');process.exit(1);}if(result.status!==0)process.exit(result.status||1);
// The single-file executable still needs the WPF native dependencies beside it.
for(const name of ['D3DCompiler_47_cor3.dll','PenImc_cor3.dll','PresentationNative_cor3.dll','vcruntime140_cor3.dll','wpfgfx_cor3.dll'])fs.copyFileSync(path.join(root,'native','IslandNative','bin','Release','net8.0-windows10.0.19041.0','win-x64',name),path.join(root,'native','bin',name));
fs.copyFileSync(path.join(root,'native','vendor','VoiceFlow','LICENSE'),path.join(root,'native','bin','VOICEFLOW-LICENSE.txt'));
