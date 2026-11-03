from pathlib import Path
root=Path(__file__).resolve().parents[1]
p=root/'scripts/check-ptt.cjs';s=p.read_text(encoding='utf-8').replace("native.on('event',e=>events.push(e.type));", "native.on('event',e=>{events.push(e.type);if(e.type==='error')console.log('PTT NATIVE',e.error);});");p.write_text(s,encoding='utf-8')
