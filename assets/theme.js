/* ============================================================
   NEFUME — theme.js
   Vanilla JS, no dependencies.
   Modules: Hero · Carousel · Accordion · QuickView
            StickyATC · Variants · FilterDrawer
            Gallery · Wishlist · Toast · Marquee
            Sort · ScrollReveal

   Drawers, cart, ATC, search handled by drawers.js & cart-drawer.js
   Header & announcement bar handled by header.js
   ============================================================ */

'use strict';

const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];
const on = (el, ev, fn, opts) => el && el.addEventListener(ev, fn, opts);

/* ============================================================
   Hero Slider
   ============================================================ */
function initHero() {
  $$('.hero').forEach(hero => {
    const slides = $$('.hero__slide', hero);
    if (slides.length <= 1) return;

    let cur   = 0;
    let timer = null;
    const dots  = $$('.hero__dot', hero);
    const delay = parseInt(hero.dataset.delay || '5000');

    const goTo = idx => {
      slides[cur].classList.remove('is-active');
      dots[cur]?.classList.remove('is-active');
      cur = (idx + slides.length) % slides.length;
      slides[cur].classList.add('is-active');
      dots[cur]?.classList.add('is-active');
    };

    const start = () => { timer = setInterval(() => goTo(cur + 1), delay); };
    const stop  = () => clearInterval(timer);

    on(hero.querySelector('.hero__next'), 'click', () => { stop(); goTo(cur + 1); start(); });
    on(hero.querySelector('.hero__prev'), 'click', () => { stop(); goTo(cur - 1); start(); });
    dots.forEach((d, i) => on(d, 'click', () => { stop(); goTo(i); start(); }));

    let sx = 0;
    on(hero, 'touchstart', e => { sx = e.touches[0].clientX; }, { passive: true });
    on(hero, 'touchend',   e => {
      const diff = sx - e.changedTouches[0].clientX;
      if (Math.abs(diff) > 50) { stop(); goTo(cur + (diff > 0 ? 1 : -1)); start(); }
    }, { passive: true });

    on(hero, 'mouseenter', stop);
    on(hero, 'mouseleave', start);
    start();
  });
}

/* ============================================================
   Accordion
   ============================================================ */
function initAccordions() {
  $$('.accordion').forEach(acc => {
    const multi = acc.dataset.multi === 'true';
    $$('.accordion-item', acc).forEach(item => {
      const trigger = item.querySelector('.accordion-trigger');
      const body    = item.querySelector('.accordion-body');
      if (!trigger || !body) return;

      on(trigger, 'click', () => {
        const wasOpen = item.classList.contains('is-open');
        if (!multi) {
          $$('.accordion-item', acc).forEach(i => {
            i.classList.remove('is-open');
            i.querySelector('.accordion-body')?.classList.remove('is-open');
            i.querySelector('.accordion-trigger')?.setAttribute('aria-expanded', 'false');
          });
        }
        item.classList.toggle('is-open', !wasOpen);
        body.classList.toggle('is-open', !wasOpen);
        trigger.setAttribute('aria-expanded', String(!wasOpen));
      });
    });
  });
}

/* ============================================================
   Quick View
   ============================================================ */
function initQuickView() {
  const modal   = $('#quick-view-modal');
  const overlay = $('#quick-view-overlay');
  if (!modal || !overlay) return;

  const lock   = () => window.NefumeApp?.lockScroll()   ?? document.body.classList.add('is-locked');
  const unlock = () => window.NefumeApp?.unlockScroll() ?? document.body.classList.remove('is-locked');
  const trap   = el => window.NefumeApp?.trapFocus(el);

  const close = () => {
    modal.classList.remove('is-open');
    overlay.classList.remove('is-open');
    unlock();
  };

  on(overlay, 'click', close);
  on(modal.querySelector('.modal__close'), 'click', close);
  on(document, 'keydown', e => { if (e.key === 'Escape') close(); });

  on(document, 'click', async e => {
    const btn = e.target.closest('[data-quick-view]');
    if (!btn) return;
    modal.classList.add('is-open');
    overlay.classList.add('is-open');
    lock();
    trap(modal);

    const gallery = modal.querySelector('.modal__gallery');
    const body    = modal.querySelector('.modal__body');

    try {
      const resp = await fetch(`/products/${btn.dataset.quickView}?view=quick-view`);
      const doc  = new DOMParser().parseFromString(await resp.text(), 'text/html');
      if (gallery) gallery.innerHTML = doc.querySelector('[data-qv-gallery]')?.innerHTML || '';
      if (body)    body.innerHTML    = doc.querySelector('[data-qv-body]')?.innerHTML    || '';
    } catch {
      if (body) body.innerHTML = `<p>Could not load product. <a href="/products/${btn.dataset.quickView}">View full page</a></p>`;
    }
  });
}

/* ============================================================
   Gallery Thumbnails
   ============================================================ */
function initGallery() {
  $$('.product-gallery').forEach(gallery => {
    const mainImg = gallery.querySelector('.gallery-main__img');
    $$('.gallery-thumb', gallery).forEach(thumb => {
      on(thumb, 'click', () => {
        if (mainImg) mainImg.src = thumb.querySelector('img')?.src || mainImg.src;
        $$('.gallery-thumb', gallery).forEach(t => t.classList.remove('is-active'));
        thumb.classList.add('is-active');
      });
      on(thumb, 'keydown', e => { if (e.key === 'Enter') thumb.click(); });
    });
  });
}

/* ============================================================
   Sticky ATC
   ============================================================ */
function initStickyATC() {
  const bar    = $('.sticky-atc');
  const anchor = $('.product-info .atc-row');
  if (!bar || !anchor) return;
  new IntersectionObserver(
    ([e]) => bar.classList.toggle('is-visible', !e.isIntersecting),
    { rootMargin: '0px 0px -80px 0px' }
  ).observe(anchor);
}

/* ============================================================
   Variants
   ============================================================ */
const fmt = cents => {
  if (typeof Shopify !== 'undefined' && Shopify.formatMoney) return Shopify.formatMoney(cents);
  return '₹' + (cents / 100).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

function initVariants() {
  $$('.product-form').forEach(form => {
    const idInput = form.querySelector('[name="id"]');
    const product = JSON.parse(form.dataset.product || '{}');
    const variants = product.variants || [];
    const priceEl   = form.closest('.product-info')?.querySelector('[data-product-price]');
    const compareEl = form.closest('.product-info')?.querySelector('[data-compare-price]');
    const atcBtn    = form.querySelector('[data-atc-btn]');

    $$('[data-option-name]', form).forEach(opt => {
      on(opt, 'click', () => {
        $$(`[data-option-name="${opt.dataset.optionName}"]`, form)
          .forEach(o => o.classList.remove('is-selected'));
        opt.classList.add('is-selected');

        const sel = {};
        $$('[data-option-name].is-selected', form)
          .forEach(o => { sel[o.dataset.optionName] = o.dataset.optionValue; });

        const match = variants.find(v =>
          v.options.every((val, i) => Object.values(sel)[i] === val)
        );

        if (match) {
          if (idInput)    idInput.value = match.id;
          if (priceEl)    priceEl.textContent   = fmt(match.price);
          if (compareEl)  compareEl.textContent = match.compare_at_price > match.price ? fmt(match.compare_at_price) : '';
          if (atcBtn)     atcBtn.disabled = !match.available;
        }
      });
    });
  });
}

/* ============================================================
   Filter Drawer
   ============================================================ */
function initFilterDrawer() {
  const overlay = $('#filter-overlay');
  const drawer  = $('#filter-drawer');
  if (!drawer) return;

  const lock   = () => window.NefumeApp?.lockScroll()   ?? document.body.classList.add('is-locked');
  const unlock = () => window.NefumeApp?.unlockScroll() ?? document.body.classList.remove('is-locked');

  const open  = () => { drawer.classList.add('is-open');    overlay?.classList.add('is-open');    lock(); };
  const close = () => { drawer.classList.remove('is-open'); overlay?.classList.remove('is-open'); unlock(); };

  $$('[data-filter-open]').forEach(btn => on(btn, 'click', open));
  on(drawer.querySelector('[data-filter-close]'), 'click', close);
  on(overlay, 'click', close);
}

/* ============================================================
   Toast
   ============================================================ */
function showToast(msg, type = 'success') {
  let stack = $('.toast-stack');
  if (!stack) {
    stack = Object.assign(document.createElement('div'), { className: 'toast-stack' });
    document.body.appendChild(stack);
  }
  const icon = type === 'success'
    ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="16" height="16"><polyline points="20 6 9 17 4 12"/></svg>'
    : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="13"/><circle cx="12" cy="16" r=".5" fill="currentColor"/></svg>';
  const t = Object.assign(document.createElement('div'), {
    className: `toast toast--${type}`,
    innerHTML: `<span class="toast__icon">${icon}</span><span>${msg}</span>`
  });
  stack.appendChild(t);
  requestAnimationFrame(() => requestAnimationFrame(() => t.classList.add('is-visible')));
  setTimeout(() => { t.classList.remove('is-visible'); setTimeout(() => t.remove(), 400); }, 3500);
}

/* Expose showToast for cart-drawer.js */
window.showToast = showToast;

/* ============================================================
   Wishlist (localStorage)
   ============================================================ */
function initWishlist() {
  const KEY  = 'nefume-wishlist';
  const get  = () => { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; } };
  const save = l => { try { localStorage.setItem(KEY, JSON.stringify(l)); } catch {}; };

  const sync = () => {
    const list = get();
    $$('[data-wishlist-toggle]').forEach(btn => {
      btn.classList.toggle('is-wishlisted', list.includes(btn.dataset.wishlistToggle));
    });
  };

  on(document, 'click', e => {
    const btn = e.target.closest('[data-wishlist-toggle]');
    if (!btn) return;
    const id = btn.dataset.wishlistToggle;
    const l  = get();
    const i  = l.indexOf(id);
    if (i > -1) { l.splice(i, 1); showToast('Removed from wishlist'); }
    else        { l.push(id);     showToast('Added to wishlist', 'success'); }
    save(l); sync();
  });

  sync();
}

/* ============================================================
   Marquee — reduced motion
   ============================================================ */
function initMarquee() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    $$('.marquee-track').forEach(t => { t.style.animation = 'none'; });
  }
}

/* ============================================================
   Collection helpers
   ============================================================ */
function initSort() {
  $$('.sort-select').forEach(sel => {
    on(sel, 'change', () => {
      const url = new URL(window.location.href);
      url.searchParams.set('sort_by', sel.value);
      window.location.href = url.toString();
    });
  });
}

/* ============================================================
   Scroll reveal
   ============================================================ */
function initScrollReveal() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const els = $$('[data-reveal]');
  if (!els.length) return;
  els.forEach(el => el.classList.add('reveal-ready'));
  new IntersectionObserver((entries, obs) => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      e.target.classList.add('reveal-in');
      obs.unobserve(e.target);
    });
  }, { rootMargin: '0px 0px -60px 0px', threshold: 0.08 }).observe(...els);
}

/* ============================================================
   Boot
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  // Header, announcement bar → header.js
  // Drawers, search, account → drawers.js
  // Cart, ATC, cart badge   → cart-drawer.js
  initHero();
  initAccordions();
  initQuickView();
  initGallery();
  initStickyATC();
  initVariants();
  initFilterDrawer();
  initWishlist();
  initMarquee();
  initSort();
  initScrollReveal();
});
