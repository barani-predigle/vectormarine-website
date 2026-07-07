/* ============================================================
   VectorMarine — interactions (dark command-deck)
   Vanilla JS · no dependencies · performance-gated motion
   ============================================================ */
(function () {
  'use strict';

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canHover = window.matchMedia('(hover:hover)').matches;
  // Gate heavy canvas/rAF work on capable, non-touch devices only.
  const allowHeavy =
    !reduce &&
    (navigator.hardwareConcurrency || 4) >= 4;

  /* -------------------------------------------------
     NAV — floating state + mobile menu
  ------------------------------------------------- */
  const nav = document.getElementById('siteNav');
  const navToggle = document.getElementById('navToggle');
  const navLinks = document.getElementById('navLinks');

  const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 16);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  const closeMenu = () => {
    navLinks.classList.remove('open');
    navToggle.classList.remove('open');
    navToggle.setAttribute('aria-expanded', 'false');
    navToggle.setAttribute('aria-label', 'Open menu');
  };
  navToggle.addEventListener('click', () => {
    const open = navLinks.classList.toggle('open');
    navToggle.classList.toggle('open', open);
    navToggle.setAttribute('aria-expanded', String(open));
    navToggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  });
  navLinks.querySelectorAll('a').forEach((a) => a.addEventListener('click', closeMenu));
  document.addEventListener('keydown', (e) => e.key === 'Escape' && closeMenu());

  /* -------------------------------------------------
     REVEAL on scroll + stagger
  ------------------------------------------------- */
  const reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && !reduce) {
    document
      .querySelectorAll('.feature-grid, .usecase-grid, .price-grid, .trust-row, .faq-list, .monitor-grid, .check-list, .everything-list, .hero-meta, .app-showcase, .stat-band, .team-grid')
      .forEach((group) => {
        Array.from(group.children).forEach((el, i) => {
          if (el.classList.contains('reveal')) el.style.setProperty('--d', Math.min(i * 0.06, 0.42) + 's');
        });
      });
    const io = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('in');
            obs.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -7% 0px' }
    );
    reveals.forEach((el) => io.observe(el));
  } else {
    reveals.forEach((el) => el.classList.add('in'));
  }

  /* -------------------------------------------------
     COUNT-UP stats
  ------------------------------------------------- */
  const counters = document.querySelectorAll('[data-count]');
  if (counters.length && 'IntersectionObserver' in window && !reduce) {
    const fmt = (n) => (n >= 1000 ? Math.round(n).toLocaleString() : Math.round(n).toString());
    const run = (el) => {
      const target = parseFloat(el.dataset.count);
      const suffix = el.dataset.suffix || '';
      const dur = 1400;
      let t0 = null;
      const tick = (ts) => {
        if (!t0) t0 = ts;
        const p = Math.min((ts - t0) / dur, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = fmt(target * eased) + suffix;
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };
    const cio = new IntersectionObserver(
      (entries, obs) => entries.forEach((e) => { if (e.isIntersecting) { run(e.target); obs.unobserve(e.target); } }),
      { threshold: 0.6 }
    );
    counters.forEach((el) => cio.observe(el));
  } else {
    counters.forEach((el) => (el.textContent = (parseFloat(el.dataset.count) >= 1000 ? parseFloat(el.dataset.count).toLocaleString() : el.dataset.count) + (el.dataset.suffix || '')));
  }

  /* -------------------------------------------------
     PARALLAX (depth) — throttled rAF
  ------------------------------------------------- */
  const parallaxEls = Array.from(document.querySelectorAll('[data-parallax]'));
  if (parallaxEls.length && allowHeavy) {
    let ticking = false;
    const update = () => {
      const vh = window.innerHeight;
      parallaxEls.forEach((el) => {
        const speed = parseFloat(el.dataset.parallax) || 0.08;
        const r = el.getBoundingClientRect();
        const off = (r.top + r.height / 2 - vh / 2) * -speed;
        el.style.transform = `translate3d(0, ${off.toFixed(1)}px, 0)`;
      });
      ticking = false;
    };
    window.addEventListener('scroll', () => { if (!ticking) { requestAnimationFrame(update); ticking = true; } }, { passive: true });
    update();
  }

  /* -------------------------------------------------
     HOW IT WORKS — scroll progress + step activation
  ------------------------------------------------- */
  const timeline = document.getElementById('timeline');
  const progress = document.getElementById('tlProgress');
  const steps = Array.from(document.querySelectorAll('.step'));
  if (timeline && progress && !reduce) {
    let ticking = false;
    const update = () => {
      const r = timeline.getBoundingClientRect();
      const vh = window.innerHeight;
      const total = r.height;
      const passed = Math.min(Math.max(vh * 0.55 - r.top, 0), total);
      progress.style.height = (passed / total) * 100 + '%';
      const mark = vh * 0.62;
      steps.forEach((s) => {
        const sr = s.getBoundingClientRect();
        s.classList.toggle('active', sr.top < mark && sr.bottom > vh * 0.2);
      });
      ticking = false;
    };
    window.addEventListener('scroll', () => { if (!ticking) { requestAnimationFrame(update); ticking = true; } }, { passive: true });
    window.addEventListener('resize', update);
    update();
  }

  /* -------------------------------------------------
     SVG route follower (ride-along section map card)
  ------------------------------------------------- */
  function followPath(pathId, markerId, period) {
    const path = document.getElementById(pathId);
    const marker = document.getElementById(markerId);
    if (!path || !marker || reduce || typeof path.getTotalLength !== 'function') return;
    const len = path.getTotalLength();
    let visible = true;
    if ('IntersectionObserver' in window) {
      new IntersectionObserver((e) => (visible = e[0].isIntersecting), { threshold: 0 }).observe(path);
    }
    let start = null;
    const step = (ts) => {
      if (start === null) start = ts;
      if (visible) {
        const t = ((ts - start) % period) / period;
        const p = path.getPointAtLength(t * len);
        const p2 = path.getPointAtLength(Math.min(t + 0.012, 1) * len);
        const ang = (Math.atan2(p2.y - p.y, p2.x - p.x) * 180) / Math.PI + 90;
        marker.setAttribute('transform', `translate(${p.x} ${p.y}) rotate(${ang})`);
      }
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
  followPath('ridePath', 'hostVessel', 9000);
  followPath('borrowPath', 'borrowVessel', 10000);

  /* ============================================================
     HERO SEA — animated water canvas + interactive SVG fleet
     ============================================================ */
  const SVGNS = 'http://www.w3.org/2000/svg';
  const VBW = 1440, VBH = 900;
  const fleetSvg = document.getElementById('fleet');
  const seaCanvas = document.getElementById('sea');
  const fleetCard = document.getElementById('fleetCard');

  // Fleet roster — each vessel: a route across the sea + live telemetry.
  const FLEET = [
    { id: 'VM-01', name: 'Aurora II',   cls: 'Offshore · 42ft',    d: 'M560 706 C 706 642 770 452 922 470 S 1182 354 1352 244', speed: 18.4, heading: 147, depth: 42.1, temp: 21.6, wpt: 'Reef Marker 7',     wpts: [[922, 470], [1182, 354]], spd: 0.045, ph: 0.10 },
    { id: 'VM-02', name: 'Northwind',   cls: 'Charter · 58ft',     d: 'M624 238 C 786 300 824 470 982 502 S 1224 566 1366 472', speed: 12.7, heading: 212, depth: 67.4, temp: 19.8, wpt: 'Harbor Approach',   wpts: [[982, 502], [1224, 566]], spd: 0.034, ph: 0.55 },
    { id: 'VM-03', name: 'Sea Lark',    cls: 'Recreational · 31ft', d: 'M512 824 C 700 806 884 762 1002 660 S 1190 520 1306 566', speed: 9.2,  heading: 84,  depth: 18.9, temp: 22.4, wpt: 'Cove Anchorage',    wpts: [[1002, 660], [1190, 520]], spd: 0.028, ph: 0.30 },
    { id: 'VM-04', name: 'Mariner V',   cls: 'Commercial · 74ft',  d: 'M600 452 C 762 436 902 560 1042 540 S 1266 440 1384 352', speed: 14.6, heading: 178, depth: 88.2, temp: 20.1, wpt: 'Shipping Lane 3',   wpts: [[1042, 540], [1266, 440]], spd: 0.040, ph: 0.78 },
    { id: 'VM-05', name: 'Tide Runner', cls: 'Fishing · 38ft',     d: 'M556 566 C 720 604 822 704 984 722 S 1244 702 1366 624', speed: 16.1, heading: 121, depth: 34.7, temp: 21.0, wpt: 'Fishing Ground B',  wpts: [[984, 722], [1244, 702]], spd: 0.050, ph: 0.42 },
  ];

  if (window.location.pathname.includes('about.html')) {
    // Clear the default long-distance routes
    FLEET.length = 0; 
    
    // Safe water coordinates distributed across the oceans (1440x900 scale)
    const waterCoords = [
      // Pacific Ocean
      [150, 450], [200, 300], [250, 600], [150, 650], [100, 400], 
      [1200, 400], [1300, 500], [1250, 600], [1350, 650], [1400, 550],
      // Atlantic Ocean
      [450, 300], [550, 400], [500, 500], [450, 600], [550, 650], 
      [600, 500], [650, 650], [400, 400], [420, 500],
      // Indian Ocean
      [950, 550], [1000, 650], [900, 600], [1050, 600], [850, 650], [1100, 550],
      // Southern Ocean
      [300, 800], [500, 800], [700, 820], [900, 800], [1100, 820],
      // Arctic/North
      [600, 200], [700, 250], [800, 200]
    ];

    waterCoords.forEach((coord, i) => {
      // Create a short random drift path for each vessel
      const dx = coord[0] + (Math.random() * 40 - 20);
      const dy = coord[1] + (Math.random() * 40 - 20);
      FLEET.push({
        id: 'SCATTER-' + i,
        name: 'Vessel ' + i,
        cls: 'Transport',
        speed: 10, heading: 90, depth: 0, temp: 15, wpt: 'Drifting',
        wpts: [],
        d: `M${coord[0]} ${coord[1]} L${dx.toFixed(1)} ${dy.toFixed(1)}`,
        ph: Math.random(),
        spd: 0.005 + (Math.random() * 0.01) // Extremely slow drift speed
      });
    });
  }

  const el = (name, attrs) => {
    const n = document.createElementNS(SVGNS, name);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    return n;
  };

  let fleet = [];          // built vessel objects {data, route, move, body, tag, len, t, len0}
  let pinned = -1;         // pinned vessel index (-1 none)
  let active = 0;          // currently shown vessel index
  let driftTimer = null;

  function buildFleet() {
    if (!fleetSvg) return;
    fleetSvg.setAttribute('viewBox', `0 0 ${VBW} ${VBH}`);
    const stage = el('g', { class: 'fleet-stage' });
    const routesG = el('g', { class: 'routes' });
    const boatsG = el('g', { class: 'boats' });

    FLEET.forEach((v, i) => {
      // route (drawn-in on scroll) + flow overlay
      const route = el('path', { class: 'route', d: v.d, 'data-i': i });
      const flow = el('path', { class: 'route-flow', d: v.d, 'data-i': i });
      routesG.appendChild(route);
      routesG.appendChild(flow);
      // waypoint pings
      v.wpts.forEach((w, k) => {
        const ring = el('circle', { class: 'wpt-ring', cx: w[0], cy: w[1], r: 9, 'stroke-width': 1.4, opacity: 0.5 });
        ring.style.animation = `ping 2.8s ease-out ${k * 1.1}s infinite`;
        routesG.appendChild(ring);
        routesG.appendChild(el('circle', { class: 'wpt', cx: w[0], cy: w[1], r: 2.6 }));
      });

      // interactive boat node
      const node = el('g', { class: 'fleet-node', tabindex: '0', role: 'button', 'aria-label': `${v.name}, ${v.cls}. View live telemetry.` });
      const move = el('g', { class: 'boat-move' });
      move.appendChild(el('circle', { class: 'boat-glow', r: 24 }));
      move.appendChild(el('path', { class: 'boat-reticle', d: 'M-15 -15 h7 M15 -15 h-7 M-15 15 h7 M15 15 h-7 M-15 -15 v7 M15 -15 v7 M-15 15 v-7 M15 15 v-7' }));
      let bx = '-5', by = '-11.14', bw = '10', bh = '22.27';
      if (window.location.pathname.includes('about.html')) {
        bx = '-3'; by = '-6.68'; bw = '6'; bh = '13.36'; // very tiny scale
      }
      move.appendChild(el('use', { class: 'boat-body-detailed', href: '#vessel-detailed', x: bx, y: by, width: bw, height: bh }));
      move.appendChild(el('circle', { class: 'boat-hit', r: 28 }));
      const tag = el('text', { class: 'boat-tag' });
      tag.textContent = v.name;
      node.appendChild(move);
      node.appendChild(tag);
      boatsG.appendChild(node);

      const len = route.getTotalLength ? route.getTotalLength() : 0;
      route.style.strokeDasharray = len;
      route.style.strokeDashoffset = allowHeavy ? len : 0; // draw in on scroll (desktop); static elsewhere
      const obj = { v, i, route, flow, move, tag, len, t: v.ph };
      fleet.push(obj);

      // interaction
      const onEnter = () => { if (pinned < 0) select(i, false); };
      const onLeave = () => { if (pinned < 0) select(0, false); };
      // bind the full set so hover + keyboard focus both work across engines (select() is idempotent)
      ['pointerenter', 'focus', 'focusin'].forEach((ev) => node.addEventListener(ev, onEnter));
      ['pointerleave', 'blur', 'focusout'].forEach((ev) => node.addEventListener(ev, onLeave));
      node.addEventListener('click', () => { pinned = (pinned === i) ? -1 : i; select(i, true); });
      node.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pinned = (pinned === i) ? -1 : i; select(i, true); }
        if (e.key === 'Escape') { pinned = -1; select(0, false); node.blur(); }
      });

      placeBoat(obj, obj.t); // initial placement
    });

    stage.appendChild(routesG);
    stage.appendChild(boatsG);
    fleetSvg.appendChild(stage);
    fleetStage = stage;
    select(0, false); // command-deck always shows a vessel
  }

  let fleetStage = null;

  function placeBoat(o, t) {
    if (!o.len) return;
    const p = o.route.getPointAtLength(t * o.len);
    const p2 = o.route.getPointAtLength(Math.min(t + 0.01, 1) * o.len);
    const ang = (Math.atan2(p2.y - p.y, p2.x - p.x) * 180) / Math.PI + 90;
    o.move.setAttribute('transform', `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)}) rotate(${ang.toFixed(1)})`);
    o.tag.setAttribute('x', (p.x + 16).toFixed(1));
    o.tag.setAttribute('y', (p.y - 14).toFixed(1));
  }

  function select(i, pin) {
    active = i;
    fleetSvg.classList.add('has-sel');
    fleet.forEach((o, k) => {
      const on = k === i;
      o.route.classList.toggle('on', on);
      o.flow.classList.toggle('on', on);
      o.move.parentNode.classList.toggle('sel', on);
    });
    const v = FLEET[i];
    setText('fcName', v.name);
    setText('fcClass', v.cls);
    setText('fcId', v.id);
    setText('fcWaypoint', 'Next waypoint · ' + v.wpt);
    setFc('speed', v.speed, 1); setFc('heading', v.heading, 0);
    setFc('depth', v.depth, 1); setFc('temp', v.temp, 1);
    if (fleetCard) fleetCard.classList.add('show');
  }
  const setText = (id, t) => { const n = document.getElementById(id); if (n) n.textContent = t; };
  const setFc = (k, val, dec) => { const n = document.querySelector(`[data-fc="${k}"]`); if (n) n.textContent = (+val).toFixed(dec); };

  // gentle live drift on the active vessel's readout
  function startDrift() {
    if (reduce || driftTimer) return;
    driftTimer = setInterval(() => {
      const v = FLEET[active];
      if (!v || !fleetCard.classList.contains('show')) return;
      setFc('speed', v.speed + (Math.random() - 0.5) * 1.1, 1);
      setFc('heading', v.heading + (Math.random() - 0.5) * 5, 0);
      setFc('depth', v.depth + (Math.random() - 0.5) * 2.6, 1);
      setFc('temp', v.temp + (Math.random() - 0.5) * 0.4, 1);
    }, 2400);
  }

  // routes draw-in + parallax + scale label on scroll (desktop)
  function wireSeaScroll() {
    const hero = document.getElementById('hero');
    let drawn = false, ticking = false;
    const update = () => {
      const r = hero.getBoundingClientRect();
      const vh = window.innerHeight;
      const p = Math.min(Math.max(-r.top / (r.height - vh * 0.4), 0), 1); // 0 at top → 1 scrolled
      // draw routes in once on first reveal
      if (!drawn) {
        drawn = true;
        fleet.forEach((o, k) => {
          o.route.style.transition = `stroke-dashoffset 1.5s cubic-bezier(.22,1,.36,1) ${k * 0.12}s`;
          requestAnimationFrame(() => { o.route.style.strokeDashoffset = 0; });
        });
      }
      if (fleetStage) fleetStage.setAttribute('transform', `translate(0 ${(-p * 60).toFixed(1)})`);
      ticking = false;
    };
    window.addEventListener('scroll', () => { if (!ticking) { requestAnimationFrame(update); ticking = true; } }, { passive: true });
    update();
  }

  /* ---------- canvas water ---------- */
  function startWater() {
    const ctx = seaCanvas.getContext('2d');
    let W, H, DPR, raf, running = false, particles = [], rings = [];
    const resize = () => {
      DPR = Math.min(window.devicePixelRatio || 1, 1.75);
      W = seaCanvas.clientWidth; H = seaCanvas.clientHeight;
      seaCanvas.width = W * DPR; seaCanvas.height = H * DPR;
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      const n = Math.round((W * H) / 26000);
      particles = Array.from({ length: Math.min(n, 70) }, () => ({
        x: Math.random() * W, y: Math.random() * H,
        r: Math.random() * 1.4 + 0.4, a: Math.random() * 0.5 + 0.15,
        vx: (Math.random() - 0.5) * 0.12, vy: (Math.random() - 0.5) * 0.10,
        tw: Math.random() * Math.PI * 2,
      }));
    };
    resize();
    window.addEventListener('resize', resize);

    const t0 = performance.now();
    let lastRing = 0;
    const cx = () => W * 0.62, cy = () => H * 0.46; // sonar origin (command deck)

    const draw = (now) => {
      const isLight = document.documentElement.getAttribute('data-theme') === 'light' || 
                      (!document.documentElement.hasAttribute('data-theme') && !window.matchMedia('(prefers-color-scheme: dark)').matches);
                      
      const time = (now - t0) / 1000;
      ctx.clearRect(0, 0, W, H);

      // base depth wash
      const g = ctx.createRadialGradient(cx(), cy(), 40, cx(), cy(), Math.max(W, H) * 0.9);
      if (isLight) {
        g.addColorStop(0, 'rgba(226,232,240,0.8)'); // slate-200
        g.addColorStop(0.5, 'rgba(241,245,249,0.6)'); // slate-100
        g.addColorStop(1, 'rgba(248,250,252,0)');
      } else {
        g.addColorStop(0, 'rgba(20,52,104,0.55)');
        g.addColorStop(0.5, 'rgba(8,20,46,0.40)');
        g.addColorStop(1, 'rgba(4,7,16,0)');
      }
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

      // moonlit current ripples
      const bands = [
        { off: 0.30, amp: 16, len: 0.0062, sp: 0.45, c: isLight ? 'rgba(51,65,85,0.04)' : 'rgba(60,120,220,0.06)' },
        { off: 0.52, amp: 13, len: 0.0090, sp: 0.70, c: isLight ? 'rgba(51,65,85,0.04)' : 'rgba(47,125,255,0.06)' },
        { off: 0.74, amp: 11, len: 0.0125, sp: 1.05, c: isLight ? 'rgba(51,65,85,0.03)' : 'rgba(90,170,255,0.05)' },
      ];
      bands.forEach((L) => {
        ctx.beginPath();
        for (let x = 0; x <= W; x += 12) {
          const y = H * L.off + Math.sin(x * L.len + time * L.sp) * L.amp + Math.sin(x * L.len * 2.3 + time * L.sp * 1.6) * (L.amp * 0.3);
          x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.strokeStyle = L.c; ctx.lineWidth = 1.4; ctx.stroke();
      });

      // sonar sweep wedge
      const ang = (time * 0.5) % (Math.PI * 2);
      const R = Math.max(W, H) * 0.7;
      const sg = ctx.createLinearGradient(cx(), cy(), cx() + Math.cos(ang) * R, cy() + Math.sin(ang) * R);
      sg.addColorStop(0, isLight ? 'rgba(47,125,255,0.06)' : 'rgba(60,224,255,0.12)');
      sg.addColorStop(1, 'rgba(60,224,255,0)');
      ctx.beginPath();
      ctx.moveTo(cx(), cy());
      ctx.arc(cx(), cy(), R, ang - 0.22, ang);
      ctx.closePath();
      ctx.fillStyle = sg; ctx.fill();

      // expanding sonar rings
      if (now - lastRing > 3400) { lastRing = now; rings.push({ born: now, r: 0 }); }
      rings = rings.filter((r) => {
        const age = (now - r.born) / 4200;
        if (age >= 1) return false;
        ctx.beginPath();
        ctx.arc(cx(), cy(), age * R * 0.9, 0, Math.PI * 2);
        ctx.strokeStyle = isLight ? `rgba(47,125,255,${(0.12 * (1 - age)).toFixed(3)})` : `rgba(60,224,255,${(0.18 * (1 - age)).toFixed(3)})`;
        ctx.lineWidth = 1.2; ctx.stroke();
        return true;
      });

      // drifting glints
      particles.forEach((p) => {
        p.x += p.vx; p.y += p.vy; p.tw += 0.03;
        if (p.x < 0) p.x = W; if (p.x > W) p.x = 0;
        if (p.y < 0) p.y = H; if (p.y > H) p.y = 0;
        const a = p.a * (0.55 + 0.45 * Math.sin(p.tw));
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = isLight ? `rgba(148,163,184,${(a * 0.6).toFixed(3)})` : `rgba(150,205,255,${a.toFixed(3)})`;
        ctx.fill();
      });

      raf = requestAnimationFrame(draw);
    };
    const startLoop = () => { if (!running) { running = true; raf = requestAnimationFrame(draw); } };
    const stopLoop = () => { running = false; cancelAnimationFrame(raf); };
    if ('IntersectionObserver' in window) {
      new IntersectionObserver((e) => (e[0].isIntersecting ? startLoop() : stopLoop()), { threshold: 0 }).observe(seaCanvas);
    } else startLoop();
  }

  function paintWaterStatic() {
    const isLight = document.documentElement.getAttribute('data-theme') === 'light' || 
                    (!document.documentElement.hasAttribute('data-theme') && !window.matchMedia('(prefers-color-scheme: dark)').matches);
                    
    const ctx = seaCanvas.getContext('2d');
    const DPR = Math.min(window.devicePixelRatio || 1, 2);
    const W = seaCanvas.clientWidth, H = seaCanvas.clientHeight;
    seaCanvas.width = W * DPR; seaCanvas.height = H * DPR;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    const g = ctx.createRadialGradient(W * 0.6, H * 0.4, 30, W * 0.6, H * 0.4, Math.max(W, H));
    if (isLight) {
      g.addColorStop(0, 'rgba(226,232,240,0.8)');
      g.addColorStop(0.55, 'rgba(241,245,249,0.6)');
      g.addColorStop(1, 'rgba(248,250,252,0)');
    } else {
      g.addColorStop(0, 'rgba(20,52,104,0.5)');
      g.addColorStop(0.55, 'rgba(8,20,46,0.32)');
      g.addColorStop(1, 'rgba(4,7,16,0)');
    }
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }

  /* ---------- boot the sea ---------- */
  if (fleetSvg && seaCanvas) {
    buildFleet();
    startDrift();
    if (allowHeavy) {
      startWater();
      wireSeaScroll();
      // continuous fleet travel while hero on screen
      let visible = true;
      if ('IntersectionObserver' in window) {
        new IntersectionObserver((e) => (visible = e[0].isIntersecting), { threshold: 0 })
          .observe(document.getElementById('hero'));
      }
      let last = performance.now();
      const travel = (now) => {
        const dt = Math.min((now - last) / 1000, 0.05); last = now;
        if (visible) fleet.forEach((o) => { o.t = (o.t + dt * o.v.spd) % 1; placeBoat(o, o.t); });
        requestAnimationFrame(travel);
      };
      requestAnimationFrame(travel);
    } else {
      // static premium fallback: place boats mid-route, draw routes fully, tap to inspect
      paintWaterStatic();
      fleet.forEach((o) => placeBoat(o, 0.6));
      window.addEventListener('resize', () => { paintWaterStatic(); fleet.forEach((o) => placeBoat(o, 0.6)); });
    }
  }

  /* -------------------------------------------------
     FAQ accordion (single open)
  ------------------------------------------------- */
  document.querySelectorAll('.faq-item').forEach((item) => {
    const q = item.querySelector('.faq-q');
    const a = item.querySelector('.faq-a');
    q.addEventListener('click', () => {
      const open = item.classList.contains('open');
      document.querySelectorAll('.faq-item.open').forEach((other) => {
        if (other !== item) {
          other.classList.remove('open');
          other.querySelector('.faq-q').setAttribute('aria-expanded', 'false');
          other.querySelector('.faq-a').style.maxHeight = null;
        }
      });
      item.classList.toggle('open', !open);
      q.setAttribute('aria-expanded', String(!open));
      a.style.maxHeight = open ? null : a.scrollHeight + 'px';
    });
  });

  /* -------------------------------------------------
     CARD spotlight — pointer-follow glow
  ------------------------------------------------- */
  if (canHover) {
    document.querySelectorAll('.feature-card').forEach((card) => {
      card.addEventListener('pointermove', (e) => {
        const r = card.getBoundingClientRect();
        card.style.setProperty('--mx', ((e.clientX - r.left) / r.width) * 100 + '%');
        card.style.setProperty('--my', ((e.clientY - r.top) / r.height) * 100 + '%');
      });
    });
  }
})();
