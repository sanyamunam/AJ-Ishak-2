/* Games page chrome: strip the bundle's own header/footer and drop in a self-contained
   copy of the full Al Jazeera homepage header — black date strip + nav (logo + links +
   WATCH LIVE) + the pink "Ask Al Jazeera" bar. Loaded from inside the bundle template so
   it runs after the page reconstructs; re-checks briefly in case chrome renders late. */
(function () {
  'use strict';

  var NAV = ['Home', 'Explainers', 'By Category', 'Video', 'Podcast', 'Opinion', 'Community', 'More'];

  var CSS =
    /* match homepage page scale so gutters + type read identical */
    'body{zoom:.9}' +
    '#aj-hp{position:sticky;top:0;left:0;z-index:99999;width:100%;font-family:"Anybody",Archivo,Arial,Helvetica,sans-serif}' +
    /* black date strip */
    '#aj-hp .ajn-strip{background:#2d2c2c;color:#fff}' +
    '#aj-hp .ajn-strip .in{max-width:1440px;margin:0 auto;display:flex;align-items:center;justify-content:space-between;padding:9px 24px;font-size:14px}' +
    '#aj-hp .ajn-strip .wx{opacity:.75}' +
    '#aj-hp .ajn-themes{display:flex;gap:2px;background:rgba(255,255,255,.1);padding:2px}' +
    '#aj-hp .ajn-themes span{padding:4px 12px;font-size:12px;color:#bdbdbd}' +
    '#aj-hp .ajn-themes span.on{background:#fff;color:#111}' +
    /* nav row */
    '#aj-hp .ajn-nav{background:#fff;border-bottom:1px solid #ececec}' +
    '#aj-hp .ajn-inner{max-width:1440px;margin:0 auto;display:flex;align-items:center;gap:24px;padding:0 24px;height:64px}' +
    '#aj-hp .ajn-brand{display:flex;align-items:center;gap:12px;text-decoration:none;flex:none}' +
    '#aj-hp .ajn-logomark{height:40px;width:110px;display:block}' +
    '#aj-hp .ajn-links{display:flex;align-items:center;gap:26px;flex:1 1 auto}' +
    '#aj-hp .ajn-links a{color:#101010;font-weight:600;font-size:15px;text-decoration:none;white-space:nowrap;transition:color .2s ease}' +
    '#aj-hp .ajn-links a:hover{color:#fa9000}' +
    '#aj-hp .ajn-watch{flex:none;display:inline-flex;align-items:center;gap:8px;background:#ff435f;color:#fff;font-weight:700;letter-spacing:.4px;font-size:14px;text-transform:uppercase;text-decoration:none;padding:14px 22px;transition:background .2s ease}' +
    '#aj-hp .ajn-watch:hover{background:#f82f4e}' +
    /* pink ask bar */
    '#aj-hp .ajn-ask{position:relative;overflow:hidden;padding:13px 0;background-image:linear-gradient(90deg,#fdf5ea,#fbeef3,#f4eefb,#eef1fb,#f6f4fb,#fbf7f2,#f4eefb,#fbeef3,#fdf5ea);background-size:300% 100%;animation:ajnAsk 8s ease-in-out infinite}' +
    '@keyframes ajnAsk{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}' +
    '#aj-hp .ajn-ask .in{max-width:1440px;margin:0 auto;display:flex;align-items:center;justify-content:space-between;padding:0 24px}' +
    '#aj-hp .ajn-ask .l{display:flex;align-items:center;gap:8px}' +
    '#aj-hp .ajn-orb{width:32px;height:32px;border-radius:50%;background:linear-gradient(180deg,#335ee0,#ff94df);filter:blur(.4px);flex:none}' +
    '#aj-hp .ajn-ask .lbl{font-size:14px;letter-spacing:-.56px;color:rgba(0,0,0,.6)}' +
    '#aj-hp .ajn-ask .q{font-family:Lora,Georgia,serif;font-style:italic;font-size:14px;letter-spacing:-.56px;color:#000}' +
    '#aj-hp .ajn-ask .press{display:inline-flex;align-items:center;height:33px;padding:0 16px;background:#fff;font-size:13px;color:#202020;box-shadow:0 7px 10px rgba(0,0,0,.12)}' +
    '#aj-hp .ajn-ask .press b{font-weight:700;margin-right:4px}' +
    '#aj-hp .ajn-ask .stroke{position:absolute;left:0;bottom:0;height:2px;width:100%;background:linear-gradient(90deg,#f8d8c4,#f0a7de,#c9d2f5)}' +
    '@media(max-width:900px){#aj-hp .ajn-links{display:none}}';

  function addStyle() {
    if (document.getElementById('aj-hp-style')) return;
    var st = document.createElement('style'); st.id = 'aj-hp-style'; st.textContent = CSS;
    document.head.appendChild(st);
  }

  /* Daily-Quiz mosaic icon — replaces the bundle's broken one. Black grid bg with
     inset cells so the gaps read as clean gridlines; purple + white cells, one black. */
  var QUIZ_ICON = (function () {
    var P = '#BE6BD0', W = '#ffffff';
    var grid = [
      [P, P, W, P],
      [P, P, P, W],
      [W, P, W, P],
      [null, W, P, P]   // null = black cell (bg shows)
    ];
    var cells = '';
    for (var r = 0; r < 4; r++) for (var c = 0; c < 4; c++) {
      var col = grid[r][c]; if (!col) continue;
      cells += '<rect x="' + (8 + c * 7.5 + 0.7).toFixed(2) + '" y="' + (8 + r * 7.5 + 0.7).toFixed(2) +
        '" width="6.1" height="6.1" fill="' + col + '"/>';
    }
    return '<svg width="46" height="46" viewBox="0 0 46 46" fill="none" data-aj-quizicon="1">' +
      '<rect x="2.5" y="2.5" width="41" height="41" rx="7" fill="#141414" stroke="#141414" stroke-width="3"/>' +
      '<rect x="8" y="8" width="30" height="30" fill="#141414"/>' + cells + '</svg>';
  })();

  function fixQuizIcon() {
    var svg = document.querySelector('svg[data-dc-tpl="32"]:not([data-aj-done])');
    if (!svg) return;
    var wrap = document.createElement('span');
    wrap.setAttribute('data-aj-done', '1');
    wrap.style.cssText = 'display:inline-flex;flex:none';
    wrap.innerHTML = QUIZ_ICON;
    svg.parentNode.replaceChild(wrap, svg);
  }

  function apply() {
    fixQuizIcon();
    var h = document.querySelector('header'); if (h) h.remove();
    var f = document.querySelector('footer'); if (f) f.remove();
    var old = document.getElementById('aj-games-backbar'); if (old) old.remove();

    if (!document.getElementById('aj-hp')) {
      addStyle();
      var links = NAV.map(function (t) { return '<a href="index.html">' + t + '</a>'; }).join('');
      var el = document.createElement('div'); el.id = 'aj-hp';
      el.innerHTML =
        '<div class="ajn-strip"><div class="in"><span><b>Sunday,</b> June 21, 2026 &nbsp;·&nbsp; <span class="wx">30° C Doha · 34°C clear</span></span>' +
          '<span class="ajn-themes"><span class="on">Light</span><span>Paper</span><span>Dark</span></span></div></div>' +
        '<div class="ajn-nav"><div class="ajn-inner">' +
          '<a class="ajn-brand" href="index.html"><img class="ajn-logomark" src="assets/aj-logo.svg" alt="Al Jazeera"></a>' +
          '<nav class="ajn-links">' + links + '</nav>' +
          '<a class="ajn-watch" href="index.html">▶ Watch Live</a>' +
        '</div></div>' +
        '<a class="ajn-ask" href="index.html" style="display:block;text-decoration:none"><div class="in">' +
          '<span class="l"><span class="ajn-orb"></span><span class="lbl">Ask Al Jazeera anything</span>' +
          '<span class="q">“What does the US–Iran deal mean?”</span></span>' +
          '<span class="press"><b>Press /</b> to ask</span>' +
        '</div><span class="stroke"></span></a>';
      document.body.insertBefore(el, document.body.firstChild);
    }
  }

  function init() {
    apply();
    var n = 0, iv = setInterval(function () { apply(); if (++n > 24) clearInterval(iv); }, 250);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
