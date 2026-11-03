"""Decode every reference frame, measure the top-center silhouette, and build a review index."""
import cv2, csv, json
from pathlib import Path
from PIL import Image, ImageDraw
cv2.setNumThreads(1)
out=Path('F:/AgentNotch-builds/animation-analysis');out.mkdir(parents=True,exist_ok=True)
(out/'frames').mkdir(exist_ok=True)
cap=cv2.VideoCapture('C:/Users/shrav/Downloads/animation guide.mp4')
fps=cap.get(cv2.CAP_PROP_FPS);rows=[];previous=None
while True:
    ok,frame=cap.read()
    if not ok:break
    n=len(rows);roi=frame[:520,100:1820];mask=(roi.max(axis=2)<22).astype('uint8')
    _,labels,stats,_=cv2.connectedComponentsWithStats(mask,8)
    label=labels[2,860];x,y,w,h,area=map(int,stats[label]) if label else (0,0,0,0,0)
    delta=float(cv2.absdiff(roi,previous).mean()) if previous is not None else 0
    rows.append(dict(frame=n,seconds=round(n/fps,6),x=x+100,y=y,width=w,height=h,area=area,delta=round(delta,4)))
    cv2.imwrite(str(out/'frames'/f'{n:04}.jpg'),cv2.resize(frame[:520,180:1740],(390,130)),[cv2.IMWRITE_JPEG_QUALITY,78])
    previous=roi
cap.release()
with (out/'frames.csv').open('w',newline='') as f:
    writer=csv.DictWriter(f,fieldnames=list(rows[0]));writer.writeheader();writer.writerows(rows)
changes=[r for i,r in enumerate(rows) if i and (abs(r['width']-rows[i-1]['width'])>2 or abs(r['height']-rows[i-1]['height'])>2)]
groups=[]
for r in changes:
    if not groups or r['frame']-groups[-1][-1]['frame']>12:groups.append([])
    groups[-1].append(r)
summary=dict(frames=len(rows),fps=fps,duration=len(rows)/fps,geometryChanges=[dict(start=g[0]['frame'],end=g[-1]['frame'],seconds=[g[0]['seconds'],g[-1]['seconds']],minWidth=min(r['width'] for r in g),maxWidth=max(r['width'] for r in g),minHeight=min(r['height'] for r in g),maxHeight=max(r['height'] for r in g)) for g in groups])
(out/'summary.json').write_text(json.dumps(summary,indent=2))
for first in range(0,len(rows),80):
    sheet=Image.new('RGB',(8*390,10*150),'#17191d');draw=ImageDraw.Draw(sheet)
    for j,r in enumerate(rows[first:first+80]):
        x=(j%8)*390;y=(j//8)*150;sheet.paste(Image.open(out/'frames'/f"{r['frame']:04}.jpg"),(x,y));draw.text((x+4,y+132),f"frame {r['frame']} / {r['seconds']:.3f}s",fill='white')
    sheet.save(out/f'contact-{first//80:02}.jpg',quality=85)
(out/'index.html').write_text('''<!doctype html><meta charset="utf-8"><title>All 2672 reference frames</title><style>body{background:#17191d;color:white;font:16px system-ui}img{width:100%;max-width:1170px;display:block}input{width:90%}</style><h1>Frame-by-frame reference</h1><input id="frame" type="range" min="0" max="2671" value="0"><output id="label"></output><img id="image"><script>const f=document.getElementById('frame');function show(){label.textContent='Frame '+f.value+' — '+(f.value/60).toFixed(3)+' seconds';image.src='frames/'+f.value.padStart(4,'0')+'.jpg'}f.oninput=show;onkeydown=e=>{if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();f.value=+f.value+(e.key==='ArrowRight'?1:-1);show()}};show()</script>''')
print(json.dumps(summary))
