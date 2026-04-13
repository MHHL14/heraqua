# Herqua AI Schoenadviseur

AI-powered hardloopschoen-adviseur voor [Herqua Sports](https://herqua.nl). Een zesstaps-wizard waarin "Herman" (Claude AI) een persoonlijk top-3 schoenadvies geeft op basis van klantprofiel, optioneel aangevuld met een voetscan (Claude Vision) en loopanalyse (MediaPipe Pose, client-side).

## Versies

| Versie | Inhoud |
|---|---|
| **v1 / demo** | Basale 6-staps wizard + Claude-advies |
| **v2a** | Herqua huisstijl + product-matching via scraper |
| **v2b** | Telefoon-scans: voetscan + loopanalyse |
| **v2c** | Magento 2 productie-module + Vercel deploy |

Volledige specs staan in [`docs/specs/`](docs/specs/).

## Snel starten

### 🚀 Online (Vercel)

Zie **[DEPLOY.md](DEPLOY.md)** voor GitHub + Vercel deployment.

### 💻 Lokaal (twee terminals)

**Eenmalig:**
```bash
cp .env.example .env
# Vul ANTHROPIC_API_KEY in .env in

npm install                       # root (Vercel API deps)
cd backend && npm install         # backend deps voor proxy.js
cd ..
```

**Draaien:**
```bash
# Terminal 1 — backend
cd backend && node proxy.js

# Terminal 2 — frontend
cd frontend && python3 -m http.server 8080
```

Open [http://localhost:8080](http://localhost:8080).

### 💻 Lokaal met Vercel CLI (alternatief, one-shot)

```bash
npm install -g vercel
vercel dev    # serveert frontend + /api/* op één poort (3000)
```

### ⏹️ Stoppen

```bash
lsof -ti :3000 :8080 | xargs -r kill -9
```

## Features

- 🧙 **6-staps wizard** — ervaring, terrein, doel, pronatie, maat, voorkeuren
- 🦶 **Voetscan** — telefoon-foto van voet (optioneel op A4 voor schaal) → Claude Vision meet maat, breedte, boog
- 📹 **Loopanalyse** — 15 sec video → MediaPipe Pose (client-side) → Claude analyseert pronatie, landing, cadans
- 🎯 **Product-matching** — AI-advies wordt gekoppeld aan echte Herqua-producten
- 🔒 **Privacy-first** — video verlaat toestel niet, foto's in-memory only, expliciete info-button

## Structuur

```
├── api/                    # Vercel serverless functions (productie)
│   ├── recommend.js        # POST /api/recommend
│   ├── scan/foot.js        # POST /api/scan/foot
│   ├── scan/gait.js        # POST /api/scan/gait
│   └── _lib/shared.js      # CORS/auth/rate-limit
│
├── backend/                # Lokale Node.js proxy (dev)
│   ├── proxy.js            # HTTP server
│   ├── handlers/           # Hergebruikt door api/
│   ├── prompts/            # System prompts voor Claude
│   └── upsells.json        # Merk-upsell mappings
│
├── frontend/               # Statische widget
│   ├── index.html
│   ├── js/                 # widget, wizard, result, scan-foot, scan-gait
│   └── css/                # widget.css, scan.css
│
├── data/                   # products.json + scraper
├── magento-module/         # v2c Magento 2 productie-module
├── docs/
│   ├── architecture.html   # visuele architectuurdiagrammen
│   └── specs/              # design docs v1..v2c
│
├── vercel.json             # Vercel routing + function configs
├── .env.example            # template (kopieer naar .env)
└── DEPLOY.md               # deployment-guide
```

## Architectuur

Twee scenario's — lokaal en Magento — staan grafisch uitgewerkt in [`docs/architecture.html`](docs/architecture.html) (open na `python -m http.server` of Vercel-deploy).

## Magento 2 integratie (v2c)

Productie-ready Magento-module in [`magento-module/`](magento-module/). Zie [magento-module/README.md](magento-module/README.md) voor installatie in Herqua's Magento-instantie.

Kern:
- Admin-UI: **Stores → Configuration → Herqua → Schoenadviseur** + eigen Field Mapping pagina
- `ProductExporter` — Magento catalog → `pub/media/herqua/products.json` (cron + observer)
- CMS widget + layout XML + auto-embed toggle
- 35 unit tests (PHPUnit), PHPStan level 6, GitHub Actions CI

## Smoke-tests

**Wizard:** loop 6 stappen door → krijg top-3 aanbeveling met productlinks.

**Voetscan met A4:** stap 5 → "Doe een voetscan" → "Met A4" → maak foto van voet op A4 → verwacht EU-maat + breedte + boog.

**Voetscan zonder A4:** stap 5 → "Zonder A4" → foto → verwacht breedte + boog zonder maat.

**Loopanalyse:** stap 4 → "Laat Herman het meten" → 15 sec lopen (3-4 passes) → verwacht pronatie + landing + cadans.

**Privacy-info:** in elke scan → "ℹ️ Hoe?" → info-modal met flow-diagram.

## Privacy

- **Voetscan foto's** verwerkt in-memory tijdens de Claude Vision call, direct weggegooid. Geen server-opslag, geen back-ups, geen logging van payloads.
- **Loopanalyse video** verlaat het toestel niet. MediaPipe Pose draait in de browser. Alleen geanonimiseerde bewegingslandmarks (~50-100 KB JSON) gaan naar Claude.
- Geen tracking-cookies, geen persistent camera-toestemming.

## Beveiliging productie

- `HERQUA_SHARED_TOKEN` — Bearer-auth tussen Magento-module en backend
- `ALLOWED_ORIGINS` — CORS-whitelist
- Rate-limit: 30 scans/uur/IP (in-memory)
- Anthropic API-key uitsluitend server-side (Magento encrypted config + Vercel env vars)

## Roadmap

- [ ] MediaPipe Pose lokaal vendoren (nu via CDN)
- [ ] Persistente rate-limit store (Upstash Redis) voor Vercel multi-instance
- [ ] Real Magento 2.4 integratie-tests op dev-instantie Herqua

## Licentie

Proprietary — © Herqua Sports / Chocoladebezorgd B.V. 2026. Zie [LICENSE](LICENSE).
