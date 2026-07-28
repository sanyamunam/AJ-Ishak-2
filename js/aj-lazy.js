/* Loading states for the prototype
   1. Top progress bar when navigating to an article (the article page is heavy)
   2. Shimmer skeletons behind article imagery, revealed lazily on scroll
   3. Subtle fade-and-rise reveal for article content blocks
   All effects are disabled under prefers-reduced-motion.
*/
(function () {
  'use strict';

  var REDUCED = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var CSS = [
    /* --- navigation progress bar --- */
    '.aj-navbar{position:fixed;left:0;top:0;height:3px;width:0;z-index:9999;background:linear-gradient(90deg,#fa9000,#f82f4e);box-shadow:0 0 10px rgba(250,144,0,.55);transition:width .28s cubic-bezier(.22,.61,.36,1),opacity .35s ease;pointer-events:none}',
    '.aj-navbar.is-done{opacity:0}',

    /* --- image skeleton --- */
    '.aj-skel{position:absolute;inset:0;z-index:0;background:#e4e4e4;overflow:hidden;transition:opacity .45s ease}',
    '.aj-skel.on-dark{background:#2a2a2a}',
    '.aj-skel::after{content:"";position:absolute;inset:0;background-image:linear-gradient(90deg,rgba(255,255,255,0) 0,rgba(255,255,255,.55) 50%,rgba(255,255,255,0) 100%);background-size:200% 100%;animation:ajShimmer 1.25s linear infinite}',
    '.aj-skel.on-dark::after{background-image:linear-gradient(90deg,rgba(255,255,255,0) 0,rgba(255,255,255,.12) 50%,rgba(255,255,255,0) 100%)}',
    '.aj-skel.is-gone{opacity:0}',
    '@keyframes ajShimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}',
    'img.aj-lazy-img{opacity:0;transition:opacity .55s ease}',
    'img.aj-lazy-img.is-shown{opacity:1}',

    /* --- content reveal --- */
    '.aj-reveal{opacity:0;transform:translateY(16px);transition:opacity .6s cubic-bezier(.22,.61,.36,1),transform .6s cubic-bezier(.22,.61,.36,1)}',
    '.aj-reveal.is-in{opacity:1;transform:none}',

    '@media (prefers-reduced-motion: reduce){.aj-skel::after{animation:none}.aj-reveal{opacity:1;transform:none;transition:none}img.aj-lazy-img{opacity:1}}'
  ].join('\n');

  var st = document.createElement('style');
  st.id = 'aj-lazy-style';
  st.textContent = CSS;
  document.head.appendChild(st);

  /* ---------- 1. navigation progress bar ---------- */
  var bar = null, creep = null;
  function startBar() {
    if (bar) return;
    bar = document.createElement('div');
    bar.className = 'aj-navbar';
    document.body.appendChild(bar);
    requestAnimationFrame(function () { bar.style.width = '18%'; });
    var pct = 18;
    creep = setInterval(function () {
      pct += (92 - pct) * 0.14;
      bar.style.width = pct.toFixed(1) + '%';
    }, 260);
  }
  function finishBar() {
    if (!bar) return;
    clearInterval(creep);
    bar.style.width = '100%';
    bar.classList.add('is-done');
    var b = bar; bar = null;
    setTimeout(function () { if (b.parentNode) b.parentNode.removeChild(b); }, 450);
  }

  /* Prototype dead-end links (href="#") shouldn't yank the page back to the
     top when clicked — swallow them. */
  document.addEventListener('click', function (e) {
    var stub = e.target.closest && e.target.closest('a[href="#"]');
    if (stub) e.preventDefault();
  });

  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href$=".html"]');
    if (!a) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    if (a.target && a.target !== '_self') return;
    startBar();
  }, true);
  // if the browser restores this page from bfcache, clear any stale bar
  window.addEventListener('pageshow', finishBar);

  /* ---------- 2 + 3. lazy imagery and content reveal ---------- */
  function isDarkBehind(el) {
    for (var n = el, i = 0; n && i < 8; n = n.parentElement, i++) {
      var bg = getComputedStyle(n).backgroundColor;
      var m = bg && bg.match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/);
      if (!m) continue;
      if (m[4] !== undefined && parseFloat(m[4]) < 0.1) continue;
      var lum = 0.299 * +m[1] + 0.587 * +m[2] + 0.114 * +m[3];
      return lum < 110;
    }
    return false;
  }

  function setupLazyImages(scope) {
    var imgs = [].slice.call(scope.querySelectorAll('img'));
    var targets = [];

    imgs.forEach(function (img) {
      if (img.getAttribute('data-aj-lazy')) return;
      // skip vector chrome (icons, logos, rules) — only photography gets a skeleton
      if (/^data:image\/svg/.test(img.src || '')) return;
      var r = img.getBoundingClientRect();
      if (r.width < 140 || r.height < 100) return;
      var parent = img.parentElement;
      if (!parent) return;
      var pr = parent.getBoundingClientRect();
      if (!pr.width || !pr.height) return;
      // only when the image is the dominant content of its box
      if ((r.width * r.height) / (pr.width * pr.height) < 0.6) return;

      var pos = getComputedStyle(parent).position;
      if (pos === 'static') parent.style.position = 'relative';

      img.setAttribute('data-aj-lazy', '1');
      img.setAttribute('decoding', 'async');
      if (!img.hasAttribute('loading')) img.setAttribute('loading', 'lazy');

      var skel = document.createElement('span');
      skel.className = 'aj-skel' + (isDarkBehind(parent) ? ' on-dark' : '');
      parent.insertBefore(skel, img);
      img.classList.add('aj-lazy-img');
      targets.push({ img: img, skel: skel });
    });

    function reveal(t, delay) {
      setTimeout(function () {
        t.img.classList.add('is-shown');
        t.skel.classList.add('is-gone');
        setTimeout(function () { if (t.skel.parentNode) t.skel.parentNode.removeChild(t.skel); }, 500);
      }, delay);
    }

    if (REDUCED || !('IntersectionObserver' in window)) {
      targets.forEach(function (t) { reveal(t, 0); });
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      var n = 0;
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var t = targets.filter(function (x) { return x.img === en.target; })[0];
        if (!t) return;
        io.unobserve(en.target);
        // a short beat so the skeleton is legible, staggered across a batch
        reveal(t, 120 + (n++) * 70);
      });
    }, { rootMargin: '150px 0px', threshold: 0.01 });

    targets.forEach(function (t) { io.observe(t.img); });
  }

  /* A block taller than the viewport reveals as one slab, which reads as an abrupt
     load — descend into those instead. Sticky elements are skipped entirely: a
     transform on them (or on an ancestor) breaks their positioning context. */
  function hasSticky(el) {
    return /(^|\s)sticky(\s|$)/.test(el.className || '') || !!el.querySelector('.sticky');
  }

  function collectRevealBlocks(scope) {
    var vh = window.innerHeight, out = [];
    (function walk(parent, depth) {
      [].slice.call(parent.children).forEach(function (el) {
        var r = el.getBoundingClientRect();
        if (r.height < 24) return;
        if (el.classList.contains('aj-enter')) return;      // owned by the entrance
        if (hasSticky(el)) {
          if (el.children.length && depth < 5) walk(el, depth + 1);
          return;
        }
        if (r.height > vh * 1.15 && el.children.length && depth < 5) walk(el, depth + 1);
        else out.push(el);
      });
    })(scope, 0);
    return out;
  }

  function setupReveal(scope) {
    if (REDUCED || !('IntersectionObserver' in window)) return;
    var blocks = collectRevealBlocks(scope);
    if (!blocks.length) return;
    blocks.forEach(function (el) { el.classList.add('aj-reveal'); });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.classList.add('is-in');
        io.unobserve(en.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.02 });
    blocks.forEach(function (el) { io.observe(el); });
  }

  function init() {
    finishBar();
    var main = document.querySelector('main');
    if (!main) return;
    setupLazyImages(main);
    setupReveal(main);
  }

  if (document.readyState === 'complete') init();
  else window.addEventListener('load', init);
})();
