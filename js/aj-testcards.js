/* "Test against the time" promo cards — looping ambient animations so the two
   game previews feel alive. Quiz card: the highlighted answer cycles A -> B -> C.
   Crossword card: a soft highlight sweeps the grid while lettered cells pulse.
   Pure decoration, paused under prefers-reduced-motion. */
(function () {
  'use strict';

  var REDUCED = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var CSS = [
    '.ajt-opt{transition:background-color .45s ease}',
    '.ajt-opt p{transition:color .45s ease}',
    '.ajt-cell{transition:background-color .4s ease,transform .4s ease,opacity .4s ease}',
    '.ajt-cell.ajt-hot{background-color:#eaf1ec!important;transform:scale(1.05)}',
    '.ajt-cell.ajt-lit p{animation:ajtPulse 2.4s ease-in-out infinite}',
    '@keyframes ajtPulse{0%,100%{opacity:.55}50%{opacity:1}}'
  ].join('\n');

  function addStyle() {
    if (document.getElementById('ajt-style')) return;
    var st = document.createElement('style'); st.id = 'ajt-style'; st.textContent = CSS;
    document.head.appendChild(st);
  }

  function section() {
    var lbl = [].slice.call(document.querySelectorAll('*')).filter(function (e) {
      return e.children.length === 0 && /TEST AGAINST THE TIME/i.test(e.textContent);
    })[0];
    return lbl ? lbl.closest('section') : null;
  }

  function byBg(root, hex) {
    return [].slice.call(root.querySelectorAll('div')).filter(function (d) {
      return (d.getAttribute('class') || '').indexOf(hex) > -1;
    })[0];
  }

  function wireQuiz(sec) {
    var card = byBg(sec, 'faf3e6');
    if (!card || card.getAttribute('data-ajt')) return;
    // the three answer rows: a div whose direct <p> is A / B / C
    var rows = [];
    [].slice.call(card.querySelectorAll('div')).forEach(function (d) {
      var p = d.querySelector(':scope > p') || (d.children.length === 1 && d.firstElementChild.tagName === 'P' ? d.firstElementChild : null);
      if (p && /^[ABC]$/.test(p.textContent.trim()) && rows.indexOf(d) === -1) rows.push(d);
    });
    // keep the outer answer boxes (36px tall), not nested
    rows = rows.filter(function (r) { return r.getBoundingClientRect().height > 24; });
    if (rows.length < 3) return;
    rows = rows.slice(0, 3);
    card.setAttribute('data-ajt', '1');
    rows.forEach(function (r) { r.classList.add('ajt-opt'); });

    function paint(active) {
      rows.forEach(function (r, i) {
        var p = r.querySelector('p');
        r.style.backgroundColor = i === active ? '#0c0c0c' : '#ffffff';
        if (p) p.style.color = i === active ? '#ffffff' : '#000000';
      });
    }
    var cur = 1;
    paint(cur);
    if (REDUCED) return;
    setInterval(function () { cur = (cur + 1) % 3; paint(cur); }, 1200);
  }

  function wireCross(sec) {
    var card = byBg(sec, 'f0f6f1');
    if (!card || card.getAttribute('data-ajt')) return;
    var grid = card.querySelector('[class*="inline-grid"]') || card.querySelector('.inline-grid');
    if (!grid) return;
    var cells = [].slice.call(grid.children);
    if (cells.length < 9) return;
    card.setAttribute('data-ajt', '1');
    cells.forEach(function (c) {
      c.classList.add('ajt-cell');
      if (c.querySelector('p')) c.classList.add('ajt-lit');
    });
    if (REDUCED) return;
    // sweep a soft highlight across the grid, skipping the black block cells
    var order = cells.map(function (c, i) { return i; }).filter(function (i) {
      return !/bg-black/.test(cells[i].getAttribute('class') || '');
    });
    var k = 0;
    setInterval(function () {
      cells.forEach(function (c) { c.classList.remove('ajt-hot'); });
      cells[order[k]].classList.add('ajt-hot');
      k = (k + 1) % order.length;
    }, 600);
  }

  function run() {
    var sec = section();
    if (!sec) return false;
    addStyle();
    wireQuiz(sec);
    wireCross(sec);
    return !!sec.querySelector('[data-ajt]');
  }

  function init() {
    if (run()) return;
    var n = 0, iv = setInterval(function () { if (run() || ++n > 30) clearInterval(iv); }, 250);
  }

  if (document.readyState === 'complete') init();
  else window.addEventListener('load', init);
})();
