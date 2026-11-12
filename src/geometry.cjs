'use strict';
const DENSITIES={compact:{width:410,height:230},default:{width:470,height:250},roomy:{width:540,height:280}};
const TOOL_SIZES={compact:{width:410,height:230},standard:{width:470,height:250},spacious:{width:640,height:440}};
function layoutFor(display,appearance={}){
  const choice=appearance.toolSizes?.[appearance.activeTool],toolSize=Object.hasOwn(TOOL_SIZES,choice)?choice:appearance.activeTool==='terminal'?'spacious':'auto';
  const size=TOOL_SIZES[toolSize]||DENSITIES[appearance.density]||DENSITIES.default,area=display.workArea,bounds=display.bounds;
  const panelWidth=Math.min(size.width,area.width-48),panelHeight=Math.min(size.height,area.height-40),richHeight=Math.min(315,area.height-40);
  const width=Math.round(panelWidth+48),height=Math.round(Math.max(panelHeight,richHeight)+24),floating=appearance.shape==='pill'||appearance.shape==='corner',corner=appearance.shape==='corner';
  let center=area.x+area.width/2,y=area.y;
  if(corner){center=area.x+area.width-width/2-12;y=area.y+10;}else if(floating){const saved=appearance.float||{};center=area.x+Number(saved.centerXDIP??area.width/2);center=Math.max(area.x+width/2,Math.min(area.x+area.width-width/2,center));y=Math.max(area.y,Math.min(area.y+area.height-height,area.y+Number(saved.yDIP||12)));}
  return{bounds:{x:Math.round(center-width/2),y:Math.round(y),width,height},panelWidth,panelHeight,richHeight,centerX:center,displayId:String(display.id),scaleFactor:display.scaleFactor,toolSize:choice||'auto'};
}
class IslandGeometry{
  constructor({win,screen,getAppearance,trace=()=>{},now=()=>performance.now()}){Object.assign(this,{win,screen,getAppearance,trace,now});this.expanded=false;this.voice=false;this.ignored=false;this.inside=false;this.userMove=false;this.rect=null;}
  reflow(){
    const a={...this.getAppearance(),activeTool:this.activeTool||''},all=this.screen.getAllDisplays();
    if(this.displayMode!==a.display){this.displayMode=a.display;this.followDisplay=null;this.followCandidate=null;}
    const currentDisplay=all.find(d=>String(d.id)===this.layout?.displayId);
    let display=all.find(d=>String(d.id)===String(a.shape==='pill'?a.float?.displayId:a.display));
    if(!display&&a.display==='cursor')display=currentDisplay&&(this.expanded||this.voice||this.reminder||this.userMove)?currentDisplay:all.find(d=>String(d.id)===this.followDisplay)||currentDisplay||this.screen.getDisplayNearestPoint(this.screen.getCursorScreenPoint());
    display??=this.screen.getPrimaryDisplay();
    const previous=this.layout;this.layout=layoutFor(display,a);const current=this.win.getBounds();clearTimeout(this.shrinkTimer);
    if(JSON.stringify(current)!==JSON.stringify(this.layout.bounds)){
      const target=this.layout.bounds,hold=this.expanded&&a.motion!=='off'&&previous?.displayId===this.layout.displayId&&(previous.bounds.width>target.width||previous.bounds.height>target.height),bounds=hold?{x:Math.round(this.layout.centerX-Math.max(current.width,target.width)/2),y:target.y,width:Math.max(current.width,target.width),height:Math.max(current.height,target.height)}:target;
      this.programmaticUntil=performance.now()+240;this.win.setBounds(bounds);this.trace({event:'setBounds',at:performance.now(),bounds,display:{id:display.id,bounds:display.bounds,workArea:display.workArea,scaleFactor:display.scaleFactor}});
      if(hold){const layout=this.layout;this.shrinkTimer=setTimeout(()=>{if(this.layout===layout&&!this.win.isDestroyed?.())this.win.setBounds(target);},220);this.shrinkTimer.unref?.();}
    }
    this.win.webContents.send('window:layout',this.layout);return this.layout;
  }
  present(expanded,voice=false){this.expanded=expanded;this.voice=voice;return this.layout;}
  tool(id){if(this.activeTool===id)return this.layout;this.activeTool=id;this.rect=null;return this.reflow();}
  hitbox(rect){if(!rect||!['x','y','width','height'].every(k=>Number.isFinite(rect[k]))||rect.width<0||rect.height<0)return;const b=this.win.getBounds();this.rect={x:Math.max(0,rect.x),y:Math.max(0,rect.y),width:Math.min(b.width,rect.width),height:Math.min(b.height,rect.height)};}
  poll(point){
    const a=this.getAppearance();
    if(a.display==='cursor'&&a.shape!=='pill'&&!this.expanded&&!this.voice&&!this.reminder&&!this.userMove){const id=String(this.screen.getDisplayNearestPoint(point).id);if(id!==this.layout.displayId){if(this.followCandidate?.id!==id)this.followCandidate={id,at:this.now()};if(this.now()-this.followCandidate.at>=650){this.followDisplay=id;this.followCandidate=null;this.reflow();}}else this.followCandidate=null;}else this.followCandidate=null;
    const b=this.win.getBounds();
    const rect=this.expanded||this.voice?this.rect||{x:24,y:0,width:this.layout.panelWidth,height:this.voice?38:this.layout.panelHeight}:a.shape==='corner'?{x:b.width-76,y:0,width:76,height:36}:{x:(b.width-(a.lineWidthDip||100))/2-8,y:0,width:(a.lineWidthDip||100)+16,height:12};
    const x=point.x-b.x,y=point.y-b.y,inside=x>=rect.x&&x<=rect.x+rect.width&&y>=rect.y&&y<=rect.y+rect.height;
    const ignored=!inside&&!this.userMove;
    if(ignored!==this.ignored){this.win.setIgnoreMouseEvents(ignored,{forward:true});this.ignored=ignored;}
    const changed=inside!==this.inside;this.inside=inside;
    return{inside,changed,x,y,width:b.width,height:b.height};
  }
  userPosition(){if(!this.userMove||performance.now()<(this.programmaticUntil||0)||this.getAppearance().shape!=='pill')return null;const b=this.win.getBounds(),d=this.screen.getDisplayMatching(b);return{displayId:String(d.id),centerXDIP:b.x-d.workArea.x+b.width/2,yDIP:b.y-d.workArea.y};}
}
module.exports={IslandGeometry,layoutFor,DENSITIES,TOOL_SIZES};
