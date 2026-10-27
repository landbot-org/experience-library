/* lb-js: av-adventure 2 */
/* [mockup 7] Choose-your-own adventure · Mossglen Tales (invented) · channel 3516220. Reads the chapter token in the bot text
   ("CHAPTER n OF 5 · TIME"), sets body[data-av-ch] for the palette, draws the chapter/time row, the story type (title, event, narrative),
   the "Carrying: …" line and the chapter dots; side actions dashed; picked choice fills at once; keys 1–3 choose; loop guard.
   Native Back (v2, 09-25): a Back press holds the current screen dimmed until the re-asked chapter arrives, then shows only that chapter
   (palette, header, dots and Carrying line follow it); a second press while waiting is ignored; the "Back" user message is never shown.
   Only reads the DOM and presses the flow's own buttons. */
(function(){
  try {
    if (window.__lbFootRan) return; window.__lbFootRan = true; document.body.classList.add('av-js');
    var DOTS = ['#2B1B3D','#3B2A17','#0F2E24','#1B2440','#4A2330'], SIDE = ['Check the map','Go back to the fork'];
    var TOKEN = /^CHAPTER (\d) OF (\d) · (.+)$/;
    function txt(el){ return (el && el.textContent || '').trim(); }
    function textOf(p){ var ps=p.querySelectorAll('p'); var t = ps.length ? [].map.call(ps, function(x){ return x.textContent; }).join('\n') : p.textContent; return String(t||'').replace(/\n\s*\n+/g,'\n').trim(); }
    function esc(s){ return String(s).replace(/[&<>"]/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }
    function lines(t){ return String(t).split('\n').map(function(s){ return s.trim(); }).filter(Boolean); }
    function msgText(m){ var p=m.querySelector('[data-lb-part="message-text"]'); return p ? (p.getAttribute('data-av-src') || textOf(p)) : ''; }
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
      var it=items(), lastUser=-1, ch=null;
      it.forEach(function(x){ if (x.a==='user') lastUser=x.n; else { var L=lines(x.t), mm=TOKEN.exec(L[0]||''); if (mm) ch={n:+mm[1], of:+mm[2], time:mm[3], title:L[1]||'', carry:(L.filter(function(l){ return l.indexOf('Carrying: ')===0; })[0]||''), key:x.n}; } });
      var cut=lastUser, botAfter=it.some(function(x){ return x.a==='bot' && x.n>lastUser; });
      if (!botAfter && document.body.classList.contains('av-leaving')) { var us=it.filter(function(x){ return x.a==='user'; }); cut = us.length>1 ? us[us.length-2].n : -1; }
      var vis=[]; it.forEach(function(x){ var old=x.a==='user' ? true : x.n<=cut; if (old!==x.w.hasAttribute('data-av-old')) { if (old) x.w.setAttribute('data-av-old',''); else x.w.removeAttribute('data-av-old'); } if (!old && x.a==='bot') vis.push(x); });
      return {ch:ch, visible:vis};
    }
    function clone(p, html){
      var t=p.getAttribute('data-av-src') || textOf(p), n=p.nextElementSibling, key=t+'|'+html.length;
      if (p.getAttribute('data-av-src')===t && n && n.classList.contains('av-clone') && n.getAttribute('data-for')===key) return;
      if (n && n.classList.contains('av-clone')) n.remove();
      var d=document.createElement('div'); d.className='av-clone'; d.setAttribute('data-for', key); d.innerHTML=html; p.insertAdjacentElement('afterend', d); p.setAttribute('data-av-src', t);
    }
    function chapterHtml(L){
      var body=L.slice(1).filter(function(l){ return l.indexOf('Carrying: ')!==0; }), title=body[0]||'', rest=body.slice(1), h='<div class="av-ch">';
      var em=/^Ending (\d) of (\d): (.+)$/.exec(title); if (em) { h+='<div class="av-end-k">Ending '+em[1]+' of '+em[2]+'</div>'; title=em[3]; }
      h+='<div class="av-title">'+esc(title)+'</div>';
      if (rest.length>1) h+='<div class="av-event">'+esc(rest[0])+'</div>';
      h+='<div class="av-text">'+esc(rest[rest.length-1]||'')+'</div>';
      return h+'</div>';
    }
    function decorate(st){
      document.querySelectorAll('.av-clone').forEach(function(c){ var p=c.previousElementSibling; if (!p || !p.hasAttribute('data-av-src')) c.remove(); });
      st.visible.forEach(function(x){
        var p=x.m.querySelector('[data-lb-part="message-text"]'); if (!p) return;
        var L=lines(x.t), h=L[0]||'';
        if (TOKEN.test(h)) clone(p, chapterHtml(L));
        else if (h.indexOf('What the Mossglen Tales team would receive')===0) { var r='<div class="av-rec"><div class="t">'+esc(h)+'</div>';
          L.slice(1).forEach(function(l){ var c=l.indexOf(': '); if (c>0) r+='<div class="r"><span>'+esc(l.slice(0,c))+'</span><span>'+esc(l.slice(c+2))+'</span></div>'; });
          clone(p, r+'</div>'); }
        else if (h.indexOf('Demo only')===0) clone(p, '<div class="av-fine">'+esc(x.t)+'</div>');
      });
    }
    /* injected UI */
    var top=document.createElement('div'); top.id='av-top'; top.innerHTML='<div class="row"><span class="c"></span><span class="t"></span></div><div class="rule"></div>';
    var cEl=top.querySelector('.c'), tEl=top.querySelector('.t');
    var foot=document.createElement('div'); foot.id='av-foot';
    var dots=document.createElement('div'); dots.id='av-dots'; dots.setAttribute('aria-label','Chapters');
    dots.innerHTML=DOTS.map(function(c, i){ return '<div class="d"><i style="background:'+c+'"></i><span>CH. '+(i+1)+'</span></div>'; }).join('');
    var dEls=[].slice.call(dots.querySelectorAll('.d'));
    function footer(){ return document.querySelector('[data-lb-part="window"] > .responsive-container:last-child'); }
    function park(){
      var hc=document.querySelector('[data-lb-part="header"] > .responsive-container'); if (hc && top.parentNode!==hc) hc.appendChild(top);
      var f=footer(); if (!f) return;
      var brand=[].filter.call(f.children, function(k){ return k.querySelector('[data-lb-part="branding"]'); })[0]||null;
      if (foot.parentNode!==f || foot.nextElementSibling!==brand) f.insertBefore(foot, brand);
      if (brand && brand.firstElementChild!==dots) brand.insertBefore(dots, brand.firstElementChild);
    }
    function opts(){ return [].slice.call(document.querySelectorAll('[data-lb-part="option-button"]')); }
    var pass=false; function realClick(b){ pass=true; try { b.click(); } finally { pass=false; } }
    var leaveKey=null, leaveT=null, spent=null, kbd=false, topFor=null, topUntil=0, backLeave=false, backs=0;
    var BACK='button[data-slot="button"][data-size="sm"][data-variant="ghost"]';
    function listOf(b){ return b && b.closest('[data-lb-part="options-list"]'); }
    function leaving(on){ clearTimeout(leaveT); if (!on) { document.body.classList.remove('av-leaving'); leaveKey=null; backLeave=false; return; }
      leaveKey=arrival; document.body.classList.add('av-leaving'); leaveT=setTimeout(function(){ spent=null; leaving(false); render(true); }, 8000); }
    var ghost=null, ghostCh=null;
    function makeGhost(){ var l=spent, f=footer(); if (!l || !f) return; var slot=l; while (slot && slot.parentNode!==f) slot=slot.parentNode; if (!slot) return;
      if (ghost) ghost.remove(); ghost=slot.cloneNode(true); ghost.id='av-ghost'; ghost.setAttribute('aria-hidden','true'); ghost.hidden=true; ghostCh=lastCh;
      [].forEach.call(ghost.querySelectorAll('[data-lb-part]'), function(n){ n.setAttribute('data-av-part', n.getAttribute('data-lb-part')); n.removeAttribute('data-lb-part'); });
      [].forEach.call(ghost.querySelectorAll('button'), function(n){ n.tabIndex=-1; }); f.insertBefore(ghost, foot); }
    function choose(b, viaClick){ if (!b || listOf(b)===spent) return false; spent=listOf(b); b.setAttribute('data-av-picked',''); makeGhost(); leaving(true); if (!viaClick) setTimeout(function(){ realClick(b); }, 0); return true; }
    document.addEventListener('click', function(e){
      if (pass) return; var bk=e.target && e.target.closest && e.target.closest(BACK);
      if (bk && bk.closest('[aria-label="Conversation messages"]')) { if (document.body.classList.contains('av-leaving')) { e.preventDefault(); e.stopPropagation(); return; }
        var o0=opts(); spent=o0.length ? listOf(o0[0]) : null; if (spent) makeGhost(); leaving(true); backLeave=true; backs++; kbd = e.detail===0; return; }
      var b=e.target && e.target.closest && e.target.closest('[data-lb-part="option-button"]'); if (!b) return;
      if (!choose(b, true)) { e.preventDefault(); e.stopPropagation(); return; } kbd = e.detail===0;
    }, true);
    document.addEventListener('keydown', function(e){
      if (e.metaKey || e.ctrlKey || e.altKey) return; var t=e.target; if (t && (t.tagName==='INPUT' || t.tagName==='TEXTAREA')) return;
      var n=parseInt(e.key,10), o=opts(); if (n>=1 && n<=o.length) { e.preventDefault(); if (choose(o[n-1], false)) kbd=true; return; }
      if (e.key==='Enter' && o.length===1 && !(t && t.closest && t.closest('[data-lb-part="option-button"]'))) { e.preventDefault(); if (choose(o[0], false)) kbd=true; }
    }, true);
    var last='', lastCh=null;
    function render(force){
      park(); var st=readState(); decorate(st);
      var o=opts(), ch=st.ch;
      var fresh=o.length && listOf(o[0])!==spent;
      if (leaveKey!==null && arrival>leaveKey && o.length && (fresh || (backLeave && ch && ch.key>=leaveKey))) { leaving(false); spent=null; if (kbd) { kbd=false; try { o[0].focus({preventScroll:true}); } catch(x){} } }
      if (ch && topFor!==ch.key) { topFor=ch.key; topUntil=Date.now()+1600; }
      if (Date.now()<topUntil) { var sa=document.querySelector('[aria-label="Scrollable conversation area"]'); if (sa && sa.scrollTop) sa.scrollTop=0; }
      if (ghost && (fresh || (ch && ch.key!==ghostCh))) { ghost.remove(); ghost=null; }
      if (ghost) { var hide=!!o.length; if (ghost.hidden!==hide) ghost.hidden=hide; }
      lastCh = ch ? ch.key : null;
      o.forEach(function(b){ var cta=txt(b)==='Play again'; if (cta!==b.hasAttribute('data-av-cta')) { if (cta) b.setAttribute('data-av-cta',''); else b.removeAttribute('data-av-cta'); }
        var side=SIDE.indexOf(txt(b))>=0; if (side!==b.hasAttribute('data-av-side')) { if (side) b.setAttribute('data-av-side',''); else b.removeAttribute('data-av-side'); }
        if (b.hasAttribute('data-av-picked') && listOf(b)!==spent) b.removeAttribute('data-av-picked'); });
      var sig=[ch && ch.key, o.length, document.body.classList.contains('av-leaving')].join('|'); if (!force && sig===last) return; last=sig;
      if (!ch) return;
      document.body.setAttribute('data-av-ch', String(ch.n));
      if (/^Ending /.test(ch.title)) document.body.setAttribute('data-av-end',''); else document.body.removeAttribute('data-av-end');
      cEl.textContent='Chapter '+ch.n+' of '+ch.of; tEl.textContent=ch.time;
      foot.textContent=ch.carry;
      dEls.forEach(function(d, i){ var on=i+1===ch.n, fut=i+1>ch.n; if (on!==d.hasAttribute('data-on')) { if (on) d.setAttribute('data-on',''); else d.removeAttribute('data-on'); }
        if (fut!==d.hasAttribute('data-future')) { if (fut) d.setAttribute('data-future',''); else d.removeAttribute('data-future'); } });
      dots.setAttribute('aria-label','Chapter '+ch.n+' of '+ch.of);
    }
    render(true); setInterval(render, 300);
    var winT=0, winN=0;   /* loop guard */
    var mo=new MutationObserver(function(){ try { var now=Date.now(); if (now-winT>1000) { winT=now; winN=0; } if (++winN>300) { mo.disconnect(); window.__avLoop={n:winN}; return; } render(); } catch(e){ window.__lbFootErr=String(e); } });
    mo.observe(document.body, {childList:true, subtree:true, characterData:true});
    window.__mkState=function(){ var st=readState(), o=opts(); var bb=[].filter.call(document.querySelectorAll('[aria-label="Conversation messages"] '+BACK), function(x){ var r=x.getBoundingClientRect(); return r.width>0 && r.height>0 && getComputedStyle(x.parentNode).opacity==='1'; });
      return {back:bb.length>0, backs:backs, pal:document.body.getAttribute('data-av-ch'), ch:st.ch?st.ch.n:null, time:st.ch?st.ch.time:null, title:st.ch?st.ch.title:null, carry:foot.textContent, opts:o.map(txt), leaving:document.body.classList.contains('av-leaving')}; };
  } catch(err) {
    window.__lbFootErr=String(err); document.body.classList.remove('av-js');
    document.querySelectorAll('[data-av-src],[data-av-old]').forEach(function(p){ p.removeAttribute('data-av-src'); p.removeAttribute('data-av-old'); });
    document.querySelectorAll('.av-clone,#av-top,#av-foot,#av-dots').forEach(function(n){ n.remove(); });
  }
})();
