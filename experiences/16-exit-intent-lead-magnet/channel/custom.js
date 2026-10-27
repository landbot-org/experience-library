/* lb-js: quillmarsh-exit-intent 1 */
/* [mockup 16] Exit-intent lead magnet · Quillmarsh (invented). DOM only: draws a skeleton host page and a dim layer behind the
   chat, turns the chat window into a bottom sheet (phone) / centred modal (desktop) that opens on exit intent (desktop: the
   cursor leaves through the top of the page, fallback after 8 s; phone: after 2 s), adds the sheet top (badge, X, headline),
   the step prefix, an email field for steps 1-3 (its value is copied into the flow's own email question at step 4), the CTA,
   the "No thanks" link and the record card. The only things it ever sends are clicks on the flow's own buttons / submit and
   the text of the flow's own email field. Fails open: on error the plain chat shows. */
(function () {
  try {
    if (window.__lbFootRan) return; window.__lbFootRan = true;
    var B = document.body; B.classList.add('ei-js');
    var Q = [
      { k: 'q1', m: 'What do you sell?', step: 1 },
      { k: 'q2', m: 'How do you charge?', step: 2 },
      { k: 'q3', m: "What's a typical deal?", step: 3 },
      { k: 'email', m: 'Work email', text: 1 },
      { k: 'retry', p: "That doesn't look like a work email", text: 1 },
      { k: 'done', p: "Thanks. That's everything", end: 1 },
      { k: 'decline', p: 'No problem.', end: 1 }];
    var HEAD = 'Leaving already? Take the 2026 pricing benchmark.';
    var SUB = "Pricing models and price points by market, in one short report. Three quick questions and it's in your inbox.";
    var BACK = 'Back'; /* channel text.back (default); the native Back sends it as the visitor's message */
    var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/;
    var phone = (window.matchMedia && (matchMedia('(hover: none)').matches || matchMedia('(pointer: coarse)').matches)) || innerWidth < 700;

    function txt(el) { return (el && el.textContent || '').trim(); }
    function norm(t) { return String(t).replace(/[‘’]/g, "'"); }
    function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
    function match(t) { t = norm(t); for (var i = 0; i < Q.length; i++) { var q = Q[i]; if (q.m ? t === q.m : t.indexOf(q.p) === 0) return i; } return -1; }
    function msgText(m) { var p = m.querySelector('[data-lb-part="message-text"]'); return p ? (p.getAttribute('data-ei-src') || txt(p)) : ''; }

    /* ---------- host page, dim layer, hint bar ---------- */
    var host = document.createElement('div'); host.id = 'ei-host'; host.setAttribute('aria-hidden', 'true');
    host.innerHTML = '<div class="ei-page"><div class="ei-nav"><span class="ei-sk ei-logo"></span><span class="ei-navlinks"><span class="ei-sk"></span><span class="ei-sk"></span><span class="ei-sk"></span></span><span class="ei-sk ei-menu"></span></div>' +
      '<span class="ei-sk ei-title"></span><span class="ei-sk ei-l1"></span><span class="ei-sk ei-l2"></span>' +
      '<div class="ei-grid"><span class="ei-card"></span><span class="ei-card"></span><span class="ei-card"></span></div><span class="ei-sk ei-l3"></span></div>';
    var dim = document.createElement('div'); dim.id = 'ei-dim';
    var bar = document.createElement('div'); bar.id = 'ei-bar'; bar.setAttribute('role', 'status');
    bar.innerHTML = '<span class="ei-dot"></span><span class="ei-bar-t"></span><button type="button" hidden>Replay exit intent</button>';
    var barT = bar.querySelector('.ei-bar-t'), replayBtn = bar.querySelector('button');
    B.insertBefore(host, B.firstChild); B.appendChild(dim); B.appendChild(bar);

    /* ---------- sheet top (parked in the header) and footer UI (parked after the chips) ---------- */
    var top = document.createElement('div'); top.id = 'ei-top';
    top.innerHTML = '<div class="ei-row"><span class="ei-tags"><span class="ei-badge">FREE REPORT</span><span class="ei-demo">DEMO</span></span><button type="button" id="ei-x" aria-label="Close"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>' +
      '<div class="ei-h"></div><div class="ei-s"></div><div id="ei-sum"></div>';
    var hEl = top.querySelector('.ei-h'), sEl = top.querySelector('.ei-s'), sum = top.querySelector('#ei-sum');
    hEl.textContent = HEAD; sEl.textContent = SUB;
    var still = document.createElement('div'); still.id = 'ei-still'; still.setAttribute('aria-hidden', 'true');
    var after = document.createElement('div'); after.id = 'ei-after';
    after.innerHTML = '<div id="ei-buf-block"><label for="ei-buf">Work email</label><div id="ei-buf-wrap"><input id="ei-buf" type="email" inputmode="email" autocomplete="email" placeholder="you@company.com"></div></div>' +
      '<div id="ei-err" hidden></div><button type="button" id="ei-cta">Send me the report</button>' +
      '<div id="ei-foot"><button type="button" id="ei-no">No thanks</button></div>';
    var buf = after.querySelector('#ei-buf'), err = after.querySelector('#ei-err'), cta = after.querySelector('#ei-cta'), noBtn = after.querySelector('#ei-no');
    function footer() { return document.querySelector('[data-lb-part="window"] > .responsive-container:last-child'); }
    function park() {
      var hd = document.querySelector('[data-lb-part="header"]'); if (hd && top.parentNode !== hd) hd.appendChild(top);
      var f = footer(); if (!f) return;
      var kids = [].slice.call(f.children), brand = kids.filter(function (k) { return k.querySelector('[data-lb-part="branding"]'); })[0] || null;
      var first = kids.filter(function (k) { return k !== still && k !== after && k !== brand; })[0] || null;
      if (after.parentNode !== f || after.nextElementSibling !== brand) f.insertBefore(after, brand);
      if (still.parentNode !== f || still.nextElementSibling !== after) f.insertBefore(still, after);
      if (first && first.nextElementSibling !== still) f.insertBefore(first, still);
    }

    /* ---------- conversation state in arrival order (v4 sorts by timestamp; a fast tap can land above its question) ---------- */
    var seen = {}, arrival = 0;
    function items() {
      var list = document.querySelector('[aria-label="Conversation messages"]'); if (!list) return [];
      var counts = {}, out = [];
      [].forEach.call(list.children, function (w) {
        var m = w.querySelector('[data-lb-part="message"]'); if (!m) return;
        var a = m.getAttribute('data-lb-author'), t = msgText(m); if (!t) return;
        var base = a + '|' + t; counts[base] = (counts[base] || 0) + 1; var key = base + '#' + counts[base];
        if (!(key in seen)) seen[key] = arrival++;
        out.push({ w: w, m: m, a: a, t: t, n: seen[key] });
      });
      out.sort(function (x, y) { return x.n - y.n; });
      return out;
    }
    function readState() {
      var cur = -1, ans = {}, it = items(), lastUser = -1;
      it.forEach(function (x) {
        if (x.a === 'bot') { var i = match(x.t); if (i >= 0) { cur = i; if (i === 0) ans = {}; for (var k2 = i; k2 < Q.length; k2++) delete ans[Q[k2].k]; } }
        else { lastUser = x.n; if (x.t !== BACK && cur >= 0 && Q[cur].step) ans[Q[cur].k] = x.t; }
      });
      it.forEach(function (x) { var old = x.n <= lastUser; if (old !== x.w.hasAttribute('data-ei-old')) { if (old) x.w.setAttribute('data-ei-old', ''); else x.w.removeAttribute('data-ei-old'); } });
      return { cur: cur, ans: ans, items: it };
    }
    function opts() { return [].slice.call(document.querySelectorAll('[data-lb-part="option-button"]')); }
    function inputEl() { return document.querySelector('[data-lb-part="input-field"] > input, [data-lb-part="input-field"] > textarea'); }

    /* ---------- decorate messages: head/sub (copied into the sheet top), step prefix, end-screen kinds, record card ---------- */
    function clone(p, html) {
      var t = p.getAttribute('data-ei-src') || txt(p), n = p.nextElementSibling;
      if (p.getAttribute('data-ei-src') === t && n && n.classList.contains('ei-clone') && n.getAttribute('data-for') === t) return;
      if (n && n.classList.contains('ei-clone')) n.remove();
      var d = document.createElement('div'); d.className = 'ei-clone'; d.setAttribute('data-for', t); d.innerHTML = html;
      p.insertAdjacentElement('afterend', d); p.setAttribute('data-ei-src', t);
    }
    function decorate() {
      document.querySelectorAll('.ei-clone').forEach(function (c) { var p = c.previousElementSibling; if (!p || !p.hasAttribute('data-ei-src')) c.remove(); });
      [].forEach.call(document.querySelectorAll('[data-lb-part="message"][data-lb-author="bot"]'), function (m) {
        var p = m.querySelector('[data-lb-part="message-text"]'); if (!p) return; var t = p.getAttribute('data-ei-src') || txt(p); if (!t) return;
        var tn = norm(t), kind = '', i = match(t);
        if (tn.indexOf('Leaving already?') === 0) { kind = 'head'; if (hEl.textContent !== t) hEl.textContent = t; }
        else if (m.closest('[aria-label="Conversation messages"] > div') && tn.indexOf('Three quick questions') > 0) { kind = 'sub'; if (sEl.textContent !== t) sEl.textContent = t; }
        else if (i >= 0 && Q[i].step) { var pre = Q[i].step + ' of 3 · '; if (p.getAttribute('data-ei-step') !== pre) p.setAttribute('data-ei-step', pre); }
        else if (i >= 0 && Q[i].k === 'retry') kind = 'retry';
        else if (i >= 0 && Q[i].end) kind = 'lead';
        else if (tn.indexOf('Sent to the Quillmarsh team') === 0) kind = 'record';
        else if (tn.indexOf('Demo:') === 0) kind = 'fine';
        if ((m.getAttribute('data-ei-kind') || '') !== kind) { if (kind) m.setAttribute('data-ei-kind', kind); else m.removeAttribute('data-ei-kind'); }
        if (kind === 'record') {
          var ps = p.querySelectorAll('p'), L = ps.length > 1 ? [].map.call(ps, function (x) { return txt(x); }) : t.split('\n');
          var h = '<div class="ei-record"><div class="ei-r-t">' + esc(L[0]) + '</div>';
          for (var j = 1; j < L.length; j++) { var c = L[j].indexOf(': '); if (c > 0) h += '<div class="ei-r-row"><span class="ei-r-k">' + esc(L[j].slice(0, c)) + '</span><span class="ei-r-v">' + esc(L[j].slice(c + 2)) + '</span></div>'; }
          clone(p, h + '</div>');
        }
      });
    }

    /* ---------- open / close / trigger ---------- */
    var openedBy = null, opened = false, armed = false, armT = null, autoCloseT = null, dismissedEnd = false;
    function setBar(msg, replay) { barT.textContent = msg; replayBtn.hidden = !replay; }
    function open(by) {
      if (opened) return; opened = true; openedBy = by || 'timer'; armed = false; clearTimeout(armT); B.classList.add('ei-open');
          }
    function close(msg) {
      opened = false; clearTimeout(autoCloseT); B.classList.remove('ei-open'); B.classList.remove('ei-leaving');
      setBar(msg || 'Popup closed: back to the page.', true);
      try { replayBtn.focus({ preventScroll: true }); } catch (e) {}
    }
    function arm(first) {
      armed = true; clearTimeout(armT);
      if (phone) { setBar(first ? 'Demo page · on a phone the offer slides up after 2 s' : 'The offer slides up again in a moment', false); armT = setTimeout(open, first ? 2000 : 1200); }
      else { setBar(first ? 'Demo page · move your cursor off the top of the page to trigger exit intent' : 'Now move your cursor off the top of the page', false); armT = setTimeout(open, first ? 8000 : 5000); }
    }
    document.addEventListener('mouseout', function (e) { if (!armed || opened) return; if (!e.relatedTarget && e.clientY <= 8) open('exit-intent'); });
    top.querySelector('#ei-x').addEventListener('click', function () { close(); });
    dim.addEventListener('click', function () { close(); });
    replayBtn.addEventListener('click', function () {
      var s = readState(); if (s.cur >= 0 && Q[s.cur].end) { var b = opts()[0]; if (b) { buf.value = ''; realClick(b); } }
      dismissedEnd = false; arm(false);
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && opened) { e.preventDefault(); close(); } }, true);

    /* ---------- sending ---------- */
    var pass = false;
    function realClick(b) { pass = true; try { b.click(); } finally { pass = false; } }
    var leaveFrom = null, leaveT = null, leaveChk = null, leaveArr = 0;
    function leaving(on, from) {
      clearTimeout(leaveT); clearTimeout(leaveChk);
      if (!on) { B.classList.remove('ei-leaving'); B.classList.remove('ei-still-on'); leaveFrom = null;
        document.querySelectorAll('[data-ei-keep]').forEach(function (n) { n.removeAttribute('data-ei-keep'); }); return; }
      var w = document.querySelector('[data-lb-part="window"]'); if (w) B.style.setProperty('--ei-hold', Math.round(w.getBoundingClientRect().height) + 'px');
      readState().items.forEach(function (x) { if (!x.w.hasAttribute('data-ei-old') && x.a === 'bot' && !x.m.hasAttribute('data-ei-kind')) x.w.setAttribute('data-ei-keep', ''); });
      leaveFrom = from; leaveArr = arrival; B.classList.add('ei-leaving');
      leaveT = setTimeout(function () { leaving(false); }, 4000);
      leaveChk = setTimeout(function () { var i = inputEl(), s = readState(); if (i && s.cur === leaveFrom && arrival === leaveArr) leaving(false); }, 400);
    }
    function snapshotChips(picked) {
      var list = document.querySelector('[data-lb-part="options-list"]'); still.innerHTML = '';
      if (!list) return;
      [].forEach.call(list.children, function (b) { if (b.hasAttribute('data-ei-no')) return; var d = document.createElement('div'); d.className = 'ei-chip';
        d.innerHTML = '<span>' + esc(txt(b)) + '</span>'; if (b === picked) d.setAttribute('data-ei-picked', ''); still.appendChild(d); });
      B.classList.add('ei-still-on');
    }
    var nudgeT = null;
    function nudge(msg) { B.classList.remove('ei-nudge'); void B.offsetWidth; B.classList.add('ei-nudge'); if (msg) { err.textContent = msg; err.hidden = false; }
      clearTimeout(nudgeT); nudgeT = setTimeout(function () { B.classList.remove('ei-nudge'); }, 1600); }
    function setNative(inp, v) {
      try { var d = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value'); d.set.call(inp, v); } catch (e) { inp.value = v; }
      inp.dispatchEvent(new Event('input', { bubbles: true }));
    }
    function submitNative(inp) {
      var sb = document.querySelector('[data-lb-part="input-submit"]');
      setTimeout(function () { if (sb && !sb.disabled) sb.click(); else inp.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true })); }, 30);
    }
    function sendEmail(forceText) {
      var s = readState(), q = Q[s.cur] || {}, inp = inputEl(); if (!q.text || !inp) return false;
      var v = forceText != null ? forceText : (inp.value || '').trim();
      if (forceText == null) {
        if (!v) { nudge('Enter your work email to get the report.'); try { inp.focus(); } catch (e) {} return true; }
        if (!EMAIL_RE.test(v)) { nudge("That doesn't look like a work email. Try you@company.com."); try { inp.focus(); } catch (e) {} return true; }
      }
      err.hidden = true; if (inp.value !== v) setNative(inp, v); leaving(true, s.cur); submitNative(inp); return true;
    }
    function send() {
      cta.classList.add('ei-pressed'); setTimeout(function () { cta.classList.remove('ei-pressed'); }, 140);
      var s = readState(); if (s.cur < 0) return; var q = Q[s.cur];
      if (q.text) { sendEmail(null); return; }
      if (q.step) { var left = 4 - q.step; nudge(left === 1 ? 'One quick question left: pick an answer above.' : 'Answer the ' + left + ' quick questions above first.'); }
    }
    cta.addEventListener('click', send);
    noBtn.addEventListener('click', function () {
      var s = readState(); if (s.cur < 0) { close('No problem. Popup closed.'); return; } var q = Q[s.cur];
      if (q.step) { var b = opts().filter(function (x) { return x.hasAttribute('data-ei-no'); })[0]; if (b) { leaving(true, s.cur); realClick(b); } return; }
      if (q.text) { sendEmail('No thanks'); return; }
      close();
    });
    buf.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); send(); } });
    buf.addEventListener('input', function () { err.hidden = true; });
    /* native email field: Enter checks the address first (the flow checks it again) */
    document.addEventListener('keydown', function (e) {
      var t = e.target; if (e.key !== 'Enter' || !t || t.tagName !== 'INPUT' || !t.closest('[data-lb-part="input-field"]')) return;
      e.preventDefault(); e.stopPropagation(); sendEmail(null);
    }, true);
    document.addEventListener('input', function (e) { if (e.target && e.target.closest && e.target.closest('[data-lb-part="input-field"]')) { err.hidden = true; buf.value = e.target.value; } }, true);
    /* native Back: re-asks the previous question; drop the error line and any still copy, the flow's re-ask repaints the card */
    document.addEventListener('click', function (e) { var b = e.target && e.target.closest && e.target.closest('button[data-slot="button"][data-size="sm"][data-variant="ghost"]');
      if (!b || pass) return; err.hidden = true; leaving(false); B.classList.add('ei-back'); setTimeout(function () { B.classList.remove('ei-back'); }, 900); }, true);
    /* chips: selected (black) on the tap itself, still copy while the next question loads */
    document.addEventListener('click', function (e) {
      if (pass) return; var b = e.target && e.target.closest && e.target.closest('[data-lb-part="option-button"]'); if (!b) return;
      var s = readState(); if (s.cur < 0 || !Q[s.cur].step) return;
      b.setAttribute('data-ei-picked', ''); err.hidden = true; snapshotChips(b); leaving(true, s.cur);
    }, true);

    /* ---------- render loop ---------- */
    var last = '', focusedFor = null, filledFor = null;
    function render() {
      park(); decorate();
      var s = readState(), o = opts(), inp = inputEl(), q = s.cur >= 0 ? Q[s.cur] : null, screen = q ? q.k : '';
      if (leaveFrom !== null && s.cur !== leaveFrom && (o.length || inp)) leaving(false);
      if (q && q.k === 'q1' && buf.value) buf.value = ''; /* 2026-09-28: a new start (or Start over) forgets the earlier email, so the email step is not pre-filled */
      o.forEach(function (b) { var no = txt(b) === 'No thanks'; if (no !== b.hasAttribute('data-ei-no')) { if (no) b.setAttribute('data-ei-no', ''); else b.removeAttribute('data-ei-no'); } });
      if (B.getAttribute('data-ei-screen') !== screen && !(B.classList.contains('ei-leaving') && s.cur === leaveFrom)) B.setAttribute('data-ei-screen', screen);
      if (q && q.text && inp) {
        if (inp.getAttribute('placeholder') !== 'you@company.com') { inp.setAttribute('placeholder', 'you@company.com'); inp.setAttribute('inputmode', 'email'); inp.setAttribute('autocomplete', 'email'); inp.setAttribute('aria-label', 'Work email'); }
        if (filledFor !== s.cur + ':' + arrival && !inp.value && buf.value.trim() && (q.k === 'email' || q.k === 'retry')) { filledFor = s.cur + ':' + arrival; setNative(inp, buf.value.trim()); }
        if (focusedFor !== s.cur && opened && !B.classList.contains('ei-leaving')) { focusedFor = s.cur; try { inp.focus({ preventScroll: true }); } catch (e) {} }
      } else focusedFor = null;
      if (q && q.k === 'retry' && !B.classList.contains('ei-leaving')) { var rt = 'That doesn\'t look like a work email. Try you@company.com.'; if (err.hidden || err.textContent !== rt) { err.textContent = rt; err.hidden = false; } }
      if (q && q.k === 'email') { var ks = ['q1', 'q2', 'q3'], got = ks.filter(function (k) { return s.ans[k]; });
        var html = '<span class="ei-sum-k">✓ 3 of 3</span>' + '<span class="ei-sum-v">' + got.map(function (k) { return esc(s.ans[k]); }).join(' · ') + '</span>';
        if (sum.getAttribute('data-h') !== html) { sum.innerHTML = html; sum.setAttribute('data-h', html); } }
      /* the decline screen closes the sheet by itself once it has been read */
      if (q && q.k === 'decline' && opened && !dismissedEnd && !autoCloseT) { autoCloseT = setTimeout(function () { autoCloseT = null; dismissedEnd = true; if (opened) close('No thanks: the visitor keeps reading.'); }, 2200); }
      if (q && q.k !== 'decline') { clearTimeout(autoCloseT); autoCloseT = null; }
      var sig = [screen, o.length, !!inp, opened].join('|'); if (sig === last) return; last = sig;
    }
    park(); render(); arm(true);
    setInterval(function () { try { render(); } catch (e) { window.__lbFootErr = String(e); } }, 300);
    var busy = false;
    new MutationObserver(function () { if (busy) return; busy = true; try { render(); } catch (e) { window.__lbFootErr = String(e); } busy = false; }).observe(document.body, { childList: true, subtree: true, characterData: true });
    window.__mkState = function () { var s = readState(); return { openedBy: openedBy, screen: s.cur >= 0 ? Q[s.cur].k : null, ans: s.ans, open: opened, phone: phone, bar: barT.textContent, err: err.hidden ? null : err.textContent, buf: buf.value, leaving: B.classList.contains('ei-leaving') }; };
  } catch (err) {
    window.__lbFootErr = String(err);
    try { document.body.classList.remove('ei-js'); ['ei-host', 'ei-dim', 'ei-bar', 'ei-top', 'ei-after', 'ei-still'].forEach(function (id) { var n = document.getElementById(id); if (n) n.remove(); }); } catch (e) {}
  }
})();
