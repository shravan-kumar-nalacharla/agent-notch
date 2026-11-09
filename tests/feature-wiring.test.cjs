const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),read=file=>fs.readFileSync(path.join(root,file),'utf8');

test('file actions are wired through the notch, main process and uninstaller',()=>{
  const ui=read('src/widgets-ui.js'),main=read('src/widgets-main.cjs'),nsh=read('installer/consent.nsh');
  assert.match(ui,/files:choose/);
  assert.match(ui,/files:convert/);
  assert.match(ui,/Drop an image here/);
  assert.match(main,/files:inspect/);
  assert.match(main,/nativeImage\.createFromPath/);
  assert.match(nsh,/scrub-keys\.cjs/);
  assert.match(nsh,/ExecWait.*scrub-keys/);
});

test('the agent face is bundled and persisted in the appearance settings',()=>{
  const html=read('src/index.html'),prefs=read('src/preferences.js'),main=read('src/main.cjs');
  assert.match(html,/agent-face\.js/);
  assert.match(html,/agent-face-slot/);
  assert.match(prefs,/facePreview/);
  assert.match(prefs,/face:\{enabled/);
  assert.match(main,/face:\{enabled:false/);
});

test('Groq remains the default assistant and transcription provider',()=>{
  const main=read('src/main.cjs'),renderer=read('src/renderer.js');
  assert.match(main,/assistant: 'groq', speech: 'groq'/);
  assert.match(renderer,/Local \(Windows, offline\)/);
});

