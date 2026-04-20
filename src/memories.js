/**
 * memories.js — Memory card popup manager
 */

let overlay, card, body, closeBtn;

export function initMemories() {
  overlay  = document.getElementById('memory-overlay');
  card     = document.getElementById('memory-card');
  body     = document.getElementById('memory-body');
  closeBtn = document.getElementById('memory-close');

  // Close on overlay click (outside card)
  overlay.addEventListener('click', (e) => {
    if (!card.contains(e.target)) closeMemory();
  });
  closeBtn.addEventListener('click', closeMemory);

  // Close on ESC
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeMemory();
  });
}

export function showMemory(data) {
  body.innerHTML = renderMemoryBody(data);
  overlay.setAttribute('aria-hidden', 'false');
  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeMemory() {
  overlay.classList.remove('open');
  overlay.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

function renderMemoryBody(data) {
  if (data.type === 'image') {
    return `
      <div class="memory-image-wrap">
        <img src="${data.image}" alt="${data.content}" loading="lazy" />
      </div>
      ${data.label ? `<p class="memory-label">${data.label}</p>` : ''}
      <p class="memory-text">"${data.content}"</p>
      ${data.date ? `<p class="memory-date">${data.date}</p>` : ''}
    `;
  }
  // Default: text
  return `
    <div class="memory-star-icon">✦</div>
    ${data.label ? `<p class="memory-label">${data.label}</p>` : ''}
    <p class="memory-text">"${data.content}"</p>
    ${data.date ? `<p class="memory-date">${data.date}</p>` : ''}
  `;
}
