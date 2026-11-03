from pathlib import Path
p=Path(__file__).resolve().parents[1]/'src/smoke-privacy.cjs';s=p.read_text(encoding='utf-8').replace("assert.equal(reply.ok,true);", "assert.equal(reply.ok,true,reply.error);");p.write_text(s,encoding='utf-8')
