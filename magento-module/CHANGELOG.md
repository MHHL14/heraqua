# Changelog

## 2.3.0 (2026-04-13)

Initial productie-release. Zie spec: `docs/superpowers/specs/2026-04-13-herqua-schoenadviseur-v2c-design.md`.

### Added
- Magento 2.4.x module (PHP 8.1+)
- Admin-configuratie: enable/disable, data-source, backend URL + token, widget asset source
- Field-mapping admin-pagina (1-op-1 widget-veld → Magento attribute)
- ProductExporter met required-field validation
- Cron + product-save observer + dirty-flag
- "Rebuild now" admin-knop
- CMS widget, layout XML, auto-embed config
- Bundled widget assets (uit v2b) + CDN-override
- Node.js backend: auth-middleware (shared token), rate-limit (30/uur/IP), CORS-whitelist
- CI: PHPUnit + PHPStan op GitHub Actions
