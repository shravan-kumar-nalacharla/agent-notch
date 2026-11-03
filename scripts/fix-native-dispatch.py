from pathlib import Path
root=Path(__file__).resolve().parents[1]
def edit(name,a,b):
 p=root/name;s=p.read_text(encoding='utf-8');assert a in s,name;s=s.replace(a,b);p.write_text(s,encoding='utf-8')
edit('src/native.cjs',"try{this.receive(JSON.parse(line));}catch{this.emit('diagnostic','Native engine returned invalid JSON.');}","let parsed;try{parsed=JSON.parse(line);}catch{this.emit('diagnostic','Native engine returned invalid JSON.');continue;}try{this.receive(parsed);}catch(error){this.emit('diagnostic','Native event listener failed: '+error.message);}")
edit('src/smoke-privacy.cjs',"path.resolve(__dirname,'../scripts/shortcut-holder.cjs')", "path.resolve(__dirname,'smoke-shortcut-holder.cjs')")
edit('src/smoke-privacy.cjs',"holder.stdout.on('data',data=>String(data).includes('SHORTCUT HELD')?resolve():reject(new Error(String(data))));", "let output='';const timer=setTimeout(()=>reject(new Error('Shortcut holder timed out')),10000);holder.stdout.on('data',data=>{output+=String(data);if(output.includes('SHORTCUT HELD')){clearTimeout(timer);resolve();}else if(output.includes('SHORTCUT FAILED')){clearTimeout(timer);reject(new Error(output));}});")
p=root/'src/smoke-shortcut-holder.cjs';p.write_text((root/'scripts/shortcut-holder.cjs').read_text(encoding='utf-8'),encoding='utf-8')
