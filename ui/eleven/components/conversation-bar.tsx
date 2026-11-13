// Adapted from ElevenLabs UI, MIT; see ../SOURCES.json and the bundled license.
import * as React from 'react';
import {ArrowUpIcon,SquareIcon} from 'lucide-react';
import {useConversationControls,useConversationStatus} from '../native-voice';
import {Button} from './button';
export interface ConversationBarProps{
 agentId?:string;className?:string;waveformClassName?:string;speechInput?:React.ReactNode;
 busy?:boolean;onStop?:()=>void;onSendMessage?:(text:string)=>void;
}
export const ConversationBar=React.forwardRef<HTMLDivElement,ConversationBarProps>(({className='',speechInput,busy,onStop,onSendMessage},ref)=>{
 const{transcript}=useConversationStatus(),{sendUserMessage}=useConversationControls();
 const[text,setText]=React.useState('');
 React.useEffect(()=>{if(transcript)setText(transcript)},[transcript]);
 const send=()=>{if(busy||!text.trim())return;const message=text;setText('');if(onSendMessage)onSendMessage(message);else sendUserMessage(message);};
 return <div ref={ref} className={'chatgpt-composer '+className} data-slot="card"><div className="chat-input-row"><textarea id="chatQuestion" aria-label="Chat message" placeholder="Ask anything…" rows={1} value={text} onChange={event=>setText(event.target.value)} onKeyDown={event=>{if(event.key==='Enter'&&!event.shiftKey&&!event.repeat&&!event.nativeEvent.isComposing){event.preventDefault();if(event.nativeEvent.isTrusted)window.NotchSounds?.play('enter');send();}}}/></div><div className="chat-composer-actions"><div className="chat-composer-voice">{speechInput}</div><Button id="chatSend" size="icon" aria-label={busy?'Stop response':'Send message'} disabled={!busy&&!text.trim()} onClick={busy?onStop:send}>{busy?<SquareIcon/>:<ArrowUpIcon/>}</Button></div></div>;
});
ConversationBar.displayName='ConversationBar';
