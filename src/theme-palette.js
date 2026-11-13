'use strict';
((root)=>{
 function luminance(rgb){return rgb.map(c=>c<=.04045?c/12.92:((c+.055)/1.055)**2.4).reduce((n,c,i)=>n+c*[.2126,.7152,.0722][i],0);}
 function contrast(a,b){const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);}
 function palette(accent='#d6ed83',lightTheme=false){
  if(!/^#[\da-f]{6}$/i.test(accent))accent='#d6ed83';
  const rgb=accent.slice(1).match(/../g).map(v=>parseInt(v,16)/255),max=Math.max(...rgb),min=Math.min(...rgb),delta=max-min,light=(max+min)/2;
  let hue=0;if(delta){const [r,g,b]=rgb;hue=max===r?((g-b)/delta)%6:max===g?(b-r)/delta+2:(r-g)/delta+4;hue=(hue*60+360)%360;}
  const sat=delta?delta/(1-Math.abs(2*light-1)):0;
  const edge=offset=>`hsl(${Math.round((hue+offset+360)%360)} ${Math.round((delta?Math.max(.24,sat):0)*100)}% ${Math.round(Math.max(.42,Math.min(.64,light))*100)}%)`;
  const background=lightTheme?[241/255,241/255,243/255]:[34/255,35/255,39/255],target=lightTheme?0:1;
  let adjusted=rgb;
  for(let i=1;contrast(adjusted,background)<4.55&&i<=100;i++)adjusted=rgb.map(c=>c+(target-c)*i/100);
  const readable='#'+adjusted.map(c=>Math.round(c*255).toString(16).padStart(2,'0')).join('');
  const ink=contrast(adjusted,[0,0,0])>contrast(adjusted,[1,1,1])?'#000000':'#ffffff';
  return{accent,readable,edgeA:edge(0),edgeB:edge(28),edgeC:edge(-24),onAccent:ink};
 }
 function apply(element,appearance={}){
  const light=appearance.theme==='light'||appearance.theme!=='dark'&&typeof matchMedia==='function'&&matchMedia('(prefers-color-scheme:light)').matches;
  const colors=palette(appearance.accentColor,light),set=(k,v)=>element.style.setProperty(k,v);
  for(const [k,v] of Object.entries({'--selected-accent':colors.accent,'--user-accent':colors.readable,'--accent':colors.readable,'--accent-ink':colors.onAccent,'--on-user-accent':colors.onAccent,'--edge-a':colors.edgeA,'--edge-b':colors.edgeB,'--edge-c':colors.edgeC}))set(k,v);
  set('--user-font',({system:'"Segoe UI Variable Text","Segoe UI",sans-serif',arial:'Arial,sans-serif',serif:'Georgia,serif',mono:'"Cascadia Code",Consolas,monospace'})[appearance.uiFont]||'"Segoe UI",sans-serif');
  element.classList.toggle('theme-light',light);element.dataset.motion=appearance.motion||'standard';
  const surfaces=light?{'--surface':'#fafafa','--panel':'#f1f1f3','--panel-2':'#e5e5e8','--text':'#17171b','--muted':'#6b6b74','--line':'#0000000b'}:{'--surface':'#08090b','--panel':'#141518','--panel-2':'#222327','--text':'#f8f8fa','--muted':'#a0a0a6','--line':'#ffffff0a'};
  for(const [k,v] of Object.entries(surfaces))set(k,v);
  set('--pulse-surface',surfaces['--surface']);set('--pulse-card',surfaces['--panel']);set('--pulse-raised',surfaces['--panel-2']);set('--pulse-ink',surfaces['--text']);set('--pulse-dim',surfaces['--muted']);
  if(element.classList.contains('file-studio'))for(const [k,v] of Object.entries(light?{'--bg':'#fafafa','--panel':'#f1f1f3','--panel-2':'#e5e5e8','--ink':'#17171b','--muted':'#6b6b74','--line':'#0000000b'}:{'--bg':'#08090b','--panel':'#141518','--panel-2':'#222327','--ink':'#f8f8fa','--muted':'#a0a0a6','--line':'#ffffff0a'}))set(k,v);
  return colors;
 }
 const api={palette,apply,contrast};if(typeof module!=='undefined')module.exports=api;else root.NotchTheme=api;
})(globalThis);

