/* Auth dialog: sign-in / sign-up.

   It runs in two modes off the same markup and CSS:
   · popup   — aj-auth-popup.js pulls the dialog out of the auth page and drops
               it over whatever the reader was reading. Closing just removes it,
               so the page underneath is never navigated away from.
   · standalone — someone opened aljazeera-signin.html directly. Same dialog,
               except closing has to navigate somewhere real.

   Everything below is scoped to the scrim element it is handed, so several
   dialogs could coexist without fighting over selectors. */
(function () {
  'use strict';

  /* "sanya.hassan@example.com" → "Sanya". The prototype has no accounts, so the
     display name is read off whatever was typed in — and when nothing was
     (the social buttons, or an empty field), it falls back to the persona the
     rest of the site is written around rather than a generic "Reader". */
  var DEFAULT_NAME = 'Sanya';
  function nameFromEmail(email) {
    var raw = String(email || '').split('@')[0].split(/[._\-+]/)[0];
    if (!raw) return DEFAULT_NAME;
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  }

  function mount(scrim, opts) {
    if (!scrim || scrim.getAttribute('data-mounted')) return;
    scrim.setAttribute('data-mounted', '1');
    opts = opts || {};

    var card = scrim.querySelector('.sg-wrap');
    var onClose = opts.onClose;

    // flush layout, then flip the class — a plain rAF never fires while the tab
    // is in the background, which would leave the dialog stuck at opacity 0
    void scrim.offsetHeight;
    scrim.classList.add('open');

    function close() {
      scrim.classList.remove('open');
      setTimeout(function () {
        if (onClose) return onClose();
        // standalone: nothing underneath to return to, so navigate
        var exit = scrim.getAttribute('data-exit') || 'index.html';
        if (history.length > 1 && document.referrer) history.back();
        else location.href = exit;
      }, 300);
    }

    var closeBtn = scrim.querySelector('.sg-close');
    if (closeBtn) closeBtn.addEventListener('click', close);
    scrim.addEventListener('mousedown', function (e) {
      if (e.target === scrim) close();      // the backdrop, not the card
    });
    function onKey(e) {
      if (!document.body.contains(scrim)) { document.removeEventListener('keydown', onKey); return; }
      if (e.key === 'Escape') { e.preventDefault(); close(); return; }
      if (e.key !== 'Tab') return;
      var f = [].filter.call(
        card.querySelectorAll('a[href], button, input, [tabindex]:not([tabindex="-1"])'),
        function (el) { return el.offsetParent !== null; }
      );
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
    document.addEventListener('keydown', onKey);

    var firstField = card.querySelector('input');
    if (firstField) firstField.focus({ preventScroll: true });

    /* ---------------- form controls ---------------- */
    scrim.querySelectorAll('.sg-check').forEach(function (c) {
      function flip() {
        var on = c.classList.toggle('on');
        c.setAttribute('aria-checked', on ? 'true' : 'false');
      }
      c.addEventListener('click', function (e) { if (e.target.tagName !== 'A') flip(); });
      c.addEventListener('keydown', function (e) {
        if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); flip(); }
      });
    });

    scrim.querySelectorAll('.sg-eye').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var input = btn.parentElement.querySelector('input');
        if (input) input.type = input.type === 'password' ? 'text' : 'password';
      });
    });

    /* Prototype submit: no auth to do, so land on the signed-in view. */
    scrim.querySelectorAll('.sg-form').forEach(function (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var who = (scrim.querySelector('#sg-email') || {}).value || '';
        try {
          sessionStorage.setItem('aj-signed-in', '1');
          sessionStorage.setItem('aj-user', nameFromEmail(who));
        } catch (err) {}
        scrim.classList.remove('open');
        /* A dialog that interrupted something — the Spelling Bee's guest gate —
           hands back to whatever it interrupted rather than navigating away. */
        if (opts.onSuccess) {
          setTimeout(function () { opts.onSuccess(who); }, 260);
          return;
        }
        var to = form.getAttribute('data-success') || 'aljazeera-foryou.html';
        setTimeout(function () { location.href = to; }, 260);
      });
    });

    /* Swapping between the two variants stays inside the popup when we're in
       one — fetch the other dialog and replace this card rather than navigate. */
    scrim.querySelectorAll('a[href*="aljazeera-signin"], a[href*="aljazeera-signup"]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        if (!opts.swap) return;              // standalone: let the link navigate
        e.preventDefault();
        opts.swap(a.getAttribute('href'));
      });
    });

    carousel(scrim);
  }

  /* ---------------- rolling benefit cards ----------------
     The five slots are cloned into three consecutive copies so the track can
     roll forever; the spotlight walks the middle copy, then rebases by a whole
     set with transitions off — the card on the centre line is identical before
     and after, so the seam is invisible. The tier class is a pure function of
     distance from the centre slot. */
  function carousel(root) {
    var viewport = root.querySelector('.sg-cards');
    var track = viewport && viewport.querySelector('.sg-track');
    if (!track) return;

    var STEP_MS = 2600, COPIES = 3;
    // slot height and viewport height come from CSS (they differ on mobile)
    function slotH() { return track.firstElementChild.getBoundingClientRect().height; }
    function viewH() { return viewport.getBoundingClientRect().height; }
    var base = [].slice.call(track.children);
    var N = base.length;
    for (var c = 1; c < COPIES; c++) {
      base.forEach(function (s) { track.appendChild(s.cloneNode(true)); });
    }
    var slots = [].slice.call(track.children);

    var i = N;                     // start on the middle copy
    var timer = null, paused = false, resumeT = null, settleT = null;

    function tiers() {
      slots.forEach(function (s, n) {
        var card = s.firstElementChild;
        var d = Math.abs(n - i);
        card.classList.remove('far', 'near', 'focus');
        card.classList.add(d === 0 ? 'focus' : d === 1 ? 'near' : 'far');
      });
    }
    function place() {
      var s = slotH();
      track.style.transform = 'translateY(' + (viewH() / 2 - (i * s + s / 2)) + 'px)';
    }
    function go(dir) {
      i += dir;
      track.classList.add('animate');
      place(); tiers();
      clearTimeout(settleT);
      settleT = setTimeout(function () {
        if (i >= N * 2 || i < N) {
          track.classList.remove('animate');
          i += i < N ? N : -N;
          place(); tiers();
          void track.offsetHeight;   // flush so the next move animates again
        }
      }, 900);
    }
    function step() { go(1); }

    place(); tiers();
    window.addEventListener('resize', function () {
      track.classList.remove('animate');
      place();
      requestAnimationFrame(function () { track.classList.add('animate'); });
    });
    function start() { if (!timer && !paused) timer = setInterval(step, STEP_MS); }
    function stop() { clearInterval(timer); timer = null; }

    // don't animate off-screen or while the reader is hovering a card
    viewport.addEventListener('mouseenter', function () { paused = true; stop(); });
    viewport.addEventListener('mouseleave', function () { paused = false; start(); });

    /* manual control: wheel / trackpad, drag or swipe, arrow keys. Any input
       takes the wheel from the autoplay, which resumes a few seconds later. */
    function takeOver() {
      paused = true; stop();
      clearTimeout(resumeT);
      resumeT = setTimeout(function () { paused = false; start(); }, 3500);
    }

    // On phones the rail spans the full column, so swallowing vertical
    // gestures would trap the page scroll — manual control is desktop/tablet.
    var CAN_SWIPE = window.matchMedia('(min-width: 768px)');

    var wheelAcc = 0, wheelLock = false;
    viewport.addEventListener('wheel', function (e) {
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;  // horizontal: pass through
      if (!CAN_SWIPE.matches) return;                       // phones: page scroll wins
      e.preventDefault();
      takeOver();
      if (wheelLock) return;
      wheelAcc += e.deltaY;
      if (Math.abs(wheelAcc) < 40) return;
      go(wheelAcc > 0 ? 1 : -1);
      wheelAcc = 0;
      wheelLock = true;               // one card per gesture burst
      setTimeout(function () { wheelLock = false; }, 380);
    }, { passive: false });

    var dragY = null;
    function down(y) { dragY = y; takeOver(); }
    function move(y, e) {
      if (dragY === null) return;
      var d = dragY - y;
      if (Math.abs(d) < 45) return;
      if (e && e.cancelable) e.preventDefault();
      go(d > 0 ? 1 : -1);
      dragY = y;
    }
    function up() { dragY = null; }
    viewport.addEventListener('touchstart', function (e) {
      if (CAN_SWIPE.matches) down(e.touches[0].clientY);
    }, { passive: true });
    viewport.addEventListener('touchmove', function (e) {
      if (CAN_SWIPE.matches) move(e.touches[0].clientY, e);
    }, { passive: false });
    viewport.addEventListener('touchend', up);
    viewport.addEventListener('mousedown', function (e) { e.preventDefault(); down(e.clientY); });
    window.addEventListener('mousemove', function (e) { move(e.clientY, null); });
    window.addEventListener('mouseup', up);

    viewport.tabIndex = 0;
    viewport.setAttribute('aria-label', 'Account benefits, use the arrow keys to browse');
    viewport.addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
      e.preventDefault();
      takeOver();
      go(e.key === 'ArrowDown' ? 1 : -1);
    });
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) stop(); else start();
    });
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (e) {
        if (e[0].isIntersecting) start(); else stop();
      }, { threshold: 0.2 }).observe(viewport);
    } else start();
  }

  window.ajAuth = { mount: mount };

  // standalone: the auth page ships its own scrim, so wire it up on load
  var own = document.querySelector('.sg-scrim');
  if (own) mount(own);
})();
