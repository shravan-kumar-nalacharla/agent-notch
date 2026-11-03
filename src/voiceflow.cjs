'use strict';
// Voice Flow's MIT prompt is retained verbatim so its cleanup rules stay traceable.
const fs = require('node:fs');
const path = require('node:path');
const { chat } = require('./providers.cjs');
const source = fs.readFileSync(path.join(__dirname, 'vendor', 'voiceflow', 'CleanupPrompt.cs'), 'utf8');
const raw = source.match(/const string SystemText = """\r?\n([\s\S]*?)\r?\n        """;/);
if (!raw) throw new Error('Voice Flow cleanup prompt is missing.');
const system = raw[1].replace(/^        /gm, '').replace(/\r\n/g, '\n');
async function clean(text, providerConfig, fetcher = fetch) {
  const rawText = String(text || '').trim();
  if (!rawText) return { text: '', cleaned: false };
  try {
    const tag=(name,value)=>`<${name}>${String(value).replaceAll('<','&lt;').replaceAll('>','&gt;')}</${name}>`;
    const context=[tag('style',providerConfig.style||'casual'),tag('cleanup',providerConfig.level||'light')];
    for(const name of ['app','telugu'])if(providerConfig[name])context.push(tag(name,providerConfig[name]));
    if(providerConfig.names?.length)context.push(tag('names',providerConfig.names.slice(0,150).join(', ')));
    if(providerConfig.beforeCursor)context.push(tag('before_cursor',providerConfig.beforeCursor.slice(-120)));
    context.push(tag('transcript',rawText));
    const output = await chat({ ...providerConfig, system:system+'\nStrict dictation: never translate, summarize, add facts or change names, numbers, paths, URLs or English technical terms. Preserve the spoken language and script.', text: context.join('\n') }, fetcher);
    // Keep the original speech if cleanup fails or the model answers the transcript.
    if (output.includes('<transcript>') || output.split(/\s+/).length > rawText.split(/\s+/).length * 2 + 12) return { text: rawText, cleaned: false, warning: 'Cleanup returned unexpected content; kept your original words.' };
    return { text: output, cleaned: true };
  } catch { return { text: rawText, cleaned: false, warning: 'Cleanup unavailable; kept your original words.' }; }
}
module.exports = { clean, system };
