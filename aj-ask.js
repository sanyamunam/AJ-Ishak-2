/* Ask Al Jazeera — the header bar expands into a full AI chat panel.
   Opens on click or "/", closes on "/", Esc, or the minimise chip.
   Layout follows Figma 37028:20994 (container 1920x890, content on the same
   1440 max-width grid as the rest of the header).

   On open it plays a scripted exchange that streams in as if it were live:
   question lands, assistant thinks, status resolves, the answer types out,
   then evidence blocks stagger in. Any interaction cancels it.
*/
(function () {
  'use strict';

  var REDUCED = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var PANEL_H = 890;   // design height, from the Figma container

  var CSS = [
    '.aj-ask-panel{position:relative;width:100%;overflow:hidden;height:0;opacity:0;will-change:height;',
    /* same drifting gradient as the collapsed ask bar, so the two read as one surface */
    '  background-image:linear-gradient(90deg,#fdf5ea,#fbeef3,#f4eefb,#eef1fb,#f6f4fb,#fbf7f2,#f4eefb,#fbeef3,#fdf5ea);',
    '  background-size:300% 100%;animation:ajAskGradientShift 8s ease-in-out infinite;',
    /* curtain: shell and bar share one 820ms beat in both directions, so the cloth
       that drops on open is visibly the same cloth being drawn back up on close */
    '  transition:height .82s cubic-bezier(.16,1,.3,1),opacity .38s ease}',
    '.aj-ask-panel.is-closing{transition:height .82s cubic-bezier(.16,1,.3,1),opacity .38s ease .2s}',
    /* the bar collapses on the same beat, so the two read as one morph */
    '.aj-ask-gradient{transition:height .82s cubic-bezier(.16,1,.3,1),opacity .34s ease,padding .82s cubic-bezier(.16,1,.3,1)}',
    '.aj-ask-gradient.aj-bar-out{height:0!important;padding-top:0!important;padding-bottom:0!important;opacity:0;overflow:hidden}',
    /* content is wiped in behind the falling curtain — the transition lives on the base
       rule so the wipe plays in reverse on close instead of snapping shut */
    '.aj-ask-inner{opacity:0;transform:translateY(8px);clip-path:inset(0 0 100% 0);',
    '  transition:opacity .3s ease,transform .5s cubic-bezier(.16,1,.3,1),clip-path .6s cubic-bezier(.16,1,.3,1)}',
    '.aj-ask-panel.is-open .aj-ask-inner{opacity:1;transform:none;clip-path:inset(0 0 0 0);',
    '  transition:opacity .5s ease .12s,transform .78s cubic-bezier(.16,1,.3,1) .12s,clip-path .8s cubic-bezier(.16,1,.3,1) .08s}',
    '.aj-ask-panel.is-open{opacity:1}',
    /* collapse the black top strip while the chat is active */
    '.aj-topstrip{transition:max-height .44s cubic-bezier(.4,0,.7,.2),opacity .3s ease;max-height:120px;overflow:hidden}',
    'html.aj-ask-lock .aj-topstrip{max-height:0;opacity:0}',
    /* slide the headlines ticker away while the chat is active */
    '.aj-ticker{transition:transform .5s cubic-bezier(.4,0,.7,.2),opacity .35s ease}',
    'html.aj-ask-lock .aj-ticker{transform:translateY(110%);opacity:0;pointer-events:none}',
    /* while the chat is active, hide the page content behind it and lock scroll so the chat owns the full height */
    'html.aj-ask-lock main,html.aj-ask-lock footer{display:none}',
    'html.aj-ask-lock{overflow:hidden}',
    /* while the chat is up the page underneath is pinned — the only thing that
       scrolls is the transcript, and it doesn't chain past its own ends */
    'html.aj-ask-lock,html.aj-ask-lock body{overflow:hidden!important}',
    '.aj-ask-body{overscroll-behavior:contain}',
    '.aj-ask-inner{margin:0 auto;width:100%;max-width:1440px;height:100%;display:flex;flex-direction:column;padding:56px 0 22px;will-change:transform,opacity}',

    '.aj-ask-head{display:flex;align-items:flex-start;justify-content:space-between;gap:24px;flex:none}',
    '.aj-ask-title{font-family:Lora,Georgia,serif;font-size:30px;font-weight:600;line-height:1.25;color:#111118;margin:0;letter-spacing:-.4px}',
    '.aj-ask-title span{background:linear-gradient(120deg,#fbc983 0%,#f86f5d 50%,#6f60d1 100%);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;color:#f86f5d}',
    '.aj-ask-spark{width:22px;height:22px;flex:none;display:inline-block;vertical-align:baseline;margin-right:10px;animation:ajAskSpark 2.4s infinite}',
    /* same eased .55s spin as the Summarize button, looped with a beat between turns */
    '@keyframes ajAskSpark{0%{transform:rotate(0deg);animation-timing-function:cubic-bezier(.22,.61,.36,1)}23%{transform:rotate(360deg)}100%{transform:rotate(360deg)}}',
    '@media (prefers-reduced-motion: reduce){.aj-ask-spark{animation:none}}',
    '.aj-ask-sub{margin:8px 0 0;font-size:14px;line-height:1.5;color:rgba(32,32,32,.62)}',
    '.aj-ask-close{position:absolute;top:16px;right:16px;z-index:6;width:40px;height:40px;display:flex;align-items:center;justify-content:center;background:#fff;border:0;border-radius:50%;cursor:pointer;font:20px/1 inherit;color:#202020;box-shadow:0 7px 10px rgba(0,0,0,.12);transition:background .2s ease}',
    '.aj-ask-close:hover{background:#f3f3f6}',

    '.aj-ask-body{flex:1 1 auto;min-height:0;overflow-y:auto;padding:22px 72px 8px;scrollbar-width:thin;scrollbar-color:rgba(17,17,24,.22) transparent}',
    '.aj-ask-body::-webkit-scrollbar{width:6px}',
    '.aj-ask-body::-webkit-scrollbar-thumb{background:rgba(17,17,24,.22);border-radius:3px}',

    /* ---- turns ---- */
    '.aj-q{display:flex;justify-content:flex-end;margin:0 0 28px}',
    '.aj-q span{background:#202020;color:#fff;font-size:15px;line-height:1.4;padding:13px 20px;max-width:620px}',
    '.aj-a{display:flex;gap:14px;margin:0 0 34px;align-items:flex-start}',
    /* the orb itself is the shared .aura-orb component (aj-aura-orb.css) */
    '.aj-a-orb{flex:none;margin-top:2px}',
    '.aj-a-col{flex:1 1 auto;min-width:0;max-width:820px}',

    '.aj-in{opacity:0;transform:translateY(10px);transition:opacity .45s ease,transform .45s cubic-bezier(.22,.61,.36,1)}',
    '.aj-in.on{opacity:1;transform:none}',
    '.aj-q span{opacity:0;transform:translateX(16px);transition:opacity .4s ease,transform .45s cubic-bezier(.22,.61,.36,1)}',
    '.aj-q.on span{opacity:1;transform:none}',

    /* ---- thinking ---- */
    '.aj-dots{display:inline-flex;gap:5px;align-items:center;height:22px}',
    '.aj-dots i{width:6px;height:6px;border-radius:50%;background:rgba(17,17,24,.32);animation:ajDot 1.1s ease-in-out infinite}',
    '.aj-dots i:nth-child(2){animation-delay:.16s}.aj-dots i:nth-child(3){animation-delay:.32s}',
    '@keyframes ajDot{0%,60%,100%{opacity:.28;transform:translateY(0)}30%{opacity:1;transform:translateY(-3px)}}',

    /* ---- status ---- */
    '.aj-status{display:flex;align-items:center;gap:9px;font-size:13px;margin:0 0 14px}',
    '.aj-status b{color:#ef304a;font-weight:700;letter-spacing:1.1px;text-transform:uppercase;font-size:12.5px}',
    '.aj-status em{font-style:normal;color:rgba(17,17,24,.55)}',
    '.aj-status .pip{width:7px;height:7px;border-radius:50%;background:#ef304a;animation:ajPip 1.6s ease-in-out infinite}',
    '@keyframes ajPip{0%,100%{opacity:1}50%{opacity:.35}}',

    /* ---- answer ---- */
    '.aj-say{border:1px solid rgba(17,17,24,.14);background:rgba(255,255,255,.35);padding:14px 18px;font-size:15px;line-height:1.65;color:#111118;margin:0 0 22px}',
    '.aj-caret{display:inline-block;width:2px;height:1.05em;background:#111118;vertical-align:-2px;margin-left:2px;animation:ajCaret .9s steps(1) infinite}',
    '@keyframes ajCaret{0%,49%{opacity:1}50%,100%{opacity:0}}',
    '.aj-lead{font-size:15px;line-height:1.5;color:#111118;margin:0 0 16px}',

    /* ---- sources ---- */
    '.aj-src{display:flex;align-items:center;gap:14px;margin:0 0 14px}',
    '.aj-src-lbl{font-size:11.5px;letter-spacing:1.3px;text-transform:uppercase;color:rgba(17,17,24,.45)}',
    '.aj-src-rule{height:1px;width:56px;background:rgba(17,17,24,.18)}',
    '.aj-src-chip{display:inline-flex;align-items:center;gap:8px;background:#fff;border:1px solid rgba(17,17,24,.10);padding:7px 14px 7px 8px;font-size:13.5px}',
    '.aj-src-chip .aj-logo{width:22px;height:22px;border-radius:50%;background:#fa9000;color:#fff;font-size:9px;font-weight:700;display:flex;align-items:center;justify-content:center;letter-spacing:.2px}',
    '.aj-src-chip b{font-weight:700;color:#111118}',
    '.aj-src-chip em{font-style:normal;color:rgba(17,17,24,.5)}',

    /* ---- live card ---- */
    '.aj-live{display:flex;border:1px solid rgba(17,17,24,.12);background:#fff;margin:0 0 22px;overflow:hidden;cursor:pointer;transition:box-shadow .25s ease}',
    '.aj-live:hover{box-shadow:0 8px 22px rgba(31,35,84,.10)}',
    '.aj-live-media{position:relative;width:200px;min-height:140px;flex:none;overflow:hidden;background:#20242c}',
    '.aj-live-media img{width:100%;height:100%;object-fit:cover;display:block;transition:transform .5s cubic-bezier(.22,.61,.36,1)}',
    '.aj-live:hover .aj-live-media img{transform:scale(1.05)}',
    '.aj-live-badge{position:absolute;left:12px;top:12px;background:#f5334f;color:#fff;font-size:10.5px;font-weight:700;letter-spacing:1px;padding:4px 9px;z-index:2}',
    '.aj-live-txt{padding:10px 22px;display:flex;flex-direction:column;justify-content:center;gap:8px}',
    '.aj-live-txt h4{margin:0;font-size:18px;font-weight:700;color:#111118;line-height:1.3}',
    '.aj-live-body{margin:0;font-size:13.5px;line-height:1.5;color:rgba(17,17,24,.62);',
    '  display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}',
    '.aj-live-meta{margin:0;display:flex;align-items:center;gap:7px;font-size:13px;color:rgba(17,17,24,.55)}',
    '.aj-live-meta b{color:#ef304a;font-weight:700}',
    '.aj-live-pip{width:7px;height:7px;flex:none;border-radius:50%;background:#ef304a;animation:ajPip 1.6s ease-in-out infinite}',

    /* ---- suggested reads, as assistant-side chat bubbles ---- */
    '.aj-pair{display:flex;flex-wrap:wrap;align-items:stretch;gap:12px;margin:14px 0 4px}',
    '.aj-card{flex:1 1 260px;max-width:400px;background:#fff;padding:14px 18px;border:1px solid rgba(17,17,24,.10);',
    '  border-left:3px solid var(--rule,#3563e9);cursor:pointer;',
    '  display:flex;flex-direction:column;',
    '  transition:box-shadow .25s ease,transform .25s ease}',
    '.aj-card:hover{box-shadow:0 8px 22px rgba(31,35,84,.10);transform:translateY(-1px)}',
    '.aj-card-top{display:flex;align-items:center;gap:10px;margin-bottom:8px}',
    '.aj-tag{font-size:10.5px;font-weight:700;letter-spacing:1.1px;text-transform:uppercase;padding:4px 9px;background:var(--tagbg,#e8eeff);color:var(--tagfg,#3563e9)}',
    '.aj-when{font-size:12.5px;color:rgba(17,17,24,.45)}',
    '.aj-card h5{margin:0 0 8px;font-size:14px;font-weight:500;line-height:1.45;color:#111118}',
    '.aj-cta{margin-top:auto;font-size:13.5px;font-weight:600;color:#fa9000;transition:gap .2s ease}',

    /* ---- numbered ---- */
    /* one card holding the whole list, each point a numbered row */
    '.aj-nums{border:1px solid rgba(17,17,24,.12);background:rgba(255,255,255,.45);padding:6px 24px}',
    '.aj-num{display:flex;align-items:baseline;gap:12px;padding:16px 0;border-top:1px solid rgba(17,17,24,.09)}',
    '.aj-num:first-child{border-top:0}',
    '.aj-num i{flex:none;width:5px;height:5px;border-radius:50%;background:rgba(17,17,24,.42);transform:translateY(-3px)}',
    '.aj-num h6{margin:0;font-size:14px;font-weight:500;line-height:1.3;color:#111118}',

    /* ---- flags ---- */
    '.aj-flags{display:flex;flex-wrap:wrap;gap:12px;align-items:stretch;background:transparent;padding:0}',
    '.aj-flag{display:inline-flex;align-items:center;gap:11px;font-size:14px;font-weight:500;color:#111118;background:#fff;border:1px solid rgba(17,17,24,.10);padding:14px 18px}',
    '.aj-flag span{font-size:24px;line-height:1}',

    /* ---- chips + input ---- */
    '.aj-ask-chips{display:flex;flex-wrap:wrap;gap:12px;flex:none;padding:14px 0}',
    '.aj-ask-chip{display:inline-flex;align-items:center;gap:8px;background:rgba(255,255,255,.66);border:1px solid rgba(17,17,24,.06);padding:11px 16px;font-size:13px;color:#202020;cursor:pointer;transition:background .2s ease,transform .2s ease}',
    '.aj-ask-chip:hover{background:#fff;transform:translateY(-1px)}',
    '.aj-ask-chip i{font-style:normal;color:#7c5cf0;font-size:12px}',
    '.aj-ask-form{display:flex;align-items:center;gap:12px;background:#fff;padding:14px 18px;flex:none;box-shadow:0 10px 24px rgba(31,35,84,.10)}',
    '.aj-ask-orb{flex:none}',
    '.aj-ask-field{flex:1 1 auto;border:0;outline:0;background:none;font:15px/1.4 inherit;color:#202020;min-width:0}',
    '.aj-ask-field::placeholder{color:rgba(32,32,32,.45)}',

    '@media (max-width:1100px){.aj-pair{grid-template-columns:1fr}.aj-live-media{width:170px}}',

    /* ---- mobile: the desktop panel breathes in 56-72px steps; the phone
       layout gets its own compact rhythm instead of inheriting them ---- */
    '@media (max-width:1023px){',
    '.aj-ask-inner{padding:14px 16px 10px}',
    '.aj-ask-head{gap:12px}',
    '.aj-ask-title{font-size:21px;letter-spacing:-.2px;padding-right:44px}',
    '.aj-ask-spark{width:16px;height:16px;margin-right:6px}',
    '.aj-ask-sub{margin-top:6px;font-size:13px}',
    '.aj-ask-close{top:10px;right:12px;width:36px;height:36px;font-size:17px}',
    '.aj-ask-body{padding:12px 0 6px}',
    '.aj-q{margin:0 0 16px}',
    '.aj-q span{max-width:85%;padding:10px 14px;font-size:14px}',
    '.aj-a{gap:10px;margin:0 0 22px}',
    '.aj-ask-chips{gap:8px;padding:10px 0}',
    '.aj-ask-chip{padding:9px 12px;font-size:12px;gap:6px}',
    '.aj-ask-form{padding:10px 12px;gap:10px}',
    '.aj-ask-field{font-size:14px}',
    '}',
    '@media (prefers-reduced-motion: reduce){.aj-ask-panel,.aj-in,.aj-q span{transition:none}.aj-ask-panel,.aj-dots i,.aj-status .pip,.aj-caret{animation:none}}'
  ].join('\n');

  var SUGGESTIONS = [
    'What happened at Khamenei’s funeral today?',
    'Can Egypt really beat Argentina',
    'Summarize todays  front page'
  ];
  var PLACEHOLDER = 'Ask about anything Al Jazeera has reported – todays front page or thirty years of archive.';

  /* ---------------- the scripted exchange ---------------- */
  var SCRIPT = [
    {
      q: 'What’s the latest on the Gaza ceasefire negotiations?',
      status: { label: 'Talks stalled', note: 'fighting continues' },
      say: 'As of this week, ceasefire negotiations remain stalled despite ongoing mediation efforts. ' +
           'Recent reports indicate continued military strikes in Gaza while discussions on a longer-term ' +
           'agreement have made little progress.',
      blocks: [
        { kind: 'sources', name: 'Al Jazeera', count: 3 },
        { kind: 'live', title: 'Gaza ceasefire talks live updates',
          body: 'Rolling coverage from Al Jazeera correspondents on the ground, updated as mediators shuttle between delegations in Doha.',
          meta: 'Live Blog · Updated 15 min ago' },
        { kind: 'pair', items: [
          { tag: 'Explainer', tagbg: '#e8eeff', tagfg: '#3563e9', rule: '#3563e9', when: '2h ago',
            title: 'What are the sticking points in the Gaza truce talks?', cta: 'Read article →' },
          { tag: 'News', tagbg: '#ddf3f8', tagfg: '#1a95ad', rule: '#37c5e0', when: '5h ago',
            title: 'Mediators push for new round of ceasefire talks in Doha', cta: 'Full coverage →' }
        ] }
      ]
    },
    {
      q: 'Why haven’t they reached an agreement yet?',
      lead: 'Three issues are blocking a deal:',
      blocks: [
        { kind: 'nums', items: ['Hostage releases', 'Israeli troop withdrawals', 'Long-term security arrangements'] }
      ]
    },
    {
      q: 'Who is leading the negotiations?',
      lead: 'Three mediators continue to shuttle between the parties:',
      blocks: [
        { kind: 'flags', items: [
          { flag: '🇶🇦', label: 'Qatar' }, { flag: '🇪🇬', label: 'Egypt' }, { flag: '🇺🇸', label: 'United States' }
        ] }
      ]
    }
  ];

  function pickThumb() {
    var imgs = [].slice.call(document.querySelectorAll('main img'));
    var best = null;
    for (var i = 0; i < imgs.length; i++) {
      var im = imgs[i];
      if (!/^data:image\/(jpeg|png|webp)/.test(im.src || '')) continue;
      var r = im.getBoundingClientRect();
      if (r.width < 200) continue;
      if (/gaza|strike|safia|mosque/i.test(im.alt || '')) return im.src;   // prefer on-topic
      if (!best) best = im.src;
    }
    return best;
  }

  function init() {
    var bar = document.querySelector('.aj-ask-gradient');
    if (!bar || bar.getAttribute('data-ask')) return;
    bar.setAttribute('data-ask', '1');

    var st = document.createElement('style');
    st.id = 'aj-ask-style';
    st.textContent = CSS;
    document.head.appendChild(st);

    // tag the black top strip so it can collapse while the chat is active
    var topStrip = document.querySelector('header [class*="2d2c2c"]');
    if (topStrip) topStrip.classList.add('aj-topstrip');

    var panel = document.createElement('div');
    panel.className = 'aj-ask-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'Ask Al Jazeera AI');
    panel.setAttribute('aria-hidden', 'true');
    panel.innerHTML =
      '<div class="aj-ask-inner">' +
        '<div class="aj-ask-head">' +
          '<div>' +
            '<h2 class="aj-ask-title"><img class="aj-ask-spark" alt="" src="data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%3E%3Cdefs%3E%3ClinearGradient%20id%3D%22g%22%20x1%3D%220%22%20y1%3D%220%22%20x2%3D%221%22%20y2%3D%221%22%3E%3Cstop%20offset%3D%220%22%20stop-color%3D%22%233b6ff5%22%2F%3E%3Cstop%20offset%3D%2250%25%22%20stop-color%3D%22%238b5cf6%22%2F%3E%3Cstop%20offset%3D%22100%25%22%20stop-color%3D%22%23f472b6%22%2F%3E%3C%2FlinearGradient%3E%3C%2Fdefs%3E%3Cpath%20fill%3D%22url%28%23g%29%22%20d%3D%22M12%200c0%206.63%205.37%2012%2012%2012-6.63%200-12%205.37-12%2012%200-6.63-5.37-12-12-12%206.63%200%2012-5.37%2012-12z%22%2F%3E%3C%2Fsvg%3E">Hi there! I’m <span>Al Jazeera AI</span></h2>' +
            '<p class="aj-ask-sub">Ask anything about the news. Answers come only from Al Jazeera reporting, with links.</p>' +
          '</div>' +
          '<button type="button" class="aj-ask-close" aria-label="Close chat">✕</button>' +
        '</div>' +
        '<div class="aj-ask-body" aria-live="polite"></div>' +
        '<div class="aj-ask-chips">' +
          SUGGESTIONS.map(function (s) { return '<button type="button" class="aj-ask-chip"><i>✦</i>' + s + '</button>'; }).join('') +
        '</div>' +
        '<form class="aj-ask-form">' +
          '<span class="aj-ask-orb aura-orb" style="--size:26px" aria-hidden="true"><span class="aura-orb__blobs"><span class="aura-orb__spin"><i></i><i></i><i></i><i></i><i></i></span></span></span>' +
          '<input class="aj-ask-field" type="text" placeholder="' + PLACEHOLDER + '" aria-label="Ask a question">' +
        '</form>' +
      '</div>';
    bar.parentNode.insertBefore(panel, bar.nextSibling);

    var body = panel.querySelector('.aj-ask-body');
    var field = panel.querySelector('.aj-ask-field');
    var open = false, played = false;

    /* ---------- sequencer ---------- */
    /* Timing runs on requestAnimationFrame rather than setTimeout: background and
       unfocused tabs clamp setTimeout to ~1s, which would drag the typing to a crawl. */
    var timers = [], rafs = [], cancelled = false;
    function wait(ms) {
      if (REDUCED) ms = Math.min(ms, 40);
      return new Promise(function (res) {
        var t0 = performance.now();
        (function tick() {
          if (cancelled || performance.now() - t0 >= ms) { res(); return; }
          rafs.push(requestAnimationFrame(tick));
        })();
      });
    }
    function cancelPlay() {
      cancelled = true;
      timers.forEach(clearTimeout); timers = [];
      rafs.forEach(cancelAnimationFrame); rafs = [];
      [].slice.call(body.querySelectorAll('.aj-caret,.aj-dots')).forEach(function (n) { n.remove(); });
      [].slice.call(body.querySelectorAll('.aj-in:not(.on)')).forEach(function (n) { n.classList.add('on'); });
      [].slice.call(body.querySelectorAll('.aj-q:not(.on)')).forEach(function (n) { n.classList.add('on'); });
    }
    function toBottom() { body.scrollTop = body.scrollHeight; }
    function show(el) {
      body.appendChild(el);
      toBottom();
      requestAnimationFrame(function () { el.classList.add('on'); toBottom(); });
      return el;
    }
    function el(cls, html) {
      var d = document.createElement('div');
      d.className = cls;
      if (html != null) d.innerHTML = html;
      return d;
    }

    // types text word by word with a caret, so it reads as a live response
    function typeInto(node, text) {
      return new Promise(function (res) {
        if (REDUCED) { node.textContent = text; res(); return; }
        var words = text.split(' '), i = 0;
        var caret = document.createElement('span');
        caret.className = 'aj-caret';
        node.textContent = '';
        node.appendChild(caret);
        var next = performance.now();
        (function step(now) {
          if (cancelled) { node.textContent = text; res(); return; }
          now = now || performance.now();
          while (i < words.length && now >= next) {
            node.insertBefore(document.createTextNode((i ? ' ' : '') + words[i]), caret);
            i++;
            next += 34 + Math.random() * 40;
          }
          toBottom();
          if (i >= words.length) {
            wait(260).then(function () { caret.remove(); res(); });
            return;
          }
          rafs.push(requestAnimationFrame(step));
        })();
      });
    }

    function buildBlock(b) {
      if (b.kind === 'sources') {
        return el('aj-src aj-in',
          '<span class="aj-src-lbl">Sources</span><span class="aj-src-rule"></span>' +
          '<span class="aj-src-chip"><span class="aj-logo">AJ</span><b>' + b.name + '</b><em>· ' + b.count + ' articles</em></span>');
      }
      if (b.kind === 'live') {
        var thumb = pickThumb();
        return el('aj-live aj-in',
          '<div class="aj-live-media"><img src="aj-live-thumb.jpg" alt=""><span class="aj-live-badge">LIVE</span>' +
          (thumb ? '<img alt="" src="' + thumb + '">' : '') + '</div>' +
          '<div class="aj-live-txt"><h4>' + b.title + '</h4>' +
          '<p class="aj-live-body">' + b.body + '</p>' +
          '<p class="aj-live-meta"><span class="aj-live-pip"></span><b>Live Blog</b> · Updated 15 min ago</p></div>');
      }
      if (b.kind === 'pair') {
        return el('aj-pair aj-in', b.items.map(function (c) {
          return '<div class="aj-card" style="--rule:' + c.rule + '">' +
            '<h5>' + c.title + '</h5><span class="aj-cta">' + c.cta + '</span></div>';
        }).join(''));
      }
      if (b.kind === 'nums') {
        return el('aj-nums aj-in', b.items.map(function (t) {
          return '<div class="aj-num"><i aria-hidden="true"></i><h6>' + t + '</h6></div>';
        }).join(''));
      }
      if (b.kind === 'flags') {
        return el('aj-flags aj-in', b.items.map(function (f) {
          return '<div class="aj-flag"><span>' + f.flag + '</span>' + f.label + '</div>';
        }).join(''));
      }
      return el('aj-in', '');
    }

    function askBubble(text) {
      var q = el('aj-q', '<span>' + text + '</span>');
      body.appendChild(q); toBottom();
      requestAnimationFrame(function () { q.classList.add('on'); toBottom(); });
      return q;
    }

    function answerShell() {
      var a = el('aj-a', '<span class="aj-a-orb aura-orb" style="--size:26px" aria-hidden="true"><span class="aura-orb__blobs"><span class="aura-orb__spin"><i></i><i></i><i></i><i></i><i></i></span></span></span><div class="aj-a-col"></div>');
      body.appendChild(a); toBottom();
      return a.querySelector('.aj-a-col');
    }

    async function playTurn(turn) {
      askBubble(turn.q);
      await wait(620);
      if (cancelled) return;

      var col = answerShell();
      var dots = el('aj-dots', '<i></i><i></i><i></i>');
      col.appendChild(dots); toBottom();
      await wait(900);
      if (cancelled) return;
      dots.remove();

      if (turn.status) {
        show2(col, el('aj-status aj-in',
          '<span class="pip"></span><b>' + turn.status.label + '</b><em>· ' + turn.status.note + '</em>'));
        await wait(420);
      }
      if (cancelled) return;

      if (turn.say) {
        var box = el('aj-say aj-in', '');
        show2(col, box);
        await wait(180);
        await typeInto(box, turn.say);
      } else if (turn.lead) {
        var lead = el('aj-lead aj-in', '');
        show2(col, lead);
        await wait(140);
        await typeInto(lead, turn.lead);
      }
      if (cancelled) return;

      for (var i = 0; i < turn.blocks.length; i++) {
        await wait(300);
        if (cancelled) return;
        show2(col, buildBlock(turn.blocks[i]));
      }
      await wait(260);
    }

    function show2(parent, node) {
      parent.appendChild(node);
      toBottom();
      requestAnimationFrame(function () { node.classList.add('on'); toBottom(); });
      return node;
    }

    async function playScript() {
      for (var i = 0; i < SCRIPT.length; i++) {
        if (cancelled) return;
        await playTurn(SCRIPT[i]);
        if (cancelled) return;
        if (i < SCRIPT.length - 1) await wait(900);
      }
    }

    /* ---------- open / close ---------- */
    function targetHeight() {
      var top = panel.getBoundingClientRect().top;
      var scale = panel.offsetWidth ? panel.getBoundingClientRect().width / panel.offsetWidth : 1;
      // the black strip and the ask bar both collapse when the chat opens, lifting the panel
      // up — add their (about-to-vanish) heights back so the panel still reaches the bottom
      var collapse = 0;
      ['.aj-topstrip', '.aj-ask-gradient'].forEach(function (sel) {
        var el = document.querySelector(sel);
        if (el && el !== panel) collapse += el.getBoundingClientRect().height;
      });
      var room = (window.innerHeight - (top - collapse)) / (scale || 1);
      return Math.max(360, room - 6);
    }

    var savedScroll = 0, closeTimer = null;

    function setOpen(next) {
      if (next === open) return;
      open = next;
      panel.setAttribute('aria-hidden', open ? 'false' : 'true');
      clearTimeout(closeTimer);

      if (open) {
        /* Bring the chat into view before measuring — opening from further down the
           page would otherwise size the panel against a negative offset — then pin
           the page so the transcript is the only thing that scrolls. */
        savedScroll = window.scrollY;
        window.scrollTo(0, 0);

        var barH = bar.offsetHeight;
        bar.style.height = barH + 'px';
        void bar.offsetHeight;                 // flush, so the collapse actually animates
        bar.classList.add('aj-bar-out');

        panel.style.height = targetHeight() + 'px';
        panel.classList.remove('is-closing');
        panel.classList.add('is-open');
        document.documentElement.classList.add('aj-ask-lock');

        timers.push(setTimeout(function () { field.focus(); }, REDUCED ? 0 : 260));
        if (!played) { played = true; cancelled = false; wait(520).then(playScript); }
      } else {
        panel.classList.add('is-closing');
        panel.classList.remove('is-open');

        /* Reveal the page behind the curtain but keep the reader pinned at the top for
           the whole retraction — restoring their scroll now would carry the closing
           panel off-screen and the animation would simply never be seen. */
        document.documentElement.classList.remove('aj-ask-lock');
        window.scrollTo(0, 0);

        panel.style.height = '0px';
        bar.classList.remove('aj-bar-out');

        closeTimer = setTimeout(function () {
          panel.classList.remove('is-closing');
          bar.style.height = '';               // hand height back to the layout
          window.scrollTo(0, savedScroll);     // and put the reader back where they were
        }, REDUCED ? 0 : 840);                 // just past the 820ms curtain
      }
    }

    function say(text, who) {
      if (who === 'me') return askBubble(text);
      var col = answerShell();
      var p = el('aj-lead aj-in', '');
      show2(col, p);
      return p;
    }

    function ask(q) {
      if (!q.trim()) return;
      cancelPlay(); cancelled = false;
      askBubble(q);
      field.value = '';
      wait(500).then(function () {
        var col = answerShell();
        var dots = el('aj-dots', '<i></i><i></i><i></i>');
        col.appendChild(dots); toBottom();
        return wait(850).then(function () {
          dots.remove();
          var p = el('aj-lead aj-in', '');
          show2(col, p);
          return typeInto(p, 'This prototype has no live model connected — in the real product the answer would be ' +
            'drawn from Al Jazeera reporting, with links to every source article.');
        });
      });
    }

    bar.addEventListener('click', function () { setOpen(true); });
    panel.querySelector('.aj-ask-close').addEventListener('click', function () { setOpen(false); });
    panel.querySelector('.aj-ask-form').addEventListener('submit', function (e) { e.preventDefault(); ask(field.value); });
    [].slice.call(panel.querySelectorAll('.aj-ask-chip')).forEach(function (c) {
      c.addEventListener('click', function () { ask(c.textContent.replace(/^✦\s*/, '')); });
    });
    body.addEventListener('wheel', function () { /* let the reader take over */ }, { passive: true });

    document.addEventListener('keydown', function (e) {
      var t = e.target, typing = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
      if (e.key === '/' && (!typing || t === field)) { e.preventDefault(); setOpen(!open); }
      else if (e.key === 'Escape' && open) { setOpen(false); }
    });

    window.addEventListener('resize', function () { if (open) panel.style.height = targetHeight() + 'px'; });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
