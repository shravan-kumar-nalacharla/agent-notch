"""Create the reviewable source snapshot and patch for the multilingual change."""
from pathlib import Path
import argparse, difflib, zipfile

parser=argparse.ArgumentParser()
parser.add_argument('--baseline',type=Path,required=True)
args=parser.parse_args()
root=Path(__file__).resolve().parents[1]
out=root/'release/0.7.0';out.mkdir(parents=True,exist_ok=True)
files=[]
for folder in ['src','tests','scripts','docs','installer','native']:
    files.extend(p for p in (root/folder).rglob('*') if p.is_file() and not any(part in {'bin','obj','__pycache__'} for part in p.relative_to(root).parts))
files.extend(root/name for name in ['package.json','package-lock.json','README.md','THIRD-PARTY-NOTICES.md'])
with zipfile.ZipFile(out/'Agent-Notch-0.7.0-source.zip','w',zipfile.ZIP_DEFLATED) as archive:
    for file in sorted(files):archive.write(file,file.relative_to(root))
changes=[]
for file in sorted(files):
    rel=file.relative_to(root)
    if file.suffix.lower() in {'.png','.ico','.jpg','.dll','.exe'}:continue
    baseline=args.baseline/rel
    if baseline.is_file():old=baseline.read_text(encoding='utf-8')
    elif rel.as_posix()=='native/IslandNative/Desktop.cs':
        old=file.read_text(encoding='utf-8').replace('    [DllImport("shell32.dll")]static extern int SHQueryUserNotificationState(out int state);\n','')
        old=old.replace('        int? notificationState=null;try{if(SHQueryUserNotificationState(out var state)==0)notificationState=state;}catch{}\n        // Shell notification state is a supplemental veto, not authoritative Windows Focus Assist detection.\n','')
        old=old.replace('fullscreen,meetingRecording=MeetingMic!=null,notificationState,foreground=LastExternal.ToInt64().ToString(),app=', 'fullscreen,app=')
    elif rel.as_posix()=='native/IslandNative/Program.cs':
        old=file.read_text(encoding='utf-8').replace('    static bool ChatOnSilence = true;\n    static double SpeechSensitivity = .012;\n','').replace('if(SessionKind=="chat"&&ChatOnSilence){if(Capture.CurrentLevel()>SpeechSensitivity)', 'if(SessionKind=="chat"){if(Capture.CurrentLevel()>.012)').replace('ChatOnSilence=B(v,"chatOnSilence",true);SpeechSensitivity=Math.Clamp(N(v,"sensitivity",.012),.001,.1);','')
    elif rel.as_posix()=='scripts/prepare-package.cjs':
        old=file.read_text(encoding='utf-8').replace("require('../src/quotes.cjs').validateCatalog(require('../src/quotes.cjs').catalog);\n",'')
    elif rel.as_posix()=='README.md':
        old=file.read_text(encoding='utf-8');start=old.index('0.7.0 adds');end=old.index('\n\n',start);old=old[:start]+old[end+2:];old=old.replace('Agent Notch 0.7.0 is a compact','Agent Notch 0.6.2 is a compact')
    elif rel.parts[0] in {'src','tests'} or rel.name in {'0.7.0-MULTILINGUAL.md','validate-multilingual.py','package-source.py','capture-localization.cjs'}:old=''
    else:continue
    try:new=file.read_text(encoding='utf-8')
    except UnicodeDecodeError:continue
    if old!=new:
        changes.extend(difflib.unified_diff(old.splitlines(keepends=True),new.splitlines(keepends=True),fromfile='a/'+rel.as_posix() if old else '/dev/null',tofile='b/'+rel.as_posix()))
(out/'source-changes.patch').write_text(''.join(changes),encoding='utf-8')
print(f'Source snapshot: {len(files)} files; patch: {len(changes)} lines')
