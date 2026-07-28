/* AI article summary drawer — Figma node 36662:4094 ("Summarizing article").
   Clicking any .aj-summarize toolbar button slides a bottom sheet up with a
   spring ease, shimmers skeleton lines while the AI "thinks" (~1.4s), then
   streams the summary in word by word (the design's "AI Text Reveal" frames
   are literally one node per word, so the reveal is word-granular here too).
   Esc, ✕, or clicking the scrim closes it. Instant under reduced motion.

   Spec, read from Dev Mode:
   - panel 1920x400, white base + soft cream→lavender gradient wash
   - header at y=40: 32px aura orb + "Summarizing article" Lora Medium Italic
     20px, gradient text #6b3ba5 → #341061
   - body (1440 column, y=88): paragraph Lora Medium Italic 18px/150% #202020,
     16px gap, then bullet rows ("·" + text) 17px/150%, 5px row gap
   - footer (y=336): "Generated from this article" + verified badge (#b58c31)
     Anybody 15px; right: "Report an issue" Anybody 15px #bb5808 underlined */
(function () {
  'use strict';

  var REDUCED = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var SUMMARY = {
    paragraph: 'Lionel Messi made history by becoming the first player to appear in six World Cups and scored his first tournament hat-trick in Argentina’s 3–0 win over Algeria. He matched Miroslav Klose’s all-time World Cup goal record with 15 goals, surpassing Kylian Mbappe’s recent tally. Messi’s achievement cements his status as the most decorated player in World Cup history.',
    bullets: [
      'Lionel Messi is the first player to participate in six World Cups.',
      'Messi tied Miroslav Klose’s record with 15 World Cup goals.',
      'He surpassed Kylian Mbappe’s recent goal count.',
      'This achievement solidifies Messi as the most decorated player in World Cup history.'
    ]
  };

  var THINK_MS = 1400; /* skeleton shimmer beat before text streams */
  var STEP_MS = 28;    /* per-word stagger */
  var FADE_MS = 300;   /* each word's fade/rise */

  var CSS = [
    '.ajs-scrim{position:fixed;inset:0;z-index:9980;background:rgba(16,16,16,.28);opacity:0;transition:opacity .4s ease}',
    '.ajs-scrim.on{opacity:1}',

    /* the sheet: spring slide-up via overshoot bezier */
    /* same animated wash as the header ask panel (.aj-ask-gradient in aj-chrome.css) */
    '.aj-sum{position:fixed;left:0;right:0;bottom:0;z-index:9990;height:auto;max-height:46vh;overflow-y:auto;',
    '  background-image:linear-gradient(90deg,#fdf5ea,#fbeef3,#f4eefb,#eef1fb,#f6f4fb,#fbf7f2,#f4eefb,#fbeef3,#fdf5ea);',
    '  background-size:300% 100%;animation:ajSumWash 8s ease-in-out infinite;',
    '  box-shadow:0 -18px 60px rgba(20,10,40,.18);',
    '  transform:translateY(103%);transition:transform .65s cubic-bezier(.22,1.16,.36,1)}',
    '.aj-sum.on{transform:translateY(0)}',
    '@keyframes ajSumWash{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}',

    '.aj-sum__inner{max-width:1440px;margin:0 auto;padding:24px 24px 22px;position:relative;display:flex;flex-direction:column;box-sizing:border-box}',

    /* header: orb + gradient label */
    '.aj-sum__head{display:flex;align-items:center;gap:8px}',
    '.aj-sum__label{font-family:Lora,Georgia,serif;font-weight:500;font-style:italic;font-size:20px;letter-spacing:-0.8px;background:linear-gradient(90deg,#6b3ba5,#341061);-webkit-background-clip:text;background-clip:text;color:transparent}',
    '.aj-sum.is-running .aj-sum__label{animation:ajSumPulse 1.6s ease-in-out infinite alternate}',
    '@keyframes ajSumPulse{from{opacity:1}to{opacity:.35}}',

    '.aj-sum__close{position:absolute;top:20px;right:24px;width:32px;height:32px;border:0;background:none;cursor:pointer;color:#575757;font-size:19px;line-height:32px;text-align:center;padding:0;transition:color .2s ease}',
    '.aj-sum__close:hover{color:#141414}',

    /* skeleton shimmer while "generating" */
    '.aj-sum__skel{display:flex;flex-direction:column;gap:9px;margin-top:20px}',
    '.aj-sum__skel i{display:block;height:15px;border-radius:4px;background:rgba(32,32,32,.08);position:relative;overflow:hidden}',
    '.aj-sum__skel i::after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,transparent 0,rgba(255,255,255,.8) 50%,transparent 100%);background-size:200% 100%;animation:ajSumShimmer 1.1s linear infinite}',
    '@keyframes ajSumShimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}',
    '.aj-sum__skel .s1{width:96%}.aj-sum__skel .s2{width:99%}.aj-sum__skel .s3{width:42%}',
    '.aj-sum__skel .b{height:13px;margin-top:5px}',
    '.aj-sum__skel .b1{width:34%}.aj-sum__skel .b2{width:31%}.aj-sum__skel .b3{width:26%}.aj-sum__skel .b4{width:40%}',

    /* body text */
    '.aj-sum__body{display:none;flex-direction:column;gap:12px;margin-top:18px;font-family:Lora,Georgia,serif;font-weight:500;font-style:italic;color:#202020;line-height:1.5}',
    '.aj-sum__body.on{display:flex}',
    '.aj-sum__para{display:flex;flex-wrap:wrap;gap:0 4.5px;font-size:18px;margin:0}',
    '.aj-sum__points{display:flex;flex-direction:column;gap:5px;font-size:17px}',
    '.aj-sum__point{display:flex;flex-wrap:wrap;gap:0 5px;margin:0}',
    '.aj-sum__w{opacity:0;transform:translateY(6px);filter:blur(2px);transition:opacity ' + FADE_MS + 'ms ease-out,transform ' + FADE_MS + 'ms cubic-bezier(.22,.61,.36,1),filter ' + FADE_MS + 'ms ease-out}',
    '.aj-sum__w.is-in{opacity:1;transform:none;filter:none}',

    /* footer bar */
    '.aj-sum__foot{display:flex;align-items:center;justify-content:space-between;margin-top:0;padding-top:18px;font-family:Anybody,Arial,sans-serif;font-size:15px;letter-spacing:-0.6px;color:#000;opacity:0;transition:opacity .45s ease-out}',
    '.aj-sum__foot.is-in{opacity:.97}',
    '.aj-sum__meta{display:flex;align-items:center;gap:12px}',
    '.aj-sum__src{opacity:.6}',
    '.aj-sum__verified{display:flex;align-items:center;gap:4px}',
    '.aj-sum__verified svg{width:16px;height:16px;color:#e8b53a;flex:none}',
    '.aj-sum__report{font:inherit;letter-spacing:inherit;color:#bb5808;text-transform:uppercase;text-decoration:underline;background:none;border:0;padding:0;cursor:pointer}',

    '@media (max-width:1023px){.aj-sum{height:auto;max-height:84vh}.aj-sum__inner{padding:28px 16px 30px}}',
    '@media (prefers-reduced-motion: reduce){',
    '  .aj-sum{transition:none;animation:none}.ajs-scrim{transition:none}',
    '  .aj-sum__skel i::after{animation:none}',
    '  .aj-sum__w{opacity:1;transform:none;filter:none;transition:none}',
    '  .aj-sum__foot{opacity:.97;transition:none}.aj-sum.is-running .aj-sum__label{animation:none}}'
  ].join('\n');

  var VERIFIED_SVG = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="m12 2 2.4 1.8 3 .1.9 2.8 2.4 1.7-1 2.8 1 2.8-2.4 1.7-.9 2.8-3 .1L12 22l-2.4-1.8-3-.1-.9-2.8L3.3 15.6l1-2.8-1-2.8L5.7 8.3l.9-2.8 3-.1L12 2Zm-1 13.4 5-5-1.4-1.4-3.6 3.6-1.6-1.6L8 12.4l3 3Z"/></svg>';

  function addStyle() {
    if (document.getElementById('aj-sum-style')) return;
    var st = document.createElement('style');
    st.id = 'aj-sum-style';
    st.textContent = CSS;
    document.head.appendChild(st);
  }

  function words(text, into) {
    text.split(' ').forEach(function (w) {
      var s = document.createElement('span');
      s.className = 'aj-sum__w';
      s.textContent = w;
      into.appendChild(s);
    });
  }

  var scrim = null, sheet = null, timers = [];
  function later(fn, ms) { timers.push(setTimeout(fn, ms)); }

  function buildSheet() {
    scrim = document.createElement('div');
    scrim.className = 'ajs-scrim';

    sheet = document.createElement('aside');
    sheet.className = 'aj-sum';
    sheet.setAttribute('role', 'dialog');
    sheet.setAttribute('aria-label', 'AI summary of this article');

    var inner = document.createElement('div');
    inner.className = 'aj-sum__inner';

    inner.innerHTML =
      '<button class="aj-sum__close" type="button" aria-label="Close summary">✕</button>' +
      '<div class="aj-sum__head">' +
        '<span class="aura-orb" style="--size:32px" aria-hidden="true"><span class="aura-orb__blobs"><span class="aura-orb__spin"><i></i><i></i><i></i><i></i><i></i></span></span></span>' +
        '<span class="aj-sum__label">Summarizing article</span>' +
      '</div>' +
      '<div class="aj-sum__skel" aria-hidden="true">' +
        '<i class="s1"></i><i class="s2"></i><i class="s3"></i>' +
        '<i class="b b1"></i><i class="b b2"></i><i class="b b3"></i><i class="b b4"></i>' +
      '</div>';

    var body = document.createElement('div');
    body.className = 'aj-sum__body';
    var para = document.createElement('p');
    para.className = 'aj-sum__para';
    words(SUMMARY.paragraph, para);
    body.appendChild(para);
    var points = document.createElement('div');
    points.className = 'aj-sum__points';
    SUMMARY.bullets.forEach(function (b) {
      var row = document.createElement('p');
      row.className = 'aj-sum__point';
      words('· ' + b, row);
      points.appendChild(row);
    });
    body.appendChild(points);
    inner.appendChild(body);

    var foot = document.createElement('div');
    foot.className = 'aj-sum__foot';
    foot.innerHTML =
      '<div class="aj-sum__meta"><span class="aj-sum__src">Generated from this article</span>' +
      '<span class="aj-sum__verified">' + VERIFIED_SVG + 'Editor Reviewed</span></div>' +
      '<button class="aj-sum__report" type="button">Report an issue</button>';
    inner.appendChild(foot);

    sheet.appendChild(inner);
    document.body.appendChild(scrim);
    document.body.appendChild(sheet);

    scrim.addEventListener('click', function () { close(); });
    inner.querySelector('.aj-sum__close').addEventListener('click', function () { close(); });
    document.addEventListener('keydown', onKey);
  }

  function onKey(e) { if (e.key === 'Escape') close(); }

  function open() {
    if (sheet) close(true);
    buildSheet();
    document.body.style.overflow = 'hidden';

    /* slide up with the spring bezier (double rAF so the initial transform is committed) */
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        scrim.classList.add('on');
        sheet.classList.add('on');
        sheet.classList.add('is-running');
      });
    });

    var skel = sheet.querySelector('.aj-sum__skel');
    var body = sheet.querySelector('.aj-sum__body');
    var foot = sheet.querySelector('.aj-sum__foot');

    later(function () {
      if (!sheet) return;
      skel.style.display = 'none';
      body.classList.add('on');
      var ws = body.querySelectorAll('.aj-sum__w');
      if (REDUCED) {
        [].forEach.call(ws, function (w) { w.classList.add('is-in'); });
        foot.classList.add('is-in');
        sheet.classList.remove('is-running');
        return;
      }
      [].forEach.call(ws, function (w, i) {
        later(function () { w.classList.add('is-in'); }, i * STEP_MS);
      });
      later(function () {
        foot.classList.add('is-in');
        if (sheet) sheet.classList.remove('is-running');
      }, ws.length * STEP_MS + FADE_MS + 250);
    }, REDUCED ? 0 : THINK_MS);
  }

  function close(immediate) {
    timers.forEach(clearTimeout);
    timers = [];
    document.removeEventListener('keydown', onKey);
    document.body.style.overflow = '';
    if (!sheet) return;
    var d = sheet, s = scrim;
    sheet = null; scrim = null;
    if (immediate || REDUCED) { d.remove(); s.remove(); return; }
    d.classList.remove('on');
    s.classList.remove('on');
    setTimeout(function () { d.remove(); s.remove(); }, 700);
  }

  function init() {
    addStyle();
    document.addEventListener('click', function (e) {
      var btn = e.target.closest && e.target.closest('.aj-summarize');
      if (!btn) return;
      e.preventDefault();
      e.stopPropagation();
      open();
    }, true);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
