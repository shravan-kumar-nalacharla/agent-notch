'use strict';
// Adapted from Nūs companion/src/guide/voice.js, MIT, © 2026 Pranav Desu.
// Keep meaningful parenthesized/bracketed text; strip only known recognizer noise.
function cleanCommandTranscript(text){return String(text||'').replace(/\[(?:BLANK_AUDIO|SILENCE|NO_SPEECH|MUSIC)\]|\((?:silence|wind blowing|background noise)\)/gi,'').replace(/\s+/g,' ').trim();}
function isStopRequest(text){return /^(?:please )?(?:stop|cancel)(?: (?:the |this |my )?(?:windows )?(?:task|action|automation))?[.!]?$/i.test(cleanCommandTranscript(text));}
function voiceControlRequest(text){const value=cleanCommandTranscript(text).toLowerCase().replace(/[.!?]+$/,'');return /^(?:please )?(?:stop|stop speaking|stop talking)$/.test(value)?'stop':/^(?:please )?(?:hide|hide yourself|quit)$/.test(value)?'hide':null;}
module.exports={cleanCommandTranscript,isStopRequest,voiceControlRequest};
