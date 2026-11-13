'use strict';
((root)=>{
 function palette(accent='#d6ed83'){
  if(!/^#[\da-f]{6}$/i.test(accent))accent='#d6ed83';
  const rgb=accent.slice(1).match(/../g).map(v=>parseInt(v,16)/255),max=Math.max(...rgb),min=Math.min(...rgb),delta=max-min,light=(max+min)/2;
  let hue=0;if(delta){const [r,g,b]=rgb;hue=max===r?((g-b)/delta)%6:max===g?(b-r)/delta+2:(r-g)/delta+4;hue=(hue*60+360)%360;}
  const sat=delta?delta/(1-Math.abs(2*light-1)):0;
  const edge=offset=>`hsl(${Math.round((hue+offset+360)%360)} ${Math.round(Math.max(.24,sat)*100)}% ${Math.round(Math.max(.42,Math.min(.64,light))*100)}%)`;
  return{accent,edgeA:edge(0),edgeB:edge(28),edgeC:edge(-24),onAccent:rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722>.57?'#17200c':'#ffffff'};
 }
 function apply(element,appearance={}){
  const colors=palette(appearance.accentColor),set=(k,v)=>element.style.setProperty(k,v);
  for(const [k,v] of Object.entries({'--user-accent':colors.accent,'--accent':colors.accent,'--accent-ink':colors.onAccent,'--on-user-accent':colors.onAccent,'--edge-a':colors.edgeA,'--edge-b':colors.edgeB,'--edge-c':colors.edgeC}))set(k,v);
  set('--user-font',({system:'"Segoe UI Variable Text","Segoe UI",sans-serif',arial:'Arial,sans-serif',serif:'Georgia,serif',mono:'"Cascadia Code",Consolas,monospace'})[appearance.uiFont]||'"Segoe UI",sans-serif');
  const light=appearance.theme==='light'||appearance.theme!=='dark'&&typeof matchMedia==='function'&&matchMedia('(prefers-color-scheme:light)').matches;
  element.classList.toggle('theme-light',light);element.dataset.motion=appearance.motion||'standard';
  if(element.classList.contains('file-studio'))for(const [k,v] of Object.entries(light?{'--bg':'#fafafa','--panel':'#f1f1f3','--panel-2':'#e5e5e8','--ink':'#17171b','--muted':'#6b6b74','--line':'#0000000b'}:{'--bg':'#08090b','--panel':'#141518','--panel-2':'#222327','--ink':'#f8f8fa','--muted':'#a0a0a6','--line':'#ffffff0a'}))set(k,v);
  return colors;
 }
 const api={palette,apply};if(typeof module!=='undefined')module.exports=api;else root.NotchTheme=api;
})(globalThis);
