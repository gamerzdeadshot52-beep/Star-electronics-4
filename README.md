# Star Electronics Ganga — Official Website

Marketing & catalogue website for **Star Electronics Ganga** (mobiles, electronics & furniture),
Sangaria–Sirsa Road, Ganga, Haryana 125103 · Phone / WhatsApp **73573 93293**.

Static site — **no dependencies, no framework, no build server**. A small Node script renders
12 HTML pages from shared templates, so the header, footer, SEO schema and WhatsApp links are
identical on every page. Everything you edit lives in the `data/` folder.

---

## Quick start

Requires Node.js 18+ (nothing to `npm install`).

```bash
node build.mjs     # regenerate all .html pages + sitemap.xml + robots.txt
node serve.mjs     # preview at http://localhost:4173   (404s served correctly)
node verify.mjs    # QA gate: links, SEO tags, schema, assets, bilingual markup
```

Or with npm scripts: `npm run build` · `npm run preview` · `npm run verify`.

`build.mjs` writes the HTML files **into this same folder** (they are the deployable output).

---

## Pages

| File | Purpose |
|---|---|
| `index.html` | Home — hero, categories, featured products, offers, videos, reviews, visit |
| `mobiles.html` / `electronics.html` / `furniture.html` | Catalogue: search, brand/subcategory filters, sort, product enquiry dialog |
| `brands.html` | Brand directory, links into filtered catalogue |
| `offers.html` | Deals with live countdown timers + share |
| `videos.html` | YouTube videos from the store channel (lightbox player) |
| `about.html` | Store story, why-us, trust points |
| `reviews.html` | Customer reviews |
| `contact.html` | Map, hours, call/WhatsApp, enquiry form (sends via WhatsApp) |
| `privacy.html` | Privacy policy |
| `404.html` | Not found (returns HTTP 404, `noindex`) |

Features: English/हिंदी toggle, light/dark mode, sticky header with Call/WhatsApp,
floating WhatsApp + Call buttons, WhatsApp-enquiry pre-filled per product
(`"Hello Star Electronics, I am interested in [Product]…"`), local-business + product + FAQ
schema, sitemap/robots, analytics event hooks, WCAG 2.1 AA, mobile-first down to 360 px.

---

## Editing content (no HTML knowledge needed)

All business content is in `data/`:

| File | What it controls |
|---|---|
| `data/site.mjs` | **Phone, WhatsApp, address, hours, geo, YouTube, domain, GA4/Pixel ids, map links** — edit once, updates every page |
| `data/products.mjs` | Catalogue: categories, subcategories, ~61 products, price bands |
| `data/brands.mjs` | Brand list shown on Brands page + filters |
| `data/offers.mjs` | Offers, discount labels, countdown end dates |
| `data/videos.mjs` | YouTube videos (id, title, date) |
| `data/reviews.mjs` | Customer reviews |

Every text field is bilingual: `{ en: 'English', hi: 'हिंदी' }`.

**Add a product** — append to the right category in `data/products.mjs`:

```js
{
  id: 'realme-narzo-70x',
  cat: 'mobiles', sub: 'smartphone', brand: 'realme',
  name: { en: 'realme NARZO 70x 5G', hi: 'रियलमी नारज़ो 70x 5G' },
  desc: { en: '…', hi: '…' },
  price: 12999,            // or null → "Ask for best price"
  specs: [{ en: '6GB + 128GB', hi: '' }, …],   // max 3 shown
  badge: { en: 'New', hi: 'नया' },             // optional
  // img: 'assets/img/products/realme-narzo-70x.jpg',   // optional real photo
}
```

**Real product photos** — drop images in `assets/img/products/` and set `img:`.
Without `img`, a branded gradient tile with a category icon is generated (no fake photos).

**Add an offer** — edit `data/offers.mjs` (`ends` drives the countdown).
**Add a video** — edit `data/videos.mjs` with the YouTube video id.
**Change phone/hours/domain** — `data/site.mjs` only.

---

## Deployment

The folder *is* the site. Upload the folder as-is (keep the `.html`, `assets/`, `sitemap.xml`,
`robots.txt` files) — no server-side code needed.

- **Netlify**: drag-and-drop this folder at app.netlify.com/drop, or connect Git with
  build command `node build.mjs` and publish directory `.`.
- **Vercel**: framework preset *Other*, build command `node build.mjs`, output directory `.`.
- **Any shared hosting / cPanel**: upload everything via FTP; point the domain at the folder.
- **Custom domain**: register `starelectronicsganga.in`, then set `site.domain` in
  `data/site.mjs` to the live `https://…` URL and rebuild (sitemap + canonical URLs use it).

Before launch run `node verify.mjs` — it must print `✓ all checks passed`.

---

## Checks & quality

- `node verify.mjs` — internal links, `<title>`/meta/canonical/OG tags, JSON-LD schema,
  language spans in attributes, and that every referenced CSS/JS file exists.
- Light & dark themes, EN & HI, 360 px → desktop, keyboard focus visible, reduced-motion safe.
- Analytics: every Call/WhatsApp/product/enquiry/theme/language interaction pushes an event to
  `dataLayer`/`gtag` (works the moment a GA4 id is added in `data/site.mjs`).

---

## Before launch — owner to confirm

1. **Logo** — the current mark is a generated star; supply the real logo (SVG/PNG) for
   `assets/img/logo.*` and swap it in `lib/layout.mjs`.
2. **Brand list & stock** — confirm the brands/`All Brands Available` claim matches what is stocked.
3. **Prices, EMI & warranty claims** — catalogue prices are indicative; confirm every claim
   ("Easy EMI", "Genuine warranty", "12+ years", "15,000+ customers") with the owner before publishing.
4. **Store photos** — add real shop/team photos to `assets/img/` (home, about, contact).
5. **Reviews** — replace placeholder reviews in `data/reviews.mjs` with permissioned ones.
6. **Hours, phone, map pin** — verify `data/site.mjs` (hours, phone, and the geo lat/lng, which is
   approximate until checked against the Google Business Profile pin).
7. **Analytics ids** — GA4 (`site.gaId`) and optional Meta Pixel (`site.fbPixel`).
8. **Domain & email** — register the domain; confirm `starelectronicsganga@gmail.com`.

---

## Project layout

```
build.mjs            # renders all pages + sitemap + robots
serve.mjs            # local preview server (port 4173)
verify.mjs           # QA gate
data/                # all editable content (site, products, brands, offers, videos, reviews)
lib/                 # i18n helpers, icons, UI components, shared page layout
src/                 # page templates (home, catalogue, brands, offers, videos, …)
assets/css/          # design system (light + dark)
assets/js/           # theme, language, menu, filters, dialogs, countdowns, form→WhatsApp
assets/img/          # your photos (logo, store, products) — add here
*.html, sitemap.xml, robots.txt   # generated output (deploy these)
```
