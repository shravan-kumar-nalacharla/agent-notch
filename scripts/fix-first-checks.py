from pathlib import Path
root=Path(__file__).resolve().parents[1]
def edit(name,a,b):
 p=root/name;s=p.read_text(encoding='utf-8');assert a in s,name;s=s.replace(a,b);p.write_text(s,encoding='utf-8')
edit('tests/microphone-privacy.test.cjs',"responses.some(x=>x.phase==='answer')","responses.some(x=>x?.phase==='answer')")
edit('src/microphone-privacy.cjs',"mode:s.mode,epoch:current},2000)","mode:s.mode,epoch:current},native.ready===false?10000:2000)")
edit('src/browser-controller.cjs',"if(context){if(!page||page.isClosed())page=await context.newPage();return page;}","if(context&&(!page||page.isClosed())){await context.close().catch(()=>{});context=null;}if(context)return page;")
edit('src/renderer.js',"stream = await navigator.mediaDevices.getUserMedia({ audio: true });","stream = await navigator.mediaDevices.getUserMedia({ audio: true });\n    const permission=await window.island.microphoneState();if(!permission.ok||permission.value.blocked||permission.value.mode==='ptt'){stream.getTracks().forEach(track=>track.stop());throw new Error('Microphone is muted or requires Push-to-Talk.');}")
edit('src/main.cjs',"await privacy.set(next);if(changed)","if(changed)shortcutStatus.ptt={accelerator:next.pttShortcut,ok:false};await privacy.set(next);if(changed)")
edit('src/intent-router.cjs',"open|go to|click|navigate|select|fill|type|summari[sz]e", "open|go to|click|navigate|select|fill|type|copy|move|rename|close|launch|summari[sz]e")
