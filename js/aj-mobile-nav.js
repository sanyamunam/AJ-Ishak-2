/* Mobile navigation — accessible hamburger for the shared site header.
   Desktop is untouched: the burger only renders below 1024px (css/aj-responsive.css).
   The header is inline on index/article and injected by js/aj-chrome.js on the
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
       (css/aj-responsive.css keys off header.aj-mnav-moved). The originals are
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
/* Mobile footer accordion: on narrow viewports the three footer link
   columns ("Categories"-style heading + link list) collapse behind their
   headings to save vertical space. Desktop is untouched — the class only
   changes rendering inside the max-width:767px block in aj-responsive.css,
   and taps are ignored when the viewport is wider. */
(function () {
  'use strict';

  var MQ = window.matchMedia('(max-width: 767px)');

  function columns() {
    var white = [].slice.call(document.querySelectorAll('footer div')).filter(function (d) {
      return /bg-white/.test(d.className) && /gap-\[80px\]/.test(d.className);
    })[0];
    if (!white) return [];
    // a link column = flex-col whose first child is a <p> heading followed
    // by a <div> containing only links
    return [].slice.call(white.querySelectorAll('div')).filter(function (d) {
      if (d.children.length !== 2) return false;
      var p = d.children[0], list = d.children[1];
      return p.tagName === 'P' && list.tagName === 'DIV' &&
        list.querySelectorAll('a').length > 1 &&
        /flex-col/.test(d.className);
    });
  }

  function wire() {
    var cols = columns();
    if (!cols.length) return false;
    cols.forEach(function (col) {
      if (col.getAttribute('data-foot-acc')) return;
      col.setAttribute('data-foot-acc', '1');
      col.classList.add('aj-foot-acc');
      var head = col.children[0];
      head.setAttribute('role', 'button');
      head.setAttribute('tabindex', '0');
      head.setAttribute('aria-expanded', 'false');
      var toggle = function () {
        if (!MQ.matches) return;          // desktop: headings are inert
        var open = col.classList.toggle('open');
        head.setAttribute('aria-expanded', open ? 'true' : 'false');
      };
      head.addEventListener('click', toggle);
      head.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
      });
    });
    return true;
  }

  function init() {
    if (wire()) return;
    var n = 0, iv = setInterval(function () { if (wire() || ++n > 20) clearInterval(iv); }, 300);
  }

  if (document.readyState === 'complete') init();
  else window.addEventListener('load', init);
})();

/* Mobile capsules rail: keep the FEATURED story centered. aj-capsules.js
   rotates an "is-live" spotlight card (larger, autoplaying its clip); on
   narrow viewports we keep whichever card is live centered in the rail so
   the story is never clipped at the edge. Falls back to the volcano video
   card before the carousel initialises. */
(function () {
  'use strict';
  var MQ = window.matchMedia('(max-width: 767px)');

  function findCard() {
    var liveEl = document.querySelector('.aj-cap.is-live');
    if (liveEl) return liveEl;
    var imgs = [].slice.call(document.querySelectorAll('img[alt]')).filter(function (i) {
      return /^philippines volcano erupts/i.test(i.alt || '');
    });
    if (!imgs.length) return null;
    return imgs.map(function (i) { return i.closest('a') || i.parentElement; })
      .sort(function (a, b) { return b.offsetLeft - a.offsetLeft; })[0];
  }

  function center(smooth) {
    if (!MQ.matches) return true;
    var card = findCard();
    if (!card) return false;
    var rail = card.parentElement;
    while (rail && rail !== document.body && rail.scrollWidth <= rail.clientWidth + 4) rail = rail.parentElement;
    if (!rail || rail === document.body) return false;
    var target = card.offsetLeft - (rail.clientWidth - card.offsetWidth) / 2;
    if (Math.abs(rail.scrollLeft - target) < 4) return true;
    if (smooth && rail.scrollTo) rail.scrollTo({ left: target, behavior: 'smooth' });
    else rail.scrollLeft = target;
    return true;
  }

  function init() {
    var n = 0, iv = setInterval(function () { if (center(false) || ++n > 20) clearInterval(iv); }, 300);
    // Track the rotating spotlight: recenter (smoothly) whenever is-live
    // moves to another card. The featured card also animates its width for
    // ~650ms, so follow up once the resize settles.
    var mo = new MutationObserver(function (muts) {
      for (var i = 0; i < muts.length; i++) {
        var t = muts[i].target;
        if (t.classList && t.classList.contains('is-live')) {
          center(true);
          setTimeout(function () { center(true); }, 700);
          return;
        }
      }
    });
    mo.observe(document.body, { subtree: true, attributes: true, attributeFilter: ['class'] });
  }

  if (document.readyState === 'complete') init();
  else window.addEventListener('load', init);
})();
