'use strict';
// Electron nativeImage bitmaps are BGRA, four bytes per pixel. Keep the transform
// pure so rotation and flip can be tested without an Electron process.
function transformBitmap(data,width,height,rotate=0,flip=false){
  if(!Buffer.isBuffer(data)||!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||data.length!==width*height*4)throw new Error('Invalid bitmap.');
  if(![0,90,180,270].includes(rotate))throw new Error('Rotation must be 0, 90, 180 or 270 degrees.');
  const swap=rotate===90||rotate===270,outWidth=swap?height:width,outHeight=swap?width:height,out=Buffer.alloc(data.length);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    let tx=x,ty=y;
    if(rotate===90){tx=height-1-y;ty=x;}
    else if(rotate===180){tx=width-1-x;ty=height-1-y;}
    else if(rotate===270){tx=y;ty=width-1-x;}
    if(flip)tx=outWidth-1-tx;
    data.copy(out,(ty*outWidth+tx)*4,(y*width+x)*4,(y*width+x)*4+4);
  }
  return{data:out,width:outWidth,height:outHeight};
}
module.exports={transformBitmap};
