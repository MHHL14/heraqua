// POST /api/recommend — Claude-advies op basis van klantprofiel, verrijkt met
// product-matching + upsells uit data/ en backend/.
import { readFileSync } from 'fs';
import { join } from 'path';
import Anthropic from '@anthropic-ai/sdk';
import { applyCors, checkAuth, readJsonBody, requireApiKey } from './_lib/shared.js';

const ROOT = process.cwd();

let PRODUCTS = [];
try {
  PRODUCTS = JSON.parse(readFileSync(join(ROOT, 'data', 'products.json'), 'utf8'));
} catch (err) {
  console.warn('products.json niet geladen:', err.message);
}

let UPSELLS = {};
try {
  UPSELLS = JSON.parse(readFileSync(join(ROOT, 'backend', 'upsells.json'), 'utf8'));
} catch (err) {
  console.warn('upsells.json niet geladen:', err.message);
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
      "why_for_you": ["bullet 1","bullet 2","bullet 3"],
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

## Toon
Schrijf als Herman — warm, concreet, in jij-vorm. Geen corporate-speak.`;

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
    msg += `\n\nBELANGRIJK: gebruik deze gemeten waardes concreet in je why_for_you bullets.`;
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

const GENERIC_MODEL_TOKENS = new Set([
  'gel','fresh','foam','air','zoom','max','free','run','pure','speed','boost','wave','cloud','dna',
]);

function matchProduct(brand, model, gender) {
  if (!PRODUCTS.length) return null;
  const brandLc = (brand || '').toLowerCase();
  const genderLc = (gender || '').toLowerCase();

  let pool = PRODUCTS.filter((p) => (p.brand || '').toLowerCase() === brandLc);
  if (!pool.length) pool = PRODUCTS;
  if (genderLc) {
    const g = pool.filter((p) => (p.gender || '').toLowerCase() === genderLc);
    if (g.length) pool = g;
  }
  const stockPool = pool.filter((p) => p.in_stock === true);
  if (stockPool.length) pool = stockPool;

  const tokens = normalize(model).split(' ').filter((t) => t.length >= 3);
  const distinctive = tokens.filter((t) => !GENERIC_MODEL_TOKENS.has(t));

  let best = null; let bestScore = 0;
  for (const p of pool) {
    const productName = normalize(p.name);
    if (distinctive.length && !distinctive.some((t) => productName.includes(t))) continue;
    const score = tokens.reduce((acc, t) => acc + (productName.includes(t) ? 1 : 0), 0);
    if (score > bestScore) { bestScore = score; best = p; }
  }
  return bestScore > 0 ? best : null;
}

function enrichRecommendations(recs, gender) {
  return recs.map((r) => {
    const match = matchProduct(r.brand, r.model, gender);
    const upsell = UPSELLS[r.brand] || null;
    const base = { ...r };
    if (upsell) base.upsell = upsell;
    base.product = match ? {
      name: match.name, image_url: match.image_url, price: match.price,
      product_url: match.product_url, in_stock: match.in_stock, matched: true,
    } : { matched: false };
    return base;
  });
}

export default async function handler(req, res) {
  if (applyCors(req, res)) return;
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }
  if (!checkAuth(req, res)) return;
  const apiKey = requireApiKey(res);
  if (!apiKey) return;

  let profile;
  try { profile = await readJsonBody(req); }
  catch { res.status(400).json({ error: 'invalid_json' }); return; }

  const required = ['experience','terrain','goal','pronation','weight','shoe_size','gender'];
  const missing = required.filter((k) => profile[k] === undefined || profile[k] === '');
  if (missing.length) {
    res.status(400).json({ error: `Ontbrekende velden: ${missing.join(', ')}` });
    return;
  }

  try {
    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: buildUserMessage(profile) }],
    });
    const text = response.content.map((c) => c.text || '').join('');
    let parsed;
    try { parsed = extractJson(text); }
    catch (err) {
      console.error('JSON parse fout:', text);
      res.status(502).json({ error: 'Kon AI-respons niet verwerken' });
      return;
    }
    parsed.recommendations = enrichRecommendations(parsed.recommendations || [], profile.gender);
    res.status(200).json(parsed);
  } catch (err) {
    console.error('recommend handler crash:', err);
    res.status(500).json({ error: 'Interne fout: ' + err.message });
  }
}
