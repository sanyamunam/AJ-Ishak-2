/* Listen player — fixed-bottom audio bar per Figma 0:4371.

   A real media player, not a mock: it drives an HTMLAudioElement over narration
   generated per story (assets/audio/<key>.mp3), with sentence timestamps that
   were MEASURED at synthesis time (<key>.json) — so the transcript highlight is
   sample-accurate, never estimated.

   The bar binds to whichever story the open page is about: on the article page
   it takes the article's own headline, hero image and narration; everywhere
   else it plays the Ronaldo podcast the section promotes. Position is
   remembered per story for the session, so closing and reopening the bar
   resumes where the reader left off — switching stories starts clean. */
(function () {
  'use strict';

  var REDUCED = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------- which story does this page tell? ---------------- */
  function pageStory() {
    /* /story is the article page's neutral alias on the hosted preview */
    if (/article|(^|\/)story$/i.test(location.pathname)) {
      var h1 = document.querySelector('main h1, h1');
      var hero = [].slice.call(document.querySelectorAll('main img')).filter(function (im) {
        return im.getBoundingClientRect().width > 400 && /^data:|assets\//.test(im.src || '');
      })[0];
      return {
        key: 'salah',
        title: (h1 && h1.textContent.trim()) || 'Mohamed Salah and the ghosts of Egypt’s ‘golden generation’',
        thumb: (hero && hero.src) || 'assets/aj-listen-thumb.jpg'
      };
    }
    return {
      key: 'ronaldo',
      title: '‘Still the GOAT’: Ronaldo-fever hits Toronto before Portugal vs Croatia',
      thumb: 'assets/aj-listen-thumb.jpg'
    };
  }

  var WAVE_H = [4.884, 7.433, 11.68, 15.503, 18.476];
  function waveBars(n) {
    var s = '', seed = 7;
    for (var i = 0; i < n; i++) {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;   // deterministic pseudo-random
      var h = WAVE_H[seed % WAVE_H.length];
      s += '<i style="height:' + h + 'px"></i>';
    }
    return s;
  }

  var CSS = [
    '#aj-listen{position:fixed;left:0;right:0;bottom:0;z-index:100000;transform:translateY(110%);transition:transform .5s cubic-bezier(.22,1,.36,1);font-family:"Anybody",Archivo,Arial,sans-serif;box-shadow:0 -10px 40px rgba(0,0,0,.35)}',
    '#aj-listen.open{transform:translateY(0)}',
    /* each row (.ajl-bg) runs full-bleed for its background; the flex content inside
       it sits on the same 1440px column as the rest of the page, not the raw edge */
    '#aj-listen .ajl-bg{display:flex;justify-content:center}',
    '#aj-listen .ajl-bg--player{background:#1c1c1c}',
    '#aj-listen .ajl-bg--tr{background:#2e2e2e;backdrop-filter:blur(16px)}',
    '#aj-listen .ajl-main{display:flex;align-items:center;gap:40px;width:100%;',
    '  max-width:1440px;padding:18px 24px;box-sizing:border-box}',
    '#aj-listen .ajl-left{display:flex;flex:1 1 auto;min-width:0;align-items:center;gap:32px}',
    '#aj-listen .ajl-lead{display:flex;flex:1 1 auto;min-width:0;align-items:center;gap:20px}',
    '#aj-listen .ajl-thumb{width:120px;height:82px;object-fit:cover;flex:none;display:block}',
    '#aj-listen .ajl-info{flex:1 1 auto;min-width:0;display:flex;flex-direction:column;gap:12px}',
    '#aj-listen .ajl-title{margin:0;font-family:Lora,Georgia,serif;font-weight:700;font-size:20px;line-height:1.3;letter-spacing:-.4px;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '#aj-listen .ajl-scrub{display:flex;align-items:center;gap:10px}',
    '#aj-listen .ajl-t{font-size:12px;color:#fff;flex:none;font-variant-numeric:tabular-nums}',
    '#aj-listen .ajl-wave{position:relative;flex:1 1 auto;min-width:0;height:20px;display:flex;align-items:center;gap:2px;cursor:pointer;overflow:hidden;touch-action:none}',
    '#aj-listen .ajl-wave i{width:1.4px;flex:none;border-radius:12px;background:rgba(255,255,255,.32)}',
    '#aj-listen .ajl-wave i.on{background:#fa9000}',
    /* the bar at the playhead breathes while audio is running — the one place
       the waveform is allowed to move */
    '#aj-listen.playing .ajl-wave i.hot{animation:ajlHot .9s ease-in-out infinite;background:#fa9000}',
    '@keyframes ajlHot{0%,100%{transform:scaleY(1)}50%{transform:scaleY(1.6)}}',

    /* ---- controls: real buttons in the footprint of the old static image ---- */
    '#aj-listen .ajl-controls{flex:none;display:flex;align-items:center;gap:18px}',
    '#aj-listen .ajl-btn{display:flex;align-items:center;justify-content:center;background:none;border:0;color:#fff;cursor:pointer;padding:6px;border-radius:50%;transition:transform .14s cubic-bezier(.23,1,.32,1),background .2s ease;-webkit-user-select:none;user-select:none}',
    '#aj-listen .ajl-btn:hover{background:rgba(255,255,255,.08)}',
    '#aj-listen .ajl-btn:active{transform:scale(.94)}',
    '#aj-listen .ajl-btn svg{display:block}',
    '#aj-listen .ajl-rate{font-size:13px;font-weight:700;letter-spacing:.4px;width:40px;height:40px;border-radius:50%;font-variant-numeric:tabular-nums}',
    '#aj-listen .ajl-play{width:56px;height:56px;background:#fff;color:#1c1c1c;position:relative}',
    '#aj-listen .ajl-play:hover{background:#fff}',
    '#aj-listen .ajl-play:active{transform:scale(.94)}',
    /* play <-> pause morph: both icons live in the button; the live one scales
       in as the other scales away, on the same strong curve */
    '#aj-listen .ajl-play svg{position:absolute;inset:0;margin:auto;transition:opacity .16s ease,transform .16s cubic-bezier(.23,1,.32,1)}',
    '#aj-listen .ajl-play .ic-play{opacity:1;transform:scale(1)}',
    '#aj-listen .ajl-play .ic-pause{opacity:0;transform:scale(.6)}',
    '#aj-listen.playing .ajl-play .ic-play{opacity:0;transform:scale(.6)}',
    '#aj-listen.playing .ajl-play .ic-pause{opacity:1;transform:scale(1)}',
    /* loading: the ring spins until the audio can actually start */
    '#aj-listen .ajl-play .ic-load{position:absolute;inset:-3px;margin:auto;opacity:0;animation:none}',
    '#aj-listen.loading .ajl-play .ic-load{opacity:1;animation:ajlSpin 1s linear infinite}',
    '#aj-listen.loading .ajl-play .ic-play,#aj-listen.loading .ajl-play .ic-pause{opacity:0}',
    '@keyframes ajlSpin{to{transform:rotate(360deg)}}',

    '#aj-listen .ajl-art{flex:none;border-left:1px solid rgba(255,255,255,.32);padding-left:24px}',
    '#aj-listen .ajl-art .ring{width:84px;height:84px;border-radius:50%;overflow:hidden;position:relative;background:#000}',
    '#aj-listen .ajl-art img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}',
    /* the artwork slowly turns while audio runs, like a record */
    '#aj-listen .ajl-art .ring{transition:transform .4s ease}',
    '#aj-listen.playing .ajl-art .ring{animation:ajlSpin 14s linear infinite}',
    '#aj-listen .ajl-close{flex:none;width:34px;height:34px;border-radius:50%;border:0;background:rgba(255,255,255,.1);color:#fff;font-size:16px;cursor:pointer;line-height:1;transition:background .2s ease,transform .14s ease}',
    '#aj-listen .ajl-close:hover{background:rgba(255,255,255,.2)}',
    '#aj-listen .ajl-close:active{transform:scale(.94)}',

    /* ---- transcript: every sentence is present; the live one is lit ---- */
    '#aj-listen .ajl-tr{display:flex;align-items:flex-start;gap:12px;width:100%;max-width:1440px;padding:12px 24px 14px;box-sizing:border-box}',
    '#aj-listen .ajl-tr .mini{display:flex;align-items:center;gap:2px;flex:none;margin-top:2px}',
    '#aj-listen .ajl-tr .mini i{width:1.4px;border-radius:12px;background:rgba(255,255,255,.34);transition:transform .3s ease}',
    '#aj-listen .ajl-tr .mini i.on{background:#fff}',
    '#aj-listen.playing .ajl-tr .mini i.on{animation:ajlHot 1.1s ease-in-out infinite}',
    '#aj-listen .ajl-sent{margin:0;flex:1 1 auto;min-width:0;max-height:40px;overflow-y:auto;scrollbar-width:none;font-family:Archivo,"Anybody",Arial,sans-serif;font-size:15px;line-height:20px;color:#fff}',
    '#aj-listen .ajl-sent::-webkit-scrollbar{display:none}',
    '#aj-listen .ajl-sent span{color:rgba(255,255,255,.42);cursor:pointer;transition:color .25s ease}',
    '#aj-listen .ajl-sent span:hover{color:rgba(255,255,255,.75)}',
    '#aj-listen .ajl-sent span.live{color:#fff}',
    '#aj-listen[data-cc="off"] .ajl-bg--tr{display:none}',

    '@media(max-width:760px){#aj-listen .ajl-art,#aj-listen .ajl-title{display:none}}',
    '@media (prefers-reduced-motion: reduce){',
    '#aj-listen.playing .ajl-art .ring,#aj-listen.playing .ajl-wave i.hot,#aj-listen.playing .ajl-tr .mini i.on{animation:none}',
    '#aj-listen{transition:none}}'
  ].join('\n');

  var ICONS = {
    play:  '<svg class="ic-play" width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13l11-6.5z"/></svg>',
    pause: '<svg class="ic-pause" width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M7 5h3.4v14H7zM13.6 5H17v14h-3.6z"/></svg>',
    load:  '<svg class="ic-load" width="62" height="62" viewBox="0 0 62 62" fill="none"><circle cx="31" cy="31" r="27" stroke="rgba(28,28,28,.25)" stroke-width="3"/><path d="M31 4a27 27 0 0 1 27 27" stroke="#1c1c1c" stroke-width="3" stroke-linecap="round"/></svg>',
    back:  '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5V2L7 6l5 4V7a6 6 0 1 1-6 6"/><text x="9.2" y="16.4" font-size="7.4" stroke="none" fill="currentColor" font-family="Arial" font-weight="bold">10</text></svg>',
    fwd:   '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5V2l5 4-5 4V7a6 6 0 1 0 6 6"/><text x="9.2" y="16.4" font-size="7.4" stroke="none" fill="currentColor" font-family="Arial" font-weight="bold">10</text></svg>',
    cc:    '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M10.5 10.2a2.2 2.2 0 1 0 0 3.6M16.5 10.2a2.2 2.2 0 1 0 0 3.6" stroke-linecap="round"/></svg>'
  };

  var player, waveEl, sentEl, audio, story, marks = [], duration = 0;
  var raf = null, lastCut = -1, lastSec = -1, lastLive = -1, dragging = false;
  /* nothing may WRITE the remembered position until the restore has READ it —
     build() paints once before metadata arrives, and that paint used to save
     0.0 over the position it was about to restore */
  var restored = false;

  function fmt(t) {
    t = Math.max(0, Math.round(t));
    var m = Math.floor(t / 60), s = t % 60;
    return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
  }

  function posKey() { return 'ajl-pos-' + story.key; }

  function build() {
    story = pageStory();

    var st = document.createElement('style'); st.id = 'aj-listen-style'; st.textContent = CSS;
    document.head.appendChild(st);

    player = document.createElement('div'); player.id = 'aj-listen';
    player.className = 'loading';
    player.innerHTML =
      '<div class="ajl-bg ajl-bg--player"><div class="ajl-main">' +
        '<div class="ajl-left">' +
          '<div class="ajl-lead">' +
            '<img class="ajl-thumb" src="' + story.thumb + '" alt="">' +
            '<div class="ajl-info">' +
              '<p class="ajl-title">' + story.title + '</p>' +
              '<div class="ajl-scrub"><span class="ajl-t ajl-cur">00:00</span>' +
                '<div class="ajl-wave">' + waveBars(150) + '</div>' +
                '<span class="ajl-t ajl-rem">− –:––</span></div>' +
            '</div>' +
          '</div>' +
          '<div class="ajl-controls">' +
            '<button class="ajl-btn ajl-rate" aria-label="Playback speed">1x</button>' +
            '<button class="ajl-btn ajl-back" aria-label="Back 10 seconds">' + ICONS.back + '</button>' +
            '<button class="ajl-btn ajl-play" aria-label="Play">' + ICONS.play + ICONS.pause + ICONS.load + '</button>' +
            '<button class="ajl-btn ajl-fwd" aria-label="Forward 10 seconds">' + ICONS.fwd + '</button>' +
            '<button class="ajl-btn ajl-cc" aria-label="Toggle transcript">' + ICONS.cc + '</button>' +
          '</div>' +
        '</div>' +
        '<div class="ajl-art"><div class="ring"><img src="assets/aj-listen-art.png" alt=""><img src="assets/aj-listen-art2.png" alt=""></div></div>' +
        '<button class="ajl-close" aria-label="Close player">✕</button>' +
      '</div></div>' +
      '<div class="ajl-bg ajl-bg--tr"><div class="ajl-tr"><span class="mini">' + waveBars(9) + '</span>' +
        '<p class="ajl-sent"></p></div></div>';
    document.body.appendChild(player);

    waveEl = player.querySelector('.ajl-wave');
    sentEl = player.querySelector('.ajl-sent');
    [].slice.call(player.querySelectorAll('.ajl-tr .mini i')).forEach(function (b, i) { if (i > 1 && i < 7) b.classList.add('on'); });

    /* ---------- the audio itself ---------- */
    audio = new Audio('assets/audio/' + story.key + '.mp3');
    audio.preload = 'auto';

    audio.addEventListener('loadedmetadata', function () {
      duration = audio.duration || 0;
      var saved = 0;
      try { saved = parseFloat(sessionStorage.getItem(posKey())) || 0; } catch (e) {}
      if (saved > 1 && saved < duration - 2) audio.currentTime = saved;
      restored = true;
      paint(true);
    });
    audio.addEventListener('canplaythrough', function () { player.classList.remove('loading'); });
    audio.addEventListener('waiting', function () { player.classList.add('loading'); });
    audio.addEventListener('playing', function () { player.classList.remove('loading'); });
    audio.addEventListener('ended', function () {
      /* finished: full bar for a beat, then reset to the top, play icon back */
      setPlaying(false);
      paint(true);
      setTimeout(function () { audio.currentTime = 0; paint(true); }, 600);
      try { sessionStorage.removeItem(posKey()); } catch (e) {}
    });

    /* measured sentence timings, synthesized alongside the audio */
    fetch('assets/audio/' + story.key + '.json')
      .then(function (r) { return r.json(); })
      .then(function (d) {
        marks = d.sentences || [];
        sentEl.innerHTML = marks.map(function (m, i) {
          return '<span data-i="' + i + '">' + m.text + '</span>';
        }).join(' ');
        paint(true);
      })
      .catch(function () { player.setAttribute('data-cc', 'off'); });

    /* ---------- controls ---------- */
    player.querySelector('.ajl-play').addEventListener('click', function () {
      if (player.classList.contains('loading')) return;
      audio.paused ? play() : pause();
    });
    player.querySelector('.ajl-back').addEventListener('click', function () { seek(audio.currentTime - 10); });
    player.querySelector('.ajl-fwd').addEventListener('click', function () { seek(audio.currentTime + 10); });
    player.querySelector('.ajl-close').addEventListener('click', close);

    var rates = [1, 1.25, 1.5, 2], rateBtn = player.querySelector('.ajl-rate');
    rateBtn.addEventListener('click', function () {
      var next = rates[(rates.indexOf(audio.playbackRate) + 1) % rates.length];
      audio.playbackRate = next;
      rateBtn.textContent = (next + '').replace(/\.0$/, '') + 'x';
    });

    player.querySelector('.ajl-cc').addEventListener('click', function () {
      player.setAttribute('data-cc', player.getAttribute('data-cc') === 'off' ? 'on' : 'off');
    });

    /* ---------- scrubbing: click anywhere, or hold and drag ---------- */
    function waveTime(e) {
      var r = waveEl.getBoundingClientRect();
      return Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * (duration || 0);
    }
    waveEl.addEventListener('pointerdown', function (e) {
      if (!duration) return;
      dragging = true;
      try { waveEl.setPointerCapture(e.pointerId); } catch (err) {}
      previewTo(waveTime(e));
    });
    waveEl.addEventListener('pointermove', function (e) { if (dragging) previewTo(waveTime(e)); });
    waveEl.addEventListener('pointerup', function (e) {
      if (!dragging) return;
      dragging = false;
      seek(waveTime(e));
    });
    waveEl.addEventListener('pointercancel', function () { dragging = false; paint(true); });

    /* while the finger is down the bar and clock follow it; audio only jumps
       on release, so a long drag doesn't stutter through every position */
    function previewTo(t) {
      var cut = duration ? Math.round(waveEl.children.length * (t / duration)) : 0;
      paintBars(cut);
      player.querySelector('.ajl-cur').textContent = fmt(t);
    }

    /* transcript: every sentence knows its own start time */
    sentEl.addEventListener('click', function (e) {
      var s = e.target.closest('span[data-i]');
      if (!s) return;
      seek(marks[+s.getAttribute('data-i')].start + 0.01);
      if (audio.paused) play();
    });

    paint(true);
  }

  /* ---------- playback plumbing ---------- */
  function play() {
    var p = audio.play();
    if (p && p.catch) p.catch(function () { player.classList.remove('playing'); });
    setPlaying(true);
    tick();
  }
  function pause() {
    audio.pause();
    setPlaying(false);
    savePos();
    paint(true);
  }
  function setPlaying(on) {
    player.classList.toggle('playing', on);
    player.querySelector('.ajl-play').setAttribute('aria-label', on ? 'Pause' : 'Play');
  }
  function seek(t) {
    if (!duration) return;
    audio.currentTime = Math.max(0, Math.min(duration - 0.05, t));
    savePos();
    paint(true);
  }
  function savePos() {
    if (!restored) return;
    try { sessionStorage.setItem(posKey(), audio.currentTime.toFixed(1)); } catch (e) {}
  }

  /* one rAF loop while playing; every frame is cheap because nothing is
     written unless its value actually changed since the last frame */
  function tick() {
    if (audio.paused) { raf = null; return; }
    paint(false);
    raf = requestAnimationFrame(tick);
  }

  function paintBars(cut) {
    if (cut === lastCut) return;
    var bars = waveEl.children;
    for (var i = 0; i < bars.length; i++) {
      bars[i].classList.toggle('on', i < cut);
      bars[i].classList.toggle('hot', i === cut - 1);
    }
    lastCut = cut;
  }

  function paint(force) {
    if (force) { lastCut = -1; lastSec = -1; lastLive = -2; }
    var t = audio ? audio.currentTime : 0;
    if (!dragging) paintBars(duration ? Math.round(waveEl.children.length * (t / duration)) : 0);

    var sec = Math.floor(t);
    if (sec !== lastSec) {
      lastSec = sec;
      if (!dragging) player.querySelector('.ajl-cur').textContent = fmt(t);
      player.querySelector('.ajl-rem').textContent = duration ? '− ' + fmt(duration - t) : '− –:––';
      savePos();
    }

    /* transcript follows the measured sentence the playhead is inside */
    if (marks.length) {
      var live = -1;
      for (var i = 0; i < marks.length; i++) {
        if (t >= marks[i].start && t < marks[i].end) { live = i; break; }
      }
      if (t >= (marks[marks.length - 1] || {}).end) live = marks.length - 1;
      if (live !== lastLive) {
        lastLive = live;
        var spans = sentEl.children;
        for (var k = 0; k < spans.length; k++) spans[k].classList.toggle('live', k === live);
        if (live >= 0) {
          var el = spans[live];
          sentEl.scrollTop = Math.max(0, el.offsetTop - sentEl.offsetTop - 10);
        }
      }
    }
  }

  function open() {
    if (!player) build();
    player.classList.add('open');
    /* the reader pressed LISTEN — that gesture is the intent to hear it */
    if (audio.paused && !player.classList.contains('playing')) {
      if (audio.readyState >= 2) play();
      else audio.addEventListener('canplay', function go() { audio.removeEventListener('canplay', go); play(); }, { once: true });
    }
  }
  function close() {
    if (!player) return;
    player.classList.remove('open');
    if (!audio.paused) pause();
  }

  function wireButtons() {
    [].slice.call(document.querySelectorAll('button, a')).forEach(function (b) {
      if (b.getAttribute('data-ajlisten-bound')) return;
      var marked = b.getAttribute('data-ajlisten');
      var looksLikeListen = /(^|\s)listen(\s|$|\s*[▸►·])/i.test((b.textContent || '').trim());
      if (marked || looksLikeListen) {
        b.setAttribute('data-ajlisten', '1');
        b.setAttribute('data-ajlisten-bound', '1');
        b.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); open(); });
      }
    });
  }

  /* The wide podcast hero (720px card in the PODCAST section) is audio, not a
     story: claim it before aj-stories wires it (stories skips hosts that
     already carry data-ajs) and open the listen bar instead. */
  function wirePodcast() {
    [].slice.call(document.querySelectorAll('div.relative')).forEach(function (d) {
      var c = d.className || '';
      if (d.getAttribute('data-ajs') || !/w-\[720px\]/.test(c) || !/self-stretch/.test(c)) return;
      if (!/min\s?\d+\s?sec/i.test(d.textContent || '')) return;
      d.setAttribute('data-ajs', 'listen');
      d.style.cursor = 'pointer';
      d.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); open(); }, true);
    });
  }

  function init() {
    wireButtons();
    wirePodcast();
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { close(); return; }
      /* space toggles playback while the bar is up — unless the reader is typing */
      if (e.key === ' ' && player && player.classList.contains('open')) {
        var t = e.target;
        if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
        e.preventDefault();
        audio.paused ? play() : pause();
      }
    });
    // lazily-rendered LISTEN buttons
    var n = 0, iv = setInterval(function () { wireButtons(); wirePodcast(); if (++n > 12) clearInterval(iv); }, 400);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  /* small public surface: other scripts (and tests) can drive the player
     without reaching into its DOM */
  window.ajListen = {
    open: open,
    close: close,
    seek: function (t) { if (audio) seek(t); },
    state: function () {
      return audio ? {
        time: audio.currentTime, duration: duration, paused: audio.paused,
        rate: audio.playbackRate, src: audio.currentSrc, ready: audio.readyState,
        error: audio.error && audio.error.code
      } : null;
    }
  };
})();
