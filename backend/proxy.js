// HTTP proxy: ontvangt klantprofiel, roept Claude aan, matcht met products.json,
// retourneert verrijkte recommendations.
import http from 'http';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';
import Anthropic from '@anthropic-ai/sdk';
import { handleScanFoot } from './handlers/scan-foot.js';
import { handleScanGait } from './handlers/scan-gait.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '..', '.env') });
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.ANTHROPIC_API_KEY;

if (!API_KEY) {
  console.error('FOUT: ANTHROPIC_API_KEY ontbreekt in .env');
  process.exit(1);
}

// --- Auth / CORS / Rate-limit middleware (v2c) ---
const SHARED_TOKEN = process.env.HERQUA_SHARED_TOKEN || '';
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);

function checkAuth(req, res) {
  if (!SHARED_TOKEN) return true; // disabled — backward compat with dev / v2b
  const auth = req.headers['authorization'] || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (token !== SHARED_TOKEN) {
    res.statusCode = 401;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ error: 'unauthorized' }));
    return false;
  }
  return true;
}

function applyCors(req, res) {
  const origin = req.headers['origin'] || '';
  if (ALLOWED_ORIGINS.length === 0 || ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  }
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return true; // caller should bail
  }
  return false;
}

const rateLimits = new Map(); // ip -> [timestamps]
const RATE_LIMIT_WINDOW_MS = 3600 * 1000;
const RATE_LIMIT_MAX = 30;

function checkRate(req, res) {
  const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown').split(',')[0].trim();
  const now = Date.now();
  const window = rateLimits.get(ip) || [];
  const recent = window.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  if (recent.length >= RATE_LIMIT_MAX) {
    res.statusCode = 429;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ error: 'rate_limited' }));
    return false;
  }
  recent.push(now);
  rateLimits.set(ip, recent);
  return true;
}
// --- End middleware ---

const client = new Anthropic({ apiKey: API_KEY });

const productsPath = join(__dirname, '..', 'data', 'products.json');
let PRODUCTS = [];
try {
  PRODUCTS = JSON.parse(readFileSync(productsPath, 'utf8'));
  console.log(`✓ ${PRODUCTS.length} producten geladen uit products.json`);
} catch (err) {
  console.warn(`⚠ products.json niet geladen (${err.message}) — matching zal geen enrichment doen`);
}

const upsellsPath = join(__dirname, 'upsells.json');
let UPSELLS = {};
try {
  UPSELLS = JSON.parse(readFileSync(upsellsPath, 'utf8'));
  console.log(`✓ ${Object.keys(UPSELLS).length} upsell-mappings geladen`);
} catch (err) {
  console.warn(`⚠ upsells.json niet geladen (${err.message}) — upsells worden overgeslagen`);
}

const SYSTEM_PROMPT = `Je bent Herman — de hardloopexpert van Herqua Sports in Hoogeveen. Je combineert 40 jaar hardloopexpertise met de nieuwste kennis over hardloopschoenen. Je spreekt de klant aan in jij-vorm: warm, persoonlijk, deskundig, direct.

## Jouw taak
Op basis van het klantprofiel geef je een TOP 3 hardloopschoen-aanbeveling. Je antwoordt ALTIJD in het onderstaande JSON-formaat en NIETS anders (geen markdown, geen code fences).

## Hardloopschoen-kennis

### Pronatie & Schoentype
- Neutraal → Neutrale schoenen (bijv. ASICS Gel-Nimbus, Brooks Ghost, Nike Pegasus, HOKA Clifton)
- Overpronatie → Stabiliteitsschoenen (bijv. ASICS Gel-Kayano, Brooks Adrenaline GTS, New Balance 860)
- Supinatie → Extra gedempt, flexibel (bijv. ASICS Gel-Nimbus, Brooks Glycerin, New Balance Fresh Foam)
- Onbekend → Veilige neutrale all-rounder aanbevelen + adviseer loopanalyse in Hoogeveen

### Terrein
- Weg/asfalt → Road running schoenen
- Trail → Trail schoenen met grip (bijv. Salomon Speedcross, ASICS Gel-Trabuco, Brooks Cascadia)
- Mix → Hybride of twee paar adviseren
- Baan → Lichtgewicht racers of spikes

### Gewicht & Demping
- <65kg → Lichtere schoenen, minder demping nodig
- 65-85kg → Standaard demping
- 85-100kg → Extra demping essentieel (HOKA Bondi, ASICS Gel-Nimbus, Brooks Glycerin)
- >100kg → Maximale demping + stabiliteit, stevige constructie

### Ervaring & Doel
- Beginner → Comfort, vergevingsgezind, goede demping (Ghost, Pegasus, Cumulus)
- Recreant → Veelzijdige trainers
- Serieus → Trainingsschoen + eventueel race-schoen
- Wedstrijd → Carbon-plate racers (Vaporfly, Adios Pro, Endorphin Pro) + dagelijkse trainer

### Merken in Herqua's assortiment
ASICS, Nike, adidas, Brooks, HOKA, Saucony, New Balance, Mizuno, Salomon, On Running

## Output schema

{
  "recommendations": [
    {
      "rank": 1,
      "brand": "Merknaam",
      "model": "Modelnaam",
      "why_for_you": [
        "bullet 1",
        "bullet 2",
        "bullet 3"
      ],
      "price_range": "€XX - €XXX"
    }
  ],
  "personal_tip": "Persoonlijke tip zonder ondertekening (de frontend voegt '— Herman, jouw Herqua hardloopexpert' zelf toe).",
  "pronation_note": "Alleen invullen als pronatie 'onbekend' is: adviseer dan een gratis loopanalyse bij Herqua in Hoogeveen."
}

## Regels voor why_for_you (cruciaal)
- EXACT 3 bullets per recommendation
- Elke bullet MOET minstens één concrete verwijzing bevatten naar het klantprofiel (gewicht, pronatie, ervaring, terrein, doel, of voorkeuren)
- Gebruik concrete waardes uit het profiel (bijv. "jouw 75 kg", "jouw asfalt-terrein", "jouw neutrale pronatie")
- GEEN generieke features zoals "uitstekende demping" of "lichtgewicht materiaal" zonder profiel-koppeling
- Max ~80 tekens per bullet; kort en direct
- Goede voorbeelden:
  * "Maximale demping — ideaal voor jouw 75 kg op asfalt"
  * "Neutrale pronatie match — geen overbelasting van kuit/knie"
  * "Breed voorvoet-vak, fijn voor jouw langere recreatieve runs"
- Slechte voorbeelden (NIET doen):
  * "Uitstekende demping" (geen profiel-referentie)
  * "Lichtgewicht" (geen profiel-referentie)
  * "Beste in zijn klasse" (generiek)

## Toon
Schrijf als Herman — warm, concreet, in jij-vorm. Geen corporate-speak. Kort en to-the-point. Iets als: "Voor jouw comfort-doel op asfalt is de Nimbus dé veilige keuze."`;

function buildUserMessage(profile) {
  const preferences = Array.isArray(profile.preferences) ? profile.preferences.join(', ') : (profile.preferences || 'geen');
  let msg = `Klantprofiel:
- Ervaring: ${profile.experience}
- Terrein: ${profile.terrain}
- Doel: ${profile.goal}
- Pronatie: ${profile.pronation}
- Gewicht: ${profile.weight} kg
- Schoenmaat: EU ${profile.shoe_size}
- Geslacht: ${profile.gender}
- Voorkeuren: ${preferences}`;

  if (profile._foot_scan) {
    const f = profile._foot_scan;
    const parts = [];
    if (f.eu_size) parts.push(`maat EU ${f.eu_size}`);
    if (f.width) parts.push(`breedte: ${f.width}`);
    if (f.arch) parts.push(`boog: ${f.arch}`);
    if (parts.length) msg += `\n\nGemeten bij voetscan: ${parts.join(', ')}.`;
  }

  if (profile._gait_scan) {
    const g = profile._gait_scan;
    const parts = [];
    if (g.pronation) parts.push(`pronatie: ${g.pronation}`);
    if (g.landing) parts.push(`landing: ${g.landing}`);
    if (g.cadence_spm) parts.push(`cadans: ${g.cadence_spm} spm`);
    if (parts.length) msg += `\n\nGemeten bij loopanalyse: ${parts.join(', ')}.`;
  }

  if (profile._foot_scan || profile._gait_scan) {
    msg += `\n\nBELANGRIJK: gebruik deze gemeten waardes concreet in je why_for_you bullets (bijv. "Jouw gemeten cadans van 172 spm past bij..."). Spreek met autoriteit — GEEN disclaimers over metingen, GEEN "ik denk" of "waarschijnlijk".`;
  }

  msg += `\n\nGeef je top 3 aanbeveling als JSON.`;
  return msg;
}

function extractJson(text) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1] : text;
  return JSON.parse(candidate.trim());
}

function normalize(s) {
  return (s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

// Generieke merkprefix-woorden die geen onderscheidend model kenmerken
// (bijv. "Gel-Nimbus 26" vs "Gel-Cumulus 28" mogen niet enkel op "gel" matchen).
const GENERIC_MODEL_TOKENS = new Set([
  'gel', 'fresh', 'foam', 'air', 'zoom', 'max', 'free', 'run', 'pure',
  'speed', 'boost', 'wave', 'cloud', 'dna',
]);

function matchProduct(brand, model, gender) {
  if (!PRODUCTS.length) return null;
  const brandLc = (brand || '').toLowerCase();
  const genderLc = (gender || '').toLowerCase();

  let pool = PRODUCTS.filter((p) => (p.brand || '').toLowerCase() === brandLc);
  if (!pool.length) pool = PRODUCTS;

  // Filter op gender als bekend; val terug op volledige pool als niets overblijft
  if (genderLc) {
    const genderPool = pool.filter((p) => (p.gender || '').toLowerCase() === genderLc);
    if (genderPool.length) pool = genderPool;
  }

  // Filter op voorraad — alleen in_stock producten mogen matchen (punt 9)
  const stockPool = pool.filter((p) => p.in_stock === true);
  if (stockPool.length) pool = stockPool;

  const tokens = normalize(model).split(' ').filter((t) => t.length >= 3);
  const distinctive = tokens.filter((t) => !GENERIC_MODEL_TOKENS.has(t));

  let best = null;
  let bestScore = 0;
  for (const p of pool) {
    const productName = normalize(p.name);
    // Vereis dat minstens één onderscheidend token matcht (als we die hebben),
    // anders matcht "Gel-Nimbus 26" op elke ASICS Gel-schoen.
    if (distinctive.length && !distinctive.some((t) => productName.includes(t))) continue;
    const score = tokens.reduce((acc, t) => acc + (productName.includes(t) ? 1 : 0), 0);
    if (score > bestScore) {
      bestScore = score;
      best = p;
    }
  }
  return bestScore > 0 ? best : null;
}

function enrichRecommendations(recs, gender) {
  return recs.map((r) => {
    const match = matchProduct(r.brand, r.model, gender);
    const upsell = UPSELLS[r.brand] || null;
    const base = { ...r };
    if (upsell) base.upsell = upsell;
    if (match) {
      base.product = {
        name: match.name,
        image_url: match.image_url,
        price: match.price,
        product_url: match.product_url,
        in_stock: match.in_stock,
        matched: true,
      };
    } else {
      base.product = { matched: false };
    }
    return base;
  });
}

async function handleRecommend(profile) {
  const required = ['experience', 'terrain', 'goal', 'pronation', 'weight', 'shoe_size', 'gender'];
  const missing = required.filter((k) => profile[k] === undefined || profile[k] === '');
  if (missing.length) {
    return { status: 400, body: { error: `Ontbrekende velden: ${missing.join(', ')}` } };
  }

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: buildUserMessage(profile) }],
  });

  const text = response.content.map((c) => c.text || '').join('');
  let parsed;
  try {
    parsed = extractJson(text);
  } catch (err) {
    console.error('JSON parse fout. Claude output:\n', text);
    return { status: 502, body: { error: 'Kon AI-respons niet verwerken' } };
  }

  parsed.recommendations = enrichRecommendations(parsed.recommendations || [], profile.gender);
  return { status: 200, body: parsed };
}

function sendJson(res, status, body) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(JSON.stringify(body));
}

const server = http.createServer(async (req, res) => {
  // Apply CORS headers to every response; bail on OPTIONS preflight
  if (applyCors(req, res)) return;

  if (req.method === 'POST' && req.url === '/api/scan/foot') {
    if (!checkAuth(req, res)) return;
    if (!checkRate(req, res)) return;
    let raw = '';
    req.on('data', (chunk) => (raw += chunk));
    req.on('end', async () => {
      try {
        const body = JSON.parse(raw);
        const { status, body: resBody } = await handleScanFoot(body, API_KEY);
        sendJson(res, status, resBody);
      } catch (err) {
        console.error('scan-foot handler crash:', err);
        sendJson(res, 500, { confidence: 'low', message_to_user: 'Er ging iets mis. Probeer opnieuw.' });
      }
    });
    return;
  }

  if (req.method === 'POST' && req.url === '/api/scan/gait') {
    if (!checkAuth(req, res)) return;
    if (!checkRate(req, res)) return;
    let raw = '';
    req.on('data', (chunk) => (raw += chunk));
    req.on('end', async () => {
      try {
        const body = JSON.parse(raw);
        const { status, body: resBody } = await handleScanGait(body, API_KEY);
        sendJson(res, status, resBody);
      } catch (err) {
        console.error('scan-gait handler crash:', err);
        sendJson(res, 500, { confidence: 'low', message_to_user: 'Er ging iets mis. Probeer opnieuw.' });
      }
    });
    return;
  }

  if (req.method === 'POST' && req.url === '/api/recommend') {
    if (!checkAuth(req, res)) return;
    // No rate-limit on /api/recommend (no file-upload, per plan)
    let raw = '';
    req.on('data', (chunk) => (raw += chunk));
    req.on('end', async () => {
      try {
        const profile = JSON.parse(raw);
        const { status, body } = await handleRecommend(profile);
        sendJson(res, status, body);
      } catch (err) {
        console.error('Handler crash:', err);
        sendJson(res, 500, { error: 'Interne fout: ' + err.message });
      }
    });
    return;
  }

  sendJson(res, 404, { error: 'Not found' });
});

server.listen(PORT, 'localhost', () => console.log(`✓ Herqua proxy draait op http://localhost:${PORT}`));
