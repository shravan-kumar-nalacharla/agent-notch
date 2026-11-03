'use strict';
((root)=>{
  // Bloom App.tsx (GPL-3.0-only) spring presets, adapted to the existing DOM/WAAPI surface.
  const PRESETS={width:{stiffness:400,damping:31},height:{stiffness:450,damping:29},y:{stiffness:550,damping:45,mass:.8}};
  function spring(t,{stiffness:k,damping:c,mass:m=1}){
    const w=Math.sqrt(k/m),z=c/(2*Math.sqrt(k*m));
    if(z<1){const d=w*Math.sqrt(1-z*z);return 1-Math.exp(-z*w*t)*(Math.cos(d*t)+z*w/d*Math.sin(d*t));}
    if(Math.abs(z-1)<.0001)return 1-Math.exp(-w*t)*(1+w*t);
    const a=-w*(z-Math.sqrt(z*z-1)),b=-w*(z+Math.sqrt(z*z-1));return 1-(b*Math.exp(a*t)-a*Math.exp(b*t))/(b-a);
  }
  function frames(from,to,duration=700){return Array.from({length:61},(_,i)=>{const t=i/60,d=t*duration/1000,lerp=(a,b,p)=>a+(b-a)*p;return{offset:t,width:lerp(from.width,to.width,i===60?1:spring(d,PRESETS.width))+'px',height:lerp(from.height,to.height,i===60?1:spring(d,PRESETS.height))+'px',transform:`translateX(-50%) translateY(${lerp(from.y,to.y,i===60?1:spring(d,PRESETS.y))}px) scale(${lerp(from.scale,to.scale,Math.min(1,t*2))})`,opacity:lerp(from.opacity,to.opacity,Math.min(1,t*3)),borderBottomLeftRadius:lerp(from.radius,to.radius,Math.min(1,t*2))+'px',borderBottomRightRadius:lerp(from.radius,to.radius,Math.min(1,t*2))+'px'};});}
  const running=new WeakMap();
  function animateSurface(el,on,{width=470,height=250,mode='standard',floating=false,initial=null}={}){
    const old=running.get(el),r=el.getBoundingClientRect(),current=old?{width:r.width,height:r.height,y:r.top,scale:1,opacity:+getComputedStyle(el).opacity,radius:25}:null;old?.cancel();
    const small={width:Math.min(174,width),height:26,y:-32,scale:.94,opacity:0,radius:14},large={width,height,y:0,scale:1,opacity:1,radius:25};
    if(floating){small.y=-20;large.y=0;}
    const duration=mode==='off'?0:mode==='subtle'?180:on?700:440;
    const keyframes=mode==='subtle'?[{opacity:on?0:1},{opacity:on?1:0}]:frames(initial||current||(on?small:large),on?large:small,duration);
    const animation=el.animate(keyframes,{duration,easing:'linear',fill:'both'});running.set(el,animation);
    return animation.finished.catch(()=>{}).finally(()=>{if(running.get(el)===animation){running.delete(el);animation.cancel();}});
  }
  function animatePage(el,direction=1,mode='standard'){
    if(mode==='off')return;return el.animate([{opacity:.1,transform:`translateX(${direction*32}px) scale(.98)`},{opacity:1,transform:'translateX(0) scale(1)'}],{duration:mode==='subtle'?160:360,easing:'cubic-bezier(.22,1,.36,1)'});
  }
  const api={PRESETS,spring,frames,animateSurface,animatePage};if(typeof module!=='undefined')module.exports=api;else root.IslandSurface=api;
})(globalThis);
