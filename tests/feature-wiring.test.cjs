const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),read=file=>fs.readFileSync(path.join(root,file),'utf8');

test('file actions are wired through the notch, main process and uninstaller',()=>{
  const ui=read('src/widgets-ui.js'),main=read('src/widgets-main.cjs'),nsh=read('installer/consent.nsh');
  assert.match(ui,/files:choose/);
  assert.match(ui,/files:convert/);
  assert.match(ui,/Open File Studio/);
  assert.match(main,/files:inspect/);
  assert.match(main,/nativeImage\.createFromPath/);
  assert.match(nsh,/scrub-keys\.cjs/);
  assert.match(nsh,/ExecWait.*scrub-keys/);
});

test('the default eyes are configured without the retired avatar UI',()=>{
  const html=read('src/index.html'),prefs=read('src/preferences.js'),main=read('src/main.cjs');
  assert.doesNotMatch(html,/agent-face\.js/);
  assert.match(html,/agent-face-slot/);
  assert.doesNotMatch(html,/vendor\/blobatar\.js/);
  assert.match(html,/openFileActions/);
  assert.doesNotMatch(prefs,/facePreview/);
  assert.match(prefs,/Show the eyes companion/);
  assert.match(main,/face:\{enabled:false/);
  assert.match(main,/handle\('files:open'/);
});

test('Groq remains the default assistant and transcription provider',()=>{
  const main=read('src/main.cjs'),renderer=read('src/renderer.js');
  assert.match(main,/assistant: 'groq', speech: 'groq'/);
  assert.match(renderer,/Local \(Windows, offline\)/);
});

