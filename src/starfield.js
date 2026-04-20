/**
 * starfield.js — Canvas-based star rendering engine
 * Handles: background stars, memory stars, twinkling, hit detection
 */

const STAR_COUNT = 85;
const MEMORY_STAR_RADIUS = 5;
const HIT_RADIUS = 44;             // px — for memory stars (generous)
const CONSTELLATION_HIT_RADIUS = 24; // px — tighter for closely-packed constellation stars
const TWINKLE_SPEED_MIN = 0.004;
const TWINKLE_SPEED_MAX = 0.014;

let canvas, ctx, W, H;
let stars = [];           // background stars
let memoryStars = [];     // loaded from memories.json
let constellationStars = []; // heart constellation points
let activatedMemoryIds = new Set();
let activatedConstellationIds = new Set();
let animId = null;

// ─── Utilities ────────────────────────────────────────────
function rand(min, max) { return Math.random() * (max - min) + min; }
function lerp(a, b, t) { return a + (b - a) * t; }

// Map constellation relative coords (0-1) to a square viewport-centered box
// so the heart never distorts on portrait/landscape screens.
function constellationPx(c) {
  const size = Math.min(W, H) * 0.62;
  const ox = (W - size) / 2;
  const oy = H / 2 - 0.40 * size; // vertically center the heart
  return { x: ox + c.x * size, y: oy + c.y * size };
}

// ─── Initialization ────────────────────────────────────────
export function initStarfield(canvasEl, memoriesData) {
  canvas = canvasEl;
  ctx = canvas.getContext('2d');
  memoryStars = memoriesData.memories;
  constellationStars = memoriesData.constellation;

  resize();
  buildBackgroundStars();
  window.addEventListener('resize', () => { resize(); buildBackgroundStars(); });

  // Input handling
  canvas.addEventListener('click', handleInteraction);
  canvas.addEventListener('touchend', (e) => {
    e.preventDefault();
    const t = e.changedTouches[0];
    const rect = canvas.getBoundingClientRect();
    handleInteraction({ clientX: t.clientX, clientY: t.clientY, rect });
  }, { passive: false });

  startLoop();
}

function resize() {
  W = canvas.width  = window.innerWidth;
  H = canvas.height = window.innerHeight;
}

// ─── Star Construction ─────────────────────────────────────
function makeStar() {
  const phase = rand(0, Math.PI * 2);
  return {
    x: rand(0, 1),
    y: rand(0, 1),
    r: rand(0.4, 1.8),
    alpha: rand(0.3, 0.9),
    phase,
    speed: rand(TWINKLE_SPEED_MIN, TWINKLE_SPEED_MAX),
    baseAlpha: rand(0.3, 0.8),
  };
}

function buildBackgroundStars() {
  stars = Array.from({ length: STAR_COUNT }, makeStar);
}

// ─── Draw Pass ─────────────────────────────────────────────
let t = 0;

function draw() {
  ctx.clearRect(0, 0, W, H);

  // Draw background gradient
  const grad = ctx.createRadialGradient(W * 0.5, H * 0.5, 0, W * 0.5, H * 0.5, W * 0.85);
  grad.addColorStop(0, '#0e0d2a');
  grad.addColorStop(1, '#04040f');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  t += 1;

  // ── Background stars ──
  for (const s of stars) {
    const alpha = s.baseAlpha + Math.sin(t * s.speed + s.phase) * 0.3;
    ctx.beginPath();
    ctx.arc(s.x * W, s.y * H, s.r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(220, 210, 255, ${Math.max(0, alpha)})`;
    ctx.fill();
  }

  // ── Constellation lines (only between activated pairs) ──
  const edges = window.__memoryData?.constellationEdges || [];
  for (const [a, b] of edges) {
    if (activatedConstellationIds.has(a) && activatedConstellationIds.has(b)) {
      const starA = constellationStars.find(s => s.id === a);
      const starB = constellationStars.find(s => s.id === b);
      if (!starA || !starB) continue;
      const pA = constellationPx(starA), pB = constellationPx(starB);
      ctx.beginPath();
      ctx.moveTo(pA.x, pA.y);
      ctx.lineTo(pB.x, pB.y);
      ctx.strokeStyle = `rgba(217,128,250,${0.4 + 0.15 * Math.sin(t * 0.03)})`;
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 6]);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  // ── Constellation stars ──
  for (const c of constellationStars) {
    const { x: cx, y: cy } = constellationPx(c);
    const activated = activatedConstellationIds.has(c.id);
    const pulse = 0.6 + 0.4 * Math.sin(t * 0.04 + cx);

    if (activated) {
      // Outer glow
      const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, 18);
      glow.addColorStop(0, `rgba(217,128,250,${0.5 * pulse})`);
      glow.addColorStop(1, 'transparent');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(cx, cy, 18, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Ripple effect for non-activated stars
      for (let i = 0; i < 2; i++) {
        const rippleT = (t * 0.5 + i * 40) % 100;
        const rippleRadius = 3 + rippleT * 0.28;
        const rippleAlpha = Math.max(0, 1 - rippleT / 100);
        ctx.beginPath();
        ctx.arc(cx, cy, rippleRadius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(217,128,250,${rippleAlpha * 0.5})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }

    // Star dot
    ctx.beginPath();
    ctx.arc(cx, cy, activated ? 4 : 3, 0, Math.PI * 2);
    ctx.fillStyle = activated
      ? `rgba(217,128,250,${0.8 + 0.2 * pulse})`
      : `rgba(170,150,230,${0.35 + 0.15 * Math.sin(t * 0.03 + cy)})`;
    ctx.fill();
  }

  // ── Memory stars ──
  for (const m of memoryStars) {
    const mx = m.x * W, my = m.y * H;
    const discovered = activatedMemoryIds.has(m.id);
    const pulse = 0.5 + 0.5 * Math.sin(t * 0.05 + mx * 0.01);

    // Glow ring
    const glowSize = discovered ? 22 : 14 + 4 * pulse;
    const glowGrad = ctx.createRadialGradient(mx, my, 0, mx, my, glowSize);
    if (discovered) {
      glowGrad.addColorStop(0, `rgba(244,114,182,0.5)`);
      glowGrad.addColorStop(1, 'transparent');
    } else {
      glowGrad.addColorStop(0, `rgba(217,128,250,${0.35 * pulse})`);
      glowGrad.addColorStop(1, 'transparent');
    }
    ctx.fillStyle = glowGrad;
    ctx.beginPath();
    ctx.arc(mx, my, glowSize, 0, Math.PI * 2);
    ctx.fill();

    // Core dot
    ctx.beginPath();
    ctx.arc(mx, my, discovered ? MEMORY_STAR_RADIUS + 1 : MEMORY_STAR_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = discovered ? '#f0c0ff' : `rgba(230,200,255,${0.7 + 0.2 * pulse})`;
    ctx.fill();

    // Center bright point
    ctx.beginPath();
    ctx.arc(mx, my, 1.5, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();
  }
}

function startLoop() {
  if (animId) cancelAnimationFrame(animId);
  function loop() {
    draw();
    animId = requestAnimationFrame(loop);
  }
  loop();
}

export function stopLoop() {
  if (animId) { cancelAnimationFrame(animId); animId = null; }
}

// ─── Interaction ────────────────────────────────────────────
function handleInteraction(e) {
  const rect = canvas.getBoundingClientRect();
  const px = e.clientX - rect.left;
  const py = e.clientY - rect.top;

  // Check memory stars first
  let nearest = null, nearestDist = Infinity;
  for (const m of memoryStars) {
    const dx = m.x * W - px, dy = m.y * H - py;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < HIT_RADIUS && dist < nearestDist) {
      nearest = m;
      nearestDist = dist;
    }
  }
  if (nearest) {
    activatedMemoryIds.add(nearest.id);
    canvas.dispatchEvent(new CustomEvent('memoryActivated', { bubbles: true, detail: nearest }));
    return;
  }

  // Check constellation stars — find nearest within tight radius
  let nearestC = null, nearestCDist = Infinity;
  for (const c of constellationStars) {
    const pos = constellationPx(c);
    const dx = pos.x - px, dy = pos.y - py;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < CONSTELLATION_HIT_RADIUS && dist < nearestCDist) {
      nearestC = c;
      nearestCDist = dist;
    }
  }
  if (nearestC) {
    if (!activatedConstellationIds.has(nearestC.id)) {
      activatedConstellationIds.add(nearestC.id);
      canvas.dispatchEvent(new CustomEvent('constellationStarActivated', {
        bubbles: true,
        detail: { id: nearestC.id, total: constellationStars.length, activated: activatedConstellationIds.size, star: nearestC }
      }));
    }
  }
}

export function getProgress() {
  const total = memoryStars.length + constellationStars.length;
  const done  = activatedMemoryIds.size + activatedConstellationIds.size;
  return total > 0 ? done / total : 0;
}

export function resetAll() {
  activatedMemoryIds.clear();
  activatedConstellationIds.clear();
  t = 0;
}
