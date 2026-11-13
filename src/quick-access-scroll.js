'use strict';
(()=>{
 window.createQuickAccessScroll=(grid,{reduced=()=>false}={})=>{
  let frame=0,pending=0,period=0,looping=false,width=-1;
  function normalize(){
   if(!looping||!period)return;
   if(grid.scrollLeft<period)grid.scrollLeft+=period;
   else if(grid.scrollLeft>=period*2)grid.scrollLeft-=period;
  }
  function copy(source){
   const clone=source.cloneNode(true);clone.dataset.quickClone='true';clone.setAttribute('aria-hidden','true');
   for(const name of ['ondragstart','ondragover','ondrop'])clone[name]=source[name];
   const originals=source.querySelectorAll('button');clone.querySelectorAll('button').forEach((button,i)=>{
    button.tabIndex=-1;for(const name of ['onclick','oncontextmenu','onkeydown'])button[name]=originals[i][name];
   });return clone;
  }
  function refresh(){
   cancelAnimationFrame(frame);frame=0;pending=0;
   grid.querySelectorAll('[data-quick-clone]').forEach(el=>el.remove());
   const cells=[...grid.children],gap=parseFloat(getComputedStyle(grid).gap)||0;
   period=cells.reduce((sum,cell)=>sum+cell.getBoundingClientRect().width+gap,0);
   looping=cells.length>1&&period-gap>grid.clientWidth+1&&grid.clientWidth>0;
   if(looping){const before=document.createDocumentFragment(),after=document.createDocumentFragment();for(const cell of cells){before.append(copy(cell));after.append(copy(cell));}grid.prepend(before);grid.append(after);grid.scrollLeft=period;}
   else grid.scrollLeft=0;
   width=grid.clientWidth;
  }
  function tick(){
   normalize();const step=Math.sign(pending)*Math.min(24,Math.max(1,Math.abs(pending)*.2));
   grid.scrollLeft+=step;pending-=step;normalize();
   if(Math.abs(pending)<1){pending=0;frame=0;return;}frame=requestAnimationFrame(tick);
  }
  function wheel(event){
   if(event.ctrlKey)return;
   if(!looping)refresh();if(!looping)return;
   const travel=Math.abs(event.deltaX)>Math.abs(event.deltaY)?event.deltaX:event.deltaY;if(!travel)return;
   event.preventDefault();
   const delta=Math.sign(travel)*Math.min(110,Math.abs(travel)*(event.deltaMode===1?20:.85));
   if(reduced()){grid.scrollLeft+=delta;normalize();return;}
   pending=Math.max(-260,Math.min(260,pending+delta));if(!frame)frame=requestAnimationFrame(tick);
  }
  grid.parentElement.addEventListener('wheel',wheel,{passive:false});
  grid.addEventListener('scroll',()=>{if(!frame)normalize();},{passive:true});
  new ResizeObserver(()=>{if(grid.clientWidth!==width)refresh();}).observe(grid);
  return{refresh};
 };
})();
