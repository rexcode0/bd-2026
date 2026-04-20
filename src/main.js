/**
 * main.js — Application bootstrap and event orchestration
 */

import './style.css';
import { initStarfield, resetAll, getProgress } from './starfield.js';
import { initMemories, showMemory } from './memories.js';
import { showSection, showToast, setProgress, hideHint, drawFinalConstellation } from './ui.js';

let memoriesData = null;
let allMemoriesDiscovered = false;
let allConstellationActivated = false;

// ─── Bootstrap ─────────────────────────────────────────────
async function init() {
  // Load memory data
  const res = await fetch('/memories.json');
  memoriesData = await res.json();
  window.__memoryData = memoriesData;  // starfield reads edges from here

  // Init modules
  initMemories();

  // Apply dynamic content
  const landingHeadline = document.getElementById('landing-headline');
  if (landingHeadline && memoriesData.intro) {
    landingHeadline.innerHTML = memoriesData.intro.replace(/\n/g, '<br/>');
  }

  // Landing section canvas (decorative only)
  const landingCanvas = document.getElementById('landing-canvas');
  if (landingCanvas) {
    initLandingStars(landingCanvas);
  }

  // Bind Begin Journey button
  document.getElementById('begin-btn').addEventListener('click', beginJourney);

  // Replay button
  document.getElementById('replay-btn').addEventListener('click', replay);

  // Show landing
  showSection('landing');
}

// ─── Landing decorative starfield ─────────────────────────
function initLandingStars(canvas) {
  const ctx = canvas.getContext('2d');
  let W, H;

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  const stars = Array.from({ length: 60 }, () => ({
    x: Math.random(),
    y: Math.random(),
    r: Math.random() * 1.4 + 0.3,
    phase: Math.random() * Math.PI * 2,
    speed: 0.005 + Math.random() * 0.01,
    base: 0.3 + Math.random() * 0.6,
  }));

  let frame = 0;
  function loop() {
    ctx.clearRect(0, 0, W, H);
    // Deep space gradient BG
    const g = ctx.createRadialGradient(W * 0.5, H * 0.4, 0, W * 0.5, H * 0.5, W * 0.9);
    g.addColorStop(0, '#110e2e');
    g.addColorStop(1, '#04040f');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    for (const s of stars) {
      const a = s.base + Math.sin(frame * s.speed + s.phase) * 0.28;
      ctx.beginPath();
      ctx.arc(s.x * W, s.y * H, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(215,205,255,${Math.max(0, a)})`;
      ctx.fill();
    }
    frame++;
    requestAnimationFrame(loop);
  }
  loop();
}

// ─── Begin Journey ─────────────────────────────────────────
function beginJourney() {
  showSection('starfield-section');
  const mainCanvas = document.getElementById('main-canvas');
  initStarfield(mainCanvas, memoriesData);

  // Listen to events from canvas
  document.addEventListener('memoryActivated', onMemoryActivated);
  document.addEventListener('constellationStarActivated', onConstellationStarActivated);
}

// ─── Memory discovered ─────────────────────────────────────
function onMemoryActivated(e) {
  const mem = e.detail;
  showMemory(mem);

  if (mem.label) showToast(`✦ ${mem.label}`);

  // Track discovered memories (using a Set for unique IDs)
  if (!window._discoveredMemories) window._discoveredMemories = new Set();
  window._discoveredMemories.add(mem.id);

  if (window._discoveredMemories.size >= memoriesData.memories.length) {
    allMemoriesDiscovered = true;
  }

  updateProgress();
  checkCompletion();
}

// ─── Constellation star tapped ─────────────────────────────
function onConstellationStarActivated(e) {
  const { id, total, activated, star } = e.detail;
  showToast(`✦ Star ${activated} of ${total} discovered`);

  // If this constellation star has content, open the memory popup
  if (star && star.content) {
    showMemory({ type: 'text', content: star.content, label: star.label || null, date: null });
  }

  if (activated >= total) {
    allConstellationActivated = true;
  }
  updateProgress();
  checkCompletion();
}

function updateProgress() {
  setProgress(getProgress());
}

// ─── Completion check ──────────────────────────────────────
function checkCompletion() {
  if (allMemoriesDiscovered && allConstellationActivated) {
    triggerFinalReveal();
    return;
  }
  const progress = getProgress();
  if (progress >= 1) {
    triggerFinalReveal();
  }
}

function triggerFinalReveal() {
  // Small delay for drama
  setTimeout(() => {
    showSection('final-reveal');
    
    // Apply dynamic final content
    const revealText = document.getElementById('reveal-text');
    if (revealText && memoriesData.final) {
      revealText.innerHTML = `<p class="reveal-line3">${memoriesData.final.replace(/\n/g, '<br/>')}</p>`;
    }

    drawFinalConstellation(
      memoriesData.constellation,
      memoriesData.constellationEdges
    );
  }, 1200);
}

// ─── Replay ────────────────────────────────────────────────
function replay() {
  resetAll();
  allMemoriesDiscovered = false;
  allConstellationActivated = false;
  setProgress(0);

  // Remove listeners to avoid duplicates
  document.removeEventListener('memoryActivated', onMemoryActivated);
  document.removeEventListener('constellationStarActivated', onConstellationStarActivated);

  showSection('landing');
  setTimeout(() => {
    document.getElementById('begin-btn').focus();
  }, 600);
}

// ─── Start ─────────────────────────────────────────────────
init();
