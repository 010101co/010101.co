(() => {

  // Embedded fallback feed (public, non-sensitive). Used if fetch fails.
  const EMBEDDED_FEED = {"generated_utc": "2026-02-17T18:23:38.367114Z", "note": "Sample feed. Replace /api/sample_feed.json with a real backend feed (SIEM, IDS, CTI, AbuseIPDB, etc.).", "events": [{"src_cc": "RU", "src_city": "Moscow", "dst_cc": "CI", "dst_city": "Abidjan", "type": "RDP brute force", "severity": "high"}, {"src_cc": "CN", "src_city": "Shenzhen", "dst_cc": "FR", "dst_city": "Paris", "type": "C2 beacon", "severity": "medium"}, {"src_cc": "US", "src_city": "Ashburn", "dst_cc": "GB", "dst_city": "London", "type": "Credential stuffing", "severity": "high"}, {"src_cc": "BR", "src_city": "Sao Paulo", "dst_cc": "ZA", "dst_city": "Johannesburg", "type": "Port scan", "severity": "low"}, {"src_cc": "IN", "src_city": "Mumbai", "dst_cc": "AE", "dst_city": "Dubai", "type": "Phishing", "severity": "medium"}, {"src_cc": "NG", "src_city": "Lagos", "dst_cc": "CI", "dst_city": "Abidjan", "type": "Exploit attempt", "severity": "high"}], "country_coords": {"US": [0.22, 0.4], "MX": [0.28, 0.47], "BR": [0.36, 0.78], "GB": [0.56, 0.35], "FR": [0.57, 0.39], "RU": [0.8, 0.4], "IN": [0.82, 0.55], "CN": [0.9, 0.5], "JP": [0.97, 0.41], "NG": [0.62, 0.62], "ZA": [0.83, 0.86], "CI": [0.6, 0.62], "AE": [0.72, 0.58]}};
  const $ = (s, el=document) => el.querySelector(s);
  const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Mobile menu
  const burger = $('.burger');
  const menu = $('.mobilemenu');
  if (burger && menu){
    burger.addEventListener('click', () => {
      const open = burger.getAttribute('aria-expanded') === 'true';
      burger.setAttribute('aria-expanded', String(!open));
      menu.hidden = open;
    });
    menu.addEventListener('click', (e) => {
      if (e.target && e.target.matches('a')){
        menu.hidden = true;
        burger.setAttribute('aria-expanded', 'false');
      }
    });
  }

  // Performance heuristics
  const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  const lowPower = isMobile && (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4);
  const saveData = navigator.connection && navigator.connection.saveData;
  const autoLight = prefersReduced || lowPower || saveData;

  const perfPill = $('#perfPill');
  if (perfPill){
    perfPill.textContent = `Mode: ${autoLight ? 'Light' : 'Full'}`;
  }

  // --- SOC canvas animation ---
  const socCanvas = $('#socCanvas');
  const incEl = $('#statInc');
  const hunEl = $('#statHun');
  const conEl = $('#statCon');

  function socAnim(canvas){
    const ctx = canvas.getContext('2d');
    let w=0,h=0, dpr= Math.min(2, window.devicePixelRatio || 1);
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      w = Math.max(10, Math.floor(rect.width));
      h = Math.max(10, Math.floor(rect.height));
      canvas.width = Math.floor(w*dpr);
      canvas.height = Math.floor(h*dpr);
      ctx.setTransform(dpr,0,0,dpr,0,0);
    };
    resize();
    window.addEventListener('resize', resize, {passive:true});

    let t=0;
    let inc=120, hun=38, con=97;

    function tick(){
      ctx.clearRect(0,0,w,h);

      // grid
      ctx.globalAlpha = 0.25;
      ctx.strokeStyle = '#1c2b43';
      ctx.lineWidth = 1;
      const step = 26;
      for (let x=0; x<w; x+=step){ ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,h); ctx.stroke(); }
      for (let y=0; y<h; y+=step){ ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(w,y); ctx.stroke(); }

      // signal lines
      ctx.globalAlpha = 0.85;
      ctx.strokeStyle = 'rgba(110,255,255,.55)';
      ctx.lineWidth = 1.2;
      const lines = autoLight ? 5 : 9;
      for (let i=0;i<lines;i++){
        const y = (i+1) * (h/(lines+1));
        const phase = (t*0.6) + i*18;
        ctx.beginPath();
        for (let x=0;x<=w;x+=10){
          const amp = autoLight ? 8 : 12;
          const yy = y + Math.sin((x+phase)/55)*amp;
          if (x===0) ctx.moveTo(x,yy); else ctx.lineTo(x,yy);
        }
        ctx.stroke();
      }

      // blips
      const blips = autoLight ? 10 : 22;
      for (let i=0;i<blips;i++){
        const x = (Math.sin((t+i)*0.9)+1)*0.5*w;
        const y = (Math.cos((t*0.7+i)*1.1)+1)*0.5*h;
        const r = autoLight ? 1.6 : 2.3;
        ctx.globalAlpha = 0.65;
        ctx.fillStyle = '#6fe8ff';
        ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fill();
      }

      // stats update
      if (!autoLight && (t % 25 < 0.18)){
        inc += (Math.random() < 0.55) ? 1 : 0;
        hun += (Math.random() < 0.35) ? 1 : 0;
        con += (Math.random() < 0.40) ? 1 : 0;
      } else if (autoLight && (t % 45 < 0.18)){
        inc += (Math.random() < 0.35) ? 1 : 0;
        hun += (Math.random() < 0.20) ? 1 : 0;
        con += (Math.random() < 0.22) ? 1 : 0;
      }
      if (incEl) incEl.textContent = String(inc);
      if (hunEl) hunEl.textContent = String(hun);
      if (conEl) conEl.textContent = String(con);

      t += 0.16;
      if (!prefersReduced) requestAnimationFrame(tick);
    }
    tick();
  }

  if (socCanvas){
    if (!prefersReduced) socAnim(socCanvas);
  }

  // --- Threat Map Live ---
  const mapCanvas = $('#mapCanvas');
  const feed = $('#feed');
  const mapMode = $('#mapMode');
  const toggleMap = $('#toggleMap');
  const toggleMotion = $('#toggleMotion');
  const mapWrap = $('#mapWrap');
  const mapLabels = $('#mapLabels');

  let forceMotion = 'auto'; // auto|on|off

      let externalFeed = null;
      let externalIdx = 0;

  function mapShouldAnimate(){
    if (forceMotion === 'off') return false;
    if (forceMotion === 'on') return true;
    return !autoLight && !prefersReduced;
  }

  async function loadExternalFeed(){
    // By default, loads a local JSON feed (replace with your own endpoint, e.g. /api/threatfeed).
    // IMPORTANT: For true real-time data, serve the feed from your backend (SIEM/IDS/CTI) or a proxy (Cloudflare Worker) due to CORS/rate limits.
    try{
      const FEED_URL = (window.__THREAT_FEED_URL__ || 'api/sample_feed.json');
      const res = await fetch(FEED_URL, {cache:'no-store'});
      if (!res.ok) throw new Error('feed http ' + res.status);
      const data = await res.json();
      if (!data || !Array.isArray(data.events)) return null;
      return data;
    } catch(e){
      return null;
    }
  }

      function createFeedLine(){
  // If external feed is available, cycle through it for "real" events (served by your backend).
  const now = new Date();
  const ts = now.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit', second:'2-digit'});

  if (externalFeed && externalFeed.events && externalFeed.events.length){
    const ev = externalFeed.events[externalIdx % externalFeed.events.length];
    externalIdx++;
    const r = `${ev.src_cc}${ev.src_city ? ' • ' + ev.src_city : ''}`;
    const t = ev.type || 'Threat event';
    const g = `${ev.dst_cc}${ev.dst_city ? ' • ' + ev.dst_city : ''}`;
    return {ts, r, t, g, severity: ev.severity || 'medium'};
  }

  const regions = ['US', 'EU', 'MEA', 'APAC', 'LATAM'];
  const types = ['RDP brute', 'Phishing', 'C2 beacon', 'Exploit', 'Credential stuff', 'Port scan', 'DNS tunnel'];
  const targets = ['Finance', 'Industry', 'Cloud', 'M365', 'VPN', 'WebApp', 'OT/ICS'];
  const r = regions[Math.floor(Math.random()*regions.length)];
  const t = types[Math.floor(Math.random()*types.length)];
  const g = targets[Math.floor(Math.random()*targets.length)];
  return {ts, r, t, g, severity: 'low'};
}


  function pushFeed(){
    if (!feed) return;
    const item = createFeedLine();
    const line = document.createElement('div');
    line.className = 'feedline';
    const sev = item.severity || 'low';
        const sevTag = (sev==='high') ? 'HIGH' : (sev==='medium') ? 'MED' : 'LOW';
        line.innerHTML = `<span><b>${item.r}</b> • ${item.t} → ${item.g}</span><span>${sevTag} • ${item.ts}</span>`;
    feed.prepend(line);
    while (feed.children.length > 10) feed.removeChild(feed.lastChild);
  }

  
  function setCountryLabels(activeCC){
    if (!mapLabels) return;
    if (!externalFeed || !externalFeed.country_coords) { mapLabels.innerHTML=''; return; }
    const rect = mapWrap ? mapWrap.getBoundingClientRect() : null;
    if (!rect) return;
    const coords = externalFeed.country_coords;

    // Always show some key labels + any active ones
    const base = ['US','CA','BR','GB','FR','DE','ES','RU','TR','EG','NG','CI','ZA','IN','CN','JP','KR','AU','SA','AE'];
    const wanted = new Set(base);
    if (activeCC) activeCC.forEach(cc => wanted.add(cc));

    mapLabels.innerHTML = '';
    wanted.forEach(cc => {
      const xy = coords[cc];
      if (!xy) return;
      const el = document.createElement('div');
      el.className = 'maplabel' + (activeCC && activeCC.has(cc) ? ' maplabel--hot' : '');
      el.textContent = cc;
      el.style.left = (xy[0]*100) + '%';
      el.style.top  = (xy[1]*100) + '%';
      mapLabels.appendChild(el);
    });
  }

  function threatMap(canvas){
    const ctx = canvas.getContext('2d');
    let w=0,h=0, dpr= Math.min(2, window.devicePixelRatio || 1);
    const points = [];
    const arcs = [];
    const stars = [];
    let hubs = [
      {x:0.18, y:0.42, cc:'US'},
      {x:0.50, y:0.37, cc:'EU'},
      {x:0.62, y:0.50, cc:'MEA'},
      {x:0.78, y:0.44, cc:'APAC'},
      {x:0.36, y:0.78, cc:'LATAM'},
    ];

    const palette = [
      {core:'#8b5cff', glow:'rgba(139,92,255,0.85)'},
      {core:'#00e5ff', glow:'rgba(0,229,255,0.80)'},
      {core:'#ff2bd6', glow:'rgba(255,43,214,0.75)'}
    ];


    function rebuildHubsFromFeed(){
      if (!externalFeed || !externalFeed.country_coords) return;
      const entries = Object.entries(externalFeed.country_coords);
      if (!entries.length) return;
      // Build hubs from country coordinates (normalized in [0..1])
      hubs = entries.slice(0, 60).map(([cc,xy]) => ({cc, x: xy[0], y: xy[1]}));
    }

    function rand(min,max){ return Math.random()*(max-min)+min; }
    function toXY(p){ return {x: p.x*w, y: p.y*h}; }

    function resize(){
      const rect = canvas.getBoundingClientRect();
      w = Math.max(10, Math.floor(rect.width));
      h = Math.max(10, Math.floor(rect.height));
      canvas.width = Math.floor(w*dpr);
      canvas.height = Math.floor(h*dpr);
      ctx.setTransform(dpr,0,0,dpr,0,0);
    }
    resize();
    window.addEventListener('resize', resize, {passive:true});

    for (let i=0;i< (autoLight? 120: 220); i++){
      points.push({ x: rand(0.08,0.92)*w, y: rand(0.18,0.82)*h, r: rand(0.8, 2.2), a: rand(0.15, 0.8) });
    }
    for (let i=0;i< (autoLight? 140: 220); i++){
      stars.push({ x: rand(0,w), y: rand(0,h), a: rand(0.06,0.22) });
    }

    function spawnArc(){
      const a = hubs[Math.floor(Math.random()*hubs.length)];
      let b = hubs[Math.floor(Math.random()*hubs.length)];
      if (b===a) b = hubs[(hubs.indexOf(a)+1)%hubs.length];
      const A = toXY(a), B = toXY(b);
      const mid = { x: (A.x+B.x)/2 + rand(-80,80), y: (A.y+B.y)/2 + rand(-60,60) };
      const c = palette[Math.floor(Math.random()*palette.length)];
      arcs.push({ A, B, mid, t: 0, speed: autoLight ? rand(0.006,0.012) : rand(0.01,0.02), life: autoLight ? rand(0.9, 1.2) : rand(1.0, 1.6), color: c.core, glow: c.glow });
      pushFeed();
    }

    for (let i=0;i< (autoLight? 5: 12); i++) spawnArc();

    let time=0;
    function quadPoint(A, M, B, t){
      const x = (1-t)*(1-t)*A.x + 2*(1-t)*t*M.x + t*t*B.x;
      const y = (1-t)*(1-t)*A.y + 2*(1-t)*t*M.y + t*t*B.y;
      return {x,y};
    }

    function draw(){
      ctx.clearRect(0,0,w,h);

      const grd = ctx.createRadialGradient(w*0.5, h*0.45, 10, w*0.5, h*0.45, Math.max(w,h)*0.65);
      grd.addColorStop(0, 'rgba(255,59,48,0.08)');
      grd.addColorStop(0.6, 'rgba(0,0,0,0)');
      grd.addColorStop(1, 'rgba(0,0,0,0.10)');
      ctx.fillStyle = grd;
      ctx.fillRect(0,0,w,h);

      ctx.fillStyle = '#e9f8ff';
      for (const s of stars){
        ctx.globalAlpha = s.a;
        ctx.fillRect(s.x, s.y, 1, 1);
      }

      for (const p of points){
        ctx.globalAlpha = p.a;
        ctx.fillStyle = '#6fe8ff';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI*2);
        ctx.fill();
      }

      for (let i=arcs.length-1;i>=0;i--){
        const arc = arcs[i];
        arc.t += arc.speed;

        // --- neon arc path (violent glow) ---
        const core = arc.color || '#8b5cff';   // violet
        const glow = arc.glow  || 'rgba(139,92,255,0.85)';

        // glow stroke
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = autoLight ? 0.22 : 0.34;
        ctx.strokeStyle = glow;
        ctx.lineWidth = autoLight ? 3.2 : 4.2;
        ctx.shadowBlur = autoLight ? 14 : 22;
        ctx.shadowColor = glow;
        ctx.beginPath();
        ctx.moveTo(arc.A.x, arc.A.y);
        ctx.quadraticCurveTo(arc.mid.x, arc.mid.y, arc.B.x, arc.B.y);
        ctx.stroke();

        // core stroke
        ctx.globalAlpha = autoLight ? 0.55 : 0.78;
        ctx.shadowBlur = autoLight ? 6 : 10;
        ctx.lineWidth = autoLight ? 1.2 : 1.6;
        ctx.strokeStyle = core;
        ctx.beginPath();
        ctx.moveTo(arc.A.x, arc.A.y);
        ctx.quadraticCurveTo(arc.mid.x, arc.mid.y, arc.B.x, arc.B.y);
        ctx.stroke();
        ctx.restore();

        // moving particle on the arc
        const tt = Math.min(1, arc.t);
        const P = quadPoint(arc.A, arc.mid, arc.B, tt);
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.92;
        ctx.fillStyle = core;
        ctx.shadowBlur = autoLight ? 10 : 18;
        ctx.shadowColor = glow;
        ctx.beginPath();
        ctx.arc(P.x, P.y, autoLight ? 2.4 : 3.2, 0, Math.PI*2);
        ctx.fill();
        ctx.restore();

        // impact ring
        if (tt >= 1){
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = autoLight ? 0.35 : 0.55;
          ctx.strokeStyle = glow;
          ctx.lineWidth = 1.2;
          ctx.shadowBlur = autoLight ? 10 : 18;
          ctx.shadowColor = glow;
          ctx.beginPath();
          ctx.arc(arc.B.x, arc.B.y, autoLight ? 12 : 18, 0, Math.PI*2);
          ctx.stroke();
          ctx.restore();
        }

        if (arc.t > arc.life) arcs.splice(i,1);
      }

if (mapMode){
        mapMode.textContent = `Mode: ${mapShouldAnimate() ? (autoLight ? 'Light' : 'Full') : 'Static'}`;
      }

      if (mapShouldAnimate()){
        const interval = autoLight ? 48 : 26;
        if (Math.floor(time) % interval === 0 && Math.random() < 0.22){
          if (arcs.length < (autoLight? 10: 22)) spawnArc();
        }
        time += 1;
        requestAnimationFrame(draw);
      }
    }

    draw();

    return { redrawStatic(){ const prev = forceMotion; forceMotion = 'off'; draw(); forceMotion = prev; } };
  }

  let mapCtl = null;
  if (mapCanvas){
    mapCtl = threatMap(mapCanvas);
    for (let i=0;i<6;i++) pushFeed();
    setInterval(() => { if (Math.random() < 0.65) pushFeed(); }, autoLight ? 2400 : 1600);
  }

  if (toggleMap && mapWrap){
    toggleMap.addEventListener('click', async () => {
      try{
        if (document.fullscreenElement){
          await document.exitFullscreen();
          toggleMap.textContent = 'Plein écran';
        } else {
          await mapWrap.requestFullscreen();
          toggleMap.textContent = 'Quitter';
        }
      } catch(e){}
    });
  }

  if (toggleMotion){
    const setLabel = () => {
      toggleMotion.textContent = `Animations: ${forceMotion === 'auto' ? 'Auto' : (forceMotion === 'on' ? 'On' : 'Off')}`;
    };
    setLabel();
    toggleMotion.addEventListener('click', () => {
      forceMotion = (forceMotion === 'auto') ? 'on' : (forceMotion === 'on' ? 'off' : 'auto');
      setLabel();
      if (forceMotion === 'off' && mapCtl) mapCtl.redrawStatic();
      if (forceMotion === 'on') window.dispatchEvent(new Event('resize'));
    });
  }

  // Smooth anchors
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute('href').slice(1);
    const el = document.getElementById(id);
    if (!el) return;
    e.preventDefault();
    el.scrollIntoView({behavior: prefersReduced ? 'auto' : 'smooth', block:'start'});
  });
})();
