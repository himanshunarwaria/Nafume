(function () {
  'use strict';

  /* ── Helpers ──────────────────────────────────────────────── */
  function qs(sel, ctx)  { return (ctx || document).querySelector(sel); }
  function qsa(sel, ctx) { return Array.from((ctx || document).querySelectorAll(sel)); }

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── Autoplay registry (keyed by section element) ──────────── */
  const autoplayTimers = new WeakMap();

  /* ── initReviewCarousel ────────────────────────────────────── */
  function initReviewCarousel(section) {
    if (section.dataset.rcInit) return;
    section.dataset.rcInit = '1';

    const track     = qs('[data-rc-track]',   section);
    const fill      = qs('[data-rc-fill]',    section);
    const btnPrev   = qs('[data-rc-prev]',    section);
    const btnNext   = qs('[data-rc-next]',    section);
    const dotsWrap  = qs('[data-rc-dots]',    section);
    const dots      = dotsWrap ? qsa('[data-rc-dot]', dotsWrap) : [];
    const slides    = qsa('[data-rc-slide]',  section);
    const total     = slides.length;
    const speed     = parseInt(section.dataset.rcAutoplay, 10) || 0;

    if (!track || total === 0) return;

    let activeIndex = 0;
    let isDragging  = false;
    let dragStartX  = 0;
    let dragScrollL = 0;

    /* ── Slide width helper ─── */
    function slideWidth() {
      const s = track.querySelector('[data-rc-slide]');
      if (!s) return 0;
      return s.offsetWidth + (parseFloat(getComputedStyle(track).columnGap) || 0);
    }

    /* ── Scroll to slide index ─── */
    function scrollTo(index, behavior) {
      behavior = reducedMotion ? 'instant' : (behavior || 'smooth');
      const target = track.querySelector(`[data-rc-slide="${index}"]`);
      if (!target) return;
      track.scrollTo({ left: target.offsetLeft - track.offsetLeft, behavior });
    }

    /* ── Sync active state from current scroll position ─── */
    function syncState() {
      const sw = slideWidth();
      if (!sw) return;

      const { scrollLeft, scrollWidth, clientWidth } = track;
      const maxScroll = scrollWidth - clientWidth;

      /* Compute which slide is most in view */
      let closestIndex = 0;
      let closestDist  = Infinity;
      slides.forEach((slide, i) => {
        const dist = Math.abs(slide.offsetLeft - track.offsetLeft - scrollLeft);
        if (dist < closestDist) {
          closestDist  = dist;
          closestIndex = i;
        }
      });

      activeIndex = closestIndex;

      /* Arrows */
      if (btnPrev) btnPrev.disabled = scrollLeft <= 1;
      if (btnNext) btnNext.disabled = scrollLeft >= maxScroll - 1;

      /* Dots */
      dots.forEach((dot, i) => {
        dot.classList.toggle('is-active', i === activeIndex);
      });

      /* Progress fill */
      if (fill && maxScroll > 0) {
        fill.style.width = (scrollLeft / maxScroll * 100) + '%';
      }
    }

    /* ── Arrow nav ─── */
    if (btnPrev) {
      btnPrev.addEventListener('click', () => {
        stopAutoplay();
        scrollTo(Math.max(0, activeIndex - 1));
      });
    }

    if (btnNext) {
      btnNext.addEventListener('click', () => {
        stopAutoplay();
        scrollTo(Math.min(total - 1, activeIndex + 1));
      });
    }

    /* ── Dot nav ─── */
    dots.forEach(dot => {
      dot.addEventListener('click', () => {
        stopAutoplay();
        scrollTo(parseInt(dot.dataset.rcDot, 10));
      });
    });

    /* ── Keyboard nav on focused track ─── */
    track.setAttribute('tabindex', '0');
    track.addEventListener('keydown', e => {
      if (e.key === 'ArrowLeft')  { e.preventDefault(); scrollTo(Math.max(0, activeIndex - 1)); }
      if (e.key === 'ArrowRight') { e.preventDefault(); scrollTo(Math.min(total - 1, activeIndex + 1)); }
    });

    /* ── Pointer drag ─── */
    track.addEventListener('pointerdown', e => {
      if (e.pointerType === 'touch') return;
      isDragging  = true;
      dragStartX  = e.clientX;
      dragScrollL = track.scrollLeft;
      track.classList.add('is-dragging');
      track.setPointerCapture(e.pointerId);
      stopAutoplay();
    });

    track.addEventListener('pointermove', e => {
      if (!isDragging) return;
      const dx = dragStartX - e.clientX;
      track.scrollLeft = dragScrollL + dx;
    });

    ['pointerup', 'pointercancel'].forEach(evt => {
      track.addEventListener(evt, () => {
        if (!isDragging) return;
        isDragging = false;
        track.classList.remove('is-dragging');
      });
    });

    /* Prevent link clicks after drag */
    track.addEventListener('click', e => {
      if (Math.abs(track.scrollLeft - dragScrollL) > 4) e.preventDefault();
    }, { capture: true });

    /* ── Scroll listener ─── */
    let scrollRaf;
    track.addEventListener('scroll', () => {
      cancelAnimationFrame(scrollRaf);
      scrollRaf = requestAnimationFrame(syncState);
    }, { passive: true });

    /* ── Autoplay ─── */
    function advance() {
      const next = activeIndex + 1;
      if (next >= total) {
        /* Rewind to start — smooth for short lists, instant for many slides */
        scrollTo(0, total > 6 ? 'instant' : 'smooth');
      } else {
        scrollTo(next);
      }
    }

    function startAutoplay() {
      if (!speed || reducedMotion) return;
      stopAutoplay();
      const id = setInterval(advance, speed * 1000);
      autoplayTimers.set(section, id);
    }

    function stopAutoplay() {
      const id = autoplayTimers.get(section);
      if (id) {
        clearInterval(id);
        autoplayTimers.delete(section);
      }
    }

    /* Pause on hover */
    section.addEventListener('mouseenter', stopAutoplay);
    section.addEventListener('mouseleave', startAutoplay);

    /* Pause when off-screen */
    if ('IntersectionObserver' in window) {
      const obs = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) startAutoplay();
          else                      stopAutoplay();
        });
      }, { threshold: 0.1 });
      obs.observe(section);
    } else {
      startAutoplay();
    }

    /* ── ResizeObserver ─── */
    if ('ResizeObserver' in window) {
      const ro = new ResizeObserver(() => syncState());
      ro.observe(track);
    }

    /* Initial state */
    syncState();
  }

  /* ── Product Reviews Section ───────────────────────────────── */
  function initProductReviews() {
    /* Write a Review button: if it links to '#', scroll to the reviews section */
    document.body.addEventListener('click', e => {
      const btn = e.target.closest('[data-write-review]');
      if (!btn) return;
      const href = btn.getAttribute('href');
      if (!href || href === '#') {
        e.preventDefault();
        const section = btn.closest('[data-reviews-section]');
        if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  }

  /* ── Init all carousels ────────────────────────────────────── */
  function initAll() {
    qsa('[data-rc]').forEach(initReviewCarousel);
    initProductReviews();
  }

  /* ── Shopify customizer hooks ─────────────────────────────── */
  document.addEventListener('shopify:section:load', e => {
    const carousel = e.target.querySelector('[data-rc]');
    if (carousel) {
      delete carousel.dataset.rcInit;
      initReviewCarousel(carousel);
    }
    initProductReviews();
  });

  document.addEventListener('shopify:section:unload', e => {
    const carousel = e.target.querySelector('[data-rc]');
    if (carousel) {
      const id = autoplayTimers.get(carousel);
      if (id) {
        clearInterval(id);
        autoplayTimers.delete(carousel);
      }
    }
  });

  document.addEventListener('shopify:block:select', e => {
    const carousel = e.target.closest('[data-rc]');
    if (!carousel) return;
    const slide = e.target.closest('[data-rc-slide]');
    if (!slide) return;
    const idx = parseInt(slide.dataset.rcSlide, 10);
    if (!isNaN(idx)) {
      const track = qs('[data-rc-track]', carousel);
      if (track) {
        const target = track.querySelector(`[data-rc-slide="${idx}"]`);
        if (target) {
          track.scrollTo({ left: target.offsetLeft - track.offsetLeft, behavior: 'smooth' });
        }
      }
    }
  });

  /* ── Boot ──────────────────────────────────────────────────── */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAll);
  } else {
    initAll();
  }

})();
