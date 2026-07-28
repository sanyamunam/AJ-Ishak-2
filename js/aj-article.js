/* Article page micro-interactions — the page used to snap into place all at once.
   1. Reading progress bar across the top
   2. Staggered entrance for the article header (kicker, headline, standfirst, byline, hero)
   3. A slow, continuous zoom on the hero image once it lands
   Runs at parse time (defer) so it can claim the entrance blocks before js/aj-lazy.js
   collects its scroll-reveal set on window load.
*/
(function () {
  'use strict';

  if (!/aljazeera-article/i.test(location.pathname)) return;

  var REDUCED = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var CSS = [
    '.aj-read-progress{position:fixed;left:0;top:0;height:3px;width:0;z-index:9998;background:#fa9000;transition:width .12s linear;pointer-events:none}',

    '.aj-enter{opacity:0;transform:translateY(18px);transition:opacity .7s cubic-bezier(.22,.61,.36,1),transform .7s cubic-bezier(.22,.61,.36,1)}',
    '.aj-enter.is-in{opacity:1;transform:none}',

    /* the hero keeps drifting in after it arrives, so the page settles rather than stops */
    '.aj-hero-zoom{overflow:hidden}',
    '.aj-hero-zoom img{transform:scale(1);transform-origin:center center;transition:transform 7s cubic-bezier(.16,.68,.4,1)}',
    '.aj-hero-zoom.is-in img{transform:scale(1.06)}',

    '@media (prefers-reduced-motion: reduce){.aj-enter{opacity:1;transform:none;transition:none}.aj-hero-zoom img{transition:none;transform:none}.aj-read-progress{display:none}}'
  ].join('\n');

  var st = document.createElement('style');
  st.id = 'aj-article-style';
  st.textContent = CSS;
  document.head.appendChild(st);

  /* ---------- reading progress ---------- */
  function readingProgress() {
    var bar = document.createElement('div');
    bar.className = 'aj-read-progress';
    document.body.appendChild(bar);
    var ticking = false;
    function update() {
      var doc = document.documentElement;
      var max = doc.scrollHeight - window.innerHeight;
      var pct = max > 0 ? Math.min(100, Math.max(0, (window.scrollY / max) * 100)) : 0;
      bar.style.width = pct.toFixed(2) + '%';
      ticking = false;
    }
    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
    window.addEventListener('resize', update);
    update();
  }

  /* ---------- header entrance ---------- */
  function entrance() {
    var main = document.querySelector('main');
    if (!main) return;
    var section = main.children[0];
    if (!section) return;
    var column = section.children[0];
    if (!column || !column.children.length) return;
    var body = column.children[0];
    if (!body || !body.children.length) return;

    // the first few blocks of the article body carry the masthead of the story
    var blocks = [].slice.call(body.children).slice(0, 3);
    if (!blocks.length) return;

    blocks.forEach(function (el, i) {
      el.classList.add('aj-enter');
      el.style.transitionDelay = (i * 110) + 'ms';
    });

    // the hero is the largest image inside those blocks
    var hero = null, area = 0;
    blocks.forEach(function (b) {
      [].slice.call(b.querySelectorAll('img')).forEach(function (im) {
        var r = im.getBoundingClientRect();
        if (r.width * r.height > area) { area = r.width * r.height; hero = im; }
      });
    });
    var heroFrame = hero && hero.parentElement;
    if (heroFrame) heroFrame.classList.add('aj-hero-zoom');

    function play() {
      blocks.forEach(function (el) { el.classList.add('is-in'); });
      if (heroFrame) setTimeout(function () { heroFrame.classList.add('is-in'); }, 260);
      // let the delays fire once, then stop holding the elements back
      setTimeout(function () {
        blocks.forEach(function (el) { el.style.transitionDelay = ''; });
      }, 900);
    }

    if (REDUCED) { play(); return; }
    requestAnimationFrame(function () { requestAnimationFrame(play); });
  }

  function init() {
    readingProgress();
    entrance();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
