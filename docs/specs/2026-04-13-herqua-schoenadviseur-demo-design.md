# Herqua AI Schoenadviseur — Demo Design (Phase 1)

**Datum:** 2026-04-13
**Status:** Approved design, ready for implementation plan
**Bron-spec:** `herqua-ai-schoenadviseur-prompt.json` (volledige multi-phase spec)

## Doel

Een lokaal draaiende demo van de Herqua AI Schoenadviseur die:
- Het concept overtuigend toont aan Herqua (echte AI-gegenereerde aanbevelingen, echte Herqua-producten)
- Opgebouwd is zodat phase 2 (Magento module) naadloos kan volgen zonder herontwerp
- Binnen enkele uren draait; geen cloud deploy, geen Magento integratie, geen analytics/email/WhatsApp

## Scope

**In scope**
- Conversational wizard met 6 stappen uit `wizard_flow` in bron-spec
- Node.js proxy die Claude API (Haiku 4.5) aanroept met system prompt uit bron-spec
- Scraper die ~20 echte Herqua hardloopschoenen ophaalt van herqua.nl naar `products.json`
- Product matching: Claude's `{brand, model}` → verrijkt met echte foto/prijs/URL
- Productkaarten met werkende "Bekijk bij Herqua →" links
- Herqua branding (donkerblauw primary, oranje accent), mobile-first styling

**Out of scope (phase 2+)**
- Magento 2 module / CMS block integratie
- Live Magento REST API calls
- Voorraad/maat check real-time
- Add-to-cart functionaliteit
- GA4 event tracking, email capture, WhatsApp CTA
- A/B tests, SEO landingspagina, multilingual

## Architectuur

Twee losse processen lokaal:

1. **Statische frontend** (`index.html` + `widget.js` + `widget.css`) — open in browser
2. **Node.js proxy** op `localhost:3000` (`proxy.js`) — roept Claude API aan

Frontend POST't klantprofiel → proxy roept Claude aan met system prompt → parse'd JSON → matcht tegen lokale `products.json` → retourneert verrijkte recommendations.

De scheiding is bewust identiek aan productieversie: phase 2 vervangt de hosting (Vercel serverless of Magento controller), niet de structuur.

## Mappenstructuur

```
herqua-schoenadviseur/
├── frontend/
│   ├── index.html          # Demo page (wizard container)
│   ├── widget.js           # Wizard state machine + API calls + rendering
│   └── widget.css          # Herqua-branded styling
├── backend/
│   ├── proxy.js            # Node HTTP server → Claude API → product matcher
│   └── package.json        # dependencies: @anthropic-ai/sdk, dotenv
├── data/
│   ├── products.json       # Gescrapete Herqua producten (gecommit in git)
│   └── scrape-products.js  # One-off Playwright scraper
├── .env.example            # ANTHROPIC_API_KEY, PORT
├── .gitignore              # .env, node_modules
└── README.md               # Hoe demo starten
```

## Componenten

### Frontend (`widget.js`)

- Vanilla JavaScript, geen framework (zodat het later 1-op-1 in een Magento template past)
- State machine voor 6 wizard-stappen conform bron-spec `wizard_flow`
- Progress bar bovenaan; slide-transities tussen stappen
- Stap 1-4: `single_select_visual` met grote kaarten (icon + label + sublabel)
- Stap 5: input fields (gewicht number, schoenmaat EU select 36-50, geslacht select)
- Stap 6: `multi_select_chips` voor voorkeuren
- Na stap 6: `POST localhost:3000/api/recommend` met klantprofiel
- Loading state: "Onze hardloopexpert analyseert je profiel…" met subtiele animatie
- Result: 3 productkaarten + `personal_tip` + optionele `pronation_note`

### Backend (`proxy.js`)

- Native Node `http` module (geen Express; minimale dependencies)
- Dependencies: `@anthropic-ai/sdk`, `dotenv`
- CORS open voor localhost (phase 2: dichttimmeren)
- Endpoint `POST /api/recommend`:
  1. Valideer klantprofiel (alle verplichte velden aanwezig)
  2. Bouw Claude messages: system prompt uit bron-spec + user template gevuld met profiel
  3. Call `claude-haiku-4-5-20251001` (snel, goedkoop, ruim voldoende voor deze taak)
  4. Parse JSON response (strip markdown code fences indien aanwezig)
  5. Voor elk van 3 recommendations → match tegen `products.json`
  6. Return verrijkte JSON naar frontend

### Product Matcher (helper in `proxy.js`)

- Input: Claude's `{brand, model}` (bijv. `"ASICS"` + `"Gel-Nimbus 26"`)
- Matching strategie:
  1. Filter producten op brand (case-insensitive exact)
  2. Binnen die set: fuzzy match op model (normalized lowercase substring: "gel-nimbus" in productnaam)
  3. Bij meerdere matches: pak nieuwste versie (hoogste modelnummer)
- Match gevonden → voeg `image_url`, `price`, `product_url`, `in_stock` toe
- Geen match → recommendation blijft staan zonder foto/prijs; CTA wordt "Bel ons voor beschikbaarheid: 0528-522132"

### Scraper (`scrape-products.js`)

- One-off script: `node data/scrape-products.js`
- Playwright (robuust; werkt ongeacht of herqua.nl SSR of client-side rendered is)
- Target: categoriepagina hardloopschoenen op herqua.nl
- Extractie per product: naam, brand (afleiden uit naam of apart veld), prijs, image_url, product_url
- Output: `data/products.json` met ~15-20 items
- JSON wordt gecommit in git zodat demo altijd werkt, ook als scraper breekt of herqua.nl wijzigt

## Data flow

1. Gebruiker opent `frontend/index.html`
2. Wizard doorloopt stap 1-6 (lokale state in JS)
3. Na stap 6 → `POST localhost:3000/api/recommend` met profiel-JSON
4. Proxy bouwt Claude messages, roept Haiku 4.5 aan
5. Proxy parse'd JSON response (robust: regex fallback voor markdown-gewrapte JSON)
6. Product matcher verrijkt elke recommendation met echte Herqua data
7. Proxy retourneert verrijkte JSON
8. Frontend rendert 3 productkaarten met "Bekijk bij Herqua →" (opent `product_url` nieuw tabblad)

## Error handling

- **Claude API faalt** → frontend toont "Er ging iets mis, probeer opnieuw" + retry button
- **Claude retourneert ongeldige JSON** → proxy probeert JSON via regex extracten; bij falen → HTTP 500 + generieke error
- **Product niet gevonden in `products.json`** → recommendation zonder foto/prijs, CTA "Bel ons voor beschikbaarheid: 0528-522132"
- **Scraper faalt** → `products.json` uit git blijft werken; demo ongeschaad
- **Missing `ANTHROPIC_API_KEY`** → proxy log't duidelijke fout bij startup en weigert te starten

## Testing (demo-scope)

Geen formele test suite. Handmatige smoke test in README:

1. `node data/scrape-products.js` → verify `products.json` bevat ≥15 items
2. `node backend/proxy.js` → proxy start op :3000
3. `curl -X POST localhost:3000/api/recommend -d '{voorbeeld-profiel}'` → verify 3 recommendations terug
4. Open `frontend/index.html` in browser → doorloop volledige wizard → verify productkaarten tonen

Formele tests komen bij phase 2 (Magento module).

## Herqua Branding

- **Primary:** `#003366` (donkerblauw — verify exact via herqua.nl)
- **Accent:** `#FF6B00` (energiek oranje)
- **Font:** sportief sans-serif (Inter of system-ui als fallback)
- **Border radius:** 12px
- **Max width:** 680px (conversationeel)
- **Mobile-first** — 70%+ gebruikers zijn mobiel

## Toekomstvastheid (wat phase 2 makkelijk maakt)

- Frontend is framework-loze vanilla JS → direct te bundelen in een Magento `.phtml` template
- Proxy interface (`POST /api/recommend` met profiel → enriched recommendations) is identiek aan wat een Magento REST controller zou doen
- `products.json` heeft dezelfde shape als Magento catalog responses zullen hebben (brand, name, price, image, url, in_stock) → swap is puur data-source
- System prompt staat in één config-constant → makkelijk tunen zonder code-changes

## Open items (niet blokkerend voor demo)

- Exact Herqua primary color via officiële assets (nu benadering `#003366`)
- Herqua logo/lettertype (nu fallback sans-serif)
- Definitieve URL van categoriepagina voor scraper (best gok: `herqua.nl/hardlopen/hardloopschoenen` — scraper moet gracefully falen en duidelijke error geven als URL wijzigt)
