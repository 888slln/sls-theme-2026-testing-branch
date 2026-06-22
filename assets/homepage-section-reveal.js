(function () {
  var SECTION_SELECTOR = 'body.template-index #PageContainer > .shopify-section';
  var SKIP_SELECTOR = '.scrolTxt';
  var ACTIVE_CLASS = 'home-section-reveal';
  var VISIBLE_CLASS = 'is-visible';
  var CLEANUP_DELAY = 900;
  var observer = null;

  function prefersReducedMotion() {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function cleanup(section) {
    section.classList.remove(ACTIVE_CLASS);
    section.style.removeProperty('--home-section-reveal-delay');
  }

  function reveal(section) {
    if (section.classList.contains(VISIBLE_CLASS)) return;

    section.classList.add(VISIBLE_CLASS);
    window.setTimeout(function () {
      cleanup(section);
    }, CLEANUP_DELAY);
  }

  function isInViewport(section) {
    if (!section || !section.getBoundingClientRect) return false;

    var rect = section.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0 && rect.top < window.innerHeight && rect.bottom > 0;
  }

  function observeSection(section, index) {
    if (
      !section ||
      isFirstHomepageSection(section) ||
      shouldSkipSection(section) ||
      section.classList.contains(ACTIVE_CLASS) ||
      section.classList.contains(VISIBLE_CLASS)
    ) {
      return;
    }

    section.classList.add(ACTIVE_CLASS);
    section.style.setProperty('--home-section-reveal-delay', Math.min(index || 0, 3) * 35 + 'ms');

    if (observer) {
      observer.observe(section);
    } else {
      reveal(section);
    }
  }

  function shouldSkipSection(section) {
    if (!section || !section.matches) return true;

    return (
      section.matches(SKIP_SELECTOR) ||
      String(section.id || '').indexOf('scroling_text') !== -1 ||
      !!section.querySelector('.scrlTxtWrap, .marquee')
    );
  }

  function isFirstHomepageSection(section) {
    return document.querySelector(SECTION_SELECTOR) === section;
  }

  function initHomepageSectionReveal() {
    if (prefersReducedMotion() || !('IntersectionObserver' in window)) return;

    var sections = Array.prototype.slice.call(document.querySelectorAll(SECTION_SELECTOR)).filter(function (section) {
      return !isFirstHomepageSection(section) && !shouldSkipSection(section);
    });
    if (!sections.length) return;

    observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;

        observer.unobserve(entry.target);
        window.requestAnimationFrame(function () {
          reveal(entry.target);
        });
      });
    }, {
      rootMargin: '0px',
      threshold: 0
    });

    var initiallyVisibleSections = [];

    sections.forEach(function (section, index) {
      if (isInViewport(section)) {
        section.classList.add(ACTIVE_CLASS);
        section.style.setProperty('--home-section-reveal-delay', '0ms');
        initiallyVisibleSections.push(section);
      } else {
        observeSection(section, index);
      }
    });

    if (initiallyVisibleSections.length) {
      window.requestAnimationFrame(function () {
        initiallyVisibleSections.forEach(reveal);
      });
    }

    document.addEventListener('shopify:section:load', function (event) {
      if (event.target && event.target.matches && event.target.matches(SECTION_SELECTOR)) {
        if (isInViewport(event.target)) {
          event.target.classList.add(ACTIVE_CLASS);
          event.target.style.setProperty('--home-section-reveal-delay', '0ms');
          window.requestAnimationFrame(function () {
            reveal(event.target);
          });
        } else {
          observeSection(event.target, 0);
        }
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initHomepageSectionReveal);
  } else {
    initHomepageSectionReveal();
  }
})();
