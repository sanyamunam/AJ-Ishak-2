/* Runtime swap: replace certain hero <img> thumbnails with autoplay muted looping
   video elements. Keeps the exact layout (same absolute position, cover fit),
   so surrounding rounded frame + hover zoom still work. */
(function () {
  'use strict';

  // alt-text prefix (case-insensitive) -> mp4 asset path
  var MAP = [
    { alt: 'philippines volcano erupts', src: 'assets/foryou/film-volcano.mp4' }
  ];

  function makeVideo(oldImg, src) {
    var v = document.createElement('video');
    v.src = src;
    v.autoplay = true;
    v.muted = true;
    v.loop = true;
    v.playsInline = true;
    v.setAttribute('playsinline', '');
    v.setAttribute('webkit-playsinline', '');
    v.preload = 'auto';
    v.className = oldImg.className;    // absolute inset-0 size-full object-cover …
    v.style.cssText = oldImg.style.cssText;
    v.setAttribute('aria-label', oldImg.alt || '');
    v.setAttribute('data-aj-vid', '1');
    return v;
  }

  function swap() {
    var imgs = document.querySelectorAll('img[alt]:not([data-aj-vid-done])');
    imgs.forEach(function (img) {
      var alt = (img.alt || '').toLowerCase();
      for (var i = 0; i < MAP.length; i++) {
        if (alt.indexOf(MAP[i].alt) === 0) {
          img.setAttribute('data-aj-vid-done', '1');
          var v = makeVideo(img, MAP[i].src);
          img.parentNode.replaceChild(v, img);
          break;
        }
      }
    });
  }

  function init() {
    swap();
    var n = 0, iv = setInterval(function () { swap(); if (++n > 20) clearInterval(iv); }, 300);
  }

  if (document.readyState === 'complete') init();
  else window.addEventListener('load', init);
})();
