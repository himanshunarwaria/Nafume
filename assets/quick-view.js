(function () {
  'use strict';

  /* ── Constants ─────────────────────────────────────────────── */
  const MODAL_ID = 'QVModal';
  const FOCUSABLE_SELECTORS = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ].join(', ');

  /* ── State ─────────────────────────────────────────────────── */
  let modal        = null;
  let lastTrigger  = null;
  let currentHandle = null;
  let currentVariantId = null;
  let currentOptions   = [];
  let currentProduct   = null;
  let focusTrapHandler = null;

  /* ── Helpers ────────────────────────────────────────────────── */
  function qs(sel, ctx)  { return (ctx || document).querySelector(sel); }
  function qsa(sel, ctx) { return Array.from((ctx || document).querySelectorAll(sel)); }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function stripHtml(html) {
    const div = document.createElement('div');
    div.innerHTML = html;
    return div.textContent || div.innerText || '';
  }

  function truncate(str, n) {
    if (str.length <= n) return str;
    return str.slice(0, n).replace(/\s+\S*$/, '') + '…';
  }

  function formatMoney(cents) {
    return '₹' + (cents / 100).toLocaleString('en-IN', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
  }

  /* Shopify image resize: appends _{size}x before the extension */
  function shopifyImg(src, width) {
    if (!src) return '';
    return src.replace(/(\.(jpe?g|png|gif|webp))(\?|$)/i, `_${width}x$1$3`);
  }

  /* ── States ─────────────────────────────────────────────────── */
  function showLoading() {
    qs('#QVLoading', modal).removeAttribute('hidden');
    qs('#QVError',   modal).setAttribute('hidden', '');
    qs('#QVBody',    modal).setAttribute('hidden', '');
  }

  function showError() {
    qs('#QVLoading', modal).setAttribute('hidden', '');
    qs('#QVError',   modal).removeAttribute('hidden');
    qs('#QVBody',    modal).setAttribute('hidden', '');
    qs('#QVRetry',   modal).focus();
  }

  function showContent() {
    qs('#QVLoading', modal).setAttribute('hidden', '');
    qs('#QVError',   modal).setAttribute('hidden', '');
    qs('#QVBody',    modal).removeAttribute('hidden');
    /* Focus first interactive element inside the info panel */
    const first = qs(FOCUSABLE_SELECTORS, qs('#QVBody', modal));
    first?.focus();
  }

  /* ── Open / Close ───────────────────────────────────────────── */
  function openModal(trigger) {
    modal = modal || qs('#' + MODAL_ID);
    if (!modal) return;

    lastTrigger   = trigger;
    currentHandle = trigger.dataset.quickView;
    const family  = trigger.dataset.qvFamily || '';
    const gender  = trigger.dataset.qvGender || '';

    /* Reveal modal */
    modal.removeAttribute('hidden');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('qv-open');

    /* Two rAFs: remove hidden → browser paints → add class for CSS transition */
    requestAnimationFrame(() => {
      requestAnimationFrame(() => modal.classList.add('is-open'));
    });

    showLoading();
    installFocusTrap();
    fetchProduct(currentHandle, family, gender);
  }

  function closeModal() {
    if (!modal) return;

    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('qv-open');
    removeFocusTrap();

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const finish = () => {
      modal.setAttribute('hidden', '');
      lastTrigger?.focus();
      lastTrigger = null;
      currentHandle = null;
      currentProduct = null;
    };

    if (reduceMotion) {
      finish();
    } else {
      modal.addEventListener('transitionend', finish, { once: true });
    }
  }

  /* ── Fetch ──────────────────────────────────────────────────── */
  function fetchProduct(handle, family, gender) {
    fetch(`/products/${handle}.js`)
      .then(r => {
        if (!r.ok) throw new Error('fetch_failed');
        return r.json();
      })
      .then(product => {
        currentProduct = product;
        populateModal(product, family, gender);
        showContent();
      })
      .catch(() => showError());
  }

  /* ── Populate ───────────────────────────────────────────────── */
  function populateModal(product, family, gender) {
    /* View Full Details link */
    qs('#QVViewFull', modal).href = `/products/${product.handle}`;

    /* Meta tags */
    const metaEl = qs('#QVMeta', modal);
    const tags = [];
    if (family) tags.push(`<span class="qv__tag qv__tag--family">${escapeHtml(family)}</span>`);
    if (gender) tags.push(`<span class="qv__tag qv__tag--gender">${escapeHtml(gender)}</span>`);
    metaEl.innerHTML = tags.join('');

    /* Title */
    qs('#QVTitle', modal).textContent = product.title;

    /* Determine initial variant */
    const initialVariant = product.variants.find(v => v.available) || product.variants[0];
    currentVariantId = initialVariant.id;
    currentOptions   = [...initialVariant.options];

    /* Price */
    renderPrice(initialVariant);

    /* Description */
    const desc = truncate(stripHtml(product.description), 220);
    const descEl = qs('#QVDesc', modal);
    descEl.textContent = desc;
    descEl.hidden = !desc;

    /* Variants */
    renderVariants(product);

    /* Images */
    renderImages(product, initialVariant);

    /* ATC state */
    updateATCState(initialVariant);

    /* Reset qty */
    qs('#QVQty', modal).value = 1;
  }

  /* ── Price ──────────────────────────────────────────────────── */
  function renderPrice(variant) {
    const block = qs('#QVPriceBlock', modal);
    const isOnSale = variant.compare_at_price && variant.compare_at_price > variant.price;
    let html = `<span class="qv__price${isOnSale ? ' qv__price--sale' : ''}">${formatMoney(variant.price)}</span>`;
    if (isOnSale) {
      const pct = Math.round((variant.compare_at_price - variant.price) / variant.compare_at_price * 100);
      html += `<span class="qv__compare">${formatMoney(variant.compare_at_price)}</span>`;
      html += `<span class="qv__badge">−${pct}%</span>`;
    }
    block.innerHTML = html;
  }

  /* ── Variants ───────────────────────────────────────────────── */
  function renderVariants(product) {
    const container = qs('#QVVariants', modal);

    const isSingleDefault =
      product.variants.length === 1 &&
      product.options.length === 1 &&
      product.options[0] === 'Title';

    if (isSingleDefault) {
      container.innerHTML = '';
      return;
    }

    let html = '';
    product.options.forEach((optName, optIdx) => {
      const values = [...new Set(product.variants.map(v => v.options[optIdx]))];
      const selectedVal = currentOptions[optIdx];
      html += `
        <div class="qv__opt-group" data-opt-index="${optIdx}">
          <label class="qv__opt-label">
            ${escapeHtml(optName)}:&nbsp;<span class="qv__opt-selected" data-opt-selected="${optIdx}">${escapeHtml(selectedVal)}</span>
          </label>
          <div class="qv__opt-btns" role="group" aria-label="${escapeHtml(optName)} options">
            ${values.map(val => {
              const isActive   = val === selectedVal;
              const available  = isOptionAvailable(product.variants, currentOptions, optIdx, val);
              return `<button
                type="button"
                class="qv__opt-btn${isActive ? ' is-active' : ''}${!available ? ' is-unavailable' : ''}"
                data-opt-index="${optIdx}"
                data-opt-value="${escapeHtml(val)}"
                aria-pressed="${isActive}"
                ${!available ? 'disabled' : ''}
                aria-label="${escapeHtml(val)}${!available ? ' — unavailable' : ''}">
                ${escapeHtml(val)}
              </button>`;
            }).join('')}
          </div>
        </div>`;
    });
    container.innerHTML = html;
  }

  function isOptionAvailable(variants, options, changedIdx, newVal) {
    const testOpts = [...options];
    testOpts[changedIdx] = newVal;
    return variants.some(v =>
      v.available &&
      v.options.every((o, i) => i === changedIdx ? o === newVal : o === testOpts[i])
    );
  }

  /* ── Images ─────────────────────────────────────────────────── */
  function renderImages(product, variant) {
    const imgEl   = qs('#QVImg',    modal);
    const thumbEl = qs('#QVThumbs', modal);

    /* Determine main image */
    const mainSrc = variant.featured_image
      ? shopifyImg(variant.featured_image.src, 800)
      : product.images[0]
        ? shopifyImg(product.images[0].src, 800)
        : '';

    const mainAlt = variant.featured_image?.alt
      || product.images[0]?.alt
      || product.title;

    imgEl.src = mainSrc;
    imgEl.alt = mainAlt;

    /* Thumbnails (up to 5) */
    const thumbImages = product.images.slice(0, 5);
    if (thumbImages.length > 1) {
      thumbEl.innerHTML = thumbImages.map((img, i) => `
        <button
          type="button"
          class="qv__thumb${i === 0 ? ' is-active' : ''}"
          data-qv-thumb="${shopifyImg(img.src, 800)}"
          data-qv-thumb-alt="${escapeHtml(img.alt || product.title)}"
          aria-label="View image ${i + 1}">
          <img src="${shopifyImg(img.src, 120)}" alt="" loading="lazy" width="52" height="64">
        </button>`).join('');
      thumbEl.removeAttribute('hidden');
    } else {
      thumbEl.innerHTML = '';
      thumbEl.setAttribute('hidden', '');
    }
  }

  function switchImage(src, alt) {
    const imgEl = qs('#QVImg', modal);
    imgEl.classList.add('is-switching');
    imgEl.addEventListener('transitionend', () => {
      imgEl.src = src;
      imgEl.alt = alt;
      imgEl.classList.remove('is-switching');
    }, { once: true });

    /* Fallback if transition doesn't fire (reduced-motion) */
    setTimeout(() => {
      if (imgEl.classList.contains('is-switching')) {
        imgEl.src = src;
        imgEl.alt = alt;
        imgEl.classList.remove('is-switching');
      }
    }, 300);
  }

  /* ── Variant update ─────────────────────────────────────────── */
  function selectOption(optIdx, value) {
    if (!currentProduct) return;

    currentOptions[optIdx] = value;

    /* Update option button states + selected labels */
    currentProduct.options.forEach((_, i) => {
      const group = qs(`[data-opt-index="${i}"]`, modal);
      if (!group) return;
      const selectedLabel = qs(`[data-opt-selected="${i}"]`, modal);
      if (selectedLabel && i === optIdx) selectedLabel.textContent = value;

      qsa('.qv__opt-btn', group).forEach(btn => {
        const btnVal  = btn.dataset.optValue;
        const isActive = btnVal === currentOptions[i];
        const available = isOptionAvailable(currentProduct.variants, currentOptions, i, btnVal);
        btn.classList.toggle('is-active', isActive);
        btn.classList.toggle('is-unavailable', !available);
        btn.disabled = !available;
        btn.setAttribute('aria-pressed', String(isActive));
      });
    });

    /* Find matching variant */
    const matched = currentProduct.variants.find(v =>
      v.options.every((o, i) => o === currentOptions[i])
    );

    if (matched) {
      currentVariantId = matched.id;
      renderPrice(matched);
      updateATCState(matched);

      /* Switch gallery image if variant has its own image */
      if (matched.featured_image) {
        const src = shopifyImg(matched.featured_image.src, 800);
        const alt = matched.featured_image.alt || currentProduct.title;
        switchImage(src, alt);

        /* Sync active thumbnail */
        qsa('.qv__thumb', modal).forEach(t => {
          t.classList.toggle('is-active', t.dataset.qvThumb === src);
        });
      }
    }
  }

  function updateATCState(variant) {
    const btn   = qs('#QVATCBtn', modal);
    const label = btn.querySelector('.qv__atc-label');
    if (!variant.available) {
      btn.disabled = true;
      if (label) label.textContent = 'Sold Out';
    } else {
      btn.disabled = false;
      if (label) label.textContent = 'Add to Cart';
    }
  }

  /* ── Add to Cart ────────────────────────────────────────────── */
  async function addToCart() {
    if (!currentVariantId) return;
    const btn = qs('#QVATCBtn', modal);
    const qty = parseInt(qs('#QVQty', modal).value, 10) || 1;

    btn.disabled = true;
    btn.classList.add('is-loading');

    try {
      const resp = await fetch('/cart/add.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: currentVariantId, quantity: qty }),
      });

      if (!resp.ok) throw new Error('add_failed');

      window.showToast?.(
        `${currentProduct?.title || 'Product'} added to cart`,
        'success'
      );

      closeModal();

      /* Refresh cart drawer */
      refreshCart();

    } catch {
      window.showToast?.('Could not add to cart. Please try again.', 'error');
      btn.disabled = false;
    } finally {
      btn.classList.remove('is-loading');
    }
  }

  async function refreshCart() {
    try {
      const resp = await fetch('/?sections=cart-drawer-content');
      const data = await resp.json();
      const html = data['cart-drawer-content'];
      if (html) {
        const doc  = new DOMParser().parseFromString(html, 'text/html');
        const src  = doc.querySelector('#cart-drawer-content');
        const dest = document.querySelector('#cart-drawer-content');
        if (src && dest) dest.innerHTML = src.innerHTML;
      }
    } catch {}

    try {
      const { item_count } = await fetch('/cart.js').then(r => r.json());
      document.querySelectorAll('[data-cart-count]').forEach(el => {
        el.textContent = item_count;
        el.hidden = item_count === 0;
      });
    } catch {}

    /* Open cart drawer */
    const cartDrawer = document.querySelector('#cart-drawer');
    if (cartDrawer && window.NefumeApp?.openDrawer) {
      window.NefumeApp.openDrawer(cartDrawer);
    }
  }

  /* ── Focus Trap ─────────────────────────────────────────────── */
  function installFocusTrap() {
    removeFocusTrap();
    focusTrapHandler = function (e) {
      if (e.key !== 'Tab') return;
      const focusable = qsa(FOCUSABLE_SELECTORS, modal).filter(el => {
        return el.offsetParent !== null; /* visible only */
      });
      if (!focusable.length) return;
      const first = focusable[0];
      const last  = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', focusTrapHandler);
  }

  function removeFocusTrap() {
    if (focusTrapHandler) {
      document.removeEventListener('keydown', focusTrapHandler);
      focusTrapHandler = null;
    }
  }

  /* ── Event Delegation ───────────────────────────────────────── */
  function init() {
    modal = qs('#' + MODAL_ID);
    if (!modal) return;

    /* Open quick view */
    document.body.addEventListener('click', e => {
      const trigger = e.target.closest('[data-quick-view]');
      if (trigger) {
        e.preventDefault();
        openModal(trigger);
        return;
      }

      /* Close on backdrop / × button */
      if (e.target.closest('[data-qv-close]')) closeModal();

      /* Thumbnail click */
      const thumb = e.target.closest('.qv__thumb');
      if (thumb) {
        const src = thumb.dataset.qvThumb;
        const alt = thumb.dataset.qvThumbAlt || '';
        switchImage(src, alt);
        qsa('.qv__thumb', modal).forEach(t => t.classList.toggle('is-active', t === thumb));
        return;
      }

      /* Variant option button */
      const optBtn = e.target.closest('.qv__opt-btn');
      if (optBtn && !optBtn.disabled) {
        const optIdx = parseInt(optBtn.dataset.optIndex, 10);
        const value  = optBtn.dataset.optValue;
        selectOption(optIdx, value);
        return;
      }

      /* Qty adjust */
      const qtyBtn = e.target.closest('[data-qv-qty]');
      if (qtyBtn) {
        const input = qs('#QVQty', modal);
        const delta = parseInt(qtyBtn.dataset.qvQty, 10);
        input.value = Math.max(1, Math.min(99, (parseInt(input.value, 10) || 1) + delta));
        return;
      }

      /* ATC */
      if (e.target.closest('#QVATCBtn')) {
        addToCart();
        return;
      }

      /* Retry */
      if (e.target.closest('#QVRetry')) {
        if (currentHandle) {
          showLoading();
          const trigger = lastTrigger;
          const family  = trigger?.dataset.qvFamily || '';
          const gender  = trigger?.dataset.qvGender || '';
          fetchProduct(currentHandle, family, gender);
        }
      }
    });

    /* Close on Escape */
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && modal && !modal.hasAttribute('hidden')) {
        closeModal();
      }
    });

    /* Qty input direct change */
    modal.addEventListener('change', e => {
      if (e.target.id === 'QVQty') {
        e.target.value = Math.max(1, Math.min(99, parseInt(e.target.value, 10) || 1));
      }
    });
  }

  /* ── Boot ───────────────────────────────────────────────────── */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
