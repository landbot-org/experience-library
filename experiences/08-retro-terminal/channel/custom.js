/* lb-js: rt-retro-terminal 2 */
/* [mockup 8] Retro terminal · Pellowin (invented) · channel 3516229. Terminal log: every bot line becomes a "> " line (typed in), the
   flow's "score:N lives:N" line feeds the header, ERR lines in amber, record box; [A]/[B]/[C] rows: A/B/C or a tap selects, Enter or a second
   tap confirms; "> " input with a block cursor; [ESC] restart, [?] help; log kept in arrival order; loop guard.
   Native Back (2026-09-25): the chat's own Back stays visible as a "[BKSP] back" key line; Backspace or the left arrow (outside a field,
   or Backspace in a field nothing was typed in yet) clicks it; after a Back the log rewinds to the re-asked question, so no stale
   screen and no answer shown twice. Only reads the DOM and presses the flow's own controls. */
(function(){
  try {
    if (window.__lbFootRan) return; window.__lbFootRan = true; document.body.classList.add('rt-js');
    var STATUS = /^score:(\d+) lives:(\d+)$/, KEYS = ['A','B','C','D'];
    var touch = window.matchMedia && window.matchMedia('(pointer:coarse)').matches;
    function txt(el){ return (el && el.textContent || '').trim(); }
    function textOf(p){ var ps=p.querySelectorAll('p'); var t = ps.length ? [].map.call(ps, function(x){ return x.textContent; }).join('\n') : p.textContent; return String(t||'').replace(/\n\s*\n+/g,'\n').trim(); }
    function esc(s){ return String(s).replace(/[&<>"]/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }
    function money(t){ return String(t).replace(/€(\d{4,})/g, function(_, n){ return '€'+Number(n).toLocaleString('en-US'); }); }
    function lines(t){ return String(t).split('\n').map(function(s){ return s.trim(); }).filter(Boolean); }
    function msgText(m){ var p=m.querySelector('[data-lb-part="message-text"]'); return p ? (p.getAttribute('data-rt-src') || textOf(p)) : ''; }
    var seen={}, arrival=0;
    function items(){
      var list=document.querySelector('[aria-label="Conversation messages"]'); if (!list) return [];
      var counts={}, out=[];
      [].forEach.call(list.children, function(w){ var m=w.querySelector('[data-lb-part="message"]'); if (!m) return;
        var a=m.getAttribute('data-lb-author'), t=msgText(m); if (!t) return; var base=a+'|'+t; counts[base]=(counts[base]||0)+1; var key=base+'#'+counts[base];
        if (!(key in seen)) seen[key]=arrival++; out.push({w:w, m:m, a:a, t:t, n:seen[key]}); });
      out.sort(function(x,y){ return x.n-y.n; }); return out;
    }
    function clone(p, html){
      var t=p.getAttribute('data-rt-src') || textOf(p), n=p.nextElementSibling, key=t+'|'+html.length;
      if (p.getAttribute('data-rt-src')===t && n && n.classList.contains('rt-clone') && n.getAttribute('data-for')===key) return;
      if (n && n.classList.contains('rt-clone')) n.remove();
      var d=document.createElement('div'); d.className='rt-clone'; d.setAttribute('data-for', key); d.innerHTML=html; p.insertAdjacentElement('afterend', d); p.setAttribute('data-rt-src', t);
    }
    var score=0, lives=3;
    /* Back: the widget sends a user message "Back" and the flow re-asks an earlier question. Rewind the log to that question's
       earlier copy, so the screen reads as if the later answers never happened. */
    var BACKTXT=/^(back|\u2039 back)$/i, backs=0;
    function qkey(t){ return lines(t).filter(function(l){ return !STATUS.test(l); }).join('\n'); }
    function hiddenOf(it){
      var boot=-1; it.forEach(function(x){ if (x.a==='bot' && x.t.indexOf('boot flow')===0) boot=x.n; });
      var hid=[], stack=[], pending=false, nb=0;
      it.forEach(function(x){
        if (x.a!=='bot' && BACKTXT.test(x.t)) nb++;
        if (x.n<boot) { hid.push(x); return; }
        if (x.a!=='bot' && BACKTXT.test(x.t)) { pending=true; hid.push(x); return; }
        if (pending && x.a==='bot') { pending=false; var k=qkey(x.t);
          for (var i=stack.length-1; i>=0; i--) if (stack[i].a==='bot' && qkey(stack[i].t)===k) { stack.splice(i).forEach(function(y){ hid.push(y); }); break; } }
        stack.push(x);
      });
      return {hid:hid, backs:nb};
    }
    function decorate(it){
      var H=hiddenOf(it);
      if (H.backs!==backs) { backs=H.backs; spent=null; picked=null; opts().forEach(function(b){ b.removeAttribute('data-lb-picked'); }); }
      it.forEach(function(x){ var old=H.hid.indexOf(x)>=0; if (old!==x.w.hasAttribute('data-rt-old')) { if (old) x.w.setAttribute('data-rt-old',''); else x.w.removeAttribute('data-rt-old'); } });
      document.querySelectorAll('.rt-clone').forEach(function(c){ var p=c.previousElementSibling; if (!p || !p.hasAttribute('data-rt-src')) c.remove(); });
      it.forEach(function(x){
        var o=String(x.n); if (x.w.style.order!==o) x.w.style.order=o;
        if (x.a!=='bot') return;
        var p=x.m.querySelector('[data-lb-part="message-text"]'); if (!p) return;
        var L=lines(x.t), h=L[0]||'', html='';
        if (h==='WHAT THE PELLOWIN TEAM WOULD RECEIVE') { html='<div class="rt-rec"><div class="t">'+esc(h.toLowerCase())+'</div>';
          L.slice(1).forEach(function(l){ var c=l.indexOf(': '); if (c>0) html+='<div class="r"><span>'+esc(l.slice(0,c).toLowerCase())+'</span><span>'+esc(money(l.slice(c+2)))+'</span></div>'; });
          html+='</div>'; }
        else { var i=0; L.forEach(function(l){ var m=STATUS.exec(l); if (m) { score=+m[1]; lives=+m[2]; return; }
            if (/^[A-Z0-9 ?.,:'"€·\/()-]+\?$/.test(l) && i>0) html+='<div class="rt-gap"></div>';
            html+='<div class="rt-line'+(l.indexOf('ERR:')===0 || l.indexOf('GAME OVER')===0 ? ' err' : '')+'" style="--d:'+(i*0.12).toFixed(2)+'s">'+esc(money(l))+'</div>'; i++; }); }
        if (html) clone(p, html);
      });
    }
    /* injected UI */
    var top=document.createElement('div'); top.id='rt-top'; top.innerHTML='<span>PELLOWIN OS v3.1.0</span><span class="s">SCORE <b class="sc">0000</b> · <span class="l">LIVES <b class="lv">3</b></span></span>';
    var scEl=top.querySelector('.sc'), lvEl=top.querySelector('.lv'), sEl=top.querySelector('.s');
    [scEl, lvEl].forEach(function(b){ b.style.fontWeight='400'; });
    var hint=document.createElement('div'); hint.id='rt-hint'; hint.hidden=true;
    var keys=document.createElement('div'); keys.id='rt-keys'; keys.innerHTML='<button type="button" data-k="esc">[ESC] restart</button><button type="button" data-k="help">[?] help</button>';
    var help=document.createElement('div'); help.id='rt-help'; help.hidden=true; help.setAttribute('role','dialog'); help.setAttribute('aria-label','Help');
    help.innerHTML='<div class="box"><div class="t">&gt; HELP</div><div><span>A / B / C</span><span>select an option</span></div><div><span>ENTER</span><span>confirm / send</span></div><div><span>tap twice</span><span>select, then confirm</span></div><div><span>BKSP / &larr;</span><span>back one question</span></div><div><span>ESC</span><span>restart from boot</span></div><div><span>?</span><span>this help</span></div><div><span>lives</span><span>a wrong answer costs one</span></div><div class="x">demo: nothing is sent. press any key.</div></div>';
    document.body.appendChild(help);
    var cursor=document.createElement('span'); cursor.id='rt-cursor';
    function footer(){ return document.querySelector('[data-lb-part="window"] > .responsive-container:last-child'); }
    function park(){
      var hc=document.querySelector('[data-lb-part="header"] > .responsive-container'); if (hc && top.parentNode!==hc) hc.appendChild(top);
      var f=footer(); if (!f) return;
      var brand=[].filter.call(f.children, function(k){ return k.querySelector('[data-lb-part="branding"]'); })[0]||null;
      if (hint.parentNode!==f || hint.nextElementSibling!==brand) f.insertBefore(hint, brand);
      if (brand && brand.firstElementChild!==keys) brand.insertBefore(keys, brand.firstElementChild);
      var box=document.querySelector('[data-lb-part="input-field"], [data-lb-part="text-input"] > div[data-slot="input-group"]'); if (box && cursor.parentNode!==box) box.appendChild(cursor);
    }
    function opts(){ return [].slice.call(document.querySelectorAll('[data-lb-part="option-button"]')); }
    function inputEl(){ return document.querySelector('[data-lb-part="text-input"] input, [data-lb-part="input-field"] input'); }
    var pass=false; function realClick(b){ pass=true; try { b.click(); } finally { pass=false; } }
    var picked=null, spent=null;
    function nativeBack(){ var b=document.querySelector('[aria-label="Conversation messages"] button[data-slot="button"][data-size="sm"][data-variant="ghost"]'); return b && b.getClientRects().length ? b : null; }
    var backT=0; function goBack(){ var b=nativeBack(); if (!b || document.body.hasAttribute('data-rt-end') || Date.now()-backT<700) return false; backT=Date.now(); b.click(); return true; }
    function lastBotN(){ var b=items().filter(function(x){ return x.a==='bot'; }).pop(); return b ? b.n : -1; }
    var touchedQ=-2;
    function listOf(b){ return b && b.closest('[data-lb-part="options-list"]'); }
    function pick(b){ opts().forEach(function(x){ if (x===b) x.setAttribute('data-lb-picked','1'); else x.removeAttribute('data-lb-picked'); }); picked=txt(b); hint.textContent = touch ? 'tap '+picked.toLowerCase()+' again to confirm.' : 'enter confirms '+picked.toLowerCase()+'.'; }
    function logAnswer(b){ var o=opts(); if (o.length<2) return; var bots=items().filter(function(x){ return x.a==='bot' && !x.w.hasAttribute('data-rt-old'); }), q=bots[bots.length-1]; if (!q) return;
      var c=q.m.querySelector('.rt-clone'); if (!c || c.querySelector('.rt-optlog')) return;
      var d=document.createElement('div'); d.className='rt-optlog';
      d.innerHTML=o.map(function(x, i){ return '<div class="row'+(x===b?' on':'')+'">['+(KEYS[i]||'?')+'] '+esc(txt(x))+'</div>'; }).join(''); c.appendChild(d); }
    function confirm(b){ if (!b || listOf(b)===spent) return; logAnswer(b); spent=listOf(b); b.setAttribute('data-lb-picked','1'); setTimeout(function(){ realClick(b); }, 0); }
    var nudgeT=null; function nudge(){ document.body.classList.add('rt-nudge'); clearTimeout(nudgeT); nudgeT=setTimeout(function(){ document.body.classList.remove('rt-nudge'); }, 900); }
    function restart(){ var r=opts().filter(function(b){ return txt(b)==='RESTART'; })[0]; if (r) { confirm(r); return; }
      var tok=(/\/(H-[A-Z0-9-]+)\//.exec(location.pathname)||[])[1];
      try { if (tok) [localStorage, sessionStorage].forEach(function(s){ for (var i=s.length-1;i>=0;i--) { var k=s.key(i); if (k && k.indexOf(tok)>=0) s.removeItem(k); } }); } catch(e){}
      location.reload(); }
    function toggleHelp(on){ help.hidden = on===undefined ? !help.hidden : !on; }
    help.addEventListener('click', function(){ toggleHelp(false); });
    keys.addEventListener('click', function(e){ var b=e.target.closest('button'); if (!b) return; e.stopPropagation(); if (b.getAttribute('data-k')==='esc') restart(); else toggleHelp(); });
    document.addEventListener('click', function(e){
      if (pass) return; var b=e.target && e.target.closest && e.target.closest('[data-lb-part="option-button"]'); if (!b) return;
      if (listOf(b)===spent) { e.preventDefault(); e.stopPropagation(); return; }
      if (txt(b)==='RESTART' || picked===txt(b)) { logAnswer(b); spent=listOf(b); b.setAttribute('data-lb-picked','1'); return; }
      e.preventDefault(); e.stopPropagation(); pick(b);
    }, true);
    document.addEventListener('keydown', function(e){
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (!help.hidden) { e.preventDefault(); toggleHelp(false); return; }
      if (e.key==='Escape') { e.preventDefault(); restart(); return; }
      var t=e.target, typing = t && (t.tagName==='INPUT' || t.tagName==='TEXTAREA');
      if (typing && e.key==='Backspace' && !e.repeat && !(t.value||'') && touchedQ!==lastBotN()) { if (goBack()) e.preventDefault(); return; }
      if (!typing && (e.key==='Backspace' || e.key==='ArrowLeft')) { e.preventDefault(); if (!e.repeat) goBack(); return; }
      if (typing) { if (e.key==='Enter' && !(t.value||'').trim()) { e.preventDefault(); hint.textContent='type something first. enter sends.'; nudge(); } return; }
      if (e.key==='?') { e.preventDefault(); toggleHelp(true); return; }
      var o=opts(); if (!o.length) return;
      var k=e.key.length===1 ? KEYS.indexOf(e.key.toUpperCase()) : -1;
      if (k>=0 && k<o.length) { e.preventDefault(); pick(o[k]); return; }
      if (k<0 && e.key.toUpperCase()==='R' && o.length===1 && txt(o[0])==='RESTART') { e.preventDefault(); confirm(o[0]); return; }
      if (e.key==='Enter') { var onBtn=t && t.closest && t.closest('[data-lb-part="option-button"]'); if (onBtn) return; e.preventDefault();
        var b=o.filter(function(x){ return txt(x)===picked; })[0] || (o.length===1 ? o[0] : null); if (b) confirm(b); else nudge(); }
    }, true);
    var measure=document.createElement('canvas').getContext('2d');
    function placeCursor(){ var i=inputEl(); if (!i || cursor.parentNode!==i.parentNode) { cursor.style.display='none'; return; }
      measure.font='22px VT323, monospace'; var w=measure.measureText(i.value||'').width, x=i.offsetLeft+Math.min(w, i.clientWidth-14)+2;
      cursor.style.display = document.activeElement===i ? '' : 'none'; cursor.style.left=x+'px'; }
    document.addEventListener('input', function(e){ if (e.target && e.target.tagName==='INPUT') touchedQ=lastBotN(); placeCursor(); }, true); document.addEventListener('focusin', placeCursor, true); document.addEventListener('focusout', function(){ setTimeout(placeCursor, 0); }, true);
    var last='', focusedFor=null, lastArr=-1, pinUntil=0;
    function render(force){
      park(); var it=items(); decorate(it);
      if (arrival!==lastArr) { lastArr=arrival; pinUntil=Date.now()+1500; }
      if (Date.now()<pinUntil) { var sa=document.querySelector('[aria-label="Scrollable conversation area"]'); if (sa && sa.scrollHeight-sa.clientHeight-sa.scrollTop>1) sa.scrollTop=sa.scrollHeight; }
      var o=opts(), inp=inputEl();
      if (o.length && listOf(o[0])!==spent && spent) { spent=null; picked=null; }
      o.forEach(function(b, i){ var k='['+(KEYS[i]||'?')+']'; if (txt(b)==='RESTART') k='[R]'; if (b.getAttribute('data-rt-key')!==k) b.setAttribute('data-rt-key', k);
        if (picked!==txt(b) && b.hasAttribute('data-lb-picked') && listOf(b)!==spent) b.removeAttribute('data-lb-picked'); });
      var lastQ=(items().filter(function(x){ return x.a==='bot'; }).pop()||{}).t||'', ask = !inp ? '' : /SEATS/.test(lastQ) ? 'type a number. enter sends.' : /NAME/.test(lastQ) ? 'type your name. enter sends.' : 'type, then enter.';
      if (inp) { if (inp.getAttribute('placeholder')!=='') inp.setAttribute('placeholder', ''); if (/SEATS/.test(lastQ) && inp.getAttribute('inputmode')!=='numeric') inp.setAttribute('inputmode','numeric');
        var ae=document.activeElement; if (ae!==inp && (!ae || ae===document.body || focusedFor!==inp)) { try { inp.focus({preventScroll:true}); } catch(x){} if (document.activeElement===inp) focusedFor=inp; } placeCursor(); } else focusedFor=null;
      var end = o.length===1 && txt(o[0])==='RESTART'; if (end!==document.body.hasAttribute('data-rt-end')) { if (end) document.body.setAttribute('data-rt-end',''); else document.body.removeAttribute('data-rt-end'); }
      var sig=[arrival, o.length, !!inp, score, lives, picked, ask].join('|'); if (!force && sig===last) return; last=sig;
      scEl.textContent=('0000'+score).slice(-4); lvEl.textContent=String(lives);
      if (lives<=1) sEl.setAttribute('data-low', String(lives)); else sEl.removeAttribute('data-low');
      var choose = o.length>1;
      hint.hidden=!(choose || ask); if (ask && !choose && hint.textContent!==ask) hint.textContent=ask;
      if (choose && !picked) hint.textContent = touch ? 'tap to select. tap again to confirm.' : 'press '+KEYS.slice(0, o.length).join(', ').replace(/, ([A-Z])$/, ' or $1')+'. enter confirms.';
    }
    render(true); setInterval(render, 300);
    var winT=0, winN=0;   /* loop guard */
    var mo=new MutationObserver(function(){ try { var now=Date.now(); if (now-winT>1000) { winT=now; winN=0; } if (++winN>300) { mo.disconnect(); window.__rtLoop={n:winN}; return; } render(); } catch(e){ window.__lbFootErr=String(e); } });
    mo.observe(document.body, {childList:true, subtree:true, characterData:true});
    window.__mkState=function(){ var o=opts(); return {score:score, lives:lives, opts:o.map(txt), picked:picked, input:!!inputEl(), last:(items().filter(function(x){ return x.a==='bot'; }).pop()||{}).t||'', hint:hint.hidden?'':hint.textContent, backs:backs, back:!!nativeBack() && !document.body.hasAttribute('data-rt-end'),
      log:items().filter(function(x){ return x.a==='bot' && !x.w.hasAttribute('data-rt-old'); }).map(function(x){ return qkey(x.t).split('\n').pop(); })}; };
  } catch(err) {
    window.__lbFootErr=String(err); document.body.classList.remove('rt-js');
    document.querySelectorAll('[data-rt-src]').forEach(function(p){ p.removeAttribute('data-rt-src'); });
    document.body.removeAttribute('data-rt-end');
    document.querySelectorAll('.rt-clone,#rt-top,#rt-hint,#rt-keys,#rt-help,#rt-cursor').forEach(function(n){ n.remove(); });
  }
})();
