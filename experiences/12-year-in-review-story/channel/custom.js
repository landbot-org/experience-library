/* [mockup 12] Year-in-review story · Brioletta Bakehouse (invented) · channel 3516208. Progress bar + kicker + numbers tag (header), each flow
   card cloned into story type (big number fitted to the width, sticker, note), "Tap anywhere to continue" (a tap outside a button, Space, Enter
   or → presses the card's own button), the next card's colour and bar segment shown at once while the bot answers, record on the end card,
   loop guard. Only reads the DOM and presses the flow's own buttons. */
(function(){
  try {
    if (window.__lbFootRan) return; window.__lbFootRan = true; document.body.classList.add('wr-js');
    var CARDS = [
      {k:'1', t:'Your bot had a big year.'},
      {k:'2', t:'Your busiest month was'},
      {k:'3', t:'This year your bot handled'},
      {k:'4', t:'The question people asked most'},
      {k:'5', t:'One last thing', prefix:1},
      {k:'done', t:"That's your 2026", prefix:1}];
    var NEXT = {'1':'2','2':'3','3':'4','4':'5','5':'done','done':'1'};
    function txt(el){ return (el && el.textContent || '').trim(); }
    function textOf(p){ var ps=p.querySelectorAll('p'); var t = ps.length ? [].map.call(ps, function(x){ return x.textContent; }).join('\n') : p.textContent; return String(t||'').replace(/\n\s*\n+/g,'\n').trim(); }
    function first(t){ return String(t).split('\n')[0].trim(); }
    function esc(s){ return String(s).replace(/[&<>"]/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }
    function num(s){ return String(s).replace(/\b\d{4,}\b/g, function(n){ return (n.length===4 && /^(19|20)\d\d$/.test(n)) ? n : Number(n).toLocaleString('en-US'); }); }
    function isTag(l){ return l.indexOf('Demo numbers')===0 || l.indexOf('From your personalised link')===0; }
    function msgText(m){ var p=m.querySelector('[data-lb-part="message-text"]'); return p ? (p.getAttribute('data-wr-src') || textOf(p)) : ''; }
    function ci(t){ var h=first(t); for (var i=0;i<CARDS.length;i++) if (CARDS[i].prefix ? h.indexOf(CARDS[i].t)===0 : h===CARDS[i].t) return i; return -1; }
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
      var it=items(), lastUser=-1, cur=-1, tag='';
      it.forEach(function(x){ if (x.a==='user') lastUser=x.n; else { var i=ci(x.t); if (i>=0) cur=i; var L=x.t.split('\n'); var tl=L[L.length-1].trim(); if (isTag(tl)) tag=tl; } });
      var cut=lastUser, botAfter=it.some(function(x){ return x.a==='bot' && x.n>lastUser; });
      if (!botAfter && pending) { var us=it.filter(function(x){ return x.a==='user'; }); cut = us.length>1 ? us[us.length-2].n : -1; }
      var vis=[]; it.forEach(function(x){ var old=x.a==='user' ? true : x.n<=cut; if (old!==x.w.hasAttribute('data-wr-old')) { if (old) x.w.setAttribute('data-wr-old',''); else x.w.removeAttribute('data-wr-old'); } if (!old && x.a==='bot') vis.push(x); });
      return {cur:cur, card:cur>=0?CARDS[cur].k:'', visible:vis, tag:tag};
    }
    function clone(p, html){
      var t=p.getAttribute('data-wr-src') || textOf(p), n=p.nextElementSibling, key=t+'|'+html.length;
      if (p.getAttribute('data-wr-src')===t && n && n.classList.contains('wr-clone') && n.getAttribute('data-for')===key) return false;
      if (n && n.classList.contains('wr-clone')) n.remove();
      var d=document.createElement('div'); d.className='wr-clone'; d.setAttribute('data-for', key); d.innerHTML=html; p.insertAdjacentElement('afterend', d); p.setAttribute('data-wr-src', t); return true;
    }
    function card(kind, parts){ return '<div class="wr-card" data-kind="'+kind+'">'+parts.join('')+'</div>'; }
    function div(c, s){ return s ? '<div class="'+c+'">'+esc(s)+'</div>' : ''; }
    function build(k, L){
      L=L.filter(function(l){ return !isTag(l); });
      if (k==='1') return card('1', [div('wr-title', L[0]), div('wr-sub', L.slice(1).join(' '))]);
      if (k==='2') return card('2', [div('wr-lead', L[0]), div('wr-big', L[1]), div('wr-sticker', num(L[2]||''))]);
      if (k==='3') return card('3', [div('wr-lead', L[0]), div('wr-big', num(L[1]||'')), div('wr-unit', L[2]), div('wr-sticker', num(L[3]||'')), div('wr-note', L.slice(4).join(' '))]);
      if (k==='4') return card('4', [div('wr-lead', L[0]), div('wr-quote', L[1]), div('wr-sticker', L[2]), div('wr-sub', L.slice(3).join(' '))]);
      if (k==='5') return card('5', [div('wr-lead', L[0]), div('wr-title', L.slice(1).join(' '))]);
      if (k==='done') return card('done', [div('wr-title', L.join(' '))]);
      return '';
    }
    function decorate(st){
      var added=false;
      document.querySelectorAll('.wr-clone').forEach(function(c){ var p=c.previousElementSibling; if (!p || !p.hasAttribute('data-wr-src')) c.remove(); });
      st.visible.forEach(function(x){
        var p=x.m.querySelector('[data-lb-part="message-text"]'); if (!p) return;
        var L=x.t.split('\n').map(function(s){ return s.trim(); }).filter(Boolean), h=L[0], i=ci(x.t), html='';
        if (i>=0) html=build(CARDS[i].k, L);
        else if (h==='What your account team would receive') { html='<div class="wr-rec"><div class="t">'+esc(h)+'</div>';
          L.slice(1).forEach(function(l){ var c=l.indexOf(': '); if (c>0) html+='<div class="r"><span>'+esc(l.slice(0,c))+'</span><span>'+esc(num(l.slice(c+2)))+'</span></div>'; });
          html+='</div>'; }
        else if (h.indexOf('Demo only')===0) html='<div class="wr-fine">'+esc(x.t)+'</div>';
        if (html && clone(p, html)) added=true;
      });
      if (added) fitAll();
    }
    function fitAll(){ [].forEach.call(document.querySelectorAll('.wr-big'), function(el){ el.style.fontSize=''; var fs=parseFloat(getComputedStyle(el).fontSize), w=el.clientWidth;
      if (!w) return; var n=0; while (el.scrollWidth>w+1 && fs>36 && n++<40) { fs-=4; el.style.fontSize=fs+'px'; } }); }
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitAll);
    var fitT=null; window.addEventListener('resize', function(){ clearTimeout(fitT); fitT=setTimeout(fitAll, 120); });
    /* injected UI */
    var top=document.createElement('div'); top.id='wr-top';
    top.innerHTML='<div class="wr-bar" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div><div class="wr-k">Your 2026 in conversations</div><div class="wr-tag"></div>';
    top.querySelector('.wr-k').insertAdjacentHTML('afterend', '');
    var krow=document.createElement('div'); krow.className='wr-krow'; var kEl=top.querySelector('.wr-k'); kEl.parentNode.insertBefore(krow, kEl); krow.appendChild(kEl);
    krow.insertAdjacentHTML('beforeend', '<button type="button" class="wr-back" aria-label="Previous card" hidden>Back</button>');
    var backBtn=krow.querySelector('.wr-back');
    function nativeBack(){ return document.querySelector('button[data-slot="button"][data-size="sm"][data-variant="ghost"]'); }
    var segs=[].slice.call(top.querySelectorAll('.wr-bar i')), tagEl=top.querySelector('.wr-tag');
    var hint=document.createElement('div'); hint.id='wr-hint'; hint.textContent='Tap anywhere to continue';
    function footer(){ return document.querySelector('[data-lb-part="window"] > .responsive-container:last-child'); }
    function park(){
      var hc=document.querySelector('[data-lb-part="header"] > .responsive-container'); if (hc && top.parentNode!==hc) hc.appendChild(top);
      var foot=footer(); if (!foot) return;
      var brand=[].filter.call(foot.children, function(k){ return k.querySelector('[data-lb-part="branding"]'); })[0]||null;
      if (hint.parentNode!==foot || hint.nextElementSibling!==brand) foot.insertBefore(hint, brand);
    }
    function opts(){ return [].slice.call(document.querySelectorAll('[data-lb-part="option-button"]')); }
    var pass=false; function realClick(b){ pass=true; try { b.click(); } finally { pass=false; } }
    var pending=null, pendT=null, spent=null, ghost=null, topFor=null, topUntil=0;
    function makeGhost(){ var f=footer(), l=spent; if (!f || !l) return; var slot=l; while (slot && slot.parentNode!==f) slot=slot.parentNode; if (!slot) return;
      if (ghost) ghost.remove(); ghost=slot.cloneNode(true); ghost.id='wr-ghost'; ghost.setAttribute('aria-hidden','true'); ghost.hidden=true;
      [].forEach.call(ghost.querySelectorAll('[data-lb-part]'), function(n){ n.setAttribute('data-wr-part', n.getAttribute('data-lb-part')); n.removeAttribute('data-lb-part'); });
      [].forEach.call(ghost.querySelectorAll('button'), function(n){ n.tabIndex=-1; }); f.insertBefore(ghost, hint); }
    function listOf(b){ return b && b.closest('[data-lb-part="options-list"]'); }
    function advance(from){ pending=NEXT[from]||null; document.body.classList.add('wr-leaving'); clearTimeout(pendT);
      pendT=setTimeout(function(){ pending=null; document.body.classList.remove('wr-leaving'); render(true); }, 4000); render(true); }
    function press(b){ var st=readState(); if (!b || listOf(b)===spent) return; spent=listOf(b);
      b.setAttribute('data-wr-pressed',''); makeGhost(); advance(st.card); setTimeout(function(){ realClick(b); }, 0); }
    function goBack(){ var nb=nativeBack(), st=readState(); if (!nb || pending || ['2','3','4','5','done'].indexOf(st.card)<0) return; pending='back'; backFrom=st.card;
      document.body.classList.add('wr-leaving'); clearTimeout(pendT); pendT=setTimeout(function(){ pending=null; document.body.classList.remove('wr-leaving'); render(true); }, 4000); render(true); setTimeout(function(){ realClick(nb); }, 0); }
    var backFrom=null;
    backBtn.addEventListener('click', function(e){ e.stopPropagation(); goBack(); });
    function primary(){ var o=opts(); return o.length===1 ? o[0] : null; }
    document.addEventListener('click', function(e){
      if (pass) return; var t=e.target; if (!t || !t.closest) return;
      var b=t.closest('[data-lb-part="option-button"]');
      if (b) { var st=readState(); if (listOf(b)===spent) { e.preventDefault(); e.stopPropagation(); return; } spent=listOf(b); b.setAttribute('data-wr-pressed',''); makeGhost(); advance(st.card); return; }
      if (t.closest('a, button, input, textarea, select, [role="button"]')) return;
      var s=readState(); if (['1','2','3','4'].indexOf(s.card)<0) return;
      press(primary());
    }, true);
    document.addEventListener('keydown', function(e){
      if (e.metaKey || e.ctrlKey || e.altKey) return; var t=e.target, st=readState(), k=st.card;
      if (t && t.tagName==='INPUT') return;
      var onBtn=t && t.closest && t.closest('[data-lb-part="option-button"]');
      if (k==='5') { var n=parseInt(e.key,10), o=opts(); if (n>=1 && n<=o.length) { e.preventDefault(); press(o[n-1]); return; } if (e.key==='ArrowLeft' || e.key==='Backspace') { e.preventDefault(); goBack(); } return; }
      if (onBtn && (e.key==='Enter' || e.key===' ')) return;
      if (e.key==='ArrowLeft' || e.key==='Backspace') { e.preventDefault(); goBack(); return; }
      if (e.key==='Enter' || e.key===' ' || e.code==='Space' || e.key==='ArrowRight') { var p=primary(); if (p && k) { e.preventDefault(); press(p); } }
    }, true);
    var last='';
    function render(force){
      park(); var st=readState(); decorate(st);
      var o=opts(), shown=st.card;
      var arrived = pending==='back' ? (st.card!==backFrom && o.length) : (pending && st.card===pending && o.length);
      if (arrived) { pending=null; clearTimeout(pendT); document.body.classList.remove('wr-leaving'); spent=null; }
      var fresh=o.length && listOf(o[0])!==spent;
      if (ghost && (fresh || !pending)) { ghost.remove(); ghost=null; }
      if (ghost) { var gh=!!o.length; if (ghost.hidden!==gh) ghost.hidden=gh; }
      if (st.card && topFor!==st.cur) { topFor=st.cur; topUntil=Date.now()+1600; }
      if (Date.now()<topUntil) { var sa=document.querySelector('[aria-label="Scrollable conversation area"]'); if (sa && sa.scrollTop) sa.scrollTop=0; }
      var barCard = pending && pending!=='back' ? pending : shown;
      var sig=[st.cur, shown, barCard, o.length, st.tag, !!nativeBack(), document.body.classList.contains('wr-leaving')].join('|'); if (!force && sig===last) return; last=sig;
      if (shown) document.body.setAttribute('data-wr-card', shown);
      backBtn.hidden = !(nativeBack() && ['2','3','4','5','done'].indexOf(shown)>=0);
      var idx = barCard==='done' ? 5 : (parseInt(barCard,10)||0);
      segs.forEach(function(s, i){ var on=i<idx; if (on!==s.hasAttribute('data-on')) { if (on) s.setAttribute('data-on',''); else s.removeAttribute('data-on'); } });
      var tg = shown && shown!=='1' ? st.tag : ''; if (tagEl.textContent!==tg) tagEl.textContent=tg;
      hint.hidden = !(['1','2','3','4'].indexOf(shown)>=0 && !pending);
      o.forEach(function(b){ if (b.hasAttribute('data-wr-pressed') && listOf(b)!==spent) b.removeAttribute('data-wr-pressed'); });
    }
    render(true); setInterval(render, 300);
    var winT=0, winN=0;   /* loop guard */
    var mo=new MutationObserver(function(){ try { var now=Date.now(); if (now-winT>1000) { winT=now; winN=0; } if (++winN>300) { mo.disconnect(); window.__wrLoop={n:winN}; return; } render(); } catch(e){ window.__lbFootErr=String(e); } });
    mo.observe(document.body, {childList:true, subtree:true, characterData:true});
    window.__mkState=function(){ var st=readState(); return {card:st.card, shown:document.body.getAttribute('data-wr-card'), pending:pending, tag:st.tag, bar:segs.filter(function(s){ return s.hasAttribute('data-on'); }).length, hint:!hint.hidden, opts:opts().map(txt)}; };
  } catch(err) {
    window.__lbFootErr=String(err); document.body.classList.remove('wr-js');
    document.querySelectorAll('[data-wr-src],[data-wr-old]').forEach(function(p){ p.removeAttribute('data-wr-src'); p.removeAttribute('data-wr-old'); });
    document.querySelectorAll('.wr-clone,#wr-top,#wr-hint').forEach(function(n){ n.remove(); });
  }
})();
