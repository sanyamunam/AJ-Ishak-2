/* Spelling Bee, mounted inside the games hub.

   The bee used to live on its own page, which meant leaving the hub — and the
   "Explore other Games" rail — behind. Here it loads into the same panel the
   quiz and the crossword use: pick it from the rail (or land on #bee) and its
   markup is fetched from spelling-bee.html, dropped into the panel, and the
   engine script is run against it. spelling-bee.html stays a valid standalone
   page; this just borrows its body. */
(function () {
  'use strict';

  var SOURCE = 'spelling-bee.html';
  var cache = null;
  var mounted = false;

  /* the panel the hub renders a game into — identified by the game header it
     carries, which is the one thing every game view has in common */
  function gamePanel() {
    var hidden = document.querySelector('section[data-aj-hidden]');
    if (hidden) return hidden;
    var titles = [].slice.call(document.querySelectorAll('div, h1, h2, p')).filter(function (e) {
      return e.children.length === 0 &&
        /^(the daily quiz|the mini crossword)$/i.test((e.textContent || '').trim());
    });
    for (var t = 0; t < titles.length; t++) {
      var n = titles[t];
      for (var i = 0; i < 10 && n; i++, n = n.parentElement) {
        if (n.tagName === 'SECTION') return n;
      }
    }
    return null;
  }

  function ensureCss() {
    if (document.querySelector('link[href*="aj-bee.css"]')) return;
    var l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = 'css/aj-bee.css?v=2';
    document.head.appendChild(l);
  }

  function runEngine() {
    // re-added rather than reused: the engine is an IIFE that binds to the
    // nodes present when it runs, so it has to execute after the markup lands
    var old = document.getElementById('aj-bee-engine');
    if (old) old.remove();
    var s = document.createElement('script');
    s.id = 'aj-bee-engine';
    s.src = 'js/aj-bee.js?v=2&t=' + (mounted ? 'r' : 'i');
    /* The standalone page opens on the bee's own orange cover. In the hub that
       job belongs to the splash, and a second full-bleed hero would break step
       with the quiz and the crossword — so go straight to the board. */
    s.onload = function () {
      var play = document.querySelector('.aj-bee-host #cover-play');
      if (play) play.click();
    };
    document.body.appendChild(s);
  }



  function paint(html, panel) {
    var doc = new DOMParser().parseFromString(html, 'text/html');
    var main = doc.querySelector('.bee-main');
    var extras = doc.querySelectorAll('.toast-lane, .confetti, .bee-veil');
    if (!main) return false;

    ensureCss();
    /* The hub's game panel is rendered by the bundle's React runtime, so its
       children are not ours to touch — emptying it (or adding to it) makes the
       next re-render throw insertBefore/removeChild and tears the page down.
       Leave its DOM alone, blank it, and draw the bee in our own element laid
       over the top. */
    panel.classList.remove('aj-splash-hold');
    panel.setAttribute('data-aj-hidden', '1');
    // CSS hides the bundle's own children; nothing is removed, so React can
    // still find every node it rendered
    panel.classList.add('aj-bee-hosted', 'bee-page');

    var host = panel.querySelector('.aj-bee-host');
    if (!host) {
      host = document.createElement('div');
      host.className = 'aj-bee-host';
      panel.appendChild(host);
    }
    // a splash may already be waiting over this panel — painting the game
    // underneath it must not throw it away
    var splash = panel.querySelector('.aj-splash');
    if (splash) panel.appendChild(splash);
    host.innerHTML = '';

    /* Match the hub's other games: a bordered white card whose first row is
       icon + title + standfirst. The bee ships its own "◆ THE SPELLING BEE"
       masthead for the standalone page — drop it here and use the hub's. */
    // hidden, not removed: the engine writes the puzzle number into #head-meta
    // inside it, and would throw on a missing node
    var ownHead = main.querySelector('.bee-sechead');
    if (ownHead) ownHead.hidden = true;

    var head = document.createElement('div');
    head.className = 'bee-hubhead';
    head.innerHTML =
      '<img class="bh-icon" src="assets/Spelling%20Bee.png" alt="">' +
      '<div class="bh-text">' +
        '<div class="bh-title">The Spelling Bee</div>' +
        '<div class="bh-sub">Seven letters, one hive. · new letters every morning at 06:00 Doha time</div>' +
      '</div>';

    var wrap = document.createElement('div');
    wrap.className = 'bee-embed';
    wrap.appendChild(head);
    wrap.appendChild(main);
    [].forEach.call(extras, function (e) { wrap.appendChild(e); });
    host.appendChild(wrap);

    runEngine();
    mounted = true;
    return true;
  }

  function mount() {
    // already up: repainting would wipe the splash sitting on top of it
    if (mounted && document.querySelector('.bee-embed')) return true;
    var panel = gamePanel();
    if (!panel) return false;
    if (cache) return paint(cache, panel);
    fetch(SOURCE).then(function (r) { return r.text(); }).then(function (html) {
      cache = html;
      paint(html, panel);
    }).catch(function () { location.href = SOURCE; });   // fall back to the page
    return true;
  }

  function wanted() { return /^#?bee$/i.test(location.hash.replace('#', '')); }

  /* Step aside when another game is chosen: the bundle keeps rendering its own
     view into the panel underneath, so all we have to do is stop hiding it. */
  function unmount() {
    var panel = document.querySelector('.aj-bee-hosted');
    if (!panel) return;
    var host = panel.querySelector('.aj-bee-host');
    if (host) host.remove();
    panel.classList.remove('aj-bee-hosted', 'bee-page');
    panel.removeAttribute('data-aj-hidden');
    panel.removeAttribute('data-splash-for');   // the next game gets its splash
    panel.setAttribute('data-splash-wait', String(Date.now()));
    panel.style.minHeight = '';
    mounted = false;
  }

  function init() {
    /* The rail's Spelling Bee card keeps the reader on the hub. Scoped to the
       rail and to real links: matching "spelling bee" anywhere in the click's
       ancestry also catches the game's own splash and title, which would remount
       it (and wipe the splash) on every press inside it. */
    document.addEventListener('click', function (e) {
      if (e.isTrusted === false) return;   // the bundle's own scripted clicks
      var t = e.target;
      if (!t.closest) return;
      if (t.closest('.aj-splash') || t.closest('.bee-embed')) return;   // inside the game
      var link = t.closest('a[href*="spelling-bee"]');
      var card = t.closest('aside a, aside button, aside [role="button"]');
      var hit = link ||
        (card && /spelling bee/i.test((card.textContent || '').trim())) ||
        // the bundle's own rail card is a plain div with a PLAY button
        (function () {
          var n = t, rail = t.closest('aside');
          if (!rail) return null;
          for (var i = 0; i < 6 && n && n !== rail; i++, n = n.parentElement) {
            var txt = (n.textContent || '').trim();
            if (/^spelling bee/i.test(txt) && txt.length < 200) return n;
          }
          return null;
        })();
      if (!hit) {
        // another game's card: hand the panel back to the bundle
        var otherCard = t.closest && t.closest('aside');
        if (otherCard && mounted) {
          var txt = (otherCard.textContent || '');
          if (/daily quiz|mini crossword/i.test(txt)) {
            var row = t;
            for (var j = 0; j < 6 && row && row !== otherCard; j++, row = row.parentElement) {
              var rt = (row.textContent || '').trim();
              if (/^(the daily quiz|the mini crossword)/i.test(rt) && rt.length < 200) {
                unmount();
                if (location.hash === '#bee') location.hash = '';
                break;
              }
            }
          }
        }
        return;
      }
      e.preventDefault(); e.stopPropagation();
      if (location.hash !== '#bee') location.hash = 'bee';
      else mount();
    }, true);

    window.addEventListener('hashchange', function () {
      if (wanted()) mount();
      else unmount();
    });

    if (wanted()) {
      var n = 0, iv = setInterval(function () {
        if (mount() || ++n > 30) clearInterval(iv);
      }, 250);
    }
  }

  if (document.readyState === 'complete') init();
  else window.addEventListener('load', init);
})();
