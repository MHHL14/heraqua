// Shared privacy-strip + info-modal component.
// Exposeert: renderPrivacyStrip(scanType) → HTML string; bindPrivacyInfo(rootEl).

const PRIVACY_CONTENT = {
  foot: {
    title: 'Hoe beschermen we jouw privacy?',
    bullets: [
      '<strong>Je foto wordt niet opgeslagen.</strong> Na de analyse (±3 seconden) wordt hij direct weggegooid — hij komt niet in een database, niet in een back-up, niet op ons dashboard.',
      '<strong>Alleen Herman en Claude (onze AI) bekijken je foto</strong> voor het meten van maat, breedte en boog. Geen mens bij Herqua kijkt mee.',
      '<strong>Geen persoonsherkenning.</strong> De AI meet een voet, niks meer.',
      '<strong>Versleutelde verbinding (HTTPS)</strong> tijdens het uploaden.',
    ],
    flow: '📱  →  🔒  →  ☁️ AI  →  🗑️',
    closing: 'Vertrouw je het niet? Sla deze scan over en vul handmatig in — je advies werkt ook zonder.',
  },
  gait: {
    title: 'Hoe beschermen we jouw privacy?',
    bullets: [
      '<strong>Jouw video verlaat je telefoon niet.</strong> De analyse gebeurt in je browser.',
      '<strong>Alleen anonieme bewegingspunten worden verstuurd</strong> (heup/knie/voet-coördinaten, ~50 KB JSON) — geen video, geen foto, geen gezicht.',
      '<strong>De video wordt na de analyse automatisch verwijderd</strong> uit je browser-geheugen.',
      '<strong>Geen opslag bij Herqua of onze AI.</strong> Alleen de bewegingspatronen worden geïnterpreteerd, daarna weggegooid.',
    ],
    flow: '📱 (video blijft hier)  →  🔢 keypoints  →  ☁️ AI  →  🗑️',
    closing: 'Vertrouw je het niet? Sla deze scan over en kies zelf je pronatie — je advies werkt ook zonder.',
  },
};

export function renderPrivacyStrip(scanType) {
  return `<div class="privacy-strip">
    <div class="pv-text">🔒 <span>Jouw beelden blijven privé</span></div>
    <button class="pv-info-btn" data-privacy-info="${scanType}">ℹ️ Hoe?</button>
  </div>`;
}

export function bindPrivacyInfo(rootEl) {
  rootEl.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-privacy-info]');
    if (!btn) return;
    openInfoModal(btn.dataset.privacyInfo);
  });
}

function openInfoModal(scanType) {
  const content = PRIVACY_CONTENT[scanType] || PRIVACY_CONTENT.foot;
  const overlay = document.createElement('div');
  overlay.className = 'info-overlay';
  overlay.innerHTML = `
    <div class="info-modal" role="dialog" aria-modal="true" aria-labelledby="info-modal-title">
      <div class="info-modal-header">
        <h3 id="info-modal-title">${content.title}</h3>
        <button class="info-modal-close" aria-label="Sluiten" data-close-info>×</button>
      </div>
      <div class="info-modal-body">
        <div class="flow-diagram">${content.flow}</div>
        <ul>${content.bullets.map((b) => `<li>${b}</li>`).join('')}</ul>
        <p class="closing-note">${content.closing}</p>
      </div>
      <div class="info-modal-footer">
        <button class="btn-primary" data-close-info>Begrepen</button>
      </div>
    </div>`;
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay || e.target.closest('[data-close-info]')) {
      overlay.remove();
    }
  });
  document.body.appendChild(overlay);
}
