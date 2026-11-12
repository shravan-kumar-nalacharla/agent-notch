const{test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
test('the default eyes remain available without loading a blob avatar runtime',()=>{const html=fs.readFileSync('src/index.html','utf8');assert.doesNotMatch(html,/<script[^>]+(?:blobatar|agent-face)/);assert.match(html,/eye-lid/);assert.match(fs.readFileSync('src/renderer.js','utf8'),/--eye-x/);});
