'use strict';
function sensitiveClipboard(value){
 if(typeof value!=='string'||!value.trim()||value.length>20000)return true;
 return /-----BEGIN (?:[A-Z ]*PRIVATE KEY|PGP PRIVATE)|\b(?:sk|gsk|ghp|github_pat)[_-][A-Za-z0-9_-]{15,}|\bAIza[A-Za-z0-9_-]{20,}|\bBearer\s+\S+|(?:password|passwd|api[_ -]?key|access[_ -]?token|client[_ -]?secret)\s*[=:]\s*\S+|[?&#](?:access_token|refresh_token|token|secret|api_key|code)=/i.test(value);
}
module.exports={sensitiveClipboard};
