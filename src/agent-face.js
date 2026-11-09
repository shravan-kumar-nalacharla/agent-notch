'use strict';
(function(root){
  // Blobatar is vendored from github.com/Alain00/blobatar (MIT) and bundled
  // unchanged. Shape names are Blobatar's silhouettes; each maps to the
  // library's public `traits.shape` band so the user's choice is exact.
  const shapeTraits={round:.10,organic:.35,boxy:.54,capsule:.65,nub:.74,cloud:.82,droplet:.89,hexagon:.93,sun:.97,triangle:.995};
  const shapes=Object.keys(shapeTraits);
  const expressions=['idle','happy','sad','mad','surprised','wink','sleepy','smug','unsure','scared','love','shy','sick','thinking'];
  function fallback({size=64,hue=165}={}){return `<svg class="agent-face-svg" viewBox="0 0 100 100" width="${size}" height="${size}" role="img" aria-label="Agent face"><circle cx="50" cy="52" r="36" fill="hsl(${hue} 45% 62%)"/><circle cx="38" cy="52" r="4" fill="#10211e"/><circle cx="62" cy="52" r="4" fill="#10211e"/></svg>`;}
  function svg({seed='Agent Notch',shape='organic',hue=165,expression='idle',size=64}={}){
    const safeShape=shapes.includes(shape)?shape:'organic',safeHue=Number.isFinite(+hue)?Math.max(0,Math.min(360,+hue)):165,safeExpression=expressions.includes(expression)?expression:'idle';
    const lib=root.BlobatarLib;
    if(!lib?.blobatar)return fallback({size,hue:safeHue});
    const svg=lib.blobatar(String(seed||'Agent Notch'),{size,background:false,hue:safeHue,expression:lib[safeExpression]||lib.idle,traits:{shape:shapeTraits[safeShape]}});
    return svg.replace('<svg ',`<svg class="agent-face-svg" role="img" aria-label="Agent face" `);
  }
  function apply(container,options){
    if(!container)return;
    let slot=container.querySelector('.agent-face-slot');
    if(!slot){slot=document.createElement('span');slot.className='agent-face-slot';container.prepend(slot);}
    slot.innerHTML=options?.enabled===false?'':svg(options);
  }
  const api={svg,apply,shapes,expressions,shapeTraits};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.AgentFace=api;
})(globalThis);
