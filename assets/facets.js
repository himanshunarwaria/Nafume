(function () {
  'use strict';

  /* ── Constants ────────────────────────────────────────────── */
  const SECTION_KEY  = 'main-collection-product-grid';
  const SECTION_ID   = 'CollectionSection';
  const GRID_ID      = 'ProductGrid';
  const DRAWER_ID    = 'FilterDrawer';
  const DRAWER_TOGGLE_ID = 'FilterDrawerToggle';

  /* ── Helpers ──────────────────────────────────────────────── */
  function debounce(fn, ms) {
    let t;
    return function (...args) {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), ms);
    };
  }

  function getSection()  { return document.getElementById(SECTION_ID); }
  function getGrid()     { return document.getElementById(GRID_ID); }
  function getDrawer()   { return document.getElementById(DRAWER_ID); }

  /* ── Core: fetch section and replace DOM ─────────────────── */
  async function renderSection(url) {
    const section = getSection();
    if (!section) return;

    section.classList.add('collection--loading');
    window.scrollTo({ top: section.offsetTop - 80, behavior: 'smooth' });

    try {
      const fetchUrl = url + (url.includes('?') ? '&' : '?') + 'sections=' + SECTION_KEY;
      const response = await fetch(fetchUrl);

      if (!response.ok) throw new Error(response.status);

      const data    = await response.json();
      const html    = data[SECTION_KEY];
      if (!html) throw new Error('empty');

      const doc     = new DOMParser().parseFromString(html, 'text/html');
      const fresh   = doc.getElementById(SECTION_ID);

      if (fresh) {
        section.innerHTML = fresh.innerHTML;
        /* Re-initialise infinite scroll after DOM replacement */
        initInfiniteScroll();
      }

      history.pushState({ path: url }, '', url);

    } catch {
      /* Graceful fallback: hard navigate */
      window.location.href = url;
    } finally {
      const s = getSection();
      s?.classList.remove('collection--loading');
    }
  }

  /* ── Build URL from a filter form ────────────────────────── */
  function formToUrl(form) {
    const data   = new FormData(form);
    const params = new URLSearchParams();

    for (const [key, val] of data.entries()) {
      /* Skip empty strings but keep zeros */
      if (val !== '') params.append(key, val);
    }

    /* Always reset to page 1 when filters change */
    params.delete('page');

    return window.location.pathname + '?' + params.toString();
  }

  /* ── Drawer open / close ──────────────────────────────────── */
  function openDrawer() {
    const drawer  = getDrawer();
    const toggle  = document.getElementById(DRAWER_TOGGLE_ID);
    if (!drawer) return;

    drawer.classList.add('is-open');
    drawer.setAttribute('aria-hidden', 'false');
    toggle?.setAttribute('aria-expanded', 'true');
    document.body.classList.add('is-locked');

    /* Trap focus inside the panel */
    const closeBtn = drawer.querySelector('[data-filter-drawer-close]');
    closeBtn?.focus();
  }

  function closeDrawer() {
    const drawer  = getDrawer();
    const toggle  = document.getElementById(DRAWER_TOGGLE_ID);
    if (!drawer) return;

    drawer.classList.remove('is-open');
    drawer.setAttribute('aria-hidden', 'true');
    toggle?.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('is-locked');
  }

  /* ── Infinite scroll ──────────────────────────────────────── */
  function initInfiniteScroll() {
    const sentinel = document.querySelector('[data-infinite-sentinel]');
    if (!sentinel || !('IntersectionObserver' in window)) return;

    const obs = new IntersectionObserver(async entries => {
      if (!entries[0].isIntersecting) return;
      obs.unobserve(sentinel);

      const nextUrl = sentinel.dataset.nextUrl;
      if (!nextUrl) return;

      sentinel.classList.add('is-loading');
      sentinel.dataset.nextUrl = ''; /* prevent double-fire */

      try {
        const fetchUrl = nextUrl + '&sections=' + SECTION_KEY;
        const resp     = await fetch(fetchUrl);
        const data     = await resp.json();
        const html     = data[SECTION_KEY];
        if (!html) return;

        const doc      = new DOMParser().parseFromString(html, 'text/html');
        const grid     = getGrid();
        const newItems = doc.querySelectorAll('#' + GRID_ID + ' .collection__item');

        newItems.forEach(item => grid?.appendChild(item));

        const newSentinel = doc.querySelector('[data-infinite-sentinel]');
        if (newSentinel && newSentinel.dataset.nextUrl) {
          sentinel.dataset.nextUrl = newSentinel.dataset.nextUrl;
          sentinel.classList.remove('is-loading');
          obs.observe(sentinel);
        } else {
          sentinel.remove();
        }

        history.replaceState({ path: nextUrl }, '', nextUrl);

      } catch {
        sentinel.classList.remove('is-loading');
        obs.observe(sentinel); /* retry on next scroll */
      }

    }, { rootMargin: '300px 0px' });

    obs.observe(sentinel);
  }

  /* ── Load more ────────────────────────────────────────────── */
  async function handleLoadMore(btn) {
    const nextUrl = btn.dataset.nextUrl;
    if (!nextUrl || btn.disabled) return;

    btn.classList.add('is-loading');
    btn.disabled = true;

    try {
      const fetchUrl = nextUrl + '&sections=' + SECTION_KEY;
      const resp     = await fetch(fetchUrl);
      const data     = await resp.json();
      const html     = data[SECTION_KEY];
      if (!html) return;

      const doc      = new DOMParser().parseFromString(html, 'text/html');
      const grid     = getGrid();
      const newItems = doc.querySelectorAll('#' + GRID_ID + ' .collection__item');

      newItems.forEach(item => grid?.appendChild(item));

      const newBtn = doc.querySelector('[data-load-more]');
      if (newBtn) {
        btn.dataset.nextUrl = newBtn.dataset.nextUrl;
        btn.classList.remove('is-loading');
        btn.disabled = false;
        /* Update "showing X of Y" status */
        const status = btn.closest('.collection__load-more')?.querySelector('.collection__load-more-status');
        const newStatus = doc.querySelector('.collection__load-more-status');
        if (status && newStatus) status.textContent = newStatus.textContent;
      } else {
        btn.closest('.collection__load-more')?.remove();
      }

      history.replaceState({ path: nextUrl }, '', nextUrl);

    } catch {
      btn.classList.remove('is-loading');
      btn.disabled = false;
    }
  }

  /* ── Event delegation ─────────────────────────────────────── */
  function bindEvents() {
    const root = document.body;

    /* Sort change */
    root.addEventListener('change', e => {
      const select = e.target.closest('[data-sort-select]');
      if (!select) return;
      const url = new URL(window.location.href);
      url.searchParams.set('sort_by', select.value);
      url.searchParams.delete('page');
      renderSection(url.href);
    });

    /* Filter checkbox / list change → immediate AJAX (sidebar) */
    root.addEventListener('change', e => {
      const cb = e.target.closest('[data-filter-checkbox]');
      if (!cb) return;
      const form = cb.closest('[data-filter-form]');
      if (!form) return;

      /* Sidebar forms: apply immediately.
         Drawer form: defer to the Apply button. */
      const isDrawerForm = form.dataset.filterForm === 'drawer';
      if (!isDrawerForm) {
        renderSection(formToUrl(form));
      }
    });

    /* Price range: Apply button click */
    root.addEventListener('click', e => {
      const btn = e.target.closest('[data-price-apply]');
      if (!btn) return;
      const form = btn.closest('[data-filter-form]');
      if (!form) return;

      const isDrawerForm = form.dataset.filterForm === 'drawer';
      if (!isDrawerForm) {
        renderSection(formToUrl(form));
      }
    });

    /* Price range: Enter key in input */
    root.addEventListener('keydown', e => {
      if (e.key !== 'Enter') return;
      const input = e.target.closest('[data-price-min],[data-price-max]');
      if (!input) return;
      e.preventDefault();
      const form = input.closest('[data-filter-form]');
      if (!form) return;
      const isDrawerForm = form.dataset.filterForm === 'drawer';
      if (!isDrawerForm) renderSection(formToUrl(form));
    });

    /* Drawer Apply button: apply drawer form and close */
    root.addEventListener('click', e => {
      const btn = e.target.closest('[data-drawer-apply]');
      if (!btn) return;
      const form = document.querySelector('[data-filter-form="drawer"]');
      if (form) {
        closeDrawer();
        renderSection(formToUrl(form));
      }
    });

    /* Active filter pill removal */
    root.addEventListener('click', e => {
      const pill = e.target.closest('[data-filter-remove]');
      if (!pill) return;
      e.preventDefault();
      closeDrawer();
      renderSection(pill.href);
    });

    /* Clear all filters */
    root.addEventListener('click', e => {
      const link = e.target.closest('[data-clear-all]');
      if (!link) return;
      e.preventDefault();
      closeDrawer();
      renderSection(link.href);
    });

    /* Paginated page link */
    root.addEventListener('click', e => {
      const link = e.target.closest('[data-pagination-link]');
      if (!link) return;
      e.preventDefault();
      renderSection(link.href);
    });

    /* Load more button */
    root.addEventListener('click', e => {
      const btn = e.target.closest('[data-load-more]');
      if (!btn) return;
      e.preventDefault();
      handleLoadMore(btn);
    });

    /* Filter drawer toggle */
    root.addEventListener('click', e => {
      if (e.target.closest('[data-filter-drawer-toggle]')) {
        openDrawer();
      }
    });

    /* Filter drawer close button */
    root.addEventListener('click', e => {
      if (e.target.closest('[data-filter-drawer-close]')) {
        closeDrawer();
      }
    });

    /* Drawer overlay click to close */
    root.addEventListener('click', e => {
      if (e.target.closest('[data-filter-drawer-overlay]')) {
        closeDrawer();
      }
    });

    /* Keyboard: Escape closes drawer */
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') closeDrawer();
    });

    /* Browser back/forward navigation */
    window.addEventListener('popstate', () => {
      renderSection(window.location.href);
    });
  }

  /* ── Boot ─────────────────────────────────────────────────── */
  function init() {
    if (!document.getElementById(SECTION_ID)) return;
    bindEvents();
    initInfiniteScroll();
  }

  document.addEventListener('DOMContentLoaded', init);

  /* Shopify theme editor re-init */
  document.addEventListener('shopify:section:load', e => {
    if (e.target.querySelector('#' + SECTION_ID)) {
      initInfiniteScroll();
    }
  });

})();
