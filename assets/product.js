(function () {
  'use strict';

  /* ── Helpers ──────────────────────────────────────────────── */
  function qs(sel, ctx) { return (ctx || document).querySelector(sel); }
  function qsa(sel, ctx) { return Array.from((ctx || document).querySelectorAll(sel)); }

  function formatMoney(cents) {
    const amount = cents / 100;
    return '₹' + amount.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  }

  /* ── State ────────────────────────────────────────────────── */
  let variants = [];
  let currentOptions = [];
  let currentVariant = null;

  /* ── Gallery ──────────────────────────────────────────────── */
  function initGallery() {
    const gallery = qs('[data-gallery]');
    if (!gallery) return;

    const slides    = qsa('.gallery__slide', gallery);
    const thumbs    = qsa('.gallery__thumb', gallery);
    const dots      = qsa('.gallery__dot', gallery);
    const btnPrev   = qs('[data-gallery-prev]', gallery);
    const btnNext   = qs('[data-gallery-next]', gallery);
    const total     = slides.length;
    let activeIndex = slides.findIndex(s => s.classList.contains('is-active'));
    if (activeIndex < 0) activeIndex = 0;

    function goTo(index) {
      index = Math.max(0, Math.min(total - 1, index));

      slides[activeIndex]?.classList.remove('is-active');
      slides[activeIndex]?.setAttribute('aria-hidden', 'true');
      thumbs[activeIndex]?.classList.remove('is-active');
      thumbs[activeIndex]?.setAttribute('aria-pressed', 'false');
      dots[activeIndex]?.classList.remove('is-active');

      activeIndex = index;

      slides[activeIndex]?.classList.add('is-active');
      slides[activeIndex]?.setAttribute('aria-hidden', 'false');
      thumbs[activeIndex]?.classList.add('is-active');
      thumbs[activeIndex]?.setAttribute('aria-pressed', 'true');
      dots[activeIndex]?.classList.add('is-active');

      thumbs[activeIndex]?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
    }

    thumbs.forEach(thumb => {
      thumb.addEventListener('click', () => goTo(parseInt(thumb.dataset.thumbIndex, 10)));
    });

    if (btnPrev) btnPrev.addEventListener('click', () => goTo(activeIndex - 1));
    if (btnNext) btnNext.addEventListener('click', () => goTo(activeIndex + 1));

    dots.forEach(dot => {
      dot.addEventListener('click', () => goTo(parseInt(dot.dataset.dotIndex, 10)));
    });

    /* Mobile swipe */
    const mainEl = qs('[data-gallery-main]', gallery);
    if (mainEl) {
      let touchStartX = 0;
      let touchStartY = 0;
      mainEl.addEventListener('touchstart', e => {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
      }, { passive: true });
      mainEl.addEventListener('touchend', e => {
        const dx = e.changedTouches[0].clientX - touchStartX;
        const dy = e.changedTouches[0].clientY - touchStartY;
        if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 40) {
          goTo(dx < 0 ? activeIndex + 1 : activeIndex - 1);
        }
      }, { passive: true });
    }

    /* Expose goToMedia so variant logic can switch the gallery */
    gallery.goToMediaId = function (mediaId) {
      const idx = slides.findIndex(s => s.dataset.mediaId === String(mediaId));
      if (idx >= 0) goTo(idx);
    };
  }

  /* ── Zoom Modal ───────────────────────────────────────────── */
  function initZoom() {
    const modal   = qs('#GalleryZoom');
    const zoomImg = qs('#GalleryZoomImg');
    if (!modal || !zoomImg) return;

    function openZoom(src, alt) {
      zoomImg.src = src;
      zoomImg.alt = alt || '';
      modal.removeAttribute('hidden');
      modal.setAttribute('aria-hidden', 'false');
      document.body.classList.add('is-locked');
    }

    function closeZoom() {
      modal.setAttribute('hidden', '');
      modal.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('is-locked');
      zoomImg.src = '';
    }

    document.body.addEventListener('click', e => {
      const trigger = e.target.closest('[data-zoom-trigger]');
      if (trigger) {
        const src = trigger.dataset.zoomSrc;
        const alt = trigger.querySelector('img')?.alt || '';
        if (src) openZoom(src, alt);
      }
      if (e.target.closest('[data-zoom-close]')) closeZoom();
    });

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && !modal.hasAttribute('hidden')) closeZoom();
    });
  }

  /* ── Variants ─────────────────────────────────────────────── */
  function initVariants() {
    const variantsEl = qs('#ProductVariantsJSON');
    if (!variantsEl) return;

    try { variants = JSON.parse(variantsEl.textContent); }
    catch (e) { console.warn('PDP: could not parse variants JSON'); return; }

    /* Build initial currentOptions from the active buttons */
    const optGroups = qsa('[data-option-group]');
    currentOptions = optGroups.map(group => {
      const activeBtn = group.querySelector('.pdp__option-btn.is-active');
      return activeBtn ? activeBtn.dataset.optionValue : group.querySelector('.pdp__option-btn')?.dataset.optionValue || '';
    });

    currentVariant = findVariant(currentOptions);

    /* Option button click */
    document.body.addEventListener('click', e => {
      const btn = e.target.closest('.pdp__option-btn');
      if (!btn) return;
      const group = btn.closest('[data-option-group]');
      if (!group) return;

      const optIndex = parseInt(group.dataset.optionGroup, 10);

      /* Deactivate siblings, activate clicked */
      qsa('.pdp__option-btn', group).forEach(b => b.classList.remove('is-active'));
      btn.classList.add('is-active');

      currentOptions[optIndex] = btn.dataset.optionValue;

      /* Update selected label */
      const label = qs(`[data-selected-label="${optIndex}"]`);
      if (label) label.textContent = btn.dataset.optionValue;

      currentVariant = findVariant(currentOptions);
      updateForVariant(currentVariant);
    });
  }

  function findVariant(options) {
    return variants.find(v => v.options.every((opt, i) => opt === options[i])) || null;
  }

  function updateForVariant(variant) {
    if (!variant) return;

    /* Variant hidden input */
    const variantInput = qs('#PDPVariantId');
    if (variantInput) variantInput.value = variant.id;

    /* Price */
    const priceEl   = qs('#PDPCurrentPrice');
    const compareEl = qs('#PDPComparePrice');
    const badgeEl   = qs('#PDPDiscountBadge');
    const blockEl   = qs('#PDPPriceBlock');

    if (priceEl) priceEl.textContent = formatMoney(variant.price);

    if (variant.compare_at_price && variant.compare_at_price > variant.price) {
      if (compareEl) {
        compareEl.textContent = formatMoney(variant.compare_at_price);
        compareEl.style.display = '';
      }
      if (badgeEl) {
        const pct = Math.round((variant.compare_at_price - variant.price) / variant.compare_at_price * 100);
        badgeEl.textContent = '-' + pct + '%';
        badgeEl.style.display = '';
      }
      if (priceEl) priceEl.classList.add('pdp__price--sale');
      if (blockEl) blockEl.dataset.price = variant.price, blockEl.dataset.compare = variant.compare_at_price;
    } else {
      if (compareEl) compareEl.style.display = 'none';
      if (badgeEl)   badgeEl.style.display = 'none';
      if (priceEl)   priceEl.classList.remove('pdp__price--sale');
    }

    /* ATC button state */
    const atcBtn = qs('#PDPATCBtn');
    if (atcBtn) {
      atcBtn.disabled = !variant.available;
      const label = atcBtn.querySelector('.pdp__atc-btn-label');
      if (label) label.textContent = variant.available ? 'Add to Cart' : 'Sold Out';
    }

    /* Sync sticky ATC */
    syncStickyATC(variant);

    /* Switch gallery to variant's featured media */
    if (variant.featured_media) {
      const gallery = qs('[data-gallery]');
      if (gallery && typeof gallery.goToMediaId === 'function') {
        gallery.goToMediaId(variant.featured_media.id);
      }
    }
  }

  /* ── Quantity ─────────────────────────────────────────────── */
  function initQuantity() {
    document.body.addEventListener('click', e => {
      if (e.target.closest('[data-qty-minus]')) adjustQty(-1);
      if (e.target.closest('[data-qty-plus]'))  adjustQty(1);
    });

    const input = qs('[data-qty-input]');
    if (input) {
      input.addEventListener('change', () => {
        const val = Math.max(1, Math.min(99, parseInt(input.value, 10) || 1));
        input.value = val;
        syncQtyHidden(val);
      });
    }
  }

  function adjustQty(delta) {
    const input = qs('[data-qty-input]');
    if (!input) return;
    const current = parseInt(input.value, 10) || 1;
    const next = Math.max(1, Math.min(99, current + delta));
    input.value = next;
    syncQtyHidden(next);
  }

  function syncQtyHidden(val) {
    const hidden = qs('#PDPQtyHidden');
    if (hidden) hidden.value = val;
  }

  /* ── Sticky ATC ───────────────────────────────────────────── */
  function initStickyATC() {
    const bar      = qs('#StickyATC');
    const atcBtn   = qs('#PDPATCBtn');
    if (!bar || !atcBtn) return;

    const obs = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        const visible = entry.isIntersecting;
        bar.classList.toggle('is-visible', !visible);
        bar.setAttribute('aria-hidden', visible ? 'true' : 'false');
      });
    }, { threshold: 0 });

    obs.observe(atcBtn);

    /* Sticky variant select → sync main variant */
    const stickySelect = qs('#StickyVariantSelect');
    if (stickySelect) {
      stickySelect.addEventListener('change', () => {
        const newVariantId = parseInt(stickySelect.value, 10);
        const v = variants.find(v => v.id === newVariantId);
        if (!v) return;

        /* Update currentOptions to match this variant */
        currentOptions = [...v.options];
        currentVariant = v;

        /* Sync main option buttons */
        qsa('[data-option-group]').forEach((group, i) => {
          const val = currentOptions[i];
          qsa('.pdp__option-btn', group).forEach(btn => {
            btn.classList.toggle('is-active', btn.dataset.optionValue === val);
          });
          const label = qs(`[data-selected-label="${i}"]`);
          if (label) label.textContent = val;
        });

        updateForVariant(v);
      });
    }
  }

  function syncStickyATC(variant) {
    const stickySelect = qs('#StickyVariantSelect');
    if (stickySelect) stickySelect.value = variant.id;

    const stickyPrice = qs('#StickyPrice');
    if (stickyPrice) stickyPrice.textContent = formatMoney(variant.price);

    const stickyVariantId = qs('#StickyVariantId');
    if (stickyVariantId) stickyVariantId.value = variant.id;

    const stickyBtn = qs('#StickyATCBtn');
    if (stickyBtn) {
      stickyBtn.disabled = !variant.available;
      stickyBtn.textContent = variant.available ? 'Add to Cart' : 'Sold Out';
    }
  }

  /* ── Accordion Animation ──────────────────────────────────── */
  function initAccordions() {
    document.body.addEventListener('click', e => {
      const summary = e.target.closest('.accordion__head');
      if (!summary) return;

      const details = summary.closest('details[data-accordion]');
      if (!details) return;

      const body = details.querySelector('[data-accordion-body]');
      if (!body) return;

      /* We handle the animation; let the default toggle happen naturally */
      requestAnimationFrame(() => {
        if (details.open) {
          body.style.height = body.scrollHeight + 'px';
          body.addEventListener('transitionend', () => {
            body.style.height = '';
          }, { once: true });
        } else {
          body.style.height = body.scrollHeight + 'px';
          requestAnimationFrame(() => {
            body.style.height = '0';
          });
        }
      });
    });
  }

  /* ── Recently Viewed ──────────────────────────────────────── */
  const RV_KEY   = 'nefume-recently-viewed';
  const RV_MAX   = 8;

  function initRecentlyViewed() {
    const currentEl = qs('#CurrentProductJSON');
    const grid      = qs('#RecentlyViewedGrid');
    if (!currentEl) return;

    let current;
    try { current = JSON.parse(currentEl.textContent); }
    catch (e) { return; }

    /* Save this product */
    let list = readRV();
    list = list.filter(p => p.id !== current.id);
    list.unshift(current);
    if (list.length > RV_MAX) list = list.slice(0, RV_MAX);
    writeRV(list);

    /* Render others */
    if (!grid) return;
    const toShow = list.filter(p => p.id !== current.id).slice(0, 4);

    if (toShow.length === 0) {
      const section = grid.closest('.pdp__recently-viewed');
      if (section) section.hidden = true;
      return;
    }

    grid.innerHTML = toShow.map(p => `
      <a href="${p.url}" class="rv-card">
        <div class="rv-card__img-wrap">
          <img src="${p.image}" alt="${escapeHtml(p.title)}" loading="lazy" width="400" height="500">
        </div>
        <p class="rv-card__title">${escapeHtml(p.title)}</p>
        <p class="rv-card__price">${p.price}</p>
      </a>
    `).join('');
  }

  function readRV() {
    try { return JSON.parse(localStorage.getItem(RV_KEY) || '[]'); }
    catch (e) { return []; }
  }

  function writeRV(list) {
    try { localStorage.setItem(RV_KEY, JSON.stringify(list)); }
    catch (e) { /* storage full — skip */ }
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /* ── ATC Form Spinner ─────────────────────────────────────── */
  function initATCSpinner() {
    const form = qs('#PDPForm');
    const btn  = qs('#PDPATCBtn');
    if (!form || !btn) return;

    form.addEventListener('submit', () => {
      btn.classList.add('is-loading');
      setTimeout(() => btn.classList.remove('is-loading'), 2000);
    });

    const stickyForm = qs('#StickyATCForm');
    if (stickyForm) {
      stickyForm.addEventListener('submit', () => {
        const stickyBtn = qs('#StickyATCBtn');
        if (!stickyBtn) return;
        const orig = stickyBtn.textContent;
        stickyBtn.textContent = '…';
        stickyBtn.disabled = true;
        setTimeout(() => {
          stickyBtn.textContent = orig;
          stickyBtn.disabled = false;
        }, 2000);
      });
    }
  }

  /* ── Recently Viewed Card Styles (injected) ───────────────── */
  function injectRVStyles() {
    if (document.getElementById('rv-card-styles')) return;
    const style = document.createElement('style');
    style.id = 'rv-card-styles';
    style.textContent = `
      .pdp__rv-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; }
      .rv-card { display: block; text-decoration: none; color: inherit; }
      .rv-card__img-wrap { aspect-ratio: 4/5; overflow: hidden; border-radius: 4px; background: var(--color-surface); margin-bottom: 10px; }
      .rv-card__img-wrap img { width: 100%; height: 100%; object-fit: cover; display: block; transition: transform 0.4s ease; }
      .rv-card:hover .rv-card__img-wrap img { transform: scale(1.04); }
      .rv-card__title { font-size: 0.82rem; margin: 0 0 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .rv-card__price { font-size: 0.82rem; color: var(--color-muted); margin: 0; }
      @media (max-width: 767px) { .pdp__rv-grid { grid-template-columns: repeat(2, 1fr); } }
    `;
    document.head.appendChild(style);
  }

  /* ── Init ─────────────────────────────────────────────────── */
  function init() {
    injectRVStyles();
    initGallery();
    initZoom();
    initVariants();
    initQuantity();
    initStickyATC();
    initAccordions();
    initRecentlyViewed();
    initATCSpinner();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
