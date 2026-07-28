/* Mobile navigation — accessible hamburger for the shared site header.
   Desktop is untouched: the burger only renders below 1024px (aj-responsive.css).
   The header is inline on index/article and injected by aj-chrome.js on the
   other pages, so wiring retries briefly until a header nav appears. */
(function () {
  'use strict';

  function wire() {
    var header = document.querySelector('header');
    var nav = header && header.querySelector('nav');
    if (!nav || nav.hasAttribute('data-aj-mnav')) return !!nav;
    nav.setAttribute('data-aj-mnav', '1');
    if (!nav.id) nav.id = 'aj-main-nav';
    nav.setAttribute('aria-label', nav.getAttribute('aria-label') || 'Main');

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'aj-nav-burger';
    btn.setAttribute('aria-controls', nav.id);
    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-label', 'Open menu');
    btn.innerHTML = '<span></span><span></span><span></span>';
    nav.parentElement.insertBefore(btn, nav);

    /* the row holding the nav anchors the dropdown panel */
    var row = nav.parentElement;
    if (row) row.classList.add('aj-nav-row');

    function setOpen(open) {
      document.body.classList.toggle('aj-nav-open', open);
      btn.setAttribute('aria-expanded', String(open));
      btn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    }
    btn.addEventListener('click', function () {
      setOpen(!document.body.classList.contains('aj-nav-open'));
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && document.body.classList.contains('aj-nav-open')) {
        setOpen(false);
        btn.focus();
      }
    });
    nav.addEventListener('click', function (e) {
      if (e.target.closest('a')) setOpen(false);
    });
    document.addEventListener('click', function (e) {
      if (document.body.classList.contains('aj-nav-open') &&
          !nav.contains(e.target) && !btn.contains(e.target)) setOpen(false);
    });

    /* On mobile the Light/Paper/Dark toggle and the EN/ع language selector
       live inside the menu panel; the rest of the black top strip is hidden
       (aj-responsive.css keys off header.aj-mnav-moved). The originals are
       MOVED, not cloned, so their click handlers stay attached, and they're
       returned to their desktop slots when the viewport grows again. */
    var themeBtn = [].filter.call(header.querySelectorAll('button'), function (b) {
      return /^(Light|Paper|Dark)$/.test((b.textContent || '').trim());
    })[0];
    var theme = themeBtn && themeBtn.parentElement;
    var lang = [].filter.call(header.querySelectorAll('a'), function (a) {
      return a.querySelector('img[alt="العربية"]');
    })[0];
    var welcome = [].filter.call(header.querySelectorAll('a'), function (a) {
      return /Welcome,/.test(a.textContent || '');
    })[0];
    var signin = header.querySelector('a.aj-signin');

    var extras = document.createElement('div');
    extras.className = 'aj-nav-extras';
    nav.appendChild(extras);

    /* avatar + "Welcome, Guest" + Sign in share one full-width row pinned
       to the top of the menu, above the nav links */
    var account = null;
    if (welcome || signin) {
      account = document.createElement('div');
      account.className = 'aj-nav-account';
      nav.insertBefore(account, nav.firstChild);
    }

    /* the brand logo sits beside the burger on mobile */
    var brandImg = header.querySelector('a img[alt="Al Jazeera"]');
    var brand = brandImg && brandImg.closest('a');
    if (brand) brand.setAttribute('data-aj-mnav-brand', '1');

    var homes = [];
    function rememberHome(el, put) {
      homes.push({ el: el, parent: el.parentElement, next: el.nextSibling, put: put });
    }
    if (welcome) rememberHome(welcome, function (el) { account.appendChild(el); });
    if (signin) rememberHome(signin, function (el) { account.appendChild(el); });
    if (theme) rememberHome(theme, function (el) { extras.appendChild(el); });
    if (lang) rememberHome(lang, function (el) { extras.appendChild(el); });
    if (brand) rememberHome(brand, function (el) { btn.insertAdjacentElement('afterend', el); });

    var mq = window.matchMedia('(max-width: 1023px)');
    function place() {
      if (mq.matches) {
        homes.forEach(function (h) { h.put(h.el); });
        header.classList.add('aj-mnav-moved');
      } else {
        homes.forEach(function (h) { h.parent.insertBefore(h.el, h.next); });
        header.classList.remove('aj-mnav-moved');
      }
    }
    if (homes.length) {
      place();
      if (mq.addEventListener) mq.addEventListener('change', place);
      else mq.addListener(place);
    }
    return true;
  }

  function init() {
    if (wire()) return;
    var n = 0, iv = setInterval(function () {
      if (wire() || ++n > 20) clearInterval(iv);
    }, 300);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
