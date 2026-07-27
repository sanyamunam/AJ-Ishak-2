/* Opinions cards — hover polish
   - the card's photograph pushes in slightly while its frame stays exactly the same size
   - the rule under the card fills left-to-right in black, like a progress bar over the existing line
   The featured card keeps its image in a sibling column, so the hover host is the whole
   row rather than the text block alone.
*/
(function () {
  'use strict';

  var CSS = [
    '.aj-op-card{position:relative;border-bottom-color:transparent!important}',
    '.aj-op-line{position:absolute;left:0;bottom:0;width:100%;height:1px;background:rgba(0,0,0,.2);pointer-events:none;overflow:hidden}',
    '.aj-op-line > i{display:block;height:100%;width:0;background:#000;transition:width .7s cubic-bezier(.33,1,.68,1)}',
    '.aj-op-hot:hover .aj-op-line > i,.aj-op-hot:focus-within .aj-op-line > i{width:100%}',
    '.aj-op-frame{overflow:hidden}',
    '.aj-op-frame img{transition:transform .55s cubic-bezier(.22,.61,.36,1);transform-origin:center center;will-change:transform}',
    '.aj-op-hot:hover .aj-op-frame img,.aj-op-hot:focus-within .aj-op-frame img{transform:scale(1.05)}',
    '.aj-op-lead{font-size:32px!important;line-height:1.32!important;letter-spacing:-1.28px!important}',
    '@media (prefers-reduced-motion: reduce){.aj-op-frame img{transition:none}.aj-op-hot:hover .aj-op-frame img{transform:none}.aj-op-line > i{transition:none}}'
  ].join('\n');

  // sections whose cards get the treatment, matched on their heading text
  var SECTIONS = [/^opinions$/i, /^you might also like$/i, /world cup 2026/i, /around the world/i, /^for you$/i];

  function init() {
    var sections = [];
    [].slice.call(document.querySelectorAll('p,h1,h2,h3,span')).forEach(function (e) {
      if (e.children.length) return;
      var txt = e.textContent.trim();
      if (!SECTIONS.some(function (re) { return re.test(txt); })) return;
      var sec = e.closest('section');
      if (sec && sections.indexOf(sec) === -1) sections.push(sec);
    });
    if (!sections.length) return;

    if (!document.getElementById('aj-opinions-style')) {
      var st = document.createElement('style');
      st.id = 'aj-opinions-style';
      st.textContent = CSS;
      document.head.appendChild(st);
    }

    sections.forEach(applyTo);
  }

  function applyTo(sec) {
    if (sec.getAttribute('data-op')) return;
    sec.setAttribute('data-op', '1');

    // the card is the column carrying the bottom rule
    var cards = [].slice.call(sec.querySelectorAll('div')).filter(function (d) {
      return /border-b\b/.test(d.className) && d.querySelector('a[href="aljazeera-article.html"]');
    });

    cards.forEach(function (card) {
      if (card.getAttribute('data-op-card')) return;
      card.setAttribute('data-op-card', '1');
      card.classList.add('aj-op-card');

      // the rule, redrawn inside the box so it can be animated over
      var line = document.createElement('span');
      line.className = 'aj-op-line';
      line.innerHTML = '<i></i>';
      card.appendChild(line);

      /* hover host: climb to the row only when the photograph sits in a dedicated
         sibling column, so hovering the headline drives the image too. Sibling cards
         don't count — otherwise the three stacked cards would all share one host. */
      var host = card;
      var row = card.parentElement;
      if (row && row.children.length > 1) {
        var imageColumn = [].slice.call(row.children).some(function (c) {
          return c !== card && cards.indexOf(c) === -1 && c.querySelector('img');
        });
        if (imageColumn) host = row;
      }
      host.classList.add('aj-op-hot');

      // zoom the largest image in the host — skips author avatars on the small cards
      var biggest = null, area = 0;
      [].slice.call(host.querySelectorAll('img')).forEach(function (im) {
        var r = im.getBoundingClientRect();
        if (r.width * r.height > area) { area = r.width * r.height; biggest = im; }
      });
      if (!biggest) return;
      var br = biggest.getBoundingClientRect();
      if (br.width < 200) return;

      var frame = biggest.parentElement;
      if (frame) frame.classList.add('aj-op-frame');

      // the lead card carries the feature headline — give it a little more presence
      var head = card.querySelector('a[href="aljazeera-article.html"] p');
      if (head && parseFloat(getComputedStyle(head).fontSize) >= 26) head.classList.add('aj-op-lead');
    });
  }

  if (document.readyState === 'complete') init();
  else window.addEventListener('load', init);
})();
