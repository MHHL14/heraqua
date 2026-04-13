// Herqua Schoenadviseur v2a — entry point.
import { createWizard } from './wizard.js';
import { renderResult } from './result.js';

// Kies API-basis:
//  - Magento embed → window.HERQUA_CONFIG.backendUrl
//  - Lokaal met python http.server op :8080 → Node proxy op :3000
//  - Anders (Vercel, same-origin) → relatief
const API_BASE = (() => {
  if (window.HERQUA_CONFIG?.backendUrl) return window.HERQUA_CONFIG.backendUrl;
  if (location.port === '8080') return 'http://localhost:3000';
  return '';
})();
const API_URL = `${API_BASE}/api/recommend`;

async function onComplete(profile) {
  const mainEl = document.getElementById('widget-main');
  const progressBar = document.getElementById('progress-bar');
  const footer = document.getElementById('step-footer');
  progressBar.style.width = '100%';
  footer.style.display = 'none';

  mainEl.innerHTML = `<div class="loading">
    <div class="spinner"></div>
    <div><strong>Herman analyseert je profiel…</strong></div>
    <div class="helper" style="margin-top:8px;">Dit duurt een paar seconden.</div>
  </div>`;

  try {
    const resp = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profile),
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();
    renderResult(data, profile);
  } catch (err) {
    console.error(err);
    mainEl.innerHTML = `<div class="error"><p><strong>Er ging iets mis.</strong></p><p>${err.message}</p><button class="btn-primary" onclick="location.reload()">Opnieuw proberen</button></div>`;
  }
}

const wizard = createWizard({ onComplete });
wizard.render();
