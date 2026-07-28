/* Listen player — fixed-bottom audio bar per Figma 0:4371.
   Opens when a "LISTEN" button is clicked. Dark player row (thumb + title +
   orange/white waveform scrubber + controls + album art) over a transcript row.
   Prototype playback: clicking the controls toggles play; the orange progress
   advances while playing. Esc or the × closes it. */
(function () {
  'use strict';

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
    '#aj-listen .ajl-wave{position:relative;flex:1 1 auto;min-width:0;height:20px;display:flex;align-items:center;gap:2px;cursor:pointer;overflow:hidden}',
    '#aj-listen .ajl-wave i{width:1.4px;flex:none;border-radius:12px;background:rgba(255,255,255,.32);transition:background .1s linear}',
    '#aj-listen .ajl-wave i.on{background:#fa9000}',
    '#aj-listen .ajl-controls{flex:none;height:92px;width:auto;display:block;cursor:pointer;-webkit-user-select:none;user-select:none}',
    '#aj-listen .ajl-art{flex:none;border-left:1px solid rgba(255,255,255,.32);padding-left:24px}',
    '#aj-listen .ajl-art .ring{width:84px;height:84px;border-radius:50%;overflow:hidden;position:relative;background:#000}',
    '#aj-listen .ajl-art img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}',
    '#aj-listen .ajl-close{flex:none;width:34px;height:34px;border-radius:50%;border:0;background:rgba(255,255,255,.1);color:#fff;font-size:16px;cursor:pointer;line-height:1}',
    '#aj-listen .ajl-close:hover{background:rgba(255,255,255,.2)}',
    '#aj-listen .ajl-tr{display:flex;align-items:center;gap:12px;width:100%;max-width:1440px;padding:12px 24px 14px;box-sizing:border-box}',
    '#aj-listen .ajl-tr .mini{display:flex;align-items:center;gap:2px;flex:none}',
    '#aj-listen .ajl-tr .mini i{width:1.4px;border-radius:12px;background:rgba(255,255,255,.34)}',
    '#aj-listen .ajl-tr .mini i.on{background:#fff}',
    '#aj-listen .ajl-tr p{margin:0;flex:1 1 auto;min-width:0;font-family:Archivo,"Anybody",Arial,sans-serif;font-size:15px;line-height:18px;color:#fff}',
    '@media(max-width:760px){#aj-listen .ajl-art,#aj-listen .ajl-title{display:none}}'
  ].join('\n');

  var player, waveEl, playing = false, prog = 0.34, timer = null;

  function build() {
    var st = document.createElement('style'); st.id = 'aj-listen-style'; st.textContent = CSS;
    document.head.appendChild(st);

    player = document.createElement('div'); player.id = 'aj-listen';
    player.innerHTML =
      '<div class="ajl-bg ajl-bg--player"><div class="ajl-main">' +
        '<div class="ajl-left">' +
          '<div class="ajl-lead">' +
            '<img class="ajl-thumb" src="assets/aj-listen-thumb.jpg" alt="">' +
            '<div class="ajl-info">' +
              '<p class="ajl-title">‘Still the GOAT’: Ronaldo-fever hits Toronto before Portugal vs Croatia</p>' +
              '<div class="ajl-scrub"><span class="ajl-t ajl-cur">03:53</span>' +
                '<div class="ajl-wave">' + waveBars(150) + '</div>' +
                '<span class="ajl-t">09:24</span></div>' +
            '</div>' +
          '</div>' +
          '<img class="ajl-controls" src="assets/aj-listen-controls.svg" alt="Playback controls">' +
        '</div>' +
        '<div class="ajl-art"><div class="ring"><img src="assets/aj-listen-art.png" alt=""><img src="assets/aj-listen-art2.png" alt=""></div></div>' +
        '<button class="ajl-close" aria-label="Close player">✕</button>' +
      '</div></div>' +
      '<div class="ajl-bg ajl-bg--tr"><div class="ajl-tr"><span class="mini">' + waveBars(9).replace(/height:\d[\d.]*px/g, function (m) { return m; }) + '</span>' +
        '<p>I am here to report about the incident that took place near my home. It was 9:00 PM on Wednesday, June 30th.</p></div></div>';
    document.body.appendChild(player);

    waveEl = player.querySelector('.ajl-wave');
    paint();

    player.querySelector('.ajl-controls').addEventListener('click', toggle);
    player.querySelector('.ajl-close').addEventListener('click', close);
    waveEl.addEventListener('click', function (e) {
      var r = waveEl.getBoundingClientRect();
      prog = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
      paint();
    });
    // mini transcript wave: light up the first few
    [].slice.call(player.querySelectorAll('.ajl-tr .mini i')).forEach(function (b, i) { if (i > 1 && i < 7) b.classList.add('on'); });
  }

  function paint() {
    var bars = waveEl.children, cut = Math.round(bars.length * prog);
    for (var i = 0; i < bars.length; i++) bars[i].classList.toggle('on', i < cut);
    var total = 564, cur = Math.round(233 + prog * (total - 233));   // 03:53..09:24 in seconds
    var m = Math.floor(cur / 60), s = cur % 60;
    player.querySelector('.ajl-cur').textContent = (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
  }

  function toggle() {
    playing = !playing;
    if (playing) { timer = setInterval(function () { prog += 0.004; if (prog >= 1) { prog = 1; toggle(); } paint(); }, 120); }
    else { clearInterval(timer); timer = null; }
  }

  function open() { if (!player) build(); player.classList.add('open'); }
  function close() { if (player) { player.classList.remove('open'); if (playing) toggle(); } }

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

  function init() {
    wireButtons();
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
    // lazily-rendered LISTEN buttons
    var n = 0, iv = setInterval(function () { wireButtons(); if (++n > 12) clearInterval(iv); }, 400);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
