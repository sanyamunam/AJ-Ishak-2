/* Open the auth dialog as a popup over whatever the reader is on.

   Any link pointing at aljazeera-signin.html / aljazeera-signup.html is
   intercepted: we fetch that page, lift its .sg-scrim out, and drop it into the
   current document. The page underneath is never unloaded, so closing the
   dialog puts the reader back exactly where they were — same scroll position,
   same state. Direct visits to the auth pages still work on their own. */
(function () {
  'use strict';

  var AUTH = /aljazeera-(signin|signup)\.html/i;
  var cache = {};
  var open = null;        // the mounted scrim, if any

  function ensureCss(done) {
    if (document.querySelector('link[href*="aj-auth.css"]')) return done();
    var l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = 'css/aj-auth.css';
    l.onload = done;
    l.onerror = done;
    document.head.appendChild(l);
  }

  function ensureScript(done) {
    if (window.ajAuth) return done();
    var s = document.createElement('script');
    s.src = 'js/aj-auth.js?v=2';
    s.onload = done;
    document.head.appendChild(s);
  }

  function fetchDialog(href, done) {
    if (cache[href]) return done(cache[href]);
    fetch(href).then(function (r) { return r.text(); }).then(function (html) {
      var doc = new DOMParser().parseFromString(html, 'text/html');
      var scrim = doc.querySelector('.sg-scrim');
      if (!scrim) return done(null);
      cache[href] = scrim.outerHTML;
      done(cache[href]);
    }).catch(function () { done(null); });
  }

  function close() {
    if (!open) return;
    var el = open;
    open = null;
    el.remove();
  }

  function show(href, opts) {
    opts = opts || {};
    fetchDialog(href, function (html) {
      if (!html) { location.href = href; return; }   // couldn't load: just navigate
      if (open) open.remove();          // swapping sign-in for sign-up
      var holder = document.createElement('div');
      holder.innerHTML = html;
      var scrim = holder.firstElementChild;
      /* One sign-in screen for the whole site: the dialog renders exactly as
         aljazeera-signin.html ships it, wherever it is opened from. Callers
         get a completion callback, not a say in how the screen looks — a
         variant is another login screen, and there is only one. */
      document.body.appendChild(scrim);
      open = scrim;
      window.ajAuth.mount(scrim, {
        onClose: close,
        swap: show,
        onSuccess: opts.onSuccess && function (name) { close(); watchHeader(); opts.onSuccess(name); }
      });
    });
  }

  /* Once signed in, every page's header shows it: the guest chip becomes the
     reader's name, the avatar takes the account colour, and the "Sign in" link
     goes. The header is inline on some pages and injected by aj-chrome.js on
     others, so this keeps re-checking briefly. */
  /* index.html is the prototype's logged-out front page — aljazeera-foryou.html
     is the signed-in home. So the homepage always shows the guest nav, whatever
     the session says; signing in from there lands on For You. */
  function isGuestHome() {
    return /(^|\/)(index\.html)?$/.test(location.pathname.replace(/\?.*$/, ''));
  }

  function personaliseHeader() {
    gateAccount();   // sign-in state may have just changed in a popup
    var name = null;
    try { name = sessionStorage.getItem('aj-user'); } catch (e) {}
    var signedIn = false;
    try { signedIn = !!sessionStorage.getItem('aj-signed-in'); } catch (e) {}
    if (!signedIn || isGuestHome()) return guestHeader();

    var chip = [].slice.call(document.querySelectorAll('header span, header b')).filter(function (s) {
      return /^Guest$/i.test((s.textContent || '').trim());
    })[0];
    // 'Reader' was the old default and may still be in an open session
    if (chip) chip.textContent = (!name || name === 'Reader') ? 'Sanya' : name;

    var signin = document.querySelector('.aj-signin');
    if (signin) signin.remove();

    var avatar = document.querySelector('header .size-\\[36px\\]');
    if (avatar) {
      avatar.style.backgroundImage = 'none';
      avatar.style.background = '#5944e6';
    }
    return !!chip;
  }

  /* Signed out. The wording stays as the site ships it — "Welcome, Guest" with
     the Sign in link beside it — and only the avatar changes: the warm portrait
     gradient implies a person, so a guest gets a neutral placeholder instead.
     That keeps the two states legible at a glance without rewording the nav. */
  function guestHeader() {
    var chip = [].slice.call(document.querySelectorAll('header span, header b')).filter(function (s) {
      return /^Guest$/i.test((s.textContent || '').trim());
    })[0];
    if (!chip) return false;                     // header not up yet

    var avatar = document.querySelector('header .size-\\[36px\\]');
    if (avatar && !avatar.getAttribute('data-aj-guest')) {
      avatar.setAttribute('data-aj-guest', '1');
      avatar.style.backgroundImage = 'none';
      avatar.style.background = '#eceaf1';
      avatar.style.border = '1px solid #d9d5e2';
      var glyph = avatar.querySelector('img');
      if (glyph) glyph.style.opacity = '.45';    // a silhouette, not a person
    }
    return true;
  }

  function watchHeader() {
    if (personaliseHeader()) return;
    var n = 0, iv = setInterval(function () {
      if (personaliseHeader() || ++n > 40) clearInterval(iv);
    }, 150);
  }

  /* The account page is behind the login, so the header's account chip can't
     link straight to it while the reader is a guest — send them to sign in
     first. Re-checked briefly because the header is injected on some pages. */
  function gateAccount() {
    var signedIn = false;
    try { signedIn = !!sessionStorage.getItem('aj-signed-in'); } catch (e) {}
    if (signedIn) {
      /* Signing in can happen in a popup on this very page (the Spelling Bee
         gate) — links gated earlier must be handed back, or the profile
         picture keeps opening the sign-in for someone already signed in. */
      [].forEach.call(document.querySelectorAll('a[data-aj-gated]'), function (a) {
        a.setAttribute('href', a.getAttribute('data-aj-gated'));
        a.removeAttribute('data-aj-gated');
      });
      return;
    }
    [].forEach.call(document.querySelectorAll('a[href="aljazeera-account.html"]'), function (a) {
      a.setAttribute('data-aj-gated', a.getAttribute('href'));
      a.setAttribute('href', 'aljazeera-signin.html');
    });
  }

  function wire() {
    gateAccount();
    var g = 0, gi = setInterval(function () { gateAccount(); if (++g > 12) clearInterval(gi); }, 400);
    document.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[href]');
      if (!a) return;
      var href = a.getAttribute('href') || '';
      if (!AUTH.test(href)) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || a.target === '_blank') return;  // let new tabs be
      if (open && open.contains(a)) return;   // handled inside the dialog itself
      e.preventDefault();
      ensureCss(function () { ensureScript(function () { show(href); }); });
    }, true);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { wire(); watchHeader(); });
  } else { wire(); watchHeader(); }

  /* Programmatic entry, for flows that need the dialog without a link — e.g.
     the Spelling Bee's guest gate. */
  window.ajAuthPopup = {
    open: function (href, opts) {
      ensureCss(function () { ensureScript(function () { show(href || 'aljazeera-signin.html', opts); }); });
    }
  };
})();
