(function () {
  'use strict';

  const $ = (sel, ctx) => (ctx || document).querySelector(sel);
  const on = (el, ev, fn, opts) => el && el.addEventListener(ev, fn, opts);

  /* ── AJAX helpers ───────────────────────────────────────────── */
  async function cartChange(key, qty) {
    const resp = await fetch('/cart/change.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: key, quantity: qty })
    });
    return resp.json();
  }

  async function refreshCartDrawer() {
    try {
      const resp = await fetch('/?sections=cart-drawer-content');
      const data = await resp.json();
      const html = data['cart-drawer-content'];
      if (!html) return;
      const doc  = new DOMParser().parseFromString(html, 'text/html');
      const src  = doc.querySelector('#cart-drawer-content');
      const dest = $('#cart-drawer-content');
      if (src && dest) dest.innerHTML = src.innerHTML;
      updateCartBadge();
    } catch (err) { console.error(err); }
  }

  async function updateCartBadge() {
    try {
      const { item_count } = await fetch('/cart.js').then(r => r.json());
      document.querySelectorAll('[data-cart-count]').forEach(el => {
        el.textContent = item_count;
        el.hidden = item_count === 0;
      });
    } catch {}
  }

  /* ── Cart drawer interactions ───────────────────────────────── */
  function initCartDrawer() {
    on(document, 'click', e => {
      const btn = e.target.closest('.qty-ctrl__btn');
      if (!btn) return;
      const input = btn.closest('.qty-ctrl')?.querySelector('.qty-ctrl__input');
      if (!input) return;
      let val = parseInt(input.value) || 1;
      val = Math.max(parseInt(input.min) || 0, val + (btn.dataset.dir === 'up' ? 1 : -1));
      input.value = val;
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });

    on(document, 'change', async e => {
      const input = e.target.closest('[data-cart-qty]');
      if (!input) return;
      await cartChange(input.dataset.cartQty, parseInt(input.value) || 0);
      refreshCartDrawer();
    });

    on(document, 'click', async e => {
      const btn = e.target.closest('[data-cart-remove]');
      if (!btn) return;
      await cartChange(btn.dataset.cartRemove, 0);
      refreshCartDrawer();
    });
  }

  /* ── Add to cart ─────────────────────────────────────────────── */
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
        window.showToast?.(`${item.product_title} added to cart`, 'success');
        await refreshCartDrawer();
        const cartDrawer = $('#cart-drawer');
        if (cartDrawer && window.NefumeApp?.openDrawer) {
          window.NefumeApp.openDrawer(cartDrawer);
        }
      } catch {
        window.showToast?.('Could not add to cart. Please try again.', 'error');
      } finally {
        btn?.classList.remove('btn--loading');
      }
    });
  }

  /* ── Boot ───────────────────────────────────────────────────── */
  document.addEventListener('DOMContentLoaded', function () {
    updateCartBadge();
    initCartDrawer();
    initATC();
  });

})();
