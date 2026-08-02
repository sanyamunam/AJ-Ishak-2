/* CAPSULES autoplay carousel. One card in the dark capsule strip is always
   "featured": rendered larger, autoplaying its clip inline (muted) with an
   orange progress bar. When the clip ends the spotlight advances to the next
   card, which grows into the featured slot. Clicks still open the aj-stories
   overlay viewer — the inline video is click-transparent.

   The featured card is styled from page load; the clip itself starts when the
   strip scrolls into view (a muted video playing below the fold draws no
   attention and costs bandwidth) and pauses again when it scrolls out.

   The exported markup ships one hardcoded featured card (240px, play badge,
   static orange bar); it gets normalised here so every card can take the
   featured role in turn. */
(function () {
  'use strict';

  /* Only cards listed here play a clip and take a turn in the featured slot;
     the rest stay as static posters. Matched case-insensitively on the
     poster image's alt-text prefix. */
  var VIDEO_MAP = [
    { alt: 'dr hussam abu safia', src: 'assets/dr-hussam.webm' },
    { alt: 'philippines volcano erupts', src: 'assets/capsule%20video.webm' }
  ];
  var FALLBACK_MS = 8000;   // rotation cadence if the video can't play at all

  /* Clips ship as VP9 WebM. Safari only gained VP9 support in 16, so anything
     older is handed the original MP4 rather than a dead card. */
  function playable(src) {
    var probe = document.createElement('video');
    if (probe.canPlayType && probe.canPlayType('video/webm; codecs="vp9"')) return src;
    return src.replace(/\.webm$/, '.mp4');
  }

  var players = [], live = -1;   // players: {card, src} for video-backed cards
  var video = null, playPromise = null, raf = 0, fallbackTimer = 0;
  var visible = false;

  function addStyle() {
    if (document.getElementById('aj-caps-style')) return;
    var st = document.createElement('style');
    st.id = 'aj-caps-style';
    st.textContent = [
      '.aj-cap{width:224px!important;transition:width .65s cubic-bezier(.22,1,.36,1)}',
      '.aj-cap .aj-cap-media{height:280px!important;width:100%!important;transition:height .65s cubic-bezier(.22,1,.36,1)}',
      '.aj-cap>p{width:100%!important;transition:font-size .4s ease}',
      '.aj-cap.is-live{width:304px!important}',
      '.aj-cap.is-live .aj-cap-media{height:380px!important}',
      '.aj-cap.is-live>p{font-size:16px!important;line-height:21px!important}',
      /* inline clip sits above the poster, below the duration tag */
      '.aj-cap-media video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;pointer-events:none;opacity:0;transition:opacity .45s ease}',
      '.aj-cap-media video.on{opacity:1}',
      /* orange progress bar along the top of the featured media */
      '.aj-cap-bar{position:absolute;left:0;top:0;height:5px;width:100%;background:rgba(255,255,255,.18);z-index:2;opacity:0;transition:opacity .3s ease}',
      '.aj-cap.is-live .aj-cap-bar{opacity:1}',
      '.aj-cap-bar i{display:block;height:100%;width:0;background:#fa9000}',
      /* NOW PLAYING chip in the media corner */
      '.aj-cap-now{position:absolute;right:0;bottom:0;z-index:2;display:none;align-items:center;gap:6px;background:#fa9000;color:#141414;font:700 10px/1 Arial,Helvetica,sans-serif;letter-spacing:.14em;padding:8px 10px;text-transform:uppercase}',
      '.aj-cap-now::before{content:"";width:6px;height:6px;border-radius:50%;background:#141414;animation:ajCapBlink 1.1s ease-in-out infinite}',
      '.aj-cap.is-live .aj-cap-now{display:flex}',
      '@keyframes ajCapBlink{0%,100%{opacity:1}50%{opacity:.25}}',
      /* hairline dividers stretch with whichever card is featured */
      '.aj-cap-row>div[class~="w-px"]{height:auto!important;align-self:stretch!important}',
      '@media (prefers-reduced-motion:reduce){.aj-cap,.aj-cap .aj-cap-media,.aj-cap>p{transition:none}}'
    ].join('\n');
    document.head.appendChild(st);
  }

  function findRow() {
    var secs = document.querySelectorAll('section');
    for (var i = 0; i < secs.length; i++) {
      if (/bg-\[#171717\]/.test(secs[i].className) && /CAPSULES/.test(secs[i].textContent || '')) {
        var rows = secs[i].querySelectorAll(':scope > div.flex');
        for (var r = 0; r < rows.length; r++) {
          if (rows[r].querySelector('a')) return rows[r];
        }
      }
    }
    return null;
  }

  /* strip the hardcoded featured styling so all cards start equal */
  function normalise(card) {
    var media = card.querySelector('div.relative');
    if (!media) return false;
    card.classList.add('aj-cap');
    media.classList.add('aj-cap-media');
    // the exported featured card ships a static play badge + top bar; drop them
    [].slice.call(media.children).forEach(function (el) {
      var c = el.className || '';
      if (/size-\[64px\]/.test(c) || (/h-\[6px\]/.test(c) && /bg-\[#fa9000\]/.test(c))) el.remove();
    });
    // progress bar + NOW PLAYING chip, shown only while featured
    var bar = document.createElement('span');
    bar.className = 'aj-cap-bar';
    bar.innerHTML = '<i></i>';
    media.appendChild(bar);
    var now = document.createElement('span');
    now.className = 'aj-cap-now';
    now.textContent = 'Now playing';
    media.appendChild(now);
    return true;
  }

  /* pause() during a pending play() rejects the promise with AbortError —
     chain the pause behind it so the rejection never happens */
  function safePause(v) {
    if (playPromise && playPromise.then) {
      playPromise.then(function () { v.pause(); }).catch(function () {});
    } else {
      try { v.pause(); } catch (e) {}
    }
  }

  function clearClip() {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    if (fallbackTimer) clearTimeout(fallbackTimer);
    fallbackTimer = 0;
    if (video) {
      var v = video;
      video = null;
      playPromise = null;
      v.classList.remove('on');
      safePause(v);
      setTimeout(function () { v.remove(); }, 500);
    }
  }

  function fallbackAdvance(fill) {
    // clip can't play (autoplay policy / decode error): timed rotation instead
    if (fallbackTimer) return;
    if (fill) {
      fill.style.transition = 'width ' + FALLBACK_MS + 'ms linear';
      requestAnimationFrame(function () { fill.style.width = '100%'; });
    }
    fallbackTimer = setTimeout(function () { advance(); }, FALLBACK_MS);
  }

  function startClip() {
    if (video || live < 0 || !visible) return;
    var card = players[live].card;
    var media = card.querySelector('.aj-cap-media');
    var fill = card.querySelector('.aj-cap-bar i');
    if (!media) return;
    if (fill) { fill.style.transition = ''; fill.style.width = '0'; }

    var v = document.createElement('video');
    v.src = playable(players[live].src);
    v.muted = true;
    v.playsInline = true;
    v.setAttribute('playsinline', '');
    v.setAttribute('webkit-playsinline', '');
    v.preload = 'auto';
    // insert above the poster img but below the duration tag / bar / chip
    var img = media.querySelector('img');
    if (img && img.nextSibling) media.insertBefore(v, img.nextSibling);
    else media.appendChild(v);
    video = v;

    v.addEventListener('playing', function () { if (v === video) v.classList.add('on'); });
    v.addEventListener('ended', function () { if (v === video) advance(); });
    v.addEventListener('error', function () { if (v === video) fallbackAdvance(fill); });

    function tick() {
      if (v !== video) return;
      if (fill && v.duration) fill.style.width = (v.currentTime / v.duration * 100) + '%';
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);

    playPromise = v.play();
    if (playPromise && playPromise.catch) {
      playPromise.catch(function (err) {
        if (v !== video) return;                     // superseded, ignore
        if (err && err.name === 'AbortError') return; // our own pause, ignore
        fallbackAdvance(fill);                        // genuine autoplay refusal
      });
    }
  }

  function feature(i) {
    if (!players.length) return;
    i = ((i % players.length) + players.length) % players.length;
    if (i === live) return;
    clearClip();
    if (live > -1) {
      players[live].card.classList.remove('is-live');
      var oldFill = players[live].card.querySelector('.aj-cap-bar i');
      if (oldFill) { oldFill.style.transition = ''; oldFill.style.width = '0'; }
    }
    live = i;
    players[live].card.classList.add('is-live');
    startClip();
  }

  function advance() { feature(live + 1); }

  function watchViewport(row) {
    if (!('IntersectionObserver' in window)) { visible = true; startClip(); return; }
    var io = new IntersectionObserver(function (entries) {
      var vis = entries[0].isIntersecting;
      if (vis === visible) return;
      visible = vis;
      if (visible) {
        if (video) { playPromise = video.play(); if (playPromise && playPromise.catch) playPromise.catch(function () {}); }
        else startClip();
      } else if (video) {
        safePause(video);   // freeze in place; resumes where it left off
      } else if (fallbackTimer) {
        clearTimeout(fallbackTimer); fallbackTimer = 0;
      }
    }, { threshold: 0.25 });
    io.observe(row);
  }

  function altOf(card) {
    var img = card.querySelector('img');
    return (img && img.alt || '').toLowerCase();
  }

  /* the Dr Hussam card trades places with Extreme Weather so it sits right
     beside the central card — the spotlight starts centre, then steps to it */
  function reorder(row) {
    var links = [].slice.call(row.querySelectorAll('a'));
    function byAlt(p) {
      return links.filter(function (a) { return altOf(a).indexOf(p) === 0; })[0];
    }
    var hussam = byAlt('dr hussam abu safia');
    var weather = byAlt('extreme weather disrupts');
    if (!hussam || !weather) return;
    var marker = document.createComment('aj-cap-swap');
    weather.parentNode.replaceChild(marker, weather);
    hussam.parentNode.replaceChild(weather, hussam);
    marker.parentNode.replaceChild(hussam, marker);
  }

  function init() {
    var row = findRow();
    if (!row) return false;
    row.classList.add('aj-cap-row');
    addStyle();
    reorder(row);
    // normalise every card (the export ships one pre-styled featured card),
    // but only video-backed cards join the featured rotation
    var cards = [].slice.call(row.children).filter(function (el) {
      return el.tagName === 'A' && el.querySelector('img');
    }).filter(normalise);
    if (!cards.length) return false;
    // one player per clip; duplicate headlines resolve to the card nearest
    // the centre of the strip, and the rotation starts from the centre out
    var mid = (cards.length - 1) / 2;
    var dist = function (c) { return Math.abs(cards.indexOf(c) - mid); };
    players = [];
    VIDEO_MAP.forEach(function (m) {
      var matches = cards.filter(function (c) { return altOf(c).indexOf(m.alt) === 0; });
      if (!matches.length) return;
      matches.sort(function (a, b) { return dist(a) - dist(b); });
      players.push({ card: matches[0], src: m.src });
    });
    players.sort(function (a, b) {
      return (dist(a.card) - dist(b.card)) ||
             (cards.indexOf(a.card) - cards.indexOf(b.card));
    });
    if (!players.length) return false;
    feature(0);          // featured styling shows immediately …
    watchViewport(row);  // … the clip starts once the strip is in view
    return true;
  }

  function boot() {
    if (init()) return;
    var n = 0, iv = setInterval(function () { if (init() || ++n > 20) clearInterval(iv); }, 300);
  }

  if (document.readyState === 'complete') boot();
  else window.addEventListener('load', boot);
})();
