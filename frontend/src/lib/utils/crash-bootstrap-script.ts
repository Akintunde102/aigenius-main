/**
 * Inline page script. It installs before React so a crash during startup
 * can still reach the API. The body is text/plain so the browser sends it
 * without a CORS preflight.
 */
export function buildCrashBootstrapScript(apiRoot: string): string {
  const root = apiRoot.trim().replace(/\/$/, '');
  if (!root) {
    return '';
  }

  const endpoint = JSON.stringify(`${root}/client-errors`);
  return `(function(){
if(window.__aigCrashInstalled)return;
window.__aigCrashInstalled=true;
var endpoint=${endpoint};
var recent={};
function clip(value,max){
  var text=String(value==null?'':value);
  text=text.replace(/https?:\\/\\/[^\\s)'"]+/g,function(url){
    try{var u=new URL(url);return u.origin+u.pathname;}catch(e){return '[url]';}
  });
  text=text.replace(/[\\w.+-]+@[\\w.-]+\\.[a-z]{2,}/gi,'[email]');
  text=text.replace(/\\b(bearer|token|api[_-]?key|authorization|password)\\b\\s*[:=]\\s*\\S+/gi,'$1=[redacted]');
  text=text.replace(/\\b(?:sk|pk|phc|rk)_[A-Za-z0-9]+\\b/g,'[key]');
  return text.slice(0,max);
}
function send(payload){
  var key=payload.source+':'+payload.name+':'+String(payload.message).slice(0,180);
  var now=Date.now();
  if(recent[key]&&now-recent[key]<10000)return;
  recent[key]=now;
  var body=JSON.stringify(payload);
  try{
    if(navigator.sendBeacon){
      var blob=new Blob([body],{type:'text/plain'});
      if(navigator.sendBeacon(endpoint,blob))return;
    }
  }catch(e){}
  try{
    fetch(endpoint,{method:'POST',headers:{'Content-Type':'text/plain'},body:body,keepalive:true,credentials:'omit'});
  }catch(e){}
}
window.__aigReportCrash=function(payload){
  if(!payload||!payload.message)return;
  send({
    name:clip(payload.name||'Error',80),
    message:clip(payload.message,500),
    source:clip(payload.source||'client',40),
    stack:payload.stack?clip(payload.stack,4000):undefined,
    path:payload.path?clip(String(payload.path).split('?')[0],200):undefined,
    digest:payload.digest?clip(payload.digest,80):undefined,
    componentStack:payload.componentStack?clip(payload.componentStack,1500):undefined
  });
};
function fromError(error,source){
  var err=error instanceof Error?error:new Error(error?String(error):'Unknown client error');
  var msg=err.message||'';
  var name=err.name||'';
  if(name==='ChunkLoadError'||/Loading chunk .* failed/i.test(msg))return;
  var path='';
  try{path=location.pathname;}catch(e){}
  window.__aigReportCrash({
    name:err.name,
    message:err.message,
    source:source,
    stack:err.stack,
    path:path
  });
}
window.addEventListener('error',function(event){
  if(event.target&&event.target!==window)return;
  fromError(event.error||event.message,'window.onerror');
});
window.addEventListener('unhandledrejection',function(event){
  fromError(event.reason,'unhandledrejection');
});
})();`;
}
