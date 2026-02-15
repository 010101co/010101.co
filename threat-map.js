// 010101.co — Threat Map Live (Elite) — SIMULATION SAFE (no internal data)
(() => {
  const $ = (s) => document.querySelector(s);
  const feedEl = $("#feed");
  const yearEl = $("#year");
  const clockEl = $("#clock");
  const chipStatus = $("#chipStatus");
  const btnStart = $("#btnStart");
  const btnPause = $("#btnPause");
  const btnExport = $("#btnExport");
  const burger = document.querySelector(".burger");
  const mobileNav = document.getElementById("mobileNav");

  const threatLevelEl = $("#threatLevel");
  const signalsPerMinEl = $("#signalsPerMin");
  const regionsActiveEl = $("#regionsActive");
  const nodesMonitoredEl = $("#nodesMonitored");
  const eventsTodayEl = $("#eventsToday");
  const blockedPctEl = $("#blockedPct");

  // Mobile menu
  if (burger && mobileNav) {
    burger.addEventListener("click", () => {
      const open = mobileNav.style.display === "block";
      mobileNav.style.display = open ? "none" : "block";
      burger.setAttribute("aria-expanded", String(!open));
    });
    mobileNav.addEventListener("click", (e) => {
      if (e.target && e.target.tagName === "A") {
        mobileNav.style.display = "none";
        burger.setAttribute("aria-expanded", "false");
      }
    });
  }

  // Time
  yearEl.textContent = new Date().getFullYear();
  const tickClock = () => {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    clockEl.textContent = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  };
  setInterval(tickClock, 250);
  tickClock();

  // Background ambient FX
  const fx = document.getElementById("fx");
  const fxCtx = fx.getContext("2d");
  const fxDots = [];
  const fxN = 60;

  function resizeFx() {
    fx.width = window.innerWidth * devicePixelRatio;
    fx.height = window.innerHeight * devicePixelRatio;
  }
  resizeFx();
  window.addEventListener("resize", resizeFx);

  for (let i = 0; i < fxN; i++) {
    fxDots.push({
      x: Math.random() * fx.width,
      y: Math.random() * fx.height,
      r: 0.8 + Math.random() * 1.8,
      v: 0.25 + Math.random() * 0.7,
      a: 0.08 + Math.random() * 0.15
    });
  }

  function drawFx() {
    fxCtx.clearRect(0,0,fx.width,fx.height);
    fxCtx.globalCompositeOperation = "lighter";
    for (const p of fxDots) {
      p.y += p.v;
      if (p.y > fx.height + 20) { p.y = -20; p.x = Math.random() * fx.width; }
      const g = fxCtx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 14);
      g.addColorStop(0, `rgba(0,212,255,${p.a})`);
      g.addColorStop(1, "rgba(0,212,255,0)");
      fxCtx.fillStyle = g;
      fxCtx.beginPath();
      fxCtx.arc(p.x, p.y, p.r * 10, 0, Math.PI * 2);
      fxCtx.fill();
    }
    fxCtx.globalCompositeOperation = "source-over";
    requestAnimationFrame(drawFx);
  }
  drawFx();

  // Threat Map canvas
  const map = document.getElementById("map");
  const ctx = map.getContext("2d");
  const W = () => map.width;
  const H = () => map.height;

  // Generic global nodes (NOT client locations)
  const nodes = [
    { name:"San Francisco", x:.14, y:.34, region:"NA" },
    { name:"New York",      x:.24, y:.34, region:"NA" },
    { name:"São Paulo",     x:.30, y:.72, region:"SA" },
    { name:"London",        x:.49, y:.30, region:"EU" },
    { name:"Paris",         x:.51, y:.32, region:"EU" },
    { name:"Frankfurt",     x:.54, y:.30, region:"EU" },
    { name:"Lagos",         x:.49, y:.58, region:"AF" },
    { name:"Abidjan",       x:.47, y:.60, region:"AF" },
    { name:"Johannesburg",  x:.58, y:.82, region:"AF" },
    { name:"Dubai",         x:.66, y:.44, region:"ME" },
    { name:"Mumbai",        x:.72, y:.52, region:"ASIA" },
    { name:"Singapore",     x:.80, y:.64, region:"ASIA" },
    { name:"Tokyo",         x:.89, y:.40, region:"ASIA" },
    { name:"Sydney",        x:.90, y:.82, region:"OC" }
  ];

  const severities = [
    { key:"INFO",  col:"rgba(0,212,255,.75)" },
    { key:"MED",   col:"rgba(244,201,93,.85)" },
    { key:"HIGH",  col:"rgba(255,120,90,.90)" },
    { key:"CRIT",  col:"rgba(255,77,109,.92)" }
  ];

  const eventTypes = [
    "scan detected",
    "bruteforce pattern",
    "exploit attempt",
    "beaconing suspected",
    "credential stuffing",
    "malware callback",
    "data exfil signal",
    "abnormal geo velocity",
    "suspicious DNS burst"
  ];

  let running = false;
  let paused = false;
  let events = [];
  let attacks = [];
  let total = 0;
  let blocked = 0;

  const pick = (arr) => arr[Math.floor(Math.random()*arr.length)];

  function drawBackdrop() {
    ctx.clearRect(0,0,W(),H());

    const g = ctx.createRadialGradient(W()*0.55, H()*0.35, 40, W()*0.55, H()*0.35, W()*0.75);
    g.addColorStop(0, "rgba(0,212,255,.10)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0,0,W(),H());

    // grid
    ctx.save();
    ctx.globalAlpha = 0.08;
    ctx.strokeStyle = "rgba(234,242,255,.5)";
    ctx.lineWidth = 1;
    const step = 48;
    for (let x=0; x<W(); x+=step){ ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H()); ctx.stroke(); }
    for (let y=0; y<H(); y+=step){ ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W(),y); ctx.stroke(); }
    ctx.restore();

    // abstract blobs
    const blobs = [
      {x:.22, y:.38, r:150},
      {x:.48, y:.34, r:170},
      {x:.70, y:.50, r:190},
      {x:.86, y:.72, r:120},
      {x:.53, y:.78, r:140},
    ];
    for (const b of blobs){
      const gg = ctx.createRadialGradient(W()*b.x, H()*b.y, 10, W()*b.x, H()*b.y, b.r);
      gg.addColorStop(0, "rgba(234,242,255,.10)");
      gg.addColorStop(1, "rgba(234,242,255,0)");
      ctx.fillStyle = gg;
      ctx.beginPath(); ctx.arc(W()*b.x, H()*b.y, b.r, 0, Math.PI*2); ctx.fill();
    }
  }

  function drawNodes() {
    for (const n of nodes){
      const x = W()*n.x, y=H()*n.y;
      const gg = ctx.createRadialGradient(x,y,0,x,y,22);
      gg.addColorStop(0, "rgba(0,212,255,.35)");
      gg.addColorStop(1, "rgba(0,212,255,0)");
      ctx.fillStyle = gg;
      ctx.beginPath(); ctx.arc(x,y,18,0,Math.PI*2); ctx.fill();

      ctx.fillStyle = "rgba(234,242,255,.85)";
      ctx.beginPath(); ctx.arc(x,y,3.2,0,Math.PI*2); ctx.fill();

      ctx.font = "12px JetBrains Mono";
      ctx.fillStyle = "rgba(234,242,255,.55)";
      ctx.fillText(n.name, x+10, y-8);
    }
  }

  function bezierPoint(a, b, t) {
    const mx = (a.x + b.x) / 2;
    const my = (a.y + b.y) / 2;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const lift = 0.12 + Math.min(0.25, Math.hypot(dx,dy) * 0.18);
    const cx = mx - dy * lift;
    const cy = my + dx * lift;

    const x = (1-t)*(1-t)*a.x + 2*(1-t)*t*cx + t*t*b.x;
    const y = (1-t)*(1-t)*a.y + 2*(1-t)*t*cy + t*t*b.y;
    return {x,y,cx,cy};
  }

  function drawAttack(attack, now) {
    const start = {x:W()*attack.from.x, y:H()*attack.from.y};
    const end   = {x:W()*attack.to.x,   y:H()*attack.to.y};
    const mid = bezierPoint(start,end,0.5);

    ctx.save();
    ctx.globalAlpha = 0.65;
    ctx.strokeStyle = attack.col;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.quadraticCurveTo(mid.cx, mid.cy, end.x, end.y);
    ctx.stroke();

    const life = (now - attack.t0) / attack.ttl;
    const t = Math.min(1, Math.max(0, life));
    const p = bezierPoint(start,end,t);

    const glow = ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,26);
    glow.addColorStop(0, attack.col);
    glow.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = glow;
    ctx.globalAlpha = 0.85;
    ctx.beginPath(); ctx.arc(p.x,p.y,10,0,Math.PI*2); ctx.fill();
    ctx.restore();
  }

  function render(now) {
    drawBackdrop();
    attacks = attacks.filter(a => (now - a.t0) < a.ttl);
    for (const a of attacks) drawAttack(a, now);
    drawNodes();
    requestAnimationFrame(render);
  }
  requestAnimationFrame(render);

  function appendLine(line) {
    const current = feedEl.textContent.trimEnd();
    const lines = current.split("\n").slice(-18);
    lines.push(line);
    feedEl.textContent = lines.join("\n") + "\n";
  }

  function updateKpis() {
    eventsTodayEl.textContent = String(total);
    blockedPctEl.textContent = total ? `${Math.round((blocked/total)*100)}%` : "—";

    const last = events.slice(-15);
    const score = last.reduce((s,e) => {
      if (e.sev.key === "CRIT") return s+4;
      if (e.sev.key === "HIGH") return s+3;
      if (e.sev.key === "MED") return s+2;
      return s+1;
    }, 0);

    let lvl = "MED";
    if (score > 42) lvl = "CRIT";
    else if (score > 32) lvl = "HIGH";
    else if (score < 22) lvl = "LOW";

    threatLevelEl.textContent = lvl;
    signalsPerMinEl.textContent = String(30 + Math.floor(Math.random()*30));
    regionsActiveEl.textContent = String(12 + Math.floor(Math.random()*10));
    nodesMonitoredEl.textContent = String(96 + Math.floor(Math.random()*96));
  }

  function genEvent() {
    const now = new Date();
    const pad = (n) => String(n).padStart(2,"0");
    const time = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

    const from = pick(nodes);
    let to = pick(nodes);
    while (to === from) to = pick(nodes);

    const sev = pick(severities);
    const type = pick(eventTypes);

    const roll = Math.random();
    const action =
      roll < 0.55 ? "blocked" :
      roll < 0.78 ? "contained" :
      roll < 0.92 ? "investigating" :
      "escalated";

    total++;
    if (action === "blocked" || action === "contained") blocked++;

    const ev = { time, region: to.region, sev, type, action, from:from.name, to:to.name };
    events.push(ev);
    appendLine(`[${ev.time}] ${ev.sev.key.padEnd(4)} • region: ${ev.region.padEnd(4)} • ${ev.type} • ${ev.action}`);

    attacks.push({ from, to, col: sev.col, t0: performance.now(), ttl: 1800 + Math.random()*1200 });
    updateKpis();
  }

  function start() {
    if (running) return;
    running = true;
    paused = false;
    chipStatus.textContent = "LIVE";
    appendLine(`[+] stream: START • mode: SIMULATION_SAFE • privacy: SAFE`);
    setInterval(() => { if (!paused) genEvent(); }, 950);
  }

  function pause() {
    if (!running) return;
    paused = !paused;
    chipStatus.textContent = paused ? "PAUSED" : "LIVE";
    appendLine(paused ? "[!] stream: PAUSED" : "[+] stream: RESUMED");
  }

  function exportJson() {
    const payload = {
      exported_at: new Date().toISOString(),
      mode: "SIMULATION_SAFE",
      total_events: total,
      blocked_events: blocked,
      last_events: events.slice(-60),
      note: "Export showcase. No internal data."
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {type:"application/json"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "010101_threat-map_export.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    appendLine("[+] export: generated • file: 010101_threat-map_export.json");
  }

  btnStart.addEventListener("click", start);
  btnPause.addEventListener("click", pause);
  btnExport.addEventListener("click", exportJson);

  setTimeout(start, 900);
})();
