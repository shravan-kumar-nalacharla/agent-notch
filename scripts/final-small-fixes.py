from pathlib import Path
root=Path(__file__).resolve().parents[1]
def edit(name,a,b):
 p=root/name;s=p.read_text(encoding='utf-8');assert a in s,name;s=s.replace(a,b);p.write_text(s,encoding='utf-8')
edit('src/intent-router.cjs',"return{intent:compound?'multi_step_action'", "return{exact:!!search&&/as an exact phrase[.!?]*$/i.test(text),intent:compound?'multi_step_action'")
edit('src/commands.cjs',"return{op:'webSearch',query:route.searchQuery}", "return{op:'webSearch',query:route.searchQuery,...(route.exact?{exact:true}:{})}")
edit('src/commands.cjs',"encodeURIComponent(plan.query)", "encodeURIComponent(plan.exact?'\"'+plan.query+'\"':plan.query)")
edit('src/task-coordinator.cjs',"const row={at:new Date().toISOString(),id:task.id", "const now=performance.now(),durationMs=Math.round(now-(task.lastTrace||now));task.lastTrace=now;const row={at:new Date().toISOString(),durationMs,id:task.id")
edit('src/voice-main.cjs',"uid:randomUUID(),jobs:new Map(),pendingAudio", "uid:randomUUID(),pendingAudio")
