'use strict';
const DENSITIES={compact:{width:410,height:230},default:{width:470,height:250},roomy:{width:540,height:280}};
function layoutFor(display,appearance={}){
  const size=DENSITIES[appearance.density]||DENSITIES.default,area=display.workArea,bounds=display.bounds;
  const panelWidth=Math.min(size.width,area.width-48),panelHeight=Math.min(size.height,area.height-40),richHeight=Math.min(315,area.height-40);
  const width=Math.round(panelWidth+48),height=Math.round(Math.max(panelHeight,richHeight)+24),floating=appearance.shape==='pill';
  let center=bounds.x+bounds.width/2,y=bounds.y;
  if(floating){const saved=appearance.float||{};center=area.x+Number(saved.centerXDIP??area.width/2);center=Math.max(area.x+width/2,Math.min(area.x+area.width-width/2,center));y=Math.max(area.y,Math.min(area.y+area.height-height,area.y+Number(saved.yDIP||12)));}
  return{bounds:{x:Math.round(center-width/2),y:Math.round(y),width,height},panelWidth,panelHeight,richHeight,centerX:center,displayId:String(display.id),scaleFactor:display.scaleFactor};
}
class IslandGeometry{
  constructor({win,screen,getAppearance,trace=()=>{}}){Object.assign(this,{win,screen,getAppearance,trace});this.expanded=false;this.voice=false;this.ignored=false;this.inside=false;this.userMove=false;this.rect=null;}
  reflow(){
    const a=this.getAppearance(),all=this.screen.getAllDisplays();
    const display=all.find(d=>String(d.id)===String(a.shape==='pill'?a.float?.displayId:a.display))||(a.display==='cursor'?this.screen.getDisplayNearestPoint(this.screen.getCursorScreenPoint()):this.screen.getPrimaryDisplay());
    this.layout=layoutFor(display,a);const current=this.win.getBounds();
    if(JSON.stringify(current)!==JSON.stringify(this.layout.bounds)){this.programmaticUntil=performance.now()+200;this.win.setBounds(this.layout.bounds);this.trace({event:'setBounds',at:performance.now(),bounds:this.layout.bounds,display:{id:display.id,bounds:display.bounds,workArea:display.workArea,scaleFactor:display.scaleFactor}});}
    this.win.webContents.send('window:layout',this.layout);return this.layout;
  }
  present(expanded,voice=false){this.expanded=expanded;this.voice=voice;return this.layout;}
  hitbox(rect){if(!rect||!['x','y','width','height'].every(k=>Number.isFinite(rect[k]))||rect.width<0||rect.height<0)return;const b=this.win.getBounds();this.rect={x:Math.max(0,rect.x),y:Math.max(0,rect.y),width:Math.min(b.width,rect.width),height:Math.min(b.height,rect.height)};}
  poll(point){
    const b=this.win.getBounds(),a=this.getAppearance();
    const rect=this.expanded||this.voice?this.rect||{x:24,y:0,width:this.layout.panelWidth,height:this.voice?38:this.layout.panelHeight}:{x:(b.width-(a.lineWidthDip||100))/2-8,y:0,width:(a.lineWidthDip||100)+16,height:12};
    const x=point.x-b.x,y=point.y-b.y,inside=x>=rect.x&&x<=rect.x+rect.width&&y>=rect.y&&y<=rect.y+rect.height;
    const ignored=!inside&&!this.userMove;
    if(ignored!==this.ignored){this.win.setIgnoreMouseEvents(ignored,{forward:true});this.ignored=ignored;}
    const changed=inside!==this.inside;this.inside=inside;
    return{inside,changed,x,y,width:b.width,height:b.height};
  }
  userPosition(){if(!this.userMove||performance.now()<(this.programmaticUntil||0)||this.getAppearance().shape!=='pill')return null;const b=this.win.getBounds(),d=this.screen.getDisplayMatching(b);return{displayId:String(d.id),centerXDIP:b.x-d.workArea.x+b.width/2,yDIP:b.y-d.workArea.y};}
}
module.exports={IslandGeometry,layoutFor,DENSITIES};
