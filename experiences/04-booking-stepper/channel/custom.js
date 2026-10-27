/* lb-js: vireo-booking 2026-09-28 */
/* [mockup 4] Flight booking stepper · Vireo Air (invented) · channel 3516162. Top row + Where/When/Who/Pay tabs, airport rows (IATA badge, name,
   city as attributes on the native 5+ list, whose own search field filters), count chips, pick-then-CTA ("Next: <tab>"), trip card, Back
   (proxies the native Back), fade between screens. Reads the DOM; it only clicks the flow's own controls. Fails open. */
(function(){
  try {
    if (window.__lbFootRan) return; window.__lbFootRan = true; document.body.classList.add('vb-js');
    var S = [
      {k:'from', t:'Where are you flying from?', tab:0, kind:'list', cta:'Next: Destination'},
      {k:'to', t:'Where are you flying to?', tab:0, kind:'list', cta:'Next: When'},
      {k:'trip', t:'Return or one way?', tab:1, kind:'rows', cta:'Continue'},
      {k:'out', t:'When do you fly out?', tab:1, kind:'text', cta:'Continue'},
      {k:'back', t:'When do you fly back?', tab:1, kind:'text', cta:'Next: Who'},
      {k:'adults', t:'How many adults are travelling?', tab:2, kind:'chips', cta:'Continue'},
      {k:'kids', t:'Any children (2–11)?', tab:2, kind:'chips', cta:'Continue'},
      {k:'cabin', t:'Which cabin?', tab:2, kind:'rows', cta:'Next: Pay'},
      {k:'summary', t:'Your trip', tab:3, kind:'end', cta:'Confirm booking', primary:'Confirm booking'},
      {k:'email', t:'Where should we send the confirmation?', tab:3, kind:'text', cta:'Finish booking'},
      {k:'done', t:'Demo booking ready', tab:3, kind:'end', cta:'Book another flight', primary:'Book another flight'},
      {k:'fail', t:'Sorry, I could not price that trip.', tab:3, kind:'end', cta:'Start again', primary:'Start again'}];
    var TABS = ['Where','When','Who','Pay'];
    var CITY = {MAD:'Madrid, Spain', BCN:'Barcelona, Spain', VLC:'Valencia, Spain', AGP:'Málaga, Spain', SVQ:'Seville, Spain', BIO:'Bilbao, Spain', PMI:'Palma, Spain', LPA:'Canary Islands, Spain',
                LIS:'Lisbon, Portugal', CDG:'Paris, France', FCO:'Rome, Italy', LHR:'London, United Kingdom', AMS:'Amsterdam, Netherlands', BER:'Berlin, Germany', MXP:'Milan, Italy', DUB:'Dublin, Ireland'};
    var SUB = {'Return':'Out and back', 'One way':'Just the outbound flight', 'Economy':'Seat and a cabin bag', 'Economy Plus':'Checked bag and seat choice', 'Business':'Lounge, fast track, flat seat'};
    function txt(el){ return (el && el.textContent || '').trim(); }
    function first(t){ return String(t).split('\n')[0].trim(); }
    function esc(s){ return String(s).replace(/[&<>"]/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }
    function textOf(p){ var ps=p.querySelectorAll('p'); var t = ps.length ? [].map.call(ps, function(x){ return x.textContent; }).join('\n') : p.textContent; return String(t||'').replace(/\n\s*\n+/g,'\n').trim(); }
    function msgText(m){ var p=m.querySelector('[data-lb-part="message-text"]'); return p ? (p.getAttribute('data-vb-src') || textOf(p)) : ''; }
    function si(t){ var h=first(t); for (var i=0;i<S.length;i++) if (h===S[i].t) return i; return -1; }
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
      var it=items(), lastUser=-1, cur=-1, trip='', outDate='';
      it.forEach(function(x){ if (x.a==='user') { lastUser=x.n; if (cur>=0 && S[cur].k==='trip' && (x.t==='Return'||x.t==='One way')) trip=x.t; if (cur>=0 && S[cur].k==='out' && /^\d{2}\/\d{2}\/\d{4}$/.test(x.t)) outDate=x.t; } else { var i=si(x.t); if (i>=0) cur=i; } });
      var vis=[]; it.forEach(function(x){ var old=x.n<=lastUser; if (old!==x.w.hasAttribute('data-vb-old')) { if (old) x.w.setAttribute('data-vb-old',''); else x.w.removeAttribute('data-vb-old'); } if (!old && x.a==='bot') vis.push(x); });
      return {cur:cur, s:cur>=0?S[cur]:null, visible:vis, trip:trip, outDate:outDate};
    }
    function clone(p, html){
      var t=p.getAttribute('data-vb-src') || textOf(p), n=p.nextElementSibling, key=t+'|'+html.length;
      if (p.getAttribute('data-vb-src')===t && n && n.classList.contains('vb-clone') && n.getAttribute('data-for')===key) return;
      if (n && n.classList.contains('vb-clone')) n.remove();
      var d=document.createElement('div'); d.className='vb-clone'; d.setAttribute('data-for', key); d.innerHTML=html; p.insertAdjacentElement('afterend', d); p.setAttribute('data-vb-src', t);
    }
    function code(v){ var m=/\(([A-Z]{3})\)\s*$/.exec(v||''); return m ? m[1] : ''; }
    function card(lines, title){
      var o={}; lines.forEach(function(l){ var c=l.indexOf(': '); if (c>0) o[l.slice(0,c)]=l.slice(c+2); });
      var r=(o.Route||'').split(' → '), a=code(r[0]), b=code(r[1]);
      var h='<div class="vb-card">'+(title?'<div class="vb-t">'+esc(title)+'</div>':'')+'<div class="vb-route"><span>'+esc(a||'—')+'</span><i></i><span>'+esc(b||'—')+'</span></div>'+
        '<div class="vb-cities"><span>'+esc(CITY[a]||r[0]||'')+'</span><span>'+esc(CITY[b]||r[1]||'')+'</span></div><div class="vb-grid">';
      Object.keys(o).forEach(function(k){ if (k==='Route') return; var lab=k, val=o[k];
        if (k==='Back') { if (!val.trim() || /^one way$/i.test(val.trim())) return; lab='Return'; }   /* 2026-09-28: the flow's "Back" line reads "Return"; no row on one-way trips */
        h+='<div class="vb-c"><span class="vb-k">'+esc(lab)+'</span><span class="vb-v">'+esc(val)+'</span></div>'; });
      return h+'</div></div>';
    }
    function decorate(st){
      document.querySelectorAll('.vb-clone').forEach(function(c){ var p=c.previousElementSibling; if (!p || !p.hasAttribute('data-vb-src')) c.remove(); });
      st.visible.forEach(function(x){
        var p=x.m.querySelector('[data-lb-part="message-text"]'); if (!p) return;
        var L=x.t.split('\n').map(function(s){ return s.trim(); }).filter(Boolean), h=L[0], kind='';
        if (si(x.t)>=0 && L.length>1) clone(p, '<div class="vb-q">'+esc(h)+'</div><div class="vb-qs">'+esc(L.slice(1).join(' '))+'</div>');
        else if (h.indexOf('Route: ')===0) clone(p, card(L, ''));
        else if (h==="What Vireo Air's team would receive") clone(p, card(L.slice(1), h));
        else if (h.indexOf('Demo fare')===0) { var fm=/€\s?([0-9.,]+)/.exec(h); if (fm) clone(p, '<div class="vb-fare"><span class="vb-fare-k">Demo fare, all travellers</span><span class="vb-fare-v">€'+esc(fm[1])+'</span><span class="vb-fare-n">No payment and no real booking in this demo.</span></div>'); else kind='fine'; }
        else if (h.indexOf('Demo only')===0) kind='fine';
        if ((x.m.getAttribute('data-vb-kind')||'')!==kind) { if (kind) x.m.setAttribute('data-vb-kind', kind); else x.m.removeAttribute('data-vb-kind'); }
      });
    }
    var top=document.createElement('div'); top.id='vb-top';
    top.innerHTML='<div class="vb-row"><span class="vb-plane"></span>Book a flight<button type="button" class="vb-back" hidden>‹ Back</button></div><div class="vb-tabs">'+TABS.map(function(t){ return '<div class="vb-tab">'+t+'</div>'; }).join('')+'</div>';
    var backBtn=top.querySelector('.vb-back');
    var wrap=document.createElement('div'); wrap.id='vb-cta-wrap'; wrap.innerHTML='<div id="vb-hint" hidden>Pick one to continue</div><button type="button" id="vb-cta">Next: Destination</button>';
    var cta=wrap.querySelector('#vb-cta'), hint=wrap.querySelector('#vb-hint');
    var empty=document.createElement('div'); empty.id='vb-empty';
    function park(){
      var hc=document.querySelector('[data-lb-part="header"] > .responsive-container'); if (hc && top.parentNode!==hc) hc.appendChild(top);
      var foot=document.querySelector('[data-lb-part="window"] > .responsive-container:last-child'); if (!foot) return;
      var kids=[].slice.call(foot.children), brand=kids.filter(function(k){ return k.querySelector('[data-lb-part="branding"]'); })[0]||null;
      if (wrap.parentNode!==foot || wrap.nextElementSibling!==brand) foot.insertBefore(wrap, brand);
      var og=kids.filter(function(k){ return k!==wrap && k!==brand; })[0]; if (og && empty.parentNode!==og) og.appendChild(empty);
    }
    function opts(){ return [].slice.call(document.querySelectorAll('[data-lb-part="option-button"]')); }
    function inputEl(){ return document.querySelector('[data-lb-part="text-input"] input, [data-lb-part="text-input"] textarea'); }
    function searchEl(){ return document.querySelector('[data-lb-part="options-group"] > div[data-slot="input-group"] input'); }
    function nativeBack(){ return document.querySelector('button[data-slot="button"][data-size="sm"][data-variant="ghost"]'); }
    function setVal(i, v){ Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(i, v); i.dispatchEvent(new Event('input',{bubbles:true})); }
    function normDate(i){ var v=(i.value||'').trim(), m;
      if ((m=/^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(v))) v=('0'+m[3]).slice(-2)+'/'+('0'+m[2]).slice(-2)+'/'+m[1];
      else if ((m=/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})$/.exec(v))) v=('0'+m[1]).slice(-2)+'/'+('0'+m[2]).slice(-2)+'/'+m[3];
      else { var dg=v.replace(/\D/g,''); if (dg.length===8) { var d1=+dg.slice(0,2), m1=+dg.slice(2,4), y1=+dg.slice(4), y2=+dg.slice(0,4), m2=+dg.slice(4,6), d2=+dg.slice(6);   /* the slash mask can garble a typed yyyy-mm-dd */
        if (m1>=1 && m1<=12 && d1>=1 && d1<=31 && y1>1900) v=dg.slice(0,2)+'/'+dg.slice(2,4)+'/'+dg.slice(4); else if (y2>1900 && m2>=1 && m2<=12 && d2>=1 && d2<=31) v=dg.slice(6)+'/'+dg.slice(4,6)+'/'+dg.slice(0,4); } }
      if (v!==(i.value||'').trim()) setVal(i, v); }
    function dparse(v){ var m=/^(\d{2})\/(\d{2})\/(\d{4})$/.exec(v||''); if (!m) return null; var d=new Date(+m[3], +m[2]-1, +m[1]); return (d.getDate()===+m[1] && d.getMonth()===+m[2]-1) ? d : null; }
    function dateProblem(i, k, st){ var d=dparse((i.value||'').trim()); if (!d) return null; var t=new Date(); t.setHours(0,0,0,0);
      if (d < t) return 'Pick a date from today onwards.';
      if (k==='back') { var o=dparse(st.outDate); if (o && d < o) return 'Your return must be on or after '+st.outDate+'.'; }
      return null; }
    function looksValid(i, k){ var v=(i&&i.value||'').trim(); if (!v) return false; if (k==='email') return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v); if (k==='out'||k==='back') return /^\d{2}\/\d{2}\/\d{4}$/.test(v); return true; }
    var leaveFrom=null, leaveArr=0, leaveT=null, leaveChk=null;
    function leaving(on, from){ clearTimeout(leaveT); clearTimeout(leaveChk);
      if (!on) { document.body.classList.remove('vb-leaving'); leaveFrom=null; return; }
      leaveFrom=from; leaveArr=arrival; document.body.classList.add('vb-leaving'); leaveT=setTimeout(function(){ leaving(false); }, 3500);
      leaveChk=setTimeout(function(){ var st=readState(); if (inputEl() && st.cur===leaveFrom && arrival===leaveArr) leaving(false); }, 400); }
    var picked=null, pickedFor=-2, pass=false;
    function realClick(b){ pass=true; try { b.click(); } finally { pass=false; } }
    var nudgeT=null;
    function nudge(){ document.body.classList.remove('vb-nudge'); void document.body.offsetWidth; document.body.classList.add('vb-nudge'); hint.hidden=false;
      clearTimeout(nudgeT); nudgeT=setTimeout(function(){ document.body.classList.remove('vb-nudge'); hint.hidden=true; }, 1600); }
    function send(){
      var st=readState(), s=st.s, o=opts(); if (!s) return;
      cta.classList.add('vb-pressed'); setTimeout(function(){ cta.classList.remove('vb-pressed'); }, 140);
      if (s.kind==='end') { var b=o.filter(function(x){ return txt(x)===s.primary; })[0] || (o.length===1?o[0]:null); if (b) { leaving(true, st.cur); setTimeout(function(){ realClick(b); }, 0); } return; }
      if (s.kind==='text') { var i=inputEl(); if (!i) return; if (!i.value.trim()) { i.focus(); return; } if (s.k==='out'||s.k==='back') { normDate(i); var dp=dateProblem(i, s.k, st); if (dp) { say(dp); return; } } if (looksValid(i, s.k)) leaving(true, st.cur);
        var sb=document.querySelector('[data-lb-part="input-submit"], [data-lb-part="text-input"] button'); if (sb && !sb.disabled) sb.click(); else i.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',code:'Enter',keyCode:13,bubbles:true})); return; }
      if (!picked) { nudge(); return; }
      var bb=o.filter(function(x){ return txt(x)===picked; })[0]; if (bb) { leaving(true, st.cur); realClick(bb); picked=null; }
      else { picked=null; nudge(); }   /* the picked row was filtered out by the search */
    }
    var sayT=null; function say(m){ hint.textContent=m; hint.hidden=false; clearTimeout(sayT); sayT=setTimeout(function(){ hint.hidden=true; hint.textContent='Pick one to continue'; }, 3000); }
    function pick(b){ picked=txt(b); hint.hidden=true; opts().forEach(function(x){ if (x===b) x.setAttribute('data-lb-picked','1'); else x.removeAttribute('data-lb-picked'); }); render(true); }
    document.addEventListener('click', function(e){
      if (pass) return; var b=e.target && e.target.closest && e.target.closest('[data-lb-part="option-button"]'); if (!b) return;
      var st=readState(); if (!st.s) return;
      if (b.getAttribute('data-vb-role')==='link') { leaving(true, st.cur); return; }
      if (st.s.kind==='end') return;
      e.preventDefault(); e.stopPropagation(); pick(b);
    }, true);
    cta.addEventListener('click', send);
    document.addEventListener('input', function(e){ var t=e.target, st=readState(); if (!t || t.tagName!=='INPUT' || !st.s || (st.s.k!=='out' && st.s.k!=='back')) return;
      var v=t.value, dg=v.replace(/\D/g,'').slice(0,8); if (/[^\d\/]/.test(v) || v.length<(t.__pl||0)) { t.__pl=v.length; return; }   /* free text or deleting: leave it */
      var f=dg.length>4 ? dg.slice(0,2)+'/'+dg.slice(2,4)+'/'+dg.slice(4) : dg.length>2 ? dg.slice(0,2)+'/'+dg.slice(2) : dg; t.__pl=f.length; if (f!==v) setVal(t, f); }, true);
    backBtn.addEventListener('click', function(){ var nb=nativeBack(); if (!nb) return; leaving(true, readState().cur); setTimeout(function(){ realClick(nb); }, 0); });
    document.addEventListener('keydown', function(e){
      var t=e.target, st=readState(), s=st.s;
      var inSearch = t && t===searchEl();
      if (t && (t.tagName==='INPUT'||t.tagName==='TEXTAREA') && !inSearch) { if (e.key==='Enter' && s) { if (s.k==='out'||s.k==='back') { normDate(t); var dp=dateProblem(t, s.k, st); if (dp) { e.preventDefault(); e.stopPropagation(); say(dp); return; } } if (looksValid(t, s.k)) leaving(true, st.cur); } return; }
      if (inSearch) { if (e.key==='Enter') { e.preventDefault(); e.stopPropagation(); var vis=opts(); if (vis.length===1) pick(vis[0]); else if (picked) send(); } else if (e.key==='ArrowDown') { var v2=opts(); if (v2[0]) { e.preventDefault(); v2[0].focus(); } } return; }
      if (e.metaKey||e.ctrlKey||e.altKey || t===cta || t===backBtn) return;
      if (!s) return;
      var fc=t && t.closest && t.closest('[data-lb-part="option-button"]');
      if (fc && s.kind!=='end' && (e.key==='Enter' || e.code==='Space' || e.key===' ')) { e.preventDefault(); e.stopPropagation(); if (e.key==='Enter' && picked===txt(fc)) send(); else pick(fc); return; }
      if (e.key==='Enter') { e.preventDefault(); send(); return; }
      var n=parseInt(e.key,10), o=opts(); if ((s.kind==='chips'||s.kind==='rows'||s.kind==='list') && n>=1 && n<=Math.min(9,o.length)) { e.preventDefault(); pick(o[n-1]); }
    }, true);
    var last='', focusedFor=null;
    function render(force){
      park(); var st=readState(); decorate(st);
      var s=st.s, o=opts(), inp=inputEl(), k=s?s.k:'';
      if (leaveFrom!==null && st.cur!==leaveFrom && (o.length || inp)) leaving(false);
      if (pickedFor!==st.cur) { picked=null; pickedFor=st.cur; }
      o.forEach(function(b){ var l=txt(b), sp=b.querySelector('span'), c=code(l);
        if (c && b.getAttribute('data-code')!==c) b.setAttribute('data-code', c);
        if (sp && c) { var nm=l.replace(/\s*\([A-Z]{3}\)\s*$/,''); if (sp.getAttribute('data-name')!==nm) sp.setAttribute('data-name', nm); if (CITY[c] && sp.getAttribute('data-sub')!==CITY[c]) sp.setAttribute('data-sub', CITY[c]); }
        if (sp && SUB[l] && sp.getAttribute('data-sub')!==SUB[l]) sp.setAttribute('data-sub', SUB[l]);
        var role = s && s.kind==='end' ? (l===s.primary ? 'primary' : 'link') : '';
        if ((b.getAttribute('data-vb-role')||'')!==role) { if (role) b.setAttribute('data-vb-role', role); else b.removeAttribute('data-vb-role'); }
        if (l===picked) { if (!b.hasAttribute('data-lb-picked')) b.setAttribute('data-lb-picked','1'); } else if (b.hasAttribute('data-lb-picked')) b.removeAttribute('data-lb-picked'); });
      var se=searchEl(); if (se && se.getAttribute('placeholder')!=='City or airport') se.setAttribute('placeholder','City or airport');
      var noHits = !!(s && s.kind==='list' && se && se.value.trim() && !o.length); if (noHits!==document.body.hasAttribute('data-vb-nohits')) { if (noHits) document.body.setAttribute('data-vb-nohits',''); else document.body.removeAttribute('data-vb-nohits'); }
      if (noHits) { var q='No airports match \u201c'+se.value.trim()+'\u201d. Try a city name.'; if (empty.textContent!==q) empty.textContent=q; }
      if (inp && s) { var ph={out:'dd/mm/yyyy', back:'dd/mm/yyyy', email:'name@example.com'}[k]; if (ph && inp.getAttribute('placeholder')!==ph) inp.setAttribute('placeholder', ph);
        var im={out:'numeric', back:'numeric', email:'email'}[k]; if (im && inp.getAttribute('inputmode')!==im) inp.setAttribute('inputmode', im);
        if (focusedFor!==k && !document.body.classList.contains('vb-leaving')) { focusedFor=k; try { inp.focus({preventScroll:true}); } catch(e){} } }
      if (!inp) focusedFor=null;
      var sig=[st.cur, picked, o.length, !!inp, !!nativeBack(), st.trip].join('|'); if (!force && sig===last) return; last=sig;
      document.body.setAttribute('data-vb-screen', k);
      document.body.setAttribute('data-vb-list', s && s.kind==='list' ? '1' : '0');
      document.body.setAttribute('data-vb-chips', s && s.kind==='chips' ? '1' : '0');
      var tab = s ? s.tab : 0;
      [].forEach.call(top.querySelectorAll('.vb-tab'), function(t, i){ if (i===tab) t.setAttribute('data-on',''); else t.removeAttribute('data-on'); if (i<tab || k==='done') t.setAttribute('data-done',''); else t.removeAttribute('data-done'); });
      cta.textContent = !s ? 'Next: Destination' : (k==='out' && st.trip==='One way') ? 'Next: Who' : s.cta;
      backBtn.hidden = !(nativeBack() && k && k!=='from' && k!=='done');
    }
    render(true); setInterval(render, 300);
    /* loop guard: a render that keeps changing the DOM would freeze the page; stop observing and keep the evidence */
    var winT=0, winN=0, lastMuts=[];
    var mo=new MutationObserver(function(ms){ try {
      var now=Date.now(); if (now-winT>1000) { winT=now; winN=0; } winN++;
      lastMuts=ms.slice(0,6).map(function(m){ var t=m.target; return m.type+':'+(t.id||t.getAttribute&&t.getAttribute('data-lb-part')||t.className||t.nodeName).toString().slice(0,40)+'+'+m.addedNodes.length+'-'+m.removedNodes.length+(m.addedNodes[0]&&m.addedNodes[0].className?'['+String(m.addedNodes[0].className).slice(0,20)+']':''); });
      if (winN>300) { mo.disconnect(); window.__vbLoop={n:winN, muts:lastMuts, sig:last}; return; }
      render(); } catch(e){ window.__lbFootErr=String(e); } });
    mo.observe(document.body, {childList:true, subtree:true, characterData:true});
    window.__mkState=function(){ var st=readState(); return {screen:st.s?st.s.k:null, picked:picked, cta:cta.textContent, back:!backBtn.hidden, trip:st.trip,
      tab:[].map.call(top.querySelectorAll('.vb-tab[data-on]'), function(t){ return t.textContent; }).join(''), rows:opts().length}; };
  } catch(err) {
    window.__lbFootErr=String(err); document.body.classList.remove('vb-js');
    document.querySelectorAll('[data-vb-src],[data-vb-old]').forEach(function(p){ p.removeAttribute('data-vb-src'); p.removeAttribute('data-vb-old'); });
    document.querySelectorAll('.vb-clone,#vb-top,#vb-cta-wrap').forEach(function(n){ n.remove(); });
  }
})();
