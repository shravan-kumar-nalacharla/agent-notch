import React,{useState,useEffect} from 'react';
import {createRoot} from 'react-dom/client';
import {createPortal,flushSync} from 'react-dom';
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
function valueOf(source:Native){return source instanceof HTMLInputElement&&source.type==='checkbox'?source.checked:source.value;}
function labelOf(source:Native){
 const owner=source.closest('label')?.cloneNode(true) as HTMLElement|undefined;
 owner?.querySelectorAll('input,select,textarea,button').forEach(node=>node.remove());
 return source.getAttribute('aria-label')||owner?.textContent?.trim()||source.getAttribute('placeholder')||source.name||'Choose value';
}
function Control({source,label}:{source:Native,label:string}){
 const [value,setValue]=useState(valueOf(source));
 useEffect(()=>{const sync=()=>setValue(valueOf(source));source.addEventListener('change',sync);source.addEventListener('astryx:sync',sync);return()=>{source.removeEventListener('change',sync);source.removeEventListener('astryx:sync',sync);};},[source]);
 const type=source instanceof HTMLSelectElement?'select':source.type;
 const change=(next:any)=>{
  if(type==='checkbox')(source as HTMLInputElement).checked=!!next;else source.value=next==null?'':String(next);
  setValue(valueOf(source));
  source.dispatchEvent(new Event('input',{bubbles:true}));source.dispatchEvent(new Event('change',{bubbles:true}));
 };
 const props:any={label,isLabelHidden:type!=='checkbox'&&!source.closest('.astryx-native-label'),size:'sm',value,isDisabled:source.disabled,onChange:change,width:'100%',id:source.id?source.id+'--astryx':undefined};
 let content:React.ReactNode;
 if(type==='checkbox')content=<Switch {...props} size="md" isLabelHidden={false} labelPosition="start" labelSpacing="spread"/>;
 else if(type==='select')content=<Selector {...props} presentation="popover" options={Array.from((source as HTMLSelectElement).options).map(option=>({value:option.value,label:option.text,disabled:option.disabled}))}/>;
 else if(type==='number'){const input=source as HTMLInputElement;content=<NumberInput {...props} value={value===''?null:Number(value)} min={input.min?Number(input.min):undefined} max={input.max?Number(input.max):undefined} step={input.step&&input.step!=='any'?Number(input.step):1}/>;}
 else if(type==='date')content=<DateInput {...props} format="date" value={value||undefined} presentation="popover"/>;
 else if(type==='time')content=<TimeInput {...props} value={value||undefined} hourFormat="24h" presentation="popover"/>;
 else if(type==='datetime-local')content=<DateTimeInput {...props} value={value||undefined} hourFormat="24h" presentation="popover"/>;
 else content=<TextInput {...props} type={type==='search'?'search':type==='password'?'password':type==='url'?'url':'text'} placeholder={(source as HTMLInputElement).placeholder} isRequired={source.dataset.wasRequired==='true'} onEnter={()=>{source.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}));source.form?.requestSubmit();}}/>;
 return <div className="astryx-field" data-component={'Astryx-'+type}>{content}</div>;
}
function Action({source}:{source:HTMLButtonElement}){
 return <Button label={source.getAttribute('aria-label')||source.textContent||'Continue'} size="md" variant="secondary" isDisabled={source.disabled} onClick={event=>{event.preventDefault();event.stopPropagation();source.click();}}><span dangerouslySetInnerHTML={{__html:source.innerHTML}}/></Button>;
}
export function installAstryx(){
 const themeHost=document.createElement('div');themeHost.className='astryx-theme-root';document.body.append(themeHost);
 const root=createRoot(themeHost);
 type Item={host:HTMLElement,owner:HTMLElement|null,key:number,label:string,signature:string};
 const fields=new Map<Native,Item>(),buttons=new Map<HTMLButtonElement,Item>();let sequence=0,scheduled=0,firstPaint=true;
 const signature=(source:Native)=>String(valueOf(source))+'|'+source.disabled+'|'+(source instanceof HTMLSelectElement?source.innerHTML:'');
 function render(){const tree=<Theme theme={neutralTheme} mode={document.body.classList.contains('theme-light')?'light':'dark'}>{[...fields].map(([source,item])=>createPortal(<Control source={source} label={item.label}/>,item.host,String(item.key)))}{[...buttons].map(([source,item])=>createPortal(<Action source={source}/>,item.host,String(item.key)))}</Theme>;if(firstPaint){firstPaint=false;flushSync(()=>root.render(tree));}else root.render(tree);}
 function scan(force=false){
  scheduled=0;let changed=force;
  for(const [source,item] of fields){
   if(!source.isConnected){item.host.remove();fields.delete(source);changed=true;continue;}
   if(item.owner&&item.owner.nextElementSibling!==item.host)item.owner.after(item.host);
   if(item.owner&&item.host.hidden!==item.owner.hidden)item.host.hidden=item.owner.hidden;
   const next=signature(source);if(force||next!==item.signature){item.signature=next;source.dispatchEvent(new Event('astryx:sync'));changed=true;}
  }
  document.querySelectorAll<Native>('input,select').forEach(source=>{
   if(fields.has(source)||source.closest('.astryx-control,.astryx-theme-root,.eleven-ui,#voiceLegacy,[role=dialog],[role=listbox]')||source.hidden||source.type==='hidden'||!source.getClientRects().length||source.id==='question'||source.id==='chatQuestion'||source.closest('#chat'))return;
   if(source instanceof HTMLInputElement&&!['checkbox','text','search','password','url','number','date','time','datetime-local'].includes(source.type))return;
   const owner=source.closest('label'),host=document.createElement('div'),label=labelOf(source);host.className='astryx-control';source.dataset.wasRequired=String(source.required);source.required=false;source.dataset.astryxNative='true';
   const solo=owner&&owner.querySelectorAll('input,select,button').length===1;
   if(solo){owner.after(host);owner.classList.add('astryx-native-label');host.hidden=owner.hidden;}else source.after(host);
   source.hidden=true;fields.set(source,{host,owner:solo?owner:null,label,key:++sequence,signature:signature(source)});changed=true;
  });
  for(const [source,item] of buttons){if(!source.isConnected){item.host.remove();buttons.delete(source);changed=true;continue;}const next=source.innerHTML+'|'+source.disabled;if(next!==item.signature){item.signature=next;changed=true;}}
  document.querySelectorAll<HTMLButtonElement>('#tools form button,.settings-savebar button,.region-ocr>button').forEach(source=>{
   if(buttons.has(source)||source.hidden||source.closest('.astryx-control')||!source.getClientRects().length)return;
   const host=document.createElement('span');host.className='astryx-control astryx-action-host';host.dataset.component='Astryx-button';source.after(host);source.hidden=true;source.dataset.astryxNative='true';buttons.set(source,{host,owner:null,label:'',key:++sequence,signature:source.innerHTML+'|'+source.disabled});changed=true;
  });
  if(changed)render();
  window.dispatchEvent(new Event('island:controls-ready'));
 }
 const schedule=()=>{if(!scheduled)scheduled=requestAnimationFrame(()=>scan());};
 new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden','disabled']});
 window.addEventListener('island:view',schedule);window.addEventListener('island:expanded',schedule);window.island.onSettings(()=>setTimeout(()=>scan(true),0));
 document.addEventListener('click',event=>{if((event.target as Element).closest('[data-settings-target]'))schedule();});
 scan();(window as any).islandAstryx={scan:()=>scan(true),stats:()=>({roots:1,fields:fields.size,buttons:buttons.size})};
}
