// Post-build verification: links, assets, SEO tags, schema, language spans.
// Run:  node verify.mjs   (exit code 1 if anything fails)
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const problems = [];
const notes = [];
const fail = (m) => problems.push(m);

const htmlFiles = readdirSync(root).filter((f) => f.endsWith('.html'));
notes.push(`pages: ${htmlFiles.length}`);

const INTERNAL_EXT = /\.(html|css|js|mjs|svg|png|jpg|jpeg|webp|xml|txt|json)$/i;

for (const file of htmlFiles) {
  const src = readFileSync(join(root, file), 'utf8');
  const tag = (m) => `${file}: ${m}`;

  // ---- structural essentials
  if (!/^<!doctype html>/i.test(src.trim())) fail(tag('missing doctype'));
  if (!/<html[^>]+lang=/.test(src)) fail(tag('missing <html lang>'));
  if (!/<meta name="viewport"/.test(src)) fail(tag('missing viewport meta'));
  if (!/<title>[^<]{10,}<\/title>/.test(src)) fail(tag('missing/short <title>'));
  if (!/<meta name="description" content="[^"]{50,}"/.test(src)) fail(tag('meta description missing or too short (<50 chars)'));
  if (!/<link rel="canonical"/.test(src)) fail(tag('missing canonical'));
  if (!/<main[^>]*\bid="main"/.test(src)) fail(tag('missing <main id="main">'));
  if (!/<h1[\s>]/.test(src)) fail(tag('missing <h1>'));
  const h1s = src.match(/<h1[\s>]/g) || [];
  if (h1s.length !== 1) fail(tag(`expected exactly 1 <h1>, found ${h1s.length}`));
  if (!/assets\/css\/style\.css/.test(src)) fail(tag('missing stylesheet link'));
  if (!/assets\/js\/main\.js/.test(src)) fail(tag('missing script tag'));
  if (!/site-header/.test(src)) fail(tag('missing site header'));
  if (!/site-footer/.test(src)) fail(tag('missing site footer'));

  // ---- noindex handling
  const noindex = /name="robots" content="noindex/.test(src);
  if (file === '404.html' && !noindex) fail(tag('404 should be noindex'));
  if (file !== '404.html' && noindex) fail(tag('unexpected noindex'));

  // ---- JSON-LD validity
  const ldBlocks = [...src.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  if (ldBlocks.length === 0 && file !== '404.html') fail(tag('no JSON-LD structured data'));
  ldBlocks.forEach((m, i) => {
    try { JSON.parse(m[1]); } catch (e) { fail(tag(`JSON-LD block ${i + 1} invalid: ${e.message}`)); }
  });

  // ---- bilingual spans must not leak into attributes
  const attrLeaks = src.match(/(?:aria-label|alt|title|placeholder)="[^"]*<span/g);
  if (attrLeaks) fail(tag(`language span inside an attribute (${attrLeaks.length}x): ${attrLeaks[0].slice(0, 90)}`));

  // ---- no raw template leftovers
  ['undefined', '[object Object]', 'NaN%', '${'].forEach((bad) => {
    if (src.includes(bad)) fail(tag(`contains suspicious text "${bad}"`));
  });

  // ---- header active state (desktop nav + mobile menu mirror the same link)
  const activeCount = (src.match(/nav-link is-active/g) || []).length;
  if (activeCount !== 0 && activeCount !== 2) fail(tag(`active nav link should appear twice (desktop + mobile), found ${activeCount}`));

  // ---- internal links + assets
  const refs = [...src.matchAll(/(?:href|src)="([^"]+)"/g)].map((m) => m[1]);
  for (const ref of refs) {
    if (/^(https?:|mailto:|tel:|data:|#|\/\/)/i.test(ref)) continue;
    const clean = ref.split('?')[0].split('#')[0];
    if (!clean) continue;
    if (!INTERNAL_EXT.test(clean)) { fail(tag(`unrecognised local ref "${ref}"`)); continue; }
    if (!existsSync(join(root, clean))) fail(tag(`broken local ref "${ref}"`));
  }

  // ---- WhatsApp / phone correctness
  if (src.includes('wa.me/') && !/wa\.me\/917357393293/.test(src)) fail(tag('wa.me link does not use 917357393293'));
  if (/tel:/.test(src) && !/tel:\+917357393293/.test(src)) fail(tag('tel: link does not use +917357393293'));

  // ---- both languages present (except 404 has them too, so require everywhere)
  const en = (src.match(/class="l-en"/g) || []).length;
  const hi = (src.match(/class="l-hi"/g) || []).length;
  if (en === 0 || hi === 0) fail(tag(`missing translations (en:${en}, hi:${hi})`));
  else if (Math.abs(en - hi) > Math.max(6, en * 0.25)) notes.push(`${file}: en/hi span count differs (en:${en}, hi:${hi})`);
}

// ---- site-wide files
['sitemap.xml', 'robots.txt', 'assets/css/style.css', 'assets/js/main.js'].forEach((f) => {
  if (!existsSync(join(root, f))) fail(`missing required file: ${f}`);
});

const sitemap = readFileSync(join(root, 'sitemap.xml'), 'utf8');
[...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].forEach((m) => {
  const f = m[1].replace(/^https?:\/\/[^/]+\//, '');
  if (!existsSync(join(root, f))) fail(`sitemap points to missing page: ${f}`);
});
if (sitemap.includes('/404.html')) fail('sitemap must not list 404.html');

const robots = readFileSync(join(root, 'robots.txt'), 'utf8');
if (!robots.includes('Sitemap:')) fail('robots.txt missing Sitemap line');

// ---- styles / scripts referenced exist
const css = readFileSync(join(root, 'assets/css/style.css'), 'utf8');
const js = readFileSync(join(root, 'assets/js/main.js'), 'utf8');
if (!css.includes('@media (prefers-reduced-motion: reduce)')) fail('CSS missing reduced-motion support');
if (!css.includes('@media (max-width: 720px)')) fail('CSS missing mobile breakpoint');
if (!js.includes("'use strict'")) fail('main.js missing strict mode');
notes.push(`css: ${(css.length / 1024).toFixed(1)} KB, js: ${(js.length / 1024).toFixed(1)} KB`);

// ---- weight budget (home page, uncompressed html + css + js)
const homeSize = statSync(join(root, 'index.html')).size;
const total = homeSize + css.length + js.length;
notes.push(`home initial payload (html+css+js, uncompressed): ${(total / 1024).toFixed(1)} KB`);
if (total > 300 * 1024) fail(`home payload too heavy: ${(total / 1024).toFixed(1)} KB`);

// ---------------------------------------------------------------- report
notes.forEach((n) => console.log('  · ' + n));
if (problems.length) {
  console.error(`\n✗ ${problems.length} problem(s):`);
  problems.forEach((p) => console.error('  ✗ ' + p));
  process.exit(1);
}
console.log('\n✓ all checks passed');
