# Client Handover Guide — Nefume Shopify Store

Welcome to your Nefume Shopify store. This guide explains how to manage your store day-to-day using the Shopify Admin — **no coding required** for the tasks below.

---

## Accessing Your Store

- **Shopify Admin:** https://admin.shopify.com/store/nafume
- **Your store URL:** https://nafume.myshopify.com
- Log in with your Shopify account email and password.

---

## 1. How to Edit Products

1. Go to **Admin → Products**
2. Click any product to open it
3. You can edit:
   - **Title** — product name
   - **Description** — shown on the product page
   - **Price** and **Compare at price** (compare price shows the strikethrough "was" price)
   - **Variants** — sizes, volumes (e.g. 30ml / 60ml / 100ml)
   - **Inventory** — stock quantity per variant
   - **Collections** — which collection(s) this product appears in

---

## 2. How to Add Product Images and Videos

1. Go to **Admin → Products** → open a product
2. In the **Media** section:
   - Click **Add media** to upload images or video
   - **First image** = primary card image (shown in listings)
   - **Second image** = hover image (shown when user hovers the card on desktop)
   - Images should be **square or portrait** (recommended: 1200 × 1500px)
   - Supported: JPG, PNG, WebP, MP4 (video)
3. Add **ALT text** to every image (click the image → edit ALT text) — this helps SEO and accessibility

---

## 3. How to Update Homepage Sections

1. Go to **Admin → Online Store → Themes**
2. Click **Customize** on your published theme
3. The left panel shows all homepage sections — click any to edit:
   - **Announcement Bar** — update the sale/offer text
   - **Hero Banner** — change image, heading, subheading, button text/link
   - **Product Carousel** — title, subtitle, which collection to pull products from
   - **Editorial Marquee** — the scrolling text strip
   - **Dual Collection Banner** — the side-by-side category images
   - **Review Carousel** — customer review cards
   - **Newsletter** — heading and signup text
   - **Footer** — links, social media URLs, address
4. Click **Save** (top right) when done

> **Tip:** You can reorder, hide, or show sections using the eye icon in the left panel.

---

## 4. How to Add Product Badges

Products can show **"New Launch"**, **"Bestseller"**, or **"Popular Choice"** badges on their cards.

1. Go to **Admin → Products** → open a product
2. Scroll to **Metafields** (bottom of the page)
3. Find `custom.badge_label` and enter one of:
   - `New Launch`
   - `Bestseller`
   - `Popular Choice`
4. Save the product

> If you don't see metafields, go to **Admin → Settings → Custom data → Products** and create them first.

---

## 5. How to Manage Orders

1. Go to **Admin → Orders**
2. Click any order to view details
3. From here you can:
   - **Fulfill** the order (mark as shipped, add tracking number)
   - **Refund** or cancel an order
   - View customer details and contact info
   - Print packing slips

---

## 6. How to Add UGC Videos / Social Proof

Currently the theme supports UGC via the **Review Carousel** section (text + star ratings).

To add video UGC in the future:
- Ask your developer to add a video block to the homepage
- OR use a Shopify app like **Loox**, **Yotpo**, or **Videowise** for Instagram/TikTok-style video reviews

---

## 7. How to Add Collections

1. Go to **Admin → Products → Collections**
2. Click **Create collection**
3. Set the title (e.g. "New Launches", "Best Sellers", "For Him")
4. Add products manually or set auto-conditions (e.g. tag = "new-launch")
5. The **handle** (URL slug) is auto-generated — make sure it matches what the theme uses:
   - Homepage carousels pull from collection handles set in the Customizer

---

## 8. How to Update Navigation Menus

1. Go to **Admin → Online Store → Navigation**
2. Click **Main menu** (used in the header)
3. Add, remove, or reorder links
4. Click **Save menu**

---

## 9. How to Run a Sale / Discount

1. Go to **Admin → Discounts**
2. Click **Create discount**
3. Choose type: Percentage, Fixed amount, Free shipping, Buy X Get Y
4. Set the discount code or make it automatic
5. Set start/end dates

> To show a "Compare at price" on product cards (e.g. ~~₹999~~ ₹799): edit each product → set "Compare at price" to the original price.

---

## 10. What You Should NOT Touch in the Theme Code

Please do not edit the following files unless you have a developer helping you:

| File / Folder | Why |
|---------------|-----|
| `layout/theme.liquid` | Master page structure — breaking this breaks the entire store |
| `config/settings_schema.json` | Customizer schema — errors here remove sections from the customizer |
| `config/settings_data.json` | Your saved customizer settings — overwriting this resets all customizations |
| `assets/theme.css` | Global design system — changes affect every page |
| Any `snippets/*.liquid` | Shared components used across multiple pages |
| Any `sections/*.liquid` | Section logic — syntax errors break the customizer |

**Safe to edit without a developer:**
- Product titles, descriptions, prices, images (via Admin)
- Homepage section content (via Customizer)
- Navigation menus (via Admin → Navigation)
- Discount codes (via Admin → Discounts)
- Store policies (via Admin → Settings → Policies)

---

## 11. Getting Help

- **Shopify Help Center:** https://help.shopify.com
- **Theme developer:** Himanshu Narwaria — for any code-level changes, contact your developer before editing theme files directly.
- **Shopify Support:** Available 24/7 via chat in your Admin

---

## 12. Important Store Settings to Complete

Before going live, make sure these are done in **Admin → Settings**:

- [ ] Store name and contact email set
- [ ] Payment providers configured (Shopify Payments / Razorpay / etc.)
- [ ] Shipping zones and rates set
- [ ] Tax settings correct for India
- [ ] Legal pages created: Refund Policy, Privacy Policy, Terms of Service, Shipping Policy
- [ ] Notification emails (order confirmation, shipping) customized with your brand name
