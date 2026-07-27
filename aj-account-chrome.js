/* Account page chrome: strip the bundle's own header/footer and inject a self-contained
   copy of the Al Jazeera homepage header (black strip + nav + Ask bar) AND footer.
   Loaded from inside the bundle template so it runs after the page reconstructs. */
(function () {
  'use strict';

  var NAV = ['Home', 'Explainers', 'By Category', 'Video', 'Podcast', 'Opinion', 'Community', 'More'];
  var FOOT = [
    ['', ['About Us', 'Code of Ethics', 'Careers', 'Sitemap', 'Regulatory Notice']],
    ['Connect', ['Contact Us', 'User account', 'Advertise with us', 'Stay Connected', 'Channels', 'TV Schedule', 'Podcasts']],
    ['Media', ['Al Jazeera Arabic', 'Al Jazeera English', 'Al Jazeera Documentary', 'Al Jazeera Balkans', 'AJ+']],
    ['Our Network', ['Al Jazeera Studies', 'Media Institute', 'Learn Arabic', 'Al Jazeera Forum', 'Al Jazeera Hotel']]
  ];

  var CSS =
    '@import url("https://fonts.googleapis.com/css2?family=Anybody:wght@400;500;600;700;800&display=swap");' +
    'body{zoom:.9}' +
    /* match the other pages: force the account app font to Anybody */
    '#dc-root,#dc-root *{font-family:"Anybody",Archivo,Arial,Helvetica,sans-serif !important}' +
    '#aj-hp{position:sticky;top:0;left:0;z-index:99999;width:100%;font-family:"Anybody",Archivo,Arial,Helvetica,sans-serif}' +
    '#aj-hp .ajn-strip{background:#2d2c2c;color:#fff}' +
    '#aj-hp .ajn-strip .in{max-width:1440px;margin:0 auto;display:flex;align-items:center;justify-content:space-between;padding:9px 24px;font-size:14px}' +
    '#aj-hp .ajn-strip .wx{opacity:.75}' +
    '#aj-hp .ajn-themes{display:flex;gap:2px;background:rgba(255,255,255,.1);padding:2px}' +
    '#aj-hp .ajn-themes span{padding:4px 12px;font-size:12px;color:#bdbdbd}' +
    '#aj-hp .ajn-themes span.on{background:#fff;color:#111}' +
    '#aj-hp .ajn-nav{background:#fff;border-bottom:1px solid #ececec}' +
    '#aj-hp .ajn-inner{max-width:1440px;margin:0 auto;display:flex;align-items:center;gap:24px;padding:0 24px;height:64px}' +
    '#aj-hp .ajn-brand{display:flex;align-items:center;gap:12px;text-decoration:none;flex:none}' +
    '#aj-hp .ajn-logomark{height:40px;width:110px;display:block}' +
    '#aj-hp .ajn-links{display:flex;align-items:center;gap:26px;flex:1 1 auto}' +
    '#aj-hp .ajn-links a{color:#101010;font-weight:600;font-size:15px;text-decoration:none;white-space:nowrap;transition:color .2s ease}' +
    '#aj-hp .ajn-links a:hover{color:#fa9000}' +
    '#aj-hp .ajn-watch{flex:none;display:inline-flex;align-items:center;gap:8px;background:#ff435f;color:#fff;font-weight:700;letter-spacing:.4px;font-size:14px;text-transform:uppercase;text-decoration:none;padding:14px 22px}' +
    '#aj-hp .ajn-watch:hover{background:#f82f4e}' +
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
    /* footer */
    '#aj-ft{background:#fff;font-family:"Anybody",Archivo,Arial,Helvetica,sans-serif}' +
    '#aj-ft .news{background:linear-gradient(180deg,rgba(242,228,201,0),#f2e4c9);text-align:center;padding:64px 24px 48px}' +
    '#aj-ft .news h3{font-family:Lora,Georgia,serif;font-size:28px;font-weight:700;color:#111;margin:0 0 12px}' +
    '#aj-ft .news p{max-width:640px;margin:0 auto 26px;color:#3a3a3a;font-size:15px;line-height:1.5}' +
    '#aj-ft .news form{display:inline-flex}' +
    '#aj-ft .news input{border:1px solid #d8d2c4;background:#fff;padding:0 16px;height:48px;width:300px;font-size:14px;outline:none}' +
    '#aj-ft .news button{background:#111;color:#fff;border:0;height:48px;padding:0 24px;font-weight:700;cursor:pointer}' +
    '#aj-ft .in{max-width:1440px;margin:0 auto;padding:56px 24px 40px;display:flex;gap:48px;flex-wrap:wrap}' +
    '#aj-ft .brand{flex:none}' +
    '#aj-ft .brand img{height:52px;width:auto}' +
    '#aj-ft .col{display:flex;flex-direction:column;gap:12px;min-width:150px}' +
    '#aj-ft .col h4{margin:0 0 4px;font-size:13px;font-weight:700;letter-spacing:.6px;text-transform:uppercase;color:#8a8a8a}' +
    '#aj-ft .col a{color:#101010;font-size:15px;text-decoration:none;font-weight:600}' +
    '#aj-ft .col a:hover{color:#fa9000}' +
    '#aj-ft .about a{font-size:18px}' +
    '#aj-ft .social{display:flex;gap:12px;padding:0 24px 28px;max-width:1440px;margin:0 auto}' +
    '#aj-ft .social a{width:38px;height:38px;border:1px solid #e2e2e2;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#101010;text-decoration:none;font-size:15px}' +
    '#aj-ft .social a:hover{background:#111;color:#fff;border-color:#111}' +
    '#aj-ft .bottom{background:linear-gradient(90deg,#5a7bf0,#8a63d6,#e6a34a);color:#fff}' +
    '#aj-ft .bottom .in2{max-width:1440px;margin:0 auto;padding:18px 24px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;font-size:14px}' +
    '#aj-ft .bottom a{color:#fff;text-decoration:none;margin-left:18px;opacity:.9}' +
    '#aj-ft .bottom a:hover{opacity:1}' +
    '@media(max-width:900px){#aj-hp .ajn-links{display:none}}';

  function addStyle() {
    if (document.getElementById('aj-hp-style')) return;
    var st = document.createElement('style'); st.id = 'aj-hp-style'; st.textContent = CSS;
    document.head.appendChild(st);
  }

  function buildHeader() {
    var links = NAV.map(function (t) { return '<a href="index.html">' + t + '</a>'; }).join('');
    var el = document.createElement('div'); el.id = 'aj-hp';
    el.innerHTML =
      '<div class="ajn-strip"><div class="in"><span><b>Sunday,</b> June 21, 2026 &nbsp;·&nbsp; <span class="wx">30° C Doha · 34°C clear</span></span>' +
        '<span class="ajn-themes"><span class="on">Light</span><span>Paper</span><span>Dark</span></span></div></div>' +
      '<div class="ajn-nav"><div class="ajn-inner">' +
        '<a class="ajn-brand" href="index.html"><img class="ajn-logomark" src="aj-logo.svg" alt="Al Jazeera"></a>' +
        '<nav class="ajn-links">' + links + '</nav>' +
        '<a class="ajn-watch" href="index.html">▶ Watch Live</a>' +
      '</div></div>' +
      '<div class="ajn-ask aj-ask-gradient" style="cursor:pointer"><div class="in">' +
        '<span class="l"><span class="ajn-orb"></span><span class="lbl">Ask Al Jazeera anything</span>' +
        '<span class="q">“What does the US–Iran deal mean?”</span></span>' +
        '<span class="press"><b>Press /</b> to ask</span>' +
      '</div><span class="stroke"></span></div>';
    return el;
  }

  function buildFooter() {
    var cols = FOOT.map(function (c, i) {
      var links = c[1].map(function (t) { return '<a href="index.html">' + t + '</a>'; }).join('');
      return '<div class="col' + (i === 0 ? ' about' : '') + '">' + (c[0] ? '<h4>' + c[0] + '</h4>' : '') + links + '</div>';
    }).join('');
    var el = document.createElement('footer'); el.id = 'aj-ft';
    el.innerHTML =
      '<div class="in"><a class="brand" href="index.html"><img src="aj-logo.svg" alt="Al Jazeera"></a>' + cols + '</div>' +
      '<div class="social"><a href="index.html">f</a><a href="index.html">𝕏</a><a href="index.html">◎</a><a href="index.html">▶</a></div>' +
      '<div class="bottom"><div class="in2"><span>© 2026 Al Jazeera Media Network</span>' +
        '<span><a href="index.html">Terms and conditions</a><a href="index.html">Privacy Policy</a><a href="index.html">Cookie Policy</a></span></div></div>';
    return el;
  }

  function apply() {
    var h = document.querySelector('header'); if (h) h.remove();
    var f = document.querySelector('footer:not(#aj-ft)'); if (f) f.remove();
    // the account bundle draws its own black date strip — drop it (we have our own)
    var bs = document.querySelector('#dc-root [data-dc-tpl="7"]'); if (bs) bs.remove();

    if (!document.getElementById('aj-hp')) {
      addStyle(); document.body.insertBefore(buildHeader(), document.body.firstChild);
      var ab = document.querySelector('.ajn-ask');
      if (ab) ab.addEventListener('click', function () { document.dispatchEvent(new KeyboardEvent('keydown', { key: '/', bubbles: true })); });
      if (!document.getElementById('aj-ask-loaded')) { var sc = document.createElement('script'); sc.id = 'aj-ask-loaded'; sc.src = 'aj-ask.js?v=14'; document.body.appendChild(sc); }
    }
    if (!document.getElementById('aj-ft')) { document.body.appendChild(buildFooter()); }
  }

  function init() {
    apply();
    var n = 0, iv = setInterval(function () { apply(); if (++n > 24) clearInterval(iv); }, 250);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
