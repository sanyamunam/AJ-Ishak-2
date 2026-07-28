/* Behaviour for the signed-in home ("For You").
   Three jobs: personalise the shared header, draw the audio waveform,
   and drive the stories rail + interest chips. */
(function () {
  'use strict';

  /* The shared chrome (js/aj-chrome.js) injects the guest header. On this page the
     reader is signed in, so swap the guest chip for the account chip and drop
     the "Sign in" link — matching the Figma navbar. */
  function personaliseHeader() {
    var signin = document.querySelector('.aj-signin');
    if (signin) signin.remove();

    var chip = [].slice.call(document.querySelectorAll('header span')).filter(function (s) {
      return /^Guest$/.test((s.textContent || '').trim());
    })[0];
    if (chip) chip.textContent = 'Sanya';

    var avatar = document.querySelector('header .size-\\[36px\\]');
    if (avatar) {
      avatar.style.backgroundImage = 'none';
      avatar.style.background = '#5944e6';
    }
    return !!chip;
  }

  function waitForHeader() {
    if (personaliseHeader()) return;
    var tries = 0;
    var timer = setInterval(function () {
      if (personaliseHeader() || ++tries > 40) clearInterval(timer);
    }, 100);
  }

  /* 166 one-pixel bars, spaced 2px apart, across the 390px scrubber. */
  function buildWaveform() {
    var wave = document.getElementById('fy-wave');
    if (!wave || wave.childElementCount) return;
    var frag = document.createDocumentFragment();
    for (var i = 0; i < 166; i++) frag.appendChild(document.createElement('i'));
    wave.appendChild(frag);
  }

  /* The stories rail (partials/aj-foryou-stories.html) scrolls natively now
     (see #fy-stories-rail rules in aj-foryou.css) — nothing to wire up. */
  function railControls() {}

  /* The volcano film card uses a real <video> instead of a static <img>;
     play it while hovered/focused, pause and rewind on leave. */
  function filmHoverVideo() {
    var video = document.querySelector('.fy-film__media--video video');
    if (!video) return;
    var card = video.closest('.fy-film');
    var play = function () { video.play().catch(function () {}); };
    var stop = function () { video.pause(); video.currentTime = 0; };
    card.addEventListener('mouseenter', play);
    card.addEventListener('mouseleave', stop);
    card.addEventListener('focusin', play);
    card.addEventListener('focusout', stop);
  }

  function interestChips() {
    [].forEach.call(document.querySelectorAll('.fy-chip'), function (chip) {
      chip.addEventListener('click', function () {
        var on = chip.getAttribute('aria-pressed') === 'true';
        chip.setAttribute('aria-pressed', on ? 'false' : 'true');
        var action = chip.querySelector('.fy-chip__action');
        if (action) action.textContent = on ? '+' : '−';
      });
    });
  }

  /* The "For you" list and the footer (which bundles the newsletter card) are
     pulled verbatim from the homepage export — same markup, same real images —
     instead of being hand-authored twice. Loaded as partials so this page's own
     HTML stays lean; #fy-real-footer already carries footer.font-anybody in the
     static markup so js/aj-chrome.js's hasRealFooter() check skips its own inject. */
  function loadPartial(url, id) {
    var el = document.getElementById(id);
    if (!el) return Promise.resolve();
    return fetch(url + '?v=1')
      .then(function (r) { return r.ok ? r.text() : Promise.reject(r.status); })
      .then(function (html) { el.innerHTML = html; })
      .catch(function (e) { console.warn('[aj-foryou] ' + url + ' failed:', e); });
  }

  function init() {
    waitForHeader();
    buildWaveform();
    interestChips();
    filmHoverVideo();
    loadPartial('partials/aj-foryou-stories.html', 'fy-stories-rail').then(railControls);
    loadPartial('partials/aj-foryou-feed.html', 'fy-feed-main');
    loadPartial('partials/aj-foryou-footer.html', 'fy-real-footer');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
