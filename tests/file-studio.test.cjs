const{test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),read=file=>fs.readFileSync(path.join(root,file),'utf8');
test('File Studio is a real detached window with the required surface',()=>{
  const main=read('src/main.cjs'),html=read('src/file-studio.html'),css=read('src/file-studio.css'),js=read('src/file-studio.js');
  assert.match(main,/title:'Agent Notch — File Studio'/);
  assert.match(main,/minWidth:850,minHeight:560/);
  assert.match(main,/preload:path\.join\(__dirname,'preload\.cjs'\)/);
  assert.match(main,/protocol\.handle\('studio-file'/);
  assert.match(html,/Crop Image/);assert.match(html,/Trim Video/);assert.match(html,/PDF Workspace/);
  assert.match(html,/imageCrop/);assert.match(html,/videoTimeline/);assert.match(html,/pdfCanvas/);
  assert.match(js,/pdfjsLib\.getDocument/);assert.match(js,/studio\.image/);assert.match(js,/studio\.media/);assert.match(js,/studio\.pdfSave/);
  assert.match(css,/prefers-color-scheme:dark/);
});
test('the notch no longer embeds the file editor',()=>{
  const ui=read('src/widgets-ui.js'),main=read('src/main.cjs');
  assert.doesNotMatch(ui,/Trim &amp; convert/);
  assert.match(ui,/Open File Studio/);
  assert.match(main,/handle\('files:open'[\s\S]{0,800}openFileStudio/);
});
test('File Studio rejects untrusted windows and keeps a restricted preload',()=>{
  const main=read('src/main.cjs'),preload=read('src/preload.cjs');
  assert.match(main,/function handleStudio\(name,fn\)/);
  assert.match(main,/trustedWindowEvent\(event,\[fileStudioWindow\],fileStudioPage\)/);
  assert.match(preload,/openFileActions/);
  assert.match(preload,/contextBridge\.exposeInMainWorld\('studio'/);
});


