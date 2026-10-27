/* lb-js: pf-demo-booking 1 · [mockup 13] Demo booking · Plumfold (invented). DOM-only page behaviour:
   header tile, "You told us" chips card, 2-col answer tiles (tap = send), slot picker (next 5 business days from today, one full day,
   time grid, browser timezone) that types the chosen slot into the flow's own question, big CTA, confirmation + record cards.
   Reads the page, adds attributes/classes/own elements, only clicks the flow's own controls. Fails open: the chat works without it. */
(function(){
  try {
    if (window.__lbFootRan) return; window.__lbFootRan = true; document.body.classList.add('pf-js');
    var S = [
      {k:'team', t:'How big is your team?', kind:'tiles'},
      {k:'tool', t:'What do you use today?', kind:'tiles'},
      {k:'when', t:'When do you want to go live?', kind:'tiles'},
      {k:'small', t:'Teams of 1–10 usually start on their own', kind:'rows'},
      {k:'slot', t:'Pick a time that works', kind:'slot', cta:'Confirm'},
      {k:'name', t:"Who's joining the call?", kind:'text', cta:'Continue'},
      {k:'email', t:'Your work email', kind:'text', cta:'Confirm booking'},
      {k:'email2', t:'That looks like a personal address', kind:'text', cta:'Confirm booking'},
      {k:'trial', t:'Where should we send your trial link?', kind:'text', cta:'Start my trial'},
      {k:'done', t:'Demo booked', kind:'end'},
      {k:'self', t:'Start on your own', kind:'end'}];
    var CHIP = {team:function(v){ return 'Team of '+v; },
      tool:function(v){ return {'Spreadsheets':'On spreadsheets today','Another tool':'Switching from another tool','Nothing yet':'Starting from scratch'}[v] || v; },
      when:function(v){ return {'This quarter':'Go-live this quarter','Next quarter':'Go-live next quarter','Just exploring':'Just exploring'}[v] || v; }};
    var EMPTY = {team:'Team size', tool:'Tools today', when:'Go-live'}, ORDER=['team','tool','when'], BACK=/^(Back|‹ Back)$/;
    var SUB = {'Book a 20-min tour':'Video call with a product specialist', 'Try it on my own':'Start a free trial, no call needed'};
    var DOW = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'], MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    var SETS = [['09:00','10:30','12:00','15:30'], ['09:30','11:00','14:00','16:30'], ['10:00','11:30','13:30','16:00']];
    function txt(el){ return (el && el.textContent || '').trim(); }
    function first(t){ return String(t).split('\n')[0].trim(); }
    function esc(s){ return String(s).replace(/[&<>"]/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }
    function textOf(p){ var ps=p.querySelectorAll('p'); var t = ps.length ? [].map.call(ps, function(x){ return x.textContent; }).join('\n') : p.textContent; return String(t||'').replace(/\n\s*\n+/g,'\n').trim(); }
    function msgText(m){ var p=m.querySelector('[data-lb-part="message-text"]'); return p ? (p.getAttribute('data-pf-src') || textOf(p)) : ''; }
    function si(t){ var h=first(t); for (var i=0;i<S.length;i++) if (h===S[i].t) return i; return -1; }
    /* arrival order: v4 sorts by timestamp, so a fast answer can land above its question; keep first-seen order */
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
      var it=items(), lastUser=-1, cur=-1, curN=-1, ans={}, lastSum=null;
      it.forEach(function(x){
        if (x.a==='user') { lastUser=x.n; if (cur>=0 && CHIP[S[cur].k] && !BACK.test(x.t)) ans[S[cur].k]=x.t; }
        else { var i=si(x.t); if (i>=0) { cur=i; curN=x.n; if (CHIP[S[i].k]) ORDER.slice(ORDER.indexOf(S[i].k)).forEach(function(k){ delete ans[k]; }); }
          if (first(x.t)==='You told us') lastSum=x; } });
      /* after a Back into the slot screen the flow re-asks only the question: keep the latest summary card on screen */
      var keep = cur>=0 && S[cur].k==='slot' && lastSum ? lastSum : null;
      var vis=[]; it.forEach(function(x){ var old=x.n<=lastUser && x!==keep; if (old!==x.w.hasAttribute('data-pf-old')) { if (old) x.w.setAttribute('data-pf-old',''); else x.w.removeAttribute('data-pf-old'); } if (!old && x.a==='bot') vis.push(x); });
      return {cur:cur, curN:curN, s:cur>=0?S[cur]:null, visible:vis, ans:ans};
    }
    function clone(p, html){
      var t=p.getAttribute('data-pf-src') || textOf(p), n=p.nextElementSibling, key=t+'|'+html;
      if (p.getAttribute('data-pf-src')===t && n && n.classList.contains('pf-clone') && n.getAttribute('data-for')===key) return;
      if (n && n.classList.contains('pf-clone')) n.remove();
      var d=document.createElement('div'); d.className='pf-clone'; d.setAttribute('data-for', key); d.innerHTML=html; p.insertAdjacentElement('afterend', d); p.setAttribute('data-pf-src', t);
    }
    var shownChips={};
    function chipsHtml(vals){ return ['team','tool','when'].map(function(k){ var v=vals[k];
      if (!v) return '<span class="pf-chip" data-empty>'+esc(EMPTY[k])+'</span>';
      var lab=CHIP[k](v), isNew=shownChips[k]!==lab; shownChips[k]=lab; return '<span class="pf-chip"'+(isNew?' data-new':'')+'>'+esc(lab)+'</span>'; }).join(''); }
    function card(vals, foot){ return '<div class="pf-card"><span class="pf-card-k">You told us</span><div class="pf-chips">'+chipsHtml(vals)+'</div>'+(foot||'')+'</div>'; }
    function kv(lines){ var o=[]; lines.forEach(function(l){ var c=l.indexOf(': '); if (c>0) o.push([l.slice(0,c), l.slice(c+2)]); }); return o; }
    var meetingShort='30-min demo', meetingSub='Video call with Sales';
    function decorate(st){
      document.querySelectorAll('.pf-clone').forEach(function(c){ var p=c.previousElementSibling; if (!p || !p.hasAttribute('data-pf-src')) c.remove(); });
      var hasSummary=st.visible.some(function(x){ return first(x.t)==='You told us'; });
      st.visible.forEach(function(x){
        var p=x.m.querySelector('[data-lb-part="message-text"]'); if (!p) return;
        var L=x.t.split('\n').map(function(s){ return s.trim(); }).filter(Boolean), h=L[0], kind='', i=si(x.t);
        if (h==='You told us') {
          var o={}; kv(L.slice(1)).forEach(function(r){ o[r[0]]=r[1]; });
          var fit=L.filter(function(l){ return /^(Good fit|Small team)/.test(l); })[0] || '';
          meetingShort = /^Small team/.test(fit) ? '20-min tour' : '30-min demo'; meetingSub = /^Small team/.test(fit) ? 'Video call with a product specialist' : 'Video call with Sales';
          clone(p, card({team:o.Team, tool:o.Today, when:o['Go-live']}, fit ? '<span class="pf-fit"'+(/^Small/.test(fit)?' data-small':'')+'>'+esc(fit)+'</span>' : ''));
        }
        else if (i>=0 && S[i].k==='slot') clone(p, '<div class="pf-q">'+esc(h)+'</div>');
        else if (i>=0 && CHIP[S[i].k]) clone(p, card(st.ans, S[i].k==='team' ? '<span class="pf-hint">Three quick questions, then pick a time.</span>' : '')+'<div class="pf-q">'+esc(h)+'</div>'+(L.length>1 && S[i].k!=='team' ? '<div class="pf-qs">'+esc(L.slice(1).join(' '))+'</div>' : ''));
        else if (i>=0 && L.length>1) clone(p, '<div class="pf-q">'+esc(h)+'</div><div class="pf-qs">'+esc(L.slice(1).join(' '))+'</div>');
        else if (/^What Plumfold's (sales )?team would receive$/.test(h)) {
          var rows=kv(L.slice(1)), slot='', meet='';
          rows.forEach(function(r){ if (r[0]==='Slot') slot=r[1]; if (r[0]==='Meeting') meet=r[1]; });
          var top='';
          if (slot) { var m=/^(.*?)\s*\((.*)\)\s*$/.exec(slot); top='<div class="pf-ok"><span class="pf-ok-k">'+(/tour/i.test(meet)?'Tour booked':'Demo booked')+'</span><span class="pf-ok-v">'+esc(m?m[1]:slot)+'</span><span class="pf-ok-s">'+esc((meet||'Video call')+(m?' · '+m[2]:''))+'</span></div>'; }
          clone(p, top+'<div class="pf-rec"><span class="pf-rec-t">'+esc(h)+'</span>'+rows.map(function(r){ return '<div class="pf-rec-r"><span>'+esc(r[0])+'</span><b>'+esc(r[1])+'</b></div>'; }).join('')+'</div>');
        }
        else if (h.indexOf('Demo:')===0) kind='fine';
        if ((x.m.getAttribute('data-pf-kind')||'')!==kind) { if (kind) x.m.setAttribute('data-pf-kind', kind); else x.m.removeAttribute('data-pf-kind'); }
      });
      /* "Demo booked" title message: the confirmation card carries it, hide the plain title when the card is there */
      st.visible.forEach(function(x){ if (first(x.t)==='Demo booked') { var p=x.m.querySelector('[data-lb-part="message-text"]'); if (p) clone(p, ''); } });
      return hasSummary;
    }
    /* ---------- slot picker ---------- */
    function tzName(){ var z=''; try { z=Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch(e){}
      var ab=''; try { var parts=new Intl.DateTimeFormat('en-GB',{timeZoneName:'short'}).formatToParts(new Date()); parts.forEach(function(q){ if (q.type==='timeZoneName') ab=q.value; }); } catch(e){}
      return {zone:z||'Your time zone', abbr:ab}; }
    function nextDays(){ var out=[], d=new Date(); d.setHours(12,0,0,0);
      while (out.length<5) { d.setDate(d.getDate()+1); var w=d.getDay(); if (w!==0 && w!==6) out.push(new Date(d.getTime())); }
      var full=-1; out.forEach(function(x,i){ if (full<0 && x.getDay()===5) full=i; }); if (full<0) full=4;
      return out.map(function(x,i){ return {d:x, full:i===full, times:SETS[x.getDate()%3]}; }); }
    function dayLabel(x){ return DOW[x.getDay()]+' '+x.getDate()+' '+MON[x.getMonth()]; }
    var days=nextDays(), dayI=days[0].full?1:0, timeV=null, tz=tzName();
    var picker=document.createElement('div'); picker.id='pf-picker'; picker.hidden=true;
    function drawPicker(){
      var h='<div class="pf-days" role="group" aria-label="Day">';
      days.forEach(function(x,i){ h+='<button type="button" class="pf-day" data-i="'+i+'"'+(x.full?' disabled aria-label="'+esc(dayLabel(x.d))+', fully booked" title="Fully booked"':' aria-pressed="'+(i===dayI)+'"')+'><small>'+DOW[x.d.getDay()]+'</small><b>'+x.d.getDate()+'</b></button>'; });
      h+='</div><div class="pf-times" role="group" aria-label="Time">';
      days[dayI].times.forEach(function(t){ h+='<button type="button" class="pf-time" data-t="'+t+'" aria-pressed="'+(t===timeV)+'">'+t+'</button>'; });
      h+='</div><div class="pf-tz">'+esc(tz.zone)+(tz.abbr?' ('+esc(tz.abbr)+')':'')+' <em>· demo availability</em></div>';
      picker.innerHTML=h; }
    function slotLabel(){ return timeV ? dayLabel(days[dayI].d)+', '+timeV : ''; }
    function slotValue(){ return slotLabel()+' ('+tz.zone+(tz.abbr?' '+tz.abbr:'')+')'; }
    drawPicker();
    picker.addEventListener('click', function(e){
      var b=e.target && e.target.closest && e.target.closest('button'); if (!b || b.disabled) return;
      if (b.classList.contains('pf-day')) { var i=+b.getAttribute('data-i'); if (i!==dayI) { dayI=i; if (days[i].times.indexOf(timeV)<0) timeV=null; drawPicker(); var nb=picker.querySelector('.pf-day[data-i="'+i+'"]'); if (nb) nb.focus(); } }
      else if (b.classList.contains('pf-time')) { timeV=b.getAttribute('data-t'); drawPicker(); var nt=picker.querySelector('.pf-time[data-t="'+timeV+'"]'); if (nt) nt.focus(); hint.hidden=true; }
      render(true);
    });
    picker.addEventListener('keydown', function(e){
      var b=e.target; if (!b || !b.classList) return;
      if (b.classList.contains('pf-day') && (e.key==='ArrowRight' || e.key==='ArrowLeft')) { e.preventDefault(); var st=e.key==='ArrowRight'?1:-1, i=dayI;
        for (var k=0;k<5;k++) { i=(i+st+5)%5; if (!days[i].full) break; } dayI=i; if (days[i].times.indexOf(timeV)<0) timeV=null; drawPicker(); var nb=picker.querySelector('.pf-day[data-i="'+i+'"]'); if (nb) nb.focus(); render(true); }
    });
    /* ---------- top, CTA ---------- */
    var top=document.createElement('div'); top.id='pf-top';
    top.innerHTML='<div class="pf-logo" aria-hidden="true">P</div><div class="pf-id"><span class="pf-name">Plumfold · 30-min demo</span><span class="pf-sub">Video call with Sales</span></div>';
    var nameEl=top.querySelector('.pf-name'), subEl=top.querySelector('.pf-sub');
    var wrap=document.createElement('div'); wrap.id='pf-cta-wrap'; wrap.hidden=true; wrap.innerHTML='<div id="pf-hint" hidden>Pick a time to continue</div><button type="button" id="pf-cta">Confirm</button>';
    var cta=wrap.querySelector('#pf-cta'), hint=wrap.querySelector('#pf-hint');
    function park(){
      var hc=document.querySelector('[data-lb-part="header"] > .responsive-container'); if (hc && top.parentNode!==hc) hc.appendChild(top);
      var foot=document.querySelector('[data-lb-part="window"] > .responsive-container:last-child'); if (!foot) return;
      var kids=[].slice.call(foot.children), brand=kids.filter(function(k){ return k.querySelector('[data-lb-part="branding"]'); })[0]||null;
      if (wrap.parentNode!==foot || wrap.nextElementSibling!==brand) foot.insertBefore(wrap, brand);
      if (picker.parentNode!==foot || picker.nextElementSibling!==wrap) foot.insertBefore(picker, wrap);
    }
    function opts(){ return [].slice.call(document.querySelectorAll('[data-lb-part="option-button"]')); }
    function inputEl(){ return document.querySelector('[data-lb-part="text-input"] input, [data-lb-part="text-input"] textarea'); }
    function setVal(i, v){ var proto = i.tagName==='TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype; Object.getOwnPropertyDescriptor(proto,'value').set.call(i, v); i.dispatchEvent(new Event('input',{bubbles:true})); }
    function submitInput(i){ var sb=document.querySelector('[data-lb-part="input-submit"], [data-lb-part="text-input"] button'); if (sb && !sb.disabled) sb.click(); else i.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',code:'Enter',keyCode:13,bubbles:true})); }
    function looksValid(i, k){ var v=(i&&i.value||'').trim(); if (!v) return false; if (k==='email'||k==='email2'||k==='trial') return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v); return true; }
    var leaveFrom=null, leaveArr=0, leaveT=null, leaveChk=null;
    function leaving(on, from){ clearTimeout(leaveT); clearTimeout(leaveChk);
      if (!on) { document.body.classList.remove('pf-leaving'); leaveFrom=null; return; }
      leaveFrom=from; leaveArr=arrival; document.body.classList.add('pf-leaving'); leaveT=setTimeout(function(){ leaving(false); }, 4000);
      leaveChk=setTimeout(function(){ if (document.querySelector('[data-lb-part="input-error"]') && readState().cur===leaveFrom) leaving(false); }, 700); }
    var sayT=null; function say(m){ hint.textContent=m; hint.hidden=false; clearTimeout(sayT); sayT=setTimeout(function(){ hint.hidden=true; }, 2600); }
    var pass=false; function realClick(b){ pass=true; try { b.click(); } finally { pass=false; } }
    function send(){
      var st=readState(), s=st.s; if (!s) return;
      cta.classList.add('pf-pressed'); setTimeout(function(){ cta.classList.remove('pf-pressed'); }, 140);
      if (s.kind==='slot') { var i=inputEl(); if (!i) return; if (!timeV) { say('Pick a time to continue'); var ft=picker.querySelector('.pf-time'); if (ft) ft.focus(); return; }
        setVal(i, slotValue()); leaving(true, st.cur); setTimeout(function(){ submitInput(i); }, 0); return; }
      if (s.kind==='text') { var j=inputEl(); if (!j) return; if (!j.value.trim()) { j.focus(); say(s.k==='name' ? 'Type your name to continue' : 'Type your work email to continue'); return; }
        if (looksValid(j, s.k)) leaving(true, st.cur); submitInput(j); return; }
    }
    cta.addEventListener('click', send);
    document.addEventListener('click', function(e){ var nb=e.target && e.target.closest && e.target.closest('button[data-slot="button"][data-size="sm"][data-variant="ghost"]'); if (nb) leaving(true, readState().cur); }, true);
    /* tap = send, with instant feedback */
    document.addEventListener('pointerdown', function(e){ var b=e.target && e.target.closest && e.target.closest('[data-lb-part="option-button"]'); if (b) b.setAttribute('data-pf-tap',''); }, true);
    document.addEventListener('click', function(e){ if (pass) return; var b=e.target && e.target.closest && e.target.closest('[data-lb-part="option-button"]'); if (!b) return;
      b.setAttribute('data-pf-tap',''); leaving(true, readState().cur); }, true);
    document.addEventListener('keydown', function(e){
      var t=e.target, st=readState(), s=st.s; if (!s) return;
      if (t && (t.tagName==='INPUT'||t.tagName==='TEXTAREA')) { if (e.key==='Enter' && s.kind==='text' && looksValid(t, s.k)) leaving(true, st.cur); return; }
      if (e.metaKey||e.ctrlKey||e.altKey) return;
      if (s.kind==='slot') { if (e.key==='Enter' && (!t || !t.closest || !t.closest('#pf-picker'))) { e.preventDefault(); send(); } else if (e.key==='Enter' && t.classList && t.classList.contains('pf-time')) { e.preventDefault(); if (timeV===t.getAttribute('data-t')) send(); else t.click(); }
        var n=parseInt(e.key,10), tb=picker.querySelectorAll('.pf-time'); if (n>=1 && n<=tb.length) { e.preventDefault(); tb[n-1].click(); } return; }
      if (s.kind==='tiles' || s.kind==='rows') { var m=parseInt(e.key,10), o=opts(); if (m>=1 && m<=o.length) { e.preventDefault(); o[m-1].setAttribute('data-pf-tap',''); leaving(true, st.cur); realClick(o[m-1]); } }
    }, true);
    var last='', focusedFor=null, slotN=-1;
    var HEAD={team:'30-min demo', tool:'30-min demo', when:'30-min demo', small:'Book a call', trial:'Free trial', self:'Free trial'};
    var HSUB={team:'Video call with Sales', tool:'Video call with Sales', when:'Video call with Sales', small:'A tour or a free trial', trial:'No call needed', self:'No call needed'};
    function render(force){
      park(); var st=readState(); decorate(st);
      var s=st.s, o=opts(), inp=inputEl(), k=s?s.k:'';
      if (k==='team') { meetingShort='30-min demo'; meetingSub='Video call with Sales'; }
      if (k==='slot' && st.curN!==slotN) { slotN=st.curN; days=nextDays(); dayI=days[0].full?1:0; timeV=null; drawPicker(); }
      if (leaveFrom!==null && st.cur!==leaveFrom && (o.length || inp)) leaving(false);
      o.forEach(function(b, i){ var l=txt(b), sp=b.querySelector('span');
        if (sp && SUB[l] && sp.getAttribute('data-sub')!==SUB[l]) sp.setAttribute('data-sub', SUB[l]);
        var key = s && (s.kind==='tiles') ? String(i+1) : ''; if ((b.getAttribute('data-pf-key')||'')!==key) { if (key) b.setAttribute('data-pf-key', key); else b.removeAttribute('data-pf-key'); } });
      if (inp && s && s.kind==='text') { var ph={name:'First and last name', email:'name@company.com', email2:'name@company.com', trial:'name@company.com'}[k]; if (ph && inp.getAttribute('placeholder')!==ph) inp.setAttribute('placeholder', ph);
        var ac={name:'name', email:'email', email2:'email', trial:'email'}[k]; if (ac && inp.getAttribute('autocomplete')!==ac) inp.setAttribute('autocomplete', ac);
        if (focusedFor!==k && !document.body.classList.contains('pf-leaving')) { focusedFor=k; try { inp.focus({preventScroll:true}); } catch(e){} } }
      if (!inp) focusedFor=null;
      var nm='Plumfold · '+(HEAD[k]||meetingShort); if (nameEl.textContent!==nm) nameEl.textContent=nm; var sb=HSUB[k]||meetingSub; if (subEl.textContent!==sb) subEl.textContent=sb;
      var lab = s && s.kind==='slot' ? (timeV ? 'Confirm '+slotLabel() : 'Pick a time') : (s && s.cta) || '';
      if (cta.textContent!==lab) cta.textContent=lab;
      if (s && s.kind==='slot' && !timeV) cta.setAttribute('data-idle',''); else cta.removeAttribute('data-idle');
      var sig=[st.cur, o.length, !!inp, timeV, dayI].join('|'); if (!force && sig===last) return; last=sig;
      document.body.setAttribute('data-pf-screen', k);
      document.body.setAttribute('data-pf-kind', s ? s.kind : '');
      document.body.setAttribute('data-pf-cols', s && s.kind==='rows' ? '1' : '2');
      var showPicker = !!(s && s.kind==='slot' && inp); if (picker.hidden===showPicker) picker.hidden=!showPicker;
      var showCta = !!(s && (s.kind==='slot' || s.kind==='text') && inp); if (wrap.hidden===showCta) wrap.hidden=!showCta;
    }
    render(true); setInterval(render, 300);
    /* loop guard: a render that keeps changing the DOM would freeze the page; stop observing and keep the evidence */
    var winT=0, winN=0;
    var mo=new MutationObserver(function(){ try {
      var now=Date.now(); if (now-winT>1000) { winT=now; winN=0; } winN++;
      if (winN>300) { mo.disconnect(); window.__pfLoop={n:winN, sig:last}; return; }
      render(); } catch(e){ window.__lbFootErr=String(e); } });
    mo.observe(document.body, {childList:true, subtree:true, characterData:true});
    window.__mkState=function(){ var st=readState(); return {screen:st.s?st.s.k:null, ans:st.ans, day:days[dayI]?dayLabel(days[dayI].d):null, time:timeV, cta:cta.textContent, ctaShown:!wrap.hidden, picker:!picker.hidden,
      days:days.map(function(x){ return dayLabel(x.d)+(x.full?' (full)':''); }), tz:tz, header:nameEl.textContent}; };
  } catch(err) {
    window.__lbFootErr=String(err); document.body.classList.remove('pf-js');
    document.querySelectorAll('[data-pf-src],[data-pf-old]').forEach(function(p){ p.removeAttribute('data-pf-src'); p.removeAttribute('data-pf-old'); });
    document.querySelectorAll('.pf-clone,#pf-top,#pf-cta-wrap,#pf-picker').forEach(function(n){ n.remove(); });
  }
})();
