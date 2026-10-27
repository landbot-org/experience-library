/* [mockup 3] Job application stepper · Brisevale Labs (invented) · channel 3516157. Header (company, 3-section stepper, "Question n of 12",
   minutes left, bar), question split (kicker/title/subtitle), field labels, "Coming next", Back (proxies the native Back button) and
   Continue (submits the field or sends the picked row), CV dropzone (uploads to the widget's own file store with the chat token the channel
   head captured, then puts the URL in the field), fade between screens. Counters use the LAST question on screen (Back re-sends one).
   Reads the DOM; it only ever clicks the flow's own controls or fills the visible field. Fails open. */
(function(){
  try {
    if (window.__lbFootRan) return; window.__lbFootRan = true; document.body.classList.add('bv-js');
    var SECTIONS = ['About you','Experience','Documents'];
    var Q = [
      {k:'q1', t:'What is your full name?', f:'Full name', n:'Your full name', i:'user', type:'text'},
      {k:'q2', t:'What is your email?', f:'Email address', n:'Email', i:'mail', type:'text'},
      {k:'q3', t:'What is your phone number?', f:'Phone number', n:'Phone number', i:'phone', type:'text'},
      {k:'q4', t:'Where are you based?', n:'Where you are based', i:'pin', type:'rows'},
      {k:'q5', t:'What is your current job title?', f:'Job title', n:'Current job title', i:'case', type:'text'},
      {k:'q6', t:'How many years of product design experience do you have?', n:'Years of experience', i:'chart', type:'rows'},
      {k:'q7', t:'Where can we see your work?', f:'Portfolio link', n:'Portfolio link', i:'link', type:'text'},
      {k:'q8', t:'What salary range are you looking for?', n:'Salary range', i:'euro', type:'rows'},
      {k:'q9', t:'Upload your CV', f:'Or paste a link to your CV', n:'Upload your CV (PDF)', i:'upload', type:'text'},
      {k:'q10', t:'What is your earliest start date?', f:'Start date (dd/mm/yyyy)', n:'Earliest start date', i:'clock', type:'text'},
      {k:'q11', t:'Do you have the right to work in Spain?', n:'Right to work', i:'shield', type:'rows'},
      {k:'q12', t:'How did you hear about this role?', n:'How you heard about us', i:'mega', type:'rows'}];
    var ENDS = {welcome:'Start application', review:'Submit application', done:'Start over'};
    var ICO = {user:"<circle cx='12' cy='8' r='4'/><path d='M4 21c0-4 4-6 8-6s8 2 8 6'/>", mail:"<rect x='3' y='5' width='18' height='14' rx='2'/><path d='M3 7l9 6 9-6'/>",
      phone:"<path d='M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z'/>", pin:"<path d='M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z'/><circle cx='12' cy='10' r='2.5'/>",
      'case':"<rect x='3' y='7' width='18' height='13' rx='2'/><path d='M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2'/>", chart:"<path d='M4 20V10M10 20V4M16 20v-7M22 20H2'/>",
      link:"<path d='M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1'/><path d='M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1'/>", euro:"<path d='M17 6a7 7 0 1 0 0 12'/><path d='M4 10h9M4 14h9'/>",
      upload:"<path d='M12 16V4M6 10l6-6 6 6M4 20h16'/>", clock:"<circle cx='12' cy='12' r='9'/><path d='M12 7v5l3 2'/>", shield:"<path d='M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z'/>",
      mega:"<path d='M3 11v2a2 2 0 0 0 2 2h2l5 4V5L7 9H5a2 2 0 0 0-2 2z'/><path d='M16 8a5 5 0 0 1 0 8'/>", check:"<path d='M5 12l5 5L20 7'/>"};
    function icon(n){ return 'url("data:image/svg+xml;utf8,'+encodeURIComponent("<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='#0F3D3E' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'>"+ICO[n]+"</svg>")+'")'; }
    function txt(el){ return (el && el.textContent || '').trim(); }
    function first(t){ return String(t).split('\n')[0].trim(); }
    function esc(s){ return String(s).replace(/[&<>"]/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }
    function textOf(p){ var ps=p.querySelectorAll('p'); var t = ps.length ? [].map.call(ps, function(x){ return x.textContent; }).join('\n') : p.textContent; return String(t||'').replace(/\n\s*\n+/g,'\n').trim(); }
    function msgText(m){ var p=m.querySelector('[data-lb-part="message-text"]'); return p ? (p.getAttribute('data-bv-src') || textOf(p)) : ''; }
    function screenOf(t){
      var h=first(t);
      if (h==='Product Designer') return 'welcome';
      for (var i=0;i<Q.length;i++) if (h===Q[i].t) return Q[i].k;
      if (h==='Review your application') return 'review';
      if (h.indexOf('Thanks, ')===0 && h.indexOf('would receive')>0) return 'done';
      return '';
    }
    function qi(k){ for (var i=0;i<Q.length;i++) if (Q[i].k===k) return i; return -1; }
    /* arrival order: v4 can place a fast answer above its question (11-insurance finding) */
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
      var it=items(), lastUser=-1, screen='', ans={}, qArr=-1;
      it.forEach(function(x){ if (x.a==='user') { lastUser=x.n; if (screen && screen.charAt(0)==='q' && x.t!=='Back') ans[screen]=x.t; }
        else { var s=screenOf(x.t); if (s) { screen=s; qArr=x.n; if (s==='welcome') ans={}; } } });
      var vis=[];
      it.forEach(function(x){ var old=x.n<=lastUser; if (old!==x.w.hasAttribute('data-bv-old')) { if (old) x.w.setAttribute('data-bv-old',''); else x.w.removeAttribute('data-bv-old'); } if (!old && x.a==='bot') vis.push(x); });
      return {screen:screen, visible:vis, ans:ans, qArr:qArr};
    }
    function clone(p, html){
      var t=p.getAttribute('data-bv-src') || textOf(p), n=p.nextElementSibling, key=t+'|'+html.length;
      if (p.getAttribute('data-bv-src')===t && n && n.classList.contains('bv-clone') && n.getAttribute('data-for')===key) return;
      if (n && n.classList.contains('bv-clone')) n.remove();
      var d=document.createElement('div'); d.className='bv-clone'; d.setAttribute('data-for', key); d.innerHTML=html; p.insertAdjacentElement('afterend', d); p.setAttribute('data-bv-src', t);
    }
    function shown(v){ if (/^https:\/\/storage\.googleapis\.com\/media\.landbot\.io\/.+\.pdf$/i.test(v)) return (window.__bvUpload && window.__bvUpload.url===v ? window.__bvUpload.name : 'PDF file')+' ✓'; return v.replace(/^https?:\/\//,''); }
    function record(lines, title){ var h='<div class="bv-record"><div class="bv-r-t">'+esc(title)+'</div><div class="bv-r-grid">';
      lines.forEach(function(l){ var c=l.indexOf(': '); if (c>0) { var v=shown(l.slice(c+2)); h+='<div class="bv-r-c"><span class="bv-r-k">'+esc(l.slice(0,c))+'</span><span class="bv-r-v" title="'+esc(v)+'">'+esc(v)+'</span></div>'; } }); return h+'</div></div>'; }
    function decorate(st){
      document.querySelectorAll('.bv-clone').forEach(function(c){ var p=c.previousElementSibling; if (!p || !p.hasAttribute('data-bv-src')) c.remove(); });
      st.visible.forEach(function(x){
        var p=x.m.querySelector('[data-lb-part="message-text"]'); if (!p) return;
        var L=x.t.split('\n').map(function(s){ return s.trim(); }).filter(Boolean), h=L[0], k=screenOf(x.t), kind='';
        if (k && k.charAt(0)==='q') { var sec=SECTIONS[Math.floor(qi(k)/4)];
          clone(p, '<div class="bv-kicker">'+esc(sec)+'</div><div class="bv-title">'+esc(h)+'</div>'+(L.length>1?'<div class="bv-sub">'+esc(L.slice(1).join(' '))+'</div>':'')); }
        else if (k==='welcome') clone(p, '<div class="bv-kicker">Open role</div><div class="bv-title-l">'+esc(h)+'</div>'+(L.length>1?'<div class="bv-sub">'+esc(L.slice(1).join(' '))+'</div>':''));
        else if (h==='Your answers') clone(p, record(L.slice(1), 'Your answers'));
        else if (h==='What the hiring team would receive') clone(p, record(L.slice(1), h));
        else if (k==='review' || k==='done') kind='lead';
        else if (h.indexOf('Demo application: nothing')===0) kind='fine';
        if ((x.m.getAttribute('data-bv-kind')||'')!==kind) { if (kind) x.m.setAttribute('data-bv-kind', kind); else x.m.removeAttribute('data-bv-kind'); }
      });
    }
    /* injected UI */
    var top=document.createElement('div'); top.id='bv-top';
    top.innerHTML='<div class="bv-co"><div class="bv-logo">BV</div><div><div class="bv-co-n">Brisevale Labs</div><div class="bv-co-m">Product Designer · Madrid · Hybrid</div></div></div>'+
      '<div class="bv-steps">'+SECTIONS.map(function(s,i){ return '<div class="bv-step"><div class="bv-dot">'+(i+1)+'</div><div class="bv-lab">'+s+'</div></div>'; }).join('')+'</div>'+
      '<div class="bv-prog"><div class="bv-prog-t"><span class="bv-pl"></span><span class="bv-pr"></span></div><div class="bv-bar"><div class="bv-fill"></div></div></div>';
    var next=document.createElement('div'); next.id='bv-next'; next.hidden=true;
    var drop=document.createElement('button'); drop.type='button'; drop.id='bv-drop'; var TAPW=(window.matchMedia && matchMedia('(hover: none)').matches) ? 'Tap to choose a file' : 'Choose a file';
    drop.innerHTML='<span><span class="bv-d-t">Upload your CV (PDF)</span><small>'+TAPW+', up to 10 MB</small></span>';
    var fileIn=document.createElement('input'); fileIn.type='file'; fileIn.accept='application/pdf,.pdf'; fileIn.id='bv-file'; fileIn.style.display='none'; document.body.appendChild(fileIn);
    var bar=document.createElement('div'); bar.id='bv-bar'; bar.innerHTML='<button type="button" id="bv-back">Back</button><button type="button" id="bv-cta">Continue</button>';
    var hint=document.createElement('div'); hint.id='bv-hint'; hint.hidden=true; hint.textContent='Pick one to continue';
    var back=bar.querySelector('#bv-back'), cta=bar.querySelector('#bv-cta');
    function park(){
      var hc=document.querySelector('[data-lb-part="header"] > .responsive-container'); if (hc && top.parentNode!==hc) hc.appendChild(top);
      var foot=document.querySelector('[data-lb-part="window"] > .responsive-container:last-child'); if (!foot) return;
      var kids=[].slice.call(foot.children), brand=kids.filter(function(k){ return k.querySelector('[data-lb-part="branding"]'); })[0]||null;
      var firstK=kids.filter(function(k){ return [next,bar,hint,drop].indexOf(k)<0 && k!==brand; })[0]||null;
      if (bar.parentNode!==foot || bar.nextElementSibling!==brand) foot.insertBefore(bar, brand);
      if (hint.parentNode!==foot || hint.nextElementSibling!==bar) foot.insertBefore(hint, bar);
      if (next.parentNode!==foot || next.nextElementSibling!==hint) foot.insertBefore(next, hint);
      if (firstK && firstK.nextElementSibling!==next) foot.insertBefore(firstK, next);
      if (firstK && drop.parentNode!==foot) foot.insertBefore(drop, firstK); else if (firstK && drop.nextElementSibling!==firstK) foot.insertBefore(drop, firstK);
    }
    function opts(){ return [].slice.call(document.querySelectorAll('[data-lb-part="option-button"]')); }
    function inputEl(){ return document.querySelector('[data-lb-part="text-input"] input, [data-lb-part="text-input"] textarea'); }
    function nativeBack(){ return document.querySelector('button[data-slot="button"][data-size="sm"][data-variant="ghost"]'); }
    function setVal(i, v){ var proto=i.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype; Object.getOwnPropertyDescriptor(proto,'value').set.call(i, v); i.dispatchEvent(new Event('input',{bubbles:true})); }
    function normDate(i){ var v=(i.value||'').trim(), m;
      if ((m=/^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(v))) v=('0'+m[3]).slice(-2)+'/'+('0'+m[2]).slice(-2)+'/'+m[1];
      else if ((m=/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})$/.exec(v))) v=('0'+m[1]).slice(-2)+'/'+('0'+m[2]).slice(-2)+'/'+m[3];
      if (v!==(i.value||'').trim()) setVal(i, v); }
    function looksValid(i, k){ var v=(i&&i.value||'').trim(); if (!v) return false;
      if (k==='q2') return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
      if (k==='q10') return /^\d{2}\/\d{2}\/\d{4}$/.test(v);
      try { return i.checkValidity ? i.checkValidity() : true; } catch(e){ return true; } }
    var leaveFrom=null, leaveArr=0, leaveT=null, leaveChk=null;
    function leaving(on, from){ clearTimeout(leaveT); clearTimeout(leaveChk);
      if (!on) { document.body.classList.remove('bv-leaving'); leaveFrom=null; return; }
      leaveFrom=from; leaveArr=arrival; document.body.classList.add('bv-leaving');
      leaveT=setTimeout(function(){ leaving(false); }, 3500);
      leaveChk=setTimeout(function(){ var s=readState(); if (inputEl() && s.screen===leaveFrom && arrival===leaveArr) leaving(false); }, 400); }
    var picked=null, pickedFor=null, pass=false;
    function realClick(b){ pass=true; try { b.click(); } finally { pass=false; } }
    var nudgeT=null;
    function nudge(){ document.body.classList.remove('bv-nudge'); void document.body.offsetWidth; document.body.classList.add('bv-nudge'); hint.hidden=false;
      clearTimeout(nudgeT); nudgeT=setTimeout(function(){ document.body.classList.remove('bv-nudge'); hint.hidden=true; }, 1600); }
    function send(){
      var st=readState(), k=st.screen, o=opts(); if (!k) return;
      cta.classList.add('bv-pressed'); setTimeout(function(){ cta.classList.remove('bv-pressed'); }, 140);
      if (ENDS[k]) { var b=o.filter(function(x){ return txt(x)===ENDS[k]; })[0] || (o.length===1?o[0]:null); if (b) { leaving(true,k); setTimeout(function(){ realClick(b); },0); } return; }
      var q=Q[qi(k)];
      if (q.type==='rows') { if (!picked) { nudge(); return; } var bb=o.filter(function(x){ return txt(x)===picked; })[0]; if (bb) { leaving(true,k); realClick(bb); picked=null; } return; }
      var i=inputEl(); if (!i) return;
      if (!i.value.trim()) { i.focus(); nudgeField(); return; }
      if (k==='q10') normDate(i);
      if (looksValid(i,k)) leaving(true,k);
      var sb=document.querySelector('[data-lb-part="input-submit"], [data-lb-part="text-input"] button');
      if (sb && !sb.disabled) sb.click(); else i.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',code:'Enter',keyCode:13,bubbles:true}));
    }
    function nudgeField(){ var ti=document.querySelector('[data-lb-part="text-input"]'); if (!ti) return; ti.animate && ti.animate([{transform:'translateX(-4px)'},{transform:'translateX(4px)'},{transform:'none'}],{duration:260}); }
    function pick(b){ picked=txt(b); hint.hidden=true; opts().forEach(function(x){ if (x===b) x.setAttribute('data-lb-picked','1'); else x.removeAttribute('data-lb-picked'); }); render(true); }
    document.addEventListener('click', function(e){
      if (pass) return; var b=e.target && e.target.closest && e.target.closest('[data-lb-part="option-button"]'); if (!b) return;
      var st=readState(), q=Q[qi(st.screen)]; if (b.getAttribute('data-bv-role')==='link') { leaving(true, st.screen); return; }
      if (!q || q.type!=='rows') return; e.preventDefault(); e.stopPropagation(); pick(b);
    }, true);
    cta.addEventListener('click', send);
    back.addEventListener('click', function(){ var nb=nativeBack(); if (!nb) return; leaving(true, readState().screen); setTimeout(function(){ realClick(nb); }, 0); });
    document.addEventListener('keydown', function(e){
      var t=e.target, typing=t && (t.tagName==='INPUT'||t.tagName==='TEXTAREA'||t.isContentEditable);
      if (typing) { if (e.key==='Enter') { var st0=readState(); if (st0.screen==='q10') normDate(t); if (looksValid(t, st0.screen)) leaving(true, st0.screen); } return; }
      if (e.metaKey||e.ctrlKey||e.altKey || t===cta || t===back || t===drop) return;
      var st=readState(), q=Q[qi(st.screen)], fc=t && t.closest && t.closest('[data-lb-part="option-button"]');
      if (fc && q && q.type==='rows' && (e.key==='Enter' || e.code==='Space' || e.key===' ')) { e.preventDefault(); e.stopPropagation(); if (e.key==='Enter' && picked===txt(fc)) send(); else pick(fc); return; }
      if (e.key==='Enter') { e.preventDefault(); send(); return; }
      var n=parseInt(e.key,10), o=opts(); if (q && q.type==='rows' && n>=1 && n<=o.length) { e.preventDefault(); pick(o[n-1]); }
    }, true);
    /* CV upload: the widget's own file store, same endpoint and session as its native upload (GOAL-9 pattern) */
    var uploading=false;
    function dropState(s, title, sub){ drop.setAttribute('data-state', s); drop.querySelector('.bv-d-t').textContent=title; drop.querySelector('small').textContent=sub; }
    drop.addEventListener('click', function(){ if (!uploading) fileIn.click(); });
    fileIn.addEventListener('change', function(){
      var f=fileIn.files && fileIn.files[0]; if (!f || uploading) return;
      if (!/\.pdf$/i.test(f.name) && f.type!=='application/pdf') { dropState('err','That is not a PDF','Choose a .pdf file, or paste a link below'); fileIn.value=''; return; }
      if (f.size > 10*1024*1024) { dropState('err','That file is over 10 MB','Choose a smaller PDF, or paste a link below'); fileIn.value=''; return; }
      uploading=true; dropState('busy','Uploading '+f.name+'…','One moment');
      var cfg=(window._landbot && window._landbot.config)||{}, tok=cfg.channelToken, srv=String(cfg.serverUrl||'https://messages.landbot.io/').replace(/\/$/,'');
      var fd=new FormData(); fd.append('file', f);
      fetch(srv+'/webchat/files/'+tok+'/', {method:'POST', headers:{Accept:'application/json', Authorization:'Bearer '+(window.__bvlt||'')}, body:fd})
        .then(function(r){ return r.json(); })
        .then(function(j){ var i=inputEl(); if (!j || !j.url || !i) throw new Error('no url'); setVal(i, j.url); window.__bvUpload={ok:true, url:j.url, name:f.name}; document.body.classList.add('bv-uploaded');
          dropState('ok', f.name+' uploaded', 'Continue to use it, or choose another file'); })
        .catch(function(e){ window.__bvUpload={ok:false, err:String(e)}; dropState('err','Upload failed','Try again, or paste a link below'); })
        .then(function(){ uploading=false; fileIn.value=''; });
    });
    var last='';
    function render(force){
      park(); var st=readState(); decorate(st);
      var k=st.screen, idx=qi(k), q=idx>=0?Q[idx]:null, o=opts(), inp=inputEl();
      if (leaveFrom!==null && k!==leaveFrom && (o.length || inp)) leaving(false);
      if (pickedFor!==k) { picked=null; pickedFor=k; if (k!=='q9') { dropState('', 'Upload your CV (PDF)', TAPW+', up to 10 MB'); document.body.classList.remove('bv-uploaded'); } }
      if ((k==='review' || k==='done') && toppedFor!==k && st.visible.length>1) { toppedFor=k; var sc=document.querySelector('[aria-label="Scrollable conversation area"]'); if (sc) setTimeout(function(){ sc.scrollTop=0; }, 350); }
      if (k!=='review' && k!=='done') toppedFor=null;
      o.forEach(function(b){ var l=txt(b), role=ENDS[k] ? (l===ENDS[k] ? 'primary' : 'link') : '';
        if ((b.getAttribute('data-bv-role')||'')!==role) { if (role) b.setAttribute('data-bv-role', role); else b.removeAttribute('data-bv-role'); }
        if (l===picked) { if (!b.hasAttribute('data-lb-picked')) b.setAttribute('data-lb-picked','1'); } else if (b.hasAttribute('data-lb-picked')) b.removeAttribute('data-lb-picked'); });
      var ti=document.querySelector('[data-lb-part="text-input"]');
      if (ti && q && q.f && ti.getAttribute('data-bv-label')!==q.f) ti.setAttribute('data-bv-label', q.f);
      if (inp && q) { var ph={q1:'Ana García', q2:'name@example.com', q3:'+34 600 000 000', q5:'Senior UX Designer', q7:'yoursite.com', q9:'https://…', q10:'dd/mm/yyyy'}[k];
        if (ph && inp.getAttribute('placeholder')!==ph) inp.setAttribute('placeholder', ph);
        var im={q2:'email', q3:'tel', q7:'url', q9:'url', q10:'numeric'}[k]; if (im && inp.getAttribute('inputmode')!==im) inp.setAttribute('inputmode', im);
        if (k==='q3' && inp.getAttribute('autocomplete')!=='tel') inp.setAttribute('autocomplete','tel');
        if (k==='q1' && inp.getAttribute('autocomplete')!=='name') inp.setAttribute('autocomplete','name');
        if (prefilledFor!==st.qArr) { prefilledFor=st.qArr; if (!inp.value && st.ans[k]) setVal(inp, st.ans[k]); }   /* Back re-asks empty: put the earlier answer back */
        if (focusedFor!==k && !document.body.classList.contains('bv-leaving')) { focusedFor=k; try { inp.focus({preventScroll:true}); } catch(e){} } }
      if (!inp) focusedFor=null;
      var sig=[k, picked, o.length, !!inp, !!nativeBack(), document.body.classList.contains('bv-leaving')].join('|'); if (!force && sig===last) return; last=sig;
      document.body.setAttribute('data-bv-screen', k);
      /* header: stepper + progress */
      var sec = k==='welcome' ? 0 : idx>=0 ? Math.floor(idx/4) : 3;
      [].forEach.call(top.querySelectorAll('.bv-step'), function(s, i){ s.setAttribute('data-s', (k==='review'||k==='done') ? 'done' : i<sec ? 'done' : i===sec ? 'current' : 'next'); });
      var pl=top.querySelector('.bv-pl'), pr=top.querySelector('.bv-pr'), fill=top.querySelector('.bv-fill');
      if (idx>=0) { var n=idx+1, left=Math.ceil((12-n+1)*20/60); pl.textContent='Question '+n+' of 12'; pr.textContent = n===12 ? 'Less than a minute left' : 'About '+left+' min left'; fill.style.width=(n/12*100)+'%'; }
      else if (k==='review') { pl.textContent='All 12 answered'; pr.textContent='Check and submit'; fill.style.width='100%'; }
      else if (k==='done') { pl.textContent='Demo complete'; pr.textContent='Nothing was sent'; fill.style.width='100%'; }
      else { pl.textContent='12 questions'; pr.textContent='About 4 min'; fill.style.width='0%'; }
      /* coming next: next section's first two items; in the last section, what is left of it, then review */
      var items2=[];
      if (idx>=0 && sec<2) items2=[Q[(sec+1)*4], Q[(sec+1)*4+1]].map(function(x){ return {n:x.n, i:x.i}; });
      else if (idx>=0) { for (var j=idx+1;j<12 && items2.length<2;j++) items2.push({n:Q[j].n, i:Q[j].i}); if (items2.length<2) items2.push({n:'Review and submit', i:'check'}); }
      else if (k==='welcome') items2=[{n:'About you: name, email, phone', i:'user'},{n:'Your CV as a PDF (or a link)', i:'upload'}];
      next.hidden = !items2.length;
      var ntitle = (idx>=0 && sec<2) ? 'Coming next · '+SECTIONS[sec+1] : 'Coming next';
      next.innerHTML = '<div class="bv-n-t">'+esc(ntitle)+'</div>'+items2.map(function(x){ return '<div class="bv-n-r"><span class="bv-n-i" style="background-image:'+icon(x.i).replace(/"/g,'&quot;')+'"></span>'+esc(x.n)+'</div>'; }).join('');
      cta.textContent = k==='welcome' ? 'Start application' : k==='q12' ? 'Review' : k==='review' ? 'Submit application' : k==='done' ? 'Start over' : 'Continue';
      if (!document.body.classList.contains('bv-leaving')) back.hidden = !(nativeBack() && k && k!=='welcome' && k!=='done');
    }
    var focusedFor=null, toppedFor=null, prefilledFor=null;
    render(true); setInterval(render, 300);
    var winT=0, winN=0;   /* loop guard: never let a render loop freeze the page */
    var mo=new MutationObserver(function(ms){ try { var now=Date.now(); if (now-winT>1000) { winT=now; winN=0; } if (++winN>300) { mo.disconnect(); window.__bvLoop={n:winN}; return; } render(); } catch(e){ window.__lbFootErr=String(e); } });
    mo.observe(document.body, {childList:true, subtree:true, characterData:true});
    window.__mkState=function(){ var st=readState(); return {screen:st.screen, picked:picked, cta:cta.textContent, back:!back.hidden, progress:top.querySelector('.bv-pl').textContent+' · '+top.querySelector('.bv-pr').textContent,
      steps:[].map.call(top.querySelectorAll('.bv-step'), function(s){ return s.getAttribute('data-s'); }).join(','), next:[].map.call(next.querySelectorAll('.bv-n-r'), function(r){ return r.textContent; }), upload:window.__bvUpload||null}; };
  } catch(err) {
    window.__lbFootErr=String(err); document.body.classList.remove('bv-js');
    document.querySelectorAll('[data-bv-src],[data-bv-old]').forEach(function(p){ p.removeAttribute('data-bv-src'); p.removeAttribute('data-bv-old'); });
    document.querySelectorAll('.bv-clone,#bv-top,#bv-next,#bv-bar,#bv-drop,#bv-hint').forEach(function(n){ n.remove(); });
  }
})();
