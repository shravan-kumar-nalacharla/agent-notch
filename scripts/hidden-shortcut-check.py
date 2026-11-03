from pathlib import Path
root=Path(__file__).resolve().parents[1]
def edit(name,a,b):
 p=root/name;s=p.read_text(encoding='utf-8');assert a in s,name;s=s.replace(a,b);p.write_text(s,encoding='utf-8')
edit('src/microphone-privacy.cjs',"native.ready===false?10000:2000", "!engineReady||native.ready===false?10000:2000")
edit('src/smoke-privacy.cjs',"await js(\"window.island.library('timer:start'", "await js(\"window.island.microphone({muteShortcut:'Control+Alt+F9'})\");const sendKey=()=>require('node:util').promisify(require('node:child_process').execFile)('powershell.exe',['-NoProfile','-NonInteractive','-Command',\"Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('^%{F9}')\"],{windowsHide:true});await sendKey();for(let i=0;i<50&&state().microphone.muted;i++)await sleep(50);assert.equal(state().microphone.muted,false);await sendKey();for(let i=0;i<50&&!state().microphone.muted;i++)await sleep(50);assert.equal(state().microphone.muted,true);assert.equal(win.isVisible(),false);checks.push('Actual Windows shortcut toggles mute both ways while the notch stays hidden');\n await js(\"window.island.library('timer:start'")
