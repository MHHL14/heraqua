// Loopanalyse modal — opent camera, draait MediaPipe Pose in browser, stuurt
// pose-tijdreeks naar /api/scan/gait. Video blijft op device.
// Exposeert: openGaitScan({ onApply })

import { renderPrivacyStrip, bindPrivacyInfo } from './privacy-info.js';

const API_BASE = (() => {
  if (window.HERQUA_CONFIG?.backendUrl) return window.HERQUA_CONFIG.backendUrl;
  if (location.port === '8080') return 'http://localhost:3000';
  return '';
})();
const API_URL = `${API_BASE}/api/scan/gait`;
const RECORD_SECONDS = 15;
const TARGET_FPS = 30;

const POSE_SCRIPT_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5.1675469404/pose.js';
const POSE_CDN_BASE = 'https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5.1675469404/';

const PRONATION_NL = { neutral: 'Neutraal', over: 'Overpronatie', supination: 'Supinatie' };
const LANDING_NL   = { heel: 'Hiel', midfoot: 'Midvoet', forefoot: 'Voorvoet' };

let poseModulePromise = null;
function loadPoseModule() {
  if (poseModulePromise) return poseModulePromise;
  poseModulePromise = new Promise((resolve, reject) => {
    if (window.Pose) return resolve(window.Pose);
    const script = document.createElement('script');
    script.src = POSE_SCRIPT_URL;
    script.onload = () => window.Pose ? resolve(window.Pose) : reject(new Error('Pose class ontbreekt na laden'));
    script.onerror = () => reject(new Error('MediaPipe Pose kon niet geladen worden'));
    document.head.appendChild(script);
  });
  return poseModulePromise;
}

function buildOverlay() {
  const overlay = document.createElement('div');
  overlay.className = 'scan-overlay';
  overlay.innerHTML = `<div class="scan-modal">
    <div class="scan-header">
      <h2>📹 Loopanalyse met Herman</h2>
      <button class="scan-close" aria-label="Sluiten">×</button>
    </div>
    ${renderPrivacyStrip('gait')}
    <div class="scan-body"></div>
  </div>`;
  bindPrivacyInfo(overlay);
  overlay.querySelector('.scan-close').addEventListener('click', () => overlay.remove());
  return overlay;
}

function renderInstructions(overlay, onStart) {
  overlay.querySelector('.scan-body').innerHTML = `
    <h3>Voorbereiding</h3>
    <p>Zet je telefoon <strong>op de grond of op een laag statief achter je</strong>, met de camera naar voren. Zorg voor minimaal 5 meter loopruimte.</p>
    <ul style="font-size:13px;line-height:1.7;color:#4b4b4a;padding-left:18px;">
      <li>✓ Telefoon op de grond of laag statief</li>
      <li>✓ Minimaal 5 meter loopruimte</li>
      <li>✓ Strakke broek/legging (knieën zichtbaar)</li>
      <li>✓ Voldoende licht</li>
    </ul>
    <div class="scan-actions">
      <button class="btn-primary" data-start>Ik ben klaar — start camera</button>
    </div>`;
  overlay.querySelector('[data-start]').addEventListener('click', onStart);
}

function renderError(overlay, message, retryFn) {
  overlay.querySelector('.scan-body').innerHTML = `
    <h3>Even opnieuw</h3>
    <p>${message}</p>
    <div class="scan-actions">
      <button class="btn-primary" data-retry>Opnieuw proberen</button>
    </div>`;
  overlay.querySelector('[data-retry]').addEventListener('click', retryFn);
}

async function initCameraAndRecord(overlay, onApply) {
  overlay.querySelector('.scan-body').innerHTML = `
    <div class="loading"><div class="spinner"></div>
    <p style="margin-top:12px;"><strong>Camera voorbereiden…</strong></p></div>`;

  let Pose;
  try {
    Pose = await loadPoseModule();
  } catch (err) {
    return renderError(overlay, 'Kon de bewegings-analyse niet laden. Je browser is mogelijk te oud. Vul de pronatie liever zelf in.', () => renderInstructions(overlay, () => initCameraAndRecord(overlay, onApply)));
  }

  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false,
    });
  } catch (err) {
    return renderError(overlay, 'Camera-toegang is niet toegestaan. Sta de camera toe in je browser-instellingen en probeer opnieuw.', () => renderInstructions(overlay, () => initCameraAndRecord(overlay, onApply)));
  }

  renderRecordUI(overlay, stream, Pose, onApply);
}

function renderRecordUI(overlay, stream, Pose, onApply) {
  overlay.querySelector('.scan-body').innerHTML = `
    <div class="camera-stage">
      <video autoplay muted playsinline id="gait-video"></video>
      <div class="camera-overlay" id="gait-overlay">
        <div style="font-size:14px;margin-bottom:8px;">Stel je op voor de camera</div>
        <button class="btn-primary" data-start-rec>Start opname (15 sec)</button>
      </div>
      <div class="privacy-label-bottom">🔒 Video wordt niet verstuurd</div>
    </div>
    <p style="font-size:12px;color:#6b6b6a;margin-top:8px;">Loop heen-en-weer voor de camera tijdens de opname (3-4 passes).</p>`;

  const video = overlay.querySelector('#gait-video');
  video.srcObject = stream;

  overlay.querySelector('[data-start-rec]').addEventListener('click', () => startRecording(overlay, video, stream, Pose, onApply));
}

async function startRecording(overlay, video, stream, Pose, onApply) {
  const overlayEl = overlay.querySelector('#gait-overlay');
  overlayEl.innerHTML = `<div class="countdown" id="countdown">3</div>`;

  for (let i = 3; i >= 1; i--) {
    overlay.querySelector('#countdown').textContent = i;
    await sleep(1000);
  }
  overlayEl.classList.add('hidden');

  const pose = new Pose({
    locateFile: (file) => `${POSE_CDN_BASE}${file}`,
  });
  pose.setOptions({
    modelComplexity: 1,
    smoothLandmarks: true,
    enableSegmentation: false,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5,
  });

  const frames = [];
  const startTime = performance.now();

  pose.onResults((results) => {
    if (!results.poseLandmarks) return;
    const lm = results.poseLandmarks.map((p) => [p.x, p.y, p.z]);
    frames.push({ t: (performance.now() - startTime) / 1000, landmarks: lm });
  });

  const camStage = overlay.querySelector('.camera-stage');
  const recIndicator = document.createElement('div');
  recIndicator.className = 'recording-indicator';
  recIndicator.innerHTML = `<span class="dot"></span><span>REC</span>`;
  camStage.appendChild(recIndicator);
  const progressRing = document.createElement('div');
  progressRing.className = 'progress-ring';
  progressRing.textContent = `${RECORD_SECONDS}s`;
  camStage.appendChild(progressRing);

  let running = true;
  const loop = async () => {
    while (running) {
      await pose.send({ image: video });
      const elapsed = (performance.now() - startTime) / 1000;
      progressRing.textContent = `${Math.max(0, Math.ceil(RECORD_SECONDS - elapsed))}s`;
      if (elapsed >= RECORD_SECONDS) running = false;
    }
  };
  loop();

  await sleep(RECORD_SECONDS * 1000);
  running = false;

  stream.getTracks().forEach((t) => t.stop());
  camStage.remove();
  await pose.close();

  await analyzeAndSend(overlay, frames, onApply);
}

function detectPasses(frames) {
  if (frames.length < 30) return 0;
  const xs = frames.map((f) => ((f.landmarks[27]?.[0] ?? 0.5) + (f.landmarks[28]?.[0] ?? 0.5)) / 2);
  let passes = 0;
  let direction = 0;
  for (let i = 5; i < xs.length; i++) {
    const delta = xs[i] - xs[i - 5];
    const newDir = delta > 0.02 ? 1 : delta < -0.02 ? -1 : 0;
    if (newDir !== 0 && newDir !== direction) {
      if (direction !== 0) passes++;
      direction = newDir;
    }
  }
  return passes;
}

async function analyzeAndSend(overlay, frames, onApply, retryFn) {
  overlay.querySelector('.scan-body').innerHTML = `
    <div class="loading"><div class="spinner"></div>
    <p style="margin-top:12px;"><strong>Herman analyseert je loopstijl…</strong></p></div>`;

  const numPasses = detectPasses(frames);
  const retry = retryFn || (() => initCameraAndRecord(overlay, onApply));

  if (frames.length < 60 || numPasses < 3) {
    return renderError(
      overlay,
      'Ik kon je niet goed zien. Zorg voor betere verlichting, strakke kleding, en loop 3-4 volledige passes heen-en-weer voor de camera.',
      retry
    );
  }

  try {
    const resp = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fps: TARGET_FPS, duration_sec: RECORD_SECONDS, num_passes: numPasses, frames }),
    });
    const data = await resp.json();
    if (data.confidence === 'low' || !data.pronation_type) {
      return renderError(
        overlay,
        data.message_to_user || 'Herman kon je loopstijl niet interpreteren. Probeer opnieuw.',
        retry
      );
    }
    renderResult(overlay, data, onApply);
  } catch (err) {
    renderError(overlay, 'Er ging iets mis. Probeer opnieuw.', retry);
  }
}

function renderResult(overlay, data, onApply) {
  overlay.querySelector('.scan-body').innerHTML = `
    <h3>Herman's analyse</h3>
    <div class="scan-result">
      <div class="result-row"><span class="label">Pronatie</span><span class="value">${PRONATION_NL[data.pronation_type] || data.pronation_type}</span></div>
      <div class="result-row"><span class="label">Landing</span><span class="value">${LANDING_NL[data.landing_pattern] || data.landing_pattern}</span></div>
      <div class="result-row"><span class="label">Cadans</span><span class="value">${data.cadence_spm} spm</span></div>
    </div>
    <div class="scan-confirm">✓ Je video is inmiddels verwijderd uit het browser-geheugen.</div>
    <div class="scan-actions">
      <button class="btn-primary" data-apply>Toepassen</button>
    </div>`;

  overlay.querySelector('[data-apply]').addEventListener('click', () => {
    onApply({
      pronation: data.pronation_type,
      landing: data.landing_pattern,
      cadence_spm: data.cadence_spm,
    });
    overlay.remove();
  });
}

function sleep(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }

function renderUploadEntry(overlay, onApply) {
  overlay.querySelector('.scan-body').innerHTML = `
    <h3>Video uploaden</h3>
    <p>Kies een video van 10-20 seconden waarin je heen-en-weer loopt voor een camera. Herman analyseert de beelden zonder ze op te slaan.</p>
    <label class="upload-card">
      <input type="file" accept="video/*" id="gait-video-input">
      <div class="up-icon">📁</div>
      <div class="up-text">Tik om video te kiezen</div>
      <div class="up-sub">MP4 / MOV — max ~100MB</div>
    </label>`;
  overlay.querySelector('#gait-video-input').addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processUploadedVideo(overlay, file, onApply);
  });
}

async function processUploadedVideo(overlay, file, onApply) {
  overlay.querySelector('.scan-body').innerHTML = `
    <div class="loading"><div class="spinner"></div>
    <p style="margin-top:12px;"><strong>Video voorbereiden…</strong></p></div>`;

  let Pose;
  try {
    Pose = await loadPoseModule();
  } catch (err) {
    return renderError(overlay, 'Kon de bewegings-analyse niet laden. Probeer een andere browser.', () => renderUploadEntry(overlay, onApply));
  }

  const video = document.createElement('video');
  video.muted = true;
  video.playsInline = true;
  video.src = URL.createObjectURL(file);

  await new Promise((resolve, reject) => {
    video.addEventListener('loadedmetadata', resolve, { once: true });
    video.addEventListener('error', () => reject(new Error('Video kon niet geladen worden')), { once: true });
  }).catch(() => {});

  if (!video.duration || isNaN(video.duration)) {
    return renderError(overlay, 'Kon je video niet openen. Probeer een ander bestand.', () => renderUploadEntry(overlay, onApply));
  }

  overlay.querySelector('.scan-body').innerHTML = `
    <div class="loading"><div class="spinner"></div>
    <p style="margin-top:12px;"><strong>Herman analyseert je video…</strong></p>
    <p style="font-size:11px;color:#6b6b6a;margin-top:6px;" id="gait-progress">0%</p></div>`;

  const pose = new Pose({ locateFile: (f) => `${POSE_CDN_BASE}${f}` });
  pose.setOptions({
    modelComplexity: 1, smoothLandmarks: true,
    enableSegmentation: false,
    minDetectionConfidence: 0.5, minTrackingConfidence: 0.5,
  });

  const frames = [];
  const duration = Math.min(video.duration, 20);
  pose.onResults((results) => {
    if (!results.poseLandmarks) return;
    const lm = results.poseLandmarks.map((p) => [p.x, p.y, p.z]);
    frames.push({ t: video.currentTime, landmarks: lm });
  });

  const progressEl = overlay.querySelector('#gait-progress');
  try {
    await video.play().catch(() => {});
  } catch {}
  video.pause();

  // Scrub through video, sampling ~30 frames/sec
  const stepSec = 1 / 30;
  for (let t = 0; t <= duration; t += stepSec) {
    video.currentTime = t;
    await new Promise((resolve) => {
      video.addEventListener('seeked', resolve, { once: true });
      setTimeout(resolve, 200);
    });
    await pose.send({ image: video });
    if (progressEl) progressEl.textContent = `${Math.round((t / duration) * 100)}%`;
  }

  URL.revokeObjectURL(video.src);
  await pose.close();

  await analyzeAndSend(overlay, frames, onApply, () => renderUploadEntry(overlay, onApply));
}

export function openGaitScan({ mode = 'record', onApply }) {
  const overlay = buildOverlay();
  document.body.appendChild(overlay);
  if (mode === 'upload') {
    renderUploadEntry(overlay, onApply);
  } else {
    renderInstructions(overlay, () => initCameraAndRecord(overlay, onApply));
  }
}
