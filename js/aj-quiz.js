/* Daily Quiz — turns the static bundle card into a working prototype.
   3 questions, 3 options each. Click an option: correct = green check in the black
   strip cell, wrong = red cross; upcoming cells stay grey. Click advances to the next
   question. After Q3: confetti + a share button.

   The quiz is a minified React bundle we can't drive, so we take over its option list
   (replace its nodes with ours) and manage state ourselves. We never touch React state,
   so it won't re-render over us; a short mount loop re-asserts in case it renders late. */
(function () {
  'use strict';

  var REDUCED = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var QUESTIONS = [
    { q: 'Who won the Golden Boot at the 2022 FIFA World Cup?',
      opts: ['Kylian Mbappé', 'Lionel Messi', 'Julián Álvarez'], correct: 0 },
    { q: 'Which country won the 2022 FIFA World Cup?',
      opts: ['France', 'Argentina', 'Croatia'], correct: 1 },
    { q: 'Which stadium hosted the final match of the 2022 FIFA World Cup in Qatar?',
      opts: ['Lusail Stadium', 'Ahmed Bin Ali Stadium', 'Education City Stadium'], correct: 0 }
  ];
  var LETTERS = ['A', 'B', 'C'];
  var GREEN = '#16b981', RED = '#ef4444', GREY = '#3b3b3b';

  var CSS = [
    '.ajq-opt{display:flex;align-items:center;gap:16px;padding:17px 20px;background:#fff;border:1px solid #ddd;cursor:pointer;transition:border-color .15s,background .15s;width:100%;text-align:left;font:inherit}',
    '.ajq-opt:hover:not(.ajq-locked){border-color:#141414}',
    '.ajq-opt .ajq-l{font-size:14px;font-weight:700;color:#9a9a9a;flex:none;width:14px}',
    '.ajq-opt .ajq-t{font-size:16px;color:#141414}',
    '.ajq-opt.ajq-right{border-color:' + GREEN + ';background:rgba(22,185,129,.12)}',
    '.ajq-opt.ajq-right .ajq-l{color:' + GREEN + '}',
    '.ajq-opt.ajq-wrong{border-color:' + RED + ';background:rgba(239,68,68,.10)}',
    '.ajq-opt.ajq-wrong .ajq-l{color:' + RED + '}',
    '.ajq-opt.ajq-locked{cursor:default}',
    '.ajq-mark{margin-left:auto;width:20px;height:20px;flex:none}',

    '.ajq-cell{display:flex!important;align-items:center;justify-content:center;transition:background .3s ease}',
    '.ajq-cell svg{width:11px;height:11px;opacity:0;transform:scale(.5);transition:opacity .3s ease,transform .3s cubic-bezier(.34,1.56,.64,1)}',
    '.ajq-cell.on svg{opacity:1;transform:none}',

    '.ajq-done{display:flex;flex-direction:column;gap:18px;animation:ajqFade .5s ease both}',
    '.ajq-done h3{margin:0;font:700 30px/1.2 "Source Serif 4",Georgia,serif;color:#141414}',
    '.ajq-done .ajq-score{font-size:17px;color:#6e6e6e}',
    '.ajq-done .ajq-score b{color:#141414}',
    '.ajq-actions{display:flex;gap:12px;margin-top:4px}',
    '.ajq-btn{display:inline-flex;align-items:center;gap:8px;border:0;cursor:pointer;font:600 14px/1 inherit;padding:13px 20px}',
    '.ajq-share{background:#141414;color:#fff}',
    '.ajq-again{background:#fff;color:#141414;border:1px solid #ddd}',
    '@keyframes ajqFade{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}',

    '.ajq-toast{position:fixed;left:50%;bottom:34px;transform:translateX(-50%) translateY(10px);background:#141414;color:#fff;padding:12px 18px;font-size:13.5px;z-index:100000;opacity:0;transition:opacity .3s ease,transform .3s ease;pointer-events:none}',
    '.ajq-toast.on{opacity:1;transform:translateX(-50%) translateY(0)}',
    '.ajq-confetti{position:absolute;inset:0;pointer-events:none;z-index:5}',
    '@media (prefers-reduced-motion: reduce){.ajq-opt,.ajq-cell,.ajq-cell svg,.ajq-done{transition:none;animation:none}}'
  ].join('\n');

  function addStyle() {
    if (document.getElementById('ajq-style')) return;
    var st = document.createElement('style'); st.id = 'ajq-style'; st.textContent = CSS;
    document.head.appendChild(st);
  }

  var CHECK = '<svg viewBox="0 0 24 24" fill="none"><path d="M5 12.5l4.5 4.5L19 7" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  var CROSS = '<svg viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="#fff" stroke-width="3" stroke-linecap="round"/></svg>';

  function tpl(n) { return document.querySelector('[data-dc-tpl="' + n + '"]'); }
  // Progress-cell tpl ids can collide with non-cell elements in the compiled
  // template (e.g. the aside gets the same id as a SPAN quiz progress cell),
  // so quiz cells are located specifically as SPANs.
  function cellTpl(n) {
    var nodes = document.querySelectorAll('[data-dc-tpl="' + n + '"]');
    for (var i = 0; i < nodes.length; i++) if (nodes[i].tagName === 'SPAN') return nodes[i];
    return null;
  }

  /* Daily-Quiz mosaic icon — replaces the bundle's broken one. Black grid bg with
     inset cells so the gaps read as clean gridlines; purple + white cells, one black. */
  var QUIZ_ICON = (function () {
    var P = '#BE6BD0', W = '#ffffff';
    var grid = [
      [P, P, W, P],
      [P, P, P, W],
      [W, P, W, P],
      [null, W, P, P]   // null = black cell (bg shows)
    ];
    var cells = '';
    for (var r = 0; r < 4; r++) for (var c = 0; c < 4; c++) {
      var col = grid[r][c]; if (!col) continue;
      cells += '<rect x="' + (8 + c * 7.5 + 0.7).toFixed(2) + '" y="' + (8 + r * 7.5 + 0.7).toFixed(2) +
        '" width="6.1" height="6.1" fill="' + col + '"/>';
    }
    return '<svg width="46" height="46" viewBox="0 0 46 46" fill="none" data-aj-quizicon="1">' +
      '<rect x="2.5" y="2.5" width="41" height="41" rx="7" fill="#141414" stroke="#141414" stroke-width="3"/>' +
      '<rect x="8" y="8" width="30" height="30" fill="#141414"/>' + cells + '</svg>';
  })();

  function fixQuizIcon() {
    var svg = document.querySelector('svg[data-dc-tpl="32"]:not([data-aj-done])');
    if (!svg) return;
    var wrap = document.createElement('span');
    wrap.setAttribute('data-aj-done', '1');
    wrap.style.cssText = 'display:inline-flex;flex:none';
    wrap.innerHTML = QUIZ_ICON;
    svg.parentNode.replaceChild(wrap, svg);
  }

  var state = { i: 0, results: [null, null, null], locked: false };

  function cells() { return [cellTpl(126), cellTpl(127), cellTpl(128)]; }

  function paintCells() {
    cells().forEach(function (c, idx) {
      if (!c) return;
      c.classList.add('ajq-cell');
      var res = state.results[idx];
      // the bundle styles these cells with !important, so override at the same weight
      var bg = res === true ? GREEN : res === false ? RED : GREY;
      c.style.setProperty('background', bg, 'important');
      c.innerHTML = res === true ? CHECK : res === false ? CROSS : '';
      // animate in
      if (res !== null) requestAnimationFrame(function () { c.classList.add('on'); });
      else c.classList.remove('on');
    });
  }

  function renderQuestion() {
    var Q = QUESTIONS[state.i];
    var label = tpl(59), qEl = tpl(60), optWrap = tpl(61);
    if (!label || !qEl || !optWrap) return false;
    label.textContent = 'Question ' + (state.i + 1) + '/3';
    qEl.textContent = Q.q;

    optWrap.innerHTML = '';
    state.locked = false;
    Q.opts.forEach(function (text, oi) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'ajq-opt';
      b.innerHTML = '<span class="ajq-l">' + LETTERS[oi] + '</span><span class="ajq-t">' + text + '</span>';
      b.addEventListener('click', function () { choose(oi, b, optWrap, Q); });
      optWrap.appendChild(b);
    });
    return true;
  }

  function choose(oi, btn, wrap, Q) {
    if (state.locked) return;
    state.locked = true;
    var right = oi === Q.correct;
    state.results[state.i] = right;

    [].slice.call(wrap.children).forEach(function (b) { b.classList.add('ajq-locked'); });
    if (right) {
      btn.classList.add('ajq-right');
      btn.insertAdjacentHTML('beforeend', '<span class="ajq-mark">' + tick(GREEN) + '</span>');
    } else {
      btn.classList.add('ajq-wrong');
      btn.insertAdjacentHTML('beforeend', '<span class="ajq-mark">' + tick(RED, true) + '</span>');
      // reveal the correct one
      var correctBtn = wrap.children[Q.correct];
      if (correctBtn) correctBtn.classList.add('ajq-right');
    }
    paintCells();

    setTimeout(function () {
      state.i++;
      if (state.i < QUESTIONS.length) renderQuestion();
      else finish();
    }, REDUCED ? 250 : 950);
  }

  function tick(color, cross) {
    var d = cross ? 'M6 6l12 12M18 6L6 18' : 'M5 12.5l4.5 4.5L19 7';
    return '<svg viewBox="0 0 24 24" width="20" height="20" fill="none"><circle cx="12" cy="12" r="11" fill="' + color + '"/><path d="' + d + '" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  }

  function finish() {
    var score = state.results.filter(Boolean).length;
    var col = tpl(58);        // question column
    var section = tpl(29);
    if (col) {
      col.innerHTML =
        '<div class="ajq-done">' +
          '<h3>Nicely done! 🎉</h3>' +
          '<div class="ajq-score">You scored <b>' + score + ' / 3</b> on today’s Daily Quiz.</div>' +
          '<div class="ajq-actions">' +
            '<button type="button" class="ajq-btn ajq-share">Share result</button>' +
            '<button type="button" class="ajq-btn ajq-again">Play again</button>' +
          '</div>' +
        '</div>';
      col.querySelector('.ajq-share').addEventListener('click', function () { share(score); });
      col.querySelector('.ajq-again').addEventListener('click', function () {
        state = { i: 0, results: [null, null, null], locked: false };
        paintCells(); renderQuestion();
      });
    }
    if (section && !REDUCED) confetti(section);
  }

  function share(score) {
    var text = 'I scored ' + score + '/3 on the Al Jazeera Daily Quiz 🗞️⚽';
    if (navigator.share) { navigator.share({ text: text }).catch(function () {}); return; }
    if (navigator.clipboard) navigator.clipboard.writeText(text).catch(function () {});
    toast('Result copied to clipboard');
  }

  function toast(msg) {
    var t = document.createElement('div');
    t.className = 'ajq-toast'; t.textContent = msg;
    document.body.appendChild(t);
    requestAnimationFrame(function () { t.classList.add('on'); });
    setTimeout(function () { t.classList.remove('on'); setTimeout(function () { t.remove(); }, 350); }, 2200);
  }

  /* ---- confetti (self-contained canvas, no lib) ---- */
  function confetti(host) {
    var cv = document.createElement('canvas');
    cv.className = 'ajq-confetti';
    var r = host.getBoundingClientRect();
    var DPR = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = r.width * DPR; cv.height = r.height * DPR;
    cv.style.width = r.width + 'px'; cv.style.height = r.height + 'px';
    if (getComputedStyle(host).position === 'static') host.style.position = 'relative';
    host.appendChild(cv);
    var ctx = cv.getContext('2d'); ctx.scale(DPR, DPR);

    var cols = ['#16b981', '#3563e9', '#f5c64c', '#ef304a', '#BE6BD0', '#37c5e0'];
    var P = [];
    for (var i = 0; i < 150; i++) {
      P.push({
        x: r.width * (0.35 + Math.random() * 0.3), y: r.height * 0.5,
        vx: (Math.random() - 0.5) * 9, vy: -6 - Math.random() * 9,
        g: 0.22 + Math.random() * 0.12,
        s: 5 + Math.random() * 6, rot: Math.random() * 6.28, vr: (Math.random() - 0.5) * 0.3,
        c: cols[i % cols.length], life: 1
      });
    }
    var t0 = performance.now();
    (function frame(now) {
      var el = now - t0;
      ctx.clearRect(0, 0, r.width, r.height);
      var alive = false;
      P.forEach(function (p) {
        p.vy += p.g; p.x += p.vx; p.y += p.vy; p.rot += p.vr;
        if (el > 1400) p.life -= 0.03;
        if (p.life <= 0 || p.y > r.height + 30) return;
        alive = true;
        ctx.save(); ctx.globalAlpha = Math.max(0, p.life);
        ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillStyle = p.c;
        ctx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * 0.6);
        ctx.restore();
      });
      if (alive && el < 4000) requestAnimationFrame(frame);
      else cv.remove();
    })(t0);
  }

  /* ---- mount ---- */
  function tryMount() {
    fixQuizIcon();
    if (!tpl(61) || !cellTpl(126)) return false;
    var section = tpl(29);
    if (!section || section.getAttribute('data-ajq')) return true;
    section.setAttribute('data-ajq', '1');
    addStyle();
    paintCells();
    renderQuestion();
    return true;
  }

  /* Deep link: aljazeera-games.html#crossword opens the Mini Crossword instead
     of the Daily Quiz. The React bundle only switches views through its own
     "PLAY →" CTA (openXword), so we click that once it mounts. */
  function openCrosswordFromHash() {
    var deep = (location.hash === '#crossword') || (window.__AJ_HASH === '#crossword');
    var releaseMask = function () {
      // aljazeera-games.html adds this attribute early to hide the initial
      // render; once the requested view is up we drop it so the page fades
      // in as one clean state.
      document.documentElement.removeAttribute('data-cw-load');
    };
    var n = 0, iv = setInterval(function () {
      if (++n > 60) { clearInterval(iv); releaseMask(); return; }
      /* innerText = rendered text only (script source would false-positive) */
      var body = document.body.innerText || '';
      var quizShowing = /question \d\/3/i.test(body);
      if (!deep) {
        // Plain quiz load: fade in as soon as the quiz view has rendered.
        if (quizShowing) { clearInterval(iv); releaseMask(); }
        return;
      }
      var crosswordShowing = /across/i.test(body) && /down/i.test(body) && /check/i.test(body);
      if (crosswordShowing) { clearInterval(iv); releaseMask(); return; }
      if (!quizShowing) return; // either not mounted yet, or already switched
      var cta = [].filter.call(document.querySelectorAll('div'), function (el) {
        return el.children.length <= 2 && /^PLAY\s*→$/.test((el.innerText || '').trim());
      }).pop();
      if (!cta) return;
      cta.click(); // keep retrying until the quiz view actually goes away
    }, 120);
  }

  /* The bundle's DC logic sometimes dies mid-render (its nested JSON unpack
     throws), leaving the static template: the question column shows only
     "Question 1/3" with no option scaffold, so tryMount() waits forever and
     the card looks stuck loading. After ~2s of that, build the scaffold
     ourselves inside the question column and let the normal takeover run. */
  function buildFallback() {
    if (tpl(61)) return false;                 // real scaffold arrived after all
    var host = tpl(59);
    if (!host || host.getAttribute('data-ajq-fb')) return false;
    host.setAttribute('data-ajq-fb', '1');

    /* free up the ids the takeover queries: 58 = score-card column, 29 = section */
    var art = tpl(58);
    if (art) art.removeAttribute('data-dc-tpl');
    if (!tpl(29)) {
      var sec = tpl(54) || host.parentElement;
      if (sec) sec.setAttribute('data-dc-tpl', '29');
    }
    host.setAttribute('data-dc-tpl', '58');

    host.innerHTML = '';
    host.style.display = 'flex';
    host.style.flexDirection = 'column';
    host.style.gap = '18px';

    var head = document.createElement('div');
    head.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:16px';
    var label = document.createElement('div');
    label.setAttribute('data-dc-tpl', '59');
    label.style.cssText = 'font:600 13px/1 Anybody,Arial,sans-serif;letter-spacing:.4px;color:#9a9a9a;text-transform:uppercase';
    var strip = document.createElement('div');
    strip.style.cssText = 'display:flex;gap:6px';
    [126, 127, 128].forEach(function (n) {
      var c = document.createElement('span');
      c.setAttribute('data-dc-tpl', String(n));
      c.style.cssText = 'width:26px;height:26px;flex:none';
      strip.appendChild(c);
    });
    head.appendChild(label);
    head.appendChild(strip);

    var q = document.createElement('h3');
    q.setAttribute('data-dc-tpl', '60');
    q.style.cssText = 'margin:0;font:700 26px/1.3 "Source Serif 4",Georgia,serif;color:#141414';

    var opts = document.createElement('div');
    opts.setAttribute('data-dc-tpl', '61');
    opts.style.cssText = 'display:flex;flex-direction:column;gap:10px;width:100%';

    host.appendChild(head);
    host.appendChild(q);
    host.appendChild(opts);
    return true;
  }

  /* "Mounted" must mean the options are really on screen: after the bundle's
     document.write pass the section can carry a stale data-ajq marker from the
     pre-write run, making tryMount() report success without ever rendering. */
  function mounted() {
    return !!document.querySelector('.ajq-opt') || !!document.querySelector('.ajq-done');
  }

  function init() {
    openCrosswordFromHash();
    tryMount();
    if (mounted()) return;
    var n = 0, iv = setInterval(function () {
      tryMount();
      if (mounted()) return clearInterval(iv);
      if (++n === 10) {                          // ~2s: bundle logic is dead, self-serve
        buildFallback();
        var sec = tpl(29);
        if (sec) sec.removeAttribute('data-ajq'); // clear stale marker so tryMount re-runs
        tryMount();
        if (mounted()) return clearInterval(iv);
      }
      if (n > 40) clearInterval(iv);
    }, 200);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
