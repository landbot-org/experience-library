/* lb-js: kettlestow-order-tracking 1 */
/* [mockup 17] Order tracking · Kettlestow (invented) — DOM-only skin. Draws the map tile + "Order #" pill in the header, turns the flow's
   tracking message into ETA + 4-step timeline, marks screens on <body> (data-ot-screen) for the CSS, shows one screen at a time
   (first-seen arrival order), keeps the pressed buttons on screen until the bot answers, presses the splash button once on load,
   keys 1-4 pick an option, "Skip" fills the optional note, native Back holds the screen until the re-asked question arrives. Reads textContent only; guarded observer. No network, no storage. */
(function () {
  try {
    if (window.__otRan) return; window.__otRan = true; window.__lbFootRan = true;
    var B = document.body; B.classList.add('ot-js', 'ot-boot');
    var SCREENS = [
      ['splash', /^Kettlestow$/], ['track', /^Order #/], ['nb1', /^Who should/], ['nb2', /^And their door/], ['nb3', /^Leave it with/],
      ['tm', /^Pick a window/], ['hp1', /^Sorry about that/], ['hp2', /^Add a line/],
      ['done', /^(All set|Moved to tomorrow|Passed to the team)$/]];
    var LINK = /^(Something's wrong|Keep today's delivery|Back to my order|Change neighbour)/;
    function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
    function textOf(p) { var ps = p.querySelectorAll('p'); var t = ps.length ? [].map.call(ps, function (x) { return x.textContent; }).join('\n') : p.textContent; return String(t || '').replace(/\n\s*\n+/g, '\n').trim(); }
    function msgText(m) { var p = m.querySelector('[data-lb-part="message-text"]'); return p ? (p.getAttribute('data-ot-src') || textOf(p)) : ''; }
    function lines(t) { return t.split('\n').map(function (s) { return s.trim(); }).filter(Boolean); }
    function kind(t) { var h = lines(t)[0] || ''; for (var i = 0; i < SCREENS.length; i++) if (SCREENS[i][1].test(h)) return SCREENS[i][0]; return ''; }
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
      out.sort(function (x, y) { return x.n - y.n; }); return out;
    }
    function readState() {
      var it = items(), users = it.filter(function (x) { return x.a === 'user'; });
      var lastUser = users.length ? users[users.length - 1].n : -1;
      var waiting = !it.some(function (x) { return x.a === 'bot' && x.n > lastUser; }) && users.length > 0;
      var cut = waiting ? (users.length > 1 ? users[users.length - 2].n : -1) : lastUser;
      var vis = [];
      it.forEach(function (x) {
        var old = x.a === 'user' ? true : (x.n <= cut || (waiting && x.n > lastUser));
        if (old !== x.w.hasAttribute('data-ot-old')) { if (old) x.w.setAttribute('data-ot-old', ''); else x.w.removeAttribute('data-ot-old'); }
        if (!old && x.a === 'bot') vis.push(x);
      });
      var screen = ''; vis.forEach(function (x) { var k = kind(x.t); if (k && !screen) screen = k; });
      return { screen: screen, vis: vis, waiting: waiting };
    }
    /* ---- header: map tile + order pill ---- */
    var top = document.createElement('div'); top.id = 'ot-top'; top.setAttribute('aria-hidden', 'true');
    top.innerHTML = '<div class="ot-map"><svg viewBox="0 0 390 210" width="390" height="210">' +
      '<path d="M60 170 C 120 170, 110 90, 180 90 S 260 50, 320 40" fill="none" stroke="#C2410C" stroke-width="4" stroke-dasharray="2 8" stroke-linecap="round"/>' +
      '<circle cx="60" cy="170" r="9" fill="#221A14"/><circle cx="320" cy="40" r="12" fill="#C2410C"/><circle cx="320" cy="40" r="5" fill="#FFFFFF"/>' +
      '<g class="ot-van"><circle cx="180" cy="90" r="16" fill="#FFFFFF" stroke="#C2410C" stroke-width="3"/><path d="M172 92h10v-6h4l3 4v2h-17z" fill="#C2410C"/></g></svg>' +
      '<div class="ot-pill">Order</div></div>';
    var pill = top.querySelector('.ot-pill');
    function park() {
      var hc = document.querySelector('[data-lb-part="header"] > .responsive-container');
      if (hc && top.parentNode !== hc) hc.appendChild(top);
    }
    /* ---- clones ---- */
    function clone(p, html) {
      var t = p.getAttribute('data-ot-src') || textOf(p), n = p.nextElementSibling, key = t + '|' + html.length;
      if (p.getAttribute('data-ot-src') === t && n && n.classList.contains('ot-clone') && n.getAttribute('data-for') === key) return;
      if (n && n.classList.contains('ot-clone')) n.remove();
      var d = document.createElement('div'); d.className = 'ot-clone'; d.setAttribute('data-for', key); d.innerHTML = html;
      p.insertAdjacentElement('afterend', d); p.setAttribute('data-ot-src', t);
    }
    var CHECK = '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5L20 7"/></svg>';
    function trackHtml(L) {
      var steps = L.slice(3, 7), tag = L[7] || '';
      var h = '<div class="ot-eta"><span class="ot-k">' + esc(L[1] || 'Arriving') + '</span><span class="ot-when">' + esc(L[2] || '') + '</span></div><div class="ot-tl">';
      steps.forEach(function (s, i) {
        var st = i < 2 ? 'done' : (i === 2 ? 'now' : 'todo');
        h += '<div class="ot-step" data-st="' + st + '"><span class="ot-dot">' + (st === 'done' ? CHECK : '') + '</span><span class="ot-lab">' + esc(s) + '</span></div>';
      });
      h += '</div>';
      if (tag) h += '<div class="ot-tag">' + esc(tag) + '</div>';
      return h;
    }
    function decorate(st) {
      document.querySelectorAll('.ot-clone').forEach(function (c) { var p = c.previousElementSibling; if (!p || !p.hasAttribute('data-ot-src')) c.remove(); });
      st.vis.forEach(function (x) {
        var p = x.m.querySelector('[data-lb-part="message-text"]'); if (!p) return;
        var L = lines(x.t), k = kind(x.t), html = '', role = 'bubble';
        if (k === 'track') { role = 'track'; html = trackHtml(L); var o = L[0].replace(/^Order\s*/, 'Order '); if (pill.textContent !== o) pill.textContent = o; }
        else if (k === 'done') { role = 'done'; html = '<div class="ot-done"><span class="ot-ok">' + CHECK + '</span><div class="ot-dt">' + esc(L[0]) + '</div><div class="ot-ds">' + esc(L.slice(1).join(' ')) + '</div></div>'; }
        else if (k === 'splash') { role = 'splash'; html = '<div class="ot-splash"><div class="ot-dt">' + esc(L[0]) + '</div><div class="ot-ds">' + esc(L.slice(1).join(' ')) + '</div></div>'; }
        else if (/would receive$/.test(L[0] || '')) {
          role = 'rec'; html = '<div class="ot-rec"><div class="ot-rt">' + esc(L[0]) + '</div>';
          L.slice(1).forEach(function (l) { var c = l.indexOf(': '); if (c > 0) html += '<div class="ot-r"><span>' + esc(l.slice(0, c)) + '</span><span>' + esc(l.slice(c + 2)) + '</span></div>'; });
          html += '</div>';
        }
        else if (/^Demo only/.test(L[0] || '')) { role = 'fine'; html = '<div class="ot-fine">' + esc(x.t) + '</div>'; }
        else if (L.length > 1) { html = '<div class="ot-b1">' + esc(L[0]) + '</div><div class="ot-b2">' + esc(L.slice(1).join(' ')) + '</div>'; }
        if (x.m.getAttribute('data-ot-role') !== role) x.m.setAttribute('data-ot-role', role);
        if (html) clone(p, html);
      });
    }
    /* ---- options: roles, pressed state, ghost until the bot answers ---- */
    function footer() { return document.querySelector('[data-lb-part="window"] > .responsive-container:last-child'); }
    function opts() { return [].slice.call(document.querySelectorAll('[data-lb-part="option-button"]')).filter(function (b) { return !b.closest('#ot-ghost'); }); }
    function slotOf(el) { var f = footer(), s = el; while (s && s.parentNode !== f) s = s.parentNode; return s; }
    var ghost = null, ghostT = null, waitingSince = 0, backAt = 0, backMark = -1;
    function makeGhost(el) {
      var s = slotOf(el), f = footer(); if (!s || !f) return;
      if (ghost) ghost.remove();
      ghost = s.cloneNode(true); ghost.id = 'ot-ghost'; ghost.setAttribute('aria-hidden', 'true'); ghost.hidden = true;
      [].forEach.call(ghost.querySelectorAll('[data-lb-part]'), function (n) { n.setAttribute('data-ot-part', n.getAttribute('data-lb-part')); n.removeAttribute('data-lb-part'); });
      [].forEach.call(ghost.querySelectorAll('button, input, textarea'), function (n) { n.tabIndex = -1; n.setAttribute('disabled', ''); });
      var gi = ghost.querySelector('input'), ri = s.querySelector('input'); if (gi && ri) gi.setAttribute('value', ri.value);
      f.insertBefore(ghost, s); clearTimeout(ghostT); ghostT = setTimeout(dropGhost, 6000);
      B.classList.add('ot-leaving');
    }
    function dropGhost() { if (ghost) { ghost.remove(); ghost = null; } B.classList.remove('ot-leaving'); }
    var pass = false; function realClick(b) { pass = true; try { b.click(); } finally { pass = false; } }
    document.addEventListener('click', function (e) {
      if (pass) return; var t = e.target; if (!t || !t.closest) return;
      var b = t.closest('[data-lb-part="option-button"]');
      if (b && !b.closest('#ot-ghost')) { if (b.hasAttribute('data-ot-pressed')) { e.preventDefault(); e.stopPropagation(); return; } b.setAttribute('data-ot-pressed', ''); makeGhost(b); return; }
      var bk = t.closest('button[data-slot="button"][data-size="sm"][data-variant="ghost"]');
      if (bk && !bk.closest('#ot-ghost')) { var fs = document.querySelector('[data-lb-part="options-list"]') || document.querySelector('[data-lb-part="text-input"]'); backAt = Date.now(); backMark = arrival; if (fs) makeGhost(fs); return; }
      var sub = t.closest('[data-lb-part="input-submit"], [data-lb-part="text-input"] button');
      if (sub) { var inp = document.querySelector('[data-lb-part="text-input"] input'); if (inp && inp.value.trim()) makeGhost(inp); }
    }, true);
    document.addEventListener('keydown', function (e) {
      if (e.metaKey || e.ctrlKey || e.altKey) return; var t = e.target;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) {
        if (e.key === 'Enter' && t.closest('[data-lb-part="text-input"]') && t.value.trim()) makeGhost(t);
        return;
      }
      var n = parseInt(e.key, 10), o = opts();
      if (n >= 1 && n <= o.length && o.length <= 4) { e.preventDefault(); var b = o[n - 1]; if (!b.hasAttribute('data-ot-pressed')) { b.setAttribute('data-ot-pressed', ''); makeGhost(b); setTimeout(function () { realClick(b); }, 0); } }
    }, true);
    /* ---- "Skip" for the optional note ---- */
    var skip = document.createElement('button'); skip.type = 'button'; skip.id = 'ot-skip'; skip.textContent = 'Skip, send without a note'; skip.hidden = true;
    skip.addEventListener('click', function () {
      var inp = document.querySelector('[data-lb-part="text-input"] input'); if (!inp) return;
      var setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; setter.call(inp, 'skip');
      inp.dispatchEvent(new Event('input', { bubbles: true }));
      var sb = document.querySelector('[data-lb-part="input-submit"]') || document.querySelector('[data-lb-part="text-input"] button');
      makeGhost(inp);
      setTimeout(function () { if (sb) realClick(sb); else inp.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true })); }, 30);
    });
    function parkSkip() { var f = footer(); if (!f) return; var brand = [].filter.call(f.children, function (k) { return k.querySelector('[data-lb-part="branding"]'); })[0] || null; if (skip.parentNode !== f || skip.nextElementSibling !== brand) f.insertBefore(skip, brand); }
    /* ---- boot: press the splash button once, show a skeleton until the tracking screen arrives ---- */
    var booted = false, bootPressed = false, bootEnd = Date.now() + 9000;
    function endBoot() { if (!booted) { booted = true; B.classList.remove('ot-boot'); } }
    var last = '';
    function render() {
      park(); parkSkip();
      var st = readState(); decorate(st);
      var o = opts(), scr = st.screen;
      if (!booted) {
        if (scr === 'track' && !st.waiting) endBoot();
        else if (Date.now() > bootEnd) endBoot();
        else if (scr === 'splash' && !bootPressed && o.length === 1) { bootPressed = true; var sb = o[0]; setTimeout(function () { realClick(sb); }, 250); }
      }
      if (backMark >= 0) { var nb = items().some(function (x) { return x.a === 'bot' && x.n >= backMark; }); if (nb && !st.waiting) backMark = -1; else if (Date.now() - backAt > 8000) backMark = -1; }
      if (!st.waiting && ghost && backMark < 0) { var fresh = o.some(function (b) { return !b.hasAttribute('data-ot-pressed'); }) || document.querySelector('[data-lb-part="text-input"] input') || scr === 'done'; if (fresh) dropGhost(); }
      if (ghost) { var gh = !!(o.length && !o.every(function (b) { return b.hasAttribute('data-ot-pressed'); })) || !!(document.querySelector('[data-lb-part="text-input"] input') && !st.waiting); if (ghost.hidden !== gh) ghost.hidden = gh; }
      if (!st.waiting && !ghost) o.forEach(function (b) { if (b.hasAttribute('data-ot-pressed')) b.removeAttribute('data-ot-pressed'); });
      o.forEach(function (b) {
        var tx = (b.textContent || '').trim(), role = LINK.test(tx) && !(scr === 'done') ? 'link' : (/^Confirm$/.test(tx) ? 'primary' : 'outline');
        if (b.getAttribute('data-ot-role') !== role) b.setAttribute('data-ot-role', role);
      });
      var inp = document.querySelector('[data-lb-part="text-input"] input'), ph = { nb1: 'Their first name', nb2: 'Door or flat, e.g. 14', hp2: 'What went wrong? (optional)' }[scr];
      if (inp && ph && !st.waiting && inp.getAttribute('placeholder') !== ph) inp.setAttribute('placeholder', ph);
      var sig = [scr, st.waiting, o.length, booted].join('|'); if (sig === last) return; last = sig;
      if (scr && B.getAttribute('data-ot-screen') !== scr) B.setAttribute('data-ot-screen', scr);
      skip.hidden = !(scr === 'hp2' && !st.waiting);
      var sa = document.querySelector('[aria-label="Scrollable conversation area"]'); if (sa && !st.waiting) sa.scrollTop = 0;
    }
    render(); setInterval(function () { try { render(); } catch (e) { window.__lbFootErr = String(e); } }, 250);
    var winT = 0, winN = 0;
    var mo = new MutationObserver(function () { try { var now = Date.now(); if (now - winT > 1000) { winT = now; winN = 0; } if (++winN > 300) { mo.disconnect(); window.__otLoop = { n: winN }; return; } render(); } catch (e) { window.__lbFootErr = String(e); } });
    mo.observe(B, { childList: true, subtree: true, characterData: true });
    window.__mkState = function () { var st = readState(); return { back: !!document.querySelector('button[data-slot="button"][data-size="sm"][data-variant="ghost"]:not(#ot-ghost *)'), screen: st.screen, waiting: st.waiting, boot: !booted, ghost: !!ghost && !ghost.hidden, opts: opts().map(function (b) { return (b.textContent || '').trim() + ':' + b.getAttribute('data-ot-role'); }), pill: pill.textContent }; };
  } catch (err) {
    window.__lbFootErr = String(err); document.body.classList.remove('ot-js', 'ot-boot');
    document.querySelectorAll('[data-ot-src],[data-ot-old]').forEach(function (p) { p.removeAttribute('data-ot-src'); p.removeAttribute('data-ot-old'); });
    document.querySelectorAll('.ot-clone,#ot-top,#ot-ghost,#ot-skip').forEach(function (n) { n.remove(); });
  }
})();
