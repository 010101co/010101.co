// 010101.co — ELITE app.js

// Year
document.getElementById("year").textContent = new Date().getFullYear();

// Mobile menu
const burger = document.querySelector(".burger");
const mobileNav = document.getElementById("mobileNav");

if (burger && mobileNav) {
  burger.addEventListener("click", () => {
    const open = mobileNav.style.display === "grid";
    mobileNav.style.display = open ? "none" : "grid";
    burger.setAttribute("aria-expanded", String(!open));
  });

  mobileNav.querySelectorAll("a").forEach(a => {
    a.addEventListener("click", () => {
      mobileNav.style.display = "none";
      burger.setAttribute("aria-expanded", "false");
    });
  });
}

// Theme switcher (simple class toggle)
document.querySelectorAll(".mini").forEach(btn => {
  btn.addEventListener("click", () => {
    document.body.className = btn.dataset.theme || "theme-neon";
  });
});

// Soft FX (no bug / no blue blocks)
const canvas = document.getElementById("fx");
const ctx = canvas?.getContext("2d");

function resize(){
  if(!canvas) return;
  canvas.width = window.innerWidth * devicePixelRatio;
  canvas.height = window.innerHeight * devicePixelRatio;
  ctx.setTransform(devicePixelRatio,0,0,devicePixelRatio,0,0);
}
window.addEventListener("resize", resize);
resize();

let t = 0;
function loop(){
  if(!ctx || !canvas) return;
  t += 0.01;
  ctx.clearRect(0,0,window.innerWidth,window.innerHeight);

  // subtle moving glow lines
  for(let i=0;i<6;i++){
    const y = (window.innerHeight/6)*i + Math.sin(t+i)*18;
    const grad = ctx.createLinearGradient(0,y,window.innerWidth,y);
    grad.addColorStop(0,"rgba(0,212,255,0)");
    grad.addColorStop(0.5,"rgba(0,212,255,0.08)");
    grad.addColorStop(1,"rgba(0,212,255,0)");
    ctx.strokeStyle = grad;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0,y);
    ctx.lineTo(window.innerWidth,y);
    ctx.stroke();
  }

  requestAnimationFrame(loop);
}
loop();
