'use strict';
(()=>{
 const settings=new URLSearchParams(location.search).has('settings');
 if(settings)window.islandSettingsReady=()=>{if(window.islandSettingsUIReady&&window.islandSettingsComponentsReady&&window.islandRoutingReady){document.documentElement.classList.remove('settings-pending');window.island.settingsReady();}};
 let loaded=false;
 function load(){
  if(loaded)return;loaded=true;
  const components=document.createElement('script');
  components.src=settings?'vendor/settings-components.js':'vendor/eleven-components.js';
  components.async=false;document.body.append(components);
  observer?.disconnect();
 }
 const observer=settings?null:new MutationObserver(()=>{
  if(document.body.classList.contains('expanded')||document.body.classList.contains('has-voice-hud'))load();
 });
 if(settings)load();else{
  observer.observe(document.body,{attributes:true,attributeFilter:['class']});
  window.addEventListener('island:hud-start',load,{once:true});
  if(document.body.classList.contains('expanded'))load();
 }
})();
