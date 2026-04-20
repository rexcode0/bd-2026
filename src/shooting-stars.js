/**
 * shooting-stars.js — Global atmospheric shooting star background
 * Lightweight canvas implementation that runs across all sections.
 */

class ShootingStar {
  constructor(canvasWidth, canvasHeight) {
    this.W = canvasWidth;
    this.H = canvasHeight;
    this.reset();
    
    // Initial delay so they don't all appear at once
    this.delay = Math.random() * 8000;
  }

  reset() {
    // Start somewhere off the top/left edge
    this.x = Math.random() * this.W - this.W * 0.2;
    this.y = Math.random() * this.H - this.H * 0.5;
    
    // Diagonal movement
    this.length = Math.random() * 80 + 20;
    this.speed = Math.random() * 10 + 5;
    
    // Variables for fading in/out
    this.opacity = 0;
    this.fadeRate = Math.random() * 0.02 + 0.01;
    this.active = false;
    this.delay = Math.random() * 6000 + 2000; // Time before reappearing
  }

  update(dt) {
    if (this.delay > 0) {
      this.delay -= dt;
      if (this.delay <= 0) {
        this.active = true;
      }
      return;
    }

    if (!this.active) return;

    this.x += this.speed;
    this.y += this.speed; // 45 degree diagonal
    
    // Fade in, then fade out
    if (this.opacity < 1 && this.x < this.W * 0.5) {
      this.opacity += this.fadeRate;
    } else {
      this.opacity -= this.fadeRate * 0.5;
    }

    // Reset when off screen or fully faded
    if (this.opacity <= 0 || this.x > this.W + this.length || this.y > this.H + this.length) {
      this.reset();
    }
  }

  draw(ctx) {
    if (!this.active || this.opacity <= 0) return;

    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, this.opacity));
    
    // Gradient tail
    const gradient = ctx.createLinearGradient(this.x, this.y, this.x - this.length, this.y - this.length);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)'); // Bright head
    gradient.addColorStop(0.1, 'rgba(217, 128, 250, 0.8)'); // Primary color
    gradient.addColorStop(1, 'rgba(217, 128, 250, 0)'); // Faded tail

    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.x - this.length, this.y - this.length);
    ctx.strokeStyle = gradient;
    ctx.lineWidth = 1.5;
    ctx.lineCap = 'round';
    ctx.stroke();
    
    ctx.restore();
  }
}

export function initShootingStars() {
  // Check for reduced motion preference
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReducedMotion) {
    console.log("Shooting stars disabled due to prefers-reduced-motion");
    return;
  }

  const canvas = document.getElementById('global-shooting-stars');
  if (!canvas) return;
  const ctx = canvas.getContext('2d', { alpha: true });

  let W, H;
  const resize = () => {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
  };
  resize();
  window.addEventListener('resize', resize);

  // Configuration
  const STAR_COUNT = window.innerWidth > 768 ? 4 : 2; // Fewer on mobile
  const stars = Array.from({ length: STAR_COUNT }, () => new ShootingStar(W, H));
  
  // Background static stars for depth
  const bgStars = Array.from({ length: 30 }, () => ({
    x: Math.random(),
    y: Math.random(),
    r: Math.random() * 1.2 + 0.1,
    alpha: Math.random() * 0.5 + 0.1,
    twinkleSpeed: Math.random() * 0.02 + 0.01,
    phase: Math.random() * Math.PI * 2
  }));

  let lastTime = performance.now();
  
  function animate(time) {
    const dt = time - lastTime;
    lastTime = time;

    // Clear with a slight fade to allow very subtle trails (optional, currently disabled by clearing fully)
    ctx.clearRect(0, 0, W, H);

    // Draw faint static background stars
    for (const bg of bgStars) {
        const twinkle = bg.alpha + Math.sin(time * bg.twinkleSpeed + bg.phase) * 0.2;
        ctx.beginPath();
        ctx.arc(bg.x * W, bg.y * H, bg.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(220, 210, 255, ${Math.max(0, twinkle)})`;
        ctx.fill();
    }

    // Draw and update shooting stars
    for (const star of stars) {
      star.update(dt);
      star.draw(ctx);
    }

    requestAnimationFrame(animate);
  }

  requestAnimationFrame(animate);
}
