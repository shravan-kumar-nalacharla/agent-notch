'use strict';
let start,dimensions;
const image=document.getElementById('screen'),box=document.getElementById('selection');
window.regionCapture.onImage(value=>{image.src=value.image;dimensions=value;});
const point=e=>({x:Math.max(0,Math.min(innerWidth,e.clientX)),y:Math.max(0,Math.min(innerHeight,e.clientY))});
document.onpointerdown=e=>{if(e.button!==0||!dimensions)return;start=point(e);document.body.setPointerCapture(e.pointerId);};
document.onpointermove=e=>{if(!start)return;const p=point(e);box.hidden=false;Object.assign(box.style,{left:Math.min(start.x,p.x)+'px',top:Math.min(start.y,p.y)+'px',width:Math.abs(p.x-start.x)+'px',height:Math.abs(p.y-start.y)+'px'});};
document.onpointerup=e=>{if(!start||!dimensions)return;const p=point(e),sx=dimensions.width/innerWidth,sy=dimensions.height/innerHeight,rect={x:Math.floor(Math.min(start.x,p.x)*sx),y:Math.floor(Math.min(start.y,p.y)*sy),width:Math.floor(Math.abs(p.x-start.x)*sx),height:Math.floor(Math.abs(p.y-start.y)*sy)};start=null;if(rect.width>=3&&rect.height>=3)window.regionCapture.finish(rect);};
document.onkeydown=e=>{if(e.key==='Escape')window.regionCapture.finish(null);};
