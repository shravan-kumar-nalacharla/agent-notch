const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const {busyReason,updateStatusText,trayItem}=require('../src/update-policy.cjs');
const {cleanError}=require('../src/updater.cjs');

test('updates wait for every active state that could lose work',()=>{
  assert.match(busyReason({voiceRecording:true}),/voice recording/);
  assert.match(busyReason({capturing:true}),/screen capture/);
  assert.match(busyReason({terminalActive:true}),/terminal/);
  assert.match(busyReason({taskActive:true}),/task/);
  assert.match(busyReason({unsaved:true}),/settings changes/);
  assert.equal(busyReason({}),'');
});

test('update status and tray text never claim an install that has not happened',()=>{
  assert.match(updateStatusText({status:'downloading',availableVersion:'0.17.2',percent:42}),/42%/);
  assert.match(updateStatusText({status:'ready',availableVersion:'0.17.2'}),/ready to install/);
  assert.match(updateStatusText({status:'current',currentVersion:'0.17.2'}),/up to date/);
  assert.match(updateStatusText({status:'error',message:'No release metadata.'}),/No release metadata/);
  assert.equal(trayItem({status:'ready',availableVersion:'0.17.2'}).enabled,true);
  assert.equal(trayItem({status:'downloading',percent:10}).enabled,false);
  assert.equal(trayItem({status:'current'}),null);
});

test('update errors are short, single-line and cannot inject log lines',()=>{
  const value=cleanError(new Error('line one\nline two\t'+'x'.repeat(400)));
  assert.ok(value.length<=301);
  assert.ok(!/[\r\n\t]/.test(value));
});

test('packaging points the updater at the public release-only repository',()=>{
  const pkg=require('../package.json');
  assert.equal(pkg.dependencies['electron-updater'],'6.8.11');
  assert.deepEqual(pkg.build.publish,[{provider:'github',owner:'shravan-kumar-nalacharla',repo:'agent-notch-releases',releaseType:'release'}]);
  assert.equal(pkg.build.appId,'app.agentnotch.desktop');
  assert.equal(pkg.build.nsis.oneClick,false);
  assert.equal(pkg.build.nsis.deleteAppDataOnUninstall,false);
});

test('preload reports the packaged version instead of a hardcoded release',()=>{
  const source=fs.readFileSync(path.join(root,'src','preload.cjs'),'utf8');
  assert.match(source,/sendSync\('app:version'\)/);
  assert.doesNotMatch(source,/version:\s*'0\.\d+\.\d+'/);
});
