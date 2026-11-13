'use strict';
((root)=>{
 function createVoiceLoop({start,cancelCapture=async()=>{},spoken=()=>false,changed=()=>{},error=()=>{},delay=250,setTimer=setTimeout,clearTimer=clearTimeout}){
  let enabled=false,epoch=0,timer=null,turnDone=false,audioDone=true,id=null,live=false,tail=Promise.resolve();
  const clear=()=>{if(timer!==null)clearTimer(timer);timer=null;};
  function stop(){clear();epoch++;enabled=false;turnDone=false;id=null;changed(false);}
  function capture(){const own=epoch;turnDone=false;audioDone=true;id=null;tail=tail.catch(()=>{}).then(async()=>{if(!enabled||own!==epoch)return;try{await start();if(own!==epoch)await cancelCapture();}catch(e){if(own===epoch){stop();error(e);}}});return tail;}
  function resume(){if(!enabled||live||!turnDone||!audioDone||timer!==null)return;const own=epoch;timer=setTimer(()=>{timer=null;if(enabled&&own===epoch&&turnDone&&audioDone)capture();},delay);}
  function begin(){if(enabled)return tail;epoch++;enabled=true;live=false;changed(true);return capture();}
  function voice(event){
   if(!enabled)return;
   if(event.phase==='listening'){
    if(!['chat','live'].includes(event.kind)){stop();return;}
    clear();id=event.id;live=event.kind==='live';turnDone=false;audioDone=true;return;
   }
   if(event.id&&event.id!==id)return;
   if(event.phase==='answer'){clear();audioDone=!spoken();}
   if(event.phase==='turnComplete'&&event.kind==='chat'){turnDone=true;resume();}
   if(event.phase==='error'){if(event.code==='no_speech'){audioDone=true;resume();}else stop();}
   if(['idle','liveStop'].includes(event.phase))stop();
  }
  function speech(phase){if(!enabled)return;if(['queued','processing','speaking'].includes(phase)){clear();audioDone=false;}else if(phase==='ready'){audioDone=true;resume();}else if(phase==='error')stop();}
  return{begin,stop,voice,speech,get enabled(){return enabled;}};
 }
 const api={createVoiceLoop};if(typeof module!=='undefined')module.exports=api;else root.NotchVoiceLoop=api;
})(globalThis);
