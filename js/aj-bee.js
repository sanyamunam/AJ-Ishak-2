/* THE SPELLING BEE — Al Jazeera Games Desk.
   Engine + full journey: editorial cover → play → quiet celebrations →
   retention (streak, desk tips, guest preview gate, share, next-puzzle countdown).
   Presentation follows the site's design system; every animation answers an
   interaction. State persists in localStorage. No dependencies. */
(function () {
  'use strict';

  /* ---------------- puzzle ---------------- */
  var CENTER = 'L';
  var OUTER = ['A', 'D', 'E', 'H', 'I', 'N'];
  var WORDS = [
    'DALE', 'DEAL', 'DELI', 'DELL', 'DIAL', 'DILL', 'ELAN', 'HAIL', 'HALE', 'HALL',
    'HEAL', 'HEEL', 'HELD', 'HELL', 'HILL', 'IDLE', 'LADE', 'LAID', 'LAIN', 'LAND',
    'LANE', 'LEAD', 'LEAN', 'LEND', 'LIED', 'LIEN', 'LINE', 'NAIL',
    'AILED', 'ALIEN', 'ELAND', 'IDEAL', 'LADEN', 'LADLE', 'LANAI', 'LIANA', 'LINEN',
    'ALLIED', 'ANNEAL', 'DAHLIA', 'DANDLE', 'DENIAL', 'HAILED', 'HALIDE', 'HANDLE',
    'HEALED', 'HEELED', 'INLAID', 'INLAND', 'LEADEN', 'LEANED', 'LINEAL', 'NAILED', 'NEEDLE',
    'ANILINE', 'ANNELID', 'DALLIED', 'DANDLED', 'HANDLED', 'INHALED', 'NEEDLED',
    'ANNEALED', 'DEADLINE', 'HANDHELD', 'HANDLINE', 'HEADLAND', 'HEADLINE', 'HEADLINED'
  ];
  var ALL = {};
  WORDS.forEach(function (w) { ALL[w] = 1; });
  function isPangram(w) {
    var seen = {}, n = 0;
    for (var i = 0; i < w.length; i++) if (!seen[w[i]]) { seen[w[i]] = 1; n++; }
    return n === 7;
  }
  function scoreOf(w) { return (w.length === 4 ? 1 : w.length) + (isPangram(w) ? 7 : 0); }
  var MAX = WORDS.reduce(function (s, w) { return s + scoreOf(w); }, 0);
  var PANGRAM_COUNT = WORDS.filter(isPangram).length;

  /* the masthead ladder */
  var RANKS = [
    { p: 0,  n: 'Newcomer' },
    { p: 2,  n: 'Stringer' },
    { p: 5,  n: 'Cub Reporter' },
    { p: 8,  n: 'Reporter' },
    { p: 15, n: 'Correspondent' },
    { p: 25, n: 'Foreign Desk' },
    { p: 40, n: 'Anchor' },
    { p: 55, n: 'Bureau Chief' },
    { p: 70, n: 'Editor-in-Chief' }
  ];
  RANKS.forEach(function (r) { r.pts = Math.round(MAX * r.p / 100); });

  /* ---------------- state ---------------- */
  var KEY = 'ajbee-v1';
  function today() { return new Date().toISOString().slice(0, 10); }
  function puzzleNo() {
    var d0 = new Date('2026-01-01'), d1 = new Date(today());
    return Math.round((d1 - d0) / 864e5) + 1;
  }
  var S;
  function load() {
    try { S = JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { S = {}; }
    S.history = S.history || {};
    S.streak = S.streak || 0;
    if (S.day !== today()) {
      S.day = today();
      S.found = [];
      S.tipsLeft = 3;
      S.slips = [];
      S.celebrated = {};
    }
    S.found = S.found || [];
    S.slips = S.slips || [];
    S.celebrated = S.celebrated || {};
    if (S.tipsLeft === undefined) S.tipsLeft = 3;
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }

  function score() { return S.found.reduce(function (s, w) { return s + scoreOf(w); }, 0); }
  function rankIdx(pts) {
    var i = 0;
    for (var r = 0; r < RANKS.length; r++) if (pts >= RANKS[r].pts) i = r;
    return i;
  }

  /* ---------------- els ---------------- */
  function $(id) { return document.getElementById(id); }
  var cover = $('bee-cover'), game = $('bee-game');
  var entry = $('entry'), caseEl = $('dial');
  var toastLane = $('toast-lane'), confetti = $('confetti');
  var veil = $('veil'), modal = $('modal');
  var typed = '';
  var REDUCE = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function esc(t) { return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function cap(w) { return w[0] + w.slice(1).toLowerCase(); }

  /* ---------------- cover ---------------- */
  function fmtDate() {
    return new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  }
  function nextPuzzleClock() {
    var now = new Date(), mid = new Date(now); mid.setHours(24, 0, 0, 0);
    var s = Math.max(0, Math.floor((mid - now) / 1000));
    var h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60);
    return h + 'h ' + (m < 10 ? '0' : '') + m + 'm';
  }
  function buildCover() {
    $('head-meta').textContent = fmtDate() + ' · No. ' + puzzleNo() + ' · Set by the Games Desk';
    $('c2-words').textContent = WORDS.length;
    $('c2-no').textContent = 'No. ' + puzzleNo();
    // countdown to the next edition, kept fresh while the cover is up
    var cd = $('c2-countdown');
    cd.textContent = nextPuzzleClock();
    var cdTimer = setInterval(function () {
      if (cover.hidden) { clearInterval(cdTimer); return; }
      cd.textContent = nextPuzzleClock();
    }, 30000);
    // one-time spill: the scatter tiles settle into place, staggered
    var bits = [].slice.call(cover.querySelectorAll('.c3-scatter .st'));
    bits.forEach(function (b, i) {
      setTimeout(function () { b.classList.add('in'); }, REDUCE ? 0 : 200 + i * 55);
    });
    // mid-hunt return: the CTA acknowledges progress, nothing else does
    if (S.found.length) $('cover-play').firstChild.textContent = 'Continue';
    $('cover-play').addEventListener('click', enterGame);
    $('cover-signin').addEventListener('click', openSignIn);
  }
  function enterGame() {
    cover.classList.add('is-out');
    setTimeout(function () {
      cover.hidden = true; cover.style.display = 'none';
      game.hidden = false;
      buildGame();
    }, REDUCE ? 0 : 340);
  }

  /* ---------------- game build ---------------- */
  var order;
  var gameBuilt = false;
  function buildGame() {
    if (gameBuilt) return;
    gameBuilt = true;
    order = OUTER.slice();
    buildCase();
    buildRankTrack();
    renderAll();
    $('key-del').addEventListener('click', function () { backspace(); });
    $('key-enter').addEventListener('click', submit);
    $('key-shuffle').addEventListener('click', shuffle);
    $('tips-btn').addEventListener('click', useTip);
    $('streak-chip').addEventListener('click', openStats);
    $('game-signin').addEventListener('click', openSignIn);
    document.addEventListener('keydown', onKey);
  }

  /* letter case: crossword-fragment rows (2 · 3 · 2), centre tile in the middle.
     Slot order maps outer letters to positions [0,1] [2,·,3] [4,5]. */
  function buildCase() {
    caseEl.innerHTML = '';
    var rows = [[0, 1], [2, -1, 3], [4, 5]];
    rows.forEach(function (slots) {
      var row = document.createElement('div');
      row.className = 'row';
      slots.forEach(function (slot) {
        var t = document.createElement('button');
        t.type = 'button';
        t.className = 'tile' + (slot === -1 ? ' center' : '');
        if (slot === -1) {
          t.textContent = CENTER;
          t.addEventListener('click', function () { press(CENTER, t); });
        } else {
          t.setAttribute('data-slot', slot);
          t.textContent = order[slot];
          t.addEventListener('click', function () { press(t.textContent, t); });
        }
        row.appendChild(t);
      });
      caseEl.appendChild(row);
    });
  }
  /* shuffle re-deals the letters in place — a brief fade, no travelling motion */
  function shuffle() {
    for (var i = order.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1)), tmp = order[i]; order[i] = order[j]; order[j] = tmp;
    }
    [].slice.call(caseEl.querySelectorAll('.tile[data-slot]')).forEach(function (t) {
      t.textContent = order[+t.getAttribute('data-slot')];
      t.classList.remove('swap'); void t.offsetWidth; t.classList.add('swap');
    });
  }

  /* ---------------- input ---------------- */
  function renderEntry() {
    var html = '';
    for (var i = 0; i < typed.length; i++) {
      html += '<span class="ch' + (typed[i] === CENTER ? ' req' : '') + '">' + typed[i].toLowerCase() + '</span>';
    }
    entry.innerHTML = html + '<span class="caret"></span>';
  }
  /* No scripted press animation: pointer taps get feedback from the tiles'
     CSS :active state, and keyboard entry stays animation-free — typing is
     a hundreds-of-times-a-day action. */
  function press(L) {
    if (typed.length >= 16) return;
    typed += L;
    renderEntry();
  }
  function backspace() { typed = typed.slice(0, -1); renderEntry(); }
  function onKey(e) {
    if (!veil.hidden) { if (e.key === 'Escape') closeModal(); return; }
    if (game.hidden) return;
    var k = e.key.toUpperCase();
    if (k === 'BACKSPACE') { backspace(); e.preventDefault(); }
    else if (k === 'ENTER') submit();
    else if (k === ' ') { shuffle(); e.preventDefault(); }
    else if (/^[A-Z]$/.test(k)) {
      if (k === CENTER) press(k, caseEl.querySelector('.center'));
      else if (OUTER.indexOf(k) > -1) {
        var tile = [].slice.call(caseEl.querySelectorAll('.tile[data-slot]')).filter(function (t) { return t.textContent === k; })[0];
        press(k, tile);
      } else flashEntry();
    }
  }
  function flashEntry() {
    entry.classList.remove('shake'); void entry.offsetWidth; entry.classList.add('shake');
  }

  /* ---------------- submit + feedback ---------------- */
  function toast(txt, cls) {
    var t = document.createElement('div');
    t.className = 'toast' + (cls ? ' ' + cls : '');
    t.textContent = txt;
    toastLane.appendChild(t);
    setTimeout(function () { t.remove(); }, 2100);
  }
  function burst(n) {
    if (REDUCE) return;
    var colors = ['#fa9000', '#111118', '#ff435f', '#e8b53a'];
    for (var i = 0; i < n; i++) {
      var c = document.createElement('i');
      c.style.left = (8 + Math.random() * 84) + '%';
      c.style.setProperty('--c', colors[i % colors.length]);
      c.style.setProperty('--dur', (1.6 + Math.random() * 1.2) + 's');
      c.style.setProperty('--dx', Math.round(-50 + Math.random() * 100) + 'px');
      confetti.appendChild(c);
      (function (el) { setTimeout(function () { el.remove(); }, 3000); })(c);
    }
  }

  /* Guests get a taste — three words on the house — then the desk asks them
     to sign in to keep filing. AJ is a login product: the wall is an account,
     never a paywall. */
  var FREE_WORDS = 3;
  function openGate() {
    openModal(
      '<p class="mkick">You’re on a roll</p>' +
      '<h3>Sign in to keep playing</h3>' +
      '<p class="msub">Your first three words are on the house. A free Al Jazeera account keeps your streak, rank and record — here and on every device.</p>' +
      '<input class="minput" id="signin-name" placeholder="Your name" maxlength="24" autocomplete="off">' +
      '<div class="mrow"><button class="aj-btn aj-btn-gold" data-dosign="1">Sign in — it’s free</button>' +
      '<button class="aj-link" data-x="1">Not now</button></div>'
    );
    setTimeout(function () { var i = $('signin-name'); if (i) i.focus(); }, 60);
  }

  function submit() {
    if (!typed) return;
    if (!S.user && S.found.length >= FREE_WORDS) { typed = ''; renderEntry(); openGate(); return; }
    var w = typed;
    typed = ''; renderEntry();
    if (w.length < 4) return reject('Too short');
    if (w.indexOf(CENTER) === -1) return reject('Missing the ' + CENTER);
    for (var i = 0; i < w.length; i++) {
      if (w[i] !== CENTER && OUTER.indexOf(w[i]) === -1) return reject('Stray letters');
    }
    if (S.found.indexOf(w) > -1) return reject('Already filed');
    if (!ALL[w]) return reject('Not in the word list');

    var before = rankIdx(score());
    S.found.unshift(w);
    var pts = scoreOf(w), pan = isPangram(w);
    if (S.found.length === 1) {
      var y = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
      S.streak = (S.lastPlayed === y) ? (S.streak || 0) + 1 : 1;
      S.lastPlayed = today();
    }
    S.history[today()] = { pts: score(), rank: RANKS[rankIdx(score())].n };
    save();

    if (pan) {
      toast('Pangram — ' + cap(w) + ' +' + pts, 'gold');
      burst(46);
      caseEl.classList.add('flash');
      setTimeout(function () { caseEl.classList.remove('flash'); }, 900);
    } else {
      toast(cap(w) + ' +' + pts, 'good');
    }

    renderAll();

    var after = rankIdx(score());
    if (after > before) rankUp(after);
    // heads-up just before the gate: the third word closes the free preview
    if (!S.user && S.found.length === FREE_WORDS) {
      setTimeout(function () { if (!S.user) openGate(); }, 850);
    }
  }
  function reject(msg) { toast(msg); flashEntry(); }

  /* ---------------- render ---------------- */
  function buildRankTrack() {
    var tr = $('rank-track');
    tr.innerHTML = '<div class="bar"></div><div class="fill"></div>';
    RANKS.forEach(function (r, i) {
      var n = document.createElement('span');
      n.className = 'node';
      n.style.left = (i / (RANKS.length - 1) * 100) + '%';
      n.title = r.n + ' · ' + r.pts + ' pts';
      tr.appendChild(n);
    });
  }
  function renderAll() {
    var pts = score(), ri = rankIdx(pts);
    $('rank-label').textContent = RANKS[ri].n;
    $('score-label').textContent = pts + ' pts';
    $('streak-n').textContent = S.streak || 0;
    var frac;
    if (ri >= RANKS.length - 1) frac = 1;
    else {
      var a = RANKS[ri].pts, b = RANKS[ri + 1].pts;
      frac = (ri + (pts - a) / Math.max(1, b - a)) / (RANKS.length - 1);
    }
    $('rank-track').querySelector('.fill').style.width = (frac * 100) + '%';
    [].slice.call($('rank-track').querySelectorAll('.node')).forEach(function (n, i) {
      n.classList.toggle('hit', i <= ri);
      n.classList.toggle('now', i === ri);
    });
    $('rank-next').innerHTML = ri >= RANKS.length - 1
      ? 'Top of the masthead — every word from here is a victory lap'
      : 'Next: <b>' + RANKS[ri + 1].n + '</b> at ' + RANKS[ri + 1].pts + ' pts';
    var list = $('found-list');
    list.innerHTML = S.found.map(function (w) {
      return '<li' + (isPangram(w) ? ' class="pan"' : '') + '>' + cap(w) + ' <b>+' + scoreOf(w) + '</b></li>';
    }).join('');
    $('found-count').textContent = S.found.length + ' of ' + WORDS.length;
    $('found-empty').style.display = S.found.length ? 'none' : 'block';
    $('tips-left').textContent = S.tipsLeft;
    $('tips-btn').disabled = !S.tipsLeft;
    $('tips-btn').style.opacity = S.tipsLeft ? '' : '.4';
    $('tips-slips').innerHTML = S.slips.map(function (s) { return '<span class="slip">' + esc(s) + '</span>'; }).join('');
    if (S.user) {
      var b = $('game-signin');
      b.textContent = ''; b.classList.add('is-user');
      b.appendChild(document.createTextNode(S.user));
    }
    if (ri >= RANKS.length - 1 && !S.celebrated.final) { S.celebrated.final = true; save(); setTimeout(openFinale, 900); }
  }

  /* ---------------- desk tips ---------------- */
  function useTip() {
    if (!S.tipsLeft) return;
    var left = WORDS.filter(function (w) { return S.found.indexOf(w) === -1; });
    if (!left.length) return;
    left.sort(function (a, b) { return a.length - b.length || (a < b ? -1 : 1); });
    var w = left[Math.floor(Math.random() * Math.min(left.length, 8))];
    S.tipsLeft--;
    S.slips.push(w.slice(0, 2) + ' ' + new Array(w.length - 1).join('· ') + '(' + w.length + ')');
    save();
    renderAll();
    toast('Tip from the desk', 'good');
  }

  /* ---------------- celebrations ---------------- */
  function rankUp(ri) {
    if (S.celebrated['r' + ri]) return;
    S.celebrated['r' + ri] = true; save();
    if (ri >= RANKS.length - 1) return;
    var pop = document.createElement('div');
    pop.className = 'rank-pop';
    pop.innerHTML = '<i>Promoted</i><b>' + esc(RANKS[ri].n) + '</b>';
    document.body.appendChild(pop);
    setTimeout(function () { pop.classList.add('out'); }, 1700);
    setTimeout(function () { pop.remove(); }, 2200);
  }

  function nextPuzzleIn() {
    var now = new Date(), mid = new Date(now); mid.setHours(24, 0, 0, 0);
    var s = Math.max(0, Math.floor((mid - now) / 1000));
    var h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60);
    return h + 'h ' + (m < 10 ? '0' : '') + m + 'm';
  }
  function openFinale() {
    var pans = S.found.filter(isPangram).length;
    burst(90);
    openModal(
      '<p class="mkick">The masthead is yours</p>' +
      '<h3>Editor-in-Chief</h3>' +
      '<p class="msub">The top rank on the Games Desk. Every word from here is a victory lap.</p>' +
      '<div class="mstats">' +
        '<div><span>Words</span><b>' + S.found.length + '</b></div>' +
        '<div><span>Points</span><b>' + score() + '</b></div>' +
        '<div><span>Pangrams</span><b>' + pans + '</b></div>' +
      '</div>' +
      '<div class="mrow">' +
        '<button class="aj-btn" data-share="1">Share result</button>' +
        '<button class="aj-link" data-x="1">Keep playing</button>' +
      '</div>' +
      '<p class="mcal-cap">Next puzzle in ' + nextPuzzleIn() + '</p>'
    );
  }

  /* ---------------- stats ---------------- */
  function openStats() {
    var days = [], hits = 0;
    for (var i = 13; i >= 0; i--) {
      var d = new Date(Date.now() - i * 864e5).toISOString().slice(0, 10);
      var on = !!S.history[d];
      if (on) hits++;
      days.push('<i' + (on ? ' class="on"' : '') + ' title="' + d + '"></i>');
    }
    var pans = S.found.filter(isPangram).length;
    openModal(
      '<p class="mkick">The Games Desk</p>' +
      '<h3>Your record</h3>' +
      '<p class="msub">' + (S.user ? 'Filed under ' + esc(S.user) + '.' : 'Playing as a guest — sign in to keep this safe.') + '</p>' +
      '<div class="mstats">' +
        '<div><span>Streak</span><b>' + (S.streak || 0) + '</b></div>' +
        '<div><span>Today</span><b>' + score() + ' pts</b></div>' +
        '<div><span>Pangrams</span><b>' + pans + '</b></div>' +
      '</div>' +
      '<div class="mcal">' + days.join('') + '</div>' +
      '<p class="mcal-cap">Last 14 days · ' + hits + ' played</p>' +
      '<div class="mrow">' +
        '<button class="aj-btn" data-share="1">Share today</button>' +
        (S.user ? '' : '<button class="aj-link" data-signin="1">Sign in</button>') +
      '</div>'
    );
  }

  /* ---------------- sign in (login model) ---------------- */
  function openSignIn() {
    if (S.user) { openStats(); return; }
    openModal(
      '<p class="mkick">One account for everything</p>' +
      '<h3>Sign in to Al Jazeera</h3>' +
      '<p class="msub">News, games, streaks and your saved record — free, always.</p>' +
      '<input class="minput" id="signin-name" placeholder="Your name" maxlength="24" autocomplete="off">' +
      '<div class="mrow"><button class="aj-btn aj-btn-gold" data-dosign="1">Sign in</button></div>'
    );
    setTimeout(function () { var i = $('signin-name'); if (i) i.focus(); }, 60);
  }
  function completeSignIn() {
    var i = $('signin-name');
    S.user = ((i && i.value.trim()) || 'Reader').split(' ')[0];
    save();
    closeModal();
    toast('Signed in — streak saved', 'good');
    renderAll();
  }

  /* ---------------- share ---------------- */
  function share() {
    var pans = S.found.filter(isPangram).length;
    var txt = 'Al Jazeera Spelling Bee No. ' + puzzleNo() + ' — ' + RANKS[rankIdx(score())].n +
      ' · ' + S.found.length + ' words · ' + score() + ' pts' +
      (pans ? ' · ' + pans + ' pangram' + (pans > 1 ? 's' : '') : '') +
      (S.streak > 1 ? ' · ' + S.streak + '-day streak' : '');
    var done = function () { toast('Result copied to clipboard', 'good'); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(done, done);
    else done();
  }

  /* ---------------- modal plumbing ---------------- */
  function openModal(html) {
    modal.innerHTML = '<button class="mx" aria-label="Close">✕</button>' + html;
    veil.hidden = false;
  }
  function closeModal() { veil.hidden = true; }
  veil.addEventListener('click', function (e) {
    if (e.target === veil) closeModal();
    var b = e.target.closest('button');
    if (!b) return;
    if (b.classList.contains('mx') || b.hasAttribute('data-x')) closeModal();
    else if (b.hasAttribute('data-share')) share();
    else if (b.hasAttribute('data-signin')) openSignIn();
    else if (b.hasAttribute('data-dosign')) completeSignIn();
  });
  modal.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && $('signin-name')) completeSignIn();
  });

  /* ---------------- boot ---------------- */
  load();
  buildCover();
  save();
})();
