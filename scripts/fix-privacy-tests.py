from pathlib import Path
p=Path(__file__).resolve().parents[1]/'tests/microphone-privacy.test.cjs'
s=p.read_text(encoding='utf-8').replace('languages:{cloudAudioConsent:true}',"languages:{...require('../src/localization.cjs').DEFAULTS,cloudAudioConsent:true}")
p.write_text(s,encoding='utf-8')
