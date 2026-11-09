const{test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{probe}=require('../src/document-tools.cjs');
test('document probe accepts supported documents and reports missing LibreOffice',()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'agent-notch-doc-probe-')),file=path.join(dir,'fixture.docx'),png=path.join(dir,'fixture.png');fs.writeFileSync(file,'PK');fs.writeFileSync(png,'x');
  try{const result=probe(file);assert.equal(result.kind,'document');assert.equal(result.format,'docx');assert.equal(typeof result.available,'boolean');if(result.available)assert.equal(result.message,'');else assert.match(result.message,/LibreOffice/);assert.equal(probe(png),null);}finally{fs.rmSync(dir,{recursive:true,force:true});}
});
