'use strict';
const xml=value=>String(value).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,' ').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const SOUNDS={default:'Notification.Default',book:'Notification.IM',course:'Notification.Mail',workout:'Notification.Reminder'};
function createWindowsReminders({Notification,onAction,onFunctionalNotification=()=>{},getLanguage=()=>'en',now=Date.now}){
  const retained=new Map(),timeouts=new Set(),t=value=>require('./productivity-i18n.js').t(value,getLanguage());
  function activate(argumentsValue){
    try{if(typeof argumentsValue!=='string'||argumentsValue.length>20000)return;const value=new URLSearchParams(argumentsValue);if(value.get('app')!=='notch-reminder')return;const ids=(value.get('ids')||'').split(',');onAction({ids,action:value.get('action')||'open',token:value.get('token'),source:'windows',minutes:Number(value.get('minutes'))||undefined});}catch{}
  }
  function deliver(request){
    const{ids,token,content,settings,context}=request;if(!Notification.isSupported()){request.onFailure('Windows notifications are unavailable.');return;}
    const args=action=>new URLSearchParams({app:'notch-reminder',ids:ids.join(','),token,action}).toString();
    const primary=content.digest?'open':content.kind==='water'?'drink':['book','workout'].includes(content.kind)?'start':'open',primaryLabel=content.digest?'Open reminders':content.kind==='water'?'+250 ml':content.kind==='book'?'Start reading':content.kind==='workout'?'Start workout':'Open item';
    const profile=content.soundId===null?'silent':content.soundId||settings.categories[content.kind]?.sound||'default',muted=!settings.sounds||profile==='silent'||settings.muteDuringMedia&&context.mediaPlaying;
    const sound=SOUNDS[profile]||SOUNDS.default;
    const title=settings.privacy?'Agent Notch · Reminder':content.title,body=settings.privacy?'A reminder is ready. Open Agent Notch for details.':content.body;
    const toastXml=`<toast launch="${xml(args('open'))}" duration="short"><visual><binding template="ToastGeneric"><text>${xml(title)}</text><text>${xml(body)}</text></binding></visual><audio ${muted?'silent="true"':`src="ms-winsoundevent:${sound}"`}/><actions><input id="snoozeMinutes" type="selection" defaultInput="${settings.snoozeMinutes}"><selection id="5" content="5 min"/><selection id="10" content="10 min"/><selection id="15" content="15 min"/><selection id="30" content="30 min"/></input><action content="${xml(t(primaryLabel))}" arguments="${xml(args(primary))}" activationType="foreground"/><action content="${xml(t('Snooze'))}" arguments="${xml(args('snooze'))}" activationType="foreground"/><action content="${xml(t('Dismiss'))}" arguments="${xml(args('dismiss'))}" activationType="foreground"/></actions></toast>`;
    const notification=new Notification({id:ids[0].replace(/-/g,'').slice(0,16),groupId:'agent-notch-reminders',title,body,toastXml});retained.set(ids[0],notification);
    let observed=false;const timeout=setTimeout(()=>{if(!observed){observed=true;request.onUnknown();}},10000);timeout.unref?.();timeouts.add(timeout);
    notification.once('show',()=>{if(observed)return;observed=true;clearTimeout(timeout);request.onShow();onFunctionalNotification({at:now(),ids});});
    notification.once('failed',(_event,error)=>{observed=true;clearTimeout(timeout);request.onFailure(error||'Windows rejected the reminder notification.');retained.delete(ids[0]);});
    notification.once('close',()=>{clearTimeout(timeout);timeouts.delete(timeout);if(!observed){observed=true;request.onUnknown();}retained.delete(ids[0]);});
    notification.show();
  }
  // Selection input is provided separately by Windows; never trust an arbitrary action URL.
  Notification.handleActivation?.(details=>{try{const input=details.userInputs?.snoozeMinutes;if(input&&details.arguments){const args=new URLSearchParams(details.arguments);if(args.get('action')==='snooze')args.set('minutes',input);activate(args.toString());}else activate(details.arguments);}catch{}});
  return{deliver,close(){for(const timer of timeouts)clearTimeout(timer);timeouts.clear();for(const notification of retained.values())notification.removeAllListeners();retained.clear();},retained};
}
module.exports={createWindowsReminders,SOUNDS};
