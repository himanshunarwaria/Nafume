(function () {
  'use strict';

  /* Honour prefers-reduced-motion — CSS handles the pause, but we skip
     the IntersectionObserver entirely so we never accidentally unpause. */
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function initMarquee(section) {
    if (!('IntersectionObserver' in window) || reducedMotion) return;

    const tracks = section.querySelectorAll('[data-em-track]');
    if (!tracks.length) return;

    /* Pause tracks when the section scrolls out of viewport.
       rootMargin: 100px keeps them warm just before entering. */
    const obs = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          const state = entry.isIntersecting ? 'running' : 'paused';
          tracks.forEach(t => { t.style.animationPlayState = state; });
        });
      },
      { threshold: 0, rootMargin: '100px 0px' }
    );

    obs.observe(section);
  }

  /* ── Boot ─────────────────────────────────────────────────── */
  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[data-editorial-marquee]').forEach(initMarquee);
  });

  /* Shopify theme editor: re-init when section is reloaded */
  document.addEventListener('shopify:section:load', e => {
    const section = e.target.querySelector('[data-editorial-marquee]');
    if (section) initMarquee(section);
  });

})();
