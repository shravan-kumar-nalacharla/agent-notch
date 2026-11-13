'use strict';
async function readPNG(clipboard){
 if(clipboard.readImage){const image=await clipboard.readImage();return image.isEmpty()?null:image.toPNG();}
 for(const item of await clipboard.read())if(item.types.includes('image/png')){const blob=await item.getType('image/png');if(blob.size<=1100000)return Buffer.from(await blob.arrayBuffer());}
 return null;
}
async function writeImage(clipboard,image){
 if(clipboard.writeImage)return clipboard.writeImage(image);
 const{ClipboardItem}=require('electron');return clipboard.write([new ClipboardItem({'image/png':new Blob([new Uint8Array(image.toPNG())],{type:'image/png'})})]);
}
module.exports={readPNG,writeImage};
