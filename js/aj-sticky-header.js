/* Pin the masthead. On scroll the dark date/weather strip rolls away and the
   brand row + section nav + "Ask Al Jazeera" bar stay parked at the top of the
   viewport, on every page of the site.

   Why the whole <header> is the sticky element rather than the two rows the
   design calls for: position:sticky only pins a box that is in normal flow with
   its siblings, so you cannot pin row 1 and row 4 while row 3 scrolls out from
   between them. Instead the header sticks as a unit at a NEGATIVE offset equal
   to the strip's height — the strip scrolls up out of sight, everything below it
   catches at y=0. Same result, one box.

   The styles ship from here rather than a stylesheet because two pages (games,
   account) are bundle-rendered and rebuild <head> at boot; a <link> would be
   dropped on the floor. The guard below puts the <style> back if that happens. */
(function () {
  'use strict';

  var STYLE_ID = 'aj-sticky-header-css';
  var CSS = [
    /* aj-chrome.js injects the header inside a wrapper div. A sticky box is
       clipped to its parent, and that wrapper is exactly header-height, so the
       header would unstick the instant it scrolled. display:contents removes
       the wrapper from layout and hands the header back to <body>. */
    '#aj-chrome{display:contents}',

    'header.aj-sticky{position:sticky;top:calc(-1 * var(--aj-strip, 0px));z-index:900}',

    /* The pinned rows are opaque, but the header is a flex column and any gap
       would let article text show through. */
    'header.aj-sticky{background:#fff}',

    /* No drop shadow under the pinned header: the Ask bar's own animated
       bottom stroke already draws the edge, and a gradient on top of it read
       as a smudge over the article. */

    /* The Ask panel expands inside the header. Pinned, it would nail a
       full-viewport sheet to the top and swallow the page; let the header sit
       back in the flow for as long as the panel is open or closing. */
    'header.aj-sticky:has(.aj-ask-panel.is-open),' +
      'header.aj-sticky:has(.aj-ask-panel.is-closing){position:static}',

    /* Anchor jumps and scrollIntoView must clear the pinned rows. */
    'html{scroll-padding-top:var(--aj-pinned, 0px)}',

    /* A pinned header that eats a third of a phone screen is worse than no
       pinned header; the mobile masthead collapses to brand + ask bar, but if a
       viewport is short enough that it still crowds, drop back to normal flow. */
    '@media (max-height: 520px){header.aj-sticky{position:static}}'
  ].join('');

  function ensureStyle() {
    if (document.getElementById(STYLE_ID)) return;
    var st = document.createElement('style');
    st.id = STYLE_ID;
    st.textContent = CSS;
    (document.head || document.documentElement).appendChild(st);
  }

  function header() {
    // the genuine masthead is the one carrying the pink Ask bar; bundle
    // stand-ins do not have it, and pinning those would pin the wrong box
    var bar = document.querySelector('header .aj-ask-gradient');
    return bar ? bar.closest('header') : null;
  }

  /* Strip height drives the negative offset, so it has to track reality: the
     responsive sheet changes its padding, and aj-ask.js collapses it to zero
     while the Ask panel is open. */
  function measure(h) {
    var strip = h.querySelector('.aj-topstrip') || h.firstElementChild;
    var s = strip ? strip.offsetHeight : 0;
    h.style.setProperty('--aj-strip', s + 'px');
    /* scroll-padding is set on <html>, which sits outside body's zoom, so it
       has to be the on-screen height — getBoundingClientRect gives us that,
       offsetHeight does not. */
    var visible = h.getBoundingClientRect().height -
                  (strip ? strip.getBoundingClientRect().height : 0);
    document.documentElement.style.setProperty('--aj-pinned', Math.max(0, visible) + 'px');
  }

  var current = null;

  function sync() {
    ensureStyle();
    var h = header();
    if (!h) return false;
    if (h !== current) {
      current = h;
      h.classList.add('aj-sticky');
      if (window.ResizeObserver) new ResizeObserver(function () { measure(h); }).observe(h);
    }
    measure(h);
    return true;
  }

  function start() {
    sync();
    /* The header arrives late on injected pages, and a bundle boot can wipe
       both it and our <style>. Re-check briefly, then leave it to the observer. */
    var n = 0, iv = setInterval(function () { sync(); if (++n > 40) clearInterval(iv); }, 250);
    new MutationObserver(function () {
      if (!document.getElementById(STYLE_ID) || (current && !current.isConnected)) {
        current = null;
        sync();
      }
    }).observe(document.documentElement, { childList: true, subtree: true });

    addEventListener('resize', function () { if (current) measure(current); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
