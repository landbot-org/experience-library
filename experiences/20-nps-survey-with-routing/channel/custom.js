/* lb-js: nps-pennaloft 4 — [mockup 20] NPS survey · Pennaloft (invented) · channel 3517945.
   Page-only behaviour: header row (logo tile + kicker), the 0–10 row laid out as 6 + 5 cells with end labels, instant amber on tap,
   the score row held on screen (pick highlighted) under the follow-up question, a multi-line answer box that feeds the flow's own
   text field ("Skipped" when empty), a note card, a Send button, message kinds for the end screens (record, placeholder card),
   and "change score" via the chat's own Back. Reads the DOM; the only things it sends are clicks on the flow's own controls and the
   visitor's typed text into the flow's own field. Fails open: without it the chat still works as a plain list + text field. */
(function(){
  try {
    if (window.__lbFootRan) return; window.__lbFootRan = true; document.body.classList.add('np-js');
    var BRAND='Pennaloft';
    var Q_SCORE='How likely are you to recommend '+BRAND+' to a colleague?';
    var TITLES=['Thank you!','No problem. Thanks for your time.','Thanks for the honest score.',"Thanks. It's with the support team.",'Understood. Thanks for the honest score.',
                'Thank you, that means a lot.','Thanks for telling us.','Sorry, something went wrong reading your score.'];
    var PH={Promoter:'The support team answered in minutes…', Passive:'It would be a 10 if…', Detractor:'What happened in your support chat…'};
    function txt(el){ return (el && el.textContent || '').trim(); }
    function esc(s){ return String(s).replace(/[&<>"]/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }
    function textOf(p){ var ps=p.querySelectorAll('p'); var t = ps.length ? [].map.call(ps, function(x){ return x.textContent; }).join('\n') : p.textContent; return String(t||'').replace(/\n\s*\n+/g,'\n').trim(); }
    function msgText(m){ var p=m.querySelector('[data-lb-part="message-text"]'); return p ? (p.getAttribute('data-np-src') || textOf(p)) : ''; }
    function bandOf(t){ return /keep doing\?$/.test(t) ? 'Promoter' : /made it a 10\?$/.test(t) ? 'Passive' : /let you down/.test(t) ? 'Detractor' : ''; }
    function screenOf(t){
      if (t===Q_SCORE) return 'score';
      if (/^An? \d{1,2}[,.] /.test(t) && bandOf(t)) return 'follow';
      if (t==='Thank you, that means a lot.' || t.indexOf('Would you say it in a public review')===0) return 'review';
      if (t==='Thanks for telling us.' || t.indexOf('Would you like someone from the support team')===0) return 'dfollow';
      if (t==='Where can the team reach you?') return 'email';
      if (t.indexOf('Sorry, something went wrong')===0) return 'fail';
      if (TITLES.indexOf(t)>=0 || t.indexOf('What the '+BRAND+' team would receive')===0 || t.indexOf('Review page')===0 || t.indexOf('Demo only')===0) return 'end';
      return '';
    }
    function kindOf(t){
      if (t===Q_SCORE) return 'q-score';
      if (screenOf(t)==='follow') return 'q-follow';
      if (t==='Where can the team reach you?') return 'q-follow';
      if (TITLES.indexOf(t)>=0) return 'title';
      if (t.indexOf('What the '+BRAND+' team would receive')===0) return 'record';
      if (t.indexOf('Review page')===0) return 'card';
      if (t.indexOf('Demo only')===0) return 'fine';
      return 'lead';
    }
    /* arrival order (v4 can put a fast answer above its question) */
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
      var it=items(), lastUser=-1, screen='', band='', scoreQ=null, score='', prev=null;
      it.forEach(function(x){
        if (x.a==='user') { lastUser=x.n; if (prev==='score' && /^\d{1,2}$/.test(x.t)) score=x.t; prev=null; return; }
        var s=screenOf(x.t); if (s) { screen=s; prev=s; } if (s==='score') { scoreQ=x; score=''; } if (s==='follow') band=bandOf(x.t);
      });
      var visible=[], held=null;
      it.forEach(function(x){
        var old = x.n <= lastUser;
        if (screen==='follow' && x===scoreQ) { old=false; held=x; }
        if (old !== x.w.hasAttribute('data-np-old')) { if (old) x.w.setAttribute('data-np-old',''); else x.w.removeAttribute('data-np-old'); }
        if (!old && x.a==='bot') visible.push(x);
      });
      return {screen:screen, band:band, score:score, held:held, visible:visible};
    }
    function clone(p, html){
      var t=p.getAttribute('data-np-src') || textOf(p), n=p.nextElementSibling, key=t+'|'+html.length+'|'+html.slice(-40);
      if (p.getAttribute('data-np-src')===t && n && n.classList.contains('np-clone') && n.getAttribute('data-for')===key) return false;
      if (n && n.classList.contains('np-clone')) n.remove();
      var d=document.createElement('div'); d.className='np-clone'; d.setAttribute('data-for', key); d.innerHTML=html; p.insertAdjacentElement('afterend', d); p.setAttribute('data-np-src', t); return true;
    }
    function unclone(p){ if (!p || !p.hasAttribute('data-np-src')) return; var n=p.nextElementSibling; if (n && n.classList.contains('np-clone')) n.remove(); p.removeAttribute('data-np-src'); }
    function gridHTML(pick){
      var h='<div class="np-grid np-held" role="group" aria-label="Your score">';
      for (var i=0;i<=10;i++) h+='<button type="button" class="np-cell" data-n="'+i+'"'+(String(i)===pick?' data-on="" aria-pressed="true"':' aria-pressed="false"')+'>'+i+'</button>';
      return h+'</div><div class="np-ends"><span>Not likely</span><span>Very likely</span></div><div class="np-rule"></div>';
    }
    function decorate(st){
      document.querySelectorAll('.np-clone').forEach(function(c){ var p=c.previousElementSibling; if (!p || !p.hasAttribute('data-np-src')) c.remove(); });
      st.visible.forEach(function(x){
        var k=kindOf(x.t); if (x===st.held) k='held';
        if ((x.m.getAttribute('data-np-kind')||'')!==k) x.m.setAttribute('data-np-kind', k);
        var p=x.m.querySelector('[data-lb-part="message-text"]'); if (!p) return;
        if (k==='held') clone(p, '<div class="np-q">'+esc(x.t)+'</div>'+gridHTML(st.score));
        else if (k==='record') { var L=x.t.split('\n'), r='<div class="np-record"><div class="np-r-t">'+esc(L[0])+'</div>';
          for (var i=1;i<L.length;i++){ var c=L[i].indexOf(': '); if (c>0) r+='<div class="np-r-row"><span class="np-r-k">'+esc(L[i].slice(0,c))+'</span><span class="np-r-v">'+esc(L[i].slice(c+2))+'</span></div>'; }
          clone(p, r+'</div>'); }
        else if (k==='card') { var C=x.t.split('\n'); clone(p, '<div class="np-card"><span class="np-star"></span><div><div class="np-card-t">'+esc(C[0])+'</div><div class="np-card-u">'+esc(C[1]||'')+'</div><div class="np-card-n">'+esc(C.slice(2).join(' '))+'</div></div></div>'); }
        else if (k==='q-score' && p.hasAttribute('data-np-src')) unclone(p);
      });
    }
    /* own elements: header row, end labels (score screen), answer box, note, Send */
    var top=document.createElement('div'); top.id='np-top';
    top.innerHTML='<span class="np-logo">'+BRAND.charAt(0)+'</span><span class="np-kick">'+BRAND+' · after your support chat</span>';
    var ends=document.createElement('div'); ends.className='np-ends np-ends-live'; ends.innerHTML='<span>Not likely</span><span>Very likely</span>';
    var box=document.createElement('label'); box.id='np-box';
    box.innerHTML='<span class="np-lab">Your answer (optional)</span><textarea id="np-why" rows="4"></textarea>';
    var ta=box.querySelector('textarea');
    var note=document.createElement('div'); note.id='np-note';
    note.innerHTML='<span class="np-star"></span><span class="np-note-t"></span>'; var noteT=note.querySelector('.np-note-t');
    /* only the visitor's own band gets its line (QA 2026-09-28 row 11); passives go straight to the end, so no note */
    var NOTE={Promoter:'Promoters get asked for a public review next.', Detractor:'Detractors are offered a follow-up.'};
    var wrap=document.createElement('div'); wrap.id='np-send-wrap'; wrap.innerHTML='<div id="np-hint" hidden>Pick a score from 0 to 10 first.</div><button type="button" id="np-send">Send</button>';
    var send=wrap.querySelector('#np-send'), hint=wrap.querySelector('#np-hint');
    function foot(){ return document.querySelector('[data-lb-part="window"] > .responsive-container:last-child'); }
    function park(st){
      var hc=document.querySelector('[data-lb-part="header"] > .responsive-container'); if (hc && top.parentNode!==hc) hc.appendChild(top);
      var f=foot(); if (!f) return;
      var kids=[].slice.call(f.children), brand=kids.filter(function(k){ return k.querySelector('[data-lb-part="branding"]'); })[0]||null;
      if (wrap.parentNode!==f || wrap.nextElementSibling!==brand) f.insertBefore(wrap, brand);
      var og=document.querySelector('[data-lb-part="options-group"]');
      if (og && st.screen==='score') { if (ends.parentNode!==og || og.lastElementChild!==ends) og.appendChild(ends); } else if (ends.parentNode) ends.remove();
      var ti=document.querySelector('[data-lb-part="text-input"]');
      if (ti && st.screen==='follow') { var host=ti.parentNode; if (box.parentNode!==host || box.nextElementSibling!==ti) host.insertBefore(box, ti); if (note.parentNode!==host || ti.nextElementSibling!==note) ti.insertAdjacentElement('afterend', note); }
      else { if (box.parentNode) box.remove(); if (note.parentNode) note.remove(); }
    }
    function opts(){ return [].slice.call(document.querySelectorAll('[data-lb-part="option-button"]')); }
    function inputEl(){ return document.querySelector('[data-lb-part="text-input"] input, [data-lb-part="text-input"] textarea'); }
    function nativeBack(){ return document.querySelector('button[data-slot="button"][data-size="sm"][data-variant="ghost"]'); }
    function setVal(i, v){ var proto = i.tagName==='TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(proto,'value').set.call(i, v); i.dispatchEvent(new Event('input',{bubbles:true})); }
    var pass=false; function realClick(b){ pass=true; try { b.click(); } finally { pass=false; } }
    var leaveFrom=null, leaveT=null;
    function leaving(on, from){ clearTimeout(leaveT); if (!on) { document.body.classList.remove('np-leaving'); leaveFrom=null; return; }
      leaveFrom=from; document.body.classList.add('np-leaving'); leaveT=setTimeout(function(){ leaving(false); }, 3500); }
    var hintT=null; function say(m){ hint.textContent=m; hint.hidden=false; document.body.classList.remove('np-nudge'); void document.body.offsetWidth; document.body.classList.add('np-nudge');
      clearTimeout(hintT); hintT=setTimeout(function(){ hint.hidden=true; document.body.classList.remove('np-nudge'); }, 2600); }
    function pressed(el){ el.classList.add('np-pressed'); setTimeout(function(){ el.classList.remove('np-pressed'); }, 140); }
    /* score: instant amber, then the flow's own button is clicked */
    var tapped=false;
    function answerScore(b){ if (tapped) return; tapped=true; b.setAttribute('data-np-tap',''); var label=txt(b);
      setTimeout(function(){ var cur=opts().filter(function(x){ return txt(x)===label; })[0] || b; realClick(cur); }, 140); }
    function answerOther(b){ leaving(true, readState().screen); b.setAttribute('data-np-tap',''); setTimeout(function(){ realClick(b); }, 0); }
    function submitText(v){
      var i=inputEl(); if (!i) return false; setVal(i, v);
      setTimeout(function(){ var sb=document.querySelector('[data-lb-part="input-submit"]');
        if (sb && !sb.disabled) sb.click(); else i.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',code:'Enter',keyCode:13,bubbles:true})); }, 30);
      return true;
    }
    var sentFollow=false, lastComment='';
    function doSend(){
      pressed(send); var st=readState();
      if (st.screen==='score') { say('Pick a score from 0 to 10 first.'); return; }
      if (st.screen==='follow') { if (sentFollow) return; var v=ta.value.replace(/\s+$/,'').trim(); sentFollow=true; lastComment=v; leaving(true, 'follow'); if (!submitText(v || 'Skipped')) { sentFollow=false; leaving(false); } return; }
      if (st.screen==='email') { var i=inputEl(); if (!i) return; var ev=(i.value||'').trim(); if (!ev) { i.focus(); say('Type your email to continue.'); return; }
        if (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(ev)) leaving(true, 'email');
        var sb=document.querySelector('[data-lb-part="input-submit"]'); if (sb && !sb.disabled) sb.click(); else i.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',code:'Enter',keyCode:13,bubbles:true})); return; }
      var o=opts(); if (o.length) answerOther(o[0]);
    }
    send.addEventListener('click', doSend);
    /* change score: the chat's own Back, then the new score is picked on the re-asked question */
    var pending=null, pendingT=null;
    document.addEventListener('click', function(e){
      if (pass) return; var t=e.target;
      var cell=t && t.closest && t.closest('.np-held .np-cell');
      if (cell) { e.preventDefault(); var st=readState(); if (st.screen!=='follow' || cell.hasAttribute('data-on')) return; var nb=nativeBack(); if (!nb) return;
        [].forEach.call(document.querySelectorAll('.np-held .np-cell'), function(c){ if (c===cell) c.setAttribute('data-on',''); else c.removeAttribute('data-on'); });
        pending=cell.getAttribute('data-n'); clearTimeout(pendingT); pendingT=setTimeout(function(){ pending=null; }, 8000);
        document.body.classList.add('np-changing'); realClick(nb); return; }
      var nbk=t && t.closest && t.closest('button[data-slot="button"][data-size="sm"][data-variant="ghost"]');
      if (nbk) { nbk.classList.add('np-pressed'); leaving(true, readState().screen); return; }
      var b=t && t.closest && t.closest('[data-lb-part="option-button"]'); if (!b) return;
      var s=readState().screen; e.preventDefault(); e.stopPropagation();
      if (s==='score') answerScore(b); else answerOther(b);
    }, true);
    document.addEventListener('keydown', function(e){
      var t=e.target;
      if (t===ta) { if (e.key==='Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); doSend(); } return; }
      if (t && (t.tagName==='INPUT'||t.tagName==='TEXTAREA')) { if (e.key==='Enter' && readState().screen==='email' && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test((t.value||'').trim())) leaving(true, 'email'); return; }
      if (e.metaKey||e.ctrlKey||e.altKey) return;
      var ob=t && t.closest && t.closest('[data-lb-part="option-button"]');
      if (ob && (e.key==='Enter' || e.key===' ' || e.code==='Space')) { e.preventDefault(); e.stopPropagation(); if (readState().screen==='score') answerScore(ob); else answerOther(ob); return; }
      if (t===send) return;
      if (e.key==='Enter') { var o=opts(); if (o.length===1) { e.preventDefault(); answerOther(o[0]); } }
    }, true);
    var last='', focusedFor=null;
    function render(){
      var st=readState(); park(st); decorate(st);
      var o=opts(), inp=inputEl();
      if (leaveFrom!==null && st.screen!==leaveFrom && (o.length || inp)) leaving(false);
      if (st.screen!=='score') tapped=false;
      if (st.screen==='score') lastComment='';
      if (st.screen!=='follow') { sentFollow=false; if (ta.value) ta.value=''; ta.__np=false; }
      else if (!ta.__np) { ta.__np=true; if (!ta.value && lastComment) ta.value=lastComment; }
      if (pending!==null) st.visible.forEach(function(x){ if (!x.m.hasAttribute('data-np-still')) x.m.setAttribute('data-np-still',''); });
      if (pending!==null && st.screen==='score' && o.length) { var nb=o.filter(function(x){ return txt(x)===pending; })[0]; if (nb) { var pn=pending; pending=null; tapped=true; nb.setAttribute('data-np-tap',''); setTimeout(function(){ realClick(nb); }, 60); document.body.classList.remove('np-changing'); } }
      if (pending===null && st.screen==='follow') document.body.classList.remove('np-changing');
      o.forEach(function(b){ var l=txt(b), role='';
        if (st.screen==='score') role='cell'; else if (o.length===1) role='primary'; else role = (b===o[0]) ? 'primary' : 'secondary';
        if ((b.getAttribute('data-np-role')||'')!==role) b.setAttribute('data-np-role', role); });
      if (st.screen==='follow' && PH[st.band] && ta.getAttribute('placeholder')!==PH[st.band]) ta.setAttribute('placeholder', PH[st.band]);
      if (inp && st.screen==='email') { if (inp.getAttribute('placeholder')!=='name@example.com') inp.setAttribute('placeholder','name@example.com'); if (inp.getAttribute('inputmode')!=='email') { inp.setAttribute('inputmode','email'); inp.setAttribute('autocomplete','email'); } }
      var fk = st.screen==='follow' && inp ? 'follow' : st.screen==='email' && inp ? 'email' : null;
      var coarse = window.matchMedia && matchMedia('(pointer: coarse)').matches;
      if (fk && focusedFor!==fk && !coarse && !document.body.classList.contains('np-leaving')) { focusedFor=fk; try { (fk==='follow' ? ta : inp).focus({preventScroll:true}); } catch(e){} }
      if (!fk) focusedFor=null;
      var sig=[st.screen, st.band, st.score, o.length, !!inp].join('|'); if (sig===last) return; last=sig;
      document.body.setAttribute('data-np-screen', st.screen || 'loading');
      if (st.screen==='follow' || st.screen==='email') setTimeout(function(){ var sa=document.querySelector('[aria-label="Scrollable conversation area"]'); if (sa && sa.scrollHeight>sa.clientHeight) sa.scrollTop=sa.scrollHeight; }, 60);
      if (st.band) document.body.setAttribute('data-np-band', st.band.toLowerCase()); else document.body.removeAttribute('data-np-band');
      var nt=NOTE[st.band]||''; if (noteT.textContent!==nt) noteT.textContent=nt; note.style.display = nt ? '' : 'none';
      var showSend = st.screen==='follow' || st.screen==='email';
      wrap.hidden = !showSend; send.textContent = 'Send';
      send.setAttribute('aria-disabled', st.screen==='score' ? 'true' : 'false');
    }
    render(); setInterval(function(){ try { render(); } catch(e){ window.__lbFootErr=String(e); } }, 300);
    /* loop guard: a render that keeps changing the DOM would freeze the page; stop observing and keep the evidence */
    var winT=0, winN=0;
    var mo=new MutationObserver(function(){ try { var now=Date.now(); if (now-winT>1000) { winT=now; winN=0; } winN++;
      if (winN>300) { mo.disconnect(); window.__npLoop={n:winN, sig:last}; return; } render(); } catch(e){ window.__lbFootErr=String(e); } });
    mo.observe(document.body, {childList:true, subtree:true, characterData:true});
    window.__mkState=function(){ var st=readState(); return {screen:st.screen, band:st.band, score:st.score, held:!!st.held, pending:pending,
      kinds:st.visible.map(function(x){ return x.m.getAttribute('data-np-kind')||'-'; }), cells:document.querySelectorAll('[data-np-role="cell"]').length, ta:ta.value}; };
  } catch(err) {
    window.__lbFootErr=String(err); document.body.classList.remove('np-js');
    document.querySelectorAll('[data-np-src],[data-np-old]').forEach(function(p){ p.removeAttribute('data-np-src'); p.removeAttribute('data-np-old'); });
    document.querySelectorAll('.np-clone,#np-top,#np-send-wrap,#np-box,#np-note,.np-ends-live').forEach(function(n){ n.remove(); });
  }
})();
