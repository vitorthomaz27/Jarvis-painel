/**
 * Script instalado nos sites dos clientes:
 *   <script src="https://API/public/embed.js" data-key="pj_..." defer></script>
 * - Conta cliques em links de WhatsApp (wa.me / api.whatsapp.com).
 * - Envia formulários marcados com data-jarvis-form para o painel.
 * - Expõe window.JarvisPainel.lead({...}) para sites com formulário próprio.
 * Usa text/plain para não disparar preflight de CORS.
 */
export const EMBED_JS = `(function(){
  var s=document.currentScript; if(!s) return;
  var key=s.getAttribute('data-key'); if(!key) return;
  var base=s.src.replace(/\\/public\\/embed\\.js.*$/,'');
  function payload(data){ var o={key:key,page:location.pathname}; for(var k in data){ if(data[k]!=null&&data[k]!=='') o[k]=data[k]; } return JSON.stringify(o); }
  function post(path,data){
    return fetch(base+path,{method:'POST',headers:{'Content-Type':'text/plain'},body:payload(data),keepalive:true})
      .then(function(r){ return r.json().catch(function(){return {};}).then(function(j){ if(!r.ok) throw j; return j; }); });
  }
  function beacon(path,data){
    var body=payload(data);
    if(navigator.sendBeacon){ try{ if(navigator.sendBeacon(base+path,new Blob([body],{type:'text/plain'}))) return; }catch(e){} }
    try{ fetch(base+path,{method:'POST',headers:{'Content-Type':'text/plain'},body:body,keepalive:true}); }catch(e){}
  }
  document.addEventListener('click',function(e){
    var a=e.target&&e.target.closest&&e.target.closest('a[href*="wa.me"],a[href*="api.whatsapp.com"],a[href^="whatsapp:"]');
    if(!a) return;
    beacon('/public/v1/events',{type:'whatsapp_click',location:a.getAttribute('data-jarvis-location')||a.getAttribute('data-ga-location')||''});
  },true);
  var qs=new URLSearchParams(location.search);
  var utm={utm_source:qs.get('utm_source'),utm_campaign:qs.get('utm_campaign')};
  function lead(data){ var d={}; for(var k in utm) d[k]=utm[k]; for(var j in data) d[j]=data[j]; return post('/public/v1/leads',d); }
  window.JarvisPainel={lead:lead};
  document.addEventListener('submit',function(e){
    var f=e.target; if(!f||!f.matches||!f.matches('form[data-jarvis-form]')) return;
    e.preventDefault();
    var d={}; new FormData(f).forEach(function(v,k){ if(typeof v==='string') d[k]=v; });
    var btn=f.querySelector('[type=submit]'); if(btn) btn.disabled=true;
    var ok=f.querySelector('[data-jarvis-ok]'), er=f.querySelector('[data-jarvis-error]');
    if(ok) ok.hidden=true; if(er) er.hidden=true;
    lead(d).then(function(){ f.reset(); if(ok) ok.hidden=false; f.dispatchEvent(new CustomEvent('jarvis:sent')); })
      .catch(function(err){ if(er) er.hidden=false; f.dispatchEvent(new CustomEvent('jarvis:error',{detail:err})); })
      .then(function(){ if(btn) btn.disabled=false; });
  });
})();
`;
