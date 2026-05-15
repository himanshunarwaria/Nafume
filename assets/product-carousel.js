(function () {
  'use strict';
  if (window._nfPCLoaded) return;
  window._nfPCLoaded = true;

  /* ── Per-carousel init guard ─────────────────────────────── */
  function initCarousel(section) {
    if (section.dataset.pcInit) return;
    section.dataset.pcInit = '1';

    const track   = section.querySelector('[data-pc-track]');
    const fill    = section.querySelector('[data-pc-fill]');
    const btnPrev = section.querySelector('.pc__nav-btn--prev');
    const btnNext = section.querySelector('.pc__nav-btn--next');

    if (!track) return;

    /* ── Slide width helper ──────────────────────────────────── */
    function slideWidth() {
      const slide = track.querySelector('.pc__slide');
      if (!slide) return 0;
      const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
      return slide.offsetWidth + gap;
    }

    /* ── Sync arrow states + progress fill ──────────────────── */
    function syncState() {
      const { scrollLeft, scrollWidth, clientWidth } = track;
      const maxScroll = scrollWidth - clientWidth;

      if (btnPrev) btnPrev.disabled = scrollLeft <= 1;
      if (btnNext) btnNext.disabled = scrollLeft >= maxScroll - 1;

      if (fill && maxScroll > 0) {
        const pct = (scrollLeft / maxScroll) * 100;
        fill.style.width = pct + '%';
      } else if (fill) {
        fill.style.width = '100%';
      }
    }

    /* ── Arrow click ─────────────────────────────────────────── */
    if (btnPrev) {
      btnPrev.addEventListener('click', () => {
        track.scrollBy({ left: -slideWidth(), behavior: 'smooth' });
      });
    }

    if (btnNext) {
      btnNext.addEventListener('click', () => {
        track.scrollBy({ left: slideWidth(), behavior: 'smooth' });
      });
    }

    /* ── Keyboard nav on focused track ──────────────────────── */
    track.addEventListener('keydown', e => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        track.scrollBy({ left: -slideWidth(), behavior: 'smooth' });
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        track.scrollBy({ left: slideWidth(), behavior: 'smooth' });
      }
    });

    /* ── Drag to scroll (pointer events, skip touch) ─────────── */
    let isDragging = false;
    let startX     = 0;
    let scrollStart = 0;

    track.addEventListener('pointerdown', e => {
      if (e.pointerType === 'touch') return;
      isDragging  = true;
      startX      = e.clientX;
      scrollStart = track.scrollLeft;
      track.setPointerCapture(e.pointerId);
    });

    track.addEventListener('pointermove', e => {
      if (!isDragging || e.pointerType === 'touch') return;
      const dx = e.clientX - startX;
      track.scrollLeft = scrollStart - dx;
    });

    track.addEventListener('pointerup', e => {
      if (e.pointerType === 'touch') return;
      isDragging = false;
    });

    track.addEventListener('pointercancel', () => {
      isDragging = false;
    });

    /* Prevent accidental link clicks after drag */
    track.addEventListener('click', e => {
      if (Math.abs(track.scrollLeft - scrollStart) > 4) {
        e.preventDefault();
      }
    }, { capture: true });

    /* ── Scroll listener → sync state ──────────────────────── */
    track.addEventListener('scroll', syncState, { passive: true });

    /* ── ResizeObserver → recheck state on layout change ────── */
    if ('ResizeObserver' in window) {
      new ResizeObserver(syncState).observe(track);
    }

    /* Initial state */
    syncState();
  }

  /* ── Boot all carousels on the page ─────────────────────── */
  function initAll() {
    document.querySelectorAll('[data-pc]').forEach(initCarousel);
  }

  document.addEventListener('DOMContentLoaded', initAll);

  /* ── Shopify theme editor: re-init on section load ────────── */
  document.addEventListener('shopify:section:load', e => {
    const section = e.target.querySelector('[data-pc]');
    if (section) {
      delete section.dataset.pcInit;
      initCarousel(section);
    }
  });

})();
