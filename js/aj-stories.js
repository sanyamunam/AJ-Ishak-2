/* Instagram-style story viewer for the World Cup round-up thumbnails.
   Click any round-up video card -> full-screen vertical story player:
   segmented progress bars up top, auto-advance, tap right/left to move,
   hold to pause, CLOSE / Esc to exit. Slides are built from the cards'
   own images + captions at click time, so it always matches the page. */
(function () {
  'use strict';

  var REDUCED = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var DURATION = 5000;   // ms per slide

  var CSS = [
    '.ajs-veil{position:fixed;inset:0;z-index:2147483000;background:rgba(8,8,8,.94);display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity .3s ease}',
    '.ajs-veil.on{opacity:1}',
    '.ajs-close{position:absolute;top:26px;right:32px;display:flex;align-items:center;gap:10px;background:none;border:0;cursor:pointer;color:#fff;font:600 13px/1 Arial,Helvetica,sans-serif;letter-spacing:2px;text-transform:uppercase;opacity:.85;z-index:3}',
    '.ajs-close:hover{opacity:1}',

    '.ajs-stage{position:relative;height:92vh;max-height:900px;aspect-ratio:9/16;max-width:94vw;display:flex;flex-direction:column}',
    '.ajs-bars{display:flex;gap:5px;padding:0 2px 12px}',
    '.ajs-bar{flex:1 1 0;height:3px;background:rgba(255,255,255,.28);overflow:hidden;border-radius:2px}',
    '.ajs-bar i{display:block;height:100%;width:0;background:#fff;border-radius:2px}',
    '.ajs-bar.done i{width:100%}',

    '.ajs-card{position:relative;flex:1 1 auto;min-height:0;overflow:hidden;background:linear-gradient(180deg,#cfcfcf,#8f8f8f);border-radius:2px}',
    '.ajs-card img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:0;transition:opacity .4s ease}',
    '.ajs-card img.on{opacity:1}',
    '.ajs-card video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:0;transition:opacity .4s ease}',
    '.ajs-card video.on{opacity:1}',
    '.ajs-card::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.42) 0%,rgba(0,0,0,0) 22%,rgba(0,0,0,0) 58%,rgba(0,0,0,.72) 100%);pointer-events:none}',

    '.ajs-head{position:absolute;top:14px;left:16px;right:16px;display:flex;align-items:center;gap:10px;z-index:2;color:#fff}',
    '.ajs-ava{width:28px;height:28px;border-radius:50%;background:#e3b23c;color:#141414;font:700 12px/1 Arial;display:flex;align-items:center;justify-content:center;flex:none}',
    '.ajs-src{font:700 13px/1 Arial,Helvetica,sans-serif;letter-spacing:.5px;text-transform:uppercase}',
    '.ajs-time{font:400 13px/1 Arial;opacity:.7}',
    '.ajs-title{position:absolute;left:22px;right:22px;bottom:26px;z-index:2;color:#fff;font:600 27px/1.28 Lora,Georgia,serif;text-wrap:pretty;text-shadow:0 1px 12px rgba(0,0,0,.4)}',

    '.ajs-nav{position:absolute;top:0;bottom:0;width:34%;z-index:2;cursor:pointer}',
    '.ajs-prev{left:0}.ajs-next{right:0}',

    /* the round-up cards get a subtle affordance */
    '.ajs-clickable{cursor:pointer}',
    '@media(max-width:560px){.ajs-stage{height:100vh;max-height:none;aspect-ratio:auto;width:100vw}.ajs-title{font-size:23px}}',
    '@media (prefers-reduced-motion: reduce){.ajs-veil,.ajs-card img{transition:none}}'
  ].join('\n');

  /* Cards whose image alt matches an entry here play a video slide in the
     viewer instead of a still. Matched case-insensitively on alt prefix. */
  var VIDEO_MAP = [
    { alt: 'philippines volcano erupts', src: 'assets/capsule%20video.mp4' },
    { alt: 'dr hussam abu safia', src: 'assets/dr-hussam.mp4' }
  ];

  var slides = [];      // {src, title, dur, video?}
  var idx = 0, timer = null, startTs = 0, elapsed = 0, paused = false, veil = null;

  function addStyle() {
    if (document.getElementById('ajs-style')) return;
    var st = document.createElement('style'); st.id = 'ajs-style'; st.textContent = CSS;
    document.head.appendChild(st);
  }

  function collectCards() {
    var durs = [].slice.call(document.querySelectorAll('*')).filter(function (e) {
      return e.children.length === 0 && /min\s?\d+sec/i.test(e.textContent);
    });
    var seen = [], cards = [];
    durs.forEach(function (d) {
      var host = d;
      for (var i = 0; i < 8; i++) { host = host.parentElement; if (host && host.querySelector('img')) break; }
      if (!host || seen.indexOf(host) > -1) return;
      seen.push(host);
      var img = host.querySelector('img');
      if (!img) return;
      // caption: a text node in the card that isn't the duration
      var caps = [].slice.call(host.querySelectorAll('*')).filter(function (e) {
        return e.children.length === 0 && e.textContent.trim().length > 6 && !/min\s?\d+sec/i.test(e.textContent);
      });
      var title = caps.length ? caps[0].textContent.trim() : (img.alt || 'World Cup 2026 — Week 1 Round Up');
      var alt = (img.alt || '').toLowerCase(), video = null;
      for (var v = 0; v < VIDEO_MAP.length; v++) {
        if (alt.indexOf(VIDEO_MAP[v].alt) === 0) { video = VIDEO_MAP[v].src; break; }
      }
      cards.push({ host: host, src: img.currentSrc || img.src, title: title, dur: d.textContent.trim(), video: video });
    });
    return cards;
  }

  function open(list, start) {
    slides = list;
    idx = start || 0;
    addStyle();

    veil = document.createElement('div');
    veil.className = 'ajs-veil';
    veil.innerHTML =
      '<button class="ajs-close" type="button">Close ✕</button>' +
      '<div class="ajs-stage">' +
        '<div class="ajs-bars"></div>' +
        '<div class="ajs-card">' +
          '<img alt="">' +
          '<video muted playsinline webkit-playsinline preload="auto"></video>' +
          '<div class="ajs-head"><span class="ajs-ava"></span><span class="ajs-src"></span><span class="ajs-time"></span></div>' +
          '<div class="ajs-title"></div>' +
          '<div class="ajs-nav ajs-prev"></div><div class="ajs-nav ajs-next"></div>' +
        '</div>' +
      '</div>';
    document.body.appendChild(veil);
    document.documentElement.style.overflow = 'hidden';
    requestAnimationFrame(function () { veil.classList.add('on'); });

    // bars
    var bars = veil.querySelector('.ajs-bars');
    slides.forEach(function () {
      var b = document.createElement('div'); b.className = 'ajs-bar'; b.innerHTML = '<i></i>';
      bars.appendChild(b);
    });

    veil.querySelector('.ajs-close').addEventListener('click', close);
    veil.querySelector('.ajs-next').addEventListener('click', function () { go(idx + 1); });
    veil.querySelector('.ajs-prev').addEventListener('click', function () { go(idx - 1); });
    // hold to pause
    var card = veil.querySelector('.ajs-card');
    card.addEventListener('mousedown', pause);
    window.addEventListener('mouseup', resume);
    card.addEventListener('touchstart', pause, { passive: true });
    window.addEventListener('touchend', resume);

    document.addEventListener('keydown', onKey);
    render();
  }

  function onKey(e) {
    if (!veil) return;
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowRight') go(idx + 1);
    else if (e.key === 'ArrowLeft') go(idx - 1);
  }

  function render() {
    var s = slides[idx];
    var img = veil.querySelector('.ajs-card img');
    var vid = veil.querySelector('.ajs-card video');
    img.classList.remove('on');
    vid.classList.remove('on');
    vid.pause();
    if (s.video) {
      // Video slide: play inline, advance when the clip ends.
      img.style.display = 'none';
      vid.style.display = '';
      if (vid.getAttribute('src') !== s.video) vid.src = s.video;
      else vid.currentTime = 0;
      vid.onended = function () { go(idx + 1); };
      vid.play().catch(function () {});
      requestAnimationFrame(function () { vid.classList.add('on'); });
    } else {
      vid.style.display = 'none';
      vid.onended = null;
      img.style.display = '';
      var pre = new Image();
      pre.onload = function () { img.src = s.src; requestAnimationFrame(function () { img.classList.add('on'); }); };
      pre.onerror = function () { img.src = s.src; img.classList.add('on'); };
      pre.src = s.src;
    }

    veil.querySelector('.ajs-src').textContent = 'Al Jazeera';
    veil.querySelector('.ajs-ava').textContent = 'AJ';
    veil.querySelector('.ajs-time').textContent = s.dur ? s.dur.replace(/min\s?/, ':').replace('sec', '') : '';
    veil.querySelector('.ajs-title').textContent = s.title;

    // bars state
    var bars = [].slice.call(veil.querySelectorAll('.ajs-bar'));
    bars.forEach(function (b, i) {
      var fill = b.querySelector('i');
      b.classList.toggle('done', i < idx);
      if (i !== idx) { fill.style.transition = 'none'; fill.style.width = (i < idx ? '100%' : '0'); }
    });
    startProgress();
  }

  function startProgress() {
    cancelAnimationFrame(timer);
    if (REDUCED) { return; }   // no auto-advance under reduced motion
    var fill = veil.querySelectorAll('.ajs-bar')[idx].querySelector('i');
    elapsed = 0; startTs = performance.now(); paused = false;
    fill.style.transition = 'none'; fill.style.width = '0';
    var s = slides[idx];
    if (s.video) {
      // Video slide: bar tracks playback position; 'ended' handles advance.
      var vid = veil.querySelector('.ajs-card video');
      (function vtick() {
        if (!veil) return;
        var d = vid.duration;
        if (d && isFinite(d)) fill.style.width = (Math.min(1, vid.currentTime / d) * 100).toFixed(2) + '%';
        timer = requestAnimationFrame(vtick);
      })();
      return;
    }
    (function tick(now) {
      if (!veil) return;
      if (paused) { startTs = now - elapsed; timer = requestAnimationFrame(tick); return; }
      elapsed = now - startTs;
      var p = Math.min(1, elapsed / DURATION);
      fill.style.width = (p * 100).toFixed(2) + '%';
      if (p >= 1) { go(idx + 1); return; }
      timer = requestAnimationFrame(tick);
    })(performance.now());
  }

  function pause() {
    paused = true;
    if (veil && slides[idx] && slides[idx].video) veil.querySelector('.ajs-card video').pause();
  }
  function resume() {
    if (!paused) return;
    paused = false;
    if (veil && slides[idx] && slides[idx].video) veil.querySelector('.ajs-card video').play().catch(function () {});
  }

  function go(n) {
    if (!veil) return;
    if (n < 0) { idx = 0; render(); return; }
    if (n >= slides.length) { close(); return; }
    idx = n; render();
  }

  function close() {
    if (!veil) return;
    cancelAnimationFrame(timer);
    document.removeEventListener('keydown', onKey);
    window.removeEventListener('mouseup', resume);
    window.removeEventListener('touchend', resume);
    var v = veil; veil = null;
    v.classList.remove('on');
    document.documentElement.style.overflow = '';
    setTimeout(function () { v.remove(); }, 320);
  }

  function wire() {
    var cards = collectCards();
    if (!cards.length) return false;
    var list = cards.map(function (c) { return { src: c.src, title: c.title, dur: c.dur, video: c.video }; });
    cards.forEach(function (c, i) {
      if (c.host.getAttribute('data-ajs')) return;
      c.host.setAttribute('data-ajs', '1');
      c.host.classList.add('ajs-clickable');
      c.host.addEventListener('click', function (e) {
        e.preventDefault(); e.stopPropagation();
        open(list, i);
      }, true);
    });
    return true;
  }

  function init() {
    if (wire()) return;
    var n = 0, iv = setInterval(function () { if (wire() || ++n > 30) clearInterval(iv); }, 250);
  }

  if (document.readyState === 'complete') init();
  else window.addEventListener('load', init);
})();
