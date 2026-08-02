/* Live match engine — takes over the homepage's static World Cup hero
   ("LIVE · 64'", France 1–2 Spain, two commentary rows) and runs it like a
   broadcast feed.

   What moves, and why:
   · the LIVE dot pulses like an on-air lamp — the one motion that never stops
   · the match clock ticks upward (accelerated: ~18s per match minute, so the
     hero feels alive inside a demo, but monotonic and never jumpy)
   · commentary lines arrive on the minute they belong to, preceded by a brief
     typing indicator — the "someone is filing this right now" tell
   · goals flip the scoreboard digits and pop the score box
   The event script continues the real fixture state the design shipped with:
   France a man down after the 64' red card, so Spain press, add a third, and
   France pull one back late. The clock parks in stoppage time rather than
   reaching full time — the hero must always read as live.

   Everything animates with transform/opacity only; reduced-motion still gets
   live DATA (text updates), just no motion. */
(function () {
  'use strict';

  var REDUCED = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* one match minute of real time (±jitter); ?livepace=<ms> or
     window.AJLM_MIN_MS overrides it for demos and tests — and a demo pace
     also runs while the tab is hidden, since it exists to be watched by
     automation as much as by people */
  var PACE = (location.search.match(/[?&]livepace=(\d+)/) || [])[1];
  var MIN_MS = +PACE || window.AJLM_MIN_MS || 18000;
  var DEMO = !!(+PACE || window.AJLM_MIN_MS);
  var START_MIN = 64;

  /* The opening moments run on a fixed fast schedule: a page that claims to
     be live has about three seconds to prove it before the reader decides it
     is a mock. These land as follow-ups to the 64' red card the design ships
     with, so no minute needs to pass first. */
  var OPENERS = [
    { at: 2400,  ev: { m: 64, t: 'VAR review complete — the straight red stands. France are down to ten' } },
    { at: 7000,  tick: true },
    { at: 11000, ev: { m: 65, t: 'Play resumes — France drop into a back four with ten men' } }
  ];

  /* minute → what happened. `score` flips the board when it lands. */
  var FEED = [
    { m: 66, t: 'Spain probe around the ten-man block — France refuse to break shape' },
    { m: 67, t: 'Olmo stings the palms of Maignan from twenty yards' },
    { m: 68, t: '🔁 Spain sub — Ferran Torres is on for Nico Williams' },
    { m: 70, t: '⚽ GOAL · Spain — Yamal curls one into the top corner. France 1–3 Spain', score: [1, 3] },
    { m: 72, t: '🟨 Tchouameni goes into the book for stopping the counter' },
    { m: 74, t: 'Chance — Griezmann glances a header straight at Simon' },
    { m: 76, t: 'Spain have had 71% of the ball since the red card' },
    { m: 78, t: '🔁 France sub — Coman replaces Dembele' },
    { m: 80, t: 'Save! Maignan tips a dipping Pedri effort over the bar' },
    { m: 82, t: '⚽ GOAL · France — Griezmann volleys in at the far post. Game on: 2–3', score: [2, 3] },
    { m: 84, t: 'France pour forward — the noise inside the stadium is rising' },
    { m: 86, t: '🟨 Carvajal booked for taking his time over a throw-in' },
    { m: 88, t: '🔁 Spain sub — Merino comes on to close the game out' },
    { m: 90, t: 'The fourth official signals five minutes of added time' },
    { m: 92, t: 'France throw everyone forward — Upamecano is up as an auxiliary striker' },
    { m: 94, t: 'Header! Upamecano meets the corner and puts it just wide' }
  ];
  /* once the script runs out the clock parks here and these rotate — the
     match never ends, because a finished match is not a live one */
  var STOPPAGE = [
    'Spain keep the ball in the corner — France cannot get near it',
    'One last France free kick, floated in… claimed by Simon',
    'Still we play — the board said five, we are past six'
  ];

  var CSS = [
    /* on-air lamp: a steady heartbeat, the only motion that never stops */
    '.ajlm-dot{width:5px;height:5px;border-radius:50%;background:#fff;flex:none;position:relative}',
    '.ajlm-dot::after{content:"";position:absolute;inset:-4px;border-radius:50%;border:1.5px solid rgba(255,255,255,.85);animation:ajlmPing 1.9s cubic-bezier(.22,.61,.36,1) infinite}',
    '@keyframes ajlmPing{0%{transform:scale(.4);opacity:1}70%,100%{transform:scale(2.3);opacity:0}}',
    /* the clock digits roll inside a clipped slot */
    '.ajlm-roll{display:inline-flex;overflow:hidden;vertical-align:bottom}',
    '.ajlm-roll>span{display:inline-block;font-variant-numeric:tabular-nums}',
    /* commentary typing indicator */
    '.ajlm-typing{display:inline-flex;gap:4px;align-items:center;height:1em}',
    '.ajlm-typing i{width:4px;height:4px;border-radius:50%;background:rgba(255,255,255,.65);animation:ajlmDot 1s ease-in-out infinite}',
    '.ajlm-typing i:nth-child(2){animation-delay:.15s}.ajlm-typing i:nth-child(3){animation-delay:.3s}',
    '@keyframes ajlmDot{0%,60%,100%{opacity:.25;transform:translateY(0)}30%{opacity:1;transform:translateY(-2px)}}',
    '@media (prefers-reduced-motion: reduce){.ajlm-dot::after,.ajlm-typing i{animation:none}}'
  ].join('\n');

  /* ---------------- find the hero's parts in the export's markup ---------- */
  function hook() {
    var badge = [].slice.call(document.querySelectorAll('p')).filter(function (p) {
      return /^LIVE\s*·/.test((p.textContent || '').trim());
    })[0];
    if (!badge) return null;

    var root = badge.closest('[class*="max-w-"]') || document;

    var scoreBox = [].slice.call(root.querySelectorAll('div')).filter(function (d) {
      return /bg-white/.test(d.className || '') && d.querySelectorAll('p.font-grotesk').length === 2;
    })[0];

    var texts = [].slice.call(root.querySelectorAll('p')).filter(function (p) {
      return /tracking-\[-0\.52px\]/.test(p.className || '');
    });
    var minutes = [].slice.call(root.querySelectorAll('p')).filter(function (p) {
      return /w-\[48px\]/.test(p.className || '');
    });
    if (!scoreBox || texts.length < 2 || minutes.length < 2) return null;

    return {
      badge: badge,
      dotImg: badge.parentElement.querySelector('img'),
      scores: scoreBox.querySelectorAll('p.font-grotesk'),
      scoreBox: scoreBox,
      curText: texts[0], prevText: texts[1],
      curMin: minutes[0], prevMin: minutes[1]
    };
  }

  /* ---------------- tiny motion helpers (transform/opacity only) --------- */
  function slideSwap(el, apply) {
    if (REDUCED || !el.animate) { apply(); return; }
    var out = el.animate(
      [{ transform: 'translateY(0)', opacity: 1 }, { transform: 'translateY(-0.7em)', opacity: 0 }],
      { duration: 160, easing: 'cubic-bezier(.55,0,1,.45)', fill: 'forwards' });
    out.onfinish = function () {
      apply();
      el.animate(
        [{ transform: 'translateY(0.7em)', opacity: 0 }, { transform: 'translateY(0)', opacity: 1 }],
        { duration: 300, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'forwards' });
    };
  }

  function riseIn(el) {
    if (REDUCED || !el.animate) return;
    el.animate(
      [{ transform: 'translateY(9px)', opacity: 0 }, { transform: 'translateY(0)', opacity: 1 }],
      { duration: 380, easing: 'cubic-bezier(.16,1,.3,1)' });
  }

  function fadeSwap(el, apply) {
    if (REDUCED || !el.animate) { apply(); return; }
    var out = el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 140, easing: 'ease', fill: 'forwards' });
    out.onfinish = function () {
      apply();
      el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 240, easing: 'ease', fill: 'forwards' });
    };
  }

  /* ---------------- the engine ---------------- */
  function init() {
    var ui = hook();
    if (!ui) return;

    var st = document.createElement('style');
    st.id = 'ajlm-style';
    st.textContent = CSS;
    document.head.appendChild(st);

    /* the static dot image becomes the pulsing on-air lamp */
    if (ui.dotImg) {
      var dot = document.createElement('span');
      dot.className = 'ajlm-dot';
      ui.dotImg.replaceWith(dot);
    }

    var minute = START_MIN;
    var current = { m: 64, t: ui.curText.textContent };   // what the top row shows
    var feedAt = 0;
    var stoppageAt = 0;

    function minuteLabel(m) { return (m > 90 ? '90+' + (m - 90) : m) + '’'; }
    function badgeLabel(m)  { return 'LIVE · ' + (m > 90 ? '90+' + (m - 90) : m) + '’'; }

    function tickClock() {
      minute++;
      slideSwap(ui.badge, function () { ui.badge.textContent = badgeLabel(minute); });
    }

    function setScore(pair) {
      [0, 1].forEach(function (i) {
        var el = ui.scores[i];
        if (el.textContent !== String(pair[i])) {
          slideSwap(el, function () { el.textContent = String(pair[i]); });
        }
      });
      if (!REDUCED && ui.scoreBox.animate) {
        ui.scoreBox.animate(
          [{ transform: 'scale(1)' }, { transform: 'scale(1.07)', offset: 0.35 }, { transform: 'scale(1)' }],
          { duration: 520, easing: 'cubic-bezier(.22,.61,.36,1)' });
      }
    }

    function pushEvent(ev) {
      /* the old current line steps down into the dimmed history row.
         Snapshot it NOW: the fade finishes after `current` has already been
         reassigned, and reading it then would write the NEW line into the
         history row — both rows showing the same text. */
      var old = current;
      fadeSwap(ui.prevText, function () { ui.prevText.textContent = old.t; });
      fadeSwap(ui.prevMin, function () { ui.prevMin.textContent = minuteLabel(old.m); });

      /* …and the new line rises into the top row */
      ui.curMin.textContent = minuteLabel(ev.m);
      ui.curText.textContent = ev.t;
      riseIn(ui.curText); riseIn(ui.curMin);

      current = ev;
      if (ev.score) setScore(ev.score);
    }

    /* a line is "being typed" for a moment before it lands */
    function typeThenPush(ev) {
      if (REDUCED) { pushEvent(ev); return; }
      var old = current;   // same snapshot rule as pushEvent
      fadeSwap(ui.prevText, function () { ui.prevText.textContent = old.t; });
      fadeSwap(ui.prevMin, function () { ui.prevMin.textContent = minuteLabel(old.m); });
      ui.curMin.textContent = minuteLabel(ev.m);
      ui.curText.innerHTML = '<span class="ajlm-typing"><i></i><i></i><i></i></span>';
      current = ev;
      setTimeout(function () {
        ui.curText.textContent = ev.t;
        riseIn(ui.curText);
        if (ev.score) setScore(ev.score);
      }, 1100 + Math.random() * 500);
    }

    /* the cold open: prove the feed is live before settling into the rhythm.
       Delays scale with the pace override so demo runs stay proportionate. */
    var scale = MIN_MS / 18000;
    OPENERS.forEach(function (o) {
      setTimeout(function () {
        if (document.hidden && !DEMO) return;
        if (o.tick) tickClock(); else typeThenPush(o.ev);
      }, o.at * scale);
    });

    /* one beat per match minute, lightly jittered so it never feels metronomic */
    var FIRST_BEAT = 16000 * scale;   // the regular rhythm takes over after the open
    (function beat(first) {
      setTimeout(function () {
        if (document.hidden && !DEMO) { beat(); return; }   // no theatre for an empty room

        if (minute < 94 || feedAt < FEED.length) {
          tickClock();
          var ev = FEED[feedAt];
          if (ev && ev.m <= minute) { feedAt++; typeThenPush(ev); }
        } else {
          /* parked in stoppage time: the clock holds, the feed keeps breathing */
          var line = STOPPAGE[stoppageAt++ % STOPPAGE.length];
          typeThenPush({ m: minute, t: line });
        }
        beat();
      }, first || MIN_MS * (0.85 + Math.random() * 0.3));
    })(FIRST_BEAT);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
