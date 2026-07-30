/* Game splash screens.

   Each game gets a welcome card before it loads: icon, name, one-line pitch,
   Play Now / Sign in, and a live player count. Layout and type come from Figma
   37636:18504; everything game-specific lives in GAMES below, so adding the
   next game is one entry, not another screen.

   The splash covers the game panel only — the section that carries the game's
   own header — so the site chrome and the "Explore other Games" rail stay put.
   Play Now fades it out and reveals the game underneath. */
(function () {
  'use strict';

  var SPLASH_H = 680;        // one height for every game's welcome card

  var GAMES = {
    quiz: {
      match: /^the daily quiz$/i,
      label: 'the daily quiz',
      bg: '#e7c9f2',                 // light aubergine, from the quiz mosaic
      tileInk: '#f2ddf8',
      name: '‘The Daily Quiz’',
      blurb: ['Three questions from today’s front page.', 'Answer before tomorrow’s edition lands.'],
      faces: [
        { ch: 'A', bg: '#7631bf' },
        { ch: 'J', bg: '#547f64' },
        { ch: 'R', bg: '#a8af26' }
      ],
      players: '1,204 people playing right now',
      /* the bundle's own quiz mosaic, redrawn at splash size */
      icon: '<svg viewBox="0 0 46 46" width="86" height="86" aria-hidden="true">' +
            '<rect x="0" y="0" width="46" height="46" fill="#ffffff"/>' +
            '<rect x="3" y="6" width="40" height="34" rx="3" fill="#fff" stroke="#141414" stroke-width="2.5"/>' +
            '<rect x="8" y="11" width="11" height="8" fill="#C97FD9"/>' +
            '<rect x="19" y="11" width="9" height="8" fill="#E3B1EE"/>' +
            '<rect x="8" y="19" width="7" height="8" fill="#E3B1EE"/>' +
            '<rect x="15" y="19" width="13" height="8" fill="#C97FD9"/>' +
            '<rect x="8" y="27" width="12" height="8" fill="#C97FD9"/>' +
            '<rect x="28" y="11" width="10" height="16" fill="#F2DDF8" stroke="#141414" stroke-width="1.5"/>' +
            '<rect x="20" y="27" width="18" height="8" fill="#E3B1EE" stroke="#141414" stroke-width="1.5"/>' +
            '</svg>',
      loop: { kind: 'bar', steps: 3 }        // three questions, one current
    },

    crossword: {
      match: /^the mini crossword$/i,
      label: 'the mini crossword',
      bg: '#cfe0f2',                 // pale newsprint blue
      name: '‘The Mini Crossword’',
      blurb: ['A small grid, cut from today’s pages.', 'Five across, five down, a few minutes.'],
      faces: [
        { ch: 'M', bg: '#2f5d8c' },
        { ch: 'K', bg: '#547f64' },
        { ch: 'S', bg: '#a8af26' }
      ],
      players: '862 people playing right now',
      icon: '<svg viewBox="0 0 46 46" width="86" height="86" aria-hidden="true">' +
            '<rect x="0" y="0" width="46" height="46" fill="#fff"/>' +
            '<rect x="5" y="8" width="36" height="30" fill="#fff" stroke="#141414" stroke-width="2.5"/>' +
            '<rect x="5" y="8" width="12" height="10" fill="#141414"/>' +
            '<rect x="29" y="28" width="12" height="10" fill="#141414"/>' +
            '<rect x="17" y="18" width="12" height="10" fill="#9EC2E5"/>' +
            '<path d="M17 8v30M29 8v30M5 18h36M5 28h36" stroke="#141414" stroke-width="1.5"/>' +
            '</svg>',
      loop: { kind: 'cells', steps: 5 }      // a cursor stepping across the row
    },

    bee: {
      match: /^the spelling bee$/i,
      label: 'spelling bee',
      panel: '.bee-main',            // its own page, not a bundle section
      bg: '#fae16a',                 // straight from the Figma splash
      name: '‘Spelling Bee’',
      blurb: ['Seven letters. One hive.', 'Find every word before it closes.'],
      faces: [
        { ch: 'A', bg: '#7631bf' },
        { ch: 'J', bg: '#547f64' },
        { ch: 'R', bg: '#a8af26' }
      ],
      players: '1,204 people playing right now',
      icon: '<img src="assets/Spelling%20Bee.png" alt="">',
      loop: { kind: 'hive', steps: 7 },      // seven letters, lighting in turn
      // the page has its own cover behind the splash — go straight to the game
      play: function (panel) {
        var btn = panel.querySelector('#cover-play');
        if (btn) btn.click();
      }
    }
  };

  function ensureCss() {
    if (document.querySelector('link[href*="aj-splash.css"]')) return;
    var l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = 'css/aj-splash.css?v=1';
    document.head.appendChild(l);
  }



  function build(game) {
    var el = document.createElement('div');
    el.className = 'aj-splash';
    el.style.setProperty('--sp-bg', game.bg);
    el.style.setProperty('--sp-tile-ink', game.tileInk);
    el.innerHTML =
      '<span class="sp-dome" aria-hidden="true"></span>' +
      '<div class="sp-loop sp-loop--' + game.loop.kind + ' sp-n' + game.loop.steps + '" aria-hidden="true">' +
        new Array(game.loop.steps + 1).join('<span class="sp-step"></span>') +
      '</div>' +
      '<div class="sp-body">' +
        '<div class="sp-top">' +
          '<div class="sp-mark">' +
            '<div class="sp-icon">' + game.icon + '</div>' +
            '<div class="sp-titles">' +
              '<p class="sp-kicker">Welcome to</p>' +
              '<p class="sp-name">' + game.name + '</p>' +
            '</div>' +
          '</div>' +
          '<p class="sp-blurb">' + game.blurb.join('<br>') + '</p>' +
        '</div>' +
        '<div class="sp-actions">' +
          '<div class="sp-buttons">' +
            '<button class="sp-btn sp-play" type="button">' +
              '<img src="assets/splash/play.svg" alt="">Play Now</button>' +
            '<a class="sp-btn sp-signin" href="aljazeera-signin.html">' +
              '<img src="assets/splash/user.svg" alt="">Sign in</a>' +
          '</div>' +
          '<span class="sp-streak"><img src="assets/splash/bolt.svg" alt="">' +
            'Sign in to keep your daily streak.</span>' +
        '</div>' +
        '<div class="sp-social">' +
          '<span class="sp-faces">' +
            game.faces.map(function (f) {
              return '<span style="background:' + f.bg + '">' + f.ch + '</span>';
            }).join('') +
          '</span>' +
          '<span class="sp-count">' + game.players + '</span>' +
        '</div>' +
      '</div>';
    return el;
  }

  /* The panel the hub renders a game into. Found by looking for a section that
     carries a game's title in its own header — never the "Explore other Games"
     rail, which lists every game's name and would otherwise be mistaken for the
     game on screen. */
  function gameSection() {
    var secs = [].slice.call(document.querySelectorAll('section'));
    for (var i = 0; i < secs.length; i++) {
      var sec = secs[i];
      if (sec.closest('aside')) continue;
      if (titleIn(sec)) return sec;
    }
    return null;
  }

  /* the game title written in this element's own header, if any */
  function titleIn(root) {
    var keys = Object.keys(GAMES);
    var leaves = [].slice.call(root.querySelectorAll('div, h1, h2, p')).filter(function (e) {
      return e.children.length === 0 && !e.closest('aside') && !e.closest('.aj-splash');
    });
    for (var i = 0; i < leaves.length; i++) {
      var txt = (leaves[i].textContent || '').trim();
      for (var k = 0; k < keys.length; k++) {
        if (GAMES[keys[k]].match.test(txt)) return keys[k];
      }
    }
    return null;
  }

  function panelFor(game) {
    if (game.panel) {
      var el = document.querySelector(game.panel);
      if (!el) return null;
      /* In the hub the bee is painted into the game panel; splash the panel
         itself rather than the bee's own host, which gets rebuilt on mount. */
      return el.closest('.aj-bee-hosted') || el.closest('.aj-bee-host') || el;
    }
    return gameSection();
  }

  function show(key) {
    var game = GAMES[key];
    if (!game) return false;
    var panel = panelFor(game);
    if (!panel || panel.querySelector('.aj-splash')) return !!panel;

    ensureCss();
    // blank the panel in the same tick we claim it, so no frame of the game is
    // ever painted before its splash goes on top
    panel.classList.add('aj-splash-hold');

    /* Every game's splash is the same card, so it gets the same height —
       sizing it to whatever the game underneath happens to measure made the
       quiz, the crossword and the bee each open at a different size. The panel
       is held at that height only while the splash is up. */
    panel.style.minHeight = SPLASH_H + 'px';

    /* Appended to the panel, not to <body>: the games page is scaled with
       `zoom`, so page-coordinate overlays land in the wrong place. Adding a
       child is safe — it is *removing* React's own nodes that breaks it. */
    if (getComputedStyle(panel).position === 'static') panel.style.position = 'relative';
    var splash = build(game);
    splash.setAttribute('data-key', key);
    panel.appendChild(splash);

    splash.querySelector('.sp-play').addEventListener('click', function () {
      splash.classList.add('is-out');
      // remember which game this panel is now showing, so the watcher doesn't
      // splash it again until a different game takes the panel over
      panel.setAttribute('data-splash-for', key);
      panel.classList.remove('aj-splash-hold');   // let the game through
      if (game.play) game.play(panel);
      setTimeout(function () {
        splash.remove();
        panel.style.minHeight = '';
      }, 480);
    });
    return true;
  }

  /* Which game a splash is owed for.

     Sniffing the DOM for "which game is on screen" proved unreliable: the rail
     lists every game's name, and the bundle keeps the outgoing game's markup
     around for a beat while it switches. So the game is decided from what the
     reader actually did — the hash they arrived on, or the card they clicked —
     and the splash simply waits for that game's panel to exist. */
  var pending = null;

  function keyFromHash() {
    var h = (location.hash || '').replace('#', '').toLowerCase();
    if (h === 'crossword') return 'crossword';
    if (h === 'bee') return 'bee';
    return 'quiz';
  }

  /* A rail card reads "The Mini Crossword  Solve this bite-sized puzzle… PLAY"
     across several lines, so match on how the text *starts*, with whitespace
     collapsed — an exact full-string match never fires here. */
  function keyFromText(txt) {
    txt = (txt || '').replace(/\s+/g, ' ').trim();
    if (!txt || txt.length > 200) return null;      // the whole rail, not a card
    var keys = Object.keys(GAMES);
    for (var i = 0; i < keys.length; i++) {
      var name = GAMES[keys[i]].label;
      if (name && new RegExp('^' + name, 'i').test(txt)) return keys[i];
    }
    return null;
  }

  function request(key) {
    if (!key) return;
    pending = key;
    /* A splash for a different game may already be up — the page can settle its
       hash after load, so the first guess ("no hash yet, so the quiz") can be
       wrong. Drop it and let the real arrival take over. */
    var open = document.querySelector('.aj-splash');
    if (open && open.getAttribute('data-key') !== key) {
      var host = open.parentElement;
      open.remove();
      if (host) {
        host.classList.remove('aj-splash-hold');
        host.style.minHeight = '';
      }
    }
    var panel = panelFor(GAMES[key]);
    if (panel) panel.removeAttribute('data-splash-for');   // a fresh arrival
    trySplash();
  }

  function trySplash() {
    if (!pending) return;
    if (document.querySelector('.aj-splash')) return;      // one at a time
    var panel = panelFor(GAMES[pending]);
    if (!panel) return;                                    // not mounted yet
    if (panel.getAttribute('data-splash-for') === pending) { pending = null; return; }
    if (show(pending)) pending = null;
  }

  /* A game card in the rail asks for that game's splash. */
  function watchRail() {
    document.addEventListener('click', function (e) {
      // Scripted clicks are how the bundle switches its own views (aj-quiz.js
      // presses a rail CTA to open the crossword). Only a real press is a
      // reader choosing a game.
      if (e.isTrusted === false) return;
      var t = e.target;
      if (!t.closest || t.closest('.aj-splash')) return;
      var rail = t.closest('aside');
      if (!rail) return;
      // walk up from the click to the card, and read the game off it
      var n = t, key = null;
      for (var i = 0; i < 6 && n && n !== rail && !key; i++, n = n.parentElement) {
        key = keyFromText(n.textContent);
      }
      if (key) request(key);
    }, true);
  }

  function init() {
    watchRail();
    request(keyFromHash());
    // the panel mounts asynchronously; keep trying until the splash lands
    new MutationObserver(trySplash).observe(document.body, { childList: true, subtree: true });
    setInterval(trySplash, 300);
    /* Only a hash that names a game is an arrival. The bundle clears the hash
       as it switches views, and treating that as "go to the quiz" threw an
       unrelated splash over whichever game was opening. */
    window.addEventListener('hashchange', function () {
      var h = (location.hash || '').replace('#', '').toLowerCase();
      if (h === 'crossword' || h === 'bee') request(h);
    });
  }

  // start watching as soon as there's a body to watch — waiting for `load` on
  // the games bundle is late enough that the game paints first
  if (document.body) init();
  else document.addEventListener('DOMContentLoaded', init);
})();
