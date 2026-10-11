/* SMTinel 8D Railway Bridge V20.25.3.
   Lazy: no Railway or Supabase calls until Export Center is opened.
   Auth token stays in memory; no presentation/credentials in localStorage. */
(function () {
  'use strict';
  if (window.__SMTINEL_8D_RAILWAY_BRIDGE__) return;
  window.__SMTINEL_8D_RAILWAY_BRIDGE__ = true;
  var BASE = String(window.SMTINEL_8D_API_BASE || 'https://smtinel-production.up.railway.app/api/8d').replace(/\/+$/, '');
  var MAX = 60 * 1024 * 1024;
  var token = '', pendingFile = null, lastObjectUrl = '', ready = false, auth = null, running = false;
  var activeRoot = null;
  var CSS = [
    '.s8bridge{margin:14px 0;padding:17px;background:linear-gradient(125deg,#251821,#11161b);color:#f7f5f5;border:1px solid #8f4158;border-radius:18px;font-family:Inter,Segoe UI,Arial,sans-serif}',
    '.s8bridge *{box-sizing:border-box}.s8bridge .s8head{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:12px}.s8bridge .s8head b{color:#fff;font-size:18px}.s8bridge .s8tag{color:#e9a9b6;font-size:10px;letter-spacing:.07em;font-weight:800}',
    '.s8bridge .s8drop{display:flex;flex-direction:column;justify-content:center;align-items:center;gap:7px;min-height:108px;padding:15px;text-align:center;border:1.5px dashed #b86b82;border-radius:13px;background:rgba(168,40,73,.15);cursor:pointer;color:#fff}.s8bridge .s8drop strong{font-size:15px}.s8bridge .s8drop small{font-size:12px;color:#d0c0c5}.s8bridge .s8drop.drag{background:rgba(212,65,103,.35);border-color:#f589a5}',
    '.s8bridge .s8actions{display:flex;align-items:center;gap:9px;flex-wrap:wrap;margin-top:11px}.s8bridge button,.s8bridge a.s8download{border:1px solid #9b5a70;border-radius:9px;background:#a52b4c;color:#fff;padding:10px 13px;font:700 12px Inter,Arial,sans-serif;min-height:40px;text-decoration:none;cursor:pointer}.s8bridge button.secondary{background:transparent;color:#efc6d0}.s8bridge button:disabled{opacity:.48;cursor:not-allowed}',
    '.s8bridge .s8status{font-size:12px;line-height:1.55;color:#ecc1cc;margin:11px 0 0;overflow-wrap:anywhere}.s8bridge .s8status[data-type=good]{color:#a0e0bd}.s8bridge .s8status[data-type=bad]{color:#ff91a5}.s8bridge [hidden]{display:none!important}.s8bridge .s8login{border-top:1px solid #624350;margin-top:12px;padding-top:13px}.s8bridge .s8login form{display:grid;grid-template-columns:1fr 1fr auto;gap:8px;align-items:end}.s8bridge label.field{font-size:12px;color:#dac7cf}.s8bridge input.cred{display:block;width:100%;margin-top:5px;min-width:0;background:#211e27;border:1px solid #896577;color:#fff;border-radius:8px;padding:9px;font-size:14px}.s8bridge .s8note{font-size:11px;color:#c9bbc2;line-height:1.5;margin:11px 0 0}',
    '@media(max-width:700px){.s8bridge{padding:13px}.s8bridge .s8login form{grid-template-columns:1fr}.s8bridge .s8actions button,.s8bridge a.s8download{flex:1;text-align:center}}'
  ].join('') + "#smtinel8dRailwayBridge{width:100%!important;max-width:100%!important;min-width:0!important;margin:12px 0!important;overflow-wrap:anywhere;isolation:isolate}#smtinel8dRailwayBridge *{min-width:0}#smtinel8dRailwayBridge .s8head b,#smtinel8dRailwayBridge .s8drop strong{color:#fff!important;text-shadow:none!important;opacity:1!important}#smtinel8dRailwayBridge .s8drop{color:#fff!important;min-width:0!important;max-width:100%!important}#smtinel8dRailwayBridge .s8drop small{color:#e5d2d8!important;opacity:1!important}#smtinel8dRailwayBridge .s8tag{color:#ffbecf!important}#smtinel8dRailwayBridge .s8status{color:#ffe0e9!important;font-size:13px!important;line-height:1.5!important}#smtinel8dRailwayBridge .s8status[data-type=good]{color:#a7efc7!important}#smtinel8dRailwayBridge .s8status[data-type=bad]{color:#ff9aaf!important}#smtinel8dRailwayBridge .s8note{color:#d5c8ce!important;font-size:12px!important}#smtinel8dRailwayBridge button{color:#fff!important}#smtinel8dRailwayBridge button.secondary{background:#261c28!important;color:#ffcad7!important;border-color:#a76a7e!important}#smtinel8dRailwayBridge .s8drop.disabled{opacity:.8;cursor:not-allowed;background:rgba(90,50,62,.22)}#smtinel8dRailwayBridge .s8drop:focus-visible{outline:3px solid #ff8ca7;outline-offset:3px}@media(max-width:700px){html,body{min-width:0!important;max-width:100%!important;overflow-x:hidden!important}#exportLanding{width:100%!important;max-width:100%!important;min-width:0!important;overflow-x:hidden!important;padding-left:12px!important;padding-right:12px!important}#emailModal,#emailModal .dialog.export-dialog,#emailModal .dialog-body{min-width:0!important;max-width:100%!important}#smtinel8dRailwayBridge{padding:14px!important;border-radius:14px!important}#smtinel8dRailwayBridge .s8head{align-items:flex-start!important}#smtinel8dRailwayBridge .s8head b{font-size:17px!important}#smtinel8dRailwayBridge .s8drop{min-height:105px!important;padding:14px 9px!important}#smtinel8dRailwayBridge .s8actions{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px!important}#smtinel8dRailwayBridge .s8actions button{width:100%!important;min-width:0!important;white-space:normal!important;padding:10px 7px!important;font-size:13px!important}#smtinel8dRailwayBridge .s8actions .s8refresh,#smtinel8dRailwayBridge .s8actions .s8download{grid-column:1/-1!important}#smtinel8dRailwayBridge .s8login form{grid-template-columns:minmax(0,1fr)!important}#smtinel8dRailwayBridge .s8note{line-height:1.5!important}}";
  function message(root, text, type) {
    var node = root.querySelector('.s8status');
    node.textContent = text;
    node.dataset.type = type || 'info';
  }
  async function readJSON(url, options) {
    var res = await fetch(url, Object.assign({mode:'cors',credentials:'omit',cache:'no-store'}, options || {}));
    var body = await res.json().catch(function(){return {};});
    if (!res.ok) throw new Error(body.detail || body.msg || body.error_description || 'HTTP ' + res.status);
    return body;
  }
  function resetOutput(root) {
    var a = root.querySelector('.s8download');
    if (lastObjectUrl) URL.revokeObjectURL(lastObjectUrl);
    lastObjectUrl = '';
    a.hidden = true;
    a.removeAttribute('href');
  }
  function authPanel(root, visible) {
    root.querySelector('.s8login').hidden = !visible;
    var email = root.querySelector('.s8email');
    email.hidden = !(auth && auth.mode === 'supabase');
    root.querySelector('.s8password').placeholder = email.hidden ? 'Clave de acceso temporal' : 'Contraseña';
    if (visible) root.querySelector(email.hidden ? '.s8password' : '.s8email input').focus();
  }
  function updateAccess(root) {
    root.querySelector('.s8access').textContent = token ? 'Cerrar acceso' : 'Acceso 8D';
  }
  async function check(root) {
    message(root, 'Comprobando motor Railway...', 'info');
    root.querySelector('.s8refresh').disabled = true;
    try {
      var x = await Promise.all([readJSON(BASE+'/health'), readJSON(BASE+'/auth-config')]);
      if (!root.isConnected) return;
      var health=x[0];auth=x[1];ready=health.ready===true && auth.configured===true;
      root.querySelector('.s8choose').disabled = !ready;
      root.querySelector('.s8access').disabled = !ready;
      root.querySelector('#s8file').disabled = !ready;
      root.querySelector('.s8drop').classList.toggle('disabled',!ready);
      root.querySelector('.s8drop').setAttribute('aria-disabled',String(!ready));
      if (ready) message(root, 'Motor disponible. Selecciona un PPT/PPTX; solo se enviará cuando autorices la conversión.', 'good');
      else if (health.converter_enabled===false || health.status==='disabled') message(root,'Railway y LibreOffice están operativos. Falta configurar el acceso autorizado y activar SMTINEL_CONVERTER_ENABLED=1 en Railway. No se ha enviado ningún archivo.', 'info');
      else if (!health.libreoffice_available) message(root,'LibreOffice no está disponible en Railway. Comprueba el contenedor Docker.','bad');
      else if (!auth.configured) message(root,'El motor está disponible, pero falta configurar el acceso 8D en Railway (Supabase Auth o token independiente).','info');
      else message(root,'El servicio aún no está disponible. Revisa las variables de Railway.','bad');
    } catch (err) {
      ready=false;
      root.querySelector('.s8choose').disabled=true;root.querySelector('.s8access').disabled=true;
      root.querySelector('#s8file').disabled=true;
      root.querySelector('.s8drop').classList.add('disabled');
      root.querySelector('.s8drop').setAttribute('aria-disabled','true');
      message(root, 'No se pudo contactar Railway: '+String(err.message||err)+'. Verifica la conexión y vuelve a comprobar.', 'bad');
    } finally {
      if(root.isConnected) root.querySelector('.s8refresh').disabled=false;
    }
  }
  async function signIn(root) {
    if (running || !auth) return;
    var passwordField=root.querySelector('.s8password'),password=passwordField.value;
    try {
      if (!password) throw new Error('Introduce la contraseña o clave.');
      if (auth.mode==='supabase') {
        var email=root.querySelector('.s8email input').value.trim();
        if (!email || !auth.supabase_url || !auth.supabase_anon_key) throw new Error('Faltan correo o ajustes de Supabase Auth.');
        var response=await readJSON(auth.supabase_url.replace(/\/+$/,'')+'/auth/v1/token?grant_type=password',{
          method:'POST',headers:{'apikey':auth.supabase_anon_key,'content-type':'application/json'},
          body:JSON.stringify({email:email,password:password})
        });
        if (!response.access_token) throw new Error('No se recibió token de sesión.');
        token=String(response.access_token);
      } else if(auth.mode==='token') token=password;
      else throw new Error('Modo de autenticación no soportado.');
      passwordField.value='';
      updateAccess(root);authPanel(root,false);
      message(root,'Acceso temporal autorizado. Preparando conversión...', 'good');
      if (pendingFile) { var file=pendingFile;pendingFile=null;await convert(root,file); }
    } catch(err) {
      token='';passwordField.value='';updateAccess(root);
      message(root, 'Acceso rechazado: '+String(err.message||err), 'bad');
    }
  }
  async function convert(root, file) {
    if (running || !file) return;
    if (!ready) { message(root,'Railway aún no permite conversiones. Configura el acceso y activa el servicio; tu presentación no se ha enviado.','bad'); return; }
    if (!/\.pptx?$/i.test(file.name||'')) { message(root,'Solo se admiten PPT y PPTX.','bad');return; }
    if (!file.size || file.size>MAX) {message(root,'El archivo debe ser menor de 60 MiB y no estar vacío.','bad');return;}
    if (!token) {pendingFile=file;authPanel(root,true);message(root,'Inicia sesión para convertir. Tu archivo todavía no se ha enviado.');return;}
    running=true;root.querySelector('.s8choose').disabled=true;resetOutput(root);
    message(root,'Procesando '+file.name+' ('+(file.size/1048576).toFixed(1)+' MiB). Conservando las diapositivas y adjuntos...');
    var abort=new AbortController(),timeout=setTimeout(function(){abort.abort();},330000);
    try {
      var form=new FormData();form.append('file',file,file.name);
      var res=await fetch(BASE+'/convert',{
        method:'POST',mode:'cors',credentials:'omit',cache:'no-store',
        headers:{'Authorization':'Bearer '+token},body:form,signal:abort.signal
      });
      if (!res.ok) {
        var body=await res.json().catch(function(){return {};});
        if (res.status===401 || res.status===403) {token='';updateAccess(root);authPanel(root,true);}
        throw new Error(body.detail || 'HTTP '+res.status);
      }
      var output=await res.blob();
      if (output.size<500 || output.size>100*1024*1024) throw new Error('El HTML devuelto está incompleto o excede el límite.');
      lastObjectUrl=URL.createObjectURL(new Blob([output],{type:'text/html;charset=utf-8'}));
      var a=root.querySelector('.s8download');
      a.href=lastObjectUrl;
      a.download='SMTinel_8D_Interactive_'+file.name.replace(/\.pptx?$/i,'').replace(/[^a-zA-Z0-9_-]/g,'_').slice(0,80)+'.html';
      a.hidden=false;
      message(root,'Conversión lista: '+(output.size/1048576).toFixed(2)+' MiB. Descarga tu HTML autónomo.', 'good');
      // Manual click is reliable in Safari's Files preview and does not trigger popup blocking.
    } catch(err) {
      message(root,'Falló la conversión: '+String(err.message||err)+'. No se generó ningún reporte.', 'bad');
    } finally {
      clearTimeout(timeout);running=false;
      if(root.isConnected)root.querySelector('.s8choose').disabled=!ready;
    }
  }
  function mount(frame) {
    try {
      var doc=frame&&frame.contentDocument;
      if (!doc) return;
      var landing=doc.getElementById('exportLanding');
      if (!landing || !doc.head || doc.getElementById('smtinel8dRailwayBridge')) return;
      var cssNode=doc.createElement('style');cssNode.id='smtinel8dBridgeStyles';cssNode.textContent=CSS;doc.head.appendChild(cssNode);
      // Detach obsolete V20.24 same-origin handlers rather than double-upload.
      var old=doc.getElementById('smtinel8dDropWidget');if(old)old.remove();
      var root=doc.createElement('section');root.id='smtinel8dRailwayBridge';root.className='s8bridge';
      root.setAttribute('aria-label','SMTinel convertidor PowerPoint a HTML');
      root.innerHTML=
        '<div class="s8head"><b>8D Interactive Exporter</b><span class="s8tag">SHAININ RED X · PPT/PPTX → HTML</span></div>'+
        '<label class="s8drop disabled" for="s8file" tabindex="0" role="button" aria-disabled="true"><strong>Arrastra tu PPT / PPTX aquí</strong><small>O selecciona una presentación · Máximo 60 MiB</small></label>'+
        '<input id="s8file" type="file" accept=".ppt,.pptx" hidden disabled>'+
        '<div class="s8actions"><button class="s8choose" type="button" disabled>Elegir presentación</button><button class="s8access secondary" type="button" disabled>Acceso 8D</button><button class="s8refresh secondary" type="button">Revisar conexión</button><a class="s8download" download hidden>Descargar HTML</a></div>'+
        '<div class="s8status" role="status" aria-live="polite">Comprobando motor...</div>'+
        '<div class="s8login" hidden><div style="font-size:12px;margin-bottom:10px">Acceso independiente · Solo para conversiones 8D</div><form autocomplete="off"><label class="field s8email">Correo<input class="cred" type="email" autocomplete="username"></label><label class="field">Contraseña / clave<input class="cred s8password" type="password" autocomplete="off" required></label><button type="submit">Entrar y convertir</button></form></div>'+
        '<p class="s8note">La conversión utiliza Railway únicamente bajo demanda. No se almacenan PowerPoints ni HTML en Supabase, GitHub o el navegador.</p>';
      var foot=landing.querySelector('.export-landing-foot');if(foot)landing.insertBefore(root,foot);else landing.appendChild(root);
      activeRoot=root;
      var input=root.querySelector('#s8file'),drop=root.querySelector('.s8drop');
      root.querySelector('.s8choose').addEventListener('click',function(){if(ready)input.click();});
      root.querySelector('.s8refresh').addEventListener('click',function(){check(root);});
      drop.addEventListener('keydown',function(e){if((e.key==='Enter'||e.key===' ')&&ready){e.preventDefault();input.click();}});
      input.addEventListener('change',function(){if(input.files&&input.files[0])convert(root,input.files[0]);input.value='';});
      root.querySelector('.s8access').addEventListener('click',function(){
        if(token){token='';pendingFile=null;updateAccess(root);authPanel(root,false);message(root,'Sesión de 8D cerrada. Los demás módulos no se alteraron.');}
        else authPanel(root,root.querySelector('.s8login').hidden);
      });
      root.querySelector('form').addEventListener('submit',function(e){e.preventDefault();signIn(root);});
      ['dragenter','dragover'].forEach(function(type){drop.addEventListener(type,function(e){e.preventDefault();drop.classList.add('drag');});});
      ['dragleave','dragend'].forEach(function(type){drop.addEventListener(type,function(e){e.preventDefault();drop.classList.remove('drag');});});
      drop.addEventListener('drop',function(e){e.preventDefault();drop.classList.remove('drag');if(e.dataTransfer&&e.dataTransfer.files[0])convert(root,e.dataTransfer.files[0]);});
      // Lazy health check: never contacts Supabase during ordinary SMTinel navigation.
      check(root);
    } catch(e){console.warn('[SMTinel 8D bridge]',e);}
  }
  function ensureMobileParentStyles() {
    if (document.getElementById('smtinel8dMobileParentFix')) return;
    var style=document.createElement('style');
    style.id='smtinel8dMobileParentFix';
    style.textContent="@media(max-width:720px){#exportcenter-section{box-sizing:border-box!important;width:100%!important;max-width:100%!important;min-width:0!important;overflow-x:hidden!important}#exportcenter-section>section{box-sizing:border-box!important;max-width:100%!important;min-width:0!important}#smtinel-exportcenter-frame{display:block!important;width:100%!important;max-width:100%!important;min-width:0!important;box-sizing:border-box!important}}";
    document.head.appendChild(style);
  }
  function tryMount() {
    var frame=document.getElementById('smtinel-exportcenter-frame');
    if(!frame)return;
    if(!frame.__s8load){frame.__s8load=true;frame.addEventListener('load',function(){activeRoot=null;token='';pendingFile=null;setTimeout(tryMount,0);});}
    ensureMobileParentStyles();
    mount(frame);
  }
  function schedule(){[0,250,900].forEach(function(ms){setTimeout(tryMount,ms);});}
  function navigation(e){
    if(activeRoot&&activeRoot.isConnected)return;
    var frame=document.getElementById('smtinel-exportcenter-frame');
    if(frame){schedule();return;}
    var t=e.target&&e.target.closest&&e.target.closest('button,a,[role=tab]');
    var label=t ? String(t.textContent||'')+' '+String(t.getAttribute('aria-label')||'') : '';
    if(/export\s*center|centro\s*de\s*exportaci[oó]n/i.test(label))schedule();
  }
  document.addEventListener('click',navigation,true);
  document.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' ')navigation(e);},true);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});
  else schedule();
})();