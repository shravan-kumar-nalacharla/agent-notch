const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const notes=require('../src/release-notes.json');

test('the bundled What’s new list starts at the packaged version and stays ordered',()=>{
  const pkg=require('../package.json');
  assert.equal(notes[0].version,pkg.version);
  assert.ok(notes.every((entry,index)=>index===0||entry.version.localeCompare(notes[index-1].version,undefined,{numeric:true})<0));
  assert.ok(notes.every(entry=>entry.title&&Array.isArray(entry.notes)&&entry.notes.length));
});

test('the chat page no longer asks a generic question before a message',()=>{
  const html=fs.readFileSync(path.join(root,'src/index.html'),'utf8');
  assert.doesNotMatch(html,/Ask a question/);
  const bundle=fs.readFileSync(path.join(root,'src/vendor/eleven-components.js'),'utf8');
  assert.doesNotMatch(bundle,/What’s on your mind|Ask a question, dictate/);
});

test('the public site has crawlable metadata, a stable download and the Huygen brand',()=>{
  const html=fs.readFileSync(path.join(root,'site/index.html'),'utf8');
  assert.match(html,/<title>Agent Notch for Windows — Huygen Studios<\/title>/);
  assert.match(html,/rel="canonical" href="https:\/\/shravan-kumar-nalacharla\.github\.io\/agent-notch-site\/"/);
  assert.match(html,/"@type": "SoftwareApplication"/);
  assert.match(html,/"@type": "FAQPage"/);
  assert.match(html,/releases\/latest\/download\/Agent-Notch-Setup\.exe/);
  assert.match(html,/Huygen Studios/);
  assert.ok(fs.existsSync(path.join(root,'site/sitemap.xml')));
  assert.ok(fs.existsSync(path.join(root,'site/robots.txt')));
  assert.ok(fs.existsSync(path.join(root,'site/assets/og.png')));
  const privacy=fs.readFileSync(path.join(root,'site/privacy.html'),'utf8');
  assert.match(privacy,/no Agent Notch account/i);
  assert.match(privacy,/no analytics SDK/i);
  assert.match(fs.readFileSync(path.join(root,'site/sitemap.xml'),'utf8'),/privacy\.html/);
});

test('the release catalog lists the current release and the update path',()=>{
  const html=fs.readFileSync(path.join(root,'site/releases.html'),'utf8');
  assert.match(html,/0\.19\.0/);
  assert.match(html,/0\.18\.0/);
  assert.match(html,/0\.17\.9/);
  assert.match(html,/The update path/);
  assert.match(html,/Settings → About/);
});
