// Scraper voor herqua.nl hardloopschoenen. One-off draaien: node data/scrape-products.js
// Output: data/products.json — bevat Heren + Dames assortiment.
//
// Herqua's categoriepagina's zijn inconsistent; de site-zoekfunctie levert het
// meest betrouwbare resultaat. Gender wordt per product afgeleid uit de URL-slug
// (`-heren-` / `-dames-`) ipv de categoriepagina, omdat de categorieën niet altijd
// corresponderen met de werkelijke producten.
import { chromium } from 'playwright';
import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const SOURCES = [
  { label: 'Heren zoekresultaten', url: 'https://www.herqua.nl/catalogsearch/result/?q=hardloopschoenen+heren' },
  { label: 'Dames zoekresultaten', url: 'https://www.herqua.nl/catalogsearch/result/?q=hardloopschoenen+dames' },
];

const KNOWN_BRANDS = ['ASICS', 'Nike', 'adidas', 'Brooks', 'HOKA', 'Saucony', 'New Balance', 'Mizuno', 'Salomon', 'On', 'Puma'];

function extractBrand(name, productUrl) {
  const text = (name || '') + ' ' + (productUrl || '');
  for (const b of KNOWN_BRANDS) {
    if (text.toLowerCase().includes(b.toLowerCase())) {
      return b;
    }
  }
  return 'Onbekend';
}

function genderFromUrl(url) {
  if (/-heren[-/]/i.test(url)) return 'Heren';
  if (/-dames[-/]/i.test(url)) return 'Dames';
  return 'Unisex';
}

async function scrapeUrl(page, url) {
  console.log(`  Probeer ${url} ...`);
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  for (let i = 0; i < 6; i++) {
    await page.evaluate(() => window.scrollBy(0, 800));
    await page.waitForTimeout(500);
  }
  await page.waitForTimeout(1000);

  const raw = await page.$$eval('li.product-item, .product-item', (items) =>
    items.map((item) => {
      const nameEl = item.querySelector('.product-item-link, .product-item-name a, a.product-item-link');
      const priceEl = item.querySelector('.price, .price-wrapper .price');
      const linkEl = nameEl || item.querySelector('a');

      // Prefereer product-foto's uit Magento's catalog-pad; skip banner/label overlays
      const imgs = Array.from(item.querySelectorAll('img'));
      function pickImage() {
        // 1) exacte match op Magento catalog-pad
        const catalog = imgs.find((img) => {
          const src = img.getAttribute('src') || img.getAttribute('data-src') || '';
          return /\/catalog\/product\//i.test(src);
        });
        if (catalog) return catalog.getAttribute('src') || catalog.getAttribute('data-src');
        // 2) skip img's waarvan class/alt duidelijk een banner/label is
        const bannerPattern = /(sale|actie|label|sticker|badge|banner|korting)/i;
        const cleanFirst = imgs.find((img) => {
          const cls = img.className || '';
          const alt = img.getAttribute('alt') || '';
          return !bannerPattern.test(cls) && !bannerPattern.test(alt);
        });
        if (cleanFirst) return cleanFirst.getAttribute('src') || cleanFirst.getAttribute('data-src');
        // 3) fallback — eerste img
        return imgs[0]?.getAttribute('src') || imgs[0]?.getAttribute('data-src') || '';
      }

      // Echte voorraad-detectie: Magento markeert out-of-stock met een .unavailable of
      // .out-of-stock class, of tekst "Niet op voorraad"/"Uitverkocht".
      const oosPattern = /(niet op voorraad|uitverkocht|out of stock|not in stock)/i;
      const oosText = item.textContent || '';
      const hasOosClass = item.querySelector('.out-of-stock, .unavailable, .stock.unavailable') != null;
      const inStock = !hasOosClass && !oosPattern.test(oosText);

      return {
        name: nameEl?.textContent?.trim() || '',
        price_raw: priceEl?.textContent?.trim() || '',
        image_url: pickImage() || '',
        product_url: linkEl?.getAttribute('href') || '',
        in_stock: inStock,
      };
    })
  );

  return raw.filter((p) => p.name && p.product_url && /hardloopschoen/i.test(p.product_url));
}

async function scrape() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  const all = [];
  for (const source of SOURCES) {
    console.log(`\n[${source.label}]`);
    try {
      const items = await scrapeUrl(page, source.url);
      console.log(`  ${items.length} hardloopschoen-producten gevonden`);
      all.push(...items);
    } catch (err) {
      console.log(`  Fout: ${err.message}`);
    }
  }

  await browser.close();

  if (all.length < 10) {
    console.error(`\nFOUT: slechts ${all.length} producten gevonden (<10). Check URL-structuur van herqua.nl.`);
    process.exit(1);
  }

  // Dedupeer op product_url
  const seen = new Set();
  const unique = all.filter((p) => {
    if (seen.has(p.product_url)) return false;
    seen.add(p.product_url);
    return true;
  });

  const enriched = unique.map((p, i) => {
    const fullUrl = p.product_url.startsWith('http') ? p.product_url : `https://www.herqua.nl${p.product_url}`;
    return {
      id: `herqua-${i + 1}`,
      brand: extractBrand(p.name, fullUrl),
      name: p.name,
      gender: genderFromUrl(fullUrl),
      price: p.price_raw,
      image_url: p.image_url,
      product_url: fullUrl,
      in_stock: p.in_stock !== false,
    };
  });

  const outPath = join(__dirname, 'products.json');
  writeFileSync(outPath, JSON.stringify(enriched, null, 2));

  const heren = enriched.filter((p) => p.gender === 'Heren').length;
  const dames = enriched.filter((p) => p.gender === 'Dames').length;
  const unisex = enriched.filter((p) => p.gender === 'Unisex').length;
  const inStock = enriched.filter((p) => p.in_stock).length;
  const oos = enriched.length - inStock;
  console.log(`\n✓ ${enriched.length} unieke producten opgeslagen (${heren} Heren, ${dames} Dames, ${unisex} Unisex)`);
  console.log(`  Voorraad: ${inStock} op voorraad, ${oos} uit voorraad`);
  console.log(`  Bestand: ${outPath}`);
}

scrape().catch((err) => {
  console.error('Scraper crashed:', err);
  process.exit(1);
});
