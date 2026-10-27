/* lb-js: surquel-voz 3 (EN) +sync-1002 */
/* [mockup 21b] Surquel technical support with REAL voice notes and an AI agent — invented brand, demo only.
   ONE page script, pairs with style.css. Base: the landbot-style messaging module 0.3.5 (timestamps, "Hoy" chip,
   reply buttons inside the bubble that asked, decorative composer, "escribiendo…"), plus:
     1. photos: a bot bubble whose first line is "📷 <caption>" gets a div.sq-photo above it; tap opens it large;
     2. REAL voice notes: whenever the chat has a free-text box, a round mic sits in it. Hold to record and release to
        send, or tap to start and tap ➤ to send (🗑 cancels, 60 s max). The recording (MediaRecorder) is POSTed to
        VOICE_API, which keeps it 7 days and transcribes it with a local Whisper model. The chat then receives
        "🎙 <transcript> 🔊 <audio url>" through the native input (React-safe setter + submit), so the AI agent reads
        the words and an operator in the inbox can open the original audio;
     3. user bubbles that start with "🎙" are drawn as voice-note bubbles that PLAY the real audio (local copy first,
        server copy after a reload), with duration and transcript; the 🔊 link is hidden in the bubble;
     4. "Resolved" / "Case ready for a technician (demo)" messages with "Key: value" lines are drawn as record cards.
   Network: only VOICE_API (the note upload, and GET of a note's duration). Never reads config or tokens, stores
   nothing. On any error the plain chat keeps working and typing always works. Kill switch: ?voice=0 hides the mic. */
(function () {
  var CONFIG = {
    placeholder: 'Type a message',
    dayLabel: 'Today',
    problemPrefix: "Tell me what's wrong",
    voiceApi: 'https://voice.getagent.page',
    voiceCtx: 'surquel-en',
    maxSecs: 60,
    holdMs: 600
  };
  var PHOTOS = [
    { key: 'disco', cap: 'Seed metering disc' },
    { key: 'manguera', cap: 'Vacuum hose' },
    { key: 'profundidad', cap: 'Depth lever' }
  ];
  var CARDS = [
    { kind: 'ok', title: 'Resolved' },
    { kind: 'case', title: 'Case ready for a technician' }
  ];
  try {
    if (window.__sqSoporte) return;
    var stats = window.__sqSoporte = { stamps: 0, groupsBuilt: 0, photos: 0, voice: 0, cards: 0, notesSent: 0, notesFailed: 0, lastNote: null, errors: [] };
    var B = document.body;
    B.classList.add('lb-js-messaging');
    var reduced = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);

    function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
    var pad = function (n) { return (n < 10 ? '0' : '') + n; };
    var hhmm = function () { var d = new Date(); return pad(d.getHours()) + ':' + pad(d.getMinutes()); };
    function msgTextOf(b) { var t = b && b.querySelector('[data-lb-part="message-text"]'); return t ? (t.textContent || '').trim() : ''; }
    function linesOf(s) { return String(s).split('\n').map(function (x) { return x.trim(); }).filter(Boolean); }

    /* ---------- messaging module 0.3.5 (decorative composer, timestamps, day chip, inline reply buttons) ---------- */
    var bar = el('div'); bar.id = 'lb-msg-composer'; bar.setAttribute('aria-hidden', 'true');
    bar.appendChild(el('div', 'lb-msg-plus')); bar.appendChild(el('div', 'lb-msg-pill', CONFIG.placeholder)); bar.appendChild(el('div', 'lb-msg-mic'));
    B.appendChild(bar);
    function footer() { return document.querySelector('[data-lb-part="window"] > .responsive-container:last-child'); }
    function placeBar() {
      var foot = footer();
      if (!foot || bar.parentElement === foot) return;
      var brand = foot.querySelector('[data-lb-part="branding"]');
      var before = brand ? (brand.parentElement === foot ? brand : brand.closest('[data-lb-part="window"] > .responsive-container > *')) : null;
      if (before && before.parentElement === foot) foot.insertBefore(bar, before); else foot.appendChild(bar);
    }
    function inputEl() { return document.querySelector('[data-lb-part="input-field"] > input, [data-lb-part="input-field"] > textarea'); }
    var idleSince = 0;
    function syncComposer() {
      placeBar();
      var input = inputEl();
      B.classList.toggle('lb-msg-nocomposer', !input);
      B.classList.toggle('lb-msg-typing', !!document.querySelector('[aria-label="Conversation messages"] > span'));
      /* at an ending with nothing to tap or type the decorative bar goes (from the verified Nortis/Wendra fix) */
      var idle = !input && !!document.querySelector('[data-lb-part="message"]') && !document.querySelector('[data-lb-part="option-button"]') && !B.classList.contains('lb-msg-typing');
      if (!idle) idleSince = 0; else if (!idleSince) idleSince = Date.now();
      var ended = !!idleSince && Date.now() - idleSince > 2500;
      if (ended !== (bar.style.display === 'none')) { if (ended) bar.style.setProperty('display', 'none', 'important'); else bar.style.removeProperty('display'); }
      return input;
    }
    var tsByKey = {};
    var group = null, groupBubble = null, groupSig = '';
    var answered = [];
    var bubbleKey = function (b) { return msgTextOf(b); };
    var label = function (b) { return (b.textContent || '').trim(); };
    function botBubbles() { return document.querySelectorAll('[data-lb-part="message"][data-lb-author="bot"] [data-lb-part="message-bubble"]'); }
    function lastBotBubble() { var bs = botBubbles(); return bs.length ? bs[bs.length - 1] : null; }
    function answer() {
      if (!group) return;
      group.setAttribute('data-state', 'answered');
      if (groupBubble) answered.push({ key: bubbleKey(groupBubble), node: group });
      /* answered copies become plain text rows: not focusable, and never mistaken for the live buttons of a later turn */
      var bs = group.querySelectorAll('button.lb-msg-btn');
      for (var i = 0; i < bs.length; i++) { var d = el('div', 'lb-msg-btn', bs[i].textContent); d.setAttribute('aria-disabled', 'true'); bs[i].replaceWith(d); }
      group = null; groupBubble = null; groupSig = '';
    }
    function reattach() {
      for (var i = 0; i < answered.length; i++) {
        var a = answered[i]; if (a.node.isConnected || !a.key) continue;
        var bs = botBubbles();
        for (var j = 0; j < bs.length; j++) {
          if (bs[j] !== groupBubble && !bs[j].querySelector('.lb-msg-buttons') && bubbleKey(bs[j]) === a.key) {
            bs[j].appendChild(a.node); bs[j].setAttribute('data-lb-msg-has-buttons', ''); break;
          }
        }
      }
    }
    function syncButtons() {
      var real = document.querySelectorAll('[data-lb-part="option-button"]');
      if (!real.length) { answer(); B.classList.remove('lb-msg-inline'); return; }
      var bubble = lastBotBubble();
      if (!bubble) { B.classList.remove('lb-msg-inline'); return; }
      var sig = [].map.call(real, label).join('|');
      if (group && group.isConnected && groupBubble === bubble && groupSig === sig) { B.classList.add('lb-msg-inline'); return; }
      if (group && (groupBubble !== bubble || groupSig !== sig)) answer();
      var g = el('div', 'lb-msg-buttons');
      for (var i = 0; i < real.length; i++) {
        var row = el('div', 'lb-msg-row');
        var btn = el('button', 'lb-msg-btn', label(real[i]));
        btn.type = 'button';
        (function (realBtn) {
          btn.addEventListener('click', function () {
            if (realBtn.isConnected) { realBtn.click(); return; }
            if (group) { group.remove(); group = null; groupBubble = null; groupSig = ''; }
            syncButtons();
          });
        })(real[i]);
        row.appendChild(btn); g.appendChild(row);
      }
      bubble.appendChild(g);
      bubble.setAttribute('data-lb-msg-has-buttons', '');
      group = g; groupBubble = bubble; groupSig = sig; stats.groupsBuilt++;
      B.classList.add('lb-msg-inline');
    }

    /* ---------- photos ---------- */
    var lb = el('div'); lb.id = 'sq-lightbox'; lb.setAttribute('role', 'dialog'); lb.setAttribute('aria-modal', 'true'); lb.setAttribute('aria-label', 'Enlarged photo');
    var lbImg = el('div', 'sq-lb-img'), lbCap = el('div', 'sq-lb-cap'), lbX = el('button', 'sq-lb-x', '×');
    lbX.type = 'button'; lbX.setAttribute('aria-label', 'Close photo');
    lb.appendChild(lbImg); lb.appendChild(lbCap); lb.appendChild(lbX); B.appendChild(lb);
    var lbReturn = null;
    function openPhoto(key, cap, from) { lbImg.className = 'sq-lb-img sq-img-' + key; lbCap.textContent = cap; lb.setAttribute('data-open', ''); lbReturn = from || null; lbX.focus(); }
    function closePhoto() { if (!lb.hasAttribute('data-open')) return; lb.removeAttribute('data-open'); if (lbReturn && lbReturn.isConnected) lbReturn.focus(); lbReturn = null; }
    lb.addEventListener('click', closePhoto);
    function photoFor(text) {
      /* the agent sometimes writes a sentence before the 📷 line: take the first line that starts with 📷 */
      var L = linesOf(text), first = '';
      for (var n = 0; n < L.length; n++) if (L[n].indexOf('📷') === 0) { first = L[n]; break; }
      if (!first) return null;
      for (var i = 0; i < PHOTOS.length; i++) if (first.indexOf(PHOTOS[i].cap) >= 0) return { key: PHOTOS[i].key, cap: first.replace('📷', '').trim() };
      return null;
    }
    function decoratePhotos() {
      var bs = botBubbles();
      for (var i = 0; i < bs.length; i++) {
        var b = bs[i], p = photoFor(msgTextOf(b));
        if (!p) { if (b.hasAttribute('data-sq-photo')) { b.removeAttribute('data-sq-photo'); var o = b.querySelector('.sq-photo'); if (o) o.remove(); } continue; }
        var ex = b.querySelector(':scope > .sq-photo');
        if (ex && ex.getAttribute('data-key') === p.key) continue;
        if (ex) ex.remove();
        var d = el('div', 'sq-photo sq-img-' + p.key);
        d.setAttribute('data-key', p.key); d.setAttribute('role', 'img'); d.setAttribute('aria-label', 'Photo: ' + p.cap); d.tabIndex = 0;
        (function (pp, dd) {
          dd.addEventListener('click', function () { openPhoto(pp.key, pp.cap, dd); });
          dd.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openPhoto(pp.key, pp.cap, dd); } });
        })(p, d);
        b.insertBefore(d, b.firstChild);
        b.setAttribute('data-sq-photo', p.key);
        stats.photos++;
      }
    }

    /* ---------- voice-note bubbles (real audio) ---------- */
    var notes = {};   /* id -> { url: local blob url, secs } for notes recorded on this page */
    function hashOf(s) { var x = 7; for (var i = 0; i < s.length; i++) x = (x * 31 + s.charCodeAt(i)) | 0; return Math.abs(x); }
    function fmt(s) { s = Math.max(0, Math.round(s || 0)); return Math.floor(s / 60) + ':' + pad(s % 60); }
    function parseNote(t) {
      var body = t.replace(/^🎙️?/, '');
      var k = body.indexOf('🔊'), tr = (k >= 0 ? body.slice(0, k) : body).trim(), url = k >= 0 ? body.slice(k + 2).trim() : '';
      var m = url.match(/\/a\/([A-Za-z0-9_-]{10,40})/);
      return { tr: tr, url: m ? url : '', id: m ? m[1] : '' };
    }
    function buildVoice(n) {
      var known = notes[n.id] || {}, frag = document.createDocumentFragment();
      var vn = el('div', 'sq-vn'), play = el('button', 'sq-vn-play'), mid = el('div', 'sq-vn-mid'), wave = el('div', 'sq-vn-wave'), meta = el('div', 'sq-vn-meta');
      play.type = 'button'; play.setAttribute('aria-label', 'Play voice note');
      var h = hashOf(n.tr || n.id), bars = [];
      for (var i = 0; i < 30; i++) { h = (h * 1103515245 + 12345) & 0x7fffffff; var bi = el('i'); bi.style.height = (22 + (h % 78)) + '%'; wave.appendChild(bi); bars.push(bi); }
      var secs = known.secs || 0;
      var dur = el('span', null, secs ? fmt(secs) : '0:00');
      meta.appendChild(dur); meta.appendChild(el('span', null, 'Voice note'));
      mid.appendChild(wave); mid.appendChild(meta);
      vn.appendChild(play); vn.appendChild(mid); vn.appendChild(el('div', 'sq-vn-av'));
      var trEl = el('div', 'sq-vn-tr'); trEl.appendChild(el('b', null, 'Transcript')); trEl.appendChild(document.createTextNode(n.tr));
      if (!n.url) { play.disabled = true; play.setAttribute('aria-label', 'Voice note without audio'); }
      else if (!secs && n.id) {
        fetch(CONFIG.voiceApi + '/v1/notes/' + n.id).then(function (r) { return r.ok ? r.json() : null; })
          .then(function (j) { if (j && j.duration) { secs = j.duration; if (!audio || audio.paused) dur.textContent = fmt(secs); } }).catch(function () {});
      }
      var audio = null, raf = 0;
      function reset() { cancelAnimationFrame(raf); vn.removeAttribute('data-playing'); bars.forEach(function (x) { x.classList.remove('on'); }); dur.textContent = fmt(secs); }
      function tick() {
        if (!audio || audio.paused) return;
        var total = secs || (isFinite(audio.duration) ? audio.duration : 0), f = total ? Math.min(1, audio.currentTime / total) : 0, k = Math.round(f * bars.length);
        for (var j = 0; j < bars.length; j++) bars[j].classList.toggle('on', j < k);
        dur.textContent = fmt(audio.currentTime);
        raf = requestAnimationFrame(tick);
      }
      play.addEventListener('click', function () {
        if (!n.url) return;
        if (audio && !audio.paused) { audio.pause(); reset(); return; }
        if (!audio) {
          audio = new Audio((notes[n.id] && notes[n.id].url) || n.url);
          audio.addEventListener('ended', function () { setTimeout(reset, 400); });
          audio.addEventListener('error', function () {
            /* local copy gone (revoked) → fall back to the server copy once */
            if (audio.src !== n.url) { audio.src = n.url; audio.play().catch(function () { reset(); }); } else reset();
          });
        }
        vn.setAttribute('data-playing', '');
        audio.play().then(function () { raf = requestAnimationFrame(tick); }).catch(function () { reset(); });
      });
      frag.appendChild(vn); frag.appendChild(trEl);
      return frag;
    }
    function decorateVoice() {
      var bs = document.querySelectorAll('[data-lb-part="message"][data-lb-author="user"] [data-lb-part="message-bubble"]');
      for (var i = 0; i < bs.length; i++) {
        var b = bs[i], t = msgTextOf(b);
        if (t.indexOf('🎙') !== 0) continue;
        var n = parseNote(t), sig = String(hashOf(t));
        if (b.getAttribute('data-sq-voice') === sig && b.querySelector(':scope > .sq-vn')) continue;
        var olds = b.querySelectorAll(':scope > .sq-vn, :scope > .sq-vn-tr'); for (var k = 0; k < olds.length; k++) olds[k].remove();
        b.appendChild(buildVoice(n));
        b.setAttribute('data-sq-voice', sig);
        stats.voice++;
      }
    }
    /* ---------- record cards ---------- */
    function cardFor(text) {
      var L = linesOf(text); if (L.length < 2) return null;
      for (var i = 0; i < CARDS.length; i++) if (L[0].indexOf(CARDS[i].title) === 0) return { kind: CARDS[i].kind, L: L };
      return null;
    }
    function decorateCards() {
      var bs = botBubbles();
      for (var i = 0; i < bs.length; i++) {
        var b = bs[i], t = msgTextOf(b), c = cardFor(t);
        if (!c) continue;
        var sig = String(hashOf(t));
        if (b.getAttribute('data-sq-sig') === sig && b.querySelector(':scope > .sq-card')) continue;
        var old = b.querySelector(':scope > .sq-card'); if (old) old.remove();
        var card = el('div', 'sq-card'), head = el('div', 'sq-card-h');
        head.appendChild(el('span', null, c.L[0].replace(/\s*\(demo\)\s*$/i, '')));
        head.appendChild(el('span', 'sq-card-tag', 'DEMO'));
        card.appendChild(head);
        for (var j = 1; j < c.L.length; j++) {
          var ln = c.L[j], ci = ln.indexOf(': ');
          if (ci <= 0) continue;
          var k = ln.slice(0, ci), v = ln.slice(ci + 2);
          if (k === 'Note' || k === 'Status') { card.appendChild(el('div', 'sq-card-note', v.charAt(0).toUpperCase() + v.slice(1))); continue; }
          var r = el('div', 'sq-card-r'); r.appendChild(el('span', 'sq-card-k', k)); r.appendChild(el('span', 'sq-card-v', v)); card.appendChild(r);
        }
        b.insertBefore(card, b.firstChild);
        b.setAttribute('data-sq-card', c.kind); b.setAttribute('data-sq-sig', sig);
        stats.cards++;
      }
    }
    /* ---------- real voice notes: mic, recorder bar, upload + transcription, send ---------- */
    var qs = location.search || '';
    var canRecord = !/[?&]voice=0\b/.test(qs) && !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia) && typeof window.MediaRecorder === 'function' && window.isSecureContext !== false;
    var mic = el('button'); mic.id = 'sq-mic'; mic.type = 'button'; mic.setAttribute('aria-label', 'Record a voice note');
    var hint = el('div', null, 'Hold to record a voice note'); hint.id = 'sq-hint'; hint.setAttribute('aria-hidden', 'true'); B.appendChild(hint);
    var rec = el('div'); rec.id = 'sq-rec'; rec.setAttribute('role', 'status'); rec.setAttribute('aria-live', 'polite');
    var recDot = el('span', 'sq-rec-dot'), recT = el('span', 'sq-rec-t', ''), recWave = el('span', 'sq-rec-wave'), recX = el('button', 'sq-rec-x'), recSend = el('button', 'sq-rec-send');
    recX.type = 'button'; recX.setAttribute('aria-label', 'Cancel recording');
    recSend.type = 'button'; recSend.setAttribute('aria-label', 'Send voice note');
    var waveBars = [];
    for (var w = 0; w < 26; w++) { var wi = el('i'); wi.style.animationDelay = ((w * 97) % 900) + 'ms'; recWave.appendChild(wi); waveBars.push(wi); }
    rec.appendChild(recDot); rec.appendChild(recT); rec.appendChild(recWave); rec.appendChild(recX); rec.appendChild(recSend); B.appendChild(rec);

    var R = { state: 'idle', stream: null, mr: null, chunks: [], t0: 0, timer: 0, maxT: 0, msgT: 0, holdAt: 0, ctx: null, an: null, lv: [], mime: '' };
    function pickMime() {
      var c = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus', 'audio/aac'];
      for (var i = 0; i < c.length; i++) { try { if (MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(c[i])) return c[i]; } catch (e) {} }
      return '';
    }
    function place() {
      var f = document.querySelector('[data-lb-part="input-field"]');
      var r = f ? f.getBoundingClientRect() : null;
      if (r && r.width) {
        rec.style.left = r.left + 'px'; rec.style.top = r.top + 'px'; rec.style.width = r.width + 'px'; rec.style.minHeight = Math.max(44, r.height) + 'px'; rec.style.height = 'auto';
        var mr = mic.getBoundingClientRect();
        if (mr.width) { hint.style.right = Math.max(8, window.innerWidth - mr.right) + 'px'; hint.style.bottom = (window.innerHeight - mr.top + 10) + 'px'; }
      }
    }
    function setState(s, text) {
      R.state = s;
      if (s === 'idle') { rec.removeAttribute('data-on'); rec.removeAttribute('data-state'); rec.removeAttribute('data-live'); B.classList.remove('sq-recording'); return; }
      place(); rec.setAttribute('data-on', ''); rec.setAttribute('data-state', s); B.classList.add('sq-recording');
      if (text != null) recT.textContent = text;
    }
    function release() {
      clearInterval(R.timer); clearTimeout(R.maxT); R.timer = 0; R.maxT = 0;
      if (R.stream) { R.stream.getTracks().forEach(function (t) { try { t.stop(); } catch (e) {} }); R.stream = null; }
      if (R.ctx) { try { R.ctx.close(); } catch (e) {} R.ctx = null; R.an = null; }
      rec.removeAttribute('data-live');
      waveBars.forEach(function (x) { x.style.height = ''; });
    }
    function showMsg(text) {
      release(); clearTimeout(R.msgT);
      setState('msg', text); stats.notesFailed++;
      R.msgT = setTimeout(function () { if (R.state === 'msg') { setState('idle'); if (mic.isConnected) mic.focus(); } }, 7000);
    }
    function levels() {
      if (!R.an) return;
      var a = new Uint8Array(R.an.fftSize); R.an.getByteTimeDomainData(a);
      var peak = 0; for (var i = 0; i < a.length; i++) { var v = Math.abs(a[i] - 128); if (v > peak) peak = v; }
      R.lv.push(Math.min(1, peak / 64)); if (R.lv.length > waveBars.length) R.lv.shift();
      for (var j = 0; j < waveBars.length; j++) { var l = R.lv[j - (waveBars.length - R.lv.length)]; waveBars[j].style.height = (l == null ? 12 : Math.round(12 + l * 88)) + '%'; }
    }
    function startRec(viaKeyboard) {
      if (!canRecord || R.state === 'starting' || R.state === 'recording' || R.state === 'busy') return;
      clearTimeout(R.msgT);
      R.chunks = []; R.lv = [];
      setState('starting', 'Allow the microphone…');
      var p;
      try { p = navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } }); }
      catch (e) { p = Promise.reject(e); }
      p.then(function (stream) {
        if (R.state !== 'starting') { stream.getTracks().forEach(function (t) { t.stop(); }); return; }
        R.stream = stream; R.mime = pickMime();
        var mr = R.mime ? new MediaRecorder(stream, { mimeType: R.mime }) : new MediaRecorder(stream);
        R.mr = mr;
        mr.ondataavailable = function (e) { if (e.data && e.data.size) R.chunks.push(e.data); };
        mr.start(250);
        R.t0 = Date.now();
        try {
          var AC = window.AudioContext || window.webkitAudioContext;
          if (AC && !reduced) { R.ctx = new AC(); var src = R.ctx.createMediaStreamSource(stream); R.an = R.ctx.createAnalyser(); R.an.fftSize = 512; src.connect(R.an); rec.setAttribute('data-live', ''); }
        } catch (e) { R.an = null; }
        setState('recording', 'Recording… 0:00');
        R.timer = setInterval(function () { recT.textContent = 'Recording… ' + fmt((Date.now() - R.t0) / 1000); levels(); }, 100);
        R.maxT = setTimeout(function () { finish(true); }, CONFIG.maxSecs * 1000);
        if (viaKeyboard) recSend.focus();
      }).catch(function (err) {
        var n = err && err.name;
        if (n === 'NotAllowedError' || n === 'SecurityError') showMsg('No microphone permission. Allow it in your browser, or type instead.');
        else if (n === 'NotFoundError' || n === 'OverconstrainedError') showMsg('No microphone found. Please type instead.');
        else showMsg('Could not use the microphone. Please type instead.');
      });
    }
    function cancelRec() {
      if (R.state === 'starting') { setState('idle'); return; }
      if (R.state !== 'recording') { if (R.state === 'msg') setState('idle'); return; }
      var mr = R.mr; R.mr = null;
      try { mr.onstop = null; mr.stop(); } catch (e) {}
      release(); setState('idle');
      if (mic.isConnected) mic.focus();
    }
    function finish(send) {
      if (R.state !== 'recording') return;
      var mr = R.mr, secs = (Date.now() - R.t0) / 1000; R.mr = null;
      if (!send) return cancelRec();
      setState('busy', 'Sending note…');
      mr.onstop = function () {
        var type = (mr.mimeType || R.mime || 'audio/webm').split(';')[0];
        var blob = new Blob(R.chunks, { type: type });
        release();
        if (secs < 0.8 || blob.size < 1200) { showMsg('Too short. Keep holding while you speak.'); return; }
        upload(blob, type, secs);
      };
      try { mr.requestData && mr.requestData(); } catch (e) {}
      try { mr.stop(); } catch (e) { release(); showMsg('Could not finish the recording. Try again.'); }
    }
    function upload(blob, type, secs) {
      setState('busy', 'Transcribing your note…');
      var ctl = window.AbortController ? new AbortController() : null, to = setTimeout(function () { if (ctl) ctl.abort(); }, 25000);
      var t0 = Date.now();
      fetch(CONFIG.voiceApi + '/v1/notes?ctx=' + encodeURIComponent(CONFIG.voiceCtx), { method: 'POST', headers: { 'Content-Type': type }, body: blob, signal: ctl ? ctl.signal : undefined })
        .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { ok: r.ok, status: r.status, j: j }; }); })
        .then(function (res) {
          clearTimeout(to);
          stats.lastNote = { status: res.status, ms: Date.now() - t0, bytes: blob.size, type: type, secs: Math.round(secs * 10) / 10 };
          if (!res.ok) {
            if (res.status === 429) return showMsg('Too many notes in a row. Wait a moment or type instead.');
            if (res.status === 413) return showMsg('That note is too long. One minute maximum.');
            return showMsg('Could not process the note. Try again or type instead.');
          }
          var j = res.j || {};
          if (!j.text || !j.id) return showMsg('I couldn\'t hear that. Try again, closer to the phone.');
          notes[j.id] = { url: URL.createObjectURL(blob), secs: j.duration || secs };
          sendText('🎙 ' + j.text.replace(/\s+/g, ' ').trim() + ' 🔊 ' + j.audio_url);
        })
        .catch(function () { clearTimeout(to); showMsg('Could not send the note (no connection to the server). Please type instead.'); });
    }
    function setVal(i, v) {
      var proto = i.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(proto, 'value').set.call(i, v);   /* never assign .value directly: React's tracker */
      i.dispatchEvent(new Event('input', { bubbles: true }));
    }
    function sendText(text) {
      var i = inputEl();
      if (!i) { showMsg('The conversation moved on while you were recording. Please record it again.'); return; }
      setVal(i, text);
      var tries = 0;
      (function attempt() {
        var live = inputEl();
        if (!live) { setState('idle'); stats.notesSent++; return; }           /* composer gone = Landbot took the message */
        var field = live.closest('[data-lb-part="input-field"]') || document;
        var sb = field.querySelector('[data-lb-part="input-submit"]') || document.querySelector('[data-lb-part="input-field"] [data-lb-part="input-submit"]');
        if (sb && !sb.disabled) { sb.click(); setState('idle'); stats.notesSent++; return; }
        if (++tries < 25) { setTimeout(attempt, 40); return; }
        live.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true }));
        setTimeout(function () { if (inputEl() && (inputEl().value || '').indexOf('🎙') === 0) showMsg('Your note is in the text box: press send.'); else { setState('idle'); stats.notesSent++; } }, 400);
      })();
    }
    /* hold to record, release to send; a short tap starts it and ➤ sends */
    mic.addEventListener('pointerdown', function (e) { if (e.button > 0) return; R.holdAt = Date.now(); startRec(false); });
    document.addEventListener('pointerup', function () {
      if (!R.holdAt) return; var held = Date.now() - R.holdAt; R.holdAt = 0;
      if (held >= CONFIG.holdMs && R.state === 'recording') finish(true);
    }, true);
    document.addEventListener('pointercancel', function () { R.holdAt = 0; }, true);
    mic.addEventListener('click', function (e) { e.preventDefault(); if (e.detail === 0) startRec(true); });
    mic.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    recSend.addEventListener('click', function () { finish(true); });
    recX.addEventListener('click', function () { if (R.state === 'msg') { clearTimeout(R.msgT); setState('idle'); if (mic.isConnected) mic.focus(); } else cancelRec(); });
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      if (lb.hasAttribute('data-open')) { closePhoto(); return; }
      if (R.state === 'recording' || R.state === 'starting' || R.state === 'msg') cancelRec();
    });
    function syncMic() {
      var i = inputEl(), on = canRecord && !!i;
      B.classList.toggle('sq-mic-on', on);
      if (!on) { if (R.state === 'recording' || R.state === 'starting') cancelRec(); B.classList.remove('sq-hint-on'); return; }
      var f = document.querySelector('[data-lb-part="input-field"]');
      if (f && mic.parentElement !== f) f.appendChild(mic);
      B.classList.toggle('sq-empty', !(i.value || '').trim());
      var lb2 = lastBotBubble();
      B.classList.toggle('sq-hint-on', !stats.notesSent && !!lb2 && msgTextOf(lb2).indexOf(CONFIG.problemPrefix) >= 0);
      place();
    }
    document.addEventListener('input', function (e) {
      try { if (R.state === 'recording' && e.isTrusted) cancelRec(); syncMic(); } catch (err) { stats.errors.push(String(err)); }
    }, true);

    /* ---------- render loop ---------- */
    var lastH = 0;
    function render() {
      try {
        var ts = hhmm();
        var sc = document.querySelector('[aria-label="Scrollable conversation area"]');
        if (sc) { if (sc.scrollHeight > lastH && sc.scrollTop + sc.clientHeight >= lastH - 160) sc.scrollTop = sc.scrollHeight; lastH = sc.scrollHeight; }
        /* first-seen time per bubble, keyed by author + text + occurrence */
        var all = document.querySelectorAll('[data-lb-part="message-bubble"]'), occ = {};
        for (var k = 0; k < all.length; k++) {
          var m = all[k].closest('[data-lb-part="message"]');
          var base = (m ? m.getAttribute('data-lb-author') : '') + '|' + bubbleKey(all[k]);
          occ[base] = (occ[base] || 0) + 1;
          if (all[k].hasAttribute('data-lb-ts') || base.length <= 2) continue;
          var key = base + '#' + occ[base], seen = tsByKey[key];
          if (!seen) { stats.stamps++; tsByKey[key] = ts; }
          all[k].setAttribute('data-lb-ts', seen || ts);
        }
        var first = document.querySelector('[data-lb-part="message"]');
        if (first && !first.hasAttribute('data-lb-daychip')) first.setAttribute('data-lb-daychip', CONFIG.dayLabel);
        decoratePhotos();
        decorateVoice();
        decorateCards();
        syncButtons();
        reattach();
        var input = syncComposer();
        if (input && input.getAttribute('placeholder') !== CONFIG.placeholder) input.setAttribute('placeholder', CONFIG.placeholder);
        syncMic();
      } catch (e) { if (stats.errors.length < 20) stats.errors.push(String(e)); }
    }
    render();
    /* polish 10-02: stamp in the same frame the bubble is added (was up to 400 ms late, so the time popped in after the text).
       One render per batch of page changes, before paint; capped so our own changes can never loop. */
    var queued = false, burst = 0;
    setInterval(function () { burst = 0; render(); }, 400);
    try { new MutationObserver(function () {
      if (queued || burst > 40) return; queued = true; burst++;
      Promise.resolve().then(function () { queued = false; render(); });
    }).observe(document.body, { childList: true, subtree: true }); } catch (e) { stats.errors.push('observer2: ' + String(e)); }
    var busy = false, winT = 0, winN = 0;
    try {
      var mo = new MutationObserver(function () {
        if (busy) return; var now = Date.now(); if (now - winT > 1000) { winT = now; winN = 0; }
        if (++winN > 60) return;
        busy = true; try { syncComposer(); syncMic(); } catch (e) { if (stats.errors.length < 20) stats.errors.push(String(e)); } finally { busy = false; }
      });
      mo.observe(B, { childList: true, subtree: true });
    } catch (e) { stats.errors.push('observer: ' + String(e)); }
    window.addEventListener('resize', function () { try { place(); } catch (e) {} });
  } catch (err) { window.__lbJsError = 'surquel-voz: ' + String(err); }
})();
