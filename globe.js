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
  // globe radius as a fraction of the smaller viewport axis
  var GLOBE_R = 0.46;
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
    '.aj-globe-canvas{position:absolute;inset:0;width:100%;height:100%;display:none;cursor:grab}',
    '.aj-globe-canvas.dragging{cursor:grabbing}',
    '.aj-globe-gmarkers{position:absolute;inset:0;display:none;pointer-events:none}',
    '.aj-globe-markers{position:absolute;inset:0}',
    '.aj-gm{position:absolute;transform:translate(-50%,-50%);cursor:pointer}',
    /* soft glow "bullseye" marker — solid saturated core, blurred halo, no crisp rim */
    '.aj-gm-dot{width:14px;height:14px;border-radius:50%;background:var(--c);position:relative;z-index:3;box-shadow:0 0 0 3px color-mix(in srgb,var(--c) 45%,transparent),0 0 14px 2px color-mix(in srgb,var(--c) 75%,transparent);transition:transform .3s ease}',
    '.aj-gm-ring{position:absolute;left:50%;top:50%;width:40px;height:40px;border-radius:50%;background:radial-gradient(circle,color-mix(in srgb,var(--c) 55%,transparent) 0%,color-mix(in srgb,var(--c) 22%,transparent) 45%,transparent 78%);filter:blur(1.5px);transform:translate(-50%,-50%);opacity:.75;z-index:1;animation:ajRingOpacity 1.116s ease-in-out infinite,ajRingScale 2.4s ease-in-out infinite}',
    '@keyframes ajRingOpacity{0%{opacity:.6}50%{opacity:1}100%{opacity:.6}}',
    '@keyframes ajRingScale{0%{transform:translate(-50%,-50%) scale(1)}23.25%{transform:translate(-50%,-50%) scale(1.12)}23.27%{transform:translate(-50%,-50%) scale(1.18)}46.5%{transform:translate(-50%,-50%) scale(1)}100%{transform:translate(-50%,-50%) scale(1)}}',
    '.aj-globe-scene.zoomed .aj-gm:not(.is-active),.aj-globe-gmarkers.focusing .aj-gm:not(.is-active){opacity:.2;filter:saturate(.5)}',
    '.aj-gm.is-active{z-index:5}',
    '.aj-gm.is-active .aj-gm-dot{transform:scale(1.5)}',
    '.aj-gm.is-active .aj-gm-ring{opacity:1}',
    '.aj-gm-label{position:absolute;left:50%;top:calc(50% + 12px);transform:translateX(-50%);white-space:nowrap;font:600 10px/1 Arial,sans-serif;letter-spacing:.4px;color:#fff;background:rgba(0,0,0,.72);padding:3px 7px;opacity:0;transition:opacity .3s ease;pointer-events:none;text-transform:uppercase;z-index:6}',
    '.aj-gm.is-active .aj-gm-label{opacity:1}',
    '.aj-globe-list{overflow-y:auto;scrollbar-width:thin;scrollbar-color:#555 transparent}',
    '.aj-globe-list::-webkit-scrollbar{width:6px}',
    '.aj-globe-list::-webkit-scrollbar-thumb{background:#555;border-radius:3px}',
    '.aj-story-row{transition:background-color .2s ease;cursor:pointer}',
    '.aj-story-row.is-active,.aj-story-row:hover{background-color:#2b2b2b}',
    /* keep dark-section story headlines readable on hover (defeat the global darken rule) */
    '.aj-story-row a[href="aljazeera-article.html"]:hover :is(p,h1,h2,h3,h4){color:#fff}',
    '@media (prefers-reduced-motion: reduce){.aj-gm-ring{animation:none}.aj-globe-scene{transition:none}.aj-globe-dots circle{transition:none}}'
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
    function pinPanelRight() {
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
    var focusEntry = null, raf = null, DPR = Math.min(window.devicePixelRatio || 1, 2), gZoom = 1;
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

    /* Natural Earth 110m country rings (world.js) — coastlines plus internal borders.
       Rings arrive already closed (first point repeated), so they're stroked open. */
    var WORLD = (typeof window !== 'undefined' && window.AJ_WORLD) || null;
    function drawCoastlines(cx, cy, R) {
      var src = WORLD || POLYS, closed = !WORLD;
      ctx.beginPath();
      for (var i = 0; i < src.length; i++) pathGeo(src[i], closed, cx, cy, R);
      ctx.strokeStyle = 'rgba(196,204,214,.42)'; ctx.lineWidth = 1; ctx.stroke();
    }
    function draw() {
      var w = wrap.clientWidth, h = wrap.clientHeight;
      // centred in the space left of the story panel, sized to leave breathing room
      var cx = w / 2 + mapDX, cy = h / 2, R = Math.min(w + 2 * mapDX, h) * GLOBE_R * gZoom;
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

      // the focused story's whole country lifts out of the outline work
      if (focusEntry) {
        var countryRing = focusCountryRing(focusEntry);
        if (countryRing) {
          ctx.beginPath();
          pathGeo(countryRing, false, cx, cy, R);
          ctx.fillStyle = 'rgba(255,255,255,.22)';
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
      ctx.restore();

      // rim
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, 6.2832);
      ctx.strokeStyle = 'rgba(150,180,205,.22)'; ctx.lineWidth = 1; ctx.stroke();
      // markers
      markers.forEach(function (e) {
        var la = e.lat * RAD, lo = e.lon * RAD, cl = Math.cos(la);
        var q = rot({ vx: cl * Math.sin(lo), vy: Math.sin(la), vz: cl * Math.cos(lo) });
        if (q.z <= 0.03) { e.globeMk.style.display = 'none'; return; }
        e.globeMk.style.display = 'block';
        e.globeMk.style.left = (cx + q.x * R) + 'px';
        e.globeMk.style.top = (cy - q.y * R) + 'px';
        e.globeMk.style.opacity = (0.35 + 0.65 * q.z);
      });
    }
    function tick() {
      if (mode !== 'globe') { raf = null; return; }
      if (tYaw !== null) {
        var dy = ((tYaw - yaw + Math.PI) % (2 * Math.PI)) - Math.PI;
        yaw += dy * 0.12; pitch += (tPitch - pitch) * 0.12;
        if (Math.abs(dy) < 0.002 && Math.abs(tPitch - pitch) < 0.002) { tYaw = null; tPitch = null; }
      } else if (!dragging && !focusEntry) { yaw += 0.0016; }
      gZoom += ((focusEntry ? 1.7 : 1) - gZoom) * 0.12;   // pan+zoom into the focused region, like the flat map
      draw();
      raf = requestAnimationFrame(tick);
    }
    function startGlobe() { sizeCanvas(); if (!raf) tick(); }

    canvas.addEventListener('mousedown', function (e) { if (inDetail) closeDetail(); dragging = true; focusEntry = null; tYaw = null; gMarkerLayer.classList.remove('focusing'); clearActive(); lastX = e.clientX; lastY = e.clientY; canvas.classList.add('dragging'); });
    window.addEventListener('mouseup', function () { dragging = false; canvas.classList.remove('dragging'); });
    window.addEventListener('mousemove', function (e) {
      if (!dragging) return;
      yaw += (e.clientX - lastX) * 0.006; pitch += (e.clientY - lastY) * 0.006;
      pitch = Math.max(-1.2, Math.min(1.2, pitch)); lastX = e.clientX; lastY = e.clientY;
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

    // shared by hover-activate and the article detail view, so opening an article
    // keeps (or applies) the same zoom-in + whole-country highlight as hovering it
    function focusOn(entry) {
      clearActive();
      activePoint = { x: ptrX, y: ptrY };
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
    }

    function mkEl(color, label) {
      var m = document.createElement('div'); m.className = 'aj-gm'; m.style.setProperty('--c', color);
      m.innerHTML = '<span class="aj-gm-ring"></span><span class="aj-gm-dot"></span><span class="aj-gm-label">' + label + '</span>';
      return m;
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
      var flatMk = mkEl(color, label); flatMk.style.left = xPct(coord[0]) + '%'; flatMk.style.top = yPct(coord[1]) + '%'; flatMarkerLayer.appendChild(flatMk);
      var globeMk = mkEl(color, label); globeMk.style.pointerEvents = 'auto'; gMarkerLayer.appendChild(globeMk);
      var headline = (link && link.querySelector('p') ? link.querySelector('p') : (link || row)).textContent.trim();
      var region = ps.filter(function (t) { return /^(europe|asia|africa|north america|south america|middle east|oceania|latin america)$/i.test(t); })[0] || '';
      var live = ps.some(function (t) { return /^live$/i.test(t); });
      var summary = headline + ' — Al Jazeera correspondents are following developments' + (region ? (' across ' + region) : '') + '. Here is the situation right now, drawn from our live reporting.';
      var entry = { row: row, flatMk: flatMk, globeMk: globeMk, x: xPct(coord[0]), y: yPct(coord[1]), lon: coord[0], lat: coord[1], loc: locTxt, color: color, cat: catTxt, region: region, headline: headline, live: live, summary: summary };
      markers.push(entry);
      if (link) link.addEventListener('click', function (ev) { ev.preventDefault(); openDetail(entry); });

      function activate() { focusOn(entry); }
      row.addEventListener('mouseenter', activate);
      flatMk.addEventListener('mouseenter', function () { activate(); row.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); });
      globeMk.addEventListener('mouseenter', function () { activate(); row.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); });
    });

    /* ---------- article detail swap (click a story -> detail view with back) ---------- */
    var detail = document.createElement('div');
    detail.className = 'aj-gd-detail';
    rightPanel.appendChild(detail);
    (function () {
      var s = document.createElement('style'); s.id = 'aj-gd-detail-style';
      s.textContent = [
        '.aj-gd-detail{display:none;flex:1 1 auto;min-height:0;flex-direction:column;gap:20px;padding:64px 40px;width:100%;box-sizing:border-box;color:#fff;overflow-y:auto}',
        '.aj-globe-detailing .aj-globe-list{display:none}',
        '.aj-globe-detailing .aj-gd-detail{display:flex}',
        '.aj-gd-back{align-self:flex-start;display:inline-flex;align-items:center;gap:8px;font:600 12px/1 Arial,sans-serif;letter-spacing:1.5px;text-transform:uppercase;color:rgba(255,255,255,.6);cursor:pointer;background:none;border:0;border-bottom:1px solid rgba(255,255,255,.15);padding:0 0 18px;width:100%;text-align:left;transition:color .2s ease}',
        '.aj-gd-back:hover{color:#fff}',
        '.aj-gd-kicker{display:flex;align-items:center;gap:10px;font:700 12px/1 Arial,sans-serif;letter-spacing:1.2px;text-transform:uppercase}',
        '.aj-gd-kicker .dot{width:9px;height:9px;border-radius:50%;background:var(--c,#ef304a)}',
        '.aj-gd-kicker .live{background:#e3b23c;color:#111;padding:3px 7px;font-weight:800}',
        '.aj-gd-kicker .reg{color:rgba(255,255,255,.5)}',
        '.aj-gd-head{font-family:Lora,Georgia,serif;font-size:38px;line-height:1.14;font-weight:600;margin:2px 0 0}',
        '.aj-gd-sum{background:#17171f;border-left:3px solid #7c5cff;padding:20px 22px;font-size:17px;line-height:1.55;color:#e9e9ef}',
        '.aj-gd-sum b{color:#a996ff;margin-right:6px}',
        '.aj-gd-summeta{font:600 11px/1.4 Arial,sans-serif;letter-spacing:1px;text-transform:uppercase;color:rgba(255,255,255,.4)}',
        '.aj-gd-stats{display:grid;grid-template-columns:repeat(3,1fr);border:1px solid rgba(255,255,255,.14)}',
        '.aj-gd-stats>div{padding:18px 16px;border-right:1px solid rgba(255,255,255,.14)}',
        '.aj-gd-stats>div:last-child{border-right:0}',
        '.aj-gd-stats b{display:block;font-family:Lora,serif;font-size:26px;font-weight:700}',
        '.aj-gd-stats span{display:block;margin-top:6px;font:600 10.5px/1.3 Arial,sans-serif;letter-spacing:.8px;text-transform:uppercase;color:rgba(255,255,255,.5)}',
        '.aj-gd-ctarow{display:flex;align-items:center;gap:16px;flex-wrap:wrap;margin-top:2px}',
        '.aj-gd-cta{display:inline-flex;align-items:center;gap:8px;background:#e3b23c;color:#111;font:700 13px/1 Arial,sans-serif;letter-spacing:.5px;text-transform:uppercase;padding:16px 22px;text-decoration:none;transition:background .2s ease}',
        '.aj-gd-cta:hover{background:#eec158}',
        '.aj-gd-upd{font:600 11px/1 Arial,sans-serif;letter-spacing:1px;text-transform:uppercase;color:rgba(255,255,255,.4)}'
      ].join('\n');
      document.head.appendChild(s);
    })();

    function esc(t) { return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
    function openDetail(e) {
      inDetail = true;
      focusOn(e);
      var liveHtml = e.live ? '<span class="live">Live</span>' : '';
      detail.innerHTML =
        '<button type="button" class="aj-gd-back">← Back to the world</button>' +
        '<div class="aj-gd-kicker" style="--c:' + e.color + '"><span class="dot"></span><span style="color:' + e.color + '">' + esc(e.cat || 'News') + '</span>' + liveHtml + '<span class="reg">· ' + esc(e.region || 'World') + '</span></div>' +
        '<h2 class="aj-gd-head">' + esc(e.headline) + '</h2>' +
        '<div class="aj-gd-sum"><b>✦</b>' + esc(e.summary) + '</div>' +
        '<div class="aj-gd-summeta">✦ AI “right now” summary · grounded in the live blog · editor-reviewed</div>' +
        '<div class="aj-gd-stats"><div><b>' + (e.live ? 'LIVE' : 'NEW') + '</b><span>Status</span></div><div><b>' + esc(e.region || 'World') + '</b><span>Region</span></div><div><b>3</b><span>AJ sources</span></div></div>' +
        '<div class="aj-gd-ctarow"><a class="aj-gd-cta" href="aljazeera-article.html">Open the coverage →</a><span class="aj-gd-upd">Updated live now</span></div>';
      detail.querySelector('.aj-gd-back').addEventListener('click', closeDetail);
      rightPanel.classList.add('aj-globe-detailing');
      detail.scrollTop = 0;
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

    /* ---------- FLAT / GLOBE toggle ---------- */
    var mode = 'flat';
    function findBtn(txt) { return [].slice.call(sec.querySelectorAll('button')).filter(function (b) { return b.textContent.trim().toUpperCase() === txt; })[0]; }
    var flatBtn = findBtn('FLAT'), globeBtn = findBtn('GLOBE');
    function paint(btn, active) {
      if (!btn) return;
      btn.style.background = active ? '#ffffff' : '#383838';
      [].slice.call(btn.querySelectorAll('*')).forEach(function (e) { e.style.color = active ? '#111' : '#cfcfcf'; });
    }
    function setMode(m) {
      mode = m; reset();
      var g = (m === 'globe');
      scene.style.display = g ? 'none' : 'block';
      canvas.style.display = g ? 'block' : 'none';
      gMarkerLayer.style.display = g ? 'block' : 'none';
      paint(flatBtn, !g); paint(globeBtn, g);
      if (g) startGlobe();
    }
    if (flatBtn) flatBtn.addEventListener('click', function () { setMode('flat'); });
    if (globeBtn) globeBtn.addEventListener('click', function () { setMode('globe'); });
    setMode('globe');

    window.addEventListener('resize', function () {
      pinPanelRight();
      computeMapOffset();
      if (mode === 'flat') scene.style.transform = baseTransform();
      else { sizeCanvas(); draw(); }
    });
  }

  if (document.readyState === 'complete') init();
  else window.addEventListener('load', init);
})();
