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
    // whoever actually signed in, falling back to the page's own persona
    var who = null;
    try { who = sessionStorage.getItem('aj-user'); } catch (e) {}
    if (chip) chip.textContent = (!who || who === 'Reader') ? 'Sanya' : who;

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

  /* Follow / unfollow a topic.

     The trailing affordance is an icon, not a character: writing textContent
     into it (as this once did) deletes the <svg> and leaves a bare "+" glyph
     sized for an 18px icon — the chip looks broken from the first tap and
     never recovers. Both marks are drawn as SVG and swapped whole. */
  var CHIP_PLUS =
    '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">' +
    '<path d="M8 2v12M2 8h12"/></svg>';
  var CHIP_MINUS =
    '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" aria-hidden="true">' +
    '<circle cx="8" cy="8" r="7.5" stroke-width="1"/><path d="M4.5 8h7" stroke-width="2"/></svg>';

  function paintChip(chip) {
    var on = chip.getAttribute('aria-pressed') === 'true';
    var action = chip.querySelector('.fy-chip__action');
    if (action) action.innerHTML = on ? CHIP_MINUS : CHIP_PLUS;
    chip.setAttribute('aria-label', (on ? 'Unfollow ' : 'Follow ') + chipLabel(chip));
  }

  function chipLabel(chip) {
    var inner = chip.querySelector('.fy-chip__inner');
    return ((inner ? inner.textContent : chip.textContent) || '').trim();
  }

  function interestChips() {
    [].forEach.call(document.querySelectorAll('.fy-chip'), function (chip) {
      if (chip.getAttribute('data-fy-chip')) return;
      chip.setAttribute('data-fy-chip', '1');
      paintChip(chip);                       // normalise whatever the markup shipped
      chip.addEventListener('click', function () {
        chip.setAttribute('aria-pressed', chip.getAttribute('aria-pressed') === 'true' ? 'false' : 'true');
        paintChip(chip);
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
