/* Desktop fit-to-viewport. The layout is authored on a 1920px canvas (1440px
   content columns, some strips flush at 1920), so on narrower windows it reads
   oversized until the browser is manually zoomed out. Scale the page so the
   full canvas always fits: zoom = viewport / 1920, capped at 1.

   Below 1024px the responsive stylesheet takes over (its body{zoom:1!important}
   guard also outranks the inline zoom set here). */
(function () {
  'use strict';

  var DESIGN_WIDTH = 1920;

  function fit() {
    if (!document.body) return;
    // clientWidth excludes the scrollbar, unlike innerWidth
    var w = document.documentElement.clientWidth;
    if (w < 1024) {
      document.body.style.zoom = '';
      return;
    }
    document.body.style.zoom = Math.min(1, w / DESIGN_WIDTH);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fit);
  else fit();
  // clientWidth shrinks once the scrollbar appears after first paint
  window.addEventListener('load', fit);
  window.addEventListener('resize', fit);

  /* ---- scroll memory ----------------------------------------------------
     Returning to a page lands exactly where the reader left it, app-style.
     Position is saved per path on the way out and restored when arriving
     from another page of the site (or via back/forward). A direct/external
     arrival starts clean at the top. Bundle pages build their content late,
     so restoration retries until the page is tall enough. */
  (function () {
    var key = 'ajScroll:' + location.pathname;
    window.addEventListener('pagehide', function () {
      try { sessionStorage.setItem(key, String(window.scrollY || document.documentElement.scrollTop || 0)); } catch (e) {}
    });
    var nav = (performance.getEntriesByType && performance.getEntriesByType('navigation')[0]) || {};
    var internal = document.referrer.indexOf(location.origin) === 0 &&
                   document.referrer !== location.href;
    if (!(internal || nav.type === 'back_forward')) return;
    var saved = 0;
    try { saved = parseFloat(sessionStorage.getItem(key)) || 0; } catch (e) {}
    if (saved < 60) return;
    var t0 = Date.now();
    (function restore() {
      if (document.documentElement.scrollHeight - window.innerHeight >= saved - 12) {
        window.scrollTo(0, saved);
      } else if (Date.now() - t0 < 4000) {
        setTimeout(restore, 120);
      }
    })();
  })();
})();
