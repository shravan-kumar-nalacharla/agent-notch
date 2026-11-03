"""Generate the initial, evidence-based comparison; update rows as phases pass tests."""
from pathlib import Path
import csv, hashlib, subprocess
root=Path(__file__).resolve().parents[2]
up=Path('F:/AgentNotch-reference/crest')
sha=subprocess.check_output(['git','-C',str(up),'rev-parse','HEAD'],text=True).strip()
out=root/'docs/crest-parity'
rows=list(csv.DictReader(Path('C:/Users/shrav/Downloads/Crest_Agent_Notch_64_Feature_Parity_Worksheet.csv').read_text(encoding='utf-8-sig').splitlines()))
mapping='''geometry.cjs|display.rs
desktop-ui.js|notices.rs
geometry.cjs|display.rs
geometry.cjs|display.rs
settings-status.cjs|screen_policy.rs
geometry.cjs|display.rs
island-motion.js|hit_test.rs
widgets-main.cjs;widgets-ui.js|media.rs
widgets-ui.js|equalizer.rs
lyrics.cjs;widgets-main.cjs|lyrics.rs
localization.cjs|lyrics.rs
home-ui.js|lib.rs
widgets-main.cjs|audio.rs
widgets-main.cjs|controls.rs
library.cjs;widgets-ui.js|lib.rs
widgets-ui.js|lib.rs
reminder-engine.cjs;notch-reminders.cjs|notices.rs
productivity-store.cjs;notch-reminders.cjs|lib.rs
library.cjs;widgets-ui.js|lib.rs
renderer.js;main.cjs|lib.rs
library.cjs;widgets-main.cjs|clipboard.rs
library.cjs;widgets-main.cjs|drop.rs
widgets-ui.js|lib.rs
widgets-ui.js|convert.rs
widgets-main.cjs|convert.rs
screen-guide.cjs|capture/shot.rs
main.cjs|capture/record.rs
main.cjs|capture/shot.rs
widgets-ui.js|camera.rs
screen-guide.cjs|capture/find.rs
windows-task.cjs|terminal.rs
windows-apps.cjs|launcher.rs
widgets-main.cjs|github.rs
calendar.cjs;widgets-main.cjs|calendar.rs
calendar.cjs;widgets-ui.js|calendar.rs
providers.cjs;task-coordinator.cjs|ai.rs
providers.cjs|usage.rs
providers.cjs|usage.rs
agents.cjs|usage_logs.rs
widgets-ui.js|system.rs
widgets-ui.js|fps.rs
widgets-main.cjs|system.rs
widgets-main.cjs|controls.rs
integration-secrets.cjs|trading.rs
integration-secrets.cjs|vault.rs
integration-secrets.cjs|vault.rs
windows-reminders.cjs|notices.rs
agents.cjs|notices.rs
agents.cjs;agents-ui.js|notices.rs
desktop-ui.js|notices.rs
desktop-ui.js|notices.rs
widgets-main.cjs|downloads.rs
desktop-ui.js|notices.rs
microphone-privacy.cjs|discord.rs
microphone-ui.js;voice-main.cjs|display.rs
style.css;preferences.js|themes.rs
localization.cjs;languages-ui.js|lib.rs
main.cjs;preload.cjs|plugins.rs
settings-ui.js|lib.rs
settings-ui.js|lib.rs
main.cjs;settings-status.cjs|lib.rs
installation.cjs|lib.rs
integration-secrets.cjs;library.cjs|plugins.rs
microphone-privacy.cjs;productivity-main.cjs|discord.rs'''.splitlines()
missing={2,9,11,13,14,16,23,24,25,26,27,28,31,33,38,39,43,50,52,58,59,60,61}
gated={37:'No supported subscription-token import; use official key-based APIs instead.',41:'Protected-game FPS needs a supported provider and permission; no game injection.',44:'P3 separate broker authorization and read-only security review.',45:'Independent vault security review required; disabled.',46:'Independent TOTP security review required; disabled.'}
pending={47:'NSIS notification-listener capability/permission must be verified; mirroring stays off.',54:'Discord restricted voice RPC scopes need approved credentials; manual Meeting Mode is available.'}
plans={8:'Pin and enumerate media sessions; bind controls and lyrics to the observed source.',10:'Validate metadata, LRC offsets and enhanced cues; preserve truthful offline/error states.',21:'Bounded memory-only clipboard, secret filtering and explicit exclusion rules.',55:'Clearly labelled notch Mute/Unmute, independent Start voice control, real capture indicators.',64:'Apply Gaming/Meeting suppression to notices and HUD as well as voice.',63:'Encrypt calendar feed secrets and stop persisting clipboard contents.',4:'Stable cursor dwell; never relocate an open/recording panel.',5:'Per-app hide/line/normal rules with intentional-open override.',60:'Search actual settings labels, including English aliases and Ctrl+F.'}
tests={1:'compact.test.cjs',7:'compact.test.cjs',8:'widgets.test.cjs',10:'lyrics.test.cjs',15:'library.test.cjs;compact.test.cjs',17:'reminders.test.cjs;notch-reminders.test.cjs',18:'notch-reminders.test.cjs',19:'library.test.cjs',22:'library.test.cjs',34:'calendar.test.cjs',36:'deepseek.test.cjs;task-coordinator.test.cjs',49:'agents.test.cjs',55:'microphone-privacy.test.cjs',57:'multilingual.test.cjs',62:'installation.test.cjs',64:'microphone-privacy.test.cjs'}
fields=['id','crest_capability','crest_evidence','agent_notch_current_status','agent_notch_file_paths','decision','priority','implementation_plan','test_ids','done','blockers']
assert len(rows)==len(mapping)==64
with (out/'CREST_FEATURE_PARITY_MATRIX.csv').open('w',encoding='utf-8',newline='') as f:
 w=csv.DictWriter(f,fieldnames=fields);w.writeheader()
 for i,(row,pair) in enumerate(zip(rows,mapping),1):
  paths,evidence=pair.split('|');status='unsupported' if i in gated else 'not-yet-verified' if i in pending else 'missing' if i in missing else 'existing-good' if i in {18,22} else 'existing-needs-upgrade'
  w.writerow(dict(id=row['feature_id'],crest_capability=row['crest_feature'],crest_evidence=f'https://github.com/andrealo20/crest/blob/{sha}/src-tauri/src/{evidence}',agent_notch_current_status=status,agent_notch_file_paths=';'.join('src/'+p for p in paths.split(';')),decision='Intentional difference: preserve notch-first delivery and idle line' if i in {1,18} else 'Security/API gated' if i in gated or i in pending else 'Independent implementation / extend current service',priority=row['priority'],implementation_plan=plans.get(i,'Implement missing behavior: '+row['crest_documented_behavior']),test_ids=tests.get(i,''),done='baseline verified' if i in {18,22} else 'false',blockers=gated.get(i,pending.get(i,''))))
(out/'REFERENCE_COMMIT.md').write_text(f'# Pinned reference\n\nCrest: https://github.com/andrealo20/crest\n\nCommit: {sha}; package/Cargo version 0.3.3, GPL-3.0-only. Read-only checkout: F:/AgentNotch-reference/crest. No upstream executable, dependency installer or build script was run. No historical audit SHA was supplied, so no claim is made about an exact diff from that audit.\n\nAgent Notch source baseline: 0.13.0; 204 baseline tests pass. Prior source snapshot retained in release/0.13.0. The observed running app was 0.12.0, explaining the absent mute control.\n',encoding='utf-8')
reviewed=['README.md','docs/features.md','docs/notices.md','docs/plugins.md','docs/themes.md','docs/releases/v0.3.3.md','PRIVACY.md','LICENSE','package.json','src-tauri/Cargo.toml','src-tauri/tauri.conf.json','.github/workflows/release.yml','src-tauri/src/media.rs','src-tauri/src/lyrics.rs','src-tauri/src/display.rs','src-tauri/src/screen_policy.rs','src-tauri/src/hit_test.rs','src-tauri/src/plugins.rs','src-tauri/src/terminal.rs','src-tauri/src/notices.rs']
(out/'UPSTREAM_FILE_MAP.md').write_text('# Upstream file map\n\nThe matrix links all 64 capabilities to pinned source. Directly inspected documents and implementation excerpts:\n\n'+'\n'.join('- '+p+' — SHA256 '+hashlib.sha256((up/p).read_bytes()).hexdigest() for p in reviewed)+'\n\nHashes identify the reference, not test coverage. Additional feature-specific code is inspected as each implementation phase begins. No upstream code is imported.\n',encoding='utf-8')
print('Reference pinned; 64 capability decisions recorded.')
