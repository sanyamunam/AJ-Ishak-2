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
})();
