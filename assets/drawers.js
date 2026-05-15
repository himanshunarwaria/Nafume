(function () {
  'use strict';

  /* ── Utilities ─────────────────────────────────────────────── */
  const $ = (sel, ctx) => (ctx || document).querySelector(sel);
  const $$ = (sel, ctx) => [...(ctx || document).querySelectorAll(sel)];
  const on = (el, ev, fn, opts) => el && el.addEventListener(ev, fn, opts);

  function lockScroll() { document.body.classList.add('is-locked'); }
  function unlockScroll() { document.body.classList.remove('is-locked'); }

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

  /* ── Drawer core ────────────────────────────────────────────── */
  let _activeDrawer = null;

  function openDrawer(drawer) {
    const ov = $('#drawer-overlay');
    if (_activeDrawer && _activeDrawer !== drawer) closeDrawer(_activeDrawer);
    drawer.classList.add('is-open');
    drawer.setAttribute('aria-hidden', 'false');
    ov?.classList.add('is-open');
    lockScroll();
    _activeDrawer = drawer;
    trapFocus(drawer);
    setTimeout(() => drawer.querySelector('.drawer__close')?.focus(), 60);
  }

  function closeDrawer(drawer) {
    if (!drawer) return;
    const ov = $('#drawer-overlay');
    drawer.classList.remove('is-open');
    drawer.setAttribute('aria-hidden', 'true');
    ov?.classList.remove('is-open');
    unlockScroll();
    _activeDrawer = null;
  }

  /* ── Expose NefumeApp ───────────────────────────────────────── */
  window.NefumeApp = Object.assign(window.NefumeApp || {}, {
    openDrawer, closeDrawer, lockScroll, unlockScroll, trapFocus
  });

  /* ── Global drawer triggers ─────────────────────────────────── */
  function initDrawerTriggers() {
    const ov = $('#drawer-overlay');

    on(ov, 'click', () => _activeDrawer && closeDrawer(_activeDrawer));

    on(document, 'keydown', e => {
      if (e.key === 'Escape' && _activeDrawer) closeDrawer(_activeDrawer);
    });

    on(document, 'click', e => {
      const btn = e.target.closest('[data-drawer-open]');
      if (!btn) return;
      const target = $('#' + btn.dataset.drawerOpen);
      if (target) openDrawer(target);
    });

    on(document, 'click', e => {
      const btn = e.target.closest('[data-drawer-close]');
      if (!btn) return;
      const drawer = btn.closest('.drawer') || _activeDrawer;
      if (drawer) closeDrawer(drawer);
    });

    on($('#cart-trigger'), 'click', () => {
      const d = $('#cart-drawer');
      if (d) openDrawer(d);
    });

    on($('#search-trigger'), 'click', () => {
      const d = $('#search-drawer');
      if (!d) return;
      openDrawer(d);
      setTimeout(() => d.querySelector('[data-search-input]')?.focus(), 80);
    });

    on($('#account-trigger'), 'click', () => {
      const d = $('#account-drawer');
      if (d) openDrawer(d);
    });
  }

  /* ── Search drawer ──────────────────────────────────────────── */
  const fmt = cents => {
    if (typeof Shopify !== 'undefined' && Shopify.formatMoney) return Shopify.formatMoney(cents);
    return '₹' + (cents / 100).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  function initSearchDrawer() {
    const drawer = $('#search-drawer');
    if (!drawer) return;

    const input    = drawer.querySelector('[data-search-input]');
    const results  = drawer.querySelector('[data-search-results]');
    const hints    = drawer.querySelector('[data-search-hints]');
    const clearBtn = drawer.querySelector('[data-search-clear]');
    const moreLink = drawer.querySelector('[data-search-more]');
    if (!input || !results) return;

    let timer;

    const clearResults = () => {
      results.querySelectorAll('.search-result, .search-results__label').forEach(el => el.remove());
    };

    const reset = () => {
      clearResults();
      if (hints)    hints.hidden    = false;
      if (moreLink) moreLink.hidden = true;
    };

    on(input, 'input', () => {
      clearTimeout(timer);
      const q = input.value.trim();
      if (clearBtn) clearBtn.hidden = !q;
      if (q.length < 2) { reset(); return; }
      if (hints) hints.hidden = true;

      timer = setTimeout(async () => {
        try {
          const data = await fetch(
            `/search/suggest.json?q=${encodeURIComponent(q)}&resources[type]=product&resources[limit]=6`
          ).then(r => r.json());
          const products = data.resources?.results?.products || [];

          clearResults();

          if (products.length) {
            const label = document.createElement('p');
            label.className = 'search-results__label';
            label.textContent = 'Products';
            results.prepend(label);

            products.forEach(p => {
              const a = document.createElement('a');
              a.href = p.url;
              a.className = 'search-result';
              a.innerHTML = `
                <img class="search-result__img" src="${p.featured_image?.url || ''}" alt="${p.title}" loading="lazy" width="48" height="48">
                <div class="search-result__info">
                  <span class="search-result__name">${p.title}</span>
                  <span class="search-result__type">${p.product_type || ''}</span>
                </div>
                <span class="search-result__price">${fmt(p.price)}</span>
              `;
              results.appendChild(a);
            });

            if (moreLink) {
              moreLink.href = `/search?q=${encodeURIComponent(q)}&type=product`;
              moreLink.hidden = false;
            }
          } else {
            const label = document.createElement('p');
            label.className = 'search-results__label search-results__label--empty';
            label.textContent = 'No results found';
            results.prepend(label);
            if (moreLink) moreLink.hidden = true;
          }
        } catch {}
      }, 280);
    });

    on(clearBtn, 'click', () => {
      input.value = '';
      input.focus();
      if (clearBtn) clearBtn.hidden = true;
      reset();
    });
  }

  /* ── Account drawer ─────────────────────────────────────────── */
  function initAccountDrawer() {
    const drawer = $('#account-drawer');
    if (!drawer) return;

    const tabBtns   = $$('[data-tab]', drawer);
    const tabPanels = $$('[data-tab-panel]', drawer);

    tabBtns.forEach(btn => {
      on(btn, 'click', () => {
        tabBtns.forEach(b => {
          b.classList.remove('is-active');
          b.setAttribute('aria-selected', 'false');
        });
        tabPanels.forEach(p => {
          p.classList.remove('is-active');
          p.hidden = true;
        });
        btn.classList.add('is-active');
        btn.setAttribute('aria-selected', 'true');
        const panel = drawer.querySelector(`[data-tab-panel="${btn.dataset.tab}"]`);
        if (panel) { panel.classList.add('is-active'); panel.hidden = false; }
      });
    });

    on(drawer.querySelector('[data-show-reset]'), 'click', () => {
      const tabs  = drawer.querySelector('[data-account-tabs]');
      const reset = drawer.querySelector('[data-reset-panel]');
      if (tabs)  tabs.hidden  = true;
      if (reset) reset.hidden = false;
    });

    on(drawer.querySelector('[data-hide-reset]'), 'click', () => {
      const tabs  = drawer.querySelector('[data-account-tabs]');
      const reset = drawer.querySelector('[data-reset-panel]');
      if (tabs)  tabs.hidden  = false;
      if (reset) reset.hidden = true;
    });

    $$('[data-toggle-pw]', drawer).forEach(btn => {
      on(btn, 'click', () => {
        const input = btn.closest('.account-form__input-wrap')?.querySelector('input');
        if (!input) return;
        const isText = input.type === 'text';
        input.type = isText ? 'password' : 'text';
        btn.setAttribute('aria-label', isText ? 'Show password' : 'Hide password');
      });
    });
  }

  /* ── Boot ───────────────────────────────────────────────────── */
  document.addEventListener('DOMContentLoaded', function () {
    initDrawerTriggers();
    initSearchDrawer();
    initAccountDrawer();
  });

})();
