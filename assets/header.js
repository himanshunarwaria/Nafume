/* ============================================================
   NEFUME — header.js
   Standalone module: loads before theme.js.
   Owns: Announcement bar · Header scroll · Mobile menu
         Submenu accordion · Mega menu keyboard nav
   ============================================================ */
'use strict';

(function () {

  /* ============================================================
     Announcement Bar
     – Rotating messages with auto-advance, prev/next, close
  ============================================================ */
  function initAnnBar() {
    var bar = document.getElementById('announcement-bar');
    if (!bar) return;

    // Respect previous dismiss
    try {
      if (sessionStorage.getItem('nefume-bar')) {
        bar.hidden = true;
        document.documentElement.style.setProperty('--bar-h', '0px');
        return;
      }
    } catch (_) {}

    var slides   = Array.from(bar.querySelectorAll('[data-ann-slide]'));
    var interval = parseInt(bar.dataset.interval, 10) || 4000;
    var current  = 0;
    var timer    = null;

    function goTo(idx) {
      slides[current].classList.remove('is-active');
      slides[current].setAttribute('aria-hidden', 'true');
      current = ((idx % slides.length) + slides.length) % slides.length;
      slides[current].classList.add('is-active');
      slides[current].setAttribute('aria-hidden', 'false');
    }

    function start() { timer = setInterval(function () { goTo(current + 1); }, interval); }
    function stop()  { clearInterval(timer); }

    if (slides.length > 1) {
      start();
      bar.addEventListener('mouseenter', stop);
      bar.addEventListener('mouseleave', start);

      var prev = bar.querySelector('[data-ann-prev]');
      var next = bar.querySelector('[data-ann-next]');
      if (prev) prev.addEventListener('click', function () { stop(); goTo(current - 1); start(); });
      if (next) next.addEventListener('click', function () { stop(); goTo(current + 1); start(); });
    }

    // Dismiss / close
    var closeBtn = bar.querySelector('[data-ann-close]');
    if (closeBtn) {
      closeBtn.addEventListener('click', function () {
        bar.style.transition = 'height 0.28s ease, opacity 0.28s ease';
        bar.style.overflow   = 'hidden';
        bar.style.height     = bar.offsetHeight + 'px';
        requestAnimationFrame(function () {
          bar.style.height  = '0';
          bar.style.opacity = '0';
        });
        bar.addEventListener('transitionend', function () {
          bar.hidden = true;
          document.documentElement.style.setProperty('--bar-h', '0px');
        }, { once: true });
        try { sessionStorage.setItem('nefume-bar', '1'); } catch (_) {}
      });
    }
  }

  /* ============================================================
     Header — Scroll State + Transparent-to-Solid
  ============================================================ */
  function initHeaderScroll() {
    var header = document.getElementById('site-header');
    if (!header) return;

    function update() {
      header.classList.toggle('is-scrolled', window.scrollY > 50);
    }

    update(); // run immediately to avoid flash on reload-at-scroll
    var ticking = false;
    window.addEventListener('scroll', function () {
      if (ticking) return;
      requestAnimationFrame(function () { update(); ticking = false; });
      ticking = true;
    }, { passive: true });
  }

  /* ============================================================
     Mobile Menu — Drawer open/close + submenu accordion
  ============================================================ */
  function initMobileMenu() {
    var hamburger = document.querySelector('[data-hamburger]');
    var menu      = document.getElementById('mobile-menu');
    var overlay   = document.getElementById('drawer-overlay');
    if (!hamburger || !menu) return;

    function openMenu() {
      menu.classList.add('is-open');
      menu.setAttribute('aria-hidden', 'false');
      hamburger.classList.add('is-open');
      hamburger.setAttribute('aria-expanded', 'true');
      hamburger.setAttribute('aria-label', 'Close menu');
      if (overlay) overlay.classList.add('is-open');
      document.body.classList.add('is-locked');
      // Focus first link inside drawer
      var firstFocusable = menu.querySelector('a, button');
      if (firstFocusable) firstFocusable.focus();
    }

    function closeMenu() {
      menu.classList.remove('is-open');
      menu.setAttribute('aria-hidden', 'true');
      hamburger.classList.remove('is-open');
      hamburger.setAttribute('aria-expanded', 'false');
      hamburger.setAttribute('aria-label', 'Open menu');
      if (overlay) overlay.classList.remove('is-open');
      document.body.classList.remove('is-locked');
      hamburger.focus();
    }

    hamburger.addEventListener('click', function () {
      menu.classList.contains('is-open') ? closeMenu() : openMenu();
    });

    if (overlay) overlay.addEventListener('click', closeMenu);

    var closeBtn = menu.querySelector('[data-drawer-close]');
    if (closeBtn) closeBtn.addEventListener('click', closeMenu);

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && menu.classList.contains('is-open')) closeMenu();
    });

    // ---- Submenu accordion ----
    menu.querySelectorAll('[data-toggle-sub]').forEach(function (btn) {
      var subId = btn.getAttribute('aria-controls');
      var sub   = document.getElementById(subId);
      if (!sub) return;

      // JS owns the height — CSS sets overflow:hidden via class
      sub.style.maxHeight  = '0';
      sub.style.overflow   = 'hidden';
      sub.style.transition = 'max-height 0.3s ease';

      btn.addEventListener('click', function () {
        var isOpen = btn.getAttribute('aria-expanded') === 'true';

        // Collapse any other open submenu
        menu.querySelectorAll('[data-toggle-sub][aria-expanded="true"]').forEach(function (other) {
          if (other === btn) return;
          other.setAttribute('aria-expanded', 'false');
          var otherSub = document.getElementById(other.getAttribute('aria-controls'));
          if (otherSub) otherSub.style.maxHeight = '0';
        });

        btn.setAttribute('aria-expanded', String(!isOpen));
        sub.style.maxHeight = isOpen ? '0' : sub.scrollHeight + 'px';
      });
    });
  }

  /* ============================================================
     Desktop Mega Menu — keyboard navigation
     CSS :hover handles mouse; this handles keyboard / Enter / Esc
  ============================================================ */
  function initMegaMenu() {
    document.querySelectorAll('.nav__item--has-drop').forEach(function (item) {
      var trigger = item.querySelector('[data-nav-parent]');
      var panel   = item.querySelector('.mega-menu');
      if (!trigger || !panel) return;

      trigger.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          var expanded = trigger.getAttribute('aria-expanded') === 'true';
          trigger.setAttribute('aria-expanded', String(!expanded));
          item.classList.toggle('is-open', !expanded);
          if (!expanded) {
            var firstLink = panel.querySelector('a');
            if (firstLink) firstLink.focus();
          }
        }
        if (e.key === 'Escape') {
          trigger.setAttribute('aria-expanded', 'false');
          item.classList.remove('is-open');
          trigger.focus();
        }
      });

      // Close when focus leaves the entire nav item
      item.addEventListener('focusout', function (e) {
        if (!item.contains(e.relatedTarget)) {
          trigger.setAttribute('aria-expanded', 'false');
          item.classList.remove('is-open');
        }
      });
    });
  }

  /* ============================================================
     Boot
  ============================================================ */
  document.addEventListener('DOMContentLoaded', function () {
    initAnnBar();
    initHeaderScroll();
    initMobileMenu();
    initMegaMenu();
  });

})();
