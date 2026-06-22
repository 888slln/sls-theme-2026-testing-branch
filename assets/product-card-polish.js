(function () {
  var IMAGE_SELECTOR = 'product-card .grid_img img.imgFt';
  var PENDING_CLASS = 'lume-product-img-pending';
  var LOADED_CLASS = 'lume-product-img-loaded';
  var scanQueued = false;

  function markLoaded(img) {
    img.classList.remove(PENDING_CLASS);
    img.classList.add(LOADED_CLASS);
  }

  function prepareImage(img) {
    if (!img || img.dataset.lumeProductImgPolish === 'true') return;

    img.dataset.lumeProductImgPolish = 'true';

    if (img.complete) {
      markLoaded(img);
      return;
    }

    img.classList.add(PENDING_CLASS);
    img.addEventListener('load', function () {
      window.requestAnimationFrame(function () {
        markLoaded(img);
      });
    }, { once: true });
    img.addEventListener('error', function () {
      markLoaded(img);
    }, { once: true });
  }

  function scan(root) {
    Array.prototype.forEach.call((root || document).querySelectorAll(IMAGE_SELECTOR), prepareImage);
  }

  function queueScan() {
    if (scanQueued) return;

    scanQueued = true;
    window.requestAnimationFrame(function () {
      scanQueued = false;
      scan(document);
    });
  }

  function initProductCardPolish() {
    scan(document);

    var observer = new MutationObserver(function (mutations) {
      var hasProductCard = mutations.some(function (mutation) {
        return Array.prototype.some.call(mutation.addedNodes || [], function (node) {
          if (!node || node.nodeType !== 1) return false;

          return (
            node.matches && node.matches('product-card, .grid_img img.imgFt') ||
            node.querySelector && node.querySelector(IMAGE_SELECTOR)
          );
        });
      });

      if (hasProductCard) queueScan();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    document.addEventListener('shopify:section:load', function (event) {
      scan(event.target);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initProductCardPolish);
  } else {
    initProductCardPolish();
  }
})();
