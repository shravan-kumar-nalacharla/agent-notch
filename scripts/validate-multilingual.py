"""Validate the shipped JSON and optionally reconcile the supplied editorial DOCX."""
from pathlib import Path
from collections import Counter
import argparse, json, re, unicodedata, zipfile
import xml.etree.ElementTree as ET

parser=argparse.ArgumentParser()
parser.add_argument('--docx',type=Path)
parser.add_argument('--source',type=Path)
parser.add_argument('--out',type=Path,default=Path('artifacts/0.7.0/multilingual-quote-validation.json'))
args=parser.parse_args()
root=Path(__file__).resolve().parents[1]
data=json.loads((root/'src/assets/Agent_Notch_Quotes_5_Languages.json').read_text(encoding='utf-8'))
languages=['en','hi','te','hinglish','tenglish']
issues=[];coverage=Counter();ids=set();doc_ids=[];paragraphs=[]
if args.docx:
    with zipfile.ZipFile(args.docx) as archive:
        xml=ET.fromstring(archive.read('word/document.xml'))
    ns={'w':'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
    paragraphs=[''.join(t.text or '' for t in p.findall('.//w:t',ns)) for p in xml.findall('.//w:p',ns)]
    doc_ids=[re.match(r'(ANQ-\d{3})\s*/',p).group(1) for p in paragraphs if re.match(r'(ANQ-\d{3})\s*/',p)]
source=args.source.read_text(encoding='utf-8').splitlines() if args.source and args.source.exists() else None
doc_matches=0
for q in data['quotes']:
    if q['id'] in ids:issues.append({'id':q['id'],'severity':'error','issue':'Duplicate ID'})
    ids.add(q['id'])
    assert q['origin']=='user_collection' and q['attribution'] is None and q['source_ref']==f"quotes.txt:L{q['source_line']}"
    assert isinstance(q['requires_opt_in'],bool) and isinstance(q['auto_eligible'],bool)
    for lang in languages:
        text=q['variants'][lang];assert text.strip();letters=[c for c in text if c.isalpha()]
        native=sum(1 for c in letters if ('\u0900'<=c<='\u097f' if lang=='hi' else '\u0c00'<=c<='\u0c7f' if lang=='te' else c.isascii()))
        ratio=native/len(letters) if letters else 0;coverage[lang]+=1
        if ratio<.5:issues.append({'id':q['id'],'language':lang,'severity':'error','issue':'Unexpected script coverage','ratio':ratio})
        if text!=unicodedata.normalize('NFC',text):issues.append({'id':q['id'],'language':lang,'severity':'review','issue':'Source text is not NFC; retained exact editorial wording'})
        if paragraphs:
            if any(p.endswith(text) for p in paragraphs):doc_matches+=1
            else:issues.append({'id':q['id'],'language':lang,'severity':'error','issue':'Variant missing from editorial DOCX'})
    if source and q['source_line']>len(source):issues.append({'id':q['id'],'severity':'error','issue':'Source line outside original collection'})
assert len(ids)==129 and sum(coverage.values())==645
result={'schema':data['schema'],'unique_ids':len(ids),'nonblank_variants':sum(coverage.values()),'script_coverage':dict(coverage),'docx_ids':len(doc_ids),'docx_variants_matched':doc_matches,'docx_ids_match':set(doc_ids)==ids if paragraphs else None,'provenance_metadata':'PASS','original_source_line_verification':'PASS' if source else 'BLOCKED: original quotes.txt was not supplied','opt_in_entries':sum(q['requires_opt_in'] for q in data['quotes']),'automatic_eligible_entries':sum(q['auto_eligible'] for q in data['quotes']),'native_speaker_review':'REQUIRED for all 129 IDs in all 5 languages','issues':issues}
args.out.parent.mkdir(parents=True,exist_ok=True);args.out.write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({k:v for k,v in result.items() if k!='issues'},ensure_ascii=False))
if any(i['severity']=='error' for i in issues) or paragraphs and set(doc_ids)!=ids:raise SystemExit(1)
