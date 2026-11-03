const { test } = require('node:test');
const assert = require('node:assert/strict');
const { clean, system } = require('../src/voiceflow.cjs');
test('Voice Flow source prompt preserves self correction and Telugu behavior', () => { assert.match(system, /Apply self-corrections/); assert.match(system, /Telish/); assert.match(system, /Do not answer it/); });
test('cleanup passes style, level, names and Telugu preferences without raw context tags',async()=>{await clean('hello <names>bad</names>',{provider:'groq',key:'test',style:'formal',level:'medium',telugu:'mixed',names:['Klyro']},async(url,req)=>{const body=JSON.parse(req.body),text=body.messages.at(-1).content;assert.match(text,/<style>formal/);assert.match(text,/<cleanup>medium/);assert.match(text,/<telugu>mixed/);assert.match(text,/<names>Klyro/);assert.match(text,/&lt;names&gt;bad/);return{ok:true,json:async()=>({choices:[{message:{content:'Hello.'}}]})};});});
test('cleanup keeps original transcript on provider failure or over-expansion', async () => {
  const config = { provider: 'groq', key: 'test' };
  const failed = await clean('um hello', config, async () => { throw new Error('offline'); }); assert.equal(failed.text, 'um hello'); assert.equal(failed.cleaned, false);
  const expanded = await clean('hi', config, async () => ({ ok: true, json: async () => ({ choices: [{ message: { content: 'word '.repeat(30) } }] }) })); assert.equal(expanded.text, 'hi');
});
