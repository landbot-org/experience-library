/* lb-js: ins-hearthmoor 2 · [mockup 11] Home insurance quote · Hearthmoor (invented) · channel 3516133. Screen state, card subtitles + icons (attributes only),
   pick-then-CTA (a tap selects a card, the pink CTA sends it; keys 1-4 pick, Enter = CTA), live price card (display only: the quote the
   visitor gets is the flow's own formulas block), split/clone of the price, record and greeting texts.
   Reads the DOM; the only thing it ever sends is a click on the flow's own buttons / submit. Fails open: on error the raw chat shows.
   BACK (09-25): the chat's native Back is ON. Its "Back" message is never taken as an answer; a Back click fades the screen like a send
   and drops the pick; the re-asked question clears its own answer and every later one, so the price card re-prices from what is left. */
(function(){
  try {
    if (window.__lbFootRan) return; window.__lbFootRan = true; document.body.classList.add('ins-js');
    var Q = [
      {k:'type',   m:'First, is your place a flat or a house?', cta:'Let\u2019s do it'},
      {k:'tenure', m:'Do you rent it or own it?', cta:'Continue'},
      {k:'beds',   m:'How many bedrooms does it have?', cta:'Continue'},
      {k:'value',  m:'Roughly what is everything inside worth?', cta:'Continue'},
      {k:'out',    m:'Cover your things outside the home too?', cta:'Continue'},
      {k:'name',   m:"What's your first name?", cta:'Continue', text:1},
      {k:'email',  p:'Where can the team reach you', cta:'See my quote', text:1},
      {k:'quote',  p:"Here's your quote", cta:'Get covered', end:1},
      {k:'done',   p:'Done, ', cta:'Start over', end:1},
      {k:'fail',   p:"Sorry, I couldn't price", cta:'Start over', end:1}];
    var CARDS = 5;
    var PRICE = {type:{'A flat':7.25,'A house':9.25}, tenure:{'I rent':0,'I own it':6}, beds:{'1':0,'2':1,'3':2,'4 or more':3},
                 value:{'Under €10k':0,'€10k–25k':2,'€25k–50k':4,'Over €50k':7}, out:{'Yes, add it':1,'No thanks':0}};
    var SUB = {'A flat':'Apartment or studio','A house':'Detached or terraced','I rent':'Cover for your things','I own it':'Your things and the building',
               '1':'bedroom or studio','2':'bedrooms','3':'bedrooms','4 or more':'bedrooms',
               'Under €10k':'A few essentials','€10k–25k':'A furnished home','€25k–50k':'Plenty of nice things','Over €50k':'Art, jewellery and more',
               'Yes, add it':'Phone, laptop, bike · +€1/month','No thanks':'Just at home'};
    var ICON = {'A flat':'flat','A house':'house','I rent':'key','I own it':'own','1':'bed','2':'bed','3':'bed','4 or more':'bed',
                'Under €10k':'box','€10k–25k':'sofa','€25k–50k':'tv','Over €50k':'gem','Yes, add it':'shield','No thanks':'house'};
    var PRIMARY = {'Get covered':1,'Start over':1}, BACK = /^(\u2039 ?)?Back$/;
    var BACK_SEL = '[aria-label="Conversation messages"] button[data-slot="button"][data-size="sm"][data-variant="ghost"]';
    var urlName = ((new URL(document.URL)).searchParams.get('first_name')||'').trim().replace(/[<>&"]/g,'').slice(0,30);

    function txt(el){ return (el && el.textContent || '').trim(); }
    function norm(t){ return String(t).replace(/\u2019/g, "'"); }
    function match(t){ t=norm(t); for (var i=0;i<Q.length;i++){ var q=Q[i]; if (q.m ? t===q.m : t.indexOf(q.p)===0) return i; } return -1; }
    function msgText(m){ var p=m.querySelector('[data-lb-part="message-text"]'); return p ? (p.getAttribute('data-ins-src') || txt(p)) : ''; }
    /* ARRIVAL ORDER: v4 sorts the thread by timestamp, and a visitor who answers within ~1 s gets the answer placed ABOVE the question it
       answers (client vs server clock; seen live 2026-09-22, same as GOAL-2). So every decision uses first-seen order, never DOM order. */
    var seen = {}, arrival = 0;
    function items(){
      var list = document.querySelector('[aria-label="Conversation messages"]'); if (!list) return [];
      var counts = {}, out = [];
      [].forEach.call(list.children, function(w){
        var m = w.querySelector('[data-lb-part="message"]'); if (!m) return;
        var a = m.getAttribute('data-lb-author'), t = msgText(m); if (!t) return;
        var base = a + '|' + t; counts[base] = (counts[base]||0) + 1; var key = base + '#' + counts[base];
        if (!(key in seen)) seen[key] = arrival++;
        out.push({w:w, m:m, a:a, t:t, n:seen[key]});
      });
      out.sort(function(x, y){ return x.n - y.n; });
      return out;
    }
    function readState(){
      var cur=-1, ans={}, it=items(), lastUser=-1;
      it.forEach(function(x){
        if (x.a==='bot') { var i=match(x.t); if (i>=0) { cur=i; if (i===0) ans={}; for (var j=i;j<Q.length;j++) delete ans[Q[j].k]; } }
        else { lastUser = x.n; if (BACK.test(x.t)) return; if (cur>=0 && !Q[cur].end) { var q=Q[cur]; if (q.text || (PRICE[q.k] && x.t in PRICE[q.k])) ans[q.k]=x.t; } }
      });
      /* current turn only: everything that arrived before the visitor's last answer is hidden */
      it.forEach(function(x){ var old = x.n <= lastUser; if (old !== x.w.hasAttribute('data-ins-old')) { if (old) x.w.setAttribute('data-ins-old',''); else x.w.removeAttribute('data-ins-old'); } });
      return {cur:cur, ans:ans};
    }
    function opts(){ return [].slice.call(document.querySelectorAll('[data-lb-part="option-button"]')); }
    function inputEl(){ return document.querySelector('[data-lb-part="input-field"] > input, [data-lb-part="input-field"] > textarea'); }
    function money(v){ return '€' + v.toFixed(2); }
    /* would the widget accept this text answer? (only decides whether to fade; the widget still validates) */
    function looksValid(inp){ var v=(inp && inp.value || '').trim(); if (!v) return false; var q=Q[readState().cur]||{};
      if (q.k==='email') return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
      try { return inp.checkValidity ? inp.checkValidity() : true; } catch(e) { return true; } }

    /* injected UI, parked in the footer container so it inherits width and centring (REFERENCE §10.4) */
    var price = document.createElement('div'); price.id='ins-price'; price.hidden=true;
    price.innerHTML = '<div class="ins-p-l"><span class="ins-p-k"><span class="ins-p-kt"></span><span class="ins-p-demo"> · demo price</span></span><span class="ins-p-v"></span></div><div class="ins-p-r"><span class="ins-p-tag">Cancel anytime</span></div>';
    var wrap = document.createElement('div'); wrap.id='ins-cta-wrap';
    wrap.innerHTML = '<div id="ins-hint" hidden>Pick one to continue</div><button type="button" id="ins-cta">Let’s do it</button><div id="ins-step">Takes about 90 seconds</div>';
    var cta = wrap.querySelector('#ins-cta'), step = wrap.querySelector('#ins-step'), hint = wrap.querySelector('#ins-hint');
    function park(){
      var foot = document.querySelector('[data-lb-part="window"] > .responsive-container:last-child'); if (!foot) return;
      var kids = [].slice.call(foot.children), brand = kids.filter(function(k){ return k.querySelector('[data-lb-part="branding"]'); })[0] || null;
      var first = kids.filter(function(k){ return k!==price && k!==wrap && k!==brand; })[0] || null;
      if (wrap.parentNode!==foot || wrap.nextElementSibling!==brand) foot.insertBefore(wrap, brand);
      if (price.parentNode!==foot || price.nextElementSibling!==wrap) foot.insertBefore(price, wrap);
      if (first && first.nextElementSibling!==price) foot.insertBefore(first, price);
    }

    /* text clones: never edit React's node; hide it (data-ins-src) and put a styled twin after it */
    function clone(p, html, cls){
      var t = p.getAttribute('data-ins-src') || txt(p), n = p.nextElementSibling;
      if (p.getAttribute('data-ins-src')===t && n && n.classList.contains('ins-clone') && n.getAttribute('data-for')===t+'|'+html.length) return;
      if (n && n.classList.contains('ins-clone')) n.remove();
      var d = document.createElement('div'); d.className = 'ins-clone ' + (cls||''); d.setAttribute('data-for', t+'|'+html.length); d.innerHTML = html;
      p.insertAdjacentElement('afterend', d); p.setAttribute('data-ins-src', t);
    }
    function esc(s){ return String(s).replace(/[&<>"]/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }
    function decorate(){
      document.querySelectorAll('.ins-clone').forEach(function(c){ var p=c.previousElementSibling; if (!p || !p.hasAttribute('data-ins-src')) c.remove(); });
      [].forEach.call(document.querySelectorAll('[data-lb-part="message"][data-lb-author="bot"]'), function(m){
        var p = m.querySelector('[data-lb-part="message-text"]'); if (!p) return; var t = p.getAttribute('data-ins-src') || txt(p); if (!t) return;
        var kind = '', tn = norm(t);
        if (tn.indexOf('Hi there.')===0 || tn.indexOf("Here's your quote")===0 || tn.indexOf('Done, ')===0 || tn.indexOf("Sorry, I couldn't")===0) kind='lead';
        else if (/^€[0-9.]+ \/ month$/.test(t)) kind='price';
        else if (t.indexOf('Sent to the Hearthmoor team')===0) kind='record';
        else if (t.indexOf('Covers ')===0 || t.indexOf('Demo only')===0) kind='fine';
        if (kind && m.getAttribute('data-ins-kind')!==kind) m.setAttribute('data-ins-kind', kind);
        if (kind==='lead' && urlName && t.indexOf('Hi there.')===0) clone(p, esc(t.replace('Hi there.', 'Hi ' + urlName + '.')));
        if (kind==='price') { var v=t.replace(' / month','');
          clone(p, '<div class="ins-quote-card"><div class="ins-q-l"><span class="ins-q-k">Your monthly price<span class="ins-q-demo"> · demo quote</span></span><span class="ins-q-v">'+esc(v)+'<small> / month</small></span></div><div class="ins-q-r"><span class="ins-q-tag">Cancel anytime</span></div></div>'); }
        if (kind==='record') { var L=t.split('\n'), h='<div class="ins-record"><div class="ins-r-t">'+esc(L[0])+'</div>';
          for (var i=1;i<L.length;i++){ var c=L[i].indexOf(': '); if (c>0) h+='<div class="ins-r-row"><span class="ins-r-k">'+esc(L[i].slice(0,c))+'</span><span class="ins-r-v">'+esc(L[i].slice(c+2))+'</span></div>'; }
          clone(p, h+'</div>'); }
      });
    }

    var picked=null, pickedFor=-2, pass=false, last='', lastEst=null, focusedFor=null;
    function realClick(b){ pass=true; try { b.click(); } finally { pass=false; } }
    /* screen change: fade the current screen out on send, back in when the next one is ready, so the price card never jumps.
       Never blanks the page: 3.5 s timeout, and a text answer the widget refuses (validation) un-fades after 300 ms. */
    var leaveFrom=null, leaveArr=0, leaveT=null, leaveChk=null;
    function leaving(on, from){
      clearTimeout(leaveT); clearTimeout(leaveChk);
      if (!on) { document.body.classList.remove('ins-leaving'); leaveFrom=null; return; }
      leaveFrom=from; leaveArr=arrival; document.body.classList.add('ins-leaving');
      leaveT=setTimeout(function(){ leaving(false); }, 3500);
      leaveChk=setTimeout(function(){ var i=inputEl(), s=readState(); if (i && s.cur===leaveFrom && arrival===leaveArr) leaving(false); }, 300);
    }
    function send(){
      var s=readState(), o=opts(); if (s.cur<0) return;
      cta.classList.add('ins-pressed'); setTimeout(function(){ cta.classList.remove('ins-pressed'); }, 140);
      var q=Q[s.cur];
      if (q.end) { var b=o.filter(function(x){ return PRIMARY[txt(x)]; })[0] || (o.length===1 ? o[0] : null); if (b) { leaving(true, s.cur); realClick(b); } return; }
      if (q.text) { var sb=document.querySelector('[data-lb-part="input-submit"]'), inp=inputEl();
        if (inp && !inp.value.trim()) { inp.focus(); nudge(); return; }
        if (looksValid(inp)) leaving(true, s.cur); if (sb && !sb.disabled) sb.click(); else if (inp) inp.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',code:'Enter',keyCode:13,bubbles:true}));
        return; }
      if (o.length>1) { if (!picked) { nudge(); return; } var bb=o.filter(function(x){ return txt(x)===picked; })[0]; if (bb) { leaving(true, s.cur); realClick(bb); picked=null; } }
    }
    var nudgeT=null;
    function nudge(){ document.body.classList.remove('ins-nudge'); void document.body.offsetWidth; document.body.classList.add('ins-nudge'); hint.hidden=false;
      clearTimeout(nudgeT); nudgeT=setTimeout(function(){ document.body.classList.remove('ins-nudge'); hint.hidden=true; }, 1600); }
    function pick(b){ picked=txt(b); hint.hidden=true; opts().forEach(function(x){ if (x===b) x.setAttribute('data-lb-picked','1'); else x.removeAttribute('data-lb-picked'); }); render(true); }
    /* pick-then-CTA on card questions: the capture listener runs before React's root listener */
    document.addEventListener('click', function(e){
      if (pass) return; var b=e.target && e.target.closest && e.target.closest('[data-lb-part="option-button"]'); if (!b) return;
      var s=readState(); if (s.cur<0 || s.cur>=CARDS || opts().length<2) return;
      e.preventDefault(); e.stopPropagation(); pick(b);
    }, true);
    cta.addEventListener('click', send);
    /* native Back: behaves like a send for the skin (fade out, forget the pick); the flow re-asks the previous question */
    document.addEventListener('click', function(e){ if (pass) return; var b=e.target && e.target.closest && e.target.closest(BACK_SEL); if (!b) return;
      var s=readState(); picked=null; pickedFor=-2; hint.hidden=true; document.body.classList.remove('ins-nudge');
      opts().forEach(function(x){ x.removeAttribute('data-lb-picked'); }); if (s.cur>=0) leaving(true, s.cur); window.__insBacks=(window.__insBacks||0)+1; }, true);
    document.addEventListener('keydown', function(e){ var t=e.target; if (e.key!=='Enter' || !t || t.tagName!=='INPUT' || !t.closest('[data-lb-part="input-field"]')) return;
      if (looksValid(t)) leaving(true, readState().cur); }, true);
    document.addEventListener('click', function(e){ if (pass) return; var b=e.target && e.target.closest && e.target.closest('[data-lb-part="option-button"][data-ins-role="link"]'); if (b) leaving(true, readState().cur); }, true);
    document.addEventListener('keydown', function(e){
      var t=e.target, typing=t && (t.tagName==='INPUT'||t.tagName==='TEXTAREA'||t.isContentEditable); if (typing||e.metaKey||e.ctrlKey||e.altKey) return;
      if (t===cta && (e.key==='Enter'||e.key===' ')) return;
      var fc = t && t.closest && t.closest('[data-lb-part="option-button"]'), isSpace = e.key===' ' || e.key==='Spacebar' || e.code==='Space';
      if (fc && (e.key==='Enter' || isSpace)) { var s0=readState(); if (s0.cur>=0 && s0.cur<CARDS && opts().length>1) { e.preventDefault(); e.stopPropagation();
          if (e.key==='Enter' && picked===txt(fc)) send(); else pick(fc); return; } }
      if (e.key==='Enter') { send(); e.preventDefault(); return; }
      var s=readState(); if (s.cur<0 || s.cur>=CARDS) return;
      var n=parseInt(e.key,10), o=opts(); if (n>=1 && n<=o.length) { pick(o[n-1]); e.preventDefault(); }
    }, true);

    function render(force){
      park(); decorate();
      var s=readState(), o=opts(), inp=inputEl(), q = s.cur>=0 ? Q[s.cur] : null;
      if (leaveFrom!==null && s.cur!==leaveFrom && (o.length || inp)) leaving(false);
      if (pickedFor!==s.cur) { picked=null; pickedFor=s.cur; }
      o.forEach(function(b){ var l=txt(b), sp=b.querySelector('span');
        if (sp && SUB[l] && sp.getAttribute('data-sub')!==SUB[l]) sp.setAttribute('data-sub', SUB[l]);
        if (ICON[l] && b.getAttribute('data-ins-icon')!==ICON[l]) b.setAttribute('data-ins-icon', ICON[l]);
        var role = (q && q.end) ? (PRIMARY[l] ? 'primary' : 'link') : '';
        if ((b.getAttribute('data-ins-role')||'')!==role) { if (role) b.setAttribute('data-ins-role', role); else b.removeAttribute('data-ins-role'); }
        if (l===picked) { if (!b.hasAttribute('data-lb-picked')) b.setAttribute('data-lb-picked','1'); } else if (b.hasAttribute('data-lb-picked')) b.removeAttribute('data-lb-picked'); });
      if (inp && q && q.text && focusedFor!==s.cur && !document.body.classList.contains('ins-leaving')) { focusedFor=s.cur; try { inp.focus({preventScroll:true}); } catch(e){} }
      if (!q || !q.text) focusedFor=null;
      if (inp) { var ph = q && q.k==='email' ? 'name@example.com' : q && q.k==='name' ? 'Your first name' : '';
        if (ph && inp.getAttribute('placeholder')!==ph) inp.setAttribute('placeholder', ph);
        if (q && q.k==='email' && inp.getAttribute('inputmode')!=='email') { inp.setAttribute('inputmode','email'); inp.setAttribute('autocomplete','email'); }
        if (q && q.k==='name' && inp.getAttribute('autocomplete')!=='given-name') inp.setAttribute('autocomplete','given-name'); }
      /* price estimate: chosen components (or the tapped card, as a preview) + the cheapest option for the rest */
      var view={}; for (var k in s.ans) view[k]=s.ans[k]; if (picked && q && PRICE[q.k]) view[q.k]=picked;
      var est=0, known=0; for (var pk in PRICE) { var tbl=PRICE[pk]; if (view[pk]!=null && view[pk] in tbl) { est+=tbl[view[pk]]; known++; } else { var mn=Infinity; for (var x in tbl) mn=Math.min(mn,tbl[x]); est+=mn; } }
      var screen = q ? q.k : '';
      var sig=[screen, picked, o.length, !!inp, JSON.stringify(view)].join('|'); if (!force && sig===last) return; last=sig;
      if (document.body.getAttribute('data-ins-screen')!==screen) document.body.setAttribute('data-ins-screen', screen);
      var showPrice = !!q && !q.end; price.hidden = !showPrice;
      price.querySelector('.ins-p-kt').textContent = known===CARDS ? 'Your monthly price' : view.tenure==='I own it' ? 'Home cover from' : view.tenure==='I rent' ? 'Renters cover from' : 'Cover from';
      price.querySelector('.ins-p-v').innerHTML = money(est) + '<small> / month</small>';
      if (lastEst!==null && lastEst!==est) { price.classList.remove('ins-bump'); void price.offsetWidth; price.classList.add('ins-bump'); } lastEst=est;
      cta.textContent = q ? q.cta : 'Let’s do it';
      var total = urlName ? 6 : 7, idx = !q ? 0 : (s.cur<5 ? s.cur : (s.cur===5 ? 5 : (urlName ? 5 : 6)));
      if (!q || s.cur===0) { step.hidden=false; step.textContent='Takes about 90 seconds'; }
      else if (q.end) { step.hidden=true; }
      else { var secs=Math.max(10, Math.round((total-idx)*13/5)*5); step.hidden=false; step.textContent='About '+secs+' seconds left'; }
    }
    render(true); setInterval(render, 300);
    new MutationObserver(function(){ try { render(); } catch(e){ window.__lbFootErr=String(e); } }).observe(document.body, {childList:true, subtree:true, characterData:true});
    window.__insState = function(){ var s=readState(), nb=document.querySelector(BACK_SEL), nr=nb&&nb.getBoundingClientRect(), nw=nb&&nb.parentElement;
      return {screen:s.cur>=0?Q[s.cur].k:null, ans:s.ans, picked:picked, cta:cta.textContent, step:step.hidden?null:step.textContent, backs:window.__insBacks||0,
      back: nb ? {shown: nr.width>0 && nr.height>0, opacity: getComputedStyle(nw).opacity, pos: getComputedStyle(nb).position, x:Math.round(nr.x), y:Math.round(nr.y), w:Math.round(nr.width), h:Math.round(nr.height),
        hit: nr.width>0 ? (function(){ var t=document.elementFromPoint(nr.x+nr.width/2, nr.y+nr.height/2); return !!t && (t===nb || nb.contains(t)); })() : false} : null,
      price:price.hidden?null:price.querySelector('.ins-p-kt').textContent+' '+price.querySelector('.ins-p-v').textContent}; };
  } catch(err) {
    window.__lbFootErr = String(err);
    document.body.classList.remove('ins-js'); document.querySelectorAll('[data-ins-src],[data-ins-old]').forEach(function(p){ p.removeAttribute('data-ins-src'); p.removeAttribute('data-ins-old'); });
    document.querySelectorAll('#ins-price,#ins-cta-wrap,.ins-clone').forEach(function(n){ n.remove(); });
  }
})();
