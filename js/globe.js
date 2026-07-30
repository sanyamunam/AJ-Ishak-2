/* THE GLOBE DESK — interactive prototype (FLAT + GLOBE modes)
   FLAT : clean SVG dotted world map, hover a story -> ease-zoom to region + white dots
   GLOBE: interactive dotted sphere (orthographic), auto-rotate + drag,
          hover a story -> globe spins to bring that region to the front
   Markers: round dot + gently pulsing ring outline (per Figma), colored by category
*/
(function () {
  'use strict';

  var RAD = Math.PI / 180;
  var LON0 = -180, LONSPAN = 360, LATTOP = 80, LATBOT = -58, LATSPAN = LATTOP - LATBOT;
  var VBW = 360, VBH = 196;
  // base scale of the flat map inside its viewport (<1 leaves breathing room top/bottom)
  var MAP_SCALE = 0.86;
  // hover focus: gentle push-in, and how far the focused region eases toward centre
  var HOVER_ZOOM = 1.35, PAN_EASE = 0.62;
  // radius of a land dot on the flat map, in viewBox units (grid spacing is 2.35)
  var DOT_R = 0.66;
  // globe radius as a fraction of the smaller viewport axis — rests zoomed
  // out with generous sky around the sphere; the tour pushes in from here
  var GLOBE_R = 0.36;
  /* The landmass doesn't span the full -180..180 viewBox — it runs roughly -164..180, so
     drawing it raw leaves a wide gap on the left and none on the right. This offset (set
     once from the generated points) recentres the drawn land, and is applied to the dots
     and the markers alike so they stay registered. */
  var LON_FIX = 0;
  function xPct(lon) { return (lon + LON_FIX - LON0) / LONSPAN * 100; }
  function yPct(lat) { return (LATTOP - lat) / LATSPAN * 100; }
  function vx(lon) { return (lon + LON_FIX - LON0) / LONSPAN * VBW; }
  function vy(lat) { return (LATTOP - lat) / LATSPAN * VBH; }

  var CAT_COLORS = {
    'conflict': '#ef304a', 'politics': '#3786f6', 'environment': '#56e171',
    'markets': '#f5c64c', 'climate': '#37c5e0', 'climate change': '#37c5e0',
    'economy': '#f5c64c', 'technology': '#f5c64c', 'business': '#f5c64c', 'society': '#3786f6'
  };
  function catColor(t) { return t ? (CAT_COLORS[t.trim().toLowerCase()] || '#ef304a') : '#ef304a'; }

  var CITY = {
    'tehran': [51.4, 35.7], 'sydney': [151.2, -33.9], 'beijing': [116.4, 39.9],
    'abuja': [7.5, 9.1], 'los angeles': [-118.2, 34.0], 'silicon valley': [-121.9, 37.3],
    'geneva': [6.1, 46.2], 'kyiv': [30.5, 50.5], 'london': [-0.1, 51.5],
    'doha': [51.5, 25.3], 'new york': [-74.0, 40.7], 'moscow': [37.6, 55.7]
  };

  /* Editorial content for the Globe Desk drawer, keyed by story city.
     Prototype copy written to match each headline — the drawer reads like a
     real live-desk brief instead of one templated sentence. */
  var STORY_DESK = {
    'tehran': {
      byline: 'Sana’a',
      updated: '4 min ago',
      dek: 'The exodus of doctors and nurses has left two-thirds of Yemen’s health facilities barely functioning, aid agencies warn, as fighting cuts off entire governorates from care.',
      points: [
        'More than 60 percent of health facilities are now partially or fully out of service',
        'An estimated 4.5 million people have lost access to basic care in the past year',
        'Aid corridors into three northern governorates have been closed since March'
      ],
      ai: 'Yemen’s health system is buckling as medics leave the country faster than they can be replaced. Aid agencies say millions are now beyond the reach of basic care, with three governorates cut off entirely.'
    },
    'sydney': {
      byline: 'Sydney',
      updated: '11 min ago',
      dek: 'Fire fronts stretching hundreds of kilometres have forced mass evacuations along the New South Wales coast after the country’s hottest week on record.',
      points: [
        'More than 30,000 residents evacuated across New South Wales and Victoria',
        'Temperatures peaked at 48.2°C — the highest ever recorded in the region',
        'Smoke plumes visible from space as air quality reaches hazardous levels'
      ],
      ai: 'Record heat has turned Australia’s southeast into a fire corridor, displacing tens of thousands. Crews are prioritising coastal towns as conditions are forecast to worsen through the weekend.'
    },
    'beijing': {
      byline: 'Beijing',
      updated: '26 min ago',
      dek: 'Venture funding and factory output are surging as the world’s second-largest economy reopens, with tech hubs from Shenzhen to Hangzhou racing to hire.',
      points: [
        'Tech sector output up 14 percent quarter-on-quarter since restrictions lifted',
        'Venture capital deals reach a two-year high, led by AI and green energy',
        'Analysts warn the rebound is uneven, with smaller firms still struggling'
      ],
      ai: 'China’s tech economy is rebounding sharply now that restrictions have lifted, with output and venture deals both climbing. Economists caution the recovery is concentrated in the biggest firms.'
    },
    'abuja': {
      byline: 'Abuja',
      updated: '2 min ago',
      dek: 'Record youth turnout and a peaceful count have raised hopes that Africa’s largest democracy is turning a corner.',
      points: [
        'Turnout projected at 41 percent — the highest since 2011, driven by voters under 35',
        'Observer missions report isolated irregularities but no systemic fraud',
        'Markets rally on early results, with the naira firming against the dollar'
      ],
      ai: 'Nigeria’s election is being read as a win for its democracy: youth turnout hit a decade high and observers describe the count as broadly credible. Full results are expected within days.'
    },
    'los angeles': {
      byline: 'Los Angeles',
      updated: '18 min ago',
      dek: 'Tens of thousands marched from Los Angeles to New York in the largest coordinated demonstrations since 2020, pressing for federal police reform.',
      points: [
        'Marches held in more than 40 cities, overwhelmingly peaceful',
        'Organisers demand a federal use-of-force standard and independent oversight',
        'City councils in three states fast-track reform bills this week'
      ],
      ai: 'Coordinated marches across dozens of US cities are pushing police reform back to the top of the national agenda. Early legislative responses suggest the pressure is registering.'
    },
    'silicon valley': {
      byline: 'San Francisco',
      updated: '43 min ago',
      dek: 'A California lab says its new perovskite-silicon cell converts a record share of sunlight into power — and can be printed on existing production lines.',
      points: [
        'Record 34.2 percent efficiency verified by independent testing',
        'Cells can be manufactured on existing silicon production lines',
        'First commercial pilots expected within eighteen months'
      ],
      ai: 'A verified efficiency record for perovskite-silicon solar cells could cut the cost of clean power dramatically — and because the cells print on existing lines, scale-up may come fast.'
    },
    'geneva': {
      byline: 'Geneva',
      updated: '1 hr ago',
      dek: 'The WHO and partners have launched the largest immunisation drive in history, aiming to close the coverage gap left by the pandemic years.',
      points: [
        'Campaign targets 500 million children across 70 countries by 2030',
        'Routine coverage has recovered to 89 percent after the pandemic dip',
        'New heat-stable vaccines remove the cold-chain barrier in remote regions'
      ],
      ai: 'A global vaccination push aims to reach half a billion children by 2030. Coverage is already back above pre-pandemic levels, and heat-stable vaccines are opening up the hardest-to-reach regions.'
    }
  };

  var POLYS = [
    [[-166,68],[-155,71],[-130,70],[-110,72],[-95,73],[-82,73],[-74,67],[-64,60],[-56,52],[-55,47],[-63,45],[-70,43],[-75,37],[-81,31],[-80,25],[-87,30],[-94,29],[-97,21],[-105,21],[-112,30],[-120,34],[-124,42],[-125,48],[-132,55],[-140,59],[-155,60],[-166,68]],
    [[-45,60],[-30,61],[-18,68],[-20,77],[-33,82],[-52,81],[-56,73],[-50,64],[-45,60]],
    [[-78,9],[-68,11],[-58,8],[-50,3],[-42,-3],[-35,-8],[-39,-15],[-43,-23],[-48,-26],[-55,-35],[-63,-41],[-71,-46],[-73,-52],[-69,-53],[-67,-45],[-70,-33],[-71,-20],[-76,-15],[-81,-5],[-80,3],[-78,9]],
    [[-16,14],[-16,20],[-9,31],[-2,36],[10,37],[20,33],[25,32],[32,31],[35,24],[43,12],[51,12],[44,0],[41,-11],[35,-22],[26,-34],[19,-35],[15,-28],[12,-16],[9,-2],[6,5],[-4,4],[-8,8],[-16,14]],
    [[-10,36],[-9,44],[-1,44],[3,43],[10,44],[15,44],[19,40],[24,41],[27,45],[30,50],[30,60],[25,65],[28,70],[20,70],[12,66],[8,60],[5,58],[10,54],[8,50],[2,49],[-2,49],[-5,43],[-10,36]],
    [[26,40],[34,42],[42,40],[48,42],[50,45],[58,44],[55,37],[52,30],[57,25],[62,25],[66,25],[62,32],[70,26],[74,18],[77,8],[80,9],[82,15],[88,22],[90,22],[95,16],[98,10],[100,14],[99,8],[103,10],[106,2],[109,10],[105,18],[109,20],[113,22],[117,23],[121,29],[122,31],[120,37],[126,40],[128,43],[130,48],[135,45],[141,46],[142,52],[137,54],[140,60],[150,60],[158,58],[162,60],[170,66],[180,67],[180,72],[160,72],[135,73],[110,76],[90,76],[75,73],[60,72],[48,68],[42,66],[36,68],[32,66],[30,60],[34,55],[40,52],[38,48],[32,46],[28,44],[26,40]],
    [[114,-22],[122,-18],[130,-12],[137,-12],[142,-11],[143,-15],[146,-19],[150,-24],[153,-28],[150,-34],[146,-38],[140,-38],[135,-34],[129,-32],[122,-34],[116,-33],[113,-27],[114,-22]],
    [[95,4],[104,2],[110,-2],[118,-4],[122,-2],[128,-3],[132,-2],[140,-4],[141,-8],[130,-8],[120,-9],[110,-8],[100,-2],[95,4]],
    [[131,32],[135,34],[140,36],[142,40],[141,44],[138,42],[135,37],[132,34],[131,32]],
    [[-6,50],[-3,51],[-1,54],[-3,58],[-6,58],[-8,55],[-6,50]],
    [[44,-16],[47,-15],[50,-18],[49,-24],[45,-25],[43,-21],[44,-16]],
    [[166,-45],[171,-41],[174,-37],[178,-38],[174,-42],[170,-46],[166,-46],[166,-45]]
  ];
  function inPoly(lon, lat, p) {
    var inside = false, j = p.length - 1;
    for (var i = 0; i < p.length; i++) {
      var xi = p[i][0], yi = p[i][1], xj = p[j][0], yj = p[j][1];
      if (((yi > lat) !== (yj > lat)) && (lon < (xj - xi) * (lat - yi) / (yj - yi) + xi)) inside = !inside;
      j = i;
    }
    return inside;
  }
  function onLand(lon, lat) { for (var i = 0; i < POLYS.length; i++) if (inPoly(lon, lat, POLYS[i])) return true; return false; }

  // finds the Natural Earth ring (whole-country outline) that contains a given point,
  // so a focused story can highlight its entire country rather than a fixed-radius blob
  function findCountryRing(lon, lat) {
    var src = (typeof window !== 'undefined' && window.AJ_WORLD) || null;
    if (!src) return null;
    for (var i = 0; i < src.length; i++) if (inPoly(lon, lat, src[i])) return src[i];
    return null;
  }

  // land points as {lon,lat} + precomputed unit vectors for the globe
  function landPoints() {
    var step = 2.35, pts = [];
    for (var lat = LATTOP; lat >= LATBOT; lat -= step)
      for (var lon = -180; lon <= 180; lon += step)
        if (onLand(lon, lat)) {
          var la = lat * RAD, lo = lon * RAD, cl = Math.cos(la);
          pts.push({ lon: lon, lat: lat, vx: cl * Math.sin(lo), vy: Math.sin(la), vz: cl * Math.cos(lo) });
        }
    return pts;
  }

  var CSS = [
    '.aj-globe-viewport{position:relative;overflow:hidden}',
    '.aj-globe-scene{position:absolute;inset:0;transform:scale(' + MAP_SCALE + ');transition:transform 1s cubic-bezier(.33,1,.68,1);transform-origin:50% 50%;will-change:transform}',
    '.aj-globe-dots{position:absolute;inset:0;width:100%;height:100%;display:block}',
    '.aj-globe-dots circle{transition:fill .45s ease}',
    '.aj-globe-canvas{position:absolute;inset:0;width:100%;height:100%;display:none;cursor:grab;touch-action:none}',
    '.aj-globe-canvas.dragging{cursor:grabbing}',
    '.aj-globe-gmarkers{position:absolute;inset:0;display:none;pointer-events:none}',
    '.aj-globe-markers{position:absolute;inset:0}',

    /* ---- ranked story markers: numbered core + expanding sonar pulses ---- */
    '.aj-gm{position:absolute;transform:translate(-50%,-50%);cursor:pointer}',
    '.aj-gm-pulse{position:absolute;left:50%;top:50%;width:22px;height:22px;border-radius:50%;border:1.5px solid var(--c);transform:translate(-50%,-50%) scale(.6);opacity:0;animation:ajGmPulse 3.2s cubic-bezier(.25,.6,.35,1) infinite;animation-delay:var(--d,0s);pointer-events:none}',
    '.aj-gm-pulse2{animation-delay:calc(var(--d,0s) + 1.6s)}',
    '@keyframes ajGmPulse{0%{transform:translate(-50%,-50%) scale(.55);opacity:.85}65%{opacity:.18}100%{transform:translate(-50%,-50%) scale(3.2);opacity:0}}',
    '.aj-gm-core{position:relative;z-index:3;display:block;width:15px;height:15px;border-radius:50%;background:var(--c);box-shadow:0 0 0 2px rgba(10,10,10,.5),0 0 16px 2px color-mix(in srgb,var(--c) 65%,transparent);transition:transform .35s cubic-bezier(.22,1,.36,1),box-shadow .35s ease}',
    '.aj-gm:hover .aj-gm-core,.aj-gm.is-active .aj-gm-core{transform:scale(1.32);box-shadow:0 0 0 2px #fff,0 0 26px 5px color-mix(in srgb,var(--c) 85%,transparent)}',
    '.aj-globe-scene.zoomed .aj-gm:not(.is-active),.aj-globe-gmarkers.focusing .aj-gm:not(.is-active){opacity:.22!important;filter:saturate(.4)}',
    '.aj-gm.is-active{z-index:6}',
    '.aj-gm.is-active .aj-gm-pulse{animation-duration:1.9s}',
    '.aj-gm-label{position:absolute;left:50%;top:calc(50% + 16px);transform:translateX(-50%) translateY(4px);white-space:nowrap;font:600 10px/1 Arial,sans-serif;letter-spacing:1.1px;color:#fff;background:rgba(10,12,16,.82);border-left:2px solid var(--c);padding:5px 9px;opacity:0;transition:opacity .3s ease,transform .3s cubic-bezier(.22,1,.36,1);pointer-events:none;text-transform:uppercase;z-index:7;backdrop-filter:blur(6px)}',
    '.aj-gm:hover .aj-gm-label,.aj-gm.is-active .aj-gm-label{opacity:1;transform:translateX(-50%) translateY(0)}',

    /* ---- zoom HUD ---- */
    '.aj-globe-hud{position:absolute;left:24px;bottom:22px;display:none;flex-direction:column;gap:8px;z-index:8}',
    '.aj-globe-hud button{width:38px;height:38px;border-radius:50%;border:1px solid rgba(255,255,255,.16);background:rgba(18,20,24,.72);color:#e8edf3;font:600 16px/1 Arial,sans-serif;cursor:pointer;backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;transition:background .2s ease,border-color .2s ease,transform .2s ease;padding:0}',
    '.aj-globe-hud button:hover{background:rgba(48,54,62,.9);border-color:rgba(255,255,255,.42);transform:scale(1.06)}',
    '.aj-globe-list{overflow-y:auto;scrollbar-width:thin;scrollbar-color:#555 transparent}',
    '.aj-globe-list::-webkit-scrollbar{width:6px}',
    '.aj-globe-list::-webkit-scrollbar-thumb{background:#555;border-radius:3px}',
    '.aj-story-row{transition:background-color .25s ease,box-shadow .25s ease;cursor:pointer}',
    '.aj-story-row.is-active,.aj-story-row:hover{background-color:#2b2b2b}',
    '.aj-story-row.is-active{box-shadow:inset 3px 0 0 #fa9000}',
    /* keep dark-section story headlines readable on hover (defeat the global darken rule) */
    '.aj-story-row a[href="aljazeera-article.html"]:hover :is(p,h1,h2,h3,h4){color:#fff}',
    '@media (prefers-reduced-motion: reduce){.aj-gm-pulse{animation:none}.aj-globe-scene{transition:none}.aj-globe-dots circle{transition:none}}'
  ].join('\n');

  function init() {
    var secs = [].slice.call(document.querySelectorAll('section'));
    var sec = secs.filter(function (s) { return /THE GLOBE DESK/i.test(s.textContent); })[0];
    if (!sec || sec.getAttribute('data-globe')) return;
    sec.setAttribute('data-globe', '1');
    var st = document.createElement('style'); st.id = 'aj-globe-style'; st.textContent = CSS;
    document.head.appendChild(st);

    var root = sec.querySelector('div.relative.mx-auto') || sec.firstElementChild;
    var leftPanel = root.children[0], rightPanel = root.children[1];

    /* keep the story panel flush with the window's right edge, even when the
       mx-auto max-w-[1920px] container stops short of it on wide screens */
    /* below 1024px css/aj-responsive.css stacks the panels — the desktop
       pin/offset math no longer applies */
    function isStacked() { return window.innerWidth <= 1023; }
    function pinPanelRight() {
      if (isStacked()) { rightPanel.style.right = ''; return; }
      rightPanel.style.right = '0px';
      var r = rightPanel.getBoundingClientRect();
      var scale = rightPanel.offsetWidth ? r.width / rightPanel.offsetWidth : 1;
      var gap = document.documentElement.clientWidth - r.right;
      if (Math.abs(gap) > 0.5) rightPanel.style.right = (-gap / (scale || 1)) + 'px';
    }
    pinPanelRight();

    /* the map viewport runs the full container width, so half of it sits behind
       the story panel — offset the map to sit centred in the space actually visible */
    var mapDX = 0;
    function computeMapOffset() {
      if (isStacked()) { mapDX = 0; return; }
      var wr = wrap.getBoundingClientRect(), pr = rightPanel.getBoundingClientRect();
      var scale = wrap.offsetWidth ? wr.width / wrap.offsetWidth : 1;
      var dx = (pr.left - wr.right) / 2 / (scale || 1);
      mapDX = isFinite(dx) ? dx : 0;
    }
    function baseTransform() {
      return 'translateX(' + mapDX.toFixed(2) + 'px) scale(' + MAP_SCALE + ')';
    }
    /* hover focus: a gentle push-in that eases the region toward the visible centre,
       rather than a hard zoom anchored on the marker */
    function focusTransform(xp, yp) {
      var W = scene.offsetWidth, H = scene.offsetHeight;
      var s = MAP_SCALE * HOVER_ZOOM;
      var tx = mapDX - PAN_EASE * s * (xp / 100 * W - W / 2);
      var ty = -PAN_EASE * s * (yp / 100 * H - H / 2);
      return 'translate(' + tx.toFixed(2) + 'px,' + ty.toFixed(2) + 'px) scale(' + s + ')';
    }

    var mapImg = null, best = 0;
    [].slice.call(leftPanel.querySelectorAll('img')).forEach(function (im) {
      var r = im.getBoundingClientRect(); if (r.width * r.height > best) { best = r.width * r.height; mapImg = im; }
    });
    var wrap = mapImg.parentElement;
    wrap.style.height = wrap.offsetHeight + 'px';
    wrap.classList.add('aj-globe-viewport');
    mapImg.style.opacity = '0';
    computeMapOffset();

    // footer location label (bottom of map) — updates to the hovered story's location
    var footerLoc = [].slice.call(leftPanel.querySelectorAll('p')).filter(function (p) { return /◈/.test(p.textContent); })[0] || null;
    var footerOrig = footerLoc ? footerLoc.textContent : '';

    /* ---- layout rework: the globe owns the full panel height ----
       The export caps the viewport at 641px and spends ~160px on an
       instructional footer ("Drag to rotate…"). The globe is the hero:
       the footer goes, and the viewport takes every pixel under the
       header row. Marker pulses + the grab cursor carry the affordance. */
    var headRow = leftPanel.children[0] || null;
    var instrBlock = [].slice.call(leftPanel.children).filter(function (c) {
      return c !== wrap && c !== headRow && /drag to rotate/i.test(c.textContent || '');
    })[0] || null;
    if (instrBlock) instrBlock.style.display = 'none';
    function sizeViewport() {
      if (isStacked()) { wrap.style.height = ''; return; }   // mobile css owns the height
      var gap = parseFloat(getComputedStyle(leftPanel).rowGap) || 0;
      var hh = headRow ? headRow.offsetHeight : 0;
      var target = root.clientHeight - hh - gap;
      if (target > 300) wrap.style.height = target + 'px';
    }
    sizeViewport();

    var PTS = landPoints();
    (function centreLand() {
      var lo = Infinity, hi = -Infinity;
      for (var i = 0; i < PTS.length; i++) {
        if (PTS[i].lon < lo) lo = PTS[i].lon;
        if (PTS[i].lon > hi) hi = PTS[i].lon;
      }
      if (isFinite(lo) && isFinite(hi)) LON_FIX = -((lo + hi) / 2);
    })();

    /* ---------- FLAT scene ---------- */
    var scene = document.createElement('div'); scene.className = 'aj-globe-scene';
    var dotsSvg = '';
    PTS.forEach(function (p) { dotsSvg += '<circle cx="' + vx(p.lon).toFixed(1) + '" cy="' + vy(p.lat).toFixed(1) + '" r="' + DOT_R + '"/>'; });
    scene.innerHTML = '<svg class="aj-globe-dots" viewBox="0 0 ' + VBW + ' ' + VBH + '" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg"><g fill="#4a4a4a">' + dotsSvg + '</g></svg>';
    var flatMarkerLayer = document.createElement('div'); flatMarkerLayer.className = 'aj-globe-markers';
    scene.appendChild(flatMarkerLayer);
    wrap.appendChild(scene);
    var flatCircles = [].slice.call(scene.querySelectorAll('.aj-globe-dots circle'));
    var whitened = [];
    function whitenFlat(lon, lat) {
      clearFlatWhite();
      var ring = findCountryRing(lon, lat);
      if (ring) {
        for (var i = 0; i < PTS.length; i++) { if (inPoly(PTS[i].lon, PTS[i].lat, ring)) { flatCircles[i].setAttribute('fill', '#fff'); whitened.push(i); } }
        if (whitened.length) return;
      }
      // fallback (no country match, e.g. small island) — light radius around the point
      var cl = Math.cos(lat * RAD), R = 15;
      for (var j = 0; j < PTS.length; j++) { var dx = (PTS[j].lon - lon) * cl, dy = PTS[j].lat - lat; if (dx * dx + dy * dy < R * R) { flatCircles[j].setAttribute('fill', '#fff'); whitened.push(j); } }
    }
    function clearFlatWhite() { whitened.forEach(function (i) { flatCircles[i].setAttribute('fill', '#4a4a4a'); }); whitened = []; }

    /* ---------- GLOBE scene ---------- */
    var canvas = document.createElement('canvas'); canvas.className = 'aj-globe-canvas';
    var gMarkerLayer = document.createElement('div'); gMarkerLayer.className = 'aj-globe-gmarkers';
    wrap.appendChild(canvas); wrap.appendChild(gMarkerLayer);
    var ctx = canvas.getContext('2d');
    var yaw = 0.5, pitch = -0.35, tYaw = null, tPitch = null, dragging = false, lastX = 0, lastY = 0;
    var vYaw = 0, vPitch = 0;              // inertial spin after a released drag
    var uZoom = 1, tUZoom = 1;             // user zoom (HUD / dblclick / pinch), eased
    var focusEntry = null, raf = null, DPR = Math.min(window.devicePixelRatio || 1, 2), gZoom = 1;
    var REDUCE_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ---- zoom HUD ---- */
    var hud = document.createElement('div');
    hud.className = 'aj-globe-hud';
    hud.innerHTML = '<button type="button" data-z="in" aria-label="Zoom in">+</button>' +
                    '<button type="button" data-z="out" aria-label="Zoom out">−</button>' +
                    '<button type="button" data-z="reset" aria-label="Reset view">⟲</button>';
    wrap.appendChild(hud);
    hud.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      noteActivity();
      if (b.getAttribute('data-z') === 'in') tUZoom = Math.min(2.4, tUZoom * 1.35);
      else if (b.getAttribute('data-z') === 'out') tUZoom = Math.max(0.8, tUZoom / 1.35);
      else { tUZoom = 1; vYaw = 0; vPitch = 0; tYaw = 0.5; tPitch = -0.35; }
    });
    var _ringFor = null, _ringCache = null; // avoid re-scanning every country ring every frame
    function focusCountryRing(entry) {
      if (entry !== _ringFor) { _ringFor = entry; _ringCache = findCountryRing(entry.lon, entry.lat); }
      return _ringCache;
    }

    function sizeCanvas() {
      var w = wrap.clientWidth, h = wrap.clientHeight;
      canvas.width = w * DPR; canvas.height = h * DPR;
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      particles = null;
    }

    /* ---------- background particle field ---------- */
    var particles = null;
    function initParticles(w, h) {
      var n = Math.round(Math.max(50, Math.min(140, w * h / 7000)));
      particles = [];
      for (var i = 0; i < n; i++) {
        particles.push({
          x: Math.random() * w, y: Math.random() * h,
          r: 0.35 + Math.random() * 1.25,
          vx: (Math.random() - 0.5) * 0.17,
          vy: -0.04 - Math.random() * 0.13,
          a: 0.1 + Math.random() * 0.38,
          tw: Math.random() * 6.2832,
          tws: 0.005 + Math.random() * 0.019
        });
      }
    }
    function drawParticles(w, h) {
      if (!particles) initParticles(w, h);
      for (var i = 0; i < particles.length; i++) {
        var p = particles[i];
        p.x += p.vx; p.y += p.vy; p.tw += p.tws;
        if (p.x < -4) p.x = w + 4; else if (p.x > w + 4) p.x = -4;
        if (p.y < -4) p.y = h + 4; else if (p.y > h + 4) p.y = -4;
        var a = p.a * (0.55 + 0.45 * Math.sin(p.tw));
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.2832);
        ctx.fillStyle = 'rgba(186,204,226,' + a.toFixed(3) + ')';
        ctx.fill();
      }
    }

    /* ---------- atmospheric aura behind the sphere ---------- */
    function drawAura(cx, cy, R) {
      var g = ctx.createRadialGradient(cx, cy, R * 0.9, cx, cy, R * 1.42);
      g.addColorStop(0, 'rgba(70,140,190,.085)');
      g.addColorStop(.3, 'rgba(70,150,190,.04)');
      g.addColorStop(1, 'rgba(70,140,190,0)');
      ctx.beginPath(); ctx.arc(cx, cy, R * 1.42, 0, 6.2832);
      ctx.fillStyle = g; ctx.fill();
    }
    /* Rotation constants are hoisted per frame and the result reuses one object —
       this runs ~10k times a frame, so per-call trig and allocation are not free. */
    var _cy1 = 1, _sy1 = 0, _cp = 1, _sp = 0;
    var _q = { x: 0, y: 0, z: 0 };
    function updateRot() {
      _cy1 = Math.cos(yaw); _sy1 = Math.sin(yaw);
      _cp = Math.cos(pitch); _sp = Math.sin(pitch);
    }
    function rot(p) {
      var x1 = p.vx * _cy1 + p.vz * _sy1, z1 = -p.vx * _sy1 + p.vz * _cy1, y1 = p.vy;
      _q.x = x1; _q.y = y1 * _cp - z1 * _sp; _q.z = y1 * _sp + z1 * _cp;
      return _q;
    }

    /* ---------- vector globe (per Figma 37010:4162) ----------
       Coastlines and a lat/long graticule stroked onto the sphere rather than a dot
       field. Each path is walked in lon/lat, projected, and broken at the terminator
       so nothing draws across the back of the globe. */
    var _v = { vx: 0, vy: 0, vz: 0 }, _p = { x: 0, y: 0, z: 0 };
    function project(lon, lat, cx, cy, R) {
      var la = lat * RAD, lo = lon * RAD, cl = Math.cos(la);
      _v.vx = cl * Math.sin(lo); _v.vy = Math.sin(la); _v.vz = cl * Math.cos(lo);
      var q = rot(_v);
      _p.x = cx + q.x * R; _p.y = cy - q.y * R; _p.z = q.z;
      return _p;
    }

    // appends to the current path — callers batch many rings into a single stroke
    function pathGeo(points, closed, cx, cy, R) {
      var open = false, n = points.length, last = closed ? n : n - 1;
      for (var i = 0; i <= last; i++) {
        var a = points[i % n], b = points[(i + 1) % n];
        if (i === last && !closed) break;
        /* Subdivide so the edge follows the sphere's curvature rather than cutting a
           chord. Scaled to edge length: real coastline data is already dense and only
           needs one step, while the coarse fallback polygons need many. */
        var seg = Math.min(10, Math.max(1, Math.ceil(Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1])) / 3)));
        for (var s = 0; s < seg; s++) {
          var t = s / seg;
          var p = project(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, cx, cy, R);
          if (p.z <= 0.015) { open = false; continue; }
          if (!open) { ctx.moveTo(p.x, p.y); open = true; } else ctx.lineTo(p.x, p.y);
        }
      }
    }

    // graticule geometry never changes — build the lon/lat lists once
    var GRAT = (function () {
      var grid = [], eq = [], lat, lon, pts;
      for (lon = -180; lon < 180; lon += 30) {
        pts = []; for (lat = -90; lat <= 90; lat += 10) pts.push([lon, lat]);
        grid.push(pts);
      }
      for (lat = -60; lat <= 60; lat += 30) {
        if (lat === 0) continue;
        pts = []; for (lon = -180; lon <= 180; lon += 10) pts.push([lon, lat]);
        grid.push(pts);
      }
      for (lon = -180; lon <= 180; lon += 10) eq.push([lon, 0]);
      return { grid: grid, eq: eq };
    })();

    function drawGraticule(cx, cy, R) {
      ctx.beginPath();
      for (var i = 0; i < GRAT.grid.length; i++) pathGeo(GRAT.grid[i], false, cx, cy, R);
      ctx.strokeStyle = 'rgba(255,255,255,.055)'; ctx.lineWidth = 1; ctx.stroke();

      ctx.beginPath();
      pathGeo(GRAT.eq, false, cx, cy, R);
      ctx.strokeStyle = 'rgba(255,255,255,.085)'; ctx.lineWidth = 1; ctx.stroke();
    }

    /* Natural Earth 110m country rings (js/world.js) — coastlines plus internal borders.
       Rings arrive already closed (first point repeated), so they're stroked open. */
    var WORLD = (typeof window !== 'undefined' && window.AJ_WORLD) || null;
    function drawCoastlines(cx, cy, R) {
      var src = WORLD || POLYS, closed = !WORLD;
      ctx.beginPath();
      for (var i = 0; i < src.length; i++) pathGeo(src[i], closed, cx, cy, R);
      ctx.strokeStyle = 'rgba(196,204,214,.42)';
      ctx.lineWidth = 1; ctx.stroke();
    }
    function draw(now) {
      now = now || performance.now();
      var w = wrap.clientWidth, h = wrap.clientHeight;
      // centred in the space left of the story panel, sized to leave breathing room
      var cx = w / 2 + mapDX, cy = h / 2, R = Math.min(w + 2 * mapDX, h) * GLOBE_R * gZoom * uZoom;
      // the sphere silhouette must never clip top or bottom, whatever the zoom
      R = Math.min(R, h / 2 - 16);
      updateRot();
      ctx.clearRect(0, 0, w, h);
      drawParticles(w, h);
      drawAura(cx, cy, R);
      // sphere body — near black, per the Figma
      var g = ctx.createRadialGradient(cx - R * 0.3, cy - R * 0.35, R * 0.15, cx, cy, R);
      g.addColorStop(0, '#1c1c1c'); g.addColorStop(.7, '#141414'); g.addColorStop(1, '#0c0c0c');
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, 6.2832); ctx.fillStyle = g; ctx.fill();

      ctx.save();
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, 6.2832); ctx.clip();
      drawGraticule(cx, cy, R);
      drawCoastlines(cx, cy, R);

      // refined dot-matrix landmass: a whisper of texture — small, faint,
      // cool-toned — depth cueing without competing with markers
      for (var di = 0; di < PTS.length; di++) {
        var dq = rot(PTS[di]);
        if (dq.z <= 0.02) continue;
        var ds = 0.7 + 0.7 * dq.z;
        ctx.fillStyle = 'rgba(198,212,226,' + (0.03 + 0.11 * dq.z).toFixed(3) + ')';
        ctx.fillRect(cx + dq.x * R - ds / 2, cy - dq.y * R - ds / 2, ds, ds);
      }

      // the focused story's whole country lifts out of the outline work,
      // with a soft light band sweeping across the fill (shimmer)
      if (focusEntry) {
        var countryRing = focusCountryRing(focusEntry);
        if (countryRing) {
          ctx.beginPath();
          pathGeo(countryRing, false, cx, cy, R);
          if (REDUCE_MOTION) {
            ctx.fillStyle = 'rgba(255,255,255,.22)';
          } else {
            var st = (performance.now() % 2800) / 2800;
            var sx = cx - R * 1.5 + 3 * R * st;
            var shim = ctx.createLinearGradient(sx - R * 0.55, cy - R * 0.55, sx + R * 0.55, cy + R * 0.55);
            shim.addColorStop(0, 'rgba(255,255,255,.20)');
            shim.addColorStop(0.5, 'rgba(255,255,255,.36)');
            shim.addColorStop(1, 'rgba(255,255,255,.20)');
            ctx.fillStyle = shim;
          }
          ctx.fill('nonzero');
          ctx.strokeStyle = 'rgba(255,255,255,.9)';
          ctx.lineWidth = 1.4;
          ctx.stroke();
        } else {
          var la0 = focusEntry.lat * RAD, lo0 = focusEntry.lon * RAD, cl0 = Math.cos(la0);
          var fv = { x: cl0 * Math.sin(lo0), y: Math.sin(la0), z: cl0 * Math.cos(lo0) };
          for (var i = 0; i < PTS.length; i++) {
            var d = PTS[i].vx * fv.x + PTS[i].vy * fv.y + PTS[i].vz * fv.z;
            if (d <= 0.94) continue;
            var q = rot(PTS[i]); if (q.z <= 0.02) continue;
            ctx.beginPath();
            ctx.arc(cx + q.x * R, cy - q.y * R, 0.6 + 0.6 * q.z, 0, 6.2832);
            ctx.fillStyle = 'rgba(255,255,255,' + (0.25 + 0.7 * q.z).toFixed(3) + ')';
            ctx.fill();
          }
        }
      }
      // terminator: light falls from the upper left, night creeps in lower right
      var sh = ctx.createLinearGradient(cx - R, cy - R, cx + R * 0.85, cy + R * 0.85);
      sh.addColorStop(0, 'rgba(0,0,0,0)'); sh.addColorStop(.6, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(0,0,0,.4)');
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, 6.2832); ctx.fillStyle = sh; ctx.fill();
      // soft specular kiss on the lit side
      var sp = ctx.createRadialGradient(cx - R * 0.45, cy - R * 0.5, 0, cx - R * 0.45, cy - R * 0.5, R * 0.55);
      sp.addColorStop(0, 'rgba(255,255,255,.055)'); sp.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, 6.2832); ctx.fillStyle = sp; ctx.fill();
      ctx.restore();

      // rim + atmosphere edge
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, 6.2832);
      ctx.strokeStyle = 'rgba(160,190,215,.26)'; ctx.lineWidth = 1; ctx.stroke();
      ctx.beginPath(); ctx.arc(cx, cy, R + 1.6, 0, 6.2832);
      ctx.strokeStyle = 'rgba(96,152,200,.1)'; ctx.lineWidth = 3; ctx.stroke();

      // markers: positioned, faded and scaled by depth
      markers.forEach(function (e) {
        var q = rot(e.v3);
        if (q.z <= 0.03) { e.globeMk.style.display = 'none'; return; }
        e.globeMk.style.display = 'block';
        e.globeMk.style.left = (cx + q.x * R) + 'px';
        e.globeMk.style.top = (cy - q.y * R) + 'px';
        e.globeMk.style.opacity = (0.3 + 0.7 * q.z).toFixed(3);
        e.globeMk.style.transform = 'translate(-50%,-50%) scale(' + (0.72 + 0.36 * q.z).toFixed(3) + ')';
      });
    }
    var _prevT = 0;
    function tick(now) {
      if (mode !== 'globe') { raf = null; return; }
      // drawing while the globe is off-screen forces continuous style recalcs
      // on a very large DOM, starving the whole page's frame budget — park the
      // loop and let the visibility poll below restart it
      var cr = canvas.getBoundingClientRect();
      if (!cr.width || cr.bottom < 0 || cr.top > window.innerHeight) { raf = null; _prevT = 0; return; }
      now = now || performance.now();
      var dt = _prevT ? Math.min(3, (now - _prevT) / 16.67) : 1;
      _prevT = now;
      var e12 = 1 - Math.pow(0.88, dt);   // frame-rate-independent 0.12-per-frame ease
      if (tYaw !== null) {
        // shortest way round, immune to JS's signed modulo
        var dy = Math.atan2(Math.sin(tYaw - yaw), Math.cos(tYaw - yaw));
        yaw += dy * e12; pitch += (tPitch - pitch) * e12;
        if (Math.abs(dy) < 0.002 && Math.abs(tPitch - pitch) < 0.002) { tYaw = null; tPitch = null; }
      } else if (!dragging) {
        // released-drag momentum, decaying to the ambient rotation
        yaw += vYaw * dt; pitch += vPitch * dt;
        pitch = Math.max(-1.2, Math.min(1.2, pitch));
        var fr = Math.pow(0.93, dt);
        vYaw *= fr; vPitch *= fr;
        if (Math.abs(vYaw) < 0.00004) vYaw = 0;
        if (Math.abs(vPitch) < 0.00004) vPitch = 0;
        if (!focusEntry && !vYaw && !REDUCE_MOTION) yaw += 0.0016 * dt;
      }
      gZoom += ((focusEntry ? 1.35 : 1) - gZoom) * e12;   // pan+zoom into the focused region
      uZoom += (tUZoom - uZoom) * (1 - Math.pow(0.85, dt));
      draw(now);
      raf = requestAnimationFrame(tick);
    }
    function startGlobe() { sizeCanvas(); if (!raf) tick(); }
    // cheap poll (timers still fire between long frames) that restarts the
    // parked loop once the globe scrolls back into view
    setInterval(function () {
      if (mode !== 'globe' || raf) return;
      var cr = canvas.getBoundingClientRect();
      if (cr.width && cr.bottom > 0 && cr.top < window.innerHeight) { raf = requestAnimationFrame(tick); }
    }, 400);

    /* ---- drag with momentum (mouse + touch via pointer events) ---- */
    var ptrId = null, histX = 0, histY = 0, histT = 0;
    canvas.addEventListener('pointerdown', function (e) {
      noteActivity();
      if (inDetail) closeDetail();
      dragging = true; ptrId = e.pointerId;
      try { canvas.setPointerCapture(ptrId); } catch (err) {}
      focusEntry = null; tYaw = null; vYaw = 0; vPitch = 0;
      gMarkerLayer.classList.remove('focusing'); clearActive();
      lastX = e.clientX; lastY = e.clientY;
      histX = e.clientX; histY = e.clientY; histT = performance.now();
      canvas.classList.add('dragging');
    });
    canvas.addEventListener('pointermove', function (e) {
      if (!dragging || e.pointerId !== ptrId) return;
      var k = 0.0055 / uZoom;   // zoomed in = finer control
      yaw += (e.clientX - lastX) * k; pitch += (e.clientY - lastY) * k;
      pitch = Math.max(-1.2, Math.min(1.2, pitch));
      lastX = e.clientX; lastY = e.clientY;
      var nowT = performance.now(), dtm = Math.max(1, nowT - histT);
      vYaw = (e.clientX - histX) * k * (16.67 / dtm);
      vPitch = (e.clientY - histY) * k * (16.67 / dtm);
      histX = e.clientX; histY = e.clientY; histT = nowT;
    });
    function endDrag(e) {
      if (e.pointerId !== ptrId) return;
      dragging = false; ptrId = null;
      canvas.classList.remove('dragging');
      // pointer rested before release: no throw
      if (performance.now() - histT > 90) { vYaw = 0; vPitch = 0; }
    }
    canvas.addEventListener('pointerup', endDrag);
    canvas.addEventListener('pointercancel', endDrag);

    /* No wheel zoom. The globe fills most of the viewport, so capturing the
       wheel over it meant the page stopped scrolling wherever the pointer
       happened to be — scrolling past the globe is the far more common intent.
       Zoom stays available on the HUD's +/- buttons, by double-click, and by
       pinch on touch. */
    canvas.addEventListener('dblclick', function () {
      noteActivity();
      tUZoom = tUZoom > 1.25 ? 1 : 1.7;
    });

    /* ---------- stories + markers ---------- */
    var num = [].slice.call(rightPanel.querySelectorAll('*')).filter(function (e) { return e.children.length === 0 && /^\d{2}$/.test(e.textContent.trim()); });
    var list = num.length ? num[0].parentElement : null;
    while (list && list.parentElement !== rightPanel && list.children.length < 3) list = list.parentElement;
    if (list) { list.classList.add('aj-globe-list'); list.style.maxHeight = '100%'; list.style.width = '100%'; }

    var markers = [];
    /* Where the pointer was when the current focus began. The focus pans the map, so a
       focused marker slides out from under the cursor — watching for its mouseleave would
       reset, restore, re-enter and oscillate. Measuring how far the pointer itself has
       travelled is stable. */
    var activePoint = null, ptrX = 0, ptrY = 0, inDetail = false;
    window.addEventListener('mousemove', function (e) { ptrX = e.clientX; ptrY = e.clientY; });
    var LEAVE_RADIUS = 46;

    // shared by hover-activate, the ambient tour and the article detail view, so
    // every path applies the same zoom-in + whole-country highlight
    function focusOn(entry, fromTour) {
      if (!fromTour) noteActivity();
      clearActive();
      activePoint = fromTour ? null : { x: ptrX, y: ptrY };
      entry.row.classList.add('is-active'); entry.flatMk.classList.add('is-active'); entry.globeMk.classList.add('is-active');
      if (footerLoc && entry.loc) footerLoc.textContent = entry.loc;
      if (mode === 'flat') {
        scene.classList.add('zoomed');
        scene.style.transformOrigin = '50% 50%';
        scene.style.transform = focusTransform(entry.x, entry.y);
        whitenFlat(entry.lon, entry.lat);
      } else {
        focusEntry = entry; gMarkerLayer.classList.add('focusing');
        tYaw = -entry.lon * RAD; tPitch = entry.lat * RAD;
      }
      if (fromTour) revealRow(entry.row);
    }

    /* ---------- ambient story tour ----------
       Left alone, the globe glides from story to story in rank order — the
       section reads as a guided world tour. Any interaction (drag, zoom,
       hover) hands control back to the user; the tour resumes after a
       stretch of quiet. */
    var tourOn = !REDUCE_MOTION, tourIdx = -1, tourTimer = null, idleTimer = null;
    var tourSeen = false;   // the globe rests zoomed-out for a beat before the first fly-in
    function stopTour() {
      tourOn = false;
      if (tourTimer) { clearTimeout(tourTimer); tourTimer = null; }
    }
    function noteActivity() {
      stopTour();
      if (idleTimer) clearTimeout(idleTimer);
      if (REDUCE_MOTION) return;
      idleTimer = setTimeout(function () {
        if (mode === 'globe' && !inDetail && !dragging) { tourOn = true; tourStep(); }
      }, 14000);
    }
    function tourStep() {
      if (!tourOn || mode !== 'globe' || inDetail) return;
      var cr = canvas.getBoundingClientRect();
      var vis = cr.width && cr.bottom > 0 && cr.top < window.innerHeight;
      // first sighting: hold the wide resting view for a few seconds,
      // then the tour zooms in and starts moving between countries
      if (vis && !tourSeen) {
        tourSeen = true;
        tourTimer = setTimeout(tourStep, 3200);
        return;
      }
      if (vis && markers.length) {
        tourIdx = (tourIdx + 1) % markers.length;
        focusOn(markers[tourIdx], true);
      }
      tourTimer = setTimeout(tourStep, vis ? 5200 : 1200);
    }

    function mkEl(color, label, rank) {
      var m = document.createElement('div'); m.className = 'aj-gm';
      m.style.setProperty('--c', color);
      m.style.setProperty('--d', (rank * 0.28).toFixed(2) + 's');   // staggered sonar
      m.innerHTML = '<span class="aj-gm-pulse"></span><span class="aj-gm-pulse aj-gm-pulse2"></span>' +
        '<span class="aj-gm-core"></span>' +
        '<span class="aj-gm-label">' + label + '</span>';
      return m;
    }

    /* scroll the sidebar list (and only the list) until the row is visible */
    function revealRow(row) {
      if (!list) return;
      var lr = list.getBoundingClientRect(), rr = row.getBoundingClientRect();
      if (rr.top >= lr.top && rr.bottom <= lr.bottom) return;
      var target = list.scrollTop + (rr.top - lr.top) - (lr.height - rr.height) / 2;
      if (list.scrollTo) list.scrollTo({ top: target, behavior: 'smooth' });
      else list.scrollTop = target;
    }
    function clearActive() { markers.forEach(function (e) { e.flatMk.classList.remove('is-active'); e.globeMk.classList.remove('is-active'); e.row.classList.remove('is-active'); }); }

    num.forEach(function (n) {
      var row = n; for (var i = 0; i < 6; i++) { row = row.parentElement; if (row.querySelector('a[href="aljazeera-article.html"]')) break; }
      if (!row) return;
      row.classList.add('aj-story-row');
      var link = row.querySelector('a[href="aljazeera-article.html"]'); if (link) link.classList.add('aj-dark-card');
      var ps = [].slice.call(row.querySelectorAll('p')).map(function (p) { return p.textContent.trim(); });
      var catTxt = ps.filter(function (t) { return /^(conflict|politics|environment|markets|climate|climate change|economy|technology|business|society)$/i.test(t); })[0] || '';
      var locTxt = ps.filter(function (t) { return /◈/.test(t); })[0] || '';
      var city = locTxt.replace(/◈/, '').split(',')[0].trim().toLowerCase();
      var coord = CITY[city]; if (!coord) return;
      var color = catColor(catTxt), label = (locTxt.replace(/◈/, '').trim() || catTxt);
      var rank = markers.length;
      var flatMk = mkEl(color, label, rank); flatMk.style.left = xPct(coord[0]) + '%'; flatMk.style.top = yPct(coord[1]) + '%'; flatMarkerLayer.appendChild(flatMk);
      var globeMk = mkEl(color, label, rank); globeMk.style.pointerEvents = 'auto'; gMarkerLayer.appendChild(globeMk);
      var headline = (link && link.querySelector('p') ? link.querySelector('p') : (link || row)).textContent.trim();
      var region = ps.filter(function (t) { return /^(europe|asia|africa|north america|south america|middle east|oceania|latin america)$/i.test(t); })[0] || '';
      var live = ps.some(function (t) { return /^live$/i.test(t); });
      // per-story desk brief; a generated fallback covers unmapped cities
      var info = STORY_DESK[city] || {
        byline: locTxt.replace(/◈/, '').split(',')[0].trim() || 'The Globe Desk',
        updated: 'just now',
        dek: headline + '. Al Jazeera correspondents are following developments' + (region ? (' across ' + region) : '') + ' — here is the situation right now, drawn from our live reporting.',
        points: null,
        ai: headline + ' — our correspondents are gathering verified reporting on this story right now.'
      };
      var summary = info.ai;
      var la3 = coord[1] * RAD, lo3 = coord[0] * RAD, cl3 = Math.cos(la3);
      var entry = { row: row, flatMk: flatMk, globeMk: globeMk, x: xPct(coord[0]), y: yPct(coord[1]), lon: coord[0], lat: coord[1], v3: { vx: cl3 * Math.sin(lo3), vy: Math.sin(la3), vz: cl3 * Math.cos(lo3) }, loc: locTxt, color: color, cat: catTxt, region: region, headline: headline, live: live, summary: summary, info: info };
      markers.push(entry);
      if (link) link.addEventListener('click', function (ev) { ev.preventDefault(); openDetail(entry); });

      function activate() { focusOn(entry); }
      row.addEventListener('mouseenter', activate);
      flatMk.addEventListener('mouseenter', function () { activate(); revealRow(row); });
      globeMk.addEventListener('mouseenter', function () { activate(); revealRow(row); });
      flatMk.addEventListener('click', function (ev) { ev.stopPropagation(); openDetail(entry); });
      globeMk.addEventListener('click', function (ev) { ev.stopPropagation(); openDetail(entry); });
    });

    /* ---------- article detail swap (click a story -> detail view with back) ---------- */
    var detail = document.createElement('div');
    detail.className = 'aj-gd-detail';
    // the drawer overlays the panel, so the panel must be its containing block
    if (getComputedStyle(rightPanel).position === 'static') rightPanel.style.position = 'relative';
    rightPanel.appendChild(detail);
    (function () {
      var s = document.createElement('style'); s.id = 'aj-gd-detail-style';
      s.textContent = [
        /* the drawer is an overlay that glides in over the story list — a slide
           +fade choreography instead of an instant swap. Closing simply reverses
           the same transition, so both directions feel like one gesture. */
        '.aj-gd-detail{position:absolute;inset:0;z-index:3;display:flex;flex-direction:column;gap:0;padding:24px 0 0;box-sizing:border-box;color:#fff;background:#202020;overflow-y:auto;-webkit-overflow-scrolling:touch;opacity:0;transform:translateX(56px);pointer-events:none;visibility:hidden;transition:opacity .4s ease,transform .6s cubic-bezier(.22,1,.36,1),visibility 0s linear .4s}',
        '.aj-globe-detailing .aj-gd-detail{opacity:1;transform:none;pointer-events:auto;visibility:visible;transition:opacity .45s ease .06s,transform .65s cubic-bezier(.22,1,.36,1) .06s,visibility 0s}',
        '.aj-globe-list{transition:opacity .3s ease,transform .5s cubic-bezier(.22,1,.36,1)}',
        '.aj-globe-detailing .aj-globe-list{opacity:0;transform:translateX(-30px);pointer-events:none}',
        '.aj-gd-back{align-self:flex-start;display:inline-flex;align-items:center;gap:10px;margin:0 32px;font:700 11px/1 inherit;letter-spacing:2.4px;text-transform:uppercase;color:rgba(255,255,255,.62);cursor:pointer;background:none;border:0;border-bottom:1px solid rgba(255,255,255,.14);padding:0 0 16px;width:calc(100% - 64px);text-align:left;transition:color .2s ease}',
        '.aj-gd-back:hover{color:#fff}',
        '.aj-gd-handle{display:none}',
        /* margin-top:auto here + on .aj-gd-ai splits the panel’s spare height
           evenly above and below the brief — balanced, never bottom-heavy */
        '.aj-gd-kicker{display:flex;align-items:center;gap:10px;margin:auto 32px 0;padding-top:22px;font:700 11.5px/1 inherit;letter-spacing:1.6px;text-transform:uppercase}',
        '.aj-gd-kicker .dot{width:8px;height:8px;border-radius:50%;background:var(--c,#ef304a)}',
        '.aj-gd-kicker .live{background:#e3b23c;color:#111;padding:3px 7px;font-weight:800}',
        '.aj-gd-kicker .reg{color:rgba(255,255,255,.55);font-weight:500}',
        '.aj-gd-head{font-family:Lora,Georgia,serif;font-size:26px;line-height:1.28;font-weight:600;margin:10px 32px 0}',
        /* byline strip: correspondent desk on the left, freshness on the right */
        '.aj-gd-byline{display:flex;align-items:baseline;gap:12px;margin:16px 32px 0;padding-bottom:14px;border-bottom:1px solid rgba(255,255,255,.12)}',
        '.aj-gd-byline .who{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font:700 10.5px/1.4 inherit;letter-spacing:1.6px;text-transform:uppercase;color:#fff}',
        '.aj-gd-byline .who em{font-style:normal;color:rgba(255,255,255,.5);font-weight:600}',
        '.aj-gd-byline .upd{display:inline-flex;align-items:center;gap:7px;margin-left:auto;font:600 10px/1 inherit;letter-spacing:1.3px;text-transform:uppercase;color:rgba(255,255,255,.5);white-space:nowrap}',
        '.aj-gd-byline .upd i{width:6px;height:6px;border-radius:50%;background:#56e171;animation:ajGdLive 1.6s ease-in-out infinite}',
        '@keyframes ajGdLive{50%{opacity:.2}}',
        '.aj-gd-body{margin:18px 32px 0;font-family:Lora,Georgia,serif;font-size:15px;line-height:1.6;color:rgba(255,255,255,.82)}',
        /* THE STORY SO FAR — verified key points, category-coloured ticks */
        '.aj-gd-points{margin:22px 32px 0}',
        '.aj-gd-points h3{font:700 10.5px/1 inherit;letter-spacing:2.4px;text-transform:uppercase;color:rgba(255,255,255,.42);margin:0}',
        '.aj-gd-points ul{list-style:none;margin:6px 0 0;padding:0}',
        '.aj-gd-points li{position:relative;padding:12px 0 12px 24px;border-bottom:1px solid rgba(255,255,255,.09);font-size:13.5px;line-height:1.55;color:rgba(255,255,255,.85)}',
        '.aj-gd-points li:last-child{border-bottom:0}',
        '.aj-gd-points li::before{content:"";position:absolute;left:2px;top:18px;width:7px;height:7px;background:var(--c,#fa9000)}',
        '.aj-gd-ctarow{display:flex;align-items:center;gap:16px;flex-wrap:wrap;margin:26px 32px 28px}',
        '.aj-gd-cta{display:inline-flex;align-items:center;gap:8px;background:#e8b53a;color:#111;font:900 11px/1 inherit;letter-spacing:.8px;text-transform:uppercase;padding:12px 16px;text-decoration:none;transition:background .2s ease}',
        '.aj-gd-cta:hover{background:#eec158}',
        '.aj-gd-upd{font:600 10.5px/1 inherit;letter-spacing:1.4px;text-transform:uppercase;color:rgba(255,255,255,.42)}',

        /* --- AI "right now" summary, pinned to the panel foot: sticky (not
           just margin-top:auto) so it stays put at the bottom of the drawer
           while the rest of the detail content scrolls underneath it */
        '.aj-gd-ai{margin-top:auto;width:100%;padding-top:8px;position:sticky;bottom:0;background:#202020;z-index:2}',
        '.aj-gd-ai-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:0 32px 12px;font:600 10.5px/1 inherit;letter-spacing:1.4px;text-transform:uppercase;color:rgba(255,255,255,.45)}',
        '.aj-gd-ai-head .rev{display:inline-flex;align-items:center;gap:6px;text-transform:none;letter-spacing:0;font:600 12.5px/1 inherit;color:#fff}',
        '.aj-gd-ai-head .rev i{font-style:normal;color:#e3b23c;font-size:13px}',
        '.aj-gd-ai-card{position:relative;display:flex;gap:14px;align-items:flex-start;padding:20px 32px 22px;',
        '  background:linear-gradient(120deg,#1b1c2c 0%,#1c1d2e 55%,#2a1f33 86%,#3a2333 100%)}',
        '.aj-gd-ai-card::after{content:"";position:absolute;left:0;right:0;bottom:0;height:3px;',
        '  background:linear-gradient(90deg,#3563e9 0%,#7c5cff 38%,#c04b8f 72%,#c0392b 100%)}',
        /* the AI marker is the shared animated aura orb (css/aj-aura-orb.css) */
        '.aj-gd-ai-card .spark{flex:none;margin-top:1px}',
        '.aj-gd-ai-col{flex:1 1 auto;min-width:0}',
        '.aj-gd-ai-txt{margin:0;font-size:15.5px;line-height:1.6;color:#fff;min-height:calc(1.6em * 3)}',
        '.aj-gd-ai-txt.typing::after{content:"";display:inline-block;width:9px;height:15px;margin-left:3px;vertical-align:-2px;background:#a996ff;animation:ajGdCaret .8s steps(1) infinite}',
        '@keyframes ajGdCaret{50%{opacity:0}}',
        '.aj-gd-ai-meta{display:flex;align-items:center;gap:18px;margin-top:15px;font:600 10px/1 inherit;letter-spacing:1px;text-transform:uppercase;opacity:0;transition:opacity .45s ease}',
        '.aj-gd-ai-meta.on{opacity:1}',
        '.aj-gd-ai-meta .tag{color:#8fa7f5}',
        '.aj-gd-ai-meta .ok{display:inline-flex;align-items:center;gap:5px;color:rgba(255,255,255,.55)}',
        '.aj-gd-ai-meta .ok svg{width:11px;height:11px;flex:none}',

        /* --- entrance: blocks settle in one after another, riding the slide --- */
        '.aj-gd-detail>*{opacity:0;transform:translateY(14px);transition:opacity .45s ease,transform .55s cubic-bezier(.22,1,.36,1)}',
        '.aj-gd-detail.is-in>*{opacity:1;transform:none}',
        '.aj-gd-detail>*:nth-child(2){transition-delay:.06s}',
        '.aj-gd-detail>*:nth-child(3){transition-delay:.12s}',
        '.aj-gd-detail>*:nth-child(4){transition-delay:.18s}',
        '.aj-gd-detail>*:nth-child(5){transition-delay:.24s}',
        '.aj-gd-detail>*:nth-child(6){transition-delay:.3s}',
        '.aj-gd-detail>*:nth-child(7){transition-delay:.38s}',
        '.aj-gd-detail>*:nth-child(8){transition-delay:.46s}',
        /* mobile bottom sheet keeps the plain swap — the slide-over is a
           desktop drawer gesture and the sheet has its own entrance */
        '@media (max-width:1023px){.aj-gd-detail{position:static;opacity:1;transform:none;visibility:visible;pointer-events:auto;transition:none;display:none;flex:1 1 auto;min-height:0;padding-top:12px}',
        '  .aj-globe-detailing .aj-gd-detail{display:flex}',
        '  .aj-globe-detailing .aj-globe-list{display:none}',
        '  .aj-gd-kicker,.aj-gd-head,.aj-gd-body,.aj-gd-byline,.aj-gd-points,.aj-gd-ctarow,.aj-gd-ai-head{margin-left:16px;margin-right:16px}',
        /* drawer affordance: drag handle + a round × close button, no more text link */
        '  .aj-gd-handle{display:block;align-self:center;width:36px;height:4px;border-radius:2px;background:rgba(255,255,255,.28);margin:0 0 14px}',
        '  .aj-gd-back{position:absolute;top:12px;right:16px;width:32px;height:32px;margin:0;border:0;border-radius:50%;background:rgba(255,255,255,.12);padding:0;text-indent:-9999px;overflow:hidden;white-space:nowrap}',
        '  .aj-gd-back::after{content:"✕";position:absolute;inset:0;display:flex;align-items:center;justify-content:center;text-indent:0;font-size:14px;color:#fff}',
        '  .aj-gd-back:active{background:rgba(255,255,255,.22)}',
        /* smaller type scale so more of the story fits before scrolling */
        '  .aj-gd-kicker{margin-top:24px;font-size:10px;gap:8px}',
        '  .aj-gd-head{font-size:19px;line-height:1.25;margin-top:8px}',
        '  .aj-gd-body{font-size:13px;line-height:1.45;margin-top:12px}',
        '  .aj-gd-byline{margin-top:12px;padding-bottom:12px}',
        '  .aj-gd-points{margin-top:18px}',
        '  .aj-gd-points li{padding:10px 0 10px 20px;font-size:12.5px}',
        '  .aj-gd-points li::before{top:15px;width:6px;height:6px}',
        '  .aj-gd-ctarow{margin-top:18px;gap:12px}',
        '  .aj-gd-cta{font-size:10px;padding:10px 14px}',
        '  .aj-gd-upd{font-size:9px}',
        '  .aj-gd-ai-card{padding:20px 16px 16px}',
        '  .aj-gd-ai-txt{font-size:13.5px;min-height:calc(1.45em * 3)}',
        '  .aj-gd-ai-meta{gap:10px;margin-top:10px;font-size:8.5px}',
        '  .aj-gd-ai-meta .ok svg{width:9px;height:9px}}',
        '@media (prefers-reduced-motion: reduce){.aj-gd-detail>*{transition:none;opacity:1;transform:none}.aj-gd-ai-txt.typing::after{animation:none}}'
      ].join('\n');
      document.head.appendChild(s);
    })();

    function esc(t) { return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

    /* generative-AI streaming: the summary types itself out word by word with a
       blinking caret, then the attribution row fades in */
    var typeTimer = null;
    function streamInto(el, meta, text) {
      clearInterval(typeTimer);
      var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (reduce) { el.textContent = text; meta.classList.add('on'); return; }
      var words = text.split(' '), i = 0;
      el.textContent = '';
      el.classList.add('typing');
      typeTimer = setInterval(function () {
        el.textContent += (i ? ' ' : '') + words[i];
        if (++i >= words.length) {
          clearInterval(typeTimer);
          el.classList.remove('typing');
          meta.classList.add('on');
        }
      }, 46);
    }

    function openDetail(e) {
      inDetail = true;
      focusOn(e);
      var liveHtml = e.live ? '<span class="live">Live</span>' : '';
      var info = e.info || {};
      var pointsHtml = info.points ? (
        '<div class="aj-gd-points" style="--c:' + e.color + '"><h3>The story so far</h3><ul>' +
        info.points.map(function (p) { return '<li>' + esc(p) + '</li>'; }).join('') +
        '</ul></div>'
      ) : '';
      detail.innerHTML =
        '<span class="aj-gd-handle" aria-hidden="true"></span>' +
        '<button type="button" class="aj-gd-back">← Back to the world</button>' +
        '<div class="aj-gd-kicker" style="--c:' + e.color + '"><span class="dot"></span><span style="color:' + e.color + '">' + esc(e.cat || 'News') + '</span>' + liveHtml + '<span class="reg">· ' + esc(e.loc.replace(/◈/, '').trim() || e.region || 'World') + '</span></div>' +
        '<h2 class="aj-gd-head">' + esc(e.headline) + '</h2>' +
        '<div class="aj-gd-byline">' +
          '<span class="who">Al Jazeera Correspondents <em>· ' + esc(info.byline || e.region || 'World') + '</em></span>' +
          '<span class="upd">' + (e.live ? '<i></i>Live · ' : '') + 'Updated ' + esc(info.updated || 'just now') + '</span>' +
        '</div>' +
        '<p class="aj-gd-body">' + esc(info.dek || e.summary) + '</p>' +
        pointsHtml +
        '<div class="aj-gd-ctarow"><a class="aj-gd-cta" href="aljazeera-article.html">Open the coverage <span aria-hidden="true">›</span></a><span class="aj-gd-upd">Full report · 4 min read</span></div>' +
        '<div class="aj-gd-ai">' +
          '<div class="aj-gd-ai-card"><span class="spark aura-orb" style="--size:26px" aria-hidden="true"><span class="aura-orb__blobs"><span class="aura-orb__spin"><i></i><i></i><i></i><i></i><i></i></span></span></span><div class="aj-gd-ai-col">' +
            '<p class="aj-gd-ai-txt"></p>' +
            '<div class="aj-gd-ai-meta"><span class="tag">✦ AI “right now” summary</span><span class="ok">' +
              '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" fill="currentColor" aria-hidden="true"><path d="m344-60-76-128-144-32 14-148-98-112 98-112-14-148 144-32 76-128 136 58 136-58 76 128 144 32-14 148 98 112-98 112 14 148-144 32-76 128-136-58-136 58Zm94-278 226-226-56-58-170 170-86-84-56 56 142 142Z"/></svg>' +
              'Editor Reviewed</span></div>' +
          '</div></div>' +
        '</div>';
      detail.querySelector('.aj-gd-back').addEventListener('click', closeDetail);
      rightPanel.classList.add('aj-globe-detailing');
      detail.scrollTop = 0;

      /* lazy-load entrance: content starts hidden, then rises in staggered */
      detail.classList.remove('is-in');
      void detail.offsetWidth;
      requestAnimationFrame(function () { detail.classList.add('is-in'); });

      /* the AI stream begins once its card has risen into place */
      var txtEl = detail.querySelector('.aj-gd-ai-txt');
      var metaEl = detail.querySelector('.aj-gd-ai-meta');
      txtEl.classList.add('typing');
      setTimeout(function () { streamInto(txtEl, metaEl, e.summary); }, 900);
    }
    function closeDetail() { inDetail = false; rightPanel.classList.remove('aj-globe-detailing'); reset(); }

    function reset() {
      if (inDetail) return;
      clearActive();
      activePoint = null;
      scene.classList.remove('zoomed'); scene.style.transform = baseTransform(); clearFlatWhite();
      focusEntry = null; gMarkerLayer.classList.remove('focusing'); tYaw = null;
      if (footerLoc) footerLoc.textContent = footerOrig;
    }
    if (list) list.addEventListener('mouseleave', reset);
    flatMarkerLayer.addEventListener('mouseleave', reset);

    // move off the marker and the map eases back to its resting size
    wrap.addEventListener('mousemove', function (e) {
      if (!activePoint) return;
      if (e.target.closest && e.target.closest('.aj-gm')) return;
      var dx = e.clientX - activePoint.x, dy = e.clientY - activePoint.y;
      if (dx * dx + dy * dy > LEAVE_RADIUS * LEAVE_RADIUS) reset();
    });

    /* ---------- single globe treatment ----------
       FLAT mode and the style toggle are retired — the depth dot-matrix is
       the one look, so the export's toggle cluster is removed outright. */
    var mode = 'globe';
    function findBtn(txt) { return [].slice.call(sec.querySelectorAll('button')).filter(function (b) { return b.textContent.trim().toUpperCase() === txt; })[0]; }
    var flatBtn = findBtn('FLAT'), globeBtn = findBtn('GLOBE');
    var cluster = flatBtn && globeBtn && flatBtn.parentElement === globeBtn.parentElement ? flatBtn.parentElement : null;
    if (cluster) cluster.remove();

    // the globe is always on — flat scene stays parked
    scene.style.display = 'none';
    canvas.style.display = 'block';
    gMarkerLayer.style.display = 'block';
    hud.style.display = 'flex';
    startGlobe();
    if (tourOn && !tourTimer) tourStep();

    window.addEventListener('resize', function () {
      pinPanelRight();
      sizeViewport();
      computeMapOffset();
      if (mode === 'flat') scene.style.transform = baseTransform();
      else { sizeCanvas(); draw(); }
    });
  }

  if (document.readyState === 'complete') init();
  else window.addEventListener('load', init);
})();
