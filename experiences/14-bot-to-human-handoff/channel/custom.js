/* lb-js: quenderly-handoff 7 — mockup 14 (bot-to-human handoff, messenger look), GOAL 11, 2026-09-25.
   DOM-only, page-only. What it does:
     1. draws the mockup header (avatar stack, "Quenderly Sales", status line) inside the native header;
     2. turns the bot line "Shared with / Saved for the Quenderly Sales team · Label: value · …" into a card;
     3. turns the header dot green only once a takeover exists; copies the REAL assigned agent's name (the takeover avatar's alt text) onto the takeover title so the CSS
        can print "<name> joined"; marks messages after the takeover as data-qd="agent";
     4. marks the visitor's native "Back" line (data-qd="back"), folds a card superseded after a Back (data-qd-old),
        and hides Back once a person has the chat or the record is shown (body.qd-end);
     5. draws the thread in first-seen arrival order (flex order), so a fast answer never sits above its question;
     6. sets the composer placeholder to "Write a reply" and focuses a new question's field (mouse/trackpad devices only);
     7. hides the greeting bubble the flow sends again when a Back returns to the first question (only right after a Back).
   It only adds attributes, classes and its own elements; it reads textContent; it sends and stores nothing.
   Without it the chat still works (the CSS only hides the native header row when body.qd-js is set). */
(function () {
  try {
    if (window.__qdHandoff) return;
    var st = window.__qdHandoff = { runs: 0, cards: 0, agent: 0, err: null };
    window.__qdOrder = function () { var l = document.querySelector('[aria-label="Conversation messages"]'); if (!l) return [];
      return [].slice.call(l.children).filter(function (w) { return w.tagName !== 'SPAN' && w.getBoundingClientRect().height > 0; })
        .sort(function (a, b) { return a.getBoundingClientRect().top - b.getBoundingClientRect().top; })
        .map(function (w) { var m = w.matches('[data-lb-part="message"]') ? w : w.querySelector('[data-lb-part="message"]'); var p = m && m.querySelector('[data-lb-part="message-text"]');
          return m ? (m.getAttribute('data-lb-author') + ': ' + (p ? (p.textContent || '').trim().slice(0, 40) : '')) : ('x: ' + (w.textContent || '').trim().slice(0, 30)); }); };
    var NS = 'http://www.w3.org/2000/svg';
    var TEAM = 'Quenderly Sales team';

    function svg(paths, stroke) {
      var s = document.createElementNS(NS, 'svg');
      s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('fill', 'none');
      s.setAttribute('stroke', stroke); s.setAttribute('stroke-width', '2');
      s.setAttribute('stroke-linecap', 'round'); s.setAttribute('stroke-linejoin', 'round');
      s.setAttribute('aria-hidden', 'true');
      paths.forEach(function (d) { var p = document.createElementNS(NS, 'path'); p.setAttribute('d', d); s.appendChild(p); });
      return s;
    }
    function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
    var PERSON = ['M12 12a4 4 0 100-8 4 4 0 000 8z', 'M4.5 20a7.5 7.5 0 0115 0'];

    function buildHead() {
      var h = el('div'); h.id = 'qd-head';
      var inn = el('div', 'qd-in');
      var stack = el('div', 'qd-stack'); stack.setAttribute('aria-hidden', 'true');
      var a = el('div', 'qd-av a'); a.appendChild(svg(PERSON, '#5A2E00'));
      var b = el('div', 'qd-av b'); b.appendChild(svg(PERSON, '#0B4A36'));
      var c = el('div', 'qd-av c', 'Q');
      stack.appendChild(a); stack.appendChild(b); stack.appendChild(c);
      inn.appendChild(stack);
      inn.appendChild(el('h1', 'qd-title', 'Quenderly Sales'));
      inn.appendChild(el('div', 'qd-status', 'A real person picks up from here'));
      h.appendChild(inn);
      return h;
    }

    function cardFrom(bubble, text) {
      var parts = text.split(' · ');
      var title = parts.shift().replace(/^Shared with the /, 'Shared with the ').replace(TEAM, 'Sales team');
      var box = el('div', 'qd-card');
      var t = el('div', 'qd-card-t');
      t.appendChild(svg(['M6 11h12v9H6z', 'M8.5 11V8a3.5 3.5 0 017 0v3'], '#6B7280'));
      t.appendChild(el('span', null, title));
      box.appendChild(t);
      parts.forEach(function (p) {
        var i = p.indexOf(':'); if (i < 1) return;
        var r = el('div', 'qd-card-r');
        r.appendChild(el('span', null, p.slice(0, i).trim()));
        r.appendChild(el('span', null, p.slice(i + 1).trim() || '—'));
        box.appendChild(r);
      });
      bubble.appendChild(box);
      st.cards++;
    }

    var busy = false, lastInput = null;
    /* v4 orders the thread by message timestamp, and a fast answer gets the client clock, so it can be drawn ABOVE the
       question it answers (seen after a Back). Fix (GOAL-2/10 pattern): remember the order in which each thread item was
       FIRST SEEN and apply it as the flex `order` of its wrapper. Only a style attribute is set; no node is moved. */
    var seen = {}, arrival = 0;
    function arrivalOrder() {
      var list = document.querySelector('[aria-label="Conversation messages"]'); if (!list) return;
      var counts = {};
      for (var i = 0; i < list.children.length; i++) {
        var w = list.children[i], key;
        if (w.tagName === 'SPAN') { if (w.style.order !== '99999') w.style.order = '99999'; continue; } /* typing dots stay last */
        var m = w.matches('[data-lb-part="message"]') ? w : w.querySelector('[data-lb-part="message"]');
        if (m) {
          var p = m.querySelector('[data-lb-part="message-text"]');
          key = (m.getAttribute('data-lb-author') || '?') + '|' + (p ? (p.textContent || '').trim() : '');
        } else {
          var part = w.querySelector('[data-lb-part]');
          key = 'x|' + (part ? part.getAttribute('data-lb-part') : w.tagName) + '|' + (w.textContent || '').trim().slice(0, 60);
        }
        counts[key] = (counts[key] || 0) + 1; key += '#' + counts[key];
        if (!(key in seen)) seen[key] = arrival++;
        var o = String(seen[key]);
        if (w.style.order !== o) w.style.order = o;
      }
    }
    /* 7. The greeting and the first question are one block, so a Back to it re-sends the greeting. Keep the first greeting
       bubble; hide a later one with the same text whose previous visitor message (in arrival order) is the Back line.
       A restart ("done" -> again) is not after a Back, so its greeting stays. */
    var GREET = 'Hi, this is Quenderly Sales.';
    function hideGreetingRepeats() {
      var list = document.querySelector('[aria-label="Conversation messages"]'); if (!list) return;
      var ws = [].slice.call(list.children).filter(function (w) { return w.tagName !== 'SPAN'; })
        .sort(function (a, b) { return (Number(a.style.order) || 0) - (Number(b.style.order) || 0); });
      var first = null, lastUser = null;
      ws.forEach(function (w) {
        var m = w.matches('[data-lb-part="message"]') ? w : w.querySelector('[data-lb-part="message"]'); if (!m) return;
        var p = m.querySelector('[data-lb-part="message-text"]'); var t = p ? (p.textContent || '').trim() : '';
        var who = m.getAttribute('data-lb-author');
        if (who === 'user') { lastUser = t; return; }
        if (who !== 'bot' || t.indexOf(GREET) !== 0) return;
        var dup = first !== null && t === first && lastUser === 'Back';
        if (first === null) first = t;
        /* hide the thread item when it holds only this message, otherwise only the message (never the question beside it) */
        var tgt = (w === m || w.querySelectorAll('[data-lb-part="message"]').length === 1) ? w : m;
        if (dup) { if (tgt.style.display !== 'none') { tgt.style.display = 'none'; tgt.setAttribute('data-qd-greet-dup', '1'); st.greetHidden = (st.greetHidden || 0) + 1; } }
        else if (tgt.getAttribute('data-qd-greet-dup')) { tgt.style.display = ''; tgt.removeAttribute('data-qd-greet-dup'); }
      });
    }
    var fine = !!(window.matchMedia && window.matchMedia('(pointer: fine)').matches);
    function run() {
      if (busy) return; busy = true;
      try {
        st.runs++;
        document.body.classList.add('qd-js');
        arrivalOrder();
        hideGreetingRepeats();
        var hdr = document.querySelector('[data-lb-part="header"]');
        if (hdr && !hdr.querySelector('#qd-head')) hdr.appendChild(buildHead());

        var msgs = document.querySelectorAll('[data-lb-part="message"][data-lb-author="bot"]');
        for (var k = 0; k < msgs.length; k++) {
          var m = msgs[k];
          if (m.getAttribute('data-qd')) continue;
          var tx = m.querySelector('[data-lb-part="message-text"]');
          var bub = m.querySelector('[data-lb-part="message-bubble"]');
          var s = tx ? (tx.textContent || '').trim() : '';
          if (!s || !bub) continue;
          if (s.indexOf('Shared with the ' + TEAM) === 0 || s.indexOf('Saved for the ' + TEAM) === 0) {
            m.setAttribute('data-qd', 'card');
            if (!bub.querySelector('.qd-card')) cardFrom(bub, s);
          } else if (s.indexOf('Demo: ') === 0) {
            m.setAttribute('data-qd', 'demo');
          }
        }
        /* a card whose bubble React re-rendered loses our node: rebuild it */
        var cards = document.querySelectorAll('[data-lb-part="message"][data-qd="card"]');
        for (var j = 0; j < cards.length; j++) {
          var b2 = cards[j].querySelector('[data-lb-part="message-bubble"]');
          var t2 = cards[j].querySelector('[data-lb-part="message-text"]');
          if (b2 && t2 && !b2.querySelector('.qd-card')) cardFrom(b2, (t2.textContent || '').trim());
        }

        /* the visitor's native Back line, and cards superseded by a later card of the same kind (after a Back) */
        var um = document.querySelectorAll('[data-lb-part="message"][data-lb-author="user"]:not([data-qd])');
        for (var u = 0; u < um.length; u++) {
          var ut = um[u].querySelector('[data-lb-part="message-text"]');
          if (ut && (ut.textContent || '').trim() === 'Back') um[u].setAttribute('data-qd', 'back');
        }
        var allCards = document.querySelectorAll('[data-lb-part="message"][data-qd="card"]');
        var lastOf = {};
        for (var a2 = 0; a2 < allCards.length; a2++) {
          var kt = allCards[a2].querySelector('[data-lb-part="message-text"]');
          var kind = kt && (kt.textContent || '').indexOf('Saved for') === 0 ? 'rec' : 'ctx';
          if (lastOf[kind]) lastOf[kind].setAttribute('data-qd-old', '1');
          lastOf[kind] = allCards[a2];
        }
        var bots = document.querySelectorAll('[data-lb-part="message"][data-lb-author="bot"]');
        var lastBot = bots.length ? bots[bots.length - 1] : null;
        var lastIsRec = !!(lastBot && lastBot.getAttribute('data-qd') === 'demo' && lastOf.rec);
        var tk = document.querySelector('[data-lb-part="takeover"]');
        document.body.classList.toggle('qd-end', !!tk || lastIsRec);
        document.body.classList.toggle('qd-live', !!tk);
        if (tk) {
          if (!tk.hasAttribute('data-qd-seen')) {
            tk.setAttribute('data-qd-seen', '1');
            /* v4 does not scroll the takeover line into view: bring the thread to its end */
            var sc = tk.closest('.overflow-y-auto');
            var toEnd = function () { try { if (sc) sc.scrollTop = sc.scrollHeight; } catch (e) {} };
            setTimeout(toEnd, 60); setTimeout(toEnd, 500);
          }
          var title = tk.querySelector('[data-lb-part="takeover-title"]');
          var img = tk.querySelector('[data-lb-part="takeover-avatar"] img');
          var name = img ? (img.getAttribute('alt') || '').trim() : '';
          if (title && name && title.getAttribute('data-qd-name') !== name) title.setAttribute('data-qd-name', name);
          for (var n = 0; n < msgs.length; n++) {
            if (!msgs[n].getAttribute('data-qd') && (tk.compareDocumentPosition(msgs[n]) & Node.DOCUMENT_POSITION_FOLLOWING)) {
              msgs[n].setAttribute('data-qd', 'agent'); st.agent++;
            }
          }
        }

        var inputs = document.querySelectorAll('[data-lb-part="input-field"] > input, [data-lb-part="input-field"] > textarea');
        for (var q = 0; q < inputs.length; q++) {
          if (inputs[q].getAttribute('placeholder') !== 'Write a reply') inputs[q].setAttribute('placeholder', 'Write a reply');
        }
        /* a new question's field gets the focus, so the visitor can type straight away (fine pointers only: no phone keyboard pop) */
        var cur = inputs[0] || null;
        if (cur && cur !== lastInput && !cur.disabled) {
          lastInput = cur;
          if (fine && document.activeElement !== cur) setTimeout(function () { try { if (!cur.disabled) cur.focus({ preventScroll: true }); } catch (e) {} }, 80);
        }
      } catch (e) { st.err = String(e && e.message || e); }
      busy = false;
    }

    var queued = false;
    var mo = new MutationObserver(function () {
      if (busy || queued) return;
      queued = true;
      requestAnimationFrame(function () { queued = false; run(); });
    });
    function start() { run(); mo.observe(document.body, { childList: true, subtree: true }); }
    if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
  } catch (e) { window.__qdHandoffErr = String(e && e.message || e); }
})();
