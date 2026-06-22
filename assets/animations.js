const SCROLL_CLASSNAME = 'scroll-trigger';
const SCROLL_OFFSCREEN = 'scroll-offscreen';
const SCROLL_ANIMATION_CANCEL_CLASSNAME = 'scroll-trigger--cancel';

function revealScrollTrigger(element, index = 0) {
  element.classList.remove(SCROLL_OFFSCREEN);
  element.classList.remove(SCROLL_ANIMATION_CANCEL_CLASSNAME);
  if (element.hasAttribute('data-cascade')) element.style.setProperty('--animation-order', index);
}

function isScrollTriggerInViewport(element) {
  const rect = element.getBoundingClientRect();
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
  const viewportWidth = window.innerWidth || document.documentElement.clientWidth;
  return rect.bottom >= 0 && rect.right >= 0 && rect.top <= viewportHeight && rect.left <= viewportWidth;
}

function revealVisibleScrollTriggers(rootEl = document) {
  const elements = Array.from(rootEl.getElementsByClassName(SCROLL_CLASSNAME));
  elements.forEach((element, index) => {
    if (isScrollTriggerInViewport(element)) revealScrollTrigger(element, index);
  });
}

// Scroll in animation logic
function onIntersection(elements, observer) {
  elements.forEach((element, index) => {
    if(element.isIntersecting){
      const elementTarget = element.target;
      if(elementTarget.classList.contains(SCROLL_OFFSCREEN)){
        revealScrollTrigger(elementTarget, index);
      }
      observer.unobserve(elementTarget);
    } else {
      element.target.classList.add(SCROLL_OFFSCREEN);
      element.target.classList.remove(SCROLL_ANIMATION_CANCEL_CLASSNAME);
    }
  });
}

function initializeScrollAnimationTrigger(rootEl = document, isDesignModeEvent = false) {
  const animationTriggerElements = Array.from(rootEl.getElementsByClassName(SCROLL_CLASSNAME));
  if (animationTriggerElements.length === 0) return;

  if (isDesignModeEvent) {
    animationTriggerElements.forEach((element) => {
      element.classList.add('design-mode');
    });
    return;
  }

  const observer = new IntersectionObserver(onIntersection, {
    rootMargin: '0px',
  });
  animationTriggerElements.forEach((element, index) => {
    if (isScrollTriggerInViewport(element)) {
      revealScrollTrigger(element, index);
    } else {
      observer.observe(element);
    }
  });
}

function percentageSeen(element) {
  const viewportHeight = window.innerHeight;
  const scrollY = window.scrollY;
  const elementPositionY = element.getBoundingClientRect().top + scrollY;
  const elementHeight = element.offsetHeight;

  if (elementPositionY > scrollY + viewportHeight) {
    // If we haven't reached the image yet
    return 0;
  } else if (elementPositionY + elementHeight < scrollY) {
    // If we've completely scrolled past the image
    return 100;
  }

  // When the image is in the viewport
  const distance = scrollY + viewportHeight - elementPositionY;
  let percentage = distance / ((viewportHeight + elementHeight) / 100);
  return Math.round(percentage);
}

window.addEventListener('DOMContentLoaded', () => {
  initializeScrollAnimationTrigger();
  requestAnimationFrame(() => revealVisibleScrollTriggers());
});
window.addEventListener('load', () => revealVisibleScrollTriggers());
window.addEventListener('pageshow', () => requestAnimationFrame(() => revealVisibleScrollTriggers()));
window.addEventListener('resize', () => requestAnimationFrame(() => revealVisibleScrollTriggers()));

if (Shopify.designMode) {
  document.addEventListener('shopify:section:load', (event) => initializeScrollAnimationTrigger(event.target, true));
  document.addEventListener('shopify:section:reorder', () => initializeScrollAnimationTrigger(document, true));
}
