from pathlib import Path
root=Path(__file__).resolve().parents[1]
def edit(name,a,b):
 p=root/name;s=p.read_text(encoding='utf-8');assert a in s,name;s=s.replace(a,b);p.write_text(s,encoding='utf-8')
edit('native/IslandNative/Privacy.cs',"volatile bool Disposed;public volatile bool Held;", "volatile bool Disposed;bool Swallowed;public volatile bool Held;")
edit('native/IslandNative/Privacy.cs',"if(Disposed||(flags&0x10)!=0)return false;", "if(Disposed||((flags&0x10)!=0&&extra==InputSender.Marker))return false;")
edit('native/IslandNative/Privacy.cs',"if(vk==Key){if(down&&!Held&&Modifiers()){Held=true;", "if(vk==Key){if(!down&&Swallowed){Swallowed=false;if(Held)Release();return true;}if(down&&Swallowed)return true;if(down&&!Held&&Modifiers()){Held=true;Swallowed=true;")
edit('native/IslandNative/Privacy.cs',"void Release(){Held=false;", "public void CheckHeld(){if(Held&&((GetAsyncKeyState(Key)&0x8000)==0||!Modifiers()))Release();}\n        void Release(){Held=false;")
edit('native/IslandNative/Program.cs',"if(PrivacyBlocked&&Capture!=null)", "Ptt?.CheckHeld();\n            if(PrivacyBlocked&&Capture!=null)")
edit('src/settings-ui.js',"['companionName','wakeEnabled','wakeCheck'", "['companionName','wakeCheck'")
edit('src/settings-ui.js',"voice.replaceChildren(intro,typing", "$('wakeEnabled').closest('label').remove();\n  voice.replaceChildren(intro,typing")
