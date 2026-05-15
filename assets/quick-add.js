(function () {
  'use strict';

  const on = (el, ev, fn, opts) => el && el.addEventListener(ev, fn, opts);

  /* ── Cart refresh helper (mirrors cart-drawer.js) ─────────── */
  async function refreshAndOpenCart() {
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

    /* Update badge */
    try {
      const { item_count } = await fetch('/cart.js').then(r => r.json());
      document.querySelectorAll('[data-cart-count]').forEach(el => {
        el.textContent = item_count;
        el.hidden = item_count === 0;
      });
    } catch {}

    /* Open cart drawer if NefumeApp is available */
    const cartDrawer = document.querySelector('#cart-drawer');
    if (cartDrawer && window.NefumeApp?.openDrawer) {
      window.NefumeApp.openDrawer(cartDrawer);
    }
  }

  /* ── Popover helpers ────────────────────────────────────────── */
  function openPopover(trigger, popover) {
    popover.hidden = false;
    trigger.setAttribute('aria-expanded', 'true');
    const firstOpt = popover.querySelector('.quick-add__option:not([disabled])');
    firstOpt?.focus();
  }

  function closeAll() {
    document.querySelectorAll('.quick-add__popover:not([hidden])').forEach(pop => {
      pop.hidden = true;
      const wrap = pop.closest('[data-quick-add]');
      wrap?.querySelector('.quick-add__cta--trigger')
          ?.setAttribute('aria-expanded', 'false');
    });
  }

  /* ── Quick Add: popover toggle ──────────────────────────────── */
  function initQuickAddPopovers() {
    on(document, 'click', e => {
      const trigger = e.target.closest('.quick-add__cta--trigger');
      if (!trigger) return;
      e.stopPropagation();

      const wrap    = trigger.closest('[data-quick-add]');
      const popover = wrap?.querySelector('.quick-add__popover');
      if (!popover) return;

      const isOpen = !popover.hidden;
      closeAll();
      if (!isOpen) openPopover(trigger, popover);
    });

    /* Close on outside click */
    on(document, 'click', e => {
      if (!e.target.closest('[data-quick-add]')) closeAll();
    });

    /* Close on Escape */
    on(document, 'keydown', e => {
      if (e.key === 'Escape') closeAll();
    });
  }

  /* ── Quick Add: variant selection → ATC ────────────────────── */
  function initQuickAddATC() {
    on(document, 'click', async e => {
      const opt = e.target.closest('.quick-add__option');
      if (!opt || opt.disabled) return;

      const variantId    = opt.dataset.variantId;
      const productTitle = opt.dataset.productTitle || 'Product';
      if (!variantId) return;

      opt.classList.add('is-loading');
      opt.setAttribute('aria-busy', 'true');

      try {
        const resp = await fetch('/cart/add.js', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: parseInt(variantId, 10), quantity: 1 })
        });

        if (!resp.ok) throw new Error('add_failed');

        window.showToast?.(`${productTitle} added to cart`, 'success');
        closeAll();
        await refreshAndOpenCart();

      } catch {
        window.showToast?.('Could not add to cart. Please try again.', 'error');
      } finally {
        opt.classList.remove('is-loading');
        opt.removeAttribute('aria-busy');
      }
    });
  }

  /* ── Notify Me placeholder ───────────────────────────────────── */
  function initNotifyMe() {
    on(document, 'click', e => {
      const btn = e.target.closest('[data-notify-me]');
      if (!btn) return;
      window.showToast?.(
        "You'll be notified when this product launches!",
        'success'
      );
    });
  }

  /* ── Wishlist state sync ────────────────────────────────────── */
  function syncWishlist() {
    try {
      const list = JSON.parse(localStorage.getItem('nefume-wishlist') || '[]');
      document.querySelectorAll('[data-wishlist-toggle]').forEach(btn => {
        const id = String(btn.dataset.wishlistToggle);
        const active = list.map(String).includes(id);
        btn.classList.toggle('is-wishlisted', active);
        btn.setAttribute('aria-pressed', String(active));
      });
    } catch {}
  }

  /* Wishlist toggle — delegates to theme.js handler via shared localStorage,
     then re-syncs aria-pressed state on this button. */
  function initWishlistSync() {
    on(document, 'click', e => {
      const btn = e.target.closest('[data-wishlist-toggle]');
      if (!btn) return;
      /* theme.js handles the actual toggle; we just sync state after a tick */
      requestAnimationFrame(syncWishlist);
    });
  }

  /* ── Boot ───────────────────────────────────────────────────── */
  document.addEventListener('DOMContentLoaded', function () {
    initQuickAddPopovers();
    initQuickAddATC();
    initNotifyMe();
    syncWishlist();
    initWishlistSync();
  });

})();
