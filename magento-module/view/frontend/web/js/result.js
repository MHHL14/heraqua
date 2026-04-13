// Renderer voor de resultaat-pagina van de Herqua Schoenadviseur v2a.

const HERMAN = { name: 'Herman', initial: 'H', role: 'Herqua expert' };
const LOGO_URL = 'https://www.herqua.nl/media/logo/stores/1/LogoHerquaSports-Kleur-wit_DEF.png';

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function renderMedia(r) {
  const p = r.product || {};
  if (p.matched && p.image_url) {
    return `<img src="${escapeHtml(p.image_url)}" alt="${escapeHtml(p.name || r.model)}">`;
  }
  return '<span>👟</span>';
}

function renderBadges(r, sizeHint) {
  const rankClass = r.rank === 1 ? 'badge rank best' : 'badge rank';
  const rankText = r.rank === 1 ? `#1 · Beste match` : `#${r.rank}`;
  const urgency = r.rank === 1 && sizeHint
    ? `<span class="badge urgency">Nog 3 in maat ${escapeHtml(sizeHint)}</span>`
    : '';
  return `<div class="badges-top"><span class="${rankClass}">${rankText}</span>${urgency}</div>`;
}

function renderCard(r, sizeHint) {
  const p = r.product || {};
  const displayName = p.matched && p.name ? p.name : `${r.brand} ${r.model}`;
  // Alleen exacte website-prijs tonen, geen price_range fallback
  const priceText = p.matched && p.price ? escapeHtml(p.price) : '';
  const searchUrl = `https://www.herqua.nl/catalogsearch/result/?q=${encodeURIComponent(r.brand + ' ' + r.model)}`;
  const targetUrl = p.matched && p.product_url ? escapeHtml(p.product_url) : searchUrl;
  const ctaPrimary = `<a class="cta-primary" href="${targetUrl}" target="_blank" rel="noopener">Koop bij Herqua →</a>`;

  const whyItems = (r.why_for_you || []).map((w) => `<li>${escapeHtml(w)}</li>`).join('');

  return `<div class="card ${r.rank === 1 ? 'top' : ''}">
    <div class="media">
      ${renderBadges(r, sizeHint)}
      ${renderMedia(r)}
    </div>
    <div class="card-body">
      <div class="brand-line">${escapeHtml(r.brand)}</div>
      <h3 class="card-title">${escapeHtml(displayName)}</h3>
      <div class="why-title">
        <div class="mono-avatar">${HERMAN.initial}</div>
        Waarom ${HERMAN.name} deze kiest voor jou
      </div>
      <ul class="why-list">${whyItems}</ul>
      ${priceText ? `<div class="price-row"><div class="price">${priceText}</div><div class="stock">● Op voorraad</div></div>` : ''}
      <div class="cta-row">
        ${ctaPrimary}
      </div>
    </div>
  </div>`;
}

function renderExpertNote(text) {
  if (!text) return '';
  return `<div class="expert-note">
    <div class="note-avatar">${HERMAN.initial}</div>
    <div>
      <strong>Persoonlijke tip van ${HERMAN.name}:</strong> ${escapeHtml(text)}
      <div class="signed">— ${HERMAN.name}, jouw Herqua hardloopexpert</div>
    </div>
  </div>`;
}

export function renderResult(data, profile) {
  const widget = document.getElementById(window.HERQUA_CONTAINER_ID || 'herqua-adviseur');
  const sizeHint = profile?.shoe_size;
  const cards = (data.recommendations || []).map((r) => renderCard(r, sizeHint)).join('');

  widget.innerHTML = `
    <div class="result-hero">
      <div class="left">
        <img class="logo" src="${LOGO_URL}" alt="Herqua Sports">
        <h2 class="result-title">Jouw top 3 hardloopschoenen</h2>
        <div class="result-sub">PERSOONLIJK ADVIES VAN ${HERMAN.name.toUpperCase()}</div>
      </div>
      <div class="expert-pill">
        <div class="avatar-lg">${HERMAN.initial}</div>
        <div>
          <div class="name">${HERMAN.name}</div>
          <div class="role">${HERMAN.role}</div>
        </div>
      </div>
    </div>
    <div class="result-body">
      ${renderExpertNote(data.pronation_note || data.personal_tip)}
      ${cards}
    </div>
    <div class="social-proof-strip">
      <div class="sp-item"><div class="num">8.8</div><div class="lbl">Klantbeoordeling</div></div>
      <div class="sp-item"><div class="num">1.000+</div><div class="lbl">Schoenen op voorraad</div></div>
      <div class="sp-item"><div class="num">40 jaar</div><div class="lbl">Hardloopexpertise</div></div>
    </div>
    <div class="result-actions">
      <button class="btn-restart" onclick="location.reload()">Opnieuw beginnen</button>
    </div>`;
}
