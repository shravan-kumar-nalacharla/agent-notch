from pathlib import Path
root=Path(__file__).resolve().parents[1]
def edit(name,a,b):
 p=root/name;s=p.read_text(encoding='utf-8');assert a in s,name+': '+a[:60];s=s.replace(a,b);p.write_text(s,encoding='utf-8')
edit('src/main.cjs',"const previous=state;state=next;", "next.microphone=state.microphone;const previous=state;state=next;")
edit('src/microphone-privacy.cjs',"error='',queue=Promise.resolve()", "error='',engineReady=false,queue=Promise.resolve()")
edit('src/microphone-privacy.cjs',"return{...p,blocked:!!blocked,reason:", "return{...p,policyBlocked:!!blocked,blocked:!!blocked||!!error||!engineReady,reason:")
edit('src/microphone-privacy.cjs',"function apply(){const current=++epoch;abort();", "function apply(){const current=++epoch;error='';abort();")
edit('src/microphone-privacy.cjs',"{blocked:s.blocked,mode:s.mode,epoch:current}","{blocked:s.policyBlocked,mode:s.mode,epoch:current}")
edit('src/microphone-privacy.cjs',"error='';await configure(view());", "error='';engineReady=true;await configure(view());")
edit('src/microphone-privacy.cjs',"native.child?.kill();", "engineReady=false;native.child?.kill();")
edit('src/microphone-privacy.cjs',"return{view,set,apply,assertAllowed", "return{view,set,apply,unavailable(){engineReady=false;abort();emit('microphone:state',view());changed();},assertAllowed")
edit('src/main.cjs',"native.on('ready',()=>{if(!quitting)privacy.apply()", "native.on('stopped',()=>{if(!quitting)privacy.unavailable();});\n    native.on('ready',()=>{if(!quitting)privacy.apply()")
edit('tests/microphone-privacy.test.cjs',"native.emit('event',{type:'voice.begin',id:'one'", "await privacy.apply();native.emit('event',{type:'voice.begin',id:'one'")
edit('tests/gemini-live.test.cjs',"filter(e=>e.phase==='liveAudio').length,1", "filter(e=>e.phase==='liveAudio').length,0")
edit('src/smoke-privacy.cjs',"assert.equal(globalShortcut.isRegistered('Control+Alt+M'),true);checks.push('Default mute shortcut registered with Windows while island hidden');", "const defaultAvailable=globalShortcut.isRegistered('Control+Alt+M');if(!defaultAvailable){assert.equal(s.value.shortcutStatus.mute.ok,false);await js(\"window.island.microphone({muteShortcut:'Control+Alt+F9'})\");assert.equal(globalShortcut.isRegistered('Control+Alt+F9'),true);}const available=defaultAvailable?'Control+Alt+M':'Control+Alt+F9';checks.push(defaultAvailable?'Default mute shortcut registered with Windows while island hidden':'Default Ctrl+Alt+M conflict reported; custom shortcut registers while hidden');")
edit('src/smoke-privacy.cjs',"reply=await js(\"window.island.microphone({muteShortcut:'Control+Alt+M'})\");", "reply=await js('window.island.microphone({muteShortcut:'+JSON.stringify(available)+'})');")
