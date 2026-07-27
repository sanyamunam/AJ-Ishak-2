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
