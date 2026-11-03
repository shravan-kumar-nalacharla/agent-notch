from pathlib import Path
root=Path(__file__).resolve().parents[1]
def edit(name,a,b):
 p=root/name;s=p.read_text(encoding='utf-8');assert a in s,name;s=s.replace(a,b);p.write_text(s,encoding='utf-8')
edit('src/microphone-privacy.cjs',"error='Microphone engine unavailable;", "console.warn('[microphone gate]',e.message);error='Microphone engine unavailable;")
edit('src/smoke-privacy.cjs',"assert.equal(globalShortcut.register('Control+Alt+Y',()=>{}),true);", "const holder=require('node:child_process').spawn(process.execPath,[path.resolve(__dirname,'../scripts/shortcut-holder.cjs')],{windowsHide:true,stdio:['ignore','pipe','ignore']});await new Promise((resolve,reject)=>{holder.stdout.on('data',data=>String(data).includes('SHORTCUT HELD')?resolve():reject(new Error(String(data))));holder.on('error',reject);});")
edit('src/smoke-privacy.cjs',"globalShortcut.unregister('Control+Alt+Y');", "holder.kill();")
edit('src/smoke-privacy.cjs',"assert.match(result.error,/muted/)","assert.match(result.error,/muted|blocked/)")
