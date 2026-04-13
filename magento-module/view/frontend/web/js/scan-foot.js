// Voetscan modal — opent camera-input, stuurt foto naar /api/scan/foot, toont resultaat.
// Exposeert: openFootScan({ onApply }) — waar onApply(scanData) wordt aangeroepen
// wanneer de gebruiker "Toepassen" klikt.

import { renderPrivacyStrip, bindPrivacyInfo } from './privacy-info.js';

const API_BASE = (() => {
  if (window.HERQUA_CONFIG?.backendUrl) return window.HERQUA_CONFIG.backendUrl;
  if (location.port === '8080') return 'http://localhost:3000';
  return '';
})();
const API_URL = `${API_BASE}/api/scan/foot`;

const WIDTH_LABEL = { narrow: 'Smal', standard: 'Standaard', wide: 'Breed' };
const ARCH_LABEL  = { flat: 'Platte boog', normal: 'Normale boog', high: 'Hoge boog' };

function buildOverlay(innerHtml) {
  const overlay = document.createElement('div');
  overlay.className = 'scan-overlay';
  overlay.innerHTML = `<div class="scan-modal">
    <div class="scan-header">
      <h2>🦶 Voetscan met Herman</h2>
      <button class="scan-close" aria-label="Sluiten">×</button>
    </div>
    ${renderPrivacyStrip('foot')}
    <div class="scan-body">${innerHtml}</div>
  </div>`;
  bindPrivacyInfo(overlay);
  overlay.querySelector('.scan-close').addEventListener('click', () => overlay.remove());
  return overlay;
}

function renderChoice(overlay, mode, onUpload) {
  overlay.querySelector('.scan-body').innerHTML = `
    <h3>Kies je methode</h3>
    <p>Met A4-papier meet Herman ook je schoenmaat. Zonder meet hij alleen breedte en boog.</p>
    <div class="choice-tiles">
      <button class="choice-tile recommended" data-mode="a4">
        <div class="t-title">📏 Met A4-papier</div>
        <div class="t-sub">Maat + breedte + boog</div>
      </button>
      <button class="choice-tile" data-mode="no-scale">
        <div class="t-title">Zonder A4</div>
        <div class="t-sub">Alleen breedte + boog</div>
      </button>
    </div>`;
  overlay.querySelectorAll('[data-mode]').forEach((btn) => {
    btn.addEventListener('click', () => renderInstructions(overlay, btn.dataset.mode === 'a4', mode, onUpload));
  });
}

function renderInstructions(overlay, withA4, entryMode, onUpload) {
  const captureAttr = entryMode === 'camera' ? 'capture="environment"' : '';
  const iconHint = entryMode === 'camera' ? '📷' : '📁';
  const titleHint = entryMode === 'camera' ? 'Tik om camera te openen' : 'Tik om foto te kiezen';
  const subHint = entryMode === 'camera' ? 'Of kies een foto uit je galerij' : 'Uit je galerij';

  const instructions = withA4
    ? renderA4Instructions()
    : renderPlainInstructions();

  overlay.querySelector('.scan-body').innerHTML = `
    <h3>${withA4 ? 'Zo meet je met een A4' : 'Zo maak je de foto'}</h3>
    ${instructions}
    <label class="upload-card">
      <input type="file" accept="image/*" ${captureAttr} id="foot-photo-input">
      <div class="up-icon">${iconHint}</div>
      <div class="up-text">${titleHint}</div>
      <div class="up-sub">${subHint}</div>
    </label>`;

  overlay.querySelector('#foot-photo-input').addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await handleFile(overlay, file, withA4, entryMode, onUpload);
  });
}

function renderA4Instructions() {
  return `
    <ol class="scan-steps">
      <li><strong>Leg een A4-papier</strong> op een vlakke, effen vloer.</li>
      <li><strong>Zet je blote voet plat op het papier</strong>, met de hiel tegen de korte onderkant van de A4.</li>
      <li><strong>Houd de camera loodrecht boven</strong> je voet, ongeveer 40 cm hoogte.</li>
      <li>Zorg dat de <strong>hele A4 én je voet in beeld</strong> zijn. Goede verlichting, geen schaduwen.</li>
    </ol>
    <div class="scan-illustration" aria-hidden="true">
      <svg viewBox="0 0 260 180" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Voet op A4-papier, camera loodrecht erboven">
        <!-- Camera icon -->
        <g transform="translate(110,10)">
          <rect x="0" y="6" width="40" height="24" rx="4" fill="#3a3938"/>
          <circle cx="20" cy="18" r="7" fill="#fff"/>
          <circle cx="20" cy="18" r="4" fill="#3a3938"/>
          <rect x="13" y="2" width="14" height="6" rx="1" fill="#3a3938"/>
        </g>
        <!-- Dotted arrow: camera to foot -->
        <line x1="130" y1="38" x2="130" y2="70" stroke="#2e85c7" stroke-width="2" stroke-dasharray="3 3"/>
        <polygon points="126,68 134,68 130,74" fill="#2e85c7"/>
        <text x="138" y="56" font-family="system-ui,sans-serif" font-size="10" fill="#2e85c7" font-weight="700">~40 cm</text>
        <!-- A4 paper (top-down) -->
        <rect x="70" y="78" width="120" height="90" rx="2" fill="#ffffff" stroke="#b3b3b2" stroke-width="1.5"/>
        <text x="180" y="94" font-family="system-ui,sans-serif" font-size="8" fill="#b3b3b2" text-anchor="end">A4</text>
        <!-- Foot silhouette on paper -->
        <g transform="translate(130,160) rotate(180)">
          <path d="M 0 0
                   C -14 2, -18 -12, -18 -28
                   C -18 -48, -12 -66, 0 -66
                   C 12 -66, 18 -48, 18 -28
                   C 18 -12, 14 2, 0 0 Z"
                fill="#ffd4bc" stroke="#c97a4a" stroke-width="1.2"/>
          <!-- Toes -->
          <circle cx="-11" cy="-62" r="3" fill="#ffd4bc" stroke="#c97a4a" stroke-width="0.8"/>
          <circle cx="-4"  cy="-65" r="3.5" fill="#ffd4bc" stroke="#c97a4a" stroke-width="0.8"/>
          <circle cx="3"   cy="-65" r="3" fill="#ffd4bc" stroke="#c97a4a" stroke-width="0.8"/>
          <circle cx="9"   cy="-63" r="2.5" fill="#ffd4bc" stroke="#c97a4a" stroke-width="0.8"/>
          <circle cx="14"  cy="-60" r="2" fill="#ffd4bc" stroke="#c97a4a" stroke-width="0.8"/>
        </g>
        <!-- Heel callout -->
        <line x1="130" y1="168" x2="210" y2="168" stroke="#d4443c" stroke-width="1" stroke-dasharray="2 2"/>
        <text x="214" y="171" font-family="system-ui,sans-serif" font-size="9" fill="#d4443c" font-weight="700">hiel op rand</text>
      </svg>
    </div>`;
}

function renderPlainInstructions() {
  return `
    <ol class="scan-steps">
      <li>Maak een foto van je <strong>blote voet op een contrasterende ondergrond</strong> (bv. donkere vloer als je lichte huid hebt).</li>
      <li><strong>Loodrecht van bovenaf</strong>, ongeveer 40 cm hoogte.</li>
      <li>Zorg voor <strong>goede verlichting</strong> en geen schaduwen.</li>
    </ol>`;
}

async function resizeImage(file, maxDim = 1600) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        const ratio = Math.min(maxDim / width, maxDim / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      const canvas = document.createElement('canvas');
      canvas.width = width; canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);
      canvas.toBlob((blob) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.toString().replace(/^data:image\/[a-z]+;base64,/, ''));
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      }, 'image/jpeg', 0.85);
    };
    img.onerror = reject;
    img.src = url;
  });
}

async function handleFile(overlay, file, withA4, entryMode, onUpload) {
  overlay.querySelector('.scan-body').innerHTML = `
    <div class="loading"><div class="spinner"></div>
    <p style="margin-top:12px;"><strong>Herman meet je voet…</strong></p></div>`;

  try {
    const b64 = await resizeImage(file);
    const resp = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image_base64: b64, with_a4_scale: withA4 }),
    });
    const data = await resp.json();
    if (data.confidence === 'low' || !data.width_class) {
      renderError(overlay, data.message_to_user || 'De foto was niet goed bruikbaar. Probeer opnieuw.', withA4, entryMode, onUpload);
      return;
    }
    renderResult(overlay, data, onUpload);
  } catch (err) {
    renderError(overlay, 'Er ging iets mis. Probeer opnieuw.', withA4, entryMode, onUpload);
  }
}

function renderError(overlay, message, withA4, entryMode, onUpload) {
  overlay.querySelector('.scan-body').innerHTML = `
    <h3>Even opnieuw</h3>
    <p>${message}</p>
    <div class="scan-actions">
      <button class="btn-primary" data-retry>Opnieuw proberen</button>
    </div>`;
  overlay.querySelector('[data-retry]').addEventListener('click', () => renderInstructions(overlay, withA4, entryMode, onUpload));
}

function renderResult(overlay, data, onApply) {
  const rows = [];
  if (data.eu_size) rows.push(`<div class="result-row"><span class="label">EU maat</span><span class="value">${data.eu_size}</span></div>`);
  rows.push(`<div class="result-row"><span class="label">Breedte</span><span class="value">${WIDTH_LABEL[data.width_class] || data.width_class}</span></div>`);
  rows.push(`<div class="result-row"><span class="label">Boogtype</span><span class="value">${ARCH_LABEL[data.arch_type] || data.arch_type}</span></div>`);

  overlay.querySelector('.scan-body').innerHTML = `
    <h3>Herman's meting</h3>
    <div class="scan-result">${rows.join('')}</div>
    <div class="scan-confirm">✓ Je foto is inmiddels verwijderd.</div>
    <div class="scan-actions">
      <button class="btn-primary" data-apply>Toepassen</button>
    </div>`;

  overlay.querySelector('[data-apply]').addEventListener('click', () => {
    onApply({
      eu_size: data.eu_size || null,
      width: data.width_class,
      arch: data.arch_type,
    });
    overlay.remove();
  });
}

export function openFootScan({ mode = 'camera', onApply }) {
  const overlay = buildOverlay('');
  document.body.appendChild(overlay);
  // Beide modi bieden nog steeds A4-keuze — de "mode" bepaalt alleen of capture="environment" gebruikt wordt
  renderChoice(overlay, mode, onApply);
}
