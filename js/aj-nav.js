/* Site navigation behaviours shared by every page.

   1. Home in the top nav goes to the personalised home (aljazeera-foryou.html)
      and carries the active state while the reader is there.
   2. Sign out is a real logout: the session keys go, then the reader lands on
      the sign-in page.
   3. The account dashboard sits behind the login — opened without a session it
      bounces straight to sign-in, before anything paints.

   The header is inline on some pages and injected by aj-chrome.js on others,
   so nav wiring retries briefly until a header nav appears (same pattern as
   js/aj-mobile-nav.js). */
(function () {
  'use strict';

  function signedIn() {
    try { return !!sessionStorage.getItem('aj-signed-in'); } catch (e) { return false; }
  }

  /* ---------------- login gate ----------------
     Only the account dashboard is gated — the For You page doubles as the
     site's "Home" destination, so it stays reachable; its header simply shows
     the guest state when there is no session. */
  if (/aljazeera-account|(^|\/)account$/i.test(location.pathname) && !signedIn()) {
    document.documentElement.style.visibility = 'hidden';
    location.replace('aljazeera-signin.html');
    return;
  }

  var ON_FORYOU = /aljazeera-foryou|(^|\/)foryou$/i.test(location.pathname);

  /* ---------------- Home link + active state ---------------- */
  function style() {
    if (document.getElementById('aj-nav-style')) return;
    var st = document.createElement('style');
    st.id = 'aj-nav-style';
    /* #aj-chrome carries the injected header and sets `a{color:inherit}` off an
       ID selector (js/aj-chrome.js#scopeLinkColours) — these need the ID too
       or the active/hover colour loses the cascade on those pages */
    st.textContent =
      'header nav a{cursor:pointer;transition:color .15s ease}' +
      'header nav a:hover,header nav a:focus-visible,#aj-chrome header nav a:hover,#aj-chrome header nav a:focus-visible{color:#fa9000}' +
      'header nav a[aria-current="page"],#aj-chrome header nav a[aria-current="page"]{color:#fa9000}';
    document.head.appendChild(st);
  }

  function wireNav() {
    var nav = document.querySelector('header nav');
    if (!nav) return false;
    var home = [].filter.call(nav.querySelectorAll('a'), function (a) {
      return /^home$/i.test((a.textContent || '').trim());
    })[0];
    if (!home) return false;
    style();
    if (home.getAttribute('data-aj-nav')) return true;
    home.setAttribute('data-aj-nav', '1');
    /* the injected header may be a stale sessionStorage copy that still says
       href="#", so the destination is (re)set here either way */
    home.setAttribute('href', 'aljazeera-foryou.html');
    if (ON_FORYOU) home.setAttribute('aria-current', 'page');
    return true;
  }

  function init() {
    if (wireNav()) return;
    var n = 0, iv = setInterval(function () {
      if (wireNav() || ++n > 40) clearInterval(iv);
    }, 150);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  /* ---------------- sign out ----------------
     The account bundle renders the link late and moves it around between
     breakpoints (js/aj-chrome.js#placeSignout), so the handler is delegated
     rather than bound to the element. */
  document.addEventListener('click', function (e) {
    var el = e.target.closest && e.target.closest('a, button');
    if (!el) return;
    if (!/^sign\s*out$/i.test((el.textContent || '').trim())) return;
    e.preventDefault();
    e.stopPropagation();
    try {
      sessionStorage.removeItem('aj-signed-in');
      sessionStorage.removeItem('aj-user');
    } catch (err) {}
    /* replace, not assign: Back must not return to the signed-in page */
    location.replace('aljazeera-signin.html');
  }, true);
})();
