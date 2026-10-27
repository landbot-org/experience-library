/* [mockup 6] Personality quiz · Ottervane (invented) · channel 3516146. Header row (kicker + 8 dots), message kinds (welcome/result card parts,
   record), trait bars and record clones, tap feedback (instant navy fill, answer sent 180 ms later), keys A-C / 1-3, Share (Web Share API,
   clipboard fallback), fade between screens, native Back (shown on Q2–Q8, result, email; one Back per screen; a pending answer is cancelled).
   Reads the DOM; the only thing it sends is a click on the flow's own buttons. Fails open.
   lb-js: qz-quiz 2 */
(function(){
  try {
    if (window.__lbFootRan) return; window.__lbFootRan = true; document.body.classList.add('qz-js');
    var QS = ['A new tool lands on your desk. First move?','Your inbox at 9 am looks like…','A task comes back for the third time. You…',
              'Pick a weekend project.','In meetings, you are the one who…','A project slips a week. You…','Your favourite kind of win?','Good work is…'];
    var DESC=/^You (build the machine|grow things|try the new thing)/;
    function txt(el){ return (el && el.textContent || '').trim(); }
    function msgText(m){ var p=m.querySelector('[data-lb-part="message-text"]'); return p ? (p.getAttribute('data-qz-src') || txt(p)) : ''; }
    /* screen of one bot text: welcome | q1..q8 | result | email | done | fail | '' */
    function screenOf(t){
      if (t==='What kind of builder are you?' || t.indexOf('Ottervane · 1-minute quiz')===0 || t.indexOf('8 quick questions')===0) return 'welcome';
      var i=QS.indexOf(t); if (i>=0) return 'q'+(i+1);
      if (/^The (Automator|Gardener|Explorer)$/.test(t) || DESC.test(t) || /^Speed \d+%/.test(t) || t.indexOf('Based on your 8 answers')===0) return 'result';
      if (t.indexOf('Where should we send the')===0) return 'email';
      if (t.indexOf('Done. In a live setup')===0 || t.indexOf('Would land in the Ottervane CRM')===0 || t.indexOf('Demo only')===0) return 'done';
      if (t.indexOf('Sorry, something went wrong')===0) return 'fail';
      return '';
    }
    function kindOf(t, scr){
      if (t.indexOf('Ottervane · 1-minute quiz')===0) return 'kicker';
      if (t==='What kind of builder are you?' || /^The (Automator|Gardener|Explorer)$/.test(t)) return 'card-title';
      if (t.indexOf('8 quick questions')===0 || DESC.test(t)) return 'card-sub';
      if (/^Speed \d+%/.test(t)) return 'card-bars';
      if (t.indexOf('Based on your 8 answers')===0) return 'card-note';
      if (t.indexOf('Would land in the Ottervane CRM')===0) return 'record';
      if (t.indexOf('Demo only')===0) return 'fine';
      if (t.indexOf('Done. In a live setup')===0 || t.indexOf('Sorry, something went wrong')===0) return 'lead';
      return '';
    }
    /* arrival order (v4 puts a fast answer above its question: 11-insurance finding) */
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
      var it=items(), lastUser=-1, screen='', type='';
      it.forEach(function(x){ if (x.a==='user') lastUser=x.n; else { var s=screenOf(x.t); if (s) screen=s; var mt=/^The (Automator|Gardener|Explorer)$/.exec(x.t); if (mt) type=mt[1].toLowerCase(); } });
      if (screen==='welcome') type='';
      var visible=[];
      it.forEach(function(x){ var old = x.n <= lastUser; if (old !== x.w.hasAttribute('data-qz-old')) { if (old) x.w.setAttribute('data-qz-old',''); else x.w.removeAttribute('data-qz-old'); }
        if (!old && x.a==='bot') visible.push(x); });
      return {screen:screen, type:type, visible:visible};
    }
    function curBars(){ return document.querySelectorAll('[aria-label="Conversation messages"] > div:not([data-qz-old]) .qz-bar-h'); }
    function esc(s){ return String(s).replace(/[&<>"]/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }
    function clone(p, html){
      var t=p.getAttribute('data-qz-src') || txt(p), n=p.nextElementSibling, key=t+'|'+html.length;
      if (p.getAttribute('data-qz-src')===t && n && n.classList.contains('qz-clone') && n.getAttribute('data-for')===key) return false;
      if (n && n.classList.contains('qz-clone')) n.remove();
      var d=document.createElement('div'); d.className='qz-clone'; d.setAttribute('data-for', key); d.innerHTML=html; p.insertAdjacentElement('afterend', d); p.setAttribute('data-qz-src', t); return true;
    }
    function decorate(st){
      document.querySelectorAll('.qz-clone').forEach(function(c){ var p=c.previousElementSibling; if (!p || !p.hasAttribute('data-qz-src')) c.remove(); });
      var prevCard=null;
      st.visible.forEach(function(x){
        var k=kindOf(x.t); if ((x.m.getAttribute('data-qz-kind')||'')!==k) { if (k) x.m.setAttribute('data-qz-kind', k); else x.m.removeAttribute('data-qz-kind'); }
        var p=x.m.querySelector('[data-lb-part="message-text"]');
        if (k==='card-bars' && p) { var h='<div class="qz-bars">';
          x.t.split('\n').forEach(function(line){ var m=/^(.*?)\s+(\d+)%$/.exec(line.trim()); if (m) { var v=Math.max(0, Math.min(100, +m[2]));
            h+='<div><div class="qz-bar-h"><span>'+esc(m[1])+'</span><span>'+v+'%</span></div><div class="qz-bar-t"><div class="qz-bar-f" data-w="'+v+'"></div></div></div>'; } });
          if (clone(p, h+'</div>')) requestAnimationFrame(function(){ requestAnimationFrame(function(){ document.querySelectorAll('.qz-bar-f[data-w]').forEach(function(b){ b.style.width=b.getAttribute('data-w')+'%'; }); }); }); }
        if (k==='record' && p) { var L=x.t.split('\n'), r='<div class="qz-record"><div class="qz-r-t">'+esc(L[0])+'</div>';
          for (var i=1;i<L.length;i++){ var c=L[i].indexOf(': '); if (c>0) r+='<div class="qz-r-row"><span class="qz-r-k">'+esc(L[i].slice(0,c))+'</span><span class="qz-r-v">'+esc(L[i].slice(c+2))+'</span></div>'; }
          clone(p, r+'</div>'); }
        /* last message of a card run gets the rounded bottom */
        var isCard=k.indexOf('card')===0;
        if (prevCard && !isCard) prevCard.setAttribute('data-qz-last','');
        if (isCard) { if (prevCard) prevCard.removeAttribute('data-qz-last'); prevCard=x.m; } else prevCard=null;
      });
      if (prevCard) prevCard.setAttribute('data-qz-last','');
      document.querySelectorAll('[data-qz-last]').forEach(function(m){ var k=m.getAttribute('data-qz-kind')||''; if (k.indexOf('card')!==0) m.removeAttribute('data-qz-last'); });
    }
    /* header row + share button + toast */
    var top=document.createElement('div'); top.id='qz-top';
    top.innerHTML='<span class="qz-kick"></span><span class="qz-dots">'+new Array(9).join('<span class="qz-dot"></span>')+'</span>';
    var share=document.createElement('button'); share.type='button'; share.id='qz-share'; share.textContent='Share your result';
    var toast=document.createElement('div'); toast.id='qz-toast'; toast.setAttribute('role','status'); document.body.appendChild(toast);
    function park(){
      var hc=document.querySelector('[data-lb-part="header"] > .responsive-container'); if (hc && top.parentNode!==hc) hc.appendChild(top);
      var og=document.querySelector('[data-lb-part="window"] > .responsive-container:last-child > div:first-child');
      if (og && share.parentNode!==og) og.insertBefore(share, og.firstChild); else if (og && og.firstChild!==share) og.insertBefore(share, og.firstChild);
    }
    var copiedT=null; function copied(){ share.textContent='Result and link copied'; share.setAttribute('data-done',''); clearTimeout(copiedT); copiedT=setTimeout(function(){ share.textContent='Share your result'; share.removeAttribute('data-done'); }, 2200); }
    var toastT=null; function say(s){ toast.textContent=s; toast.setAttribute('data-on',''); clearTimeout(toastT); toastT=setTimeout(function(){ toast.removeAttribute('data-on'); }, 2200); }
    share.addEventListener('click', function(){
      share.classList.add('qz-pressed'); setTimeout(function(){ share.classList.remove('qz-pressed'); }, 140);
      var st=readState(), name=st.type ? 'The '+st.type.charAt(0).toUpperCase()+st.type.slice(1) : 'my result';
      var bars=[].map.call(curBars(), function(h){ return h.textContent.replace(/(\D)(\d)/,'$1 $2'); }).join(', ');
      var data={ title:'What kind of builder are you?', text:'I got '+name+(bars?' ('+bars+')':'')+' on the Ottervane builder quiz.', url:document.URL.split(/[?#]/)[0] };
      if (navigator.share) { navigator.share(data).catch(function(){}); return; }
      var s=data.text+' '+data.url;
      function legacy(){ try { var ta=document.createElement('textarea'); ta.value=s; ta.setAttribute('readonly',''); ta.style.cssText='position:fixed;left:-9999px;top:0';
          document.body.appendChild(ta); ta.select(); var ok=document.execCommand('copy'); ta.remove(); if (ok) copied(); else say('Copy this link: '+data.url); } catch(e){ say('Copy this link: '+data.url); } }
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(s).then(function(){ copied(); }, legacy); else legacy();
    });
    /* tap feedback on answers: fill at once, send 180 ms later, one answer per question */
    var pass=false, tappedFor=null, leaveFrom=null, leaveT=null, ansT=null, backFor=null;
    function leaving(on, from){ clearTimeout(leaveT); if (!on) { document.body.classList.remove('qz-leaving'); leaveFrom=null; return; }
      leaveFrom=from; document.body.classList.add('qz-leaving'); leaveT=setTimeout(function(){ leaving(false); }, 3500); }
    function realClick(b){ pass=true; try { b.click(); } finally { pass=false; } }
    function answer(b){
      var st=readState(); if (!/^q\d$/.test(st.screen)) { leaving(true, st.screen); setTimeout(function(){ realClick(b); }, 0); return; }   /* deferred: click() is ignored while the same element's click is in progress */
      if (tappedFor===st.screen) return; tappedFor=st.screen;
      b.setAttribute('data-qz-tap',''); var label=txt(b);
      clearTimeout(ansT); ansT=setTimeout(function(){ ansT=null; leaving(true, st.screen); var cur=[].filter.call(document.querySelectorAll('[data-lb-part="option-button"]'), function(x){ return txt(x)===label; })[0] || b; realClick(cur); }, 180);
    }
    /* native Back: one Back per screen (a double tap would go back twice); an answer still waiting to be sent is dropped, its fill cleared */
    var BACK='button[data-slot="button"][data-size="sm"][data-variant="ghost"]';
    document.addEventListener('click', function(e){
      var bk=!pass && e.target && e.target.closest && e.target.closest(BACK);
      if (bk) { var s0=readState().screen; if (backFor===s0) { e.preventDefault(); e.stopPropagation(); return; }
        backFor=s0; clearTimeout(ansT); ansT=null; tappedFor=null;
        document.querySelectorAll('[data-qz-tap]').forEach(function(x){ x.removeAttribute('data-qz-tap'); });
        bk.classList.add('qz-pressed'); setTimeout(function(){ bk.classList.remove('qz-pressed'); }, 300);
        setTimeout(function(){ if (backFor===s0) backFor=null; }, 4000); leaving(true, s0); return; }
      if (pass) return; var b=e.target && e.target.closest && e.target.closest('[data-lb-part="option-button"]'); if (!b) return;
      e.preventDefault(); e.stopPropagation(); answer(b);
    }, true);
    document.addEventListener('keydown', function(e){
      var t=e.target; if (t && (t.tagName==='INPUT'||t.tagName==='TEXTAREA'||t.isContentEditable)) { if (e.key==='Enter' && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test((t.value||'').trim())) leaving(true, 'email'); return; }
      if (e.metaKey||e.ctrlKey||e.altKey) return;
      var o=[].slice.call(document.querySelectorAll('[data-lb-part="option-button"]')); if (!o.length) return;
      var k=(e.key||'').toUpperCase(), i=-1;
      if (k>='A' && k<='C' && k.length===1) i=k.charCodeAt(0)-65; else if (k>='1' && k<='3' && k.length===1) i=+k-1;
      else if ((e.key==='Enter' || e.code==='Space' || e.key===' ') && t && t.closest && t.closest('[data-lb-part="option-button"]')) { e.preventDefault(); answer(t.closest('[data-lb-part="option-button"]')); return; }
      else if (e.key==='Enter' && o.length===1) i=0;
      if (i>=0 && o[i] && /^q\d$/.test(readState().screen)) { e.preventDefault(); answer(o[i]); }
      else if (i===0 && o.length===1) { e.preventDefault(); answer(o[0]); }
    }, true);
    var last='';
    function render(){
      park(); var st=readState(); decorate(st);
      var o=document.querySelectorAll('[data-lb-part="option-button"]'), inp=document.querySelector('[data-lb-part="input-field"] input');
      if (leaveFrom!==null && st.screen!==leaveFrom && (o.length || inp)) leaving(false);
      if (tappedFor && tappedFor!==st.screen) tappedFor=null;
      if (backFor && backFor!==st.screen) backFor=null;
      var sig=st.screen+'|'+st.type; if (sig===last) return; last=sig;
      document.body.setAttribute('data-qz-screen', /^q\d$/.test(st.screen) ? 'question' : st.screen);
      if (/^q\d$/.test(st.screen)) document.body.setAttribute('data-qz-q', st.screen.slice(1)); else document.body.removeAttribute('data-qz-q');
      if (/^q[2-8]$/.test(st.screen) || st.screen==='result' || st.screen==='email') document.body.setAttribute('data-qz-back',''); else document.body.removeAttribute('data-qz-back');
      if (st.type) document.body.setAttribute('data-qz-type', st.type); else document.body.removeAttribute('data-qz-type');
      var n = /^q\d$/.test(st.screen) ? +st.screen.slice(1) : (st.screen==='welcome' || !st.screen) ? 0 : 8;
      top.querySelector('.qz-kick').textContent = st.screen==='welcome' || !st.screen ? 'Ottervane · 1-minute quiz' : /^q\d$/.test(st.screen) ? 'Question '+n+' of 8'
        : st.screen==='result' ? 'Your result' : st.screen==='email' ? 'Your playbook' : st.screen==='done' ? 'All set' : 'Ottervane';
      [].forEach.call(top.querySelectorAll('.qz-dot'), function(d, i){ if (i < n) d.setAttribute('data-on',''); else d.removeAttribute('data-on'); });
      if (inp && st.screen==='email') { inp.setAttribute('placeholder','name@example.com'); inp.setAttribute('inputmode','email'); inp.setAttribute('autocomplete','email'); try { inp.focus({preventScroll:true}); } catch(e){} }
    }
    render(); setInterval(render, 300);
    new MutationObserver(function(){ try { render(); } catch(e){ window.__lbFootErr=String(e); } }).observe(document.body, {childList:true, subtree:true, characterData:true});
    window.__mkState=function(){ var st=readState(); return {screen:st.screen, type:st.type, kicker:top.querySelector('.qz-kick').textContent, dots:top.querySelectorAll('.qz-dot[data-on]').length,
      bars:[].map.call(curBars(), function(h){ return h.textContent; }), kinds:st.visible.map(function(x){ return x.m.getAttribute('data-qz-kind')||'-'; })}; };
  } catch(err) {
    window.__lbFootErr=String(err); document.body.classList.remove('qz-js');
    document.querySelectorAll('[data-qz-src],[data-qz-old]').forEach(function(p){ p.removeAttribute('data-qz-src'); p.removeAttribute('data-qz-old'); });
    document.querySelectorAll('.qz-clone,#qz-top,#qz-share').forEach(function(n){ n.remove(); });
  }
})();
