# Herqua Schoenadviseur v2a — Visuele & Conversie Overhaul

**Datum:** 2026-04-13
**Status:** Approved design, ready for implementation plan
**Bron-mockup:** `.superpowers/brainstorm/10649-1776072559/content/combo-brandbook-v4.html`
**Bron-brandbook:** `claude herqua/Herqua Logo, Kleuren en Lettertypes.pdf`

## Doel

De bestaande demo (v1) opwaarderen naar een versie die:
- Echt in Herqua's huisstijl staat (brandbook-conform, niet gegokt)
- Zichtbaar conversie-gericht is (badges, urgency, upsells, sterke CTA)
- Elk advies concreet teruggeeft hoe het aansluit op het klantprofiel
- Door Herman, "de Herqua hardloopexpert", gepresenteerd wordt voor warmte/autoriteit
- Alleen producten toont die daadwerkelijk op voorraad zijn

## Scope

### In scope

1. **Huisstijl conform officieel brandbook**
2. **"Waarom Herman deze kiest voor jou"** per product (gestructureerde bullets gekoppeld aan profiel)
3. **Echte schoenfoto's** (scraper fix — geen sale-banners)
4. **Terug-navigatie** expliciet in wizard-footer; auto-advance blijft, maar vorige antwoord kan altijd herzien worden
5. **Visueel sterker** wizard + resultaat (hero in donker grijs, badges, prominente gele CTA)
6. **Upsell per product** (gratis accessoire OR % korting op accessoire)
8. **Wizard óók in huisstijl** met Herman als gids vanaf stap 1
9. **Alleen voorraad-producten tonen** — filter `in_stock === true` in matcher

### Out of scope (v2b, apart subproject)

7. Video upload + loopanalyse
10. Voetscan via telefoon-camera

### Out of scope (niet in v2 überhaupt)

- Magento 2 module-integratie (blijft phase 2 uit oorspronkelijke plan)
- Live Magento REST calls
- Echte coupon-codes/upsell-engine (upsell in v2a is illustratief; statische mapping per merk)
- Email capture, WhatsApp CTA, GA4 tracking
- A/B tests, multilingual

## Herqua brandbook — bindende specificaties

| Element | Waarde |
|---|---|
| **Font** | Ubuntu (regular 400, bold 700, bold italic 700i) via Google Fonts |
| **Primair grijs/body** | `#3a3938` |
| **Primair blauw** | `#2e85c7` |
| **Secundair teal (highlight/vlak)** | `#38b6ab` |
| **Bestelknop geel** | `#f7a81c` |
| **Signaalkleur rood (sale/urgency)** | `#ea5160` |
| **Lijnen/tussenstukjes** | `#dedede` |
| **Wit** | `#ffffff` |
| **Logo (wit op donker)** | `https://www.herqua.nl/media/logo/stores/1/LogoHerquaSports-Kleur-wit_DEF.png` |
| **Logo (kleur op licht)** | `https://www.herqua.nl/media/wysiwyg/Herqua_logo.png` |

Kleurgebruiks-regels (uit brandbook):
- **Primair:** grijs + wit + blauw — dominant in de UI
- **Geel:** uitsluitend voor bestel/primaire CTA ("Bekijk bij Herqua")
- **Rood:** uitsluitend voor signaal/urgency (sale, "nog X op voorraad")
- **Teal:** secundaire highlights (badge "beste match", bullet-markers, upsell-blok)
- **Lichtgrijs:** borders, lijnen, dividers — nooit als vlakvulling

## Persona: Herman

- **Naam:** Herman
- **Rol:** Herqua hardloopexpert (40 jaar expertise-vibe)
- **Avatar:** letter-avatar "H" — witte "H" op blauwe `#2e85c7` cirkel (geen foto beschikbaar)
- **Aanwezigheid in UI:**
  - Wizard: mentie in helper-tekst stap 1 ("Dit helpt Herman de juiste schoen te kiezen") + trust-chip in footer ("Advies van Herman · Herqua Hardloopexpert")
  - Resultaat-hero: expert-pill rechtsboven met avatar + naam + rol
  - Expert-note: persoonlijke tip bovenin resultaat, ondertekend "— Herman, jouw Herqua hardloopexpert"
  - Per productkaart: "Waarom Herman deze kiest voor jou" sectietitel met kleine avatar
- **Toon:** warm, deskundig, in jij-vorm. System prompt ondertekent met Herman's stem.

## Frontend architectuur

Vanilla JS blijft de basis (geen framework), maar het bestand `widget.js` wordt groter. We splitsen naar 3 bestanden voor onderhoudbaarheid én om later Magento-templates makkelijker te maken:

```
frontend/
├── index.html              # Container + font-link + Herqua styles
├── assets/
│   └── logo-white.png      # Lokaal gecachete fallback (primair: herqua.nl URL)
├── css/
│   └── widget.css          # Herqua huisstijl (tokens via CSS custom properties)
└── js/
    ├── wizard.js           # Wizard state machine + stappen-rendering
    ├── result.js           # Resultaat-pagina + productkaart-rendering + upsell
    └── widget.js           # Entry point: init, API-call, state coördinatie
```

`widget.js` is ongeveer 50 regels; `wizard.js` en `result.js` zijn elk ~100-150 regels. Sharded zodat elke bestand < 200 regels blijft en één verantwoordelijkheid heeft.

## Component-specs

### Hero (wizard + resultaat)

```html
<header class="hero">
  <img class="logo" src="https://www.herqua.nl/media/logo/stores/1/LogoHerquaSports-Kleur-wit_DEF.png" alt="Herqua Sports">
  <span class="step-pill">Schoenadvies · Stap X / 6</span>
</header>
<div class="progress"><div class="progress-bar" style="width: ...%"></div></div>
```

- Hoogte: 82px (20px padding + 42px logo hoogte + 20px padding)
- Background: `#3a3938`
- Progress bar onder hero: 4px, background `#dedede`, fill `#2e85c7`
- Step-pill: 11px uppercase letter-spacing 2px, color `#c4c4c3`

### Wizard stap — single-select (stappen 1-4)

```html
<div class="step-body">
  <span class="step-label">Stap 1 van 6</span>
  <h3 class="q">Vraag…</h3>
  <div class="helper">Helper-tekst die Herman aanhaalt…</div>
  <div class="choices">
    <button class="choice selected"><span class="icon">🏃</span><div><div class="lbl">Label</div><div class="sub">Subtitel</div></div></button>
    <!-- 3 andere -->
  </div>
</div>
<footer class="step-footer">
  <button class="btn-back">← Vorige vraag</button>
  <div class="trust-chip"><div class="mono-avatar">H</div><span>Advies van Herman · Herqua Hardloopexpert</span></div>
</footer>
```

- `step-label`: inline-block, blauw achtergrond, wit, uppercase 11px letter-spacing 2px, padding 4px 10px
- `.q` (vraag-titel): Ubuntu bold 26px, `#3a3938`, line-height 1.2
- `.helper`: 13px italic `#6b6b6a` — **bevat "Herman" in stap 1**
- `.choices` grid: 2 kolommen (1 kolom op <480px)
- `.choice` card: border 2px `#dedede`, radius 10px, padding 16px 18px
- `.choice:hover`: border `#2e85c7`, bg `#f0f7fc`, translate-Y -1px
- `.choice.selected`: border `#2e85c7`, bg `#eaf3fa`
- `.btn-back`: altijd zichtbaar, ook op stap 1 (dan disabled state of verborgen)
- `.trust-chip`: "H" avatar + tekst — blijft zichtbaar zelfs op mobiel

### Wizard stap — input fields (stap 5)

Zelfde skeleton maar `<div class="fields">` in plaats van `.choices`. Gebruikt bestaande `<input>` / `<select>` styling met border `#dedede`, focus-border `#2e85c7`, radius 10px.

Submit-knop in footer (rechts): geel (`#f7a81c`) disabled tot alle velden gevuld.

### Wizard stap — multi chips (stap 6)

Chips: border 2px `#dedede`, radius 999px, padding 8px 14px. Selected: border + bg-tint `#eaf3fa` met border `#2e85c7`.

Submit-knop: **"Toon mijn aanbevelingen →"** in geel — dit is een bestelknop-gelijkwaardige actie.

### Terug-navigatie (punt 4)

- `← Vorige vraag` staat **altijd** in footer (ook op stap 1 — daar disabled/grey-out)
- Auto-advance bij single-select blijft (voelt vlot), maar gebruiker kan altijd terug
- Vorige keuze wordt **voorgeselecteerd** als `.selected` wanneer gebruiker terugkomt
- Stap-teller in hero-pill + step-label + progress-bar geven drie visuele ankers

### Resultaat-hero

```html
<div class="result-hero">
  <div class="left">
    <img class="logo" src="…">
    <h2 class="result-title">Jouw top 3 hardloopschoenen</h2>
    <div class="result-sub">PERSOONLIJK ADVIES VAN HERMAN</div>
  </div>
  <div class="expert-pill">
    <div class="avatar-lg">H</div>
    <div>
      <div class="name">Herman</div>
      <div class="role">Herqua expert</div>
    </div>
  </div>
</div>
```

- Background `#3a3938` met blauwe onderrand `#2e85c7` 4px
- Op <600px: expert-pill stackt onder titel

### Expert-note (Herman's persoonlijke tip)

```html
<div class="expert-note">
  <div class="note-avatar">H</div>
  <div>
    <strong>Persoonlijke tip van Herman:</strong> …tekst uit Claude's personal_tip…
    <div class="signed">— Herman, jouw Herqua hardloopexpert</div>
  </div>
</div>
```

- Witte achtergrond, linker border-left 3px blauw
- Fills `personal_tip` veld uit Claude response
- `pronation_note` (indien aanwezig) wordt als tweede expert-note getoond

### Productkaart

```html
<div class="card top">  <!-- .top alleen voor #1 -->
  <div class="media">
    <div class="badges-top">
      <span class="badge rank best">#1 · Beste match</span>  <!-- teal voor #1 -->
      <span class="badge urgency">Nog 3 in maat 43</span>    <!-- rood, als stock laag -->
    </div>
    <img src="…echte schoenfoto…" alt="…">
  </div>
  <div class="card-body">
    <div class="brand-line">ASICS</div>
    <h3 class="card-title">Gel-Nimbus 28</h3>

    <div class="why-title">
      <div class="mono-avatar">H</div>
      Waarom Herman deze kiest voor jou
    </div>
    <ul class="why-list">
      <li>Maximale demping — ideaal voor jouw 75 kg op asfalt</li>
      <li>Neutrale pronatie match — geen overbelasting</li>
      <li>Aanbevolen voor recreanten met comfort-doel</li>
    </ul>

    <div class="price-row">
      <div class="price">€ 199,95</div>
      <div class="stock">● Op voorraad</div>
    </div>

    <div class="upsell">  <!-- optioneel, als merk-match in upsell-mapping -->
      <div class="gift">🎁</div>
      <div class="txt"><strong>Gratis Stance hardloopsokken</strong> (t.w.v. €14,95) bij deze schoen</div>
    </div>

    <div class="cta-row">
      <a class="cta-primary" href="{product_url}" target="_blank">Bekijk bij Herqua →</a>
      <button class="cta-secondary">Vergelijk</button>
    </div>
  </div>
</div>
```

- `.card.top` (#1): 2px blauwe border, rank-badge in teal
- Overige: 1px `#dedede` border, rank-badge in blauw
- `.media` grid-column: 160px op desktop, full-width op mobiel
- `.cta-primary` geel met zwarte tekst — **primaire bestelknop per brandbook**
- `.cta-secondary` wit met grijze rand — "Vergelijk" (deze feature is in v2a out-of-scope; knop is er maar doet alleen een placeholder toast)

**Note:** "Vergelijk" knop is visueel aanwezig voor conversie-gevoel maar functioneel alleen een stub toast ("Vergelijk-functie komt binnenkort"). YAGNI — echte vergelijk-view komt later.

### "Waarom Herman deze kiest" — punt 2

Bullets zijn **niet** generiek; ze refereren expliciet aan klantprofiel. Claude's `key_features` array wordt niet langer generiek gebruikt — we vragen Claude om per recommendation 3 bullets die direct naar profiel-waardes verwijzen.

**System prompt aanpassing:**

Oude format `key_features: ["feature1", "feature2", "feature3"]` wordt vervangen door:

```json
"why_for_you": [
  "Directe verwijzing naar gewicht of doel — bijv. 'Maximale demping — ideaal voor jouw 75 kg op asfalt'",
  "Directe verwijzing naar pronatie of ervaring — bijv. 'Neutrale pronatie match — geen overbelasting'",
  "Directe verwijzing naar voorkeuren of terrein — bijv. 'Aanbevolen voor recreanten met comfort-doel'"
]
```

Instructie in system prompt: "Elke bullet MOET een concrete referentie bevatten naar het klantprofiel (gewicht, pronatie, ervaring, terrein, doel, of voorkeuren). Niet generiek."

### Upsell — punt 6

**Scope:** statische upsell-mapping per merk (geen echte coupon-engine in v2a).

File: `backend/upsells.json`:

```json
{
  "ASICS":     { "gift":     "Gratis Stance hardloopsokken (t.w.v. €14,95) bij deze schoen", "icon": "🎁" },
  "Brooks":    { "discount": "5% korting op een Garmin hardloophorloge bij deze schoen",      "icon": "💸" },
  "HOKA":      { "gift":     "Gratis hardloopsokken (t.w.v. €12,95) bij deze schoen",        "icon": "🎁" },
  "Nike":      { "discount": "10% korting op een Nike hardloopshirt bij deze schoen",         "icon": "💸" },
  "adidas":    { "discount": "10% korting op een adidas hardloopbroek bij deze schoen",       "icon": "💸" },
  "Saucony":   { "gift":     "Gratis bidon (t.w.v. €9,95) bij deze schoen",                   "icon": "🎁" },
  "Mizuno":    { "discount": "5% korting op hardloopaccessoires bij deze schoen",             "icon": "💸" },
  "Salomon":   { "gift":     "Gratis trailgamaschen bij deze schoen",                         "icon": "🎁" },
  "New Balance": { "discount": "5% korting op een hardloopshirt bij deze schoen",             "icon": "💸" },
  "On":        { "gift":     "Gratis hardloopsokken bij deze schoen",                         "icon": "🎁" }
}
```

Proxy voegt `upsell`-object toe aan elke recommendation:

```json
"upsell": { "text": "Gratis Stance hardloopsokken …", "icon": "🎁" }
```

Frontend rendert upsell-blok alleen als `upsell` in recommendation zit. Altijd teal kleur-accent (dashed border `#38b6ab`, bg `#eef9f8`).

**Toekomstvast:** `upsells.json` kan later worden vervangen door een echte coupon-API; de interface naar frontend blijft identiek.

### Urgency-badge — punt 5 (scarcity)

Toont alleen als voorraad laag (nu: mock op basis van recommendation-index want echte voorraad-kwantiteit is niet beschikbaar).

**Regel (v2a):** toon rode urgency-badge "Nog 3 in maat X" uitsluitend op rank 1 (niet alle cards), om te voorkomen dat het goedkoop aanvoelt. Maat komt uit profiel.

**Toekomstvast:** als we later echte Magento voorraadstanden per maat hebben, wordt dit een echte conditie.

### Sociale-bewijs strip onderaan resultaat

```html
<div class="social-proof-strip">
  <div class="sp-item"><div class="num">8.8</div><div class="lbl">Klantbeoordeling</div></div>
  <div class="sp-item"><div class="num">1.000+</div><div class="lbl">Schoenen op voorraad</div></div>
  <div class="sp-item"><div class="num">40 jaar</div><div class="lbl">Hardloopexpertise</div></div>
</div>
```

Hardgecodeerd in v2a (data uit oorspronkelijke opdracht). Ondersteunt conversie-doel.

## Backend aanpassingen

### Scraper — punten 3, 9

**Punt 3: echte schoenfoto's.** Huidige scraper pakt de eerste `<img>` in een product-item; dat is soms een sale-banner overlay. Fix:

- Prefereer `<img>` met alt-text die productnaam bevat, of
- Skip images met attributen/classnames die suggereren dat het een badge/overlay is (bijv. `class*="label"`, `class*="badge"`, `alt*="sale"`, `alt*="actie"`)
- Concreet: filter op `img[src*="catalog/product"]` — Magento productfoto's zitten altijd in dat pad
- Fallback: eerste `<img>` die niet matcht op banner-indicatoren

**Punt 9: alleen voorraad.** Op dit moment zet de scraper `in_stock: true` hardgecodeerd. Fix:

- Zoek per product-card naar out-of-stock indicator: Magento gebruikt typisch `.out-of-stock`, `.unavailable`, of tekst "Niet op voorraad"
- Als gevonden: `in_stock: false`
- Scraper commit `products.json` met echte waarden

### Proxy matcher — punt 9

```javascript
// Filter: alleen in-stock producten matchen
pool = pool.filter((p) => p.in_stock === true);
```

Toegevoegd na gender-filter. Als na stock-filter de pool leeg is: fallback naar hele pool zonder stock (dan komt `matched: false` alsnog met Claude's aanbeveling zonder foto).

### Proxy system prompt — punt 2

**Aanpassing output-schema:** `key_features` → `why_for_you` (3 concrete bullets met profiel-referenties).

System-prompt snippet (toegevoegd aan bestaande prompt):

> Elke recommendation bevat een `why_for_you` array met EXACT 3 bullets. Elke bullet MOET een concrete referentie maken naar het klantprofiel (gewicht, pronatie, ervaring, terrein, doel, voorkeuren). Voorbeelden: "Maximale demping — ideaal voor jouw 75 kg op asfalt" (gewicht + terrein), "Neutrale pronatie match — geen overbelasting" (pronatie), "Aanbevolen voor recreanten met comfort-doel" (ervaring + doel). GEEN generieke features zoals "uitstekende demping" zonder verwijzing naar profiel.

Ondertekening expert-note: "— Herman, jouw Herqua hardloopexpert" wordt door Claude toegevoegd aan `personal_tip`, OF door frontend na-render (frontend-kiest consistenter). **Keuze: frontend appended.**

### Proxy response-schema (v2a)

```json
{
  "recommendations": [
    {
      "rank": 1,
      "brand": "ASICS",
      "model": "Gel-Nimbus 28",
      "why_for_you": ["…", "…", "…"],
      "price_range": "€ 199 - € 220",
      "product": { "name": "…", "image_url": "…", "price": "…", "product_url": "…", "in_stock": true, "matched": true },
      "upsell": { "text": "…", "icon": "🎁" }
    }
  ],
  "personal_tip": "…tekst zonder ondertekening…",
  "pronation_note": "…"
}
```

Frontend-consumer: appended "— Herman, jouw Herqua hardloopexpert" aan `personal_tip` bij rendering.

## Data flow (onveranderd t.o.v. v1)

1. Wizard → klantprofiel → `POST /api/recommend`
2. Proxy → Claude Haiku 4.5 met geupdate system prompt → ontvangt JSON met `why_for_you`
3. Proxy → match met stock+gender+brand+model → verrijkt met product
4. Proxy → voegt `upsell` toe op basis van brand lookup in `upsells.json`
5. Proxy → returns volledig response-schema
6. Frontend → rendert expert-note + 3 productkaarten + social proof

## Error handling (ongewijzigd)

Zelfde strategie als v1.

## Testing (demo-scope)

Manuele smoke test in README:

1. Herscrape: `node data/scrape-products.js` → verify >10 items met echte schoenfoto's (geen banners), gender + in_stock correct
2. Proxy up + curl test → response bevat `why_for_you`, `upsell`, `product` voor elke recommendation
3. Frontend open → doorloop wizard → 3 kaarten met Herman-branding, badges, upsells
4. Terug-navigatie: klik "Vorige vraag" → vorige selectie is zichtbaar
5. Stock filter: forceer een product op `in_stock: false` in products.json → dat product mag niet matchen

Geen formele unit tests in v2a (demo-scope).

## Bestanden die wijzigen

| Bestand | Wijziging |
|---|---|
| `frontend/index.html` | Volledig herschrijven: Ubuntu font-link, structurele hero/result wrappers |
| `frontend/widget.css` | → `frontend/css/widget.css` — volledig herschrijven met brandbook-tokens |
| `frontend/widget.js` | Opsplitsen in `frontend/js/widget.js`, `wizard.js`, `result.js` |
| `frontend/assets/logo-white.png` | Nieuw — lokale cache van Herqua wit-logo |
| `backend/proxy.js` | System prompt aangepast (why_for_you, Herman-toon), stock-filter in matcher, upsell-enrichment |
| `backend/upsells.json` | Nieuw — merk→upsell mapping |
| `data/scrape-products.js` | Foto-selector verfijnen (skip badges), echte in_stock detectie |
| `data/products.json` | Herscrape resultaat |

## Toekomstvastheid (wat v2b/phase-2 makkelijk maakt)

- CSS-tokens (`--grey`, `--blue`, etc.) leven in `:root` — één plek om brandkleuren te tunen
- Wizard, result, widget zijn aparte files → Magento kan elk deel apart gebruiken
- `upsells.json` interface kan naadloos vervangen worden door een echte coupon-API
- `why_for_you` schema is robuuster dan `key_features` — blijft zo bij uitbreiding met voetscan/video data
- Expert-persona "Herman" is een configuratie-constante (`EXPERT = { name: 'Herman', avatarInitial: 'H' }`) → later makkelijk te swappen voor een echte Herqua-medewerker met foto

## Open punten (niet blokkerend)

- Exacte `why_for_you` kwaliteit hangt af van Claude's interpretatie van system prompt — tuning kan nodig zijn na eerste tests
- Upsell-mapping is statisch en illustratief; echte upsells vereisen Herqua's buy-in en coupon-infra
- "Vergelijk"-knop visueel aanwezig maar functioneel een stub
- Urgency-badge "Nog X in maat Y" is mock tot echte Magento-voorraad per maat beschikbaar is
