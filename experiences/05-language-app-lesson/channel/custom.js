/* GOAL 2 · Kamaé FOVI micro-lesson · channel Custom JS for v4 3.1.0 (same file on the FR and EN channels).
   Draws the top bar (X, progress, three hearts) and the feedback banner, classes the DOM into lesson screens, strips the ✓/✕
   markers, adds keyboard shortcuts 1–4 / Enter. It never writes data into the flow: the summary's score, XP and hearts are flow
   variables (formulas blocks); the bar's progress and hearts are counted from the DOM (answers and ✕ banners since the last start).
   lb-js: lesson-back 1 (2026-09-26) — native Back is proxied by a "‹ Back / ‹ Retour" button in the top bar; each "Back" user message
   undoes the last answer on screen (answer, its banner and the Back bubble are hidden; progress and hearts count only kept answers). */
(function(){
  try {
    if (window.__lbFootRan) return; window.__lbFootRan = true;
    var TOTAL = 6;
    var CTA = { start:['Commencer la leçon','Start lesson'], cont:['CONTINUER','CONTINUE'], retry:['Refaire la leçon','Retake lesson'], next:['Leçon suivante','Next lesson'] };
    var ALLCTA = CTA.start.concat(CTA.cont, CTA.retry, CTA.next);
    var TX = { fr:{ ok:'Bien joué !', ko:'Pas tout à fait', xp:'+10 XP', cont:'CONTINUER', hello:'Bonjour {p}, on commence ?', done:/^(Leçon terminée|Plus de cœurs)/, over:/^Plus de cœurs/ },
               en:{ ok:'Nicely done!', ko:'Not quite', xp:'+10 XP', cont:'CONTINUE', hello:'Hello {p}, shall we start?', done:/^(Lesson complete|Out of hearts)/, over:/^Out of hearts/ } };
    var q = new URLSearchParams(document.URL.split('#')[0].split('?')[1] || ''); var prenom = (q.get('prenom') || '').trim().slice(0, 40);
    var lang = null;
    var esc = function(s){ return String(s).replace(/[&<>"]/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); };
    var setText = function(el, s){ if (el.textContent !== s) el.textContent = s; };
    var HEART = '<svg class="lb-heart" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7-4.5-9.5-9A5.5 5.5 0 0 1 12 6a5.5 5.5 0 0 1 9.5 6c-2.5 4.5-9.5 9-9.5 9z"/></svg>';
    var top = document.createElement('div'); top.id = 'lb-top';
    top.innerHTML = '<div class="lb-in"><span class="lb-x" aria-hidden="true"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></span><button type="button" class="lb-back off" tabindex="-1" aria-hidden="true"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg><span class="lb-back-t">Back</span></button><div class="lb-track" role="progressbar" aria-valuemin="0" aria-valuemax="6" aria-valuenow="0"><div class="lb-fill"></div></div><span class="lb-hearts" aria-label="hearts">' + HEART + HEART + HEART + '</span><button type="button" class="lb-sound" aria-label="Son"><svg class="on" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11"/></svg><svg class="off" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9v6h4l5 4V5L8 9z"/><path d="M17 9l5 6M22 9l-5 6"/></svg></button></div>';
    var ban = document.createElement('div'); ban.id = 'lb-banner'; ban.setAttribute('role', 'status');
    ban.innerHTML = '<div class="lb-in"><div class="lb-head"><div class="lb-icon"></div><div><div class="lb-title"></div><div class="lb-body"></div><div class="lb-xp"></div></div></div><button type="button" class="lb-cta"></button></div>';
    var endBtn = document.createElement('button'); endBtn.type = 'button'; endBtn.id = 'lb-restart'; endBtn.addEventListener('click', function(){ history.go(0); });
    var veil = document.createElement('div'); veil.id = 'lb-veil'; /* transparent overlay: for 700 ms after an accepted tap a second touch lands here, outside the widget */
    document.body.appendChild(top); document.body.appendChild(ban); document.body.appendChild(endBtn); document.body.appendChild(veil);
    top.querySelector('.lb-x').addEventListener('click', function(){ history.go(0); });
    var fill = top.querySelector('.lb-fill'), track = top.querySelector('.lb-track'), hearts = [].slice.call(top.querySelectorAll('.lb-heart'));
    /* BACK. The widget's own Back (ghost button under the last bot message, hover-only, no data-lb-part) stays in the DOM but out of view;
       this top-bar button clicks it. One Back per screen: locked until the re-asked options arrive (4 s at most), and not within 700 ms of an accepted tap. */
    var backBtn = top.querySelector('.lb-back'), backT = top.querySelector('.lb-back-t'), backLock = 0, backSig = null;
    var BACKTXT = /^(Back|Retour)$/;
    var nativeBack = function(){ return document.querySelector('[data-lb-part="window"] > .grow button[data-slot="button"][data-size="sm"][data-variant="ghost"]:not([data-lb-part])'); };
    backBtn.addEventListener('click', function(){ var nb = nativeBack(), now = Date.now();
      if (!nb || backBtn.classList.contains('off') || now < backLock || now < shieldUntil) return;
      backLock = now + 4000; backSig = armSig; accepted = null; window.__lbGuard.back++; backBtn.classList.add('busy'); nb.click(); });
    var bTitle = ban.querySelector('.lb-title'), bBody = ban.querySelector('.lb-body'), bXp = ban.querySelector('.lb-xp'), bIcon = ban.querySelector('.lb-icon'), bCta = ban.querySelector('.lb-cta');
    var ICON_OK = '<svg viewBox="0 0 24 24" fill="none" stroke="#58cc02" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12l5 5L20 7"/></svg>';
    var ICON_KO = '<svg viewBox="0 0 24 24" fill="none" stroke="#ff4b4b" stroke-width="3.5" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
    var realCta = function(){ var b = document.querySelectorAll('[data-lb-part="option-button"]'); return b.length === 1 ? b[0] : null; };
    bCta.addEventListener('click', function(){ var b = realCta(); if (b) b.click(); });
    var lastOptions = [], state = { screen:'welcome' }, lastSig = '';
    /* SOUNDS: short synthesised tones (Web Audio), nothing sampled. Browsers allow audio only after a user gesture: the first tap is the start CTA. */
    var muted = false; try { muted = localStorage.getItem('lbLessonMuted') === '1'; } catch (e) {}
    var actx = null; window.__lbSfx = { triggered: { ok:0, ko:0, win:0, over:0 }, played: { ok:0, ko:0, win:0, over:0 }, muted: muted };
    function ac(){ if (!actx) { try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } } if (actx && actx.state === 'suspended') { try { actx.resume(); } catch (e) {} } return actx; }
    function tone(freq, t0, dur, type, vol){ var c = ac(); if (!c) return; var o = c.createOscillator(), g = c.createGain(); o.type = type || 'sine'; o.frequency.value = freq;
      var t = c.currentTime + t0; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol || 0.18, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + dur + 0.05); }
    var SFX = { ok: function(){ tone(523, 0, 0.16, 'triangle'); tone(784, 0.11, 0.26, 'triangle'); },
                ko: function(){ tone(196, 0, 0.2, 'square', 0.09); tone(147, 0.17, 0.32, 'square', 0.09); },
                win: function(){ [523, 659, 784, 1047].forEach(function(f, i){ tone(f, i * 0.11, 0.24, 'triangle'); }); tone(1047, 0.5, 0.5, 'triangle', 0.14); },
                over: function(){ [392, 330, 262].forEach(function(f, i){ tone(f, i * 0.22, 0.34, 'sine', 0.16); }); } };
    var sfxDone = {}; /* keyed by arrival number: the widget re-creates the last wrapper when the next message lands, so an element flag would fire twice */
    function play(k){ window.__lbSfx.triggered[k]++; if (muted) return; try { SFX[k](); window.__lbSfx.played[k]++; } catch (e) {} }
    var sndBtn = top.querySelector('.lb-sound'); sndBtn.classList.toggle('off', muted);
    sndBtn.addEventListener('click', function(){ muted = !muted; sndBtn.classList.toggle('off', muted); window.__lbSfx.muted = muted; try { localStorage.setItem('lbLessonMuted', muted ? '1' : '0'); } catch (e) {} if (!muted) play('ok'); });
    document.addEventListener('pointerdown', function(){ ac(); }, true); document.addEventListener('keydown', function(){ ac(); }, true);
    function wrappers(){ return [].slice.call(document.querySelectorAll('[data-lb-part="window"] > .grow > .responsive-container > div > div')); }
    var seqByKey = {}, seqNext = 1; /* the widget can insert a user message BEFORE the bot messages it answers (VERIFIED 2026-09-17), so order by first-seen time, not DOM order */
    function seqOf(author, text, occ){ var k = (author || '?') + '|' + String(text).replace(/\s+/g, '') + '|' + occ; /* whitespace-insensitive: fmt() rewrites the welcome/summary text without newlines */ if (!seqByKey[k]) seqByKey[k] = seqNext++; return seqByKey[k]; }
    function fmt(p, kind){ /* welcome + summary typography: title line, score line, meta line — applied once, static messages only */
      if (!p || p.dataset.lbFmt) return; var lines = p.textContent.split('\n'); if (lines.length < 2) return;
      var html = '', rest = [], meta = '';
      lines.forEach(function(l, i){ var t = l.trim();
        if (i === 0) { html += '<span class="lb-title">' + esc(t) + '</span>'; return; }
        if (kind === 'welcome' && i === lines.length - 1) { meta = '<span class="lb-meta">' + esc(t) + '</span>'; return; }
        if (kind === 'summary' && i === 1) { html += '<span class="lb-score">' + esc(t) + '</span>'; return; }
        if (kind === 'summary' && i === 2 && t) { html += '<span class="lb-retake">' + esc(t) + '</span>'; return; }
        if (t) rest.push(esc(t)); });
      if (rest.length) html += '<span class="' + (kind === 'summary' ? 'lb-rules' : 'lb-desc') + '">' + rest.join('<br>') + '</span>';
      html += meta; p.innerHTML = html; p.dataset.lbFmt = kind;
    }
    function render(){
      var occ = {}; var items = wrappers().map(function(w){ var m = w.querySelector('[data-lb-part="message"]'); var p = w.querySelector('[data-lb-part="message-text"]');
        var it = { el:w, author: m ? m.dataset.lbAuthor : null, p:p, text: p ? p.textContent.trim().replace(/^[✓✕]\s*/, '') : '' }; var ok = it.author + '|' + it.text.replace(/\s+/g, ''); occ[ok] = (occ[ok] || 0) + 1; it.seq = seqOf(it.author, it.text, occ[ok]); return it; });
      items.sort(function(a, b){ return a.seq - b.seq; });
      items.forEach(function(it){ var o = String(it.seq); if (it.el.style.order !== o) it.el.style.order = o; if (!it.p) it.el.classList.add('lb-hide'); });
      items = items.filter(function(it){ if (!it.p) return false; if (it.author === 'bot' && /^(Thinking|Réflexion|Je réfléchis)/i.test(it.text)) { it.el.classList.add('lb-hide'); return false; } return true; });
      /* UNDO: a "Back" user message takes back the last kept user message and everything after it (its banner, a CONTINUE, the next scene). */
      var kept = []; items.forEach(function(it){ it.el.classList.remove('lb-undone');
        if (it.author === 'user' && BACKTXT.test(it.text)) { it.el.classList.add('lb-undone'); while (kept.length) { var x = kept.pop(); x.el.classList.add('lb-undone'); if (x.author === 'user') break; } return; }
        kept.push(it); }); items = kept;
      items.forEach(function(it){ if (it.author === 'bot' && it.p && !it.el.dataset.lbFb) { var m = /^([✓✕])\s*/.exec(it.p.textContent.trim());
        if (m) { it.el.dataset.lbFb = m[1] === '✓' ? 'ok' : 'ko'; it.p.textContent = it.p.textContent.trim().replace(/^[✓✕]\s*/, ''); } } });
      if (!lang) { var f = items.filter(function(i){ return i.author === 'bot' && i.text; })[0]; if (f) lang = /^Lesson/.test(f.text) ? 'en' : 'fr'; }
      var T = TX[lang || 'fr'];
      var isCta = function(t){ return ALLCTA.indexOf(t) >= 0; };
      var boundary = -1, lastStart = -1;
      items.forEach(function(it, i){ if (it.author === 'user') { if (isCta(it.text)) boundary = i; if (CTA.start.indexOf(it.text) >= 0 || CTA.retry.indexOf(it.text) >= 0) lastStart = i; } });
      var bText = boundary >= 0 ? items[boundary].text : null;
      var after = items.slice(boundary + 1);
      var seenTxt = {}; for (var di = after.length - 1; di >= 0; di--) { var d = after[di]; if (d.author !== 'bot' || !d.text) continue; var dk = d.text.replace(/\s+/g, ''); if (seenTxt[dk]) { d.el.classList.add('lb-dup'); after.splice(di, 1); } else { seenTxt[dk] = 1; d.el.classList.remove('lb-dup'); } }
      var answerIdx = -1; after.forEach(function(it, i){ if (it.author === 'user') answerIdx = i; });
      var banner = null; if (answerIdx >= 0) { for (var j = answerIdx + 1; j < after.length; j++) if (after[j].author === 'bot' && after[j].el.dataset.lbFb) { banner = after[j]; break; } }
      var lastBot = null; after.forEach(function(it){ if (it.author === 'bot' && it.text) lastBot = it; });
      var screen;
      if (boundary < 0 || CTA.retry.indexOf(bText) >= 0) screen = 'welcome';
      else if (CTA.next.indexOf(bText) >= 0) screen = 'end';
      else if (banner) screen = 'feedback';
      else if (lastBot && T.done.test(lastBot.text)) screen = 'summary';
      else screen = 'question';
      items.forEach(function(it, i){ it.el.classList.toggle('lb-hide', i <= boundary); it.el.classList.remove('lb-scene', 'lb-question-text', 'lb-answer', 'lb-banner-src'); });
      var bots = after.filter(function(it){ return it.author === 'bot' && it.text && !it.el.dataset.lbFb; });
      var optsNow = document.querySelectorAll('[data-lb-part="option-button"]').length;
      var hasQuestion = optsNow > 1 || answerIdx >= 0 || screen !== 'question'; /* while the options have not arrived, every bot text is a scene */
      bots.forEach(function(it, i){ it.el.classList.add(hasQuestion && i === bots.length - 1 ? 'lb-question-text' : 'lb-scene'); });
      if (answerIdx >= 0 && screen !== 'welcome') { var a = after[answerIdx]; a.el.classList.add('lb-answer');
        var bub = a.el.querySelector('[data-lb-part="message-bubble"]'); if (bub && !bub.dataset.lbIdx) { var k = lastOptions.indexOf(a.text); if (k >= 0) bub.dataset.lbIdx = String(k + 1); } }
      if (banner) banner.el.classList.add('lb-banner-src');
      if (screen === 'welcome' && bots.length) fmt(bots[bots.length - 1].p, 'welcome');
      if (screen === 'summary' && lastBot) fmt(lastBot.p, 'summary');
      if (screen === 'welcome' && prenom && bots.length) { var bb = bots[bots.length - 1].el.querySelector('[data-lb-part="message-bubble"]');
        if (bb && !bb.querySelector('.lb-hello')) { var h = document.createElement('div'); h.className = 'lb-hello'; h.textContent = T.hello.replace('{p}', prenom); bb.insertBefore(h, bb.firstChild); } }
      var opts = [].slice.call(document.querySelectorAll('[data-lb-part="option-button"]')).map(function(b){ return (b.innerText || b.textContent).trim(); });
      if (opts.length > 1) lastOptions = opts;
      var osig = opts.join('|'); if (osig !== armSig) { armSig = osig; armAt = Date.now(); }
      /* WATCHDOG: no buttons for 6 s outside the end screen = a lost bot reply → offer a reload instead of a dead screen */
      if (opts.length) lastOptsAt = Date.now(); var stalled = screen !== 'end' && !opts.length && Date.now() - lastOptsAt > 6000;
      if (stalled && !document.body.classList.contains('lb-stalled')) window.__lbGuard.stalled++; document.body.classList.toggle('lb-stalled', stalled);
      var answered = 0, wrong = 0, koSeen = {};
      items.forEach(function(it, i){ if (i <= lastStart) return; if (it.author === 'user' && !isCta(it.text)) answered++; if (it.author === 'bot' && it.el.dataset.lbFb === 'ko' && !koSeen[it.text]) { koSeen[it.text] = 1; wrong++; } });
      var over = screen === 'summary' && lastBot && T.over.test(lastBot.text);
      var prog = Math.min(TOTAL, answered); if ((screen === 'summary' && !over) || screen === 'end') prog = TOTAL; if (screen === 'welcome') { prog = 0; wrong = 0; }
      var w = Math.round(prog / TOTAL * 100) + '%'; if (fill.style.width !== w) fill.style.width = w; track.setAttribute('aria-valuenow', String(prog));
      var hl = Math.max(0, 3 - wrong); hearts.forEach(function(h, i){ h.classList.toggle('lost', i >= hl); });
      if (banner) { var ok = banner.el.dataset.lbFb === 'ok'; var label = ok ? T.ok : T.ko;
        var body = banner.text.replace(new RegExp('^' + label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '[\\s.!]*'), '');
        setText(bTitle, label); setText(bBody, body); setText(bXp, T.xp); setText(bCta, T.cont);
        var ic = ok ? ICON_OK : ICON_KO; if (bIcon.dataset.k !== (ok ? 'ok' : 'ko')) { bIcon.innerHTML = ic; bIcon.dataset.k = ok ? 'ok' : 'ko'; } }
      var cls = document.body.classList; ['lb-welcome', 'lb-question', 'lb-feedback', 'lb-summary', 'lb-end'].forEach(function(c){ cls.toggle(c, c === 'lb-' + screen); });
      cls.toggle('lb-over', !!over);
      cls.toggle('lb-correct', !!banner && banner.el.dataset.lbFb === 'ok'); cls.toggle('lb-wrong', !!banner && banner.el.dataset.lbFb === 'ko');
      if (banner && !sfxDone[banner.seq]) { sfxDone[banner.seq] = 1; play(banner.el.dataset.lbFb === 'ok' ? 'ok' : 'ko'); }
      if (screen === 'summary' && lastBot && !sfxDone[lastBot.seq]) { sfxDone[lastBot.seq] = 1; play(over ? 'over' : 'win'); }
      var art = screen === 'welcome' ? 'welcome' : screen === 'end' ? 'end' : screen === 'summary' ? (over ? 'gameover' : 'summary') : screen === 'feedback' ? ('q' + Math.min(TOTAL, Math.max(1, answered))) : ('q' + Math.min(TOTAL, answered + 1));
      if (document.body.dataset.lbArt !== art) document.body.dataset.lbArt = art;
      setText(endBtn, stalled ? (lang === 'en' ? 'Reload the lesson' : 'Recharger la leçon') : CTA.retry[lang === 'en' ? 1 : 0]);
      var canBack = !!nativeBack() && screen !== 'welcome' && screen !== 'end' && !(screen === 'question' && answered === 0) && !stalled;
      if (backLock && opts.length && osig !== backSig) backLock = 0; if (backLock && Date.now() > backLock) backLock = 0;
      backBtn.classList.toggle('off', !canBack); backBtn.classList.toggle('busy', !!backLock); backBtn.tabIndex = canBack ? 0 : -1;
      if (canBack) backBtn.removeAttribute('aria-hidden'); else backBtn.setAttribute('aria-hidden', 'true');
      setText(backT, lang === 'en' ? 'Back' : 'Retour'); document.body.classList.add('lb-backbar');
      var sig = screen + '|' + items.length + '|' + opts.length; if (sig !== lastSig) { lastSig = sig; var win = document.querySelector('[data-lb-part="window"]'); if (win) requestAnimationFrame(function(){ win.scrollTop = win.scrollHeight; }); }
      state = { screen:screen, progress:prog, hearts:hl, wrong:wrong, answered:answered, banner: banner ? banner.el.dataset.lbFb : null, over: !!over, lang:lang, boundary:bText, visible: after.length, back: canBack, backLock: !!backLock };
    }
    /* CLICK GUARD + TAP FEEDBACK. The v4 widget accepts a second activation of an option button before it unmounts (double tap on a phone):
       the stray input lands on the next block and strands the lesson (Cris, IMG_9355, reproduced 2026-09-18). One accepted click per set of options. */
    var accepted = null, passEl = null, armSig = null, armAt = 0, shieldUntil = 0, shieldSkip = null, lastOptsAt = Date.now(); window.__lbGuard = { blocked: 0, accepted: 0, unarmed: 0, shielded: 0, stalled: 0, back: 0 };
    document.addEventListener('click', function(e){
      var b = e.target && e.target.closest ? e.target.closest('[data-lb-part="option-button"]') : null; if (!b) return;
      if (passEl === b) { passEl = null; shieldSkip = e; return; } /* our own delayed click: let it through (guard and shield) */
      var all = [].slice.call(document.querySelectorAll('[data-lb-part="option-button"]')); var sig = all.map(function(x){ return (x.innerText || x.textContent).trim(); }).join('|'); var now = Date.now();
      if (sig !== armSig) { armSig = sig; armAt = now; }
      if (all.length > 1 && now - armAt < 300) { window.__lbGuard.unarmed++; e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation(); return; } /* ghost tap/key: answer tiles that rendered < 300 ms ago (single CTAs are covered by the veil) */
      if (backLock && sig === backSig) { window.__lbGuard.blocked++; e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation(); return; }
      if (accepted && accepted.sig === sig && now - accepted.at < 4000) { window.__lbGuard.blocked++; e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation(); return; }
      accepted = { sig: sig, at: now }; window.__lbGuard.accepted++; shieldUntil = now + 700; shieldSkip = e; veil.style.display = 'block'; setTimeout(function(){ veil.style.display = 'none'; }, 700);
      if (all.length < 2) return; /* single CTA buttons send at once */
      e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation(); b.classList.add('lb-tapped'); /* colour first, send 220 ms later (no hover on mobile; tiles unmount on send) */
      setTimeout(function(){ try { passEl = b; b.click(); } catch (err) {} passEl = null; }, 220);
    }, true);
    /* TOUCH SHIELD. v4 widget race (reproduced without any custom JS, ~1 in 20): a second touch ~50 ms after tapping a button, landing on the chat
       window, can make the widget drop the bot's next messages. For 700 ms after an accepted tap the widget sees no pointer/touch/mouse/click at all. */
    ['pointerdown', 'pointerup', 'touchstart', 'touchend', 'mousedown', 'mouseup', 'click', 'dblclick'].forEach(function(ty){
      document.addEventListener(ty, function(e){
        if (Date.now() > shieldUntil || e === shieldSkip) return; var t = e.target;
        if (passEl && t && (t === passEl || passEl.contains(t))) return;
        if (t && t.closest && (t.closest('#lb-top') || t.closest('#lb-banner') || t.closest('#lb-restart'))) return;
        window.__lbGuard.shielded++; e.stopImmediatePropagation(); e.stopPropagation(); if (e.cancelable) e.preventDefault();
      }, true); });
    document.addEventListener('keydown', function(e){
      var t = e.target; if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      var btns = document.querySelectorAll('[data-lb-part="option-button"]');
      if ((e.key === 'Enter' || e.key === ' ') && btns.length === 1) { btns[0].click(); e.preventDefault(); return; }
      var n = parseInt(e.key, 10); if (n >= 1 && n <= 4 && btns.length > 1 && btns[n - 1]) { btns[n - 1].click(); e.preventDefault(); }
    }, true);
    var pending = false; var mo = new MutationObserver(function(){ if (pending) return; pending = true; requestAnimationFrame(function(){ pending = false; try { render(); } catch (e) { window.__lbFootErr = String(e); } }); });
    render(); setInterval(function(){ try { render(); } catch (e) { window.__lbFootErr = String(e); } }, 400);
    mo.observe(document.body, { childList:true, subtree:true });
    window.__lbLesson = { state: function(){ return state; } };
  } catch (err) { window.__lbFootErr = String(err); }
})();
