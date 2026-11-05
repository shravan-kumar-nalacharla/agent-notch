'use strict';
// PCM chunks share one clock so streaming replies play without a gap per packet.
class LivePcmPlayer {
  constructor(makeContext=()=>new AudioContext()){this.makeContext=makeContext;this.sources=new Set();this.generation=0;this.next=0;this.chain=Promise.resolve();}
  enqueue(base64,volume=1){
    const generation=this.generation;
    this.chain=this.chain.then(async()=>{
      if(generation!==this.generation)return;
      const bytes=Uint8Array.from(atob(base64),c=>c.charCodeAt(0));
      if(!bytes.length||bytes.length%2)throw new Error('Gemini returned invalid PCM audio.');
      this.context??=this.makeContext();await this.context.resume();
      if(generation!==this.generation)return;
      if(this.next-this.context.currentTime>30)throw new Error('Live audio playback fell behind. Stop and retry the microphone.');
      const buffer=this.context.createBuffer(1,bytes.length/2,24000),samples=buffer.getChannelData(0),view=new DataView(bytes.buffer);
      for(let i=0;i<samples.length;i++)samples[i]=view.getInt16(i*2,true)/32768;
      const source=this.context.createBufferSource(),gain=this.context.createGain();source.buffer=buffer;gain.gain.value=Math.max(0,Math.min(1,volume));source.connect(gain);gain.connect(this.context.destination);
      this.sources.add(source);source.onended=()=>{this.sources.delete(source);source.disconnect();gain.disconnect();};
      const at=Math.max(this.context.currentTime+.04,this.next);source.start(at);this.next=at+buffer.duration;
    });
    // A rejected packet must not prevent the next session from playing.
    const result=this.chain;this.chain=result.catch(()=>{});return result;
  }
  stop(){this.generation++;for(const source of this.sources)try{source.stop();}catch{}this.sources.clear();this.next=0;}
}
if(typeof module!=='undefined')module.exports={LivePcmPlayer};
if(typeof window!=='undefined')(()=>{
  if(new URLSearchParams(location.search).has('settings'))return;
  const api=window.island,player=new LivePcmPlayer();let active=null,turn=-1,userNode,answerNode;
  api.onMicrophone?.(value=>{if(value.blocked){player.stop();active=null;}});
  const stopSpeech=window.islandStopSpeech;
  window.islandStopSpeech=(...args)=>{player.stop();stopSpeech?.(...args);};
  api.onVoice(event=>{
    if(event.phase==='listening'&&event.kind==='live'){player.stop();active=event.id;turn=-1;}
    if(['liveStop','error','idle'].includes(event.phase)){player.stop();active=null;}
    if(!active||event.id!==active)return;
    if(event.phase==='liveAudio'){window.dispatchEvent(new CustomEvent('island:speech',{detail:{phase:'speaking'}}));}if(event.phase==='liveAudio')player.enqueue(event.audio,event.volume).catch(async error=>{player.stop();await api.nativeVoice('cancel');window.islandShowError(error);});
    if(event.phase==='liveInterrupt')player.stop();
    if(event.phase==='liveText'){
      if(turn!==event.turn){turn=event.turn;userNode=null;answerNode=null;}
      if(event.text)document.getElementById('status').textContent='Gemini Live · responding · mic to stop';
      if(document.getElementById('voiceAssistant').hidden)tab('voiceAssistant');
    }
    if(event.phase==='liveTurn')document.getElementById('status').textContent='Gemini Live · listening · mic to stop';
  });
  window.addEventListener('pagehide',()=>{player.stop();player.context?.close();});
})();
