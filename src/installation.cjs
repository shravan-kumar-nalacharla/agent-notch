'use strict';
const fs=require('node:fs'),path=require('node:path'),{execFile}=require('node:child_process');
function validateInstallation(entry,exe){
  if(!entry)return{installed:false,message:'No registered installation was found. Run the installer to enable Windows uninstall.'};
  const match=/^"([^"]+\.exe)"(.*)$/i.exec(entry.UninstallString||'');
  const directory=path.resolve(path.dirname(exe));
  if(!match||path.resolve(path.dirname(match[1])).toLowerCase()!==directory.toLowerCase()||!/^Uninstall[^\\/]*\.exe$/i.test(path.basename(match[1]))||!fs.existsSync(match[1]))return{installed:false,message:'The registered uninstaller is missing or belongs to another installation.'};
  const args=match[2].trim().split(/\s+/).filter(Boolean);if(args.some(arg=>!['/allusers','/currentuser'].includes(arg.toLowerCase())))return{installed:false,message:'The registered uninstall command has unsupported arguments.'};
  return{installed:true,version:String(entry.DisplayVersion||''),location:directory,uninstaller:match[1],args};
}
async function getInstallation(exe){
  if(process.platform!=='win32')return{installed:false,message:'Windows installation only.'};
  const script=`$roots=@('HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall','HKLM:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall','HKLM:\\Software\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall');$directory=[IO.Path]::GetDirectoryName($env:NOTCH_INSTALL_EXE);$found=foreach($root in $roots){Get-ChildItem -LiteralPath $root -ErrorAction SilentlyContinue|ForEach-Object{Get-ItemProperty -LiteralPath $_.PSPath -ErrorAction SilentlyContinue}|Where-Object{$_.DisplayName -like 'Agent Notch*' -and (($_.InstallLocation -and $_.InstallLocation.TrimEnd('\\') -eq $directory) -or $_.UninstallString -like ('"'+$directory+'\\*'))}|Select-Object DisplayVersion,UninstallString};@($found)|ConvertTo-Json -Compress`;
  const entries=await new Promise((resolve,reject)=>execFile('powershell.exe',['-NoProfile','-NonInteractive','-Command',script],{windowsHide:true,timeout:10000,env:{...process.env,NOTCH_INSTALL_EXE:exe}},(error,out)=>{if(error)return reject(new Error('Windows installation registration could not be read.'));try{const parsed=out.trim()?JSON.parse(out):[];resolve(Array.isArray(parsed)?parsed:[parsed]);}catch{reject(new Error('Windows returned invalid installation metadata.'));}}));
  return validateInstallation(entries.find(Boolean),exe);
}
module.exports={getInstallation,validateInstallation};
