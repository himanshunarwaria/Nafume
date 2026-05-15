# Deployment Checklist — Nefume Shopify Theme

Use this checklist every time you deploy. Check off each item before moving to the next phase.

---

## 1. GitHub Setup Checklist

- [ ] Git is initialized (`git init`)
- [ ] `.gitignore` is in place — no `.env`, no `node_modules/`, no `.shopify/`
- [ ] Remote is set: `git remote -v` shows `himanshunarwaria/Nafume`
- [ ] All theme files are committed: `git status` shows clean working tree
- [ ] Latest pushed to GitHub: `git push origin main`
- [ ] No secrets, tokens, or passwords in any committed file
- [ ] `README.md`, `DEPLOYMENT_CHECKLIST.md`, `CLIENT_HANDOVER.md` are present

---

## 2. Shopify Connection Checklist

- [ ] Shopify CLI v3+ is installed: `shopify version`
- [ ] Store URL confirmed: `nafume.myshopify.com`
- [ ] Authentication method chosen:
  - [ ] Theme Access password (recommended — generate from Shopify Admin → Themes → ··· → Theme Access)
  - OR
  - [ ] Browser OAuth: `shopify auth login --store nafume.myshopify.com`
- [ ] (Optional) GitHub integration enabled: Shopify Admin → Online Store → Themes → Add theme → Connect from GitHub

---

## 3. Shopify CLI Workflow Checklist

Before every push session:
- [ ] Pull latest theme state: `npm run pull` (or `shopify theme pull --store nafume.myshopify.com`)
- [ ] Confirm `config/settings_data.json` is not accidentally overwritten
- [ ] Run local dev server to verify: `npm run dev`
- [ ] Theme check passes: `npm run check` (fix any errors before pushing)

When pushing:
- [ ] Pushing as **unpublished/dev theme first** — never direct to live
- [ ] Command: `npm run push` (creates new unpublished theme)
- [ ] Verify new theme appears in Shopify Admin → Online Store → Themes (unpublished)
- [ ] Preview unpublished theme in browser before publishing

---

## 4. Pre-Publish Checklist

### Content
- [ ] Logo uploaded (Shopify Admin → Online Store → Themes → Customize → Header)
- [ ] Hero image set (desktop + mobile) in Theme Customizer
- [ ] Homepage sections ordered correctly in Customizer
- [ ] Announcement bar text updated
- [ ] Footer navigation links working
- [ ] Social media links set in footer

### Products & Collections
- [ ] Products have images (primary + hover/secondary image)
- [ ] Product metafields set: `custom.fragrance_family`, `custom.gender`, `custom.badge_label`
- [ ] `main-menu` navigation created in Shopify Admin → Navigation
- [ ] Collection handles match theme references (`fragrances`, `new-launches`, `best-sellers`)

### Theme Settings
- [ ] Free shipping threshold updated in `snippets/cart-drawer-content.liquid` (currently ₹999)
- [ ] Loyalty page URL `/pages/loyalty` exists or cart offer strip updated
- [ ] Contact/about/policy pages created

### Functional Testing
- [ ] Homepage loads correctly (desktop + mobile)
- [ ] Product card quick-add works
- [ ] Product card quick-view opens
- [ ] Product detail page loads: gallery, size selector, sticky add-to-cart
- [ ] Add to cart works and cart drawer opens
- [ ] Cart quantity update and remove item work
- [ ] Search drawer works and returns results
- [ ] Collection page: filters work, sorting works, pagination works
- [ ] Checkout button navigates to Shopify checkout
- [ ] Mobile menu opens and closes
- [ ] All drawers (cart, search, account) open/close correctly
- [ ] Wishlist button visually toggles (note: persistence requires app)
- [ ] Page speed test: PageSpeed Insights score ≥ 70 mobile

### SEO
- [ ] Page titles and meta descriptions set in Shopify Admin
- [ ] Product ALT text on all images
- [ ] Sitemap accessible at `/sitemap.xml`
- [ ] Robots.txt correct

---

## 5. Post-Launch Checklist

- [ ] Published theme is the correct version
- [ ] Old/test themes removed or archived from Shopify Admin
- [ ] Google Analytics / pixel connected (via Shopify Admin → Preferences)
- [ ] Shopify Payments or payment gateway configured
- [ ] Test order placed end-to-end (add → cart → checkout → order confirmation)
- [ ] Order confirmation email template reviewed
- [ ] Backup branch created on GitHub: `git checkout -b backup/launch-v1`
- [ ] Client handed over with CLIENT_HANDOVER.md
- [ ] Any theme code access revoked for contractors who no longer need it

---

## Quick Commands Reference

```bash
# Check Shopify CLI version
shopify version

# Authenticate
shopify auth login --store nafume.myshopify.com

# Dev server
npm run dev

# Pull from Shopify
npm run pull

# Push as new unpublished theme
npm run push

# Lint/check theme
npm run check

# Git backup before risky change
git checkout -b backup/$(Get-Date -Format "yyyy-MM-dd")
git push origin backup/$(Get-Date -Format "yyyy-MM-dd")
```
