
(() => {
  const $ = (q, el=document) => el.querySelector(q);
  const $$ = (q, el=document) => Array.from(el.querySelectorAll(q));

  const startBtn = $('#startBtn');
  const pauseBtn = $('#pauseBtn');
  const exportBtn = $('#exportBtn');
  const socModeBtn = $('#socModeBtn');

  const levelText = $('#levelText');
  const levelDot = $('#levelDot');
  const signalsPerMin = $('#signalsPerMin');
  const regionsActive = $('#regionsActive');
  const blockedToday = $('#blockedToday');
  const nodesMonitored = $('#nodesMonitored');
  const eventsSession = $('#eventsSession');
  const blockedRate = $('#blockedRate');

  const clock = $('#clock');
  const feed = $('#feed');
  const chips = $$('.chip');

  const simToggle = $('#simToggle');
  const liveToggle = $('#liveToggle');

  const mapCanvas = $('#map');
  const mctx = mapCanvas ? mapCanvas.getContext('2d') : null;

  let running = true;
  let paused = false;
  let liveMode = false;

  // Filters
  const enabled = new Set(['geo','bruteforce','exploit','beacon','dlp']);
  chips.forEach(ch => {
    ch.addEventListener('click', () => {
      const key = ch.dataset.filter;
      if (!key) return;
      if (enabled.has(key)) enabled.delete(key); else enabled.add(key);
      ch.classList.toggle('chip--on', enabled.has(key));
    });
  });

  // SOC fullscreen mode
  if (socModeBtn) {
    socModeBtn.addEventListener('click', async () => {
      document.body.classList.toggle('soc-mode');
      try {
        if (document.body.classList.contains('soc-mode')) {
          await document.documentElement.requestFullscreen?.();
        } else {
          await document.exitFullscreen?.();
        }
      } catch(e) {}
    });
  }

  // SIM/LIVE toggles (LIVE stays showcase: still simulation, but more intense)
  const setMode = (isLive) => {
    liveMode = isLive;
    if (simToggle) simToggle.setAttribute('aria-pressed', isLive ? 'false' : 'true');
    if (liveToggle) liveToggle.setAttribute('aria-pressed', isLive ? 'true' : 'false');
    // Increase intensity in LIVE
    baseRate = isLive ? 900 : 1400;
  };
  simToggle?.addEventListener('click', () => setMode(false));
  liveToggle?.addEventListener('click', () => setMode(true));

  // Stream controls
  startBtn?.addEventListener('click', () => { paused = false; pauseBtn?.setAttribute('aria-pressed','false'); });
  pauseBtn?.addEventListener('click', () => {
    paused = !paused;
    pauseBtn?.setAttribute('aria-pressed', paused ? 'true' : 'false');
  });

  // Export JSON
  exportBtn?.addEventListener('click', () => {
    const payload = {
      meta: { mode: liveMode ? 'LIVE_SHOWCASE' : 'SIMULATION_SAFE', generatedAt: new Date().toISOString(), note: 'No internal data. Showcase simulation.' },
      session: sessionEvents.slice(-200),
      kpi: snapshot(),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {type: 'application/json'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `010101_threat_map_session_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  });

  // Clock
  const tickClock = () => {
    if (!clock) return;
    const now = new Date();
    clock.textContent = now.toLocaleTimeString('fr-FR', { hour12:false });
  };
  setInterval(tickClock, 1000);
  tickClock();

  // KPI simulation base values
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const fmtInt = (n) => n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  let threatLevel = 2; // 1 low, 2 elevated, 3 high, 4 critical
  let perMin = 34;
  let regions = 16;
  let blocked = 2847;
  let nodes = 172;
  let sessEvents = 17;
  let blockPct = 88;

  // Update UI
  function applyKpis() {
    if (signalsPerMin) signalsPerMin.textContent = String(perMin);
    if (regionsActive) regionsActive.textContent = String(regions);
    if (blockedToday) blockedToday.textContent = fmtInt(blocked);
    if (nodesMonitored) nodesMonitored.textContent = String(nodes);
    if (eventsSession) eventsSession.textContent = String(sessEvents);
    if (blockedRate) blockedRate.textContent = `${blockPct}%`;

    const levels = ['LOW','ELEVATED','HIGH','CRITICAL'];
    const colors = ['rgba(58,255,155,.95)','rgba(255,209,102,.95)','rgba(255,209,102,.95)','rgba(255,77,109,.95)'];
    const glows = ['rgba(58,255,155,.12)','rgba(255,209,102,.12)','rgba(255,209,102,.12)','rgba(255,77,109,.12)'];

    if (levelText) levelText.textContent = levels[threatLevel-1] || 'ELEVATED';
    if (levelDot) {
      levelDot.style.background = colors[threatLevel-1] || colors[1];
      levelDot.style.boxShadow = `0 0 0 7px ${glows[threatLevel-1] || glows[1]}`;
    }
  }

  // Events generator
  const regionsList = [
    {k:'NA', name:'North America'}, {k:'SA', name:'South America'}, {k:'EU', name:'Europe'},
    {k:'AF', name:'Africa'}, {k:'ME', name:'Middle East'}, {k:'ASIA', name:'Asia'}, {k:'OC', name:'Oceania'},
  ];

  const types = {
    geo: [
      'geo anomaly detected', 'unusual ASN activity', 'suspicious routing change'
    ],
    bruteforce: [
      'credential stuffing', 'bruteforce pattern', 'password spray'
    ],
    exploit: [
      'exploit attempt', 'web exploit probe', 'vulnerability scan'
    ],
    beacon: [
      'beaconing suspected', 'C2 heartbeat pattern', 'suspicious callback'
    ],
    dlp: [
      'data egress spike', 'DLP policy hit', 'exfiltration heuristic'
    ]
  };

  const verdicts = [
    {k:'blocked', w: 55},
    {k:'contained', w: 28},
    {k:'investigating', w: 12},
    {k:'escalated', w: 5},
  ];

  const sev = [
    {k:'INFO', w: 40},
    {k:'MED', w: 30},
    {k:'HIGH', w: 20},
    {k:'CRIT', w: 10},
  ];

  function pickWeighted(arr) {
    const sum = arr.reduce((s,x)=>s+x.w,0);
    let r = Math.random()*sum;
    for (const x of arr) { r -= x.w; if (r<=0) return x.k; }
    return arr[arr.length-1].k;
  }

  function randFrom(arr){ return arr[Math.floor(Math.random()*arr.length)]; }

  const sessionEvents = [];
  function addFeedLine(line) {
    if (!feed) return;
    feed.textContent += line + "\n";
    // keep last ~180 lines
    const lines = feed.textContent.split("\n");
    if (lines.length > 190) feed.textContent = lines.slice(lines.length-190).join("\n");
    feed.scrollTop = feed.scrollHeight;
  }

  // Map model
  const cities = [
    {name:'San Francisco', x:0.18, y:0.38, r:'NA'},
    {name:'New York', x:0.29, y:0.34, r:'NA'},
    {name:'Sao Paulo', x:0.34, y:0.68, r:'SA'},
    {name:'Lagos', x:0.52, y:0.56, r:'AF'},
    {name:'Abidjan', x:0.51, y:0.58, r:'AF'},
    {name:'London', x:0.52, y:0.30, r:'EU'},
    {name:'Frankfurt', x:0.56, y:0.30, r:'EU'},
    {name:'Dubai', x:0.64, y:0.42, r:'ME'},
    {name:'Mumbai', x:0.73, y:0.48, r:'ASIA'},
    {name:'Singapore', x:0.79, y:0.60, r:'ASIA'},
    {name:'Tokyo', x:0.88, y:0.40, r:'ASIA'},
    {name:'Sydney', x:0.89, y:0.78, r:'OC'},
  ];

  const arcs = []; // active arcs
  const pulses = []; // node pulses
  function spawnArc() {
    const a = randFrom(cities);
    let b = randFrom(cities);
    let tries = 0;
    while (b === a && tries++ < 4) b = randFrom(cities);
    const kindKeys = Object.keys(types).filter(k => enabled.has(k));
    const kind = kindKeys.length ? randFrom(kindKeys) : 'geo';
    const severity = pickWeighted(sev);
    const action = pickWeighted(verdicts);

    // arc intensity by severity
    const amp = severity === 'CRIT' ? 1.0 : severity === 'HIGH' ? 0.8 : severity === 'MED' ? 0.55 : 0.35;
    arcs.push({
      from: a, to: b,
      t: 0,
      speed: (liveMode ? 0.016 : 0.012) + Math.random()*0.01,
      amp,
      kind,
      severity,
      action,
    });

    // pulse at destination
    pulses.push({c:b, t:0, amp});
    const now = new Date();
    const ts = now.toLocaleTimeString('fr-FR', { hour12:false });

    const msg = randFrom(types[kind] || types.geo);
    const line = `[${ts}] ${severity.padEnd(4)} • region: ${b.r.padEnd(4)} • ${msg.padEnd(22)} • ${action}`;
    addFeedLine(line);

    // Session log
    sessionEvents.push({
      ts: now.toISOString(),
      severity, region: b.r, kind, msg, action,
      from: a.name, to: b.name
    });

    // KPIs drift
    sessEvents += 1;
    perMin = clamp(perMin + (Math.random()>.6 ? 1 : 0) - (Math.random()>.75 ? 1 : 0), 18, 70);
    regions = clamp(regions + (Math.random()>.83 ? 1 : 0) - (Math.random()>.88 ? 1 : 0), 6, 24);
    blocked += Math.floor(1 + Math.random()*7);

    // Threat level based on mix
    if (severity === 'CRIT' && Math.random() > 0.45) threatLevel = clamp(threatLevel + 1, 1, 4);
    if (severity === 'INFO' && Math.random() > 0.65) threatLevel = clamp(threatLevel - 1, 1, 4);

    // blocked %
    blockPct = clamp(blockPct + (action === 'blocked' ? 1 : -1)*(Math.random()>.7 ? 1 : 0), 71, 96);

    // nodes monitored drift
    nodes = clamp(nodes + (Math.random()>.9 ? 1 : 0) - (Math.random()>.92 ? 1 : 0), 120, 260);

    applyKpis();
  }

  function snapshot(){
    return { threatLevel, perMin, regions, blocked, nodes, sessEvents, blockPct, liveMode };
  }

  // Render map
  function resizeMapForDPR() {
    if (!mapCanvas || !mctx) return;
    const rect = mapCanvas.getBoundingClientRect();
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    mapCanvas.width = Math.floor(rect.width * dpr);
    mapCanvas.height = Math.floor(rect.height * dpr);
    mctx.setTransform(dpr,0,0,dpr,0,0);
  }

  function drawGrid(w,h) {
    mctx.save();
    mctx.globalAlpha = 0.35;
    mctx.strokeStyle = 'rgba(234,242,255,.08)';
    mctx.lineWidth = 1;

    const step = 36;
    for (let x=0; x<w; x+=step) {
      mctx.beginPath(); mctx.moveTo(x,0); mctx.lineTo(x,h); mctx.stroke();
    }
    for (let y=0; y<h; y+=step) {
      mctx.beginPath(); mctx.moveTo(0,y); mctx.lineTo(w,y); mctx.stroke();
    }
    mctx.restore();
  }

  function colorBySeverity(sev) {
    switch(sev){
      case 'CRIT': return {stroke:'rgba(255,77,109,.95)', glow:'rgba(255,77,109,.22)'};
      case 'HIGH': return {stroke:'rgba(255,209,102,.95)', glow:'rgba(255,209,102,.18)'};
      case 'MED':  return {stroke:'rgba(55,215,255,.85)', glow:'rgba(55,215,255,.16)'};
      default:     return {stroke:'rgba(55,215,255,.55)', glow:'rgba(55,215,255,.10)'};
    }
  }

  function draw() {
    if (!mapCanvas || !mctx) return;
    const rect = mapCanvas.getBoundingClientRect();
    const w = rect.width, h = rect.height;

    mctx.clearRect(0,0,w,h);

    // background glow
    const g = mctx.createRadialGradient(w*0.55,h*0.28, 20, w*0.55,h*0.28, w*0.85);
    g.addColorStop(0,'rgba(55,215,255,.12)');
    g.addColorStop(1,'rgba(0,0,0,0)');
    mctx.fillStyle = g; mctx.fillRect(0,0,w,h);

    drawGrid(w,h);

    // nodes
    for (const c of cities) {
      const x = c.x*w, y = c.y*h;
      mctx.fillStyle = 'rgba(234,242,255,.55)';
      mctx.beginPath(); mctx.arc(x,y,2.2,0,Math.PI*2); mctx.fill();
      mctx.fillStyle = 'rgba(234,242,255,.52)';
      mctx.font = '11px ui-monospace, Menlo, Monaco, Consolas, "Courier New", monospace';
      mctx.fillText(c.name, x+7, y-7);
    }

    // arcs
    for (let i=arcs.length-1; i>=0; i--) {
      const a = arcs[i];
      a.t += a.speed;
      const p = a.t;
      const fx = a.from.x*w, fy = a.from.y*h;
      const tx = a.to.x*w, ty = a.to.y*h;

      // curve control point
      const mx = (fx+tx)/2;
      const my = (fy+ty)/2;
      const dx = tx-fx, dy = ty-fy;
      const len = Math.max(1, Math.hypot(dx,dy));
      const nx = -dy/len, ny = dx/len;
      const lift = (0.12 + a.amp*0.14) * len;
      const cx = mx + nx*lift;
      const cy = my + ny*lift;

      const {stroke, glow} = colorBySeverity(a.severity);

      // arc path
      mctx.save();
      mctx.lineWidth = 2;
      mctx.strokeStyle = stroke;
      mctx.shadowColor = glow;
      mctx.shadowBlur = 16;

      mctx.beginPath();
      mctx.moveTo(fx,fy);
      mctx.quadraticCurveTo(cx,cy, tx,ty);
      mctx.stroke();

      // moving dot along curve (quadratic bezier)
      const t = clamp(p, 0, 1);
      const bx = (1-t)*(1-t)*fx + 2*(1-t)*t*cx + t*t*tx;
      const by = (1-t)*(1-t)*fy + 2*(1-t)*t*cy + t*t*ty;

      mctx.shadowBlur = 18;
      mctx.fillStyle = stroke;
      mctx.beginPath(); mctx.arc(bx,by, 3.3, 0, Math.PI*2); mctx.fill();

      mctx.restore();

      if (a.t >= 1.0) arcs.splice(i,1);
    }

    // pulses
    for (let i=pulses.length-1; i>=0; i--) {
      const p = pulses[i];
      p.t += 0.02;
      const x = p.c.x*w, y = p.c.y*h;
      const r = 8 + p.t*30;
      const alpha = Math.max(0, 0.22 - p.t*0.22);
      mctx.strokeStyle = `rgba(55,215,255,${alpha})`;
      mctx.lineWidth = 2;
      mctx.beginPath(); mctx.arc(x,y, r, 0, Math.PI*2); mctx.stroke();
      if (p.t >= 1.0) pulses.splice(i,1);
    }

    requestAnimationFrame(draw);
  }

  // Event cadence
  let baseRate = 1400;
  function loop() {
    if (!running) return;
    if (!paused) spawnArc();
    const jitter = (liveMode ? 0.55 : 0.75) + Math.random()*0.65;
    setTimeout(loop, Math.max(520, baseRate*jitter));
  }

  // init
  applyKpis();
  if (mapCanvas && mctx) {
    // Ensure proper sizing with CSS-driven width
    const ro = new ResizeObserver(() => resizeMapForDPR());
    ro.observe(mapCanvas);
    resizeMapForDPR();
    requestAnimationFrame(draw);
  }

  // Start loop a bit after boot
  setTimeout(loop, 900);

})();
