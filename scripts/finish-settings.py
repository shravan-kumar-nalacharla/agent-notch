from pathlib import Path
root=Path(__file__).resolve().parents[1]
def edit(name,a,b):
 p=root/name;s=p.read_text(encoding='utf-8');assert a in s,name;s=s.replace(a,b);p.write_text(s,encoding='utf-8')
edit('src/settings-ui.js',"show(nav.querySelector('.active')?.dataset.settingsTarget||'providerGroup');", "show(({voice:'voiceGroup',providers:'providerGroup',quotes:'quietGroup'})[new URLSearchParams(location.search).get('pane')]||nav.querySelector('.active')?.dataset.settingsTarget||'providerGroup');")
edit('src/main.cjs',"throw new Error('Untrusted window.');", "return{ok:false,error:'Untrusted window.'};")
edit('src/main.cjs',"taskCoordinator?.close();clearInterval(callTimer);", "taskCoordinator?.close().catch(()=>{});clearInterval(callTimer);")
edit('src/smoke-privacy.cjs',"checks.push('Settings show mute switch and all three listening modes');", "assert.equal(await settings.webContents.executeJavaScript(\"document.getElementById('voiceGroup').hidden\"),false);checks.push('Settings open directly at the visible microphone switches and three listening modes');")
