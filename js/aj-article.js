/* Article page micro-interactions — the page used to snap into place all at once.
   1. Reading progress bar across the top
   2. Staggered entrance for the article header (kicker, headline, standfirst, byline, hero)
   3. A slow, continuous zoom on the hero image once it lands
   4. Copy Text in the republish row: article body to the clipboard, icon flips
      to a green check and a toast confirms, then everything reverts
   Runs at parse time (defer) so it can claim the entrance blocks before js/aj-lazy.js
   collects its scroll-reveal set on window load.
*/
(function () {
  'use strict';

  /* the hosted preview serves this page under the neutral alias /story */
  if (!/aljazeera-article|(^|\/)story$/i.test(location.pathname)) return;

  var REDUCED = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var CSS = [
    '.aj-read-progress{position:fixed;left:0;top:0;height:3px;width:0;z-index:9998;background:#fa9000;transition:width .12s linear;pointer-events:none}',

    '.aj-enter{opacity:0;transform:translateY(18px);transition:opacity .7s cubic-bezier(.22,.61,.36,1),transform .7s cubic-bezier(.22,.61,.36,1)}',
    '.aj-enter.is-in{opacity:1;transform:none}',

    /* the hero keeps drifting in after it arrives, so the page settles rather than stops */
    '.aj-hero-zoom{overflow:hidden}',
    '.aj-hero-zoom img{transform:scale(1);transform-origin:center center;transition:transform 7s cubic-bezier(.16,.68,.4,1)}',
    '.aj-hero-zoom.is-in img{transform:scale(1.06)}',

    /* copy-to-clipboard toast, bottom centre */
    '.aj-copy-toast{position:fixed;left:50%;bottom:36px;transform:translate(-50%,12px);display:flex;align-items:center;gap:10px;padding:12px 18px;background:#fff;border:1px solid rgba(0,0,0,.08);border-left:4px solid #1fa855;box-shadow:0 6px 24px rgba(0,0,0,.14);font:500 14px/1 Anybody,Arial,sans-serif;color:#202020;opacity:0;transition:opacity .25s ease,transform .25s ease;z-index:9999;pointer-events:none}',
    '.aj-copy-toast.on{opacity:1;transform:translate(-50%,0)}',
    '.aj-copy-toast.err{border-left-color:#d0021b}',

    '@media (prefers-reduced-motion: reduce){.aj-enter{opacity:1;transform:none;transition:none}.aj-hero-zoom img{transition:none;transform:none}.aj-read-progress{display:none}.aj-copy-toast{transition:opacity .25s ease}}'
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

  /* ---------- Copy Text ---------- */
  var CHECK_SVG = 'data:image/svg+xml,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">' +
    '<path d="M5 12.5l4.5 4.5L19 7.5" stroke="#1fa855" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
  );

  /* The complete article body: headline, standfirst and every body paragraph
     above the republish row. Captions, ad copy, bylines and the sensitive-
     content notice are filtered out — short lines, credit lines, the warning. */
  function articleText(btn) {
    var row = btn.closest('div');
    var main = document.querySelector('main') || document.body;
    var parts = [];
    var h1 = main.querySelector('h1');
    if (h1) parts.push(h1.textContent.trim());
    [].forEach.call(main.querySelectorAll('p'), function (p) {
      if (!(row.compareDocumentPosition(p) & Node.DOCUMENT_POSITION_PRECEDING)) return;
      var t = p.textContent.replace(/\s+/g, ' ').trim();
      if (t.length < 80) return;                          // captions, kickers, credits
      if (/^this video contains/i.test(t)) return;        // sensitive-content notice
      if (/^photograp?gh? by/i.test(t)) return;           // photo credit
      parts.push(t);
    });
    return parts.join('\n\n');
  }

  function toast(msg, isError) {
    var old = document.querySelector('.aj-copy-toast');
    if (old) old.remove();
    var el = document.createElement('div');
    el.className = 'aj-copy-toast' + (isError ? ' err' : '');
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    el.textContent = msg;
    document.body.appendChild(el);
    void el.offsetHeight;                    // flush so the fade-in transitions
    el.classList.add('on');
    setTimeout(function () {
      el.classList.remove('on');
      setTimeout(function () { el.remove(); }, 300);
    }, 2000);
  }

  function legacyCopy(text) {
    return new Promise(function (resolve, reject) {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.cssText = 'position:fixed;left:-9999px;top:0';
      document.body.appendChild(ta);
      ta.select();
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (e) {}
      ta.remove();
      ok ? resolve() : reject(new Error('execCommand failed'));
    });
  }

  function writeClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText && window.isSecureContext) {
      // the async API can still reject (focus, permissions) — try the legacy
      // path before reporting failure
      return navigator.clipboard.writeText(text).catch(function () { return legacyCopy(text); });
    }
    return legacyCopy(text);
  }

  function copyButton() {
    var btn = [].filter.call(document.querySelectorAll('button'), function (b) {
      return /copy\s*text/i.test((b.textContent || '').trim());
    })[0];
    if (!btn || btn.getAttribute('data-aj-copy')) return;
    btn.setAttribute('data-aj-copy', '1');

    var icon = btn.querySelector('img');
    var originalSrc = icon && icon.getAttribute('src');
    var revertT = null;

    btn.addEventListener('click', function () {
      writeClipboard(articleText(btn)).then(function () {
        if (icon) icon.setAttribute('src', CHECK_SVG);
        btn.setAttribute('aria-label', 'Text copied');
        toast('✓ Text copied successfully', false);
        clearTimeout(revertT);
        revertT = setTimeout(function () {
          if (icon && originalSrc) icon.setAttribute('src', originalSrc);
          btn.removeAttribute('aria-label');
        }, 2300);
      }, function () {
        toast('Unable to copy text', true);
      });
    });
  }

  function init() {
    readingProgress();
    entrance();
    copyButton();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
