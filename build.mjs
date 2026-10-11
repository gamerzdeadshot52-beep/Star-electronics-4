// Static site generator for Star Electronics Ganga — zero dependencies.
// Run:  node build.mjs        (writes .html files, sitemap.xml, robots.txt)

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { site } from './data/site.mjs';
import { page } from './lib/layout.mjs';
import home from './src/home.mjs';
import catalogue from './src/catalogue.mjs';
import brands from './src/brands.mjs';
import offers from './src/offers.mjs';
import videos from './src/videos.mjs';
import about from './src/about.mjs';
import reviews from './src/reviews.mjs';
import contact from './src/contact.mjs';
import privacy from './src/privacy.mjs';
import notfound from './src/notfound.mjs';

const root = dirname(fileURLToPath(import.meta.url));

const pages = {
  'index.html': home,
  'mobiles.html': catalogue.mobiles,
  'electronics.html': catalogue.electronics,
  'furniture.html': catalogue.furniture,
  'brands.html': brands,
  'offers.html': offers,
  'videos.html': videos,
  'about.html': about,
  'reviews.html': reviews,
  'contact.html': contact,
  'privacy.html': privacy,
  '404.html': notfound,
};

let written = 0;
for (const [file, p] of Object.entries(pages)) {
  const opts = { ...p.meta, bodyClass: p.meta.bodyClass || '' };
  const raw = typeof p.body === 'function' ? p.body() : p.body;
  const body = raw.includes('id="main"') ? raw : `<main id="main">\n${raw}\n</main>`;
  const html = page(opts, body);
  writeFileSync(join(root, file), html, 'utf8');
  written += 1;
  console.log(`  ✓ ${file.padEnd(18)} ${(html.length / 1024).toFixed(1)} KB`);
}

// --------------------------------------------------------------- sitemap
const today = new Date().toISOString().slice(0, 10);
const publicPages = Object.keys(pages).filter((f) => f !== '404.html');
const priority = {
  'index.html': '1.0', 'mobiles.html': '0.9', 'electronics.html': '0.9', 'furniture.html': '0.9',
  'offers.html': '0.8', 'brands.html': '0.7', 'contact.html': '0.8', 'videos.html': '0.7',
  'reviews.html': '0.7', 'about.html': '0.6', 'privacy.html': '0.3',
};

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${publicPages
  .map(
    (f) => `  <url>
    <loc>${site.domain}/${f}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${f === 'index.html' ? 'daily' : 'weekly'}</changefreq>
    <priority>${priority[f] || '0.6'}</priority>
  </url>`
  )
  .join('\n')}
</urlset>
`;
writeFileSync(join(root, 'sitemap.xml'), sitemap, 'utf8');
console.log('  ✓ sitemap.xml');

const robots = `# Star Electronics Ganga
User-agent: *
Allow: /
Disallow: /404.html

Sitemap: ${site.domain}/sitemap.xml
`;
writeFileSync(join(root, 'robots.txt'), robots, 'utf8');
console.log('  ✓ robots.txt');

console.log(`\nBuilt ${written} pages + sitemap.xml + robots.txt in ${root}`);
