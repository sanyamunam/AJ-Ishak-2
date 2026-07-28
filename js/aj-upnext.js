/* Scroll-triggered "Up Next" drawer — Figma node 37390:5756.
   On the article page: once the reader scrolls past the first stretch of the
   story, a bar slides up from the bottom. Its 2px top line is a scroll
   progress meter (site orange #fa9000 over a 12% ink track) that fills to
   100% when the page is scrolled to the end. CLOSE dismisses it for the rest
   of the page view.

   Spec, read from Dev Mode:
   - bar 1920x178 white; top line 2px: #fa9000 fill over rgba(32,32,32,.12)
   - body pad 28px block / 240px inline (1440 column), gap 80, items centered
   - card: 200x120 image, 20px gap, then "/ UP NEXT" Anybody SemiBold 13
     +4% tracking #3578ff; headline Lora SemiBold 24/140% -4% #171717;
     "BECAUSE YOU FOLLOW EGYPT" Anybody Medium 15 uppercase gradient
   - right: bordered LISTEN | Summarize toolbar (Anybody 14 #575757)
   - close ribbon top-right: #ff435f, white ✕ + CLOSE Anybody SemiBold 14 */
(function () {
  'use strict';

  var REDUCED = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var SHOW_AFTER = 600; /* px of scroll before the drawer slides in */

  var CSS = [
    '.aj-upnext{position:fixed;left:0;right:0;bottom:0;z-index:9960;background:#fff;',
    '  box-shadow:0 -10px 40px rgba(16,16,16,.14);',
    '  transform:translateY(103%);transition:transform .6s cubic-bezier(.22,1.12,.36,1)}',
    '.aj-upnext.on{transform:translateY(0)}',
    '.aj-upnext.is-gone{display:none}',

    /* 2px scroll-progress line */
    '.aj-upnext__track{height:2px;background:rgba(32,32,32,.12)}',
    '.aj-upnext__fill{height:100%;width:0;background:#fa9000;transition:width .12s linear}',

    '.aj-upnext__row{max-width:1440px;margin:0 auto;padding:28px 24px;display:flex;align-items:center;gap:80px;box-sizing:border-box}',

    /* card: image + text */
    '.aj-upnext__card{display:flex;align-items:center;gap:20px;flex:1 1 auto;min-width:0;text-decoration:none;color:inherit}',
    '.aj-upnext__img{width:200px;height:120px;flex:none;object-fit:cover;display:block}',
    '.aj-upnext__text{display:flex;flex-direction:column;gap:6px;min-width:0}',
    '.aj-upnext__why{margin-top:14px}',
    '.aj-upnext__tag{font-family:Anybody,Arial,sans-serif;font-weight:600;font-size:13px;letter-spacing:.04em;text-transform:uppercase;color:#3578ff}',
    '.aj-upnext__title{margin:0;font-family:Lora,Georgia,serif;font-weight:600;font-size:24px;line-height:1.4;letter-spacing:-0.04em;color:#171717;',
    '  display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}',
    '.aj-upnext__why{font-family:Anybody,Arial,sans-serif;font-weight:500;font-size:15px;line-height:1;letter-spacing:-0.04em;text-transform:uppercase;',
    '  background:linear-gradient(90deg,#6b3ba5,#a34fd4);-webkit-background-clip:text;background-clip:text;color:transparent}',

    /* LISTEN | Summarize toolbar (same voice as the article toolbar) */
    '.aj-upnext__tools{display:flex;align-items:stretch;flex:none;border:1px solid #202020}',
    '.aj-upnext__tool{display:flex;align-items:center;gap:6px;padding:12px 16px;background:none;border:0;cursor:pointer;',
    '  font-family:Anybody,Arial,sans-serif;font-size:14px;letter-spacing:-0.04em;color:#575757;white-space:nowrap}',
    '.aj-upnext__tool+.aj-upnext__tool{border-left:1px solid #dcdcd4}',
    '.aj-upnext__tool svg{width:16px;height:16px;flex:none}',

    /* CLOSE ribbon riding the top-right edge */
    '.aj-upnext__close{position:absolute;right:0;top:2px;display:flex;align-items:center;gap:4px;padding:12px 20px;border:0;cursor:pointer;',
    '  background:#ff435f;color:#fff;font-family:Anybody,Arial,sans-serif;font-weight:600;font-size:14px;letter-spacing:.02em;text-transform:uppercase;line-height:1}',
    '.aj-upnext__close svg{width:14px;height:14px;flex:none}',
    '.aj-upnext__close:hover{background:#e93852}',

    '@media (max-width:1023px){',
    '  .aj-upnext__row{gap:20px;padding:16px}',
    '  .aj-upnext__img{width:120px;height:72px}',
    '  .aj-upnext__title{font-size:17px}',
    '  .aj-upnext__tools{display:none}}',
    '@media (prefers-reduced-motion: reduce){.aj-upnext{transition:none}.aj-upnext__fill{transition:none}}'
  ].join('\n');

  function addStyle() {
    if (document.getElementById('aj-upnext-style')) return;
    var st = document.createElement('style');
    st.id = 'aj-upnext-style';
    st.textContent = CSS;
    document.head.appendChild(st);
  }

  var bar = null, fill = null, shown = false, closed = false, ticking = false;

  function build() {
    bar = document.createElement('aside');
    bar.className = 'aj-upnext';
    bar.setAttribute('aria-label', 'Up next');
    bar.innerHTML =
      '<div class="aj-upnext__track"><div class="aj-upnext__fill"></div></div>' +
      '<div class="aj-upnext__row">' +
        '<a class="aj-upnext__card" href="aljazeera-article.html">' +
          '<img class="aj-upnext__img" src="assets/foryou/wc-salah.jpg" alt="">' +
          '<span class="aj-upnext__text">' +
            '<span class="aj-upnext__tag">/ Up next</span>' +
            '<h3 class="aj-upnext__title">Messi and Salah face off in the thrilling last 16 match. The entire region is glued to this epic showdown.</h3>' +
            '<span class="aj-upnext__why">Because you follow Egypt</span>' +
          '</span>' +
        '</a>' +
        '<div class="aj-upnext__tools">' +
          '<button class="aj-upnext__tool" type="button" data-ajlisten="1">' +
            '<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M4.67 12V4H6v8H4.67ZM7.33 14.67V1.33h1.34v13.34H7.33ZM2 9.33V6.67h1.33v2.66H2ZM10 12V4h1.33v8H10ZM12.67 9.33V6.67H14v2.66h-1.33Z"/></svg>' +
            'LISTEN ▸ 08:00' +
          '</button>' +
          '<button class="aj-upnext__tool aj-summarize" type="button">' +
            '<svg viewBox="0 0 15 15" aria-hidden="true"><defs><linearGradient id="ajun-spark" x1="1" y1="0" x2="14" y2="14" gradientUnits="userSpaceOnUse"><stop stop-color="#335ee0"/><stop offset="1" stop-color="#ff94df"/></linearGradient></defs><path d="M7.5 0C8.43 4.68 10.29 6.56 15 7.5c-4.7.94-6.57 2.82-7.5 7.5C6.57 10.32 4.71 8.44 0 7.5 4.71 6.56 6.57 4.68 7.5 0Z" fill="url(#ajun-spark)"/></svg>' +
            'Summarize' +
          '</button>' +
        '</div>' +
      '</div>' +
      '<button class="aj-upnext__close" type="button" aria-label="Close up next">' +
        '<svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M2 2l10 10M12 2 2 12"/></svg>' +
        'Close' +
      '</button>';
    document.body.appendChild(bar);
    fill = bar.querySelector('.aj-upnext__fill');

    bar.querySelector('.aj-upnext__close').addEventListener('click', function () {
      closed = true;
      bar.classList.remove('on');
      setTimeout(function () { bar.classList.add('is-gone'); }, REDUCED ? 0 : 650);
    });
  }

  function update() {
    ticking = false;
    var doc = document.documentElement;
    var max = doc.scrollHeight - window.innerHeight;
    var y = window.pageYOffset || doc.scrollTop || 0;
    var pct = max > 0 ? Math.min(100, Math.max(0, (y / max) * 100)) : 0;
    fill.style.width = pct + '%';

    if (closed) return;
    if (!shown && y > SHOW_AFTER) {
      shown = true;
      bar.classList.add('on');
    }
  }

  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(update);
  }

  function init() {
    addStyle();
    build();
    window.addEventListener('scroll', onScroll, { passive: true });
    update();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
