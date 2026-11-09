const{test}=require('node:test'),assert=require('node:assert/strict'),{buildArgs}=require('../src/media-tools.cjs');
test('media trim arguments are shell-free and preserve the source',()=>{
  const video=buildArgs({input:'C:\\in\\a b.mp4',output:'C:\\out\\clip.mp4',start:1,end:3,kind:'video'});
  assert.deepEqual(video.slice(0,6),['-y','-ss','1','-i','C:\\in\\a b.mp4','-t']);
  assert.equal(video[6],'2');assert.ok(video.includes('libx264'));assert.ok(video.includes('+faststart'));
  const audio=buildArgs({input:'F:\\song.mp3',output:'F:\\clip.mp3',kind:'audio'});
  assert.ok(audio.includes('-vn'));assert.ok(audio.includes('libmp3lame'));assert.equal(audio.at(-1),'F:\\clip.mp3');
});
test('media trim rejects in-place output and inverted ranges',()=>{
  assert.throws(()=>buildArgs({input:'F:\\a.mp4',output:'F:\\a.mp4',kind:'video'}),/never overwritten/);
  assert.throws(()=>buildArgs({input:'F:\\a.mp4',output:'F:\\b.mp4',start:5,end:2,kind:'video'}),/after start/);
});
