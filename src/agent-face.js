'use strict';
(function(root){
  const shapes=['round','organic','squircle','droplet','hexagon'];
  const expressions=['idle','happy','sleepy','curious','love'];
  const hash=value=>{let h=2166136261;for(const ch of String(value||'Agent Notch')){h^=ch.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;};
  function shapePath(shape){
    if(shape==='round')return '<circle cx="50" cy="52" r="38"/>';
    if(shape==='squircle')return '<rect x="12" y="14" width="76" height="76" rx="24"/>';
    if(shape==='droplet')return '<path d="M50 8C59 23 82 37 82 59a32 32 0 0 1-64 0C18 37 41 23 50 8Z"/>';
    if(shape==='hexagon')return '<path d="M50 8 84 27v38L50 92 16 65V27Z"/>';
    return '<path d="M50 9c14 0 15 9 26 15 13 7 13 18 9 29-4 12-4 23-18 27-9 3-12 8-21 8s-12-5-21-8C11 76 11 65 7 53c-4-11-4-22 9-29C27 18 36 9 50 9Z"/>';
  }
  function eyes(expression){
    if(expression==='sleepy')return '<path d="M30 51h12M58 51h12" stroke="#10211e" stroke-width="3" stroke-linecap="round"/><path d="M40 70c6 4 14 4 20 0" stroke="#10211e" stroke-width="3" fill="none" stroke-linecap="round"/>';
    if(expression==='happy')return '<path d="M29 54c4-7 10-7 14 0M57 54c4-7 10-7 14 0" stroke="#10211e" stroke-width="3.4" fill="none" stroke-linecap="round"/><path d="M40 68c5 5 15 5 20 0" stroke="#10211e" stroke-width="3" fill="none" stroke-linecap="round"/>';
    if(expression==='love')return '<path d="M38 56c-5-6-12-2-12 4 0 7 12 12 12 12s12-5 12-12c0-6-7-10-12-4Z" fill="#10211e"/><path d="M62 56c-5-6-12-2-12 4 0 7 12 12 12 12s12-5 12-12c0-6-7-10-12-4Z" fill="#10211e"/>';
    if(expression==='curious')return '<circle cx="36" cy="53" r="5" fill="#10211e"/><circle cx="64" cy="53" r="3.6" fill="#10211e"/><path d="M42 70c5 2 11 2 16 0" stroke="#10211e" stroke-width="2.6" fill="none" stroke-linecap="round"/>';
    return '<circle cx="36" cy="53" r="5" fill="#10211e"/><circle cx="64" cy="53" r="5" fill="#10211e"/><path d="M41 69c5 4 13 4 18 0" stroke="#10211e" stroke-width="2.8" fill="none" stroke-linecap="round"/>';
  }
  function svg({seed='Agent Notch',shape='organic',hue=165,expression='idle',size=64}={}){
    const h=hash(seed),safeShape=shapes.includes(shape)?shape:shapes[h%shapes.length],safeExpression=expressions.includes(expression)?expression:'idle';
    const safeHue=Number.isFinite(+hue)?Math.max(0,Math.min(360,+hue)):165;
    const light=`hsl(${safeHue} 52% 68%)`,deep=`hsl(${safeHue} 48% 42%)`,glow=`hsl(${safeHue} 70% 82%)`;
    const tilt=((h%9)-4)*.7;
    return `<svg class="agent-face-svg" viewBox="0 0 100 100" width="${size}" height="${size}" role="img" aria-label="Agent face"><defs><linearGradient id="af${h}" x1="0" y1="0" x2="0" y2="1"><stop stop-color="${light}"/><stop offset="1" stop-color="${deep}"/></linearGradient></defs><g transform="rotate(${tilt} 50 52)">${shapePath(safeShape).replace('/>',` fill="url(#af${h})" stroke="${deep}" stroke-width="1.5"/>`)}<ellipse cx="35" cy="32" rx="17" ry="10" fill="${glow}" opacity=".42"/><g>${eyes(safeExpression)}</g></g></svg>`;
  }
  function apply(container,options){
    if(!container)return;
    let slot=container.querySelector('.agent-face-slot');
    if(!slot){slot=document.createElement('span');slot.className='agent-face-slot';container.prepend(slot);}
    slot.innerHTML=options?.enabled===false?'':svg(options);
  }
  const api={svg,apply,shapes,expressions,hash};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.AgentFace=api;
})(globalThis);
