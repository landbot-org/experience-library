/* lb-js: pv15-balcovell 1 */
/* [mockup 15] Property viewing finder · Balcovell (invented). Page-only skin: header + filter chips from the visitor's own answers,
   listing cards drawn from the flow's listing lines (sorted by match; "Book a viewing" presses the flow's own hidden button; the heart
   is a display-only toggle), a still copy of the tapped options while the bot answers, real dates under the viewing slots, record card.
   Reads the DOM and clicks the flow's own buttons. Nothing is sent anywhere. Fails open: on error the plain chat shows. */
(function(){
  try {
    if (window.__lbFootRan) return; window.__lbFootRan = true; document.body.classList.add('pv-js');
    var AREAS = ['Gràcia','Eixample','Poblenou','Sants'], BEDS = ['1 bedroom','2 bedrooms','3+ bedrooms'];
    var BUDGETS = {'Up to 1.100 €':1100, 'Up to 1.400 €':1400, 'Up to 1.800 €':1800}, EXTRAS = ['Balcony','Lift','Pets OK','No preference'];
    var TONES = ['#D9E4DC','#E3DED2','#ECE7DB'];
    var S = [
      {k:'area',   p:'Let’s find your next flat'}, {k:'area', p:'Which area should we try'},
      {k:'beds',   p:'How many bedrooms'}, {k:'budget', p:'What’s your monthly budget'}, {k:'extra', p:'Anything you’d love'},
      {k:'results',p:'One flat matches'}, {k:'results', p:'Two flats match'}, {k:'results', p:'Three flats match'},
      {k:'results',p:'Nothing matches yet'}, {k:'results', p:'Nothing new up to'},
      {k:'slot',   p:'When would you like to see it'}, {k:'name', p:'Who’s coming to the viewing'},
      {k:'phone',  p:'And a phone number'}, {k:'done', p:'Viewing requested (demo)'}];
    var LIST_RE = /^([ABC]) · (\d+) € \/month · (\d+)% match\n([\s\S]+)$/;
    function txt(el){ return (el && el.textContent || '').trim(); }
    function textOf(p){ var ps=p.querySelectorAll('p'); var t = ps.length ? [].map.call(ps, function(x){ return x.textContent; }).join('\n') : p.textContent; return String(t||'').replace(/\n\s*\n+/g,'\n').trim(); }
    function esc(s){ return String(s).replace(/[&<>"]/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }
    function eur(n){ n=Math.round(Number(n)); return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ' €'; }
    function fmt(s){ return String(s).replace(/(\d{3,5}) €/g, function(_, n){ return eur(n); }); }
    function msgText(m){ var p=m.querySelector('[data-lb-part="message-text"]'); return p ? (p.getAttribute('data-pv-src') || textOf(p)) : ''; }
    function si(t){ for (var i=0;i<S.length;i++) if (t.indexOf(S[i].p)===0) return i; return -1; }
    /* first-seen order: v4 can place a fast answer above its question, so never trust DOM order */
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
      var it=items(), back=0, lastUser=-1, lastBot=-1, cur=-1, f={area:null, beds:null, budget:null, widen:0, extra:null};
      it.forEach(function(x){
        if (x.a==='user') { lastUser=x.n; var t=x.t;
          if (t==='Start a new search' || t==='New search') f={area:null, beds:null, budget:null, widen:0, extra:null};
          else if (AREAS.indexOf(t)>=0) f.area=t; else if (BEDS.indexOf(t)>=0) f.beds=t;
          else if (t in BUDGETS) { f.budget=BUDGETS[t]; f.widen=0; } else if (EXTRAS.indexOf(t)>=0) f.extra=t;
          else if (t==='Widen my search') f.widen++;
          else if (t==='Back') back++; }
        else { lastBot=Math.max(lastBot, x.n); var i=si(x.t); if (i>=0) { cur=i; var q=S[i].k; if (q in f && x.t.indexOf('Which area')!==0) { f[q]=null; if (q==='budget') f.widen=0; } } } });
      var cut=lastUser, botAfter=it.some(function(x){ return x.a==='bot' && x.n>lastUser; });
      if (!botAfter && document.body.classList.contains('pv-leaving')) { var us=it.filter(function(x){ return x.a==='user'; }); cut = us.length>1 ? us[us.length-2].n : -1; }
      var vis=[]; it.forEach(function(x){ var old = x.a==='user' ? true : x.n<=cut; if (old!==x.w.hasAttribute('data-pv-old')) { if (old) x.w.setAttribute('data-pv-old',''); else x.w.removeAttribute('data-pv-old'); } if (!old && x.a==='bot') vis.push(x); });
      return {cur:cur, s:cur>=0?S[cur]:null, visible:vis, f:f, lastBot:lastBot, back:back};
    }
    /* illustration tile (no photos): a facade drawn in SVG, with a balcony rail when the listing has one */
    function facade(seed, balcony, h){
      var w=320, bw=[118,132,104][seed%3], x=(w-bw)/2 + [0,-30,26][seed%3], floors=h<80?2:[4,5,3][seed%3], fh=Math.min(22, (h-14)/(floors+0.6)), top=h-8-floors*fh-8;
      var g='<svg viewBox="0 0 '+w+' '+h+'" preserveAspectRatio="xMidYMax meet" aria-hidden="true">';
      g+='<circle cx="'+(x+bw+46)+'" cy="'+(top+6)+'" r="11" fill="#FFFFFF" opacity=".55"/>';
      g+='<rect x="'+(x-58)+'" y="'+(h-40)+'" width="40" height="32" rx="4" fill="#0E6B57" opacity=".10"/><circle cx="'+(x-26)+'" cy="'+(h-34)+'" r="17" fill="#0E6B57" opacity=".22"/><rect x="'+(x-27)+'" y="'+(h-22)+'" width="3" height="16" fill="#0E6B57" opacity=".35"/>';
      g+='<rect x="'+x+'" y="'+top+'" width="'+bw+'" height="'+(h-top)+'" rx="3" fill="#FBF9F4"/><rect x="'+(x-4)+'" y="'+(top-5)+'" width="'+(bw+8)+'" height="6" rx="2" fill="#0E6B57" opacity=".30"/>';
      for (var r=0;r<floors;r++) for (var c=0;c<3;c++) { var wx=x+14+c*((bw-28)/3)+((bw-28)/3-16)/2, wy=top+8+r*fh;
        g+='<rect x="'+wx+'" y="'+wy+'" width="16" height="'+Math.max(3, fh-9)+'" rx="2" fill="#0E6B57" opacity="'+(r===floors-1&&c===1?'.0':'.20')+'"/>'; }
      var dy=top+8+(floors-1)*fh; g+='<rect x="'+(x+bw/2-9)+'" y="'+dy+'" width="18" height="'+(h-dy)+'" rx="2" fill="#0E6B57" opacity=".38"/>';
      if (balcony) { var by=top+8+Math.max(3, fh-9)+1; g+='<rect x="'+(x+8)+'" y="'+by+'" width="'+(bw-16)+'" height="3" fill="#0E6B57" opacity=".55"/>';
        for (var k=0;k<9;k++) g+='<rect x="'+(x+10+k*((bw-20)/8))+'" y="'+(by+3)+'" width="1.6" height="7" fill="#0E6B57" opacity=".45"/>'; }
      g+='</svg>'; return g;
    }
    function thumb(balcony){ var g='<svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="50" cy="14" r="5" fill="#FFFFFF" opacity=".6"/><circle cx="13" cy="46" r="7" fill="#0E6B57" opacity=".22"/><rect x="12.5" y="50" width="1.5" height="9" fill="#0E6B57" opacity=".35"/>'
      + '<rect x="22" y="14" width="26" height="45" rx="2" fill="#FBF9F4"/><rect x="20" y="11" width="30" height="4" rx="1.5" fill="#0E6B57" opacity=".3"/>';
      for (var r=0;r<4;r++) for (var c=0;c<2;c++) g+='<rect x="'+(26+c*11)+'" y="'+(19+r*9)+'" width="7" height="5" rx="1" fill="#0E6B57" opacity=".22"/>';
      if (balcony) g+='<rect x="24" y="25.5" width="22" height="1.5" fill="#0E6B57" opacity=".55"/>';
      return g+'<rect x="32" y="52" width="6" height="7" rx="1" fill="#0E6B57" opacity=".38"/><rect x="0" y="59" width="64" height="5" fill="#0E6B57" opacity=".08"/></svg>'; }
    var HEART='<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21s-7-4.5-9.5-9A5.5 5.5 0 0 1 12 6a5.5 5.5 0 0 1 9.5 6c-2.5 4.5-9.5 9-9.5 9z"></path></svg>';
    var saved={};
    function cardsHtml(L){
      L=L.slice().sort(function(a,b){ return b.match-a.match || a.price-b.price; });
      return '<div class="pv-cards">'+L.map(function(l, i){ var bal=/balcony/.test(l.line), seed='ABC'.indexOf(l.letter), key=l.line, lab='Book a viewing, '+esc(l.line.split(' · ')[0])+', '+esc(eur(l.price))+' a month';
        var head='<div class="pv-photo" style="--tone:'+TONES[i%3]+'">'+facade(seed, bal, i===0?128:96)+'<span class="pv-tag">Demo listing</span></div>'
          +'<div class="pv-body"><div class="pv-row"><span class="pv-price">'+esc(eur(l.price))+'<small> /month</small></span><span class="pv-match">'+l.match+'% match</span></div>';
        if (i===0) return '<div class="pv-card" data-letter="'+l.letter+'">'+head+'<span class="pv-line">'+esc(l.line)+'</span><div class="pv-acts"><button type="button" class="pv-book" data-letter="'+l.letter+'" aria-label="'+lab+'">Book a viewing</button>'
          +'<button type="button" class="pv-save" data-key="'+esc(key)+'" aria-pressed="'+(saved[key]?'true':'false')+'" aria-label="Save listing">'+HEART+'</button></div></div></div>';
        return '<div class="pv-card pv-mini" data-letter="'+l.letter+'">'+head+'<div class="pv-lrow"><span class="pv-line">'+esc(l.line)+'</span><button type="button" class="pv-book pv-book-mini" data-letter="'+l.letter+'" aria-label="'+lab+'">Book</button></div></div></div>';
      }).join('')+'</div>';
    }
    function clone(p, html){
      var t=p.getAttribute('data-pv-src') || textOf(p), n=p.nextElementSibling, key=t+'|'+html.length;
      if (p.getAttribute('data-pv-src')===t && n && n.classList.contains('pv-clone') && n.getAttribute('data-for')===key) return;
      if (n && n.classList.contains('pv-clone')) n.remove();
      var d=document.createElement('div'); d.className='pv-clone'; d.setAttribute('data-for', key); d.innerHTML=html; p.insertAdjacentElement('afterend', d); p.setAttribute('data-pv-src', t);
    }
    function setKind(m, kind){ if ((m.getAttribute('data-pv-kind')||'')!==kind) { if (kind) m.setAttribute('data-pv-kind', kind); else m.removeAttribute('data-pv-kind'); } }
    function decorate(st){
      document.querySelectorAll('.pv-clone').forEach(function(c){ var p=c.previousElementSibling; if (!p || !p.hasAttribute('data-pv-src') || c.closest('[data-pv-old]')) c.remove(); });
      var listing=[]; st.visible.forEach(function(x){ var mm=LIST_RE.exec(x.t); if (mm) listing.push({x:x, letter:mm[1], price:+mm[2], match:+mm[3], line:mm[4].trim()}); });
      st.visible.forEach(function(x){
        var p=x.m.querySelector('[data-lb-part="message-text"]'); if (!p) return; var t=x.t, kind='';
        if (LIST_RE.test(t)) { if (listing[0] && listing[0].x===x) { kind='cards'; clone(p, cardsHtml(listing)); } else kind='hide'; }
        else if (/^.+ · \d+ € \/month$/.test(t) && st.s && st.s.k==='slot') { kind='card'; var mm=/^(.+) · (\d+) € \/month$/.exec(t);
          clone(p, '<div class="pv-flat"><div class="pv-thumb" style="--tone:#D9E4DC">'+thumb(/balcony/.test(mm[1]))+'</div><div class="pv-fl"><span class="pv-price">'+esc(eur(mm[2]))+'<small> /month</small></span><span class="pv-line">'+esc(mm[1])+'</span></div></div>'); }
        else if (t.indexOf('What the Balcovell agent would receive')===0) { kind='card'; var L=t.split('\n'), r='<div class="pv-rec"><div class="t">'+esc(L[0])+'</div>';
          L.slice(1).forEach(function(l){ var c=l.indexOf(': '); if (c>0) r+='<div class="r"><span>'+esc(l.slice(0,c))+'</span><span>'+esc(fmt(l.slice(c+2)))+'</span></div>'; });
          clone(p, r+'</div>'); }
        else if (t.indexOf('Viewing requested (demo)')===0) kind='lead';
        else if (t.indexOf('Demo only')===0) kind='fine';
        else if (t.indexOf('Widen the budget')===0 || t.indexOf('Try another area, or')===0) kind='note';
        else if (/\d{4} €/.test(t)) clone(p, '<div class="pv-none">'+esc(fmt(t))+'</div>');
        setKind(x.m, kind);
      });
    }
    /* injected UI */
    var top=document.createElement('div'); top.id='pv-top';
    top.innerHTML='<div class="pv-hd"><span class="pv-brand">balcovell</span><span class="pv-where">Rent · Barcelona</span></div><div class="pv-chips" aria-label="Your search"></div>';
    var chipsEl=top.querySelector('.pv-chips');
    var toastEl=document.createElement('div'); toastEl.id='pv-toast'; toastEl.setAttribute('role','status'); toastEl.setAttribute('aria-live','polite'); document.body.appendChild(toastEl);
    var toastT=null; function toast(m){ toastEl.textContent=m; toastEl.setAttribute('data-on',''); clearTimeout(toastT); toastT=setTimeout(function(){ toastEl.removeAttribute('data-on'); }, 1700); }
    var sayEl=document.createElement('div'); sayEl.id='pv-say'; sayEl.setAttribute('role','status'); sayEl.setAttribute('aria-live','polite');
    var sayT=null; function say(m){ sayEl.textContent=m; clearTimeout(sayT); sayT=setTimeout(function(){ sayEl.textContent=''; }, 2800); }
    var ghost=null;
    function footer(){ return document.querySelector('[data-lb-part="window"] > .responsive-container:last-child'); }
    function park(){
      var hc=document.querySelector('[data-lb-part="header"] > .responsive-container'); if (hc && top.parentNode!==hc) hc.appendChild(top);
      var foot=footer(); if (!foot) return;
      var brand=[].filter.call(foot.children, function(k){ return k.querySelector('[data-lb-part="branding"]'); })[0]||null;
      var ti=[].filter.call(foot.children, function(k){ return k.querySelector('[data-lb-part="text-input"]'); })[0]||null, anchor=ti||brand;
      if (sayEl.parentNode!==foot || sayEl.nextElementSibling!==anchor) foot.insertBefore(sayEl, anchor);
      if (ghost && (ghost.parentNode!==foot || ghost.nextElementSibling!==sayEl)) foot.insertBefore(ghost, sayEl);
    }
    function realOpts(){ return [].filter.call(document.querySelectorAll('[data-lb-part="option-button"]'), function(b){ return !b.closest('#pv-ghost'); }); }
    function realOpt(l){ return realOpts().filter(function(b){ return txt(b)===l; })[0]||null; }
    function inputEl(){ return document.querySelector('[data-lb-part="input-field"] input, [data-lb-part="input-field"] textarea, [data-lb-part="text-input"] input'); }
    var pass=false; function realClick(b){ pass=true; try { b.click(); } finally { pass=false; } }
    function makeGhost(picked){
      var o=realOpts()[0], list=o && o.closest('[data-lb-part="options-list"]'); if (!list) return;
      var foot=footer(), slot=list; while (slot && slot.parentNode!==foot) slot=slot.parentNode; if (!slot) return;
      if (ghost) ghost.remove(); ghost=slot.cloneNode(true); ghost.id='pv-ghost'; ghost.hidden=true; ghost.setAttribute('aria-hidden','true');
      [].forEach.call(ghost.querySelectorAll('[data-lb-part="option-button"]'), function(b){ b.tabIndex=-1; if (picked && txt(b)===picked) b.setAttribute('data-pv-picked',''); else b.removeAttribute('data-pv-picked'); });
      park();
    }
    var leaveBot=null, leaveT=null, leaveChk=null;
    function leaving(on){ clearTimeout(leaveT); clearTimeout(leaveChk);
      if (!on) { document.body.classList.remove('pv-leaving'); leaveBot=null; return; }
      leaveBot=readState().lastBot; document.body.classList.add('pv-leaving'); leaveT=setTimeout(function(){ leaving(false); }, 4000);
      leaveChk=setTimeout(function(){ if (inputEl() && readState().lastBot===leaveBot) leaving(false); }, 700); }
    function send(b){ if (!b) return; var l=txt(b); b.setAttribute('data-pv-picked',''); makeGhost(l); leaving(true); setTimeout(function(){ realClick(b); }, 60); }
    /* taps: every option shows its picked state at once; the real click follows 60 ms later so the tap is seen before the list unmounts */
    document.addEventListener('click', function(e){
      if (pass) return; var t=e.target; if (!t || !t.closest) return;
      var mini=t.closest('.pv-mini'); if (mini && !t.closest('.pv-book')) { var mb=mini.querySelector('.pv-book'); if (mb) { e.preventDefault(); mb.click(); } return; }
      var ed=t.closest('.pv-edit'); if (ed) { e.preventDefault(); var ns=realOpt('New search'); if (ns) send(ns); else toast('One moment…'); return; }
      var bk=t.closest('.pv-book'); if (bk) { e.preventDefault(); var real=realOpt('Book a viewing · '+bk.getAttribute('data-letter'));
        if (!real) { toast('One moment…'); return; } bk.setAttribute('data-on',''); bk.textContent=bk.classList.contains('pv-book-mini') ? 'Opening…' : 'Opening times…'; document.body.classList.add('pv-booking'); send(real); return; }
      var sv=t.closest('.pv-save'); if (sv) { e.preventDefault(); var k=sv.getAttribute('data-key'); saved[k]=!saved[k]; sv.setAttribute('aria-pressed', saved[k]?'true':'false');
        toast(saved[k] ? 'Saved for this visit (demo, not stored)' : 'Removed from saved'); return; }
      var nb=t.closest('button[data-slot="button"][data-size="sm"][data-variant="ghost"]'); if (nb) { if (ghost) { ghost.remove(); ghost=null; } focusedFor=null; leaving(true); return; }
      var b=t.closest('[data-lb-part="option-button"]'); if (!b || b.closest('#pv-ghost')) return;
      if (b.hasAttribute('data-pv-picked')) { e.preventDefault(); e.stopPropagation(); return; }
      e.preventDefault(); e.stopPropagation(); send(b);
    }, true);
    function visOpts(){ return realOpts().filter(function(b){ return b.getAttribute('data-pv-kind')!=='book'; }); }
    document.addEventListener('keydown', function(e){
      var t=e.target, st=readState(), s=st.s; if (!s || e.metaKey || e.ctrlKey || e.altKey) return;
      if (t && (t.tagName==='INPUT' || t.tagName==='TEXTAREA')) { if (e.key!=='Enter') return; var v=(t.value||'').trim();
        if (!v) { e.preventDefault(); say(s.k==='phone' ? 'Type a phone number to continue.' : 'Type your name to continue.'); return; }
        leaving(true); return; }
      if (t && t.closest && (t.closest('button') || t.closest('[data-lb-part="option-button"]')) && (e.key==='Enter' || e.key===' ')) return;
      var n=parseInt(e.key,10);
      if (s.k==='results' && n>=1 && n<=3) { var bks=document.querySelectorAll('.pv-book'); if (bks[n-1]) { e.preventDefault(); bks[n-1].click(); } return; }
      if (s.k==='results' && (e.key==='w' || e.key==='W')) { var wb=realOpt('Widen my search'); if (wb) { e.preventDefault(); send(wb); } return; }
      var o=visOpts(); if (n>=1 && n<=o.length && !o[n-1].hasAttribute('data-pv-picked')) { e.preventDefault(); send(o[n-1]); return; }
      if (e.key==='Enter' && o.length===1) { e.preventDefault(); send(o[0]); }
    }, true);
    function slotDate(l){ var d=new Date(), wd=d.getDay(), add=0;
      if (l.indexOf('Tomorrow')===0) add=1; else if (l.indexOf('In 3 days')===0) add=3; else if (l.indexOf('Next week')===0) add=7; else return '';
      d.setDate(d.getDate()+add); return d.toLocaleDateString('en-GB', {weekday:'short', day:'numeric', month:'short'}); }
    var last='', focusedFor=null, shownChips='', scrolledFor=null;
    function chip(label, attrs){ return '<span class="pv-chip"'+(attrs||'')+'>'+esc(label)+'</span>'; }
    function render(force){
      park(); var st=readState(); decorate(st);
      var s=st.s, k=s?s.k:'', o=realOpts(), inp=inputEl();
      if (leaveBot!==null && st.lastBot>leaveBot && (o.length || inp)) leaving(false);
      if (ghost && (o.length || inp) && !document.body.classList.contains('pv-leaving')) { ghost.remove(); ghost=null; }
      if (ghost && ghost.hidden!==!!o.length) ghost.hidden=!!o.length;
      o.forEach(function(b){ var l=txt(b), kind = /^Book a viewing · [ABC]$/.test(l) ? 'book' : (l==='Back to the list' || l==='New search') ? 'link' : '';
        if ((b.getAttribute('data-pv-kind')||'')!==kind) { if (kind) b.setAttribute('data-pv-kind', kind); else b.removeAttribute('data-pv-kind'); }
        if (l==='New search' && !b.hasAttribute('data-pv-newsearch')) b.setAttribute('data-pv-newsearch','');
        if (k==='slot') { var sp=b.querySelector('span'), sub=slotDate(l); if (sp && sub && sp.getAttribute('data-sub')!==sub) sp.setAttribute('data-sub', sub); } });
      if (inp && (k==='name' || k==='phone')) { var ph = k==='phone' ? '+34 612 345 678' : 'Your name';
        if (inp.getAttribute('placeholder')!==ph) { inp.setAttribute('placeholder', ph); inp.setAttribute('autocomplete', k==='phone'?'tel':'name'); if (k==='phone') inp.setAttribute('inputmode','tel'); }
        if (focusedFor!==k && !document.body.classList.contains('pv-leaving')) { focusedFor=k; try { inp.focus({preventScroll:true}); } catch(x){} } }
      if (!inp) focusedFor=null;
      var f=st.f, parts=[];
      var order=[['area', f.area, 'Area'], ['beds', f.beds, 'Bedrooms'], ['budget', f.budget ? 'Up to '+eur(f.budget+300*f.widen) : null, 'Budget'], ['extra', f.extra ? (f.extra==='No preference' ? 'Any extras' : '+ '+f.extra) : null, 'Extras']];
      order.forEach(function(r){ if (r[1]) parts.push([r[0], r[1], r[0]==='extra' ? ' data-soft' : '']); else parts.push([r[0], r[2], ' data-todo'+(k===r[0] || (k==='area' && r[0]==='area') ? ' data-now' : '')]); });
      var sig=[st.cur, k, o.length, !!inp, JSON.stringify(parts), !!ghost, document.body.classList.contains('pv-leaving')].join('|');
      if (!force && sig===last) return; last=sig;
      if (document.body.getAttribute('data-pv-screen')!==k) { document.body.setAttribute('data-pv-screen', k); toastEl.removeAttribute('data-on'); }
      if (!document.body.classList.contains('pv-leaving')) document.body.classList.remove('pv-booking');
      var topMsg = st.visible[0] ? st.visible[0].n : -1;
      if (k==='results' && topMsg!==scrolledFor && !document.body.classList.contains('pv-leaving')) { scrolledFor=topMsg; var sa=document.querySelector('[aria-label="Scrollable conversation area"]'); if (sa) { sa.scrollTop=0; setTimeout(function(){ sa.scrollTop=0; }, 120); setTimeout(function(){ sa.scrollTop=0; }, 450); } }
      var ch=parts.map(function(p){ return p[0]+'='+p[1]+p[2]; }).join('|')+'|'+(k==='results');
      if (ch!==shownChips) { var prev=shownChips; shownChips=ch;
        chipsEl.innerHTML=parts.map(function(p){ var isNew = prev && prev.indexOf(p[0]+'='+p[1]+p[2])<0 && p[2].indexOf('todo')<0; return chip(p[1], p[2]+(isNew?' data-new':'')); }).join('')
          + (k==='results' ? '<button type="button" class="pv-chip pv-edit" aria-label="Change search: start a new search">Change</button>' : ''); }
      if (k!=='name' && k!=='phone') sayEl.textContent='';
    }
    function moreCue(){ var sa=document.querySelector('[aria-label="Scrollable conversation area"]'), more = !!sa && document.body.getAttribute('data-pv-screen')==='results' && sa.scrollHeight - sa.clientHeight - sa.scrollTop > 12;
      if (more!==document.body.hasAttribute('data-pv-more')) { if (more) document.body.setAttribute('data-pv-more',''); else document.body.removeAttribute('data-pv-more'); } }
    setInterval(function(){ try { moreCue(); } catch(e){} }, 200);
    render(true); setInterval(render, 300);
    var winT=0, winN=0;   /* loop guard */
    var mo=new MutationObserver(function(){ try { var now=Date.now(); if (now-winT>1000) { winT=now; winN=0; } if (++winN>300) { mo.disconnect(); window.__pvLoop={n:winN}; return; } render(); } catch(e){ window.__lbFootErr=String(e); } });
    mo.observe(document.body, {childList:true, subtree:true, characterData:true});
    window.__mkState=function(){ var st=readState(); return {screen:st.s?st.s.k:null, f:st.f, cards:[].filter.call(document.querySelectorAll('.pv-card'), function(c){ return !!c.offsetParent; }).map(function(c){ return c.getAttribute('data-letter'); }).join(''), back:st.back, ghost:!!ghost, leaving:document.body.classList.contains('pv-leaving'), chips:shownChips}; };
  } catch(err) {
    window.__lbFootErr=String(err); document.body.classList.remove('pv-js');
    document.querySelectorAll('[data-pv-src],[data-pv-old],[data-pv-kind]').forEach(function(p){ p.removeAttribute('data-pv-src'); p.removeAttribute('data-pv-old'); p.removeAttribute('data-pv-kind'); });
    document.querySelectorAll('.pv-clone,#pv-top,#pv-toast,#pv-ghost,#pv-say').forEach(function(n){ n.remove(); });
  }
})();
