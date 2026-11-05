'use strict';
(()=>{
 const api=window.island,$=id=>document.getElementById(id),settings=new URLSearchParams(location.search).has('settings');
 const versions=new Map(),baseline=new Map(),removed=new Set();let latest,ready;
 const names={groq:'Groq',gemini:'Gemini',openai:'OpenAI',anthropic:'Anthropic',openrouter:'OpenRouter',deepseek:'DeepSeek',deepgram:'Deepgram',sarvam:'Sarvam'};
 function status(provider,message){$('key-status-'+provider).textContent=message;}
 function refresh(state){latest=state;for(const provider of Object.keys(names)){if(!$('key-'+provider))continue;status(provider,removed.has(provider)?'Will be removed when you save.':state.keyErrors?.[provider]|| (baseline.has(provider)&&$('key-'+provider).value!==baseline.get(provider)&&$('key-'+provider).value?'Unsaved key':state.configured[provider]?'Saved on this PC':'Optional · no key saved'));}}
 async function loadKeys(revisions){if(!settings)return;const response=await api.savedProviderKeys();if(!response.ok)throw new Error(response.error);for(const provider of Object.keys(names)){const saved=response.value[provider]||'';baseline.set(provider,saved);if((versions.get(provider)||0)===(revisions?.get(provider)||0)){$('key-'+provider).value=saved;removed.delete(provider);}}refresh(latest);}
 function capture(){const providerKeys={},removeProviderKeys=[...removed],revisions=new Map(versions);for(const provider of Object.keys(names)){const value=$('key-'+provider)?.value.trim();if(value&&value!==baseline.get(provider)&&!removed.has(provider))providerKeys[provider]=value;}return{value:{providerKeys,removeProviderKeys},revisions};}
 async function test(provider,button){button.disabled=true;status(provider,'Testing connection…');try{const selected=$('keyProvider').value===provider,model=selected?$('chatModel').value:latest.models[provider]?.chat;const response=await api.testProvider({provider,key:$('key-'+provider).value.trim(),model});if(!response.ok)throw new Error(response.error);status(provider,'Connected · '+response.value.reply);}catch(error){status(provider,'Connection failed: '+error.message);}finally{button.disabled=false;}}
 ready=api.get().then(async response=>{
  if(!response.ok)throw new Error(response.error);latest=response.value;const container=$('providerKeys');
  for(const [provider,name]of Object.entries(names)){
   const card=document.createElement('article');card.className='provider-card';card.dataset.provider=provider;
   card.innerHTML=`<div class="provider-card-heading"><h4>${name}</h4><small>${provider==='groq'?'Default':provider==='gemini'?'Optional voice conversation':provider==='deepgram'?'Transcription only':'Optional'}</small></div><label for="key-${provider}">${name} API key</label><div class="provider-key-row"><input id="key-${provider}" type="password" autocomplete="off" spellcheck="false" maxlength="1000" placeholder="Paste your ${name} key" data-provider-key="${provider}"><button type="button" data-show-key="${provider}" aria-controls="key-${provider}" aria-pressed="false">Show</button></div><div class="provider-card-footer"><small id="key-status-${provider}" role="status"></small><div>${latest.providers[provider].chat?`<button type="button" data-test-key="${provider}">Test</button>`:''}<button type="button" data-remove-key="${provider}">Remove</button></div></div>`;
   container.append(card);versions.set(provider,0);
   $('key-'+provider).addEventListener('input',()=>{versions.set(provider,versions.get(provider)+1);removed.delete(provider);refresh(latest);});
   card.querySelector('[data-show-key]').setAttribute('aria-label','Show '+name+' API key');
   card.querySelector('[data-show-key]').onclick=event=>{const input=$('key-'+provider),show=input.type==='password';input.type=show?'text':'password';event.currentTarget.textContent=show?'Hide':'Show';event.currentTarget.setAttribute('aria-pressed',String(show));event.currentTarget.setAttribute('aria-label',(show?'Hide ':'Show ')+name+' API key');};
   card.querySelector('[data-remove-key]').onclick=()=>{removed.add(provider);versions.set(provider,versions.get(provider)+1);$('key-'+provider).value='';refresh(latest);$('key-'+provider).dispatchEvent(new Event('input',{bubbles:true}));removed.add(provider);refresh(latest);};
   card.querySelector('[data-test-key]')?.addEventListener('click',event=>test(provider,event.currentTarget));
  }
  refresh(latest);await loadKeys(new Map(versions));
 }).catch(error=>{if($('providerKeys'))$('providerKeys').textContent='Could not load saved keys: '+error.message;throw error;});
 // Keep failures handled even when the user has not opened Settings yet.
 ready.catch(()=>{});
 api.onSettings(refresh);
 window.islandProviderKeys={ready,capture,saved:revisions=>loadKeys(revisions)};
})();
