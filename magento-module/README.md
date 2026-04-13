# Herqua_Schoenadviseur — Magento 2 Module (v2c)

Productie-ready Magento 2 module voor de Herqua AI Schoenadviseur.

## Features

- **Product-sync** uit Magento catalog → `pub/media/herqua/products.json`
- **Admin-UI**: Stores > Configuration > Herqua > Schoenadviseur + eigen Field-Mapping page
- **CMS-widget embed** + layout XML + auto-embed op categoriepagina's
- **Bundled of CDN** widget assets (configureerbaar)
- **Externe Node.js AI-backend** (niet in deze module)

## Installatie

### Vereisten

- PHP 8.1+
- Magento 2.4.x (Open Source of Adobe Commerce)
- Composer met `repo.magento.com` credentials geconfigureerd (zie [Magento Marketplace Auth](https://devdocs.magento.com/guides/v2.4/install-gde/prereq/connect-auth.html)) — dit is standaard voor elke Magento-installatie

### Via composer

```bash
composer require herqua/module-schoenadviseur
bin/magento module:enable Herqua_Schoenadviseur
bin/magento setup:upgrade
bin/magento setup:di:compile
bin/magento setup:static-content:deploy
bin/magento cache:flush
```

### Handmatig

Unzip in `app/code/Herqua/Schoenadviseur/`, dan bovenstaande bin/magento commando's.

## Configuratie

1. **Stores > Configuration > Herqua > Schoenadviseur**
   - Enable module
   - Data source: `magento_api`
   - Backend URL + auth-token (gedeeld met Node.js backend, `HERQUA_SHARED_TOKEN`)
   - Widget asset source: `bundled` (default) of `cdn`
2. **Herqua > Field Mapping**
   - Koppel elk widget-veld aan een Magento product-attribute
   - Verplicht: `naam`, `prijs`, `afbeelding`, `url`
3. **Herqua > Rebuild products.json** — run eerste keer handmatig.

## Widget plaatsen

**Optie 1 — CMS Widget:** Content > Widgets > Add Widget > "Herqua Schoenadviseur".

**Optie 2 — Layout XML:**
```xml
<referenceContainer name="content">
    <block class="Herqua\Schoenadviseur\Block\Widget\Adviseur" name="herqua.adviseur"/>
</referenceContainer>
```

**Optie 3 — Auto-embed:** configuratie-toggle, verschijnt dan op alle categoriepagina's.

## Tests

```bash
vendor/bin/phpunit
vendor/bin/phpstan analyse
```

## Smoke-test checklist (voor dev-team)

- [ ] Module laadt: `bin/magento module:status Herqua_Schoenadviseur` toont `enabled`
- [ ] Admin config-pagina zichtbaar en opslagbaar
- [ ] Field-mapping page rendert alle product-attributes
- [ ] Rebuild-knop werkt, `pub/media/herqua/products.json` wordt aangemaakt
- [ ] `/adviseur/products/index` serveert JSON met correcte Content-Type
- [ ] CMS-widget rendert in een testpagina, widget laadt zonder console-errors
- [ ] Scan-endpoints werken end-to-end (met Node-backend + `HERQUA_SHARED_TOKEN`)
