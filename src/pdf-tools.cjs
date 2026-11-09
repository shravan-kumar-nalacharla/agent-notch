'use strict';
const fs=require('node:fs'),path=require('node:path');
async function load(){return require('pdf-lib');}
async function probe(file){
  if(typeof file!=='string'||!fs.existsSync(file)||path.extname(file).toLowerCase()!=='.pdf')return null;
  const{PDFDocument}=await load();
  try{const doc=await PDFDocument.load(fs.readFileSync(file),{ignoreEncryption:false});return{kind:'pdf',pages:doc.getPageCount(),available:true,message:''};}
  catch{return{kind:'pdf',pages:0,available:false,message:'This PDF is encrypted or unreadable.'};}
}
async function merge(inputs,output){
  if(!Array.isArray(inputs)||inputs.length<2)throw new Error('Choose at least two PDFs to merge.');
  if(inputs.some(file=>path.extname(file).toLowerCase()!=='.pdf'||!fs.existsSync(file)))throw new Error('Every input must be a readable PDF.');
  const{PDFDocument}=await load(),target=await PDFDocument.create();
  for(const file of inputs){const source=await PDFDocument.load(fs.readFileSync(file));const pages=await target.copyPages(source,source.getPageIndices());for(const page of pages)target.addPage(page);}
  fs.writeFileSync(output,await target.save());return{pages:target.getPageCount(),output};
}
async function split(file,outputDir){
  if(path.extname(file).toLowerCase()!=='.pdf'||!fs.existsSync(file))throw new Error('Choose a PDF to split.');
  const{PDFDocument}=await load(),source=await PDFDocument.load(fs.readFileSync(file)),base=path.basename(file,path.extname(file)),outputs=[];
  fs.mkdirSync(outputDir,{recursive:true});
  for(let index=0;index<source.getPageCount();index++){const target=await PDFDocument.create();const[page]=await target.copyPages(source,[index]);target.addPage(page);const output=path.join(outputDir,`${base}-page-${String(index+1).padStart(3,'0')}.pdf`);fs.writeFileSync(output,await target.save());outputs.push(output);}
  return{outputs,pages:source.getPageCount()};
}
async function rotate(file,output,degrees){
  if(![90,180,270].includes(Number(degrees)))throw new Error('Choose 90, 180 or 270 degrees.');
  if(path.extname(file).toLowerCase()!=='.pdf'||!fs.existsSync(file))throw new Error('Choose a PDF to rotate.');
  const{PDFDocument,degrees:toDegrees}=await load(),doc=await PDFDocument.load(fs.readFileSync(file));
  for(const page of doc.getPages())page.setRotation(toDegrees((page.getRotation().angle+Number(degrees))%360));
  fs.writeFileSync(output,await doc.save());return{pages:doc.getPageCount(),output};
}
async function imagesToPdf(images,output){
  if(!Array.isArray(images)||!images.length)throw new Error('Choose at least one image.');
  const{PDFDocument}=await load(),doc=await PDFDocument.create();
  for(const file of images){const ext=path.extname(file).toLowerCase();let bytes=fs.readFileSync(file),embed;
    if(ext==='.png')embed=await doc.embedPng(bytes);else if(ext==='.jpg'||ext==='.jpeg')embed=await doc.embedJpg(bytes);
    else throw new Error('Images-to-PDF accepts PNG and JPEG.');
    const page=doc.addPage([embed.width,embed.height]);page.drawImage(embed,{x:0,y:0,width:embed.width,height:embed.height});}
  fs.writeFileSync(output,await doc.save());return{pages:doc.getPageCount(),output};
}
module.exports={probe,merge,split,rotate,imagesToPdf};
