/* AJ MOTION — the tagging half of the restrained motion layer (css/aj-motion.css).

   Nothing here animates by itself: this script only decides WHAT takes part —
   which card links get the hover lift, which in-flight images fade on arrival —
   and lets the stylesheet do the moving. It deliberately ships no scroll-reveal
   system: the site already has one (aj-lazy's .aj-reveal) and one property
   should have one owner. */
(function () {
  'use strict';

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  /* ---------------- tactile cards ----------------
     A card is a link whose media sits in a clipped positioning wrapper — the
     export's standard card anatomy. The wrapper is tagged so the image can
     breathe on hover without spilling; the card itself lifts 2px. Chrome,
     footer and game-splash surfaces are left alone. */
  function tagCards(root) {
    var links = root.querySelectorAll('a[href]');
    [].forEach.call(links, function (a) {
      if (a.getAttribute('data-mo') || a.closest('header, footer, .aj-splash')) return;
      var media = a.querySelector('div.relative img');
      if (!media) return;
      var wrap = media.closest('div.relative');
      if (!wrap || !/hidden/.test(getComputedStyle(wrap).overflow)) return;
      a.setAttribute('data-mo', '1');
      a.classList.add('aj-mo-card');
      wrap.classList.add('aj-mo-media');
    });
  }

  /* ---------------- image arrivals ----------------
     Only images still in flight get the fade — anything already decoded
     (cache hits, inline data URIs) renders instantly, untouched. */
  function tagImages(root) {
    var imgs = root.querySelectorAll('img[src^="assets/"], img[loading]');
    [].forEach.call(imgs, function (img) {
      if (img.complete || img.getAttribute('data-mo')) return;
      img.setAttribute('data-mo', '1');
      img.classList.add('aj-mo-loading');
      img.addEventListener('load', function () {
        img.classList.remove('aj-mo-loading');
        img.classList.add('aj-mo-loaded');
      }, { once: true });
      // never hold an image hostage to a failed request
      img.addEventListener('error', function () {
        img.classList.remove('aj-mo-loading');
      }, { once: true });
    });
  }

  function tagAll() {
    tagCards(document);
    tagImages(document);
  }

  function init() {
    tagAll();
    /* Bundle pages build their content after load — retag as it lands,
       debounced, and stop watching once the page has settled. */
    var t = null;
    var mo = new MutationObserver(function () {
      clearTimeout(t);
      t = setTimeout(tagAll, 250);
    });
    mo.observe(document.body, { childList: true, subtree: true });
    setTimeout(function () { mo.disconnect(); clearTimeout(t); tagAll(); }, 12000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
