/* lb-js: ondalia-adelanto 2026-09-28 */
/* [mockup 2] Adelanto de nómina (ES) · Ondalia (inventada) · channel 3516185. Cabecera ("‹" = Back nativo, "Paso n de 4"), tarjeta de disponible
   (clon del mensaje del flujo con barra), chips 100/250/500 € que rellenan el campo, condiciones de ejemplo, CTA "Confirmar adelanto de X €",
   puntos de paso, elegir-y-confirmar en el Paso 1, fundido entre pantallas, guarda de bucle. Solo lee el DOM y pulsa controles del propio flujo. */
(function(){
  try {
    if (window.__lbFootRan) return; window.__lbFootRan = true; document.body.classList.add('fn-js');
    var S = [
      {k:'cuenta', t:'¿A qué cuenta te enviamos el adelanto?', paso:1, kind:'rows', cta:'Continuar'},
      {k:'importe', t:'¿Cuánto quieres adelantar hoy?', paso:2, kind:'text', cta:'Confirmar adelanto'},
      {k:'email', t:'¿Dónde te enviamos el justificante?', paso:3, kind:'text', cta:'Continuar'},
      {k:'done', t:'Solicitud de ejemplo lista', paso:4, kind:'end', cta:'Empezar de nuevo', primary:'Empezar de nuevo', prefix:1},
      {k:'fail', t:'No he podido calcular el total.', paso:2, kind:'end', cta:'Empezar de nuevo', primary:'Empezar de nuevo', prefix:1}];
    function txt(el){ return (el && el.textContent || '').trim(); }
    function textOf(p){ var ps=p.querySelectorAll('p'); var t = ps.length ? [].map.call(ps, function(x){ return x.textContent; }).join('\n') : p.textContent; return String(t||'').replace(/\n\s*\n+/g,'\n').trim(); }
    function first(t){ return String(t).split('\n')[0].trim(); }
    function esc(s){ return String(s).replace(/[&<>"]/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }
    function eur(n){ var v=Number(n); if (!isFinite(v)) return ''; return v.toLocaleString('es-ES', {minimumFractionDigits: v%1 ? 2 : 0, maximumFractionDigits:2}); }
    function msgText(m){ var p=m.querySelector('[data-lb-part="message-text"]'); return p ? (p.getAttribute('data-fn-src') || textOf(p)) : ''; }
    function si(t){ var h=first(t); for (var i=0;i<S.length;i++) if (S[i].prefix ? h.indexOf(S[i].t)===0 : h===S[i].t) return i; return -1; }
    var seen={}, arrival=0;
    function items(){
      var list=document.querySelector('[aria-label="Conversation messages"]'); if (!list) return [];
      var counts={}, out=[];
      [].forEach.call(list.children, function(w){ var m=w.querySelector('[data-lb-part="message"]'); if (!m) return;
        var a=m.getAttribute('data-lb-author'), t=msgText(m); if (!t) return; var base=a+'|'+t; counts[base]=(counts[base]||0)+1; var key=base+'#'+counts[base];
        if (!(key in seen)) seen[key]=arrival++; out.push({w:w, m:m, a:a, t:t, n:seen[key]}); });
      out.sort(function(x,y){ return x.n-y.n; }); return out;
    }
    function readState(){
      var it=items(), lastUser=-1, cur=-1;
      it.forEach(function(x){ if (x.a==='user') lastUser=x.n; else { var i=si(x.t); if (i>=0) cur=i; } });
      var vis=[]; it.forEach(function(x){ var old=x.n<=lastUser; if (old!==x.w.hasAttribute('data-fn-old')) { if (old) x.w.setAttribute('data-fn-old',''); else x.w.removeAttribute('data-fn-old'); } if (!old && x.a==='bot') vis.push(x); });
      return {cur:cur, s:cur>=0?S[cur]:null, visible:vis};
    }
    function clone(p, html){
      var t=p.getAttribute('data-fn-src') || textOf(p), n=p.nextElementSibling, key=t+'|'+html.length;
      if (p.getAttribute('data-fn-src')===t && n && n.classList.contains('fn-clone') && n.getAttribute('data-for')===key) return;
      if (n && n.classList.contains('fn-clone')) n.remove();
      var d=document.createElement('div'); d.className='fn-clone'; d.setAttribute('data-for', key); d.innerHTML=html; p.insertAdjacentElement('afterend', d); p.setAttribute('data-fn-src', t);
    }
    function decorate(st){
      document.querySelectorAll('.fn-clone').forEach(function(c){ var p=c.previousElementSibling; if (!p || !p.hasAttribute('data-fn-src')) c.remove(); });
      st.visible.forEach(function(x){
        var p=x.m.querySelector('[data-lb-part="message-text"]'); if (!p) return;
        var L=x.t.split('\n').map(function(s){ return s.trim(); }).filter(Boolean), h=L[0], kind='';
        if (h==='Disponible este mes' && L.length>=3) { var tot=parseFloat(L[1].replace(/\./g,'').replace(',','.')), used=(/(\d[\d.]*)\s*€/.exec(L[2])||[])[1], u=used?parseFloat(used.replace(/\./g,'')):0;
          var pct=tot?Math.max(0,Math.min(100,Math.round(u/tot*100))):0;
          clone(p, '<div class="fn-avail"><div class="k">'+esc(h)+'</div><div class="v">'+esc(L[1])+'</div><div class="bar"><i style="width:'+pct+'%"></i></div><div class="n">'+esc(L.slice(2).join(' '))+'</div></div>'); }
        else if (si(x.t)>=0 && L.length>1 && S[si(x.t)].kind!=='end') clone(p, '<div class="fn-q">'+esc(h)+'</div><div class="fn-qs">'+esc(L.slice(1).join(' '))+'</div>');
        else if (h==='Lo que recibiría el equipo de Ondalia') { var r='<div class="fn-rec"><div class="t">'+esc(h)+'</div>';
          L.slice(1).forEach(function(l){ var c=l.indexOf(': '); if (c>0) { var v=l.slice(c+2).replace(/^(\d+)\.(\d{1,2}) €$/, function(_,a,b){ return a+','+(b.length<2?b+'0':b)+' €'; }); r+='<div class="r"><span>'+esc(l.slice(0,c))+'</span><span>'+esc(v)+'</span></div>'; } });
          clone(p, r+'</div>'); }
        else if (h.indexOf('Solicitud de ejemplo lista')===0) kind='lead';
        else if (h.indexOf('Demo: ')===0) kind='fine';
        if ((x.m.getAttribute('data-fn-kind')||'')!==kind) { if (kind) x.m.setAttribute('data-fn-kind', kind); else x.m.removeAttribute('data-fn-kind'); }
      });
    }
    var top=document.createElement('div'); top.id='fn-top';
    top.innerHTML='<span class="fn-t"><button type="button" class="fn-back" aria-label="Atrás" hidden></button>Adelanto de nómina</span><span class="fn-p">Paso 1 de 4</span>';
    var backBtn=top.querySelector('.fn-back'), pasoEl=top.querySelector('.fn-p');
    var chips=document.createElement('div'); chips.id='fn-chips'; chips.innerHTML=[100,250,500].map(function(v){ return '<button type="button" data-v="'+v+'">'+v+' €</button>'; }).join('');
    var fee=document.createElement('div'); fee.id='fn-fee';
    fee.innerHTML='<div class="d">Condiciones de ejemplo</div><div class="r"><span>Llega a tu cuenta</span><span>Hoy, en minutos</span></div><div class="r"><span>Comisión</span><span>2,99 €</span></div><div class="r"><span>Se descuenta el</span><span>30 sep</span></div>';
    var wrap=document.createElement('div'); wrap.id='fn-cta-wrap'; wrap.innerHTML='<div id="fn-hint" hidden>Elige una cuenta para continuar</div><button type="button" id="fn-cta">Continuar</button><div id="fn-dots"><i></i><i></i><i></i><i></i></div>';
    var cta=wrap.querySelector('#fn-cta'), hint=wrap.querySelector('#fn-hint');
    function park(){
      var hc=document.querySelector('[data-lb-part="header"] > .responsive-container'); if (hc && top.parentNode!==hc) hc.appendChild(top);
      var foot=document.querySelector('[data-lb-part="window"] > .responsive-container:last-child'); if (!foot) return;
      var kids=[].slice.call(foot.children), brand=kids.filter(function(k){ return k.querySelector('[data-lb-part="branding"]'); })[0]||null;
      var firstK=kids.filter(function(k){ return [chips,fee,wrap].indexOf(k)<0 && k!==brand; })[0]||null;
      if (wrap.parentNode!==foot || wrap.nextElementSibling!==brand) foot.insertBefore(wrap, brand);
      if (fee.parentNode!==foot || fee.nextElementSibling!==wrap) foot.insertBefore(fee, wrap);
      if (chips.parentNode!==foot || chips.nextElementSibling!==fee) foot.insertBefore(chips, fee);
      if (firstK && firstK.nextElementSibling!==chips) foot.insertBefore(firstK, chips);
    }
    function opts(){ return [].slice.call(document.querySelectorAll('[data-lb-part="option-button"]')); }
    function inputEl(){ return document.querySelector('[data-lb-part="text-input"] input'); }
    function nativeBack(){ return document.querySelector('button[data-slot="button"][data-size="sm"][data-variant="ghost"]'); }
    function setVal(i, v){ Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(i, v); i.dispatchEvent(new Event('input',{bubbles:true})); }
    /* 2026-09-28: after Back re-asks the amount, the visitor's earlier amount from this same run (not from before an end screen) */
    function prevAmount(){ var q=null, cur=-1, got=null; items().forEach(function(x){ if (x.a==='bot') { var i=si(x.t); if (i>=0) { if (S[i].kind==='end') got=null; q=S[i].k; if (q==='importe') cur=x.n; } }
      else if (q==='importe' && /^\d+([.,]\d{1,2})?$/.test(x.t)) got={v:x.t, n:x.n}; }); return (got && got.n<cur) ? {v:got.v, q:cur} : null; }
    var prefillFor=-1;
    function looksValid(i, k){ var v=(i&&i.value||'').trim(); if (!v) return false; if (k==='email') return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v); if (k==='importe') { var n=Number(v); return n>=50 && n<=840; } return true; }
    var leaveFrom=null, leaveArr=0, leaveT=null, leaveChk=null;
    function leaving(on, from){ clearTimeout(leaveT); clearTimeout(leaveChk);
      if (!on) { document.body.classList.remove('fn-leaving'); leaveFrom=null; return; }
      leaveFrom=from; leaveArr=arrival; document.body.classList.add('fn-leaving'); leaveT=setTimeout(function(){ leaving(false); }, 3500);
      leaveChk=setTimeout(function(){ var st=readState(); if (inputEl() && st.cur===leaveFrom && arrival===leaveArr) leaving(false); }, 400); }
    var picked=null, pickedFor=-2, pass=false;
    function realClick(b){ pass=true; try { b.click(); } finally { pass=false; } }
    var nudgeT=null;
    function nudge(){ document.body.classList.remove('fn-nudge'); void document.body.offsetWidth; document.body.classList.add('fn-nudge'); hint.hidden=false;
      clearTimeout(nudgeT); nudgeT=setTimeout(function(){ document.body.classList.remove('fn-nudge'); hint.hidden=true; }, 1600); }
    function send(){
      var st=readState(), s=st.s, o=opts(); if (!s) return;
      cta.classList.add('fn-pressed'); setTimeout(function(){ cta.classList.remove('fn-pressed'); }, 140);
      if (s.kind==='end') { var b=o.filter(function(x){ return txt(x)===s.primary; })[0] || (o.length===1?o[0]:null); if (b) { leaving(true, st.cur); setTimeout(function(){ realClick(b); }, 0); } return; }
      if (s.kind==='text') { var i=inputEl(); if (!i) return; if (!i.value.trim()) { i.focus(); say(s.k==='importe' ? 'Elige o escribe un importe.' : 'Escribe tu email para continuar.'); return; } if (looksValid(i, s.k)) leaving(true, st.cur);
        var sb=document.querySelector('[data-lb-part="input-submit"], [data-lb-part="text-input"] button'); if (sb && !sb.disabled) sb.click(); else i.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',code:'Enter',keyCode:13,bubbles:true})); return; }
      if (!picked) { nudge(); return; }
      var bb=o.filter(function(x){ return txt(x)===picked; })[0]; if (bb) { leaving(true, st.cur); realClick(bb); picked=null; }
    }
    var sayT=null; function say(m){ hint.textContent=m; hint.hidden=false; clearTimeout(sayT); sayT=setTimeout(function(){ hint.hidden=true; hint.textContent='Elige una cuenta para continuar'; }, 2600); }
    function pick(b){ picked=txt(b); hint.hidden=true; opts().forEach(function(x){ if (x===b) x.setAttribute('data-lb-picked','1'); else x.removeAttribute('data-lb-picked'); }); render(true); }
    document.addEventListener('click', function(e){
      if (pass) return; var b=e.target && e.target.closest && e.target.closest('[data-lb-part="option-button"]'); if (!b) return;
      var st=readState(); if (!st.s) return; if (b.getAttribute('data-fn-role')==='link') { leaving(true, st.cur); return; }
      if (st.s.kind==='end') return; e.preventDefault(); e.stopPropagation(); pick(b);
    }, true);
    chips.addEventListener('click', function(e){ var b=e.target.closest('button'); if (!b) return; var i=inputEl(); if (!i) return; setVal(i, b.getAttribute('data-v')); try { i.focus({preventScroll:true}); } catch(x){} render(true); });
    document.addEventListener('input', function(e){ if (e.target && e.target===inputEl()) render(true); }, true);
    cta.addEventListener('click', send);
    backBtn.addEventListener('click', function(){ var nb=nativeBack(); if (!nb) return; leaving(true, readState().cur); setTimeout(function(){ realClick(nb); }, 0); });
    document.addEventListener('keydown', function(e){
      var t=e.target, st=readState(), s=st.s;
      if (t && t.tagName==='INPUT') { if (e.key==='Enter' && s && looksValid(t, s.k)) leaving(true, st.cur); return; }
      if (e.metaKey||e.ctrlKey||e.altKey || t===cta || t===backBtn || (t && t.closest && t.closest('#fn-chips'))) return;
      if (!s) return;
      var fc=t && t.closest && t.closest('[data-lb-part="option-button"]');
      if (fc && s.kind==='rows' && (e.key==='Enter' || e.code==='Space' || e.key===' ')) { e.preventDefault(); e.stopPropagation(); if (e.key==='Enter' && picked===txt(fc)) send(); else pick(fc); return; }
      if (e.key==='Enter') { e.preventDefault(); send(); return; }
      var n=parseInt(e.key,10);
      if (s.kind==='rows') { var o=opts(); if (n>=1 && n<=o.length) { e.preventDefault(); pick(o[n-1]); } }
      if (s.k==='importe' && n>=1 && n<=3) { e.preventDefault(); chips.querySelectorAll('button')[n-1].click(); }
    }, true);
    var last='', focusedFor=null;
    function render(force){
      park(); var st=readState(); decorate(st);
      var s=st.s, o=opts(), inp=inputEl(), k=s?s.k:'';
      if (leaveFrom!==null && st.cur!==leaveFrom && (o.length || inp)) leaving(false);
      if (pickedFor!==st.cur) { picked=null; pickedFor=st.cur; }
      o.forEach(function(b){ var l=txt(b), role = s && s.kind==='end' ? (l===s.primary ? 'primary' : 'link') : '';
        if ((b.getAttribute('data-fn-role')||'')!==role) { if (role) b.setAttribute('data-fn-role', role); else b.removeAttribute('data-fn-role'); }
        if (l===picked) { if (!b.hasAttribute('data-lb-picked')) b.setAttribute('data-lb-picked','1'); } else if (b.hasAttribute('data-lb-picked')) b.removeAttribute('data-lb-picked'); });
      if (inp && s) { var ph={importe:'350', email:'nombre@ejemplo.com'}[k]; if (ph && inp.getAttribute('placeholder')!==ph) inp.setAttribute('placeholder', ph);
        if (k==='email' && inp.getAttribute('inputmode')!=='email') { inp.setAttribute('inputmode','email'); inp.setAttribute('autocomplete','email'); }
        if (focusedFor!==k && !document.body.classList.contains('fn-leaving')) { focusedFor=k; try { inp.focus({preventScroll:true}); } catch(e){} } }
      if (!inp) focusedFor=null;
      if (inp && k==='importe' && !inp.value) { var pa=prevAmount(); if (pa && prefillFor!==pa.q) { prefillFor=pa.q; setVal(inp, pa.v.replace(',', '.')); } }   /* 2026-09-28 */
      var amount = (k==='importe' && inp) ? inp.value.trim() : '';
      var sig=[st.cur, picked, o.length, !!inp, !!nativeBack(), amount, document.body.classList.contains('fn-leaving')].join('|'); if (!force && sig===last) return; last=sig;
      document.body.setAttribute('data-fn-screen', k);
      pasoEl.textContent = 'Paso '+(s?s.paso:1)+' de 4';
      [].forEach.call(wrap.querySelectorAll('#fn-dots i'), function(d, i){ if (i < (s?s.paso:1)) d.setAttribute('data-on',''); else d.removeAttribute('data-on'); });
      [].forEach.call(chips.querySelectorAll('button'), function(b){ if (b.getAttribute('data-v')===amount) b.setAttribute('data-on',''); else b.removeAttribute('data-on'); });
      var n = Number(amount);
      cta.textContent = k==='importe' ? (amount && isFinite(n) && n>=50 && n<=840 ? 'Confirmar adelanto de '+eur(n)+' €' : 'Confirmar adelanto') : (s ? s.cta : 'Continuar');
      if (k==='importe' && inp) { var w=Math.max(3, (inp.value||'').length)+0.4; if (inp.style.width!==w+'ch') inp.style.setProperty('width', w+'ch', 'important'); }
      if (!document.body.classList.contains('fn-leaving')) backBtn.hidden = !(nativeBack() && k && k!=='cuenta' && k!=='done');
    }
    render(true); setInterval(render, 300);
    var winT=0, winN=0;   /* loop guard */
    var mo=new MutationObserver(function(){ try { var now=Date.now(); if (now-winT>1000) { winT=now; winN=0; } if (++winN>300) { mo.disconnect(); window.__fnLoop={n:winN}; return; } render(); } catch(e){ window.__lbFootErr=String(e); } });
    mo.observe(document.body, {childList:true, subtree:true, characterData:true});
    window.__mkState=function(){ var st=readState(); return {screen:st.s?st.s.k:null, picked:picked, cta:cta.textContent, paso:pasoEl.textContent, back:!backBtn.hidden}; };
  } catch(err) {
    window.__lbFootErr=String(err); document.body.classList.remove('fn-js');
    document.querySelectorAll('[data-fn-src],[data-fn-old]').forEach(function(p){ p.removeAttribute('data-fn-src'); p.removeAttribute('data-fn-old'); });
    document.querySelectorAll('.fn-clone,#fn-top,#fn-chips,#fn-fee,#fn-cta-wrap').forEach(function(n){ n.remove(); });
  }
})();
