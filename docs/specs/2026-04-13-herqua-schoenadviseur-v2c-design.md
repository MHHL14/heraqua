# Herqua Schoenadviseur v2c — Productie-ready Magento 2 Module

**Status:** Design approved 2026-04-13
**Voorgangers:** v1 (demo), v2a (huisstijl + data), v2b (telefoon-scans)
**Doel:** Demo omzetten naar installeerbare Magento 2 module met admin-UI.

## Samenvatting

v2c levert een Magento 2 module (`Herqua_Schoenadviseur`) die:
- Product-data uit Magento ontsluit via REST (vervangt de scraper uit v2a)
- Admin-UI biedt voor data-source switch, field-mapping, en backend-configuratie
- Widget-embed mogelijk maakt via CMS-widget, layout XML of handmatige embed
- Widget-assets bundelt (met optionele CDN-override)
- De bestaande Node.js AI-backend ongewijzigd gebruikt (externe service)

## Architectuur

```
┌───────────────────────────────────────────────┐
│ Magento 2 (Herqua's webshop)                  │
│  Herqua_Schoenadviseur module (PHP)           │
│    ├─ Admin config + field-mapping UI         │
│    ├─ ProductExporter (REST → products.json)  │
│    ├─ Cron + save-observer + rebuild-knop     │
│    ├─ Storefront controller /adviseur/*       │
│    └─ Layout XML + CMS widget                 │
└───────────────────────────────────────────────┘
         ↓ serves products.json + widget assets
┌───────────────────────┐      ┌──────────────────────┐
│ Widget JS (browser)   │────→ │ Node.js backend      │
│ wizard + scan-modals  │ POST │ (extern, v2b proxy)  │
└───────────────────────┘      │ → Anthropic API      │
                               └──────────────────────┘
```

**Verantwoordelijkheden:**
- Magento-module: product-data, admin-UI, widget-embed, asset-serving
- Node.js backend: AI-calls (Vision, pose, advies) — ongewijzigd uit v2b
- Widget frontend: leest `products.json` uit Magento, praat met Node-backend voor AI

## Module-structuur

Vendor `Herqua`, module `Schoenadviseur`.

```
app/code/Herqua/Schoenadviseur/
├── registration.php
├── composer.json
├── etc/
│   ├── module.xml
│   ├── config.xml              # defaults
│   ├── crontab.xml             # product-sync cron
│   ├── events.xml              # observer voor product-save
│   ├── acl.xml                 # admin-permissies
│   ├── di.xml
│   ├── adminhtml/
│   │   ├── routes.xml
│   │   ├── menu.xml            # "Herqua > Schoenadviseur" menu
│   │   └── system.xml          # Stores > Config sectie
│   ├── frontend/
│   │   └── routes.xml          # /adviseur/... frontend route
│   └── widget.xml              # CMS-widget registratie
├── Model/
│   ├── Config.php              # getters voor alle settings
│   ├── ProductExporter.php     # query + map → products.json
│   ├── FieldMapping.php        # load/save mapping config
│   └── Cache/ProductsCache.php # file cache in var/herqua/
├── Cron/
│   └── RebuildProducts.php
├── Observer/
│   └── ProductSaveInvalidate.php
├── Controller/
│   ├── Adminhtml/
│   │   ├── Mapping/Index.php   # field-mapping UI
│   │   ├── Mapping/Save.php
│   │   └── Rebuild/Index.php   # "rebuild now" knop
│   └── Frontend/
│       ├── Products/Index.php  # GET /adviseur/products.json
│       └── Widget/Index.php    # optioneel standalone embed
├── Block/
│   └── Widget/Adviseur.php     # CMS-widget block
├── view/
│   ├── adminhtml/
│   │   ├── layout/
│   │   ├── templates/mapping.phtml
│   │   └── web/js/mapping.js
│   └── frontend/
│       ├── layout/default.xml  # optioneel auto-embed
│       └── web/
│           ├── js/widget.js, wizard.js, result.js,
│           │     scan-foot.js, scan-gait.js, privacy-info.js
│           └── css/widget.css, scan.css
└── Setup/Patch/Data/            # leeg — geen DB-schema
```

**Geen custom DB-tabellen.** Field-mapping leeft in `core_config_data` als JSON. Products-cache in `var/herqua/products.json` + publieke mirror in `pub/media/herqua/products.json`.

## Admin-UI

### Stores > Configuration > Herqua > Schoenadviseur (`system.xml`)

| Groep | Veld | Type |
|---|---|---|
| General | Enabled | yes/no |
| General | Data source | select: `scraping` \| `magento_api` |
| Backend | AI backend URL | text |
| Backend | AI backend auth token | encrypted |
| Backend | Anthropic API key | encrypted (alleen voor edge-cases) |
| Widget | Asset source | select: `bundled` \| `cdn` |
| Widget | CDN URL | text (alleen bij `cdn`) |
| Widget | Auto-embed op categorie-pagina's | yes/no |
| Sync | Cron-frequentie | select: `hourly` \| `every_6h` \| `daily` |
| Sync | Product filter (category ID) | text (optioneel) |

### Herqua > Field Mapping (eigen admin-pagina)

Tabel met links de widget-velden, rechts een dropdown van Magento product-attributes.

| Widget-veld | Default | Verplicht |
|---|---|---|
| naam | `name` | ✓ |
| prijs | `price` | ✓ |
| afbeelding | `image` | ✓ |
| url | afgeleid van URL-key | ✓ |
| stabiliteit | — (dropdown) | |
| drop (mm) | — (dropdown) | |
| gewicht (g) | — (dropdown) | |
| pronatie_geschikt | — (dropdown) | |
| categorie_hardloopschoen | — (dropdown) | |
| merk | `manufacturer` | |

Onder de tabel: **[Save mapping]** en **[Rebuild products.json now]** knoppen. Status-regel toont laatste sync-timestamp en product-count.

### Data-source switch gedrag

- `scraping` → exporter disabled; widget gebruikt losse `products.json` file (backwards-compat v2b)
- `magento_api` → exporter actief, cron + observer aan

## Product-sync flow

**Bronnen van waarheid:**
- Input: Magento catalog via `\Magento\Catalog\Api\ProductRepositoryInterface`
- Output: `pub/media/herqua/products.json` (publiek) + `var/herqua/products.json` (mirror)

### Drie triggers, één `ProductExporter::rebuild()`

1. **Cron** (`Cron/RebuildProducts.php`)
   - Frequentie uit config (1u / 6u / 24u)
   - Skipt als `data_source != magento_api` of module disabled

2. **Observer** (`Observer/ProductSaveInvalidate.php`)
   - Luistert op `catalog_product_save_after`
   - Zet cache-flag "dirty" → volgende cron-tick of admin-rebuild doet het werk
   - Voorkomt 200× rebuild bij bulk-import

3. **Admin-knop "Rebuild now"**
   - Synchrone rebuild, geeft progress terug (aantal producten verwerkt)

### `ProductExporter::rebuild()` stappen

1. Query producten (filter: enabled + visible + optionele category-id)
2. Voor elk product: lees Magento attributes volgens `FieldMapping`
3. Transformeer naar widget-schema (zelfde JSON-vorm als v2b `data/products.json`)
4. Atomair schrijven: write `products.json.tmp` → rename
5. Log timestamp, count, duration (zichtbaar in admin)

### Frontend endpoint

`GET /adviseur/products.json`:
- Serveert cache-file met Cache-Control (5 min)
- Alternatief: redirect naar `pub/media/herqua/products.json` voor CDN-edge-caching

### Fout-afhandeling

- Rebuild faalt → oude `products.json` blijft staan, fout in admin-log + standaard Magento admin-notification
- Ontbrekende verplichte mapping → rebuild weigert, admin-notice "Veld X niet gemapt"

## Widget-embed

### Drie embed-opties

**CMS Widget** (voor content-editors) — `Block/Widget/Adviseur.php` + `etc/widget.xml`. Verschijnt in Magento admin onder **Content > Widgets > Add Widget**. Parameters: `container_id`, optionele `start_step`.

**Layout XML** (voor developer-embed):
```xml
<referenceContainer name="content">
  <block class="Herqua\Schoenadviseur\Block\Widget\Adviseur" name="herqua.adviseur"/>
</referenceContainer>
```
Auto-embed optie uit admin config voegt dit toe aan category-view layout.

**Handmatige embed** in custom templates:
```phtml
<?= $block->getLayout()
    ->createBlock(\Herqua\Schoenadviseur\Block\Widget\Adviseur::class)
    ->toHtml(); ?>
```

### Asset-loading (bundled vs CDN)

`Block/Widget/Adviseur::_toHtml()` rendert:
```html
<div id="herqua-adviseur"></div>
<script>
  window.HERQUA_CONFIG = {
    productsUrl: '/adviseur/products.json',
    backendUrl: '<?= $config->getBackendUrl() ?>',
    authToken: '<?= $config->getBackendToken() ?>'
  };
</script>
<script src="<?= $assetUrl ?>/widget.js" defer></script>
<link rel="stylesheet" href="<?= $assetUrl ?>/widget.css">
```

`$assetUrl`:
- `bundled` → `view/frontend/web/` via Magento's static-content deploy
- `cdn` → geconfigureerde CDN-URL (bijv. `https://cdn.herqua.ai/v2c/`)

### Widget-aanpassingen t.o.v. v2b

- `products.json` path → via `window.HERQUA_CONFIG` (was hardcoded)
- Backend-URL idem (was `http://localhost:3000`)
- Scans, wizard, resultaat werken verder identiek

## Config, secrets & security

### Secrets opslag

- AI-backend auth-token, Anthropic key → Magento encrypted config (`Magento\Config\Model\Config\Backend\Encrypted`)
- Secrets gaan **nooit** naar de browser
- Auth-token wordt alleen server-side in `HERQUA_CONFIG` geïnjecteerd; storefront JS stuurt als `Authorization: Bearer ...` naar Node-backend

### Node-backend auth

- `proxy.js` leest `HERQUA_SHARED_TOKEN` env var
- Middleware checkt token op elke `/api/*` route; 401 bij mismatch
- Voorkomt leeglekken van Anthropic-budget

### CORS

- Node-backend CORS whitelist uit env (`ALLOWED_ORIGINS=https://herqua.nl,https://www.herqua.nl`)

### ACL

- `acl.xml` definieert `Herqua_Schoenadviseur::config` en `::mapping`
- Alleen admin-rollen met permissie zien menu-items

### Rate-limiting

- Node-backend: simple in-memory counter per IP (30 scans/uur/IP)
- Magento-kant: geen rate-limit nodig (products.json is static/cached)

### Privacy

- Privacy-strip uit v2b blijft; geen tracking-cookies
- Foto's niet persistent (bestaand gedrag)
- Log-redactie: geen image-payloads in logs

## Testing & distributie

### Tests (zonder Magento-instantie)

- **PHPUnit unit tests** met gemockte Magento-interfaces
  - `ProductExporterTest` — mock product-array → verify JSON-schema
  - `FieldMappingTest` — laden/opslaan uit config
  - `ConfigTest` — defaults
- **Static analysis** — PHPStan level 6 + `magento-coding-standard` (phpcs)
- **Schema-compatibility test** — v2b `data/products.json` én nieuwe export beide accepteerbaar door widget
- **Integration test placeholder** — smoke-test checklist in README voor Herqua's dev-team

### CI

- GitHub Actions: PHPUnit + PHPStan + phpcs op elke push
- Geen echte Magento-integration-tests

### Distributie

- Composer-package `herqua/module-schoenadviseur` (private Packagist of zip-release)
- Semver: v2.c.x
- README met `composer require` + `bin/magento module:enable Herqua_Schoenadviseur` + `setup:upgrade` flow
- CHANGELOG.md voor release notes

### Levering

- Tagged release → Herqua's dev-team installeert op dev-Magento
- Smoke-test checklist
- Bugfix-loop op basis van feedback

## Niet in scope

- AI-backend migreren naar PHP (blijft Node.js)
- Scan-upload endpoints via Magento-controller (blijven op Node-backend)
- Value-transformaties in field-mapping (bijv. mm→categorie); alleen 1-op-1 dropdown mapping
- Multi-store / multi-website specifieke configuratie (later, na MVP-release)
- Echte Magento-integration-tests (geen dev-instantie beschikbaar)
