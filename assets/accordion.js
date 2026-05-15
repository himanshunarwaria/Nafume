(function () {
  'use strict';

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ─────────────────────────────────────────────────────────
     1. READ MORE — SEO section expand/collapse
        Attributes used:
          [data-rm-body]          — the collapsible content div
          [data-rm-height]        — peek height in px (on body)
          data-rm-toggle          — the toggle button
          data-rm-target          — id of the body (on button)
          data-rm-more-label      — label when collapsed (on button)
          data-rm-less-label      — label when expanded (on button)
          [data-rm-label]         — span inside button whose text changes
     ───────────────────────────────────────────────────────── */
  function initReadMore(container) {
    const toggle = container.querySelector('[data-rm-toggle]');
    if (!toggle) return;

    const targetId = toggle.dataset.rmTarget;
    const body     = targetId
      ? document.getElementById(targetId)
      : container.querySelector('[data-rm-body]');

    if (!body) return;

    const peekHeight   = parseInt(body.dataset.rmHeight, 10) || 200;
    const moreLabel    = toggle.dataset.rmMoreLabel || 'Read More';
    const lessLabel    = toggle.dataset.rmLessLabel || 'Read Less';
    const labelEl      = toggle.querySelector('[data-rm-label]');

    /* Measure natural height BEFORE clamping */
    const naturalH = body.scrollHeight;

    /* Not enough content to need collapsing */
    if (naturalH <= peekHeight + 40) {
      toggle.hidden = true;
      /* Remove gradient so it doesn't clip short content */
      body.style.overflow = 'visible';
      return;
    }

    /* Apply initial collapsed height */
    body.style.height = peekHeight + 'px';
    toggle.setAttribute('aria-expanded', 'false');

    /* Track open/closed state */
    let isOpen = false;

    toggle.addEventListener('click', () => {
      if (isOpen) {
        collapse();
      } else {
        expand();
      }
    });

    function expand() {
      isOpen = true;
      toggle.setAttribute('aria-expanded', 'true');
      if (labelEl) labelEl.textContent = lessLabel;
      body.classList.add('is-expanded');

      if (reducedMotion) {
        body.style.height = 'auto';
        return;
      }

      const targetH = body.scrollHeight;
      body.style.height = targetH + 'px';
      body.addEventListener('transitionend', onExpandDone, { once: true });
      /* Safety timeout in case transitionend doesn't fire */
      setTimeout(onExpandDone, 500);
    }

    function onExpandDone() {
      /* Release fixed height after expansion so content reflows correctly */
      body.style.height = 'auto';
    }

    function collapse() {
      isOpen = false;
      toggle.setAttribute('aria-expanded', 'false');
      if (labelEl) labelEl.textContent = moreLabel;
      body.classList.remove('is-expanded');

      if (reducedMotion) {
        body.style.height = peekHeight + 'px';
        return;
      }

      /* Snapshot current rendered height (may be 'auto') */
      const currentH = body.getBoundingClientRect().height;
      body.style.height = currentH + 'px';

      /* Two rAFs: set explicit height → browser paints → animate to peek */
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          body.style.height = peekHeight + 'px';
        });
      });
    }
  }

  /* ─────────────────────────────────────────────────────────
     2. FAQ ACCORDION — height-based smooth animation
        Attributes used:
          [data-faq-item]     — wrapper per question
          [data-faq-trigger]  — the <button> (has aria-expanded)
          [data-faq-body]     — the collapsible answer panel
     ───────────────────────────────────────────────────────── */
  function initFaqAccordion(container) {
    const items = Array.from(container.querySelectorAll('[data-faq-item]'));
    if (!items.length) return;

    items.forEach(item => {
      const trigger = item.querySelector('[data-faq-trigger]');
      const body    = item.querySelector('[data-faq-body]');
      if (!trigger || !body) return;

      /* Ensure CSS class isn't adding auto height (remove no-JS fallback) */
      body.style.height = '0';
      item.classList.remove('is-open');

      trigger.addEventListener('click', () => {
        const isOpen = trigger.getAttribute('aria-expanded') === 'true';
        if (isOpen) {
          closeItem(item, trigger, body);
        } else {
          openItem(item, trigger, body);
        }
      });
    });
  }

  function openItem(item, trigger, body) {
    trigger.setAttribute('aria-expanded', 'true');
    item.classList.add('is-open');

    if (reducedMotion) {
      body.style.height = 'auto';
      return;
    }

    const targetH = body.scrollHeight;
    body.style.height = targetH + 'px';
    body.addEventListener('transitionend', () => {
      body.style.height = 'auto';
    }, { once: true });
  }

  function closeItem(item, trigger, body) {
    trigger.setAttribute('aria-expanded', 'false');
    item.classList.remove('is-open');

    if (reducedMotion) {
      body.style.height = '0';
      return;
    }

    /* Snapshot rendered height, then animate to 0 */
    const currentH = body.getBoundingClientRect().height;
    body.style.height = currentH + 'px';
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        body.style.height = '0';
      });
    });
  }

  /* ─────────────────────────────────────────────────────────
     3. THEME ACCORDION — enhances existing .accordion-* pattern
        (used by faq.liquid, seo-content old version, etc.)
        Replaces the CSS max-height:800px hack with scrollHeight.
     ───────────────────────────────────────────────────────── */
  function initThemeAccordion(container) {
    container.addEventListener('click', e => {
      const trigger = e.target.closest('[data-accordion-trigger]');
      if (!trigger) return;

      const item = trigger.closest('[data-accordion-item]');
      const body = item?.querySelector('[data-accordion-body]');
      if (!item || !body) return;

      const isOpen = item.classList.contains('is-open');

      /* Optionally close siblings (data-multi="false" disables this) */
      const accordion = item.closest('.accordion');
      if (accordion && accordion.dataset.multi !== 'true') {
        accordion.querySelectorAll('[data-accordion-item].is-open').forEach(openItem => {
          if (openItem !== item) {
            const openBody    = openItem.querySelector('[data-accordion-body]');
            const openTrigger = openItem.querySelector('[data-accordion-trigger]');
            collapseThemeItem(openItem, openTrigger, openBody);
          }
        });
      }

      if (isOpen) {
        collapseThemeItem(item, trigger, body);
      } else {
        expandThemeItem(item, trigger, body);
      }
    });
  }

  function expandThemeItem(item, trigger, body) {
    item.classList.add('is-open');
    body.classList.add('is-open');
    trigger?.setAttribute('aria-expanded', 'true');

    if (reducedMotion) {
      body.style.maxHeight = '9999px';
      return;
    }

    body.style.maxHeight = '0';
    const targetH = body.scrollHeight;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        body.style.maxHeight = targetH + 'px';
        body.addEventListener('transitionend', () => {
          body.style.maxHeight = '9999px'; /* allow reflow */
        }, { once: true });
      });
    });
  }

  function collapseThemeItem(item, trigger, body) {
    item.classList.remove('is-open');
    body.classList.remove('is-open');
    trigger?.setAttribute('aria-expanded', 'false');

    if (reducedMotion) {
      body.style.maxHeight = '0';
      return;
    }

    const currentH = body.scrollHeight;
    body.style.maxHeight = currentH + 'px';
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        body.style.maxHeight = '0';
      });
    });
  }

  /* ─────────────────────────────────────────────────────────
     4. Init — scan document for all known patterns
     ───────────────────────────────────────────────────────── */
  function initAll(root) {
    root = root || document;

    /* Read More sections */
    root.querySelectorAll('[data-rm-body]').forEach(body => {
      const section = body.closest('section') || body.parentElement;
      initReadMore(section);
    });

    /* FAQ accordions */
    root.querySelectorAll('.faq-section__list').forEach(list => {
      initFaqAccordion(list);
    });

    /* Theme accordions (existing .accordion-* pattern) */
    root.querySelectorAll('.accordion[data-multi]').forEach(acc => {
      initThemeAccordion(acc);
    });
  }

  /* ── Shopify customizer hooks ─────────────────────────────── */
  document.addEventListener('shopify:section:load', e => {
    initAll(e.target);
  });

  /* ── Boot ─────────────────────────────────────────────────── */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initAll());
  } else {
    initAll();
  }

})();
