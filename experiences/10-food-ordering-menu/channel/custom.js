/* lb-js: zumbalu-food 2026-09-28 */
/* [mockup 10] Food ordering menu · Zumbalú Cantina (invented) · channel 3516187. Header (name, meta, category tabs = proxies of the flow's tab buttons,
   hint = the flow's menu text), dish cards (icon tile, description, price, "+"), tap = add at once (✓ + toast), a still copy of the grid while the
   bot answers (taps on it are queued and replayed), cart pill from the visitor's own taps (display only; proxies "View cart"), order cards from the
   flow's text, fade between screens, loop guard. Only reads the DOM and presses the flow's own controls. */
(function(){
  try {
    if (window.__lbFootRan) return; window.__lbFootRan = true; document.body.classList.add('fd-js');
    var MENU = {
      Tacos:  [['Al pastor',4.5,'Pineapple, onion, cilantro','flame','#FFD9A0'], ['Birria',5.2,'Slow-cooked beef, consommé','bowl','#F9B4A0'], ['Veggie',4.2,'Roast cauliflower, salsa verde','leaf','#C8E6C9'], ['Pescado',4.8,'Crispy fish, lime slaw','fish','#FFE0B2']],
      Bowls:  [['Burrito bowl',9.5,'Rice, beans, grilled chicken','bowl','#FFD9A0'], ['Chicken tinga',9.9,'Chipotle chicken, crema','flame','#F9B4A0'], ['Veggie bowl',8.9,'Black beans, corn, avocado','leaf','#C8E6C9'], ['Chili con carne',9.2,'Beef chili, rice, cheddar','chili','#FFE0B2']],
      Drinks: [['Horchata',3,'Rice, cinnamon, 400 ml','cup','#FFE0B2'], ['Agua de jamaica',2.8,'Hibiscus iced tea, 400 ml','glass','#F9B4A0'], ['Limonada',2.5,'Fresh lime and mint, 400 ml','glass','#FFD9A0'], ['Sparkling water',1.8,'330 ml bottle','bottle','#D6E8F0']],
      Sides:  [['Guacamole & chips',4,'Avocado, lime, corn chips','leaf','#C8E6C9'], ['Elote',3.2,'Grilled corn, chili, cheese','corn','#FFD9A0'], ['Rice & beans',3,'Red rice, black beans','bowl','#FFE0B2'], ['Churros',3.8,'Cinnamon sugar, chocolate dip','cookie','#F9B4A0']]};
    var ICON = {
      flame:'<path d="M12 3c1 4 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-6 1-9z"/>',
      bowl:'<path d="M4 12h16a8 8 0 0 1-16 0z"/><path d="M9 8c0-2 1-3 1-5M14 8c0-2 1-3 1-5"/>',
      leaf:'<path d="M5 19C5 9 11 4 20 4c0 9-5 15-15 15z"/><path d="M5 19c4-5 7-8 11-11"/>',
      cup:'<path d="M5 8h11v7a5 5 0 0 1-5 5H10a5 5 0 0 1-5-5z"/><path d="M16 10h2a2 2 0 0 1 0 4h-2"/>',
      fish:'<path d="M6 12c3-4 7-5 10-5 3 0 5 2 6 5-1 3-3 5-6 5-3 0-7-1-10-5z"/><path d="M6 12L2 8v8z"/><path d="M17 11h.01"/>',
      chili:'<path d="M7 20c6 0 11-6 11-12 0-1-1-2-2-2-2 0-2 3-4 6s-5 4-7 5c-1 1 0 3 2 3z"/><path d="M16 6c0-1 1-3 3-3"/>',
      glass:'<path d="M6 4h12l-1.5 15a2 2 0 0 1-2 2h-5a2 2 0 0 1-2-2z"/><path d="M7 9h10"/>',
      bottle:'<path d="M10 3h4v3l2 3v11a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V9l2-3z"/><path d="M8 13h8"/>',
      corn:'<path d="M12 3c3 0 5 4 5 9s-2 9-5 9-5-4-5-9 2-9 5-9z"/><path d="M7 12h10M8 8h8M8 16h8"/>',
      cookie:'<path d="M12 3a9 9 0 1 0 9 9 3 3 0 0 1-3-3 3 3 0 0 1-3-3 3 3 0 0 1-3-3z"/><path d="M8 12h.01M12 16h.01M15 13h.01"/>'};
    var CATS = ['Tacos','Bowls','Drinks','Sides'], DISH = {};
    CATS.forEach(function(c){ MENU[c].forEach(function(d){ DISH[d[0]] = {p:d[1], desc:d[2], icon:d[3], tile:d[4], cat:c}; }); });
    function iconUrl(k){ var svg = "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='#2B1B12' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'>" + ICON[k].replace(/"/g, "'") + '</svg>'; return 'url("data:image/svg+xml;utf8,' + encodeURIComponent(svg) + '")'; }
    var S = [
      {k:'menu', t:'What would you like to add?', prefix:1},
      {k:'cart', t:'Your order'},
      {k:'name', t:'Name for the order?'},
      {k:'addr', t:'Where should we deliver it?'},
      {k:'done', t:'Order placed (demo)', prefix:1}];
    function txt(el){ return (el && el.textContent || '').trim(); }
    function textOf(p){ var ps=p.querySelectorAll('p'); var t = ps.length ? [].map.call(ps, function(x){ return x.textContent; }).join('\n') : p.textContent; return String(t||'').replace(/\n\s*\n+/g,'\n').trim(); }
    function first(t){ return String(t).split('\n')[0].trim(); }
    function esc(s){ return String(s).replace(/[&<>"]/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }
    function money(n){ var v=Number(n); return isFinite(v) ? '€' + v.toFixed(2) : ''; }
    function msgText(m){ var p=m.querySelector('[data-lb-part="message-text"]'); return p ? (p.getAttribute('data-fd-src') || textOf(p)) : ''; }
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
      var it=items(), lastUser=-1, cur=-1, hint='', T=[];
      it.forEach(function(x){
        if (x.a==='user') { lastUser=x.n; if (DISH[x.t]) T.push(x.t); else if (x.t==='Start a new order' || x.t==='Empty cart') T=[]; }
        else { var i=si(x.t); if (i>=0) { cur=i; if (S[i].k==='menu') hint=x.t; } } });
      var cut=lastUser, botAfter=it.some(function(x){ return x.a==='bot' && x.n>lastUser; });
      if (!botAfter && document.body.classList.contains('fd-leaving')) { var us=it.filter(function(x){ return x.a==='user'; }); cut = us.length>1 ? us[us.length-2].n : -1; }
      var vis=[]; it.forEach(function(x){ var old=x.a==='user' ? true : x.n<=cut; if (old!==x.w.hasAttribute('data-fd-old')) { if (old) x.w.setAttribute('data-fd-old',''); else x.w.removeAttribute('data-fd-old'); } if (!old && x.a==='bot') vis.push(x); });
      return {cur:cur, s:cur>=0?S[cur]:null, visible:vis, hint:hint, T:T};
    }
    function clone(p, html){
      var t=p.getAttribute('data-fd-src') || textOf(p), n=p.nextElementSibling, key=t+'|'+html.length;
      if (p.getAttribute('data-fd-src')===t && n && n.classList.contains('fd-clone') && n.getAttribute('data-for')===key) return;
      if (n && n.classList.contains('fd-clone')) n.remove();
      var d=document.createElement('div'); d.className='fd-clone'; d.setAttribute('data-for', key); d.innerHTML=html; p.insertAdjacentElement('afterend', d); p.setAttribute('data-fd-src', t);
    }
    function lines(t){ return t.split('\n').map(function(s){ return s.trim(); }).filter(Boolean); }
    function grouped(list){ var order=[], n={}; list.forEach(function(d){ if (!(d in n)) { n[d]=0; order.push(d); } n[d]++; }); return order.map(function(d){ return {d:d, n:n[d]}; }); }
    function itemRows(s){ return grouped(s.split(', ').map(function(x){ return x.trim(); }).filter(Boolean)).map(function(g){ var D=DISH[g.d];
      return '<div class="r"><span>'+(g.n>1?g.n+'× ':'')+esc(g.d)+'</span><span>'+(D?money(D.p*g.n):'')+'</span></div>'; }).join(''); }
    function euro(v){ return String(v).replace(/€\s?(\d+\.\d+)/g, function(_, n){ return money(n); }); }
    function decorate(st){
      document.querySelectorAll('.fd-clone').forEach(function(c){ var p=c.previousElementSibling; if (!p || !p.hasAttribute('data-fd-src')) c.remove(); });
      st.visible.forEach(function(x){
        var p=x.m.querySelector('[data-lb-part="message-text"]'); if (!p) return;
        var L=lines(x.t), h=L[0], kind='';
        if (h.indexOf('Items: ')===0) { var tot=(L.filter(function(l){ return l.indexOf('Total: ')===0; })[0]||'').slice(7); kind='card';
          clone(p, '<div class="fd-order">'+itemRows(h.slice(7))+'<div class="tot"><span>Total</span><span>'+esc(money(tot.replace('€','')))+'</span></div></div>'); }
        else if (h.indexOf("What Zumbalú Cantina's kitchen would receive")===0) { kind='card'; var r='<div class="fd-order"><div class="t">'+esc(h)+'</div>';
          L.slice(1).forEach(function(l){ var c=l.indexOf(': '); if (c<0) return; var k=l.slice(0,c), v=l.slice(c+2);
            if (k==='Items') r+=itemRows(v); else r+='<div class="r k"><span>'+esc(k)+'</span><span>'+esc(k==='Total' ? money(v.replace('€','')) : v)+'</span></div>'; });
          clone(p, r+'</div>'); }
        else if (h.indexOf('Add €')===0) { kind='card'; clone(p, '<div class="fd-warn">'+esc(euro(h))+'</div>'); }
        else if (h==='Where should we deliver it?') { kind='card'; clone(p, '<div class="fd-q">'+esc(h)+'</div><div class="fd-qs">'+esc(L.slice(1).join(' '))+'</div>'); }
        else if (h==='Your order' || h.indexOf('Order placed (demo)')===0) kind='lead';
        else if (h==='Name for the order?') kind='q';
        else if (h.indexOf('Demo only')===0) kind='fine';
        if ((x.m.getAttribute('data-fd-kind')||'')!==kind) { if (kind) x.m.setAttribute('data-fd-kind', kind); else x.m.removeAttribute('data-fd-kind'); }
      });
    }
    /* injected UI */
    var top=document.createElement('div'); top.id='fd-top';
    top.innerHTML='<div><div class="fd-n">Zumbalú Cantina</div><div class="fd-m">Delivery 25–35 min · Min. order €12 · demo menu</div></div>'
      + '<div class="fd-tabs" role="tablist" aria-label="Menu categories">'+CATS.map(function(c){ return '<button type="button" class="fd-tab" role="tab" data-cat="'+c+'">'+c+'</button>'; }).join('')+'</div>'
      + '<div class="fd-hint"></div>';
    top.insertAdjacentHTML('afterbegin', '<button type="button" class="fd-back" hidden>Back</button>');
    var hintEl=top.querySelector('.fd-hint'), tabs=[].slice.call(top.querySelectorAll('.fd-tab')), backBtn=top.querySelector('.fd-back');
    var sayEl=document.createElement('div'); sayEl.id='fd-say'; sayEl.setAttribute('role','status'); sayEl.setAttribute('aria-live','polite');
    var sayT=null; function say(m){ sayEl.textContent=m; clearTimeout(sayT); sayT=setTimeout(function(){ sayEl.textContent=''; }, 2800); }
    var answers={}, cameBack=false;
    function nativeBack(){ return document.querySelector('button[data-slot="button"][data-size="sm"][data-variant="ghost"]'); }
    function setVal(i, v){ Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(i, v); i.dispatchEvent(new Event('input',{bubbles:true})); }
    var EMPTY={name:'Type your name to continue.', addr:'Type the street and number to continue.'};
    var pill=document.createElement('button'); pill.type='button'; pill.id='fd-pill';
    pill.innerHTML='<span class="l"><span class="c">No items yet</span><span class="v">€0.00</span></span><span class="go">View cart</span>';
    var pc=pill.querySelector('.c'), pv=pill.querySelector('.v');
    var toastEl=document.createElement('div'); toastEl.id='fd-toast'; toastEl.setAttribute('role','status'); toastEl.setAttribute('aria-live','polite'); document.body.appendChild(toastEl);
    var toastT=null; function toast(m){ toastEl.textContent=m; toastEl.setAttribute('data-on',''); clearTimeout(toastT); toastT=setTimeout(function(){ toastEl.removeAttribute('data-on'); }, 1500); }
    var ghost=null;
    function footer(){ return document.querySelector('[data-lb-part="window"] > .responsive-container:last-child'); }
    function park(){
      var hc=document.querySelector('[data-lb-part="header"] > .responsive-container'); if (hc && top.parentNode!==hc) hc.appendChild(top);
      var foot=footer(); if (!foot) return;
      var brand=[].filter.call(foot.children, function(k){ return k.querySelector('[data-lb-part="branding"]'); })[0]||null;
      if (pill.parentNode!==foot || pill.nextElementSibling!==brand) foot.insertBefore(pill, brand);
      if (sayEl.parentNode!==foot || sayEl.nextElementSibling!==pill) foot.insertBefore(sayEl, pill);
      if (ghost && (ghost.parentNode!==foot || ghost.nextElementSibling!==sayEl)) foot.insertBefore(ghost, sayEl);
      
    }
    function realOpts(){ return [].filter.call(document.querySelectorAll('[data-lb-part="option-button"]'), function(b){ return !b.closest('#fd-ghost'); }); }
    function realOpt(l){ return realOpts().filter(function(b){ return txt(b)===l; })[0]||null; }
    function inputEl(){ return document.querySelector('[data-lb-part="text-input"] input, [data-lb-part="input-field"] input'); }
    var pass=false; function realClick(b){ pass=true; try { b.click(); } finally { pass=false; } }
    var leaveFrom=null, leaveArr=0, leaveT=null, leaveChk=null;
    function leaving(on, from){ clearTimeout(leaveT); clearTimeout(leaveChk);
      if (!on) { document.body.classList.remove('fd-leaving'); leaveFrom=null; return; }
      leaveFrom=from; leaveArr=arrival; document.body.classList.add('fd-leaving'); leaveT=setTimeout(function(){ leaving(false); }, 3500);
      leaveChk=setTimeout(function(){ var st=readState(); if (inputEl() && st.cur===leaveFrom && arrival===leaveArr) leaving(false); }, 400); }
    /* cart = the visitor's dishes in the transcript since the last "Start a new order" + taps whose message has not appeared yet */
    var kbd=false, cartPending=false, spent=null, opt=[], lastT=0, queue=[], addedAt={}, wantCat=null, curCat='Tacos', refocus=null;
    function cart(st){ var T=st.T; if (T.length<lastT) lastT=T.length; if (T.length>lastT) { opt.splice(0, T.length-lastT); lastT=T.length; } return T.concat(opt); }
    function makeGhost(){
      var list=realOpts()[0]; list=list && list.closest('[data-lb-part="options-list"]'); if (!list) return;
      var foot=footer(), slot=list; while (slot && slot.parentNode!==foot) slot=slot.parentNode; if (!slot) return;
      if (ghost) ghost.remove(); ghost=slot.cloneNode(true); ghost.id='fd-ghost';
      ghost.hidden=true; [].forEach.call(ghost.querySelectorAll('input'), function(n){ n.tabIndex=-1; }); park();
    }
    function bump(){ pill.classList.remove('fd-bump'); void pill.offsetWidth; pill.classList.add('fd-bump'); }
    function added(label){ var D=DISH[label]; opt.push(label); addedAt[label]=Date.now(); toast('Added '+label+' · '+money(D.p)); bump(); setTimeout(function(){ render(true); }, 950); }
    function goCart(){ var st=readState(), c=cart(st);
      if (!c.length) { toast('Your cart is empty. Tap a dish to add it.'); return; }
      pill.classList.add('fd-pressed'); setTimeout(function(){ pill.classList.remove('fd-pressed'); }, 140);
      leaving(true, st.cur); cartPending=true; var b=realOpt('View cart'); if (b && !queue.length && fresh()) { makeGhost(); send(b); } else queue.push('View cart'); render(true); }
    function goTab(c){ if (c===(wantCat||curCat)) return; wantCat=c; render(true);
      var b=realOpt(c); if (b && !queue.length && fresh()) { makeGhost(); send(b); } else queue.push(c); render(true); }
    function keyAdd(label){ var b=realOpt(label); added(label); kbd=false;
      if (b && !queue.length && fresh()) { b.setAttribute('data-fd-added',''); makeGhost(); send(b); } else queue.push(label); render(true); }
    function listOf(b){ return b && b.closest('[data-lb-part="options-list"]'); }
    function fresh(){ var o=realOpts(); return o.length && listOf(o[0])!==spent; }
    function send(b){ spent=listOf(b); setTimeout(function(){ realClick(b); }, 0); }
    function drain(){ if (!queue.length || !fresh()) return; var l=queue.shift(), b=realOpt(l);
      if (!b) { render(true); return; } if (DISH[l]) { b.setAttribute('data-fd-added',''); if (kbd) refocus=l; } makeGhost(); if (l==='View cart') { cartPending=true; leaving(true, readState().cur); }
      send(b); }
    document.addEventListener('click', function(e){
      if (pass) return; var t=e.target; if (!t || !t.closest) return;
      var g=t.closest('#fd-ghost [data-lb-part="option-button"]');
      if (g) { e.preventDefault(); e.stopPropagation(); var l=txt(g);
        if (wantCat || cartPending) { toast(cartPending ? 'Opening your cart…' : 'One moment: opening '+wantCat+'…'); return; }
        if (DISH[l]) { added(l); queue.push(l); g.setAttribute('data-fd-added',''); kbd = e.detail===0; if (kbd) refocus=l; } return; }
      var b=t.closest('[data-lb-part="option-button"]'); if (!b) return;
      var st=readState(), l2=txt(b);
      if (st.s && st.s.k==='menu') {
        if (DISH[l2]) { if (queue.length || listOf(b)===spent) { e.preventDefault(); e.stopPropagation(); added(l2); queue.push(l2); return; }
          added(l2); b.setAttribute('data-fd-added',''); kbd = e.detail===0; if (kbd) refocus=l2; makeGhost(); spent=listOf(b); return; }
        spent=listOf(b); if (CATS.indexOf(l2)>=0) { wantCat=l2; return; }
        if (l2==='View cart') { leaving(true, st.cur); return; } }
      spent=listOf(b); leaving(true, st.cur);
    }, true);
    document.addEventListener('pointerdown', function(e){ var sb=e.target && e.target.closest && e.target.closest('[data-lb-part="input-submit"]'), i=inputEl(), s=readState().s;
      if (!sb || !i || !s) return; var v=(i.value||'').trim(); if (!v && EMPTY[s.k]) { say(EMPTY[s.k]); return; }
      if (s.k==='name' ? /^[A-Za-zÀ-ÖØ-öø-ÿ'\- ]{2,40}$/.test(v) : v.length>=6) answers[s.k]=v; }, true);
    backBtn.addEventListener('click', function(){ var nb=nativeBack(); if (!nb) return; cameBack=true; leaving(true, readState().cur); setTimeout(function(){ realClick(nb); }, 0); });
    tabs.forEach(function(tb){ tb.addEventListener('click', function(){ goTab(tb.getAttribute('data-cat')); }); });
    pill.addEventListener('click', goCart);
    document.addEventListener('keydown', function(e){
      var t=e.target, st=readState(), s=st.s; if (!s || e.metaKey || e.ctrlKey || e.altKey) return;
      if (t && t.tagName==='INPUT') { var v=(t.value||'').trim(); if (e.key!=='Enter') return;
        if (!v && EMPTY[s.k]) { e.preventDefault(); say(EMPTY[s.k]); return; }
        if (s.k==='name' ? /^[A-Za-zÀ-ÖØ-öø-ÿ'\- ]{2,40}$/.test(v) : v.length>=6) { answers[s.k]=v; leaving(true, st.cur); } return; }
      if (t && t.closest && (t.closest('[data-lb-part="option-button"]') || t===pill || t.closest('#fd-top'))) { if (e.key==='Enter' || e.key===' ' || s.k!=='menu') return; }
      if (s.k==='menu') {
        var n=parseInt(e.key,10), dishes=MENU[wantCat||curCat];
        if (n>=1 && n<=4 && !wantCat) { e.preventDefault(); keyAdd(dishes[n-1][0]); return; }
        if (e.key==='ArrowRight' || e.key==='ArrowLeft') { var i=CATS.indexOf(wantCat||curCat)+(e.key==='ArrowRight'?1:-1); if (i>=0 && i<CATS.length) { e.preventDefault(); goTab(CATS[i]); } return; }
        if (e.key==='Enter' || e.key==='c') { e.preventDefault(); goCart(); }
        return; }
      if (e.key==='Enter') { var o=realOpts(); if (o.length && fresh()) { e.preventDefault(); leaving(true, st.cur); send(o[0]); } }
    }, true);
    var last='', focusedFor=null;
    function render(force){
      park(); var st=readState(); decorate(st);
      var s=st.s, k=s?s.k:'', o=realOpts(), inp=inputEl(), now=Date.now();
      if (leaveFrom!==null && st.cur!==leaveFrom && (o.length || inp)) leaving(false);
      if (k==='menu' && o.length) { var tl=o.map(txt).filter(function(l){ return CATS.indexOf(l)>=0; });
        if (tl.length===3) { curCat=CATS.filter(function(c){ return tl.indexOf(c)<0; })[0]; if (wantCat===curCat) wantCat=null; } }
      if (k!=='menu') { wantCat=null; if (queue.length && queue[0]!=='View cart') queue=[]; }
      if (ghost && (fresh() || k!=='menu')) { ghost.remove(); ghost=null; } if (!ghost && !queue.length) cartPending=false;
      if (ghost) { if (ghost.hidden!==!!o.length) ghost.hidden=!!o.length; if (wantCat || cartPending) ghost.setAttribute('data-dim',''); else ghost.removeAttribute('data-dim'); }
      o.forEach(function(b){ var l=txt(b), D=DISH[l], kind = k==='menu' ? (D ? 'dish' : CATS.indexOf(l)>=0 ? 'tab' : l==='View cart' ? 'cart' : '') : '';
        if ((b.getAttribute('data-fd-kind')||'')!==kind) { if (kind) b.setAttribute('data-fd-kind', kind); else b.removeAttribute('data-fd-kind'); }
        if (kind==='dish') { var pr=money(D.p); if (b.getAttribute('data-price')!==pr) { b.setAttribute('data-price', pr); b.setAttribute('aria-label', 'Add '+l+', '+pr); b.style.setProperty('--tile', D.tile); b.style.setProperty('--icon', iconUrl(D.icon)); }
          var sp=b.querySelector('span'); if (sp && sp.getAttribute('data-sub')!==D.desc) sp.setAttribute('data-sub', D.desc);
          var on=addedAt[l] && now-addedAt[l]<900; if (on!==b.hasAttribute('data-fd-added')) { if (on) b.setAttribute('data-fd-added',''); else b.removeAttribute('data-fd-added'); } } });
      if (refocus) { var rb = fresh() ? realOpt(refocus) : null, gb = !rb && ghost && !ghost.hidden ? [].filter.call(ghost.querySelectorAll('[data-lb-part="option-button"]'), function(b){ return txt(b)===refocus; })[0] : null;
        if (rb) { refocus=null; try { rb.focus({preventScroll:true}); } catch(x){} } else if (gb && document.activeElement!==gb) { try { gb.focus({preventScroll:true}); } catch(x){} } }
      if (inp && s) { var ph={name:'Your name', addr:'Street, number, floor'}[k]; if (ph && inp.getAttribute('placeholder')!==ph) { inp.setAttribute('placeholder', ph); inp.setAttribute('autocomplete', k==='name'?'name':'street-address'); }
        if (focusedFor!==k && !document.body.classList.contains('fd-leaving')) { focusedFor=k; if (cameBack && answers[k] && !inp.value) setVal(inp, answers[k]); cameBack=false; try { inp.focus({preventScroll:true}); } catch(x){} } }
      if (!inp) focusedFor=null;
      var c=cart(st), total=c.reduce(function(a, d){ return a+DISH[d].p; }, 0);
      var sig=[st.cur, k, o.length, !!inp, !!nativeBack(), cartPending, c.length, total.toFixed(2), wantCat, curCat, st.hint, queue.length, !!ghost, document.body.classList.contains('fd-leaving')].join('|');
      drain();
      if (!force && sig===last) return; last=sig;
      document.body.setAttribute('data-fd-screen', k);
      var bl = k==='name' ? 'Back to your order' : k==='addr' ? 'Back' : ''; backBtn.hidden = !(bl && nativeBack()); if (bl && backBtn.textContent!==bl) backBtn.textContent=bl;
      if (k!=='name' && k!=='addr') sayEl.textContent='';
      if (st.hint && hintEl.textContent!==first(st.hint)) hintEl.textContent=first(st.hint);
    tabs.forEach(function(tb){ var on=tb.getAttribute('data-cat')===(wantCat||curCat); if (on!==tb.hasAttribute('data-on')) { if (on) tb.setAttribute('data-on',''); else tb.removeAttribute('data-on'); } tb.setAttribute('aria-selected', on?'true':'false'); });
      pc.textContent = c.length ? c.length+(c.length===1?' item':' items') : 'No items yet'; pv.textContent = money(total);
      if (c.length) pill.removeAttribute('data-empty'); else pill.setAttribute('data-empty','');
      pill.setAttribute('aria-label', c.length ? 'View cart, '+c.length+(c.length===1?' item':' items')+', '+money(total) : 'Cart is empty');
    }
    render(true); setInterval(render, 300);
    var winT=0, winN=0;   /* loop guard */
    var mo=new MutationObserver(function(){ try { var now=Date.now(); if (now-winT>1000) { winT=now; winN=0; } if (++winN>300) { mo.disconnect(); window.__fdLoop={n:winN}; return; } render(); } catch(e){ window.__lbFootErr=String(e); } });
    mo.observe(document.body, {childList:true, subtree:true, characterData:true});
    window.__mkState=function(){ var st=readState(), c=cart(st); return {screen:st.s?st.s.k:null, cat:wantCat||curCat, items:c.length, pill:pc.textContent+' '+pv.textContent, queue:queue.slice(), ghost:!!ghost, T:st.T.length}; };
  } catch(err) {
    window.__lbFootErr=String(err); document.body.classList.remove('fd-js');
    document.querySelectorAll('[data-fd-src],[data-fd-old],[data-fd-kind]').forEach(function(p){ p.removeAttribute('data-fd-src'); p.removeAttribute('data-fd-old'); p.removeAttribute('data-fd-kind'); });
    document.querySelectorAll('.fd-clone,#fd-top,#fd-pill,#fd-toast,#fd-ghost').forEach(function(n){ n.remove(); });
  }
})();
