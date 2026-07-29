/* Click-to-play: certain hero <img> thumbnails carry a matching mp4. The image
   shows by default (poster). Clicking anywhere on the thumbnail media area —
   the image itself OR any overlay stacked on top (play badge, corner tag) —
   swaps the image for an inline playing muted looped video, once. Navigation
   to the article via the parent anchor is suppressed on that one click; once
   the video is showing, further clicks fall through the anchor and navigate. */
(function () {
  'use strict';

  // alt-text prefix (case-insensitive) -> mp4 asset path
  /* Inline swap is retired: capsule cards now open in the aj-stories.js
     overlay viewer (Instagram-style), which handles video playback itself.
     Keeping the file (and an empty map) so old script tags stay harmless. */
  var MAP = [];

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

  function markAndBind(img, src) {
    // Prevent double-binding on the same image (init retries + delayed loads).
    img.setAttribute('data-aj-vid-armed', '1');
    // A pointer-cursor hint that this thumbnail has extra behaviour, applied to
    // the whole media area (including overlays), not just the img.
    var media = img.parentNode;   // <div class="relative ..."> wrapping img + overlays
    if (media) media.style.cursor = 'pointer';

    // Bind at the capture phase on the ancestor <a> so we win over the
    // anchor's default navigation. A single click ANYWHERE inside the media
    // container (image itself, play badge overlay, corner tag) triggers the
    // swap; clicks outside the media area (headline text below, etc.) still
    // navigate the anchor normally.
    var link = img.closest('a');
    var host = link || media || img.parentNode;

    var onClick = function (e) {
      var t = e.target;
      // Only intercept if the click landed inside the media container.
      if (!media || !(t === media || media.contains(t))) return;
      e.preventDefault();
      e.stopPropagation();

      var v = makeVideo(img, src);
      img.parentNode.replaceChild(v, img);
      v.play().catch(function () { /* autoplay policy handled by muted=true */ });

      // Video is in play — hand subsequent clicks back to the anchor so a
      // second tap navigates as usual.
      host.removeEventListener('click', onClick, true);
    };
    host.addEventListener('click', onClick, true);
  }

  function scan() {
    var imgs = document.querySelectorAll('img[alt]:not([data-aj-vid-armed])');
    imgs.forEach(function (img) {
      var alt = (img.alt || '').toLowerCase();
      for (var i = 0; i < MAP.length; i++) {
        if (alt.indexOf(MAP[i].alt) === 0) {
          markAndBind(img, MAP[i].src);
          break;
        }
      }
    });
  }

  function init() {
    scan();
    // Re-scan for a while — some content is injected after load.
    var n = 0, iv = setInterval(function () { scan(); if (++n > 20) clearInterval(iv); }, 300);
  }

  if (document.readyState === 'complete') init();
  else window.addEventListener('load', init);
})();
