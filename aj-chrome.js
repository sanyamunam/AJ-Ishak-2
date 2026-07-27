/* Shared site chrome. One source of truth for the Al Jazeera header across every
   page: the real homepage <header> markup (aj-header.html) plus the Tailwind
   utilities and fonts it depends on.

   Pages that already ship the header inline (index, article) are left alone —
   the script only injects where it's missing, so nothing is duplicated. */
(function () {
  'use strict';

  var CSS_FILES = ['aj-shared.css', 'aj-fonts.css', 'aj-chrome.css'];
  var HEADER_URL = 'aj-header.html';
  var FOOTER_URL = 'aj-footer.html';

  /* Account page ships a warm gradient wash behind the dashboard; the design calls
     for plain white, so neutralise it once the shared chrome is in place. */
  /* The account bundle renders its own date + theme strip, which now duplicates the
     one in the shared header. Drop the bundle's copy. */
  function dropDuplicateStrip() {
    var row = document.querySelector('[data-dc-tpl="8"]');
    if (!row) return;
    var strip = row.parentElement;
    if (strip && /Doha/.test(strip.textContent || '')) strip.remove();
    else row.remove();
  }

  function whiteBackground() {
    if (document.getElementById('aj-chrome-bg')) return;
    var st = document.createElement('style');
    st.id = 'aj-chrome-bg';
    st.textContent =
      'body,#dc-root,#dc-root > .sc-host,#dc-root > .sc-host > div{background:#fff!important}' +
      '#dc-root [data-body-row]{background:transparent!important}';
    document.head.appendChild(st);
  }

  /* Host bundles set a bare `a{color:...}` that bleeds into the injected chrome and
     turns nav/footer links blue. Re-neutralise inside our containers so the header's
     own colour classes win again. */
  function scopeLinkColours() {
    if (document.getElementById('aj-chrome-reset')) return;
    var st = document.createElement('style');
    st.id = 'aj-chrome-reset';
    st.textContent =
      '#aj-chrome a,#aj-chrome-footer a{color:inherit;text-decoration:none}' +
      '#aj-chrome,#aj-chrome-footer{color:#101010}' +
      '#aj-chrome-footer{margin-top:80px}';
    document.head.appendChild(st);
  }

  function ensureCss() {
    CSS_FILES.forEach(function (href) {
      if (document.querySelector('link[href^="' + href + '"]')) return;
      // if the page already inlines these utilities, don't load them twice
      if (href === 'aj-shared.css' && document.querySelector('style[data-vite-dev-id]')) return;
      var l = document.createElement('link');
      l.rel = 'stylesheet';
      l.href = href + '?v=1';
      document.head.appendChild(l);
    });
  }

  /* The games bundle renders its own header/footer; strip them so ours is the
     only chrome, and keep re-checking briefly in case React mounts late. */
  /* Only strip the tag we're actually replacing — stripping headers while skipping
     header injection would leave the page with no header at all. */
  function stripBundleChrome(tags) {
    var mine = [document.getElementById('aj-chrome'), document.getElementById('aj-chrome-footer')]
      .filter(Boolean);
    [].slice.call(document.querySelectorAll(tags)).forEach(function (el) {
      var ours = mine.some(function (m) { return m === el || m.contains(el) || el.contains(m); });
      if (!ours) el.remove();
    });
    var legacy = document.getElementById('aj-hp');
    if (legacy) legacy.remove();
  }

  /* The header is inert without its behaviour scripts — load them after injection
     so the ask bar expands and the ticker scrolls exactly as on the homepage. */
  function ensureScripts() {
    ['aj-ask.js'].forEach(function (src) {
      if (document.querySelector('script[src^="' + src + '"]')) return;
      var s = document.createElement('script');
      s.src = src + '?v=1';
      s.defer = true;
      document.body.appendChild(s);
    });
  }

  function inject(id, html, where) {
    if (document.getElementById(id)) return;
    var wrap = document.createElement('div');
    wrap.id = id;
    wrap.innerHTML = html;
    if (where === 'top') document.body.insertBefore(wrap, document.body.firstChild);
    else document.body.appendChild(wrap);
  }

  function load(url, id, where, tag) {
    return fetch(url + '?v=1')
      .then(function (r) { return r.ok ? r.text() : Promise.reject(r.status); })
      .then(function (html) { stripBundleChrome(tag); inject(id, html, where); })
      .catch(function (e) { console.warn('[aj-chrome] ' + url + ' failed:', e); });
  }

  // the genuine site header carries the pink "Ask Al Jazeera" bar; bundle
  // stand-ins don't, so that's what distinguishes real from placeholder
  function hasRealHeader() { return !!document.querySelector('header .aj-ask-gradient'); }
  // the genuine footer ships with the site's font class; bundle stand-ins are unclassed
  function hasRealFooter() { return !!document.querySelector('footer.font-anybody'); }

  /* Ticker ships as part of the shared footer; account page shows a dashboard, so
     the news scroll is noise there. */
  function dropTicker() {
    var t = document.querySelector('#aj-chrome-footer .aj-ticker, #aj-chrome-footer [class*="bg-black"] p');
    if (!t) return;
    var bar = t.closest('.aj-ticker') || t.closest('div[class*="bg-black"]');
    if (bar && /HEADLINES/i.test(bar.textContent || '')) bar.remove();
  }

  function init() {
    ensureCss();
    scopeLinkColours();
    if (/account/i.test(location.pathname)) whiteBackground();

    var needHeader = !hasRealHeader();
    var needFooter = !hasRealFooter();

    var jobs = [], tags = [];
    if (needHeader) { jobs.push(load(HEADER_URL, 'aj-chrome', 'top', 'header')); tags.push('header'); }
    if (needFooter) { jobs.push(load(FOOTER_URL, 'aj-chrome-footer', 'bottom', 'footer')); tags.push('footer'); }
    if (!jobs.length) return;

    var sel = tags.join(',');
    var isAccount = /account/i.test(location.pathname);
    Promise.all(jobs).then(function () {
      // the bundle may re-render its own chrome for a moment after mount
      if (needHeader) ensureScripts();
      var n = 0, iv = setInterval(function () {
        stripBundleChrome(sel);
        if (isAccount) { dropDuplicateStrip(); dropTicker(); }
        if (++n > 20) clearInterval(iv);
      }, 250);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
