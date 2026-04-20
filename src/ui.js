/**
 * ui.js — Section transitions, toast notifications, landing animation
 */

const SECTIONS = ['landing', 'starfield-section', 'final-reveal'];

let currentSection = 'landing';
let toastTimer = null;

// ─── Section Transitions ───────────────────────────────────
export function showSection(id) {
  SECTIONS.forEach(sId => {
    const el = document.getElementById(sId);
    el.classList.remove('active');
  });

  setTimeout(() => {
    const target = document.getElementById(id);
    target.classList.add('active');
    currentSection = id;
  }, id === 'final-reveal' ? 200 : 100);
}

// ─── Toast notifications ───────────────────────────────────
export function showToast(message) {
  const toast = document.getElementById('star-toast');
  toast.textContent = message;
  toast.classList.add('show');
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2400);
}

// ─── Progress bar ──────────────────────────────────────────
export function setProgress(ratio) {
  const fill = document.getElementById('progress-fill');
  if (fill) fill.style.width = `${Math.round(ratio * 100)}%`;
}

// ─── Hint fade ─────────────────────────────────────────────
export function hideHint() {
  const hint = document.getElementById('hint-text');
  if (hint) hint.style.opacity = '0';
}

export function showHint() {
  const hint = document.getElementById('hint-text');
  if (hint) hint.style.opacity = '1';
}

// ─── Final constellation canvas ────────────────────────────
export function drawFinalConstellation(constellationData, edgesData) {
  const canvas = document.getElementById('constellation-full');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;

  // Square bounding box — same logic as starfield.js so shape matches
  function px(c) {
    const size = Math.min(W, H) * 0.88;
    const ox = (W - size) / 2;
    const oy = H / 2 - 0.40 * size;
    return { x: ox + c.x * size, y: oy + c.y * size };
  }

  let frame = 0;
  function animate() {
    ctx.clearRect(0, 0, W, H);
    const pulse = 0.6 + 0.4 * Math.sin(frame * 0.05);
    frame++;

    // Lines
    for (const [a, b] of edgesData) {
      const sA = constellationData.find(s => s.id === a);
      const sB = constellationData.find(s => s.id === b);
      if (!sA || !sB) continue;
      const pA = px(sA), pB = px(sB);
      ctx.beginPath();
      ctx.moveTo(pA.x, pA.y);
      ctx.lineTo(pB.x, pB.y);
      ctx.strokeStyle = `rgba(217,128,250,${0.30 * pulse})`;
      ctx.lineWidth = 1.2;
      ctx.setLineDash([3, 5]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Stars
    for (const c of constellationData) {
      const { x: cx, y: cy } = px(c);
      // Subtle soft glow
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, 8);
      g.addColorStop(0, `rgba(230,180,255,${0.45 * pulse})`);
      g.addColorStop(1, 'transparent');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(cx, cy, 8, 0, Math.PI * 2);
      ctx.fill();
      // Core dot
      ctx.beginPath();
      ctx.arc(cx, cy, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = '#ffe8ff';
      ctx.fill();
      // Bright center
      ctx.beginPath();
      ctx.arc(cx, cy, 1, 0, Math.PI * 2);
      ctx.fillStyle = '#fff';
      ctx.fill();
    }

    requestAnimationFrame(animate);
  }
  animate();
}
