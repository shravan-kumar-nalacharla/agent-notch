import React,{useState,useEffect} from 'react';
import {createRoot,Root} from 'react-dom/client';
import {Theme} from '@astryxdesign/core/theme';
import {neutralTheme} from '@astryxdesign/theme-neutral/built';
import {Button} from '@astryxdesign/core/Button';
import {Switch} from '@astryxdesign/core/Switch';
import {TextInput} from '@astryxdesign/core/TextInput';
import {NumberInput} from '@astryxdesign/core/NumberInput';
import {Selector} from '@astryxdesign/core/Selector';
import {DateInput} from '@astryxdesign/core/DateInput';
import {TimeInput} from '@astryxdesign/core/TimeInput';
import {DateTimeInput} from '@astryxdesign/core/DateTimeInput';
type Native=HTMLInputElement|HTMLSelectElement;
const buttons=new Map<HTMLButtonElement,{root:Root,host:HTMLElement,signature:string}>();
const mounted=new Map<Native,{root:Root,host:HTMLElement,refresh:()=>void,label:HTMLElement|null,signature:string}>();
function Action({source}:{source:HTMLButtonElement}){return <Theme theme={neutralTheme} mode={document.body.classList.contains('theme-light')?'light':'dark'}><Button label={source.getAttribute('aria-label')||source.textContent||'Continue'} size="md" variant="secondary" isDisabled={source.disabled} onClick={event=>{event.preventDefault();event.stopPropagation();source.click();}}><span dangerouslySetInnerHTML={{__html:source.innerHTML}}/></Button></Theme>;}
function Control({source,label}:{source:Native,label:string}){
 const [value,setValue]=useState(source instanceof HTMLInputElement&&source.type==='checkbox'?source.checked:source.value);
 useEffect(()=>{const sync=()=>setValue(source instanceof HTMLInputElement&&source.type==='checkbox'?source.checked:source.value);source.addEventListener('change',sync);source.addEventListener('astryx:sync',sync);return()=>{source.removeEventListener('change',sync);source.removeEventListener('astryx:sync',sync);};},[source]);
 const type=source instanceof HTMLSelectElement?'select':source.type;
 const change=(next:any)=>{if(type==='checkbox')(source as HTMLInputElement).checked=!!next;else source.value=next==null?'':String(next);setValue(type==='checkbox'?!!next:source.value);source.dispatchEvent(new Event('input',{bubbles:true}));source.dispatchEvent(new Event('change',{bubbles:true}));};
 const props:any={label,isLabelHidden:type!=='checkbox'&&!source.closest('.astryx-native-label'),size:'sm',value,isDisabled:source.disabled,onChange:change,width:'100%',id:source.id?source.id+'--astryx':undefined};
 let content:React.ReactNode;
 if(type==='checkbox')content=<Switch {...props} size="md" isLabelHidden={false} labelPosition="start" labelSpacing="spread"/>;
 else if(type==='select')content=<Selector {...props} presentation="popover" options={Array.from((source as HTMLSelectElement).options).map(option=>({value:option.value,label:option.text,disabled:option.disabled}))}/>;
 else if(type==='number'){const input=source as HTMLInputElement;content=<NumberInput {...props} value={value===''?null:Number(value)} min={input.min?Number(input.min):undefined} max={input.max?Number(input.max):undefined} step={input.step&&input.step!=='any'?Number(input.step):1}/>;}
 else if(type==='date')content=<DateInput {...props} format="date" value={value||undefined} presentation="popover"/>;
 else if(type==='time')content=<TimeInput {...props} value={value||undefined} hourFormat="24h" presentation="popover"/>;
 else if(type==='datetime-local')content=<DateTimeInput {...props} value={value||undefined} hourFormat="24h" presentation="popover"/>;
 else content=<TextInput {...props} type={type==='search'?'search':type==='password'?'password':type==='url'?'url':'text'} placeholder={(source as HTMLInputElement).placeholder} isRequired={source.dataset.wasRequired==='true'} onEnter={()=>{source.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}));source.form?.requestSubmit();}}/>;
 return <Theme theme={neutralTheme} mode={document.body.classList.contains('theme-light')?'light':'dark'}><div className="astryx-field" data-component={'Astryx-'+type}>{content}</div></Theme>;
}
export function installAstryx(){
 let scheduled=0;
 function scan(force=false){scheduled=0;for(const [source,item] of mounted){if(!source.isConnected){item.root.unmount();mounted.delete(source);}else {if(item.label&&item.label.nextElementSibling!==item.host)item.label.after(item.host);if(item.label&&item.host.hidden!==item.label.hidden)item.host.hidden=item.label.hidden;const signature=source.value+'|'+source.disabled+'|'+(source instanceof HTMLSelectElement?source.innerHTML:(source.type==='checkbox'?source.checked:''));if(force||signature!==item.signature){item.signature=signature;item.refresh();source.dispatchEvent(new Event('astryx:sync'));}}}
 document.querySelectorAll<Native>('input,select').forEach(source=>{
  if(mounted.has(source)||source.closest('.astryx-control,.eleven-ui,#voiceLegacy,[role=dialog],[role=listbox]')||source.hidden||source.type==='hidden'||!source.getClientRects().length||source.id==='question'||source.id==='chatQuestion'||source.closest('#chat'))return;
  if(source instanceof HTMLInputElement&&!['checkbox','text','search','password','url','number','date','time','datetime-local'].includes(source.type))return;
  const owner=source.closest('label'),label=source.getAttribute('aria-label')||source.getAttribute('placeholder')||owner?.textContent?.trim()||source.name||'Choose value',host=document.createElement('div');host.className='astryx-control';source.dataset.wasRequired=String(source.required);source.required=false;source.dataset.astryxNative='true';
  if(owner&&owner.querySelectorAll('input,select,button').length===1){owner.after(host);owner.classList.add('astryx-native-label');source.hidden=true;host.hidden=(owner as HTMLElement).hidden;}else{source.after(host);source.hidden=true;}
  const root=createRoot(host),refresh=()=>root.render(<Control source={source} label={label}/>);mounted.set(source,{root,host,refresh,label:owner?.classList.contains('astryx-native-label')?owner as HTMLElement:null,signature:''});refresh();
 });
 for(const [source,item] of buttons){if(!source.isConnected){item.root.unmount();buttons.delete(source);continue;}const signature=source.innerHTML+'|'+source.disabled;if(force||signature!==item.signature){item.signature=signature;item.root.render(<Action source={source}/>);}}
 document.querySelectorAll<HTMLButtonElement>('#tools form button,.settings-savebar button,.region-ocr>button').forEach(source=>{if(buttons.has(source)||source.hidden||source.closest('.astryx-control')||!source.getClientRects().length)return;const host=document.createElement('span');host.className='astryx-control astryx-button';host.dataset.component='Astryx-button';source.after(host);source.hidden=true;const root=createRoot(host);buttons.set(source,{root,host,signature:source.innerHTML+'|'+source.disabled});root.render(<Action source={source}/>);});
 window.dispatchEvent(new Event('island:controls-ready'));
 }
 const schedule=()=>{if(!scheduled)scheduled=requestAnimationFrame(()=>scan());};
 new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden','disabled']});
 window.addEventListener('island:view',schedule);window.addEventListener('island:expanded',schedule);window.island.onSettings(()=>setTimeout(()=>scan(true),0));
 document.addEventListener('click',event=>{if((event.target as Element).closest('[data-settings-target]'))schedule();});scan();(window as any).islandAstryx={scan:()=>scan(true)};
}
