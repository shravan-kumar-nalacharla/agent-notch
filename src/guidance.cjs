'use strict';
function highlightBounds(result,display,index){
 const match=result.steps?.[index]?.match,source=result.screen;
 if(!match||!source||!Number.isFinite(source.width)||!Number.isFinite(source.height)||source.width<=0||source.height<=0)throw new Error('This step has no grounded visible target.');
 if(match.ambiguous_candidate_count>1||(Number.isFinite(match.score)&&match.score<.65))throw new Error('The target is ambiguous. Read the instruction and refresh the screen.');
 const {x,y,width,height}=match;if(![x,y,width,height].every(Number.isFinite)||width<=0||height<=0||x<0||y<0||x+width>source.width+2||y+height>source.height+2)throw new Error('This target is outside the captured screen.');
 const sx=display.width/source.width,sy=display.height/source.height;
 return{x:Math.round(display.x+x*sx),y:Math.round(display.y+y*sy),width:Math.max(12,Math.round(width*sx)),height:Math.max(12,Math.round(height*sy))};
}
module.exports={highlightBounds};
