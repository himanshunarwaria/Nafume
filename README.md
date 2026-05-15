# Nefume — Shopify 2.0 Theme

Custom Shopify Online Store 2.0 theme for **Nefume** — a premium D2C fragrance brand.  
Built from scratch: no base theme dependency, full design-system ownership.

---

## Folder Structure

```
nefume-theme/
├── assets/               CSS, JS, and static files
│   ├── theme.css         Global design system (tokens, reset, layout, components)
│   ├── theme.js          Global JS (accordion, scroll effects)
│   ├── hero.css          Hero banner styles
│   ├── product-card.css  Product card component
│   ├── product-carousel.css/js  Homepage carousel section
│   ├── cart-drawer.js    Cart drawer AJAX logic
│   ├── drawers.js        Shared drawer open/close/overlay logic
│   ├── header.js         Sticky header, search, account drawer
│   ├── facets.js         Collection filter + sort
│   ├── quick-add.js      Quick-add to cart
│   ├── quick-view.js     Quick-view modal
│   └── ...               Other section-scoped CSS/JS
│
├── config/
│   ├── settings_schema.json   Theme customizer schema
│   └── settings_data.json     Saved customizer values (do not overwrite blindly)
│
├── layout/
│   └── theme.liquid      Master layout: <head>, fonts, global scripts
│
├── locales/
│   └── en.default.json   Translation strings
│
├── sections/             Section Liquid files (each is a customizer block)
│   ├── header.liquid
│   ├── footer.liquid
│   ├── hero-banner.liquid
│   ├── product-carousel.liquid
│   ├── announcement-bar.liquid
│   └── ...
│
├── snippets/             Reusable Liquid partials
│   ├── product-card.liquid
│   ├── cart-drawer.liquid
│   ├── price.liquid
│   ├── quick-add.liquid
│   └── ...
│
├── templates/            Page templates (JSON = Sections Everywhere)
│   ├── index.json        Homepage
│   ├── product.json      Product page
│   ├── collection.json   Collection page
│   └── page.json         Static pages
│
├── .gitignore
├── README.md             ← you are here
├── DEPLOYMENT_CHECKLIST.md
├── CLIENT_HANDOVER.md
└── package.json
```

---

## Local Development

### Prerequisites

- [Shopify CLI v3+](https://shopify.dev/docs/themes/tools/cli/install)
- Node.js 18+ (for CLI only — theme has no Node build step)
- Git

### Start local dev server (live preview + hot reload)

```bash
shopify theme dev --store nafume.myshopify.com
```

This opens a preview URL. Changes to any file are reflected instantly.

### Pull latest theme from Shopify

```bash
shopify theme pull --store nafume.myshopify.com
```

> Run this before making changes to avoid overwriting customizer edits.

### Push theme to Shopify (new unpublished theme)

```bash
shopify theme push --store nafume.myshopify.com --unpublished --theme "Nefume Dev"
```

### Push to existing theme by ID

```bash
shopify theme push --store nafume.myshopify.com --theme <THEME_ID>
```

> Find the theme ID in Shopify Admin → Online Store → Themes → ··· → Edit code (the ID is in the URL).

---

## GitHub Workflow

### First-time setup

```bash
git init
git add .
git commit -m "Initial Shopify theme setup"
git branch -M main
git remote add origin https://github.com/himanshunarwaria/Nafume.git
git push -u origin main
```

### Daily workflow

```bash
# 1. Pull any remote changes
git pull origin main

# 2. Make your edits locally
# 3. Stage and commit
git add .
git commit -m "feat: describe your change"

# 4. Push to GitHub
git push origin main
```

### Staging branch workflow

```bash
# Create and push a staging branch
git checkout -b staging
git push -u origin staging

# Merge staging into main when ready
git checkout main
git merge staging
git push origin main
```

---

## Shopify GitHub Integration (Optional)

Shopify supports direct GitHub → Shopify sync:

1. Shopify Admin → **Online Store → Themes**
2. Click **Add theme → Connect from GitHub**
3. Authorize Shopify GitHub app
4. Select repo `himanshunarwaria/Nafume` and branch `main`
5. Shopify auto-deploys on every push to that branch

> Use a `staging` branch for testing before merging to `main`.

---

## Deployment Safety Rules

- Always `theme pull` before starting work — customizer data can change.
- Never push directly to the **live/published** theme. Use unpublished/dev themes first.
- Never overwrite `config/settings_data.json` blindly — it contains all customizer settings.
- Test on mobile before publishing. Check: cart drawer, product page, checkout button, collection filters.
- Commit a backup branch before major changes: `git checkout -b backup/pre-redesign`.

---

## npm Scripts

```bash
npm run dev      # Start Shopify CLI dev server
npm run push     # Push as new unpublished theme
npm run pull     # Pull latest from Shopify
npm run check    # Run Shopify theme check (linter)
```

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Platform | Shopify Online Store 2.0 |
| Templating | Liquid |
| Styling | Vanilla CSS with custom properties (design tokens) |
| JS | Vanilla ES6+ (no framework, no bundler) |
| Fonts | Google Fonts — Cormorant Garamond + Jost |
| Icons | Inline SVG |
| Deployment | Shopify CLI v3 / GitHub |

---

## Environment Variables

No secrets live in this repo. Authentication is handled by:
- **Shopify CLI**: browser OAuth or Theme Access password (entered at runtime)
- **GitHub Actions** (if added): store via GitHub Secrets, never in code
