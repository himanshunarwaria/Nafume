/* ============================================================
   NEFUME — theme.js
   Vanilla JS, no dependencies.
   Modules: Header · Drawers · Hero · Carousel · Accordion
            Cart · Search · QuickView · StickyATC · Marquee
            Gallery · Wishlist · Toast · FilterDrawer
   ============================================================ */

'use strict';

const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];
const on = (el, ev, fn, opts) => el && el.addEventListener(ev, fn, opts);
const lockScroll   = () => document.body.classList.add('is-locked');
const unlockScroll = () => document.body.classList.remove('is-locked');

function trapFocus(el) {
  const focusable = $$('a,button,input,select,textarea,[tabindex]:not([tabindex="-1"])', el)
    .filter(e => !e.disabled && !e.hidden);
  if (!focusable.length) return;
  const first = focusable[0], last = focusable[focusable.length - 1];
  on(el, 'keydown', e => {
    if (e.key !== 'Tab') return;
    if (e.shiftKey) { if (document.activeElement === first) { last.focus(); e.preventDefault(); } }
    else            { if (document.activeElement === last)  { first.focus(); e.preventDefault(); } }
  });
}

/* ============================================================
   Header
   ============================================================ */
function initHeader() {
  const header = $('.site-header');
  if (!header) return;

  let ticking = false;
  on(window, 'scroll', () => {
    if (ticking) return;
    requestAnimationFrame(() => {
      header.classList.toggle('is-scrolled', window.scrollY > 40);
      ticking = false;
    });
    ticking = true;
  }, { passive: true });

  const hamburger  = $('.header__hamburger');
  const mobileMenu = $('#mobile-menu');
  const overlay    = $('#drawer-overlay');

  if (hamburger && mobileMenu) {
    on(hamburger, 'click', () => {
      const isOpen = mobileMenu.classList.toggle('is-open');
      hamburger.classList.toggle('is-open', isOpen);
      hamburger.setAttribute('aria-expanded', String(isOpen));
      overlay?.classList.toggle('is-open', isOpen);
      isOpen ? lockScroll() : unlockScroll();
      if (isOpen) trapFocus(mobileMenu);
    });
  }

  $$('.mobile-nav__link[data-has-children]').forEach(link => {
    on(link, 'click', e => {
      e.preventDefault();
      const item = link.closest('.mobile-nav__item');
      const sub  = item?.querySelector('.mobile-nav__submenu');
      item?.classList.toggle('is-open');
      sub?.classList.toggle('is-open');
    });
  });
}

/* ============================================================
   Drawers
   ============================================================ */
let _activeDrawer  = null;
let _activeOverlay = null;

function openDrawer(drawer, overlay) {
  if (_activeDrawer) closeDrawer(_activeDrawer, _activeOverlay);
  drawer.classList.add('is-open');
  drawer.setAttribute('aria-hidden', 'false');
  overlay?.classList.add('is-open');
  lockScroll();
  _activeDrawer  = drawer;
  _activeOverlay = overlay;
  trapFocus(drawer);
  setTimeout(() => drawer.querySelector('.drawer__close')?.focus(), 60);
}

function closeDrawer(drawer, overlay) {
  if (!drawer) return;
  drawer.classList.remove('is-open');
  drawer.setAttribute('aria-hidden', 'true');
  overlay?.classList.remove('is-open');
  unlockScroll();
  _activeDrawer  = null;
  _activeOverlay = null;
}

function initDrawers() {
  const overlay = $('#drawer-overlay');
  on(overlay, 'click', () => closeDrawer(_activeDrawer, overlay));
  on(document, 'keydown', e => {
    if (e.key === 'Escape' && _activeDrawer) closeDrawer(_activeDrawer, overlay);
  });

  $$('[data-drawer-open]').forEach(btn =>
    on(btn, 'click', () => {
      const t = $('#' + btn.dataset.drawerOpen);
      if (t) openDrawer(t, overlay);
    })
  );

  $$('[data-drawer-close]').forEach(btn =>
    on(btn, 'click', () => closeDrawer(btn.closest('.drawer'), overlay))
  );

  const cartDrawer   = $('#cart-drawer');
  const searchDrawer = $('#search-drawer');

  on($('#cart-trigger'),   'click', () => cartDrawer   && openDrawer(cartDrawer,   overlay));
  on($('#search-trigger'), 'click', () => {
    if (!searchDrawer) return;
    openDrawer(searchDrawer, overlay);
    setTimeout(() => searchDrawer.querySelector('input')?.focus(), 80);
  });
}

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
   Product Carousel
   ============================================================ */
function initCarousels() {
  $$('.product-carousel').forEach(section => {
    const viewport = section.querySelector('.carousel__viewport');
    const track    = section.querySelector('.carousel__track');
    const slides   = $$('.carousel__slide', track);
    if (!viewport || !track || !slides.length) return;

    const prev = section.querySelector('.carousel__nav-btn--prev');
    const next = section.querySelector('.carousel__nav-btn--next');
    let cur = 0;

    const visibleCount = () => {
      const w = viewport.offsetWidth;
      if (w >= 1200) return 4;
      if (w >= 900)  return 3;
      if (w >= 600)  return 2;
      return 1.2;
    };

    const getGap = () => parseFloat(getComputedStyle(track).columnGap) || 24;

    const slideW = () => {
      const v   = visibleCount();
      const gap = getGap();
      return (viewport.offsetWidth - gap * (Math.floor(v) - 1)) / Math.floor(v);
    };

    const maxCur = () => Math.max(0, slides.length - Math.floor(visibleCount()));

    const setWidths = () => slides.forEach(s => { s.style.width = slideW() + 'px'; });

    const goTo = idx => {
      cur = Math.max(0, Math.min(idx, maxCur()));
      track.style.transform = `translateX(${-(cur * (slideW() + getGap()))}px)`;
      if (prev) prev.disabled = cur === 0;
      if (next) next.disabled = cur >= maxCur();
    };

    on(prev, 'click', () => goTo(cur - 1));
    on(next, 'click', () => goTo(cur + 1));

    let sx = 0;
    on(track, 'touchstart', e => { sx = e.touches[0].clientX; }, { passive: true });
    on(track, 'touchend',   e => {
      const diff = sx - e.changedTouches[0].clientX;
      if (Math.abs(diff) > 40) goTo(cur + (diff > 0 ? 1 : -1));
    }, { passive: true });

    new ResizeObserver(() => { setWidths(); goTo(cur); }).observe(viewport);
    setWidths(); goTo(0);
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
   Cart
   ============================================================ */
async function cartChange(key, qty) {
  const resp = await fetch('/cart/change.js', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: key, quantity: qty })
  });
  return resp.json();
}

async function refreshCart() {
  try {
    const resp = await fetch('/?sections=cart-drawer-content');
    const data = await resp.json();
    const html = data['cart-drawer-content'];
    if (!html) return;
    const parser = new DOMParser().parseFromString(html, 'text/html');
    const src    = parser.querySelector('#cart-drawer-content');
    const dest   = $('#cart-drawer-content');
    if (src && dest) dest.innerHTML = src.innerHTML;
    updateCartBadge();
  } catch (err) { console.error(err); }
}

async function updateCartBadge() {
  try {
    const { item_count } = await fetch('/cart.js').then(r => r.json());
    $$('.header__cart-count').forEach(el => {
      el.textContent = item_count;
      el.hidden = item_count === 0;
    });
  } catch {}
}

function initCart() {
  on(document, 'click', e => {
    const btn = e.target.closest('.qty-ctrl__btn');
    if (!btn) return;
    const input = btn.closest('.qty-ctrl, .qty-selector')?.querySelector('.qty-ctrl__input');
    if (!input) return;
    let val = parseInt(input.value) || 1;
    val = Math.max(parseInt(input.min) || 1, val + (btn.dataset.dir === 'up' ? 1 : -1));
    input.value = val;
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });

  on(document, 'click', async e => {
    const btn = e.target.closest('[data-cart-remove]');
    if (!btn) return;
    await cartChange(btn.dataset.cartRemove, 0);
    refreshCart();
  });

  on(document, 'change', async e => {
    const input = e.target.closest('[data-cart-qty]');
    if (!input) return;
    await cartChange(input.dataset.cartQty, parseInt(input.value));
    refreshCart();
  });
}

function initATC() {
  on(document, 'submit', async e => {
    const form = e.target.closest('form[action="/cart/add"]');
    if (!form) return;
    e.preventDefault();

    const btn = form.querySelector('[data-atc-btn],[type="submit"]');
    btn?.classList.add('btn--loading');

    try {
      const resp = await fetch('/cart/add.js', { method: 'POST', body: new FormData(form) });
      if (!resp.ok) throw new Error();
      const item = await resp.json();
      showToast(`${item.product_title} added to cart`, 'success');
      await refreshCart();
      const cartDrawer = $('#cart-drawer');
      const overlay    = $('#drawer-overlay');
      if (cartDrawer) openDrawer(cartDrawer, overlay);
    } catch {
      showToast('Could not add to cart. Please try again.', 'error');
    } finally {
      btn?.classList.remove('btn--loading');
    }
  });
}

/* ============================================================
   Search
   ============================================================ */
function initSearch() {
  const drawer  = $('#search-drawer');
  const input   = drawer?.querySelector('.search-form__input');
  const results = drawer?.querySelector('.search-results');
  if (!input || !results) return;

  let timer;
  on(input, 'input', () => {
    clearTimeout(timer);
    const q = input.value.trim();
    if (q.length < 2) { results.innerHTML = ''; return; }
    timer = setTimeout(async () => {
      try {
        const data = await fetch(`/search/suggest.json?q=${encodeURIComponent(q)}&resources[type]=product&resources[limit]=6`).then(r => r.json());
        const products = data.resources?.results?.products || [];
        results.innerHTML = products.length
          ? '<p class="search-results__label">Products</p>' + products.map(p => `
              <a href="${p.url}" class="search-result">
                <img class="search-result__img" src="${p.featured_image?.url || ''}" alt="${p.title}" loading="lazy">
                <div>
                  <div class="search-result__name">${p.title}</div>
                  <div class="search-result__collection">${p.product_type || ''}</div>
                </div>
                <div class="search-result__price">${fmt(p.price)}</div>
              </a>`).join('')
          : '<p class="search-results__label">No results</p>';
      } catch {}
    }, 280);
  });
}

const fmt = cents => {
  if (typeof Shopify !== 'undefined' && Shopify.formatMoney) return Shopify.formatMoney(cents);
  return '₹' + (cents / 100).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

/* ============================================================
   Quick View
   ============================================================ */
function initQuickView() {
  const modal   = $('#quick-view-modal');
  const overlay = $('#quick-view-overlay');
  if (!modal || !overlay) return;

  const close = () => {
    modal.classList.remove('is-open');
    overlay.classList.remove('is-open');
    unlockScroll();
  };

  on(overlay, 'click', close);
  on(modal.querySelector('.modal__close'), 'click', close);
  on(document, 'keydown', e => { if (e.key === 'Escape') close(); });

  on(document, 'click', async e => {
    const btn = e.target.closest('[data-quick-view]');
    if (!btn) return;
    modal.classList.add('is-open');
    overlay.classList.add('is-open');
    lockScroll();
    trapFocus(modal);

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
  const overlay  = $('#filter-overlay');
  const drawer   = $('#filter-drawer');
  if (!drawer) return;

  const open  = () => { drawer.classList.add('is-open'); overlay?.classList.add('is-open'); lockScroll(); };
  const close = () => { drawer.classList.remove('is-open'); overlay?.classList.remove('is-open'); unlockScroll(); };

  $$('[data-filter-open]').forEach(btn => on(btn, 'click', open));
  on(drawer.querySelector('[data-filter-close]'), 'click', close);
  on(overlay, 'click', close);
}

/* ============================================================
   Announcement Bar
   ============================================================ */
function initAnnouncementBar() {
  const bar = $('.ann-bar');
  if (!bar) return;
  try { if (sessionStorage.getItem('nefume-bar')) { bar.style.display = 'none'; return; } } catch {}
  on(bar.querySelector('.ann-bar__close'), 'click', () => {
    bar.style.cssText = `height:${bar.offsetHeight}px;overflow:hidden;transition:height .3s ease,opacity .3s ease`;
    requestAnimationFrame(() => { bar.style.height = '0'; bar.style.opacity = '0'; });
    try { sessionStorage.setItem('nefume-bar', '1'); } catch {}
  });
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
  // initHeader() and initAnnouncementBar() are handled by header.js
  initDrawers();
  initHero();
  initCarousels();
  initAccordions();
  initCart();
  initATC();
  initSearch();
  initQuickView();
  initGallery();
  initStickyATC();
  initVariants();
  initFilterDrawer();
  initWishlist();
  initMarquee();
  initSort();
  initScrollReveal();
  updateCartBadge();
});
