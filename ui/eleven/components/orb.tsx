// One ElevenLabs shader context for the main voice visualization.
import React,{useEffect,useRef} from 'react';
export function Orb({static:still=false,agentState,manualInput=0,manualOutput=0,className}:any){
 const canvas=useRef<HTMLCanvasElement>(null),level=useRef({manualInput,manualOutput,agentState});level.current={manualInput,manualOutput,agentState};
 useEffect(()=>{
  const c=canvas.current!;if(still){c.hidden=true;return;}
  let orb=window.ElevenOrb(c),frame=0,lost=false;c.hidden=!orb.available;
  const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches||document.body.dataset.motion==='off';
  const draw=(time:number)=>{if(lost)return;const l=level.current;if(c.isConnected&&c.getClientRects().length){orb.draw(reduced()?0:time*.0005,l.manualInput,l.manualOutput,l.agentState==='muted');if(!reduced()&&l.agentState)frame=requestAnimationFrame(draw);}};
  const restart=()=>{cancelAnimationFrame(frame);if(!lost)frame=requestAnimationFrame(draw);};
  const onLost=(event:Event)=>{event.preventDefault();lost=true;cancelAnimationFrame(frame);orb.dispose();};
  const onRestored=()=>{lost=false;orb=window.ElevenOrb(c);c.hidden=!orb.available;restart();};
  c.addEventListener('webglcontextlost',onLost);c.addEventListener('webglcontextrestored',onRestored);window.addEventListener('island:visual-change',restart);draw(0);
  return()=>{cancelAnimationFrame(frame);c.removeEventListener('webglcontextlost',onLost);c.removeEventListener('webglcontextrestored',onRestored);window.removeEventListener('island:visual-change',restart);orb.dispose();c.getContext('webgl2')?.getExtension('WEBGL_lose_context')?.loseContext();};
 },[]);
 return <div data-component="orb" className={'el-orb '+(className||'')}><canvas ref={canvas}/></div>;
}
