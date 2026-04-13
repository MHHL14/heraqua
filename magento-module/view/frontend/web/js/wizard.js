// Wizard state machine voor de Herqua Schoenadviseur v2b.
// Exposeert: createWizard({onComplete}) → { render, state }.

const STEPS = [
  {
    id: 'experience',
    question: 'Hoe zou je jezelf omschrijven als hardloper?',
    type: 'single',
    helper: 'Dit helpt Herman de juiste schoen voor je te kiezen.',
    options: [
      { value: 'beginner',  label: 'Beginner',         sublabel: 'Ik start of loop <6 maanden', icon: '🌱' },
      { value: 'recreant',  label: 'Recreatief',       sublabel: 'Ik loop regelmatig voor plezier', icon: '🏃' },
      { value: 'serieus',   label: 'Serieus',          sublabel: 'Ik train op tijd/afstand', icon: '🎯' },
      { value: 'wedstrijd', label: 'Wedstrijdloper',   sublabel: 'Ik wil presteren', icon: '🏆' },
    ],
  },
  {
    id: 'terrain',
    question: 'Waar loop je het meest?',
    type: 'single',
    options: [
      { value: 'weg',   label: 'Weg / Asfalt',      sublabel: 'Straat, fietspad, trottoir', icon: '🛣️' },
      { value: 'trail', label: 'Trail / Onverhard', sublabel: 'Bos, zandpad, heide', icon: '🌲' },
      { value: 'mix',   label: 'Mix van beide',     sublabel: 'Ik wissel af', icon: '🔀' },
      { value: 'baan',  label: 'Atletiekbaan',      sublabel: 'Intervaltraining op de baan', icon: '🏟️' },
    ],
  },
  {
    id: 'goal',
    question: 'Wat is je belangrijkste doel?',
    type: 'single',
    options: [
      { value: 'comfort',   label: 'Comfort & Plezier',    sublabel: 'Lekker lopen zonder blessures', icon: '😊' },
      { value: 'afstand',   label: 'Meer afstand',         sublabel: 'Half marathon, marathon of verder', icon: '📏' },
      { value: 'snelheid',  label: 'Sneller worden',       sublabel: "PR's en wedstrijdtijden verbeteren", icon: '⚡' },
      { value: 'starten',   label: 'Beginnen met hardlopen', sublabel: 'Mijn eerste schoenen kiezen', icon: '👟' },
    ],
  },
  {
    id: 'pronation',
    question: 'Ken je jouw loopstijl (pronatie)?',
    type: 'pronation',
    helper: 'Dit bepaalt of je een stabiliteits- of neutrale schoen nodig hebt.',
    options: [
      { value: 'neutraal',     label: 'Neutraal',     sublabel: 'Gelijkmatige slijtage', icon: '⬇️' },
      { value: 'overpronatie', label: 'Overpronatie', sublabel: 'Kantelt naar binnen', icon: '↙️' },
      { value: 'supinatie',    label: 'Supinatie',    sublabel: 'Kantelt naar buiten', icon: '↘️' },
      { value: 'onbekend',     label: 'Weet ik niet', sublabel: 'Herman neemt aan', icon: '❓' },
    ],
  },
  {
    id: 'body',
    question: 'Wat is je maat, gewicht en geslacht?',
    type: 'body',
    helper: 'Maat kan Herman meten uit een foto — de rest vul je zelf in.',
    fields: [
      { id: 'shoe_size',  label: 'Schoenmaat (EU)',      type: 'select', options: Array.from({ length: 15 }, (_, i) => String(36 + i)) },
      { id: 'weight',     label: 'Gewicht (kg)',         type: 'number', placeholder: '75', min: 30, max: 200 },
      { id: 'gender',     label: 'Geslacht',             type: 'select', options: ['Heren', 'Dames'] },
    ],
  },
  {
    id: 'preferences',
    question: 'Heb je nog voorkeuren?',
    type: 'multi',
    helper: 'Optioneel — kies er geen, één of meerdere.',
    options: [
      { value: 'lichtgewicht', label: 'Lichtgewicht' },
      { value: 'veel_demping', label: 'Veel demping' },
      { value: 'breed',        label: 'Brede pasvorm' },
      { value: 'duurzaam',     label: 'Duurzaam/recycled' },
      { value: 'opvallend',    label: 'Opvallende kleur' },
      { value: 'budget',       label: 'Budget (<€100)' },
      { value: 'premium',      label: 'Premium' },
    ],
  },
];

const PRONATION_NL = { neutral: 'neutraal', over: 'overpronatie', supination: 'supinatie' };

export function createWizard({ onComplete }) {
  const state = { stepIndex: 0, profile: { preferences: [] } };
  const mainEl = document.getElementById('widget-main');
  const progressBar = document.getElementById('progress-bar');
  const stepPill = document.getElementById('step-pill');
  const btnBack = document.getElementById('btn-back');

  btnBack.addEventListener('click', () => {
    if (state.stepIndex > 0) { state.stepIndex--; render(); }
  });

  function updateChrome() {
    const pct = Math.round((state.stepIndex / STEPS.length) * 100);
    progressBar.style.width = `${pct}%`;
    stepPill.textContent = `Schoenadvies · Stap ${state.stepIndex + 1} / ${STEPS.length}`;
    btnBack.disabled = state.stepIndex === 0;
  }

  const TRUST_STRIP_HTML = `
    <div class="wizard-trust-strip">
      <div class="wts-note">Vertrouwd door</div>
      <div class="wts-items">
        <div class="wts-item"><div class="wts-num">8.8</div><div class="wts-lbl">Klantbeoordeling</div></div>
        <div class="wts-item"><div class="wts-num">1.000+</div><div class="wts-lbl">Schoenen op voorraad</div></div>
        <div class="wts-item"><div class="wts-num">40 jaar</div><div class="wts-lbl">Expertise</div></div>
      </div>
    </div>`;

  function wrap(step, bodyHtml, submitHtml = '') {
    mainEl.innerHTML = `
      <div class="step-content">
        <span class="step-label">Stap ${state.stepIndex + 1} van ${STEPS.length}</span>
        <h3 class="q">${step.question}</h3>
        ${step.helper ? `<div class="helper">${step.helper}</div>` : ''}
        ${bodyHtml}
        ${submitHtml ? `<div style="margin-top:22px;display:flex;justify-content:flex-end;">${submitHtml}</div>` : ''}
      </div>
      ${TRUST_STRIP_HTML}`;
  }

  function renderSingle(step) {
    const current = state.profile[step.id];
    const html = `<div class="choices">${step.options.map((o) => `
      <button class="choice ${current === o.value ? 'selected' : ''}" data-value="${o.value}">
        <span class="icon">${o.icon || ''}</span>
        <span><span class="lbl">${o.label}</span><span class="sub">${o.sublabel || ''}</span></span>
      </button>`).join('')}</div>`;
    wrap(step, html);
    mainEl.querySelectorAll('.choice').forEach((el) => {
      el.addEventListener('click', () => {
        state.profile[step.id] = el.dataset.value;
        next();
      });
    });
  }

  function renderPronation(step) {
    const gait = state.profile._gait_scan;
    const current = state.profile[step.id];

    let bodyHtml = '';

    if (gait) {
      const nl = PRONATION_NL[gait.pronation] || 'gemeten';
      bodyHtml += `<div class="scan-applied-chip">
        <span>✓ <strong>Gemeten door Herman</strong> — ${nl}${gait.cadence_spm ? ` · ${gait.cadence_spm} spm` : ''}</span>
        <button data-scan-reset="gait">Opnieuw scannen</button>
      </div>`;
    } else {
      bodyHtml += `<div class="hero-scan">
        <div class="hs-icon">📹</div>
        <div>
          <div class="hs-title">Laat Herman het voor je meten</div>
          <p class="hs-desc">15-sec video → pronatie, landing en cadans. Veel preciezer dan zelf inschatten.</p>
        </div>
        <div class="hs-actions">
          <button class="hs-btn-white" data-scan-gait="record">📷 Opnemen →</button>
          <button class="hs-btn-ghost" data-scan-gait="upload">📁 Video uploaden</button>
        </div>
        <div class="hs-privacy">🔒 Video verlaat je toestel niet — alleen bewegingspunten worden geanalyseerd</div>
      </div>
      <div class="scan-divider">of kies zelf</div>`;
    }

    bodyHtml += `<div class="mini-choices">${step.options.map((o) => `
      <button class="mini-choice ${current === o.value ? 'selected' : ''}" data-value="${o.value}">
        <span class="mc-label">${o.icon} ${o.label}</span>
        <span class="mc-sub">${o.sublabel || ''}</span>
      </button>`).join('')}</div>`;

    wrap(step, bodyHtml);

    mainEl.querySelectorAll('.mini-choice').forEach((el) => {
      el.addEventListener('click', () => {
        state.profile[step.id] = el.dataset.value;
        next();
      });
    });
    mainEl.querySelectorAll('[data-scan-gait]').forEach((el) => {
      el.addEventListener('click', async () => {
        const mode = el.dataset.scanGait; // "record" | "upload"
        const { openGaitScan } = await import('./scan-gait.js');
        openGaitScan({
          mode,
          onApply: (gaitScan) => {
            state.profile._gait_scan = gaitScan;
            state.profile.pronation = PRONATION_NL[gaitScan.pronation] || state.profile.pronation;
            render();
          },
        });
      });
    });
    mainEl.querySelectorAll('[data-scan-reset]').forEach((el) => {
      el.addEventListener('click', () => {
        delete state.profile._gait_scan;
        render();
      });
    });
  }

  function renderBody(step) {
    const foot = state.profile._foot_scan;
    let bodyHtml = '';

    if (foot) {
      const size = foot.eu_size ? `maat ${foot.eu_size}` : '';
      const width = foot.width === 'wide' ? ', brede pasvorm' : '';
      bodyHtml += `<div class="scan-applied-chip">
        <span>✓ <strong>Gescand door Herman</strong> — ${size}${width}</span>
        <button data-scan-reset="foot">Opnieuw scannen</button>
      </div>`;
    } else {
      bodyHtml += `<div class="hero-scan">
        <div class="hs-icon">🦶</div>
        <div>
          <div class="hs-title">Laat Herman je voet meten</div>
          <p class="hs-desc">Eén foto van je voet (met of zonder A4) → maat, breedte en boog, in 10 seconden.</p>
        </div>
        <div class="hs-actions">
          <button class="hs-btn-white" data-scan-foot="camera">📷 Camera →</button>
          <button class="hs-btn-ghost" data-scan-foot="upload">📁 Foto uploaden</button>
        </div>
        <div class="hs-privacy">🔒 Foto wordt niet opgeslagen — direct weggegooid na analyse</div>
      </div>
      <div class="scan-divider">of vul handmatig in</div>`;
    }

    bodyHtml += `<div class="mini-fields">${step.fields.map((f) => {
      const val = state.profile[f.id] ?? '';
      if (f.type === 'select') {
        return `<div class="mini-field">
          <label for="fld-${f.id}">${f.label}</label>
          <select id="fld-${f.id}" data-id="${f.id}">
            <option value="">—</option>
            ${f.options.map((o) => `<option value="${o}" ${val === o ? 'selected' : ''}>${o}</option>`).join('')}
          </select>
        </div>`;
      }
      return `<div class="mini-field">
        <label for="fld-${f.id}">${f.label}</label>
        <input id="fld-${f.id}" data-id="${f.id}" type="${f.type}" placeholder="${f.placeholder || ''}" ${f.min != null ? `min="${f.min}"` : ''} ${f.max != null ? `max="${f.max}"` : ''} value="${val}">
      </div>`;
    }).join('')}</div>`;

    const submit = `<button class="btn-primary" data-action="next" disabled>Volgende →</button>`;
    wrap(step, bodyHtml, submit);

    const inputs = mainEl.querySelectorAll('[data-id]');
    const nextBtn = mainEl.querySelector('[data-action="next"]');
    function validate() {
      let ok = true;
      inputs.forEach((el) => {
        state.profile[el.dataset.id] = el.value;
        if (!el.value) ok = false;
      });
      nextBtn.disabled = !ok;
    }
    inputs.forEach((el) => { el.addEventListener('input', validate); el.addEventListener('change', validate); });
    validate();
    nextBtn.addEventListener('click', () => { if (!nextBtn.disabled) next(); });

    mainEl.querySelectorAll('[data-scan-foot]').forEach((el) => {
      el.addEventListener('click', async () => {
        const mode = el.dataset.scanFoot; // "camera" | "upload"
        const { openFootScan } = await import('./scan-foot.js');
        openFootScan({
          mode,
          onApply: (footScan) => {
            state.profile._foot_scan = footScan;
            if (footScan.eu_size) state.profile.shoe_size = footScan.eu_size;
            if (footScan.width === 'wide') {
              const prefs = new Set(state.profile.preferences || []);
              prefs.add('breed');
              state.profile.preferences = Array.from(prefs);
            }
            render();
          },
        });
      });
    });
    mainEl.querySelectorAll('[data-scan-reset]').forEach((el) => {
      el.addEventListener('click', () => {
        delete state.profile._foot_scan;
        render();
      });
    });
  }

  function renderMulti(step) {
    const selected = new Set(state.profile[step.id] || []);
    const html = `<div class="chips">${step.options.map((o) => `
      <button class="chip ${selected.has(o.value) ? 'selected' : ''}" data-value="${o.value}">${o.label}</button>
    `).join('')}</div>`;
    const submit = `<button class="btn-primary" data-action="submit">Toon mijn aanbevelingen →</button>`;
    wrap(step, html, submit);
    mainEl.querySelectorAll('.chip').forEach((el) => {
      el.addEventListener('click', () => {
        const v = el.dataset.value;
        if (selected.has(v)) selected.delete(v);
        else selected.add(v);
        state.profile[step.id] = Array.from(selected);
        el.classList.toggle('selected');
      });
    });
    mainEl.querySelector('[data-action="submit"]').addEventListener('click', () => onComplete(state.profile));
  }

  function next() {
    if (state.stepIndex < STEPS.length - 1) { state.stepIndex++; render(); }
  }

  function render() {
    updateChrome();
    const step = STEPS[state.stepIndex];
    if (step.type === 'single')    return renderSingle(step);
    if (step.type === 'pronation') return renderPronation(step);
    if (step.type === 'body')      return renderBody(step);
    if (step.type === 'multi')     return renderMulti(step);
  }

  return { render, state };
}
