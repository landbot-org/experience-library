/* lb-js: oskelund-returns 1 */
/* [mockup 18] Returns: swap before refund · Oskelund (invented) · bot ef2092e2 / channel 3517951.
   DOM-only skin: header row (brand + "RETURN · N OF 3"), item card, still copy of the answered reason list, offer card,
   order card, record + demo label (drawn QR placeholder), arrival order, keys. Reads the DOM; the only thing it ever sends
   is a click on the flow's own buttons. Fails open: on error the plain chat shows. */
(function(){
  try {
    if (window.__rtRan) return; window.__rtRan = true; document.body.classList.add('rt-js');
    var REASONS = ['Too small', 'Too big', 'Not like the photos', 'Arrived damaged'];
    var ICON = {
      knit: '<path d="M9 3h6l5 3 1 12h-3l-1-8v11H7V10l-1 8H3l1-12z"/><path d="M9 3c0 1.7 1.3 2.8 3 2.8S15 4.7 15 3M7 19h10"/>',
      shirt: '<path d="M8 3l4 2 4-2 5 4-3 3-2-1v12H8V9L6 10 3 7z"/>',
      trousers: '<path d="M7 3h10l1 18h-4l-2-11-2 11H6z"/><path d="M7 6h10"/>',
      swap: '<path d="M4 7h13l-3-3M20 17H7l3 3"/>',
      none: '<circle cx="12" cy="12" r="9"/><path d="M8 12h8"/>',
      box: '<path d="M21 8l-9-5-9 5 9 5 9-5z"/><path d="M3 8v8l9 5 9-5V8M12 13v8"/>',
      check: '<circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.5 2.5L16 9.5"/>'
    };
    var ITEM_ICON = {'Merino crew knit':'knit', 'Linen overshirt':'shirt', 'Wide-leg trousers':'trousers'};
    function svg(k, sz, sw){ return '<svg width="'+sz+'" height="'+sz+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="'+(sw||1.5)+'" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(ICON[k]||'')+'</svg>'; }
    function txt(el){ return (el && el.textContent || '').trim(); }
    function norm(t){ return String(t).replace(/’/g, "'"); }
    function esc(s){ return String(s).replace(/[&<>"]/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }
    var RE_ITEM = /^Return (\d) of (\d): (.+), (.+), size (\S+), (.+)$/;
    function kindOf(t){ t = norm(t);
      if (t.indexOf("Hi there. Let's sort out your return")===0) return 'welcome';
      if (RE_ITEM.test(t)) return 'item';
      if (t==='Why is it going back?') return 'question';
      if (/ is in stock$| is sold out$|^Sorry your .+ arrived damaged$/.test(t)) return 'kicker';
      if (t==='Where should we send the return label?') return 'email';
      if (t==='Your return is booked') return 'summary';
      if (t.indexOf("Sorry, I couldn't add")===0) return 'fail';
      if (t.indexOf('Demo order ')===0) return 'order';
      if (t.indexOf('What the Oskelund returns team receives')===0) return 'record';
      if (t.indexOf('Demo label ')===0) return 'label';
      if (t.indexOf('Demo: ')===0 || t.indexOf('Tell us why')===0) return 'fine';
      return '';
    }
    var ANCHOR = {welcome:1, item:1, email:1, summary:1, fail:1};
    function msgText(m){ var p=m.querySelector('[data-lb-part="message-text"]'); return p ? (p.getAttribute('data-rt-src') || txt(p)) : ''; }
    /* ARRIVAL ORDER: v4 sorts the thread by timestamp and a fast answer can land above its question; decide on first-seen order. */
    var seen = {}, arrival = 0;
    function items(){
      var list = document.querySelector('[aria-label="Conversation messages"]'); if (!list) return [];
      var counts = {}, out = [];
      [].forEach.call(list.children, function(w){
        var m = w.querySelector('[data-lb-part="message"]'); if (!m) return;
        var a = m.getAttribute('data-lb-author'), t = msgText(m); if (!t) return;
        var base = a + '|' + t; counts[base] = (counts[base]||0) + 1; var key = base + '#' + counts[base];
        if (!(key in seen)) seen[key] = arrival++;
        out.push({w:w, m:m, a:a, t:t, n:seen[key], k: a==='bot' ? kindOf(t) : ''});
      });
      out.sort(function(x, y){ return x.n - y.n; });
      return out;
    }
    var pending = null;   /* {label, anchor}: a reason tapped, its answer not in the thread yet */
    /* which item an offer belongs to: every offer kicker is unique per item (flow copy), so a Back that re-asks an EARLIER
       item's offer still finds that item's card, question and answer */
    var KICK_ITEM = {'Size M is in stock':1, 'Size XS is sold out':1, 'Oat is in stock':1, 'Sorry your knit arrived damaged':1,
      'Size L is in stock':2, 'Size S is in stock':2, 'Stone is in stock':2, 'Sorry your overshirt arrived damaged':2,
      'Size 34 is sold out':3, 'Size 30 is in stock':3, 'Ecru is in stock':3, 'Sorry your trousers arrived damaged':3};
    function itemNo(x){ var mm = RE_ITEM.exec(norm(x.t)); return mm ? +mm[1] : 0; }
    function readState(){
      var it = items(), last = null, st = {screen:'', item:null, answer:null, kicker:null, body:null, q:null, anchorN:-1, it:it};
      it.forEach(function(x){ if (x.a==='bot' && (ANCHOR[x.k] || x.k==='kicker')) last = x; });
      if (!last) return st;
      var anchor = last;
      if (last.k==='kicker') {
        st.kicker = last; var k = KICK_ITEM[norm(last.t)], a = null, any = null;
        it.forEach(function(x){ if (x.n < last.n && x.a==='bot' && x.k==='item') { any = x; if (itemNo(x)===k) a = x; } });
        anchor = a || any || last;
      }
      st.anchorN = anchor.n; st.screen = anchor.k==='kicker' ? 'offer' : anchor.k;
      var vis = {};
      if (anchor.k==='item') {
        var mm = RE_ITEM.exec(norm(anchor.t)); st.item = {n:+mm[1], of:+mm[2], name:mm[3], colour:mm[4], size:mm[5], price:mm[6]}; st.screen = 'reason';
        vis[anchor.n] = 1;
        /* the question after this card; its answer = the last reason given before the first offer that followed it */
        var firstKick = null;
        it.forEach(function(x){ if (x.n <= anchor.n) return;
          if (!st.q && x.a==='bot' && x.k==='question') { st.q = x; vis[x.n] = 1; return; }
          if (st.q && !firstKick && x.a==='bot' && x.k==='kicker') { firstKick = x; return; }
          if (st.q && !firstKick && x.a==='user' && REASONS.indexOf(x.t)>=0) st.answer = x.t; });
        if (st.kicker) { st.screen = 'offer'; if (!st.answer && firstKick) st.answer = null; }
        else if (!st.answer && pending && pending.anchor===anchor.n) st.answer = pending.label;
        if (!st.kicker && st.answer) st.screen = 'pending';
      } else {
        it.forEach(function(x){ if (x.n >= anchor.n && x.a==='bot') vis[x.n] = 1; });
      }
      if (st.kicker) { it.forEach(function(x){ if (!st.body && x.a==='bot' && x.n > st.kicker.n && !x.k) st.body = x; }); }
      /* only this screen's messages show; visitor answers never show; the offer text is drawn in the footer card */
      it.forEach(function(x){ var old = !vis[x.n] || x.a==='user' || x===st.kicker || x===st.body;
        if (old !== x.w.hasAttribute('data-rt-old')) { if (old) x.w.setAttribute('data-rt-old',''); else x.w.removeAttribute('data-rt-old'); } });
      return st;
    }
    function opts(){ return [].slice.call(document.querySelectorAll('[data-lb-part="option-button"]')); }
    function inputEl(){ return document.querySelector('[data-lb-part="input-field"] > input, [data-lb-part="input-field"] > textarea'); }
    function money(v){ var n = parseFloat(String(v).replace(',', '.')); if (isNaN(n)) return v; return n.toFixed(2).replace('.', ',') + ' €'; }

    /* injected UI */
    var top = document.createElement('div'); top.id = 'rt-top';
    top.innerHTML = '<span class="rt-brand">Oskelund</span><span class="rt-right"><button type="button" id="rt-back" hidden aria-label="Back to the previous question">\u2039 Back</button><span class="rt-step"></span></span>';
    var backBtn = top.querySelector('#rt-back'), backAt = 0;
    function nativeBack(){ return document.querySelector('[aria-label="Conversation messages"] button[data-slot="button"][data-size="sm"][data-variant="ghost"]'); }
    /* the header "Back" is the widget's own native Back (channel design.back_button_visible): a click on it, nothing else */
    backBtn.addEventListener('click', function(){ var nb = nativeBack(); if (!nb || Date.now() - backAt < 1200) return; backAt = Date.now();
      pending = null; queued = null; clearTimeout(queuedT); document.body.classList.remove('rt-switch'); leaving(true); nb.click(); });
    var offer = document.createElement('div'); offer.id = 'rt-offer'; offer.hidden = true;
    offer.innerHTML = '<div class="rt-o-k"><span class="rt-o-i"></span><span class="rt-o-kt"></span></div><div class="rt-o-b"></div>';
    var hint = document.createElement('div'); hint.id = 'rt-hint'; hint.hidden = true; hint.textContent = 'Demo: nothing is refunded';
    function park(){
      var hc = document.querySelector('[data-lb-part="header"] > .responsive-container, [data-lb-part="header"] > div');
      if (hc && top.parentNode !== hc) hc.appendChild(top);
      var foot = document.querySelector('[data-lb-part="window"] > .responsive-container:last-child'); if (!foot) return;
      /* order: offer, Landbot's input/options, hint, branding. Each node has one fixed place, so two of ours never trade places */
      var brand = [].filter.call(foot.children, function(k){ return k.querySelector && k.querySelector('[data-lb-part="branding"]'); })[0] || null;
      if (brand && (hint.parentNode!==foot || hint.nextElementSibling!==brand)) foot.insertBefore(hint, brand);
      var first = [].filter.call(foot.children, function(k){ return k!==offer && k!==hint && k!==brand; })[0] || hint;
      if (first.parentNode===foot && (offer.parentNode!==foot || offer.nextElementSibling!==first)) foot.insertBefore(offer, first);
    }
    /* clones: never edit React's text node; hide it (data-rt-src) and put a styled twin after it */
    function hash(h){ var x = 0; for (var i=0;i<h.length;i++) x = (x*31 + h.charCodeAt(i)) | 0; return h.length + ':' + x; }
    function clone(p, html, cls){
      var t = p.getAttribute('data-rt-src') || txt(p), n = p.nextElementSibling, sig = t + '|' + hash(html);
      if (p.getAttribute('data-rt-src')===t && n && n.classList.contains('rt-clone') && n.getAttribute('data-for')===sig) return;
      if (n && n.classList.contains('rt-clone')) n.remove();
      var d = document.createElement('div'); d.className = 'rt-clone ' + (cls||''); d.setAttribute('data-for', sig); d.innerHTML = html;
      p.insertAdjacentElement('afterend', d); p.setAttribute('data-rt-src', t);
    }
    function qr(seed){ /* a drawn placeholder, not a real code */
      var N = 21, s = 0, h = '', i, x, y; for (i=0;i<seed.length;i++) s = (s*31 + seed.charCodeAt(i)) >>> 0;
      function rnd(){ s = (s*1103515245 + 12345) >>> 0; return (s >>> 16) & 1; }
      function finder(x0, y0){ return '<rect x="'+x0+'" y="'+y0+'" width="7" height="7" fill="#111"/><rect x="'+(x0+1)+'" y="'+(y0+1)+'" width="5" height="5" fill="#fff"/><rect x="'+(x0+2)+'" y="'+(y0+2)+'" width="3" height="3" fill="#111"/>'; }
      for (y=0;y<N;y++) for (x=0;x<N;x++) { var f = (x<8&&y<8)||(x>12&&y<8)||(x<8&&y>12); if (!f && rnd()) h += '<rect x="'+x+'" y="'+y+'" width="1" height="1" fill="#111"/>'; }
      return '<svg viewBox="-1 -1 23 23" width="96" height="96" shape-rendering="crispEdges" aria-label="Demo label placeholder, not a real code"><rect x="-1" y="-1" width="23" height="23" fill="#fff"/>' + h + finder(0,0) + finder(14,0) + finder(0,14) + '</svg>';
    }
    function itemCard(name, meta, price, small){
      var ic = ITEM_ICON[name] || 'shirt';
      return '<div class="rt-item'+(small?' rt-item-s':'')+'"><span class="rt-tile">'+svg(ic, small?24:40)+'</span><span class="rt-it"><span class="rt-in">'+esc(name)+'</span><span class="rt-im">'+esc(meta)+'</span><span class="rt-ip">'+esc(price)+'</span></span></div>';
    }
    var picked = null;
    function stillHtml(sel){
      return '<div class="rt-still" role="radiogroup" aria-label="Why is it going back?">' + REASONS.map(function(r){
        return '<button type="button" class="rt-row" role="radio" aria-checked="'+(r===sel)+'" data-r="'+esc(r)+'"'+(r===sel?' data-on="1"':'')+'><span>'+esc(r)+'</span><i></i></button>'; }).join('') + '</div>';
    }
    function decorate(st){
      document.querySelectorAll('.rt-clone').forEach(function(c){ var p=c.previousElementSibling; if (!p || !p.hasAttribute('data-rt-src')) c.remove(); });
      st.it.forEach(function(x){
        if (x.a!=='bot') return; var m = x.m, p = m.querySelector('[data-lb-part="message-text"]'); if (!p) return;
        var kind = x.k || 'text'; if (m.getAttribute('data-rt-kind')!==kind) m.setAttribute('data-rt-kind', kind);
        var t = norm(x.t);
        if (kind==='item') { var mm = RE_ITEM.exec(t); clone(p, itemCard(mm[3], mm[4] + ' · Size ' + mm[5], mm[6])); }
        else if (kind==='welcome') clone(p, '<div class="rt-hello">Hi there.</div><div class="rt-title">Let’s sort out your return.</div>');
        else if (kind==='order') { var L = x.t.split('\n'), h = '<div class="rt-order"><div class="rt-kick">'+esc(L[0])+'</div>';
          for (var i=1;i<L.length;i++){ var f = L[i].split(' · '); if (f.length===4) h += itemCard(f[0], f[1] + ' · Size ' + f[2], f[3], true); }
          clone(p, h + '</div>'); }
        else if (kind==='question') {
          var sel = (st.q===x) ? (queued || st.answer) : null;
          if (st.q===x && sel) clone(p, '<div class="rt-title">'+esc(x.t)+'</div>' + stillHtml(sel), 'rt-q');
          else clone(p, '<div class="rt-title">'+esc(x.t)+'</div>', 'rt-q');
        }
        else if (kind==='email' || kind==='fail') clone(p, '<div class="rt-title">'+esc(x.t)+'</div>');
        else if (kind==='summary') clone(p, '<div class="rt-done">'+svg('check', 28, 1.8)+'</div><div class="rt-title">'+esc(x.t)+'</div>');
        else if (kind==='record') { var R = x.t.split('\n'), hh = '<div class="rt-record"><div class="rt-kick">'+esc(R[0])+'</div>';
          for (var j=1;j<R.length;j++){ var c = R[j].indexOf(': '); if (c<0) continue; var k = R[j].slice(0,c), v = R[j].slice(c+2);
            if (k==='Refund due') v = money(v.replace(/\s*€\s*$/, ''));
            var vv = esc(v), dot = v.indexOf(' · ');
            if (ITEM_ICON[k] && dot > 0) vv = '<b>'+esc(v.slice(dot+3))+'</b><small>'+esc(v.slice(0,dot))+'</small>';
            hh += '<div class="rt-r-row'+(k==='Refund due'?' rt-r-total':'')+'"><span class="rt-r-k">'+esc(k)+'</span><span class="rt-r-v">'+vv+'</span></div>'; }
          clone(p, hh + '</div>'); }
        else if (kind==='label') { var parts = x.t.split(' · '), code = parts[0].replace('Demo label ', '');
          var rest = parts.slice(1).join(' · '); rest = rest.charAt(0).toUpperCase() + rest.slice(1);
          clone(p, '<div class="rt-label"><div class="rt-qr">'+qr(code)+'</div><div class="rt-l-t"><div class="rt-kick">Demo label · '+esc(code)+'</div><div class="rt-l-b">'+esc(rest)+'</div><div class="rt-l-f">Placeholder, not a real code</div></div></div>'); }
      });
    }
    var pass = false; function realClick(b){ pass = true; try { b.click(); } finally { pass = false; } }
    var queued = null, queuedT = null;
    var leaveT = null;
    var leaveFrom = null;
    function leaving(on){ clearTimeout(leaveT); if (!on) { document.body.classList.remove('rt-leaving'); leaveFrom = null; return; }
      leaveFrom = readState().anchorN; document.body.classList.add('rt-leaving'); leaveT = setTimeout(function(){ leaving(false); }, 3500); }
    /* a tap on a reason: remember it at once so the still list shows the pick before the answer reaches the thread */
    document.addEventListener('click', function(e){
      var row = e.target && e.target.closest && e.target.closest('.rt-row');
      if (row) { var st = readState(), r = row.getAttribute('data-r'); if (st.screen!=='offer' || r===st.answer || queued) return;
        var ch = opts().filter(function(b){ return b.getAttribute('data-rt-role')==='change'; })[0]; if (!ch) return;
        queued = r; document.body.classList.add('rt-switch'); clearTimeout(queuedT);
        queuedT = setTimeout(function(){ queued = null; document.body.classList.remove('rt-switch'); render(true); }, 8000);
        render(true); realClick(ch); return; }
      if (pass) return; var b = e.target && e.target.closest && e.target.closest('[data-lb-part="option-button"]'); if (!b) return;
      var s = readState(), l = txt(b);
      if (s.screen==='reason' && REASONS.indexOf(l)>=0) { pending = {label:l, anchor:s.anchorN}; picked = l; b.setAttribute('data-lb-picked','1'); setTimeout(function(){ render(true); }, 0); }
      else if (s.screen==='offer' || s.screen==='welcome' || s.screen==='summary' || s.screen==='fail') { b.setAttribute('data-lb-picked','1'); if (b.getAttribute('data-rt-role')!=='change') leaving(true); }
    }, true);
    /* a key press right after the options mount was once dropped by the widget (walk K, 2026-09-25): if the option is still
       on screen 900 ms later and nothing new arrived, press it once more (a sent option unmounts at once, so no double answer) */
    function press(b){ var n0 = arrival; b.click(); setTimeout(function(){ items(); if (b.isConnected && opts().indexOf(b)>=0 && arrival===n0) b.click(); }, 900); }
    document.addEventListener('keydown', function(e){
      var t = e.target, typing = t && (t.tagName==='INPUT' || t.tagName==='TEXTAREA' || t.isContentEditable); if (typing || e.metaKey || e.ctrlKey || e.altKey) return;
      var s = readState(), o = opts().filter(function(b){ return b.getAttribute('data-rt-role')!=='change'; });
      if (t && t.closest && (t.closest('[data-lb-part="option-button"]') || t.closest('.rt-row') || t.id==='rt-back') && (e.key==='Enter' || e.key===' ')) return;
      var n = parseInt(e.key, 10);
      if (s.screen==='reason' && n>=1 && n<=o.length) { e.preventDefault(); press(o[n-1]); return; }
      if (s.screen==='offer' && n>=1 && n<=o.length) { e.preventDefault(); press(o[n-1]); return; }
      if (e.key==='Enter' && o.length===1) { e.preventDefault(); press(o[0]); }
    }, true);
    document.addEventListener('keydown', function(e){ var t = e.target; if (e.key!=='Enter' || !t || t.tagName!=='INPUT') return;
      var v = (t.value||'').trim(); if (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) leaving(true); }, true);
    document.addEventListener('click', function(e){ var b = e.target && e.target.closest && e.target.closest('[data-lb-part="input-submit"]'); if (!b) return;
      var i = inputEl(), v = (i && i.value || '').trim(); if (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) leaving(true); }, true);

    var last = '', lastScreen = '', lastAnchor = -1, focusedFor = -1, topT = 0;
    function render(force){
      park(); var st = readState(); decorate(st);
      var o = opts(), inp = inputEl();
      if (leaveFrom !== null && st.anchorN !== leaveFrom && (o.length || inp)) leaving(false);
      if (st.screen==='reason' && queued) {
        var qb = o.filter(function(b){ return txt(b)===queued; })[0];
        if (qb) { var qq = queued; queued = null; clearTimeout(queuedT); setTimeout(function(){ document.body.classList.remove('rt-switch'); if (qb.isConnected) qb.click(); }, 60); }
      }
      if (st.screen==='offer' && !queued) document.body.classList.remove('rt-switch');
      o.forEach(function(b){ var l = txt(b), role = l==='Change reason' ? 'change' : (st.screen==='offer' ? (b===o[0] ? 'primary' : 'secondary') : (o.length===1 ? 'primary' : ''));
        if ((b.getAttribute('data-rt-role')||'')!==role) { if (role) b.setAttribute('data-rt-role', role); else b.removeAttribute('data-rt-role'); }
        if (st.screen==='reason' && !(pending && pending.anchor===st.anchorN && pending.label===l) && b.hasAttribute('data-lb-picked')) b.removeAttribute('data-lb-picked'); });
      if (inp && st.screen==='email') { if (inp.getAttribute('placeholder')!=='name@example.com') { inp.setAttribute('placeholder','name@example.com'); inp.setAttribute('inputmode','email'); inp.setAttribute('autocomplete','email'); }
        if (focusedFor!==st.anchorN && !document.body.classList.contains('rt-leaving')) { focusedFor = st.anchorN; try { inp.focus({preventScroll:true}); } catch(e){} } }
      /* offer card */
      if (queued || st.screen==='pending') {
        /* reason tapped, the offer is on its way: a quiet placeholder where the offer card will be */
        if (offer.getAttribute('data-sig')!=='loading') { offer.setAttribute('data-sig', 'loading'); offer.setAttribute('data-kind', 'loading');
          offer.querySelector('.rt-o-i').innerHTML = svg('swap', 16, 2); offer.querySelector('.rt-o-kt').textContent = 'Checking stock';
          offer.querySelector('.rt-o-b').innerHTML = '<span class="rt-bar"></span><span class="rt-bar rt-bar-s"></span>'; }
        offer.hidden = false;
      } else if (st.screen==='offer' && st.kicker) { var k = norm(st.kicker.t), ic = / in stock$/.test(k) ? 'swap' : / sold out$/.test(k) ? 'none' : 'box';
        var sig = k + '|' + (st.body ? st.body.t : '');
        if (offer.getAttribute('data-sig')!==sig) { offer.setAttribute('data-sig', sig); offer.querySelector('.rt-o-i').innerHTML = svg(ic, 16, 2);
          offer.querySelector('.rt-o-kt').textContent = st.kicker.t; offer.querySelector('.rt-o-b').textContent = st.body ? st.body.t : ''; offer.setAttribute('data-kind', ic); }
        offer.hidden = !st.body;
      } else offer.hidden = true;
      hint.hidden = !(st.screen==='reason' || st.screen==='offer' || st.screen==='pending' || st.screen==='email');
      var step = st.item ? 'Return · ' + st.item.n + ' of ' + st.item.of : st.screen==='welcome' ? 'Return · 3 items' : st.screen==='email' ? 'Return · label' : st.screen==='summary' ? 'Return · booked' : '';
      var sig2 = [st.screen, st.anchorN, step, o.length, !!inp, st.answer, queued, !!nativeBack()].join('|'); if (!force && sig2===last) return; last = sig2;
      top.querySelector('.rt-step').textContent = step;
      var showBack = !!nativeBack() && st.screen!=='welcome' && st.screen!=='';
      if (backBtn.hidden === showBack) backBtn.hidden = !showBack;
      if (document.body.getAttribute('data-rt-screen')!==st.screen) document.body.setAttribute('data-rt-screen', st.screen);
      if (st.anchorN !== lastAnchor) { lastAnchor = st.anchorN; topT = Date.now(); }
      if (st.screen!==lastScreen) { lastScreen = st.screen; }
    }
    /* a new screen opens at its top (the list auto-scrolls to the bottom on a long turn) */
    setInterval(function(){ if (Date.now() - topT < 1600) { var sc = document.querySelector('[aria-label="Scrollable conversation area"]'); if (sc && sc.scrollTop) sc.scrollTop = 0; } }, 120);
    render(true); setInterval(function(){ try { render(); } catch(e){ window.__lbFootErr = String(e); } }, 300);
    /* loop guard: a render that keeps mutating would starve the page; after 150 observer renders in 1 s the observer stops (the 300 ms tick goes on) */
    var busy = false, winT = 0, winN = 0, mo;
    mo = new MutationObserver(function(muts){ if (busy) return; var now = Date.now(); if (now - winT > 1000) { winT = now; winN = 0; }
      if (++winN > 150) { mo.disconnect(); window.__rtLoop = (window.__rtLoop||0) + 1; window.__rtLoopWhat = muts.slice(0,6).map(function(m){ var t = m.target; return m.type + ':' + (t.id || t.className || t.nodeName).toString().slice(0,40) + ' +' + m.addedNodes.length + ' -' + m.removedNodes.length + (m.addedNodes[0] ? ' ' + String(m.addedNodes[0].className || m.addedNodes[0].nodeName).slice(0,30) : ''); });
        setTimeout(function(){ mo.observe(document.body, {childList:true, subtree:true, characterData:true}); }, 1500); return; }
      busy = true; try { render(); } catch(e){ window.__lbFootErr = String(e); } finally { busy = false; } });
    mo.observe(document.body, {childList:true, subtree:true, characterData:true});
    window.__mkState = function(){ var s = readState(); return {screen:s.screen, item:s.item && s.item.n, answer:s.answer, kicker:s.kicker && s.kicker.t, queued:queued,
      step:top.querySelector('.rt-step').textContent, offer:offer.hidden ? null : offer.textContent, options:opts().map(function(b){ return txt(b) + (b.getAttribute('data-rt-role') ? '['+b.getAttribute('data-rt-role')+']' : ''); })}; };
  } catch(err) {
    window.__lbFootErr = String(err);
    document.body.classList.remove('rt-js');
    document.querySelectorAll('[data-rt-src],[data-rt-old]').forEach(function(p){ p.removeAttribute('data-rt-src'); p.removeAttribute('data-rt-old'); });
    document.querySelectorAll('#rt-top,#rt-offer,#rt-hint,.rt-clone').forEach(function(n){ n.remove(); });
  }
})();
