
(() => {
  const year = document.getElementById('year');
  if (year) year.textContent = String(new Date().getFullYear());

  // Burger -> mobile nav toggle
  const burger = document.querySelector('.burger');
  const mobileNav = document.getElementById('mobileNav');
  if (burger && mobileNav) {
    burger.addEventListener('click', () => {
      const expanded = burger.getAttribute('aria-expanded') === 'true';
      burger.setAttribute('aria-expanded', expanded ? 'false' : 'true');
      mobileNav.style.display = expanded ? '' : 'flex';
    });
  }

  // Subtle background particles (safe, lightweight)
  const fx = document.getElementById('fx');
  if (fx) {
    const ctx = fx.getContext('2d');
    const resize = () => { fx.width = innerWidth; fx.height = innerHeight; };
    addEventListener('resize', resize, { passive: true });
    resize();

    const pts = Array.from({length: Math.min(120, Math.floor(innerWidth/10))}, () => ({
      x: Math.random()*fx.width,
      y: Math.random()*fx.height,
      r: 1 + Math.random()*2.4,
      a: 0.05 + Math.random()*0.18,
      vx: (-0.2 + Math.random()*0.4),
      vy: (-0.15 + Math.random()*0.3),
    }));

    const tick = () => {
      ctx.clearRect(0,0,fx.width, fx.height);
      ctx.fillStyle = 'rgba(55,215,255,.09)';
      for (const p of pts) {
        p.x += p.vx; p.y += p.vy;
        if (p.x < -20) p.x = fx.width+20;
        if (p.x > fx.width+20) p.x = -20;
        if (p.y < -20) p.y = fx.height+20;
        if (p.y > fx.height+20) p.y = -20;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI*2);
        ctx.fill();
      }
      requestAnimationFrame(tick);
    };
    tick();
  }

  // Boot overlay (only on threat-map)
  const boot = document.getElementById('boot');
  if (boot) {
    const linesEl = document.getElementById('bootLines');
    const fillEl = document.getElementById('bootFill');
    const skipBtn = document.getElementById('bootSkip');

    const steps = [
      'Initializing sensors…',
      'Loading threat intelligence feeds…',
      'Warming correlation engine…',
      'Enabling simulation_safe mode…',
      'Hardening privacy guardrails…',
      'Starting event stream…',
      'Threat map ready.',
    ];

    let pct = 0;
    let i = 0;
    const addLine = (txt) => {
      if (!linesEl) return;
      const now = new Date();
      const ts = now.toLocaleTimeString('fr-FR', { hour12:false });
      linesEl.textContent += `[${ts}] ${txt}\n`;
      linesEl.scrollTop = linesEl.scrollHeight;
    };

    addLine('010101.co SOC Console — boot');
    const timer = setInterval(() => {
      pct = Math.min(100, pct + (8 + Math.random()*14));
      if (fillEl) fillEl.style.width = pct.toFixed(0) + '%';

      if (i < steps.length && (pct > (i+1)*(100/steps.length) - 6)) {
        addLine(steps[i++]);
      }
      if (pct >= 100) {
        clearInterval(timer);
        setTimeout(() => {
          boot.classList.add('is-hidden');
        }, 350);
      }
    }, 240);

    const closeBoot = () => boot.classList.add('is-hidden');
    if (skipBtn) skipBtn.addEventListener('click', closeBoot);
    boot.addEventListener('click', (e) => {
      if (e.target === boot) closeBoot();
    });
    addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeBoot();
    });
  }
})();
