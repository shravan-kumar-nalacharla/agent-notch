export type ModuleState = {status:'ready';lastUpdated:number}|{status:'disabled'|'permission-required'|'unsupported'|'offline'|'error';reason:string};
export type WindowBehavior = 'normal'|'line'|'hide';
export interface WindowRule {process:string;fullscreen:WindowBehavior;maximized:WindowBehavior}
export interface ToolDefinition {id:string;version:number;enabledByDefault:boolean;requiredCapabilities:string[];privacyCategory:'local'|'network'|'sensitive';settingsSchemaVersion:number}
export interface NotificationEvent {id:string;source:string;category:'timer'|'water'|'task'|'calendar'|'agent'|'system'|'plugin';priority:number;createdAt:number;visibleUntil?:number;replaceKey?:string;privacy:'public'|'private'|'secret';actions?:{id:string;label:string;requiresApproval?:boolean}[]}
export interface MediaSnapshot {available:boolean;app?:string;title?:string;artist?:string;duration?:number;position?:number;pinnedAppId:string;sources:{appId:string;playing:boolean}[];capabilities?:{play:boolean;pause:boolean;next:boolean;previous:boolean;seek:boolean;shuffle:boolean;repeat:boolean}}
export interface WorkspaceRequest {version:1;op:string;value:Record<string,unknown>}
