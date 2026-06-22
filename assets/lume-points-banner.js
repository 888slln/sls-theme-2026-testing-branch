(function () {
  if (window.__lumePointsBannerScriptLoaded) {
    if (typeof window.__lumePointsBannerInit === 'function') {
      window.__lumePointsBannerInit();
    }
    return;
  }

  window.__lumePointsBannerScriptLoaded = true;

  const BANNER_SELECTOR = '[data-lume-points-banner]';
  const LUME_BUNDLE_SELECTOR = '.lume-bundle-qty[data-lume-bundle-qty][data-lume-active="true"]';
  const AVADA_SELECTED_SELECTOR = '.Avada-Volume__Item--Selected, .Avada-Volume__Item[aria-checked="true"]';
  const AVADA_PRICE_SELECTOR = '.AOV-Offer__DiscountPrice';

  function toNumber(value, fallback) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  }

  function toPositiveInteger(value, fallback) {
    const number = parseInt(value, 10);
    return Number.isFinite(number) && number > 0 ? number : fallback;
  }

  function parseMoneyToCents(text) {
    if (!text) return 0;

    const cleaned = String(text)
      .replace(/from\s*/ig, '')
      .replace(/[^0-9.,]/g, '')
      .replace(/,/g, '');
    const value = parseFloat(cleaned);

    return Number.isFinite(value) && value > 0 ? Math.round(value * 100) : 0;
  }

  function getScope(banner) {
    return banner.closest('.shopify-section') ||
      banner.closest('product-info') ||
      banner.closest('section') ||
      document;
  }

  function findInScope(scope, selector) {
    if (scope && scope !== document) {
      const scoped = scope.querySelector(selector);
      if (scoped) return scoped;
    }

    return document.querySelector(selector);
  }

  function getProductForm(banner, scope) {
    const formId = banner.dataset.productFormId;

    if (formId) {
      const formById = document.getElementById(formId);
      if (formById && formById.tagName === 'FORM') return formById;
    }

    return findInScope(scope, 'form[action*="/cart/add"], form[data-type="add-to-cart-form"]');
  }

  function readVariants(banner) {
    if (banner.__lumePointsVariants) return banner.__lumePointsVariants;

    const script = banner.querySelector('[data-lume-points-variants]');
    if (!script) {
      banner.__lumePointsVariants = [];
      return banner.__lumePointsVariants;
    }

    try {
      const variants = JSON.parse(script.textContent || '[]');
      banner.__lumePointsVariants = Array.isArray(variants) ? variants : [];
    } catch (error) {
      banner.__lumePointsVariants = [];
    }

    return banner.__lumePointsVariants;
  }

  function getVariantId(banner, scope) {
    const form = getProductForm(banner, scope);

    if (form) {
      const checked = form.querySelector('input[name="id"]:checked');
      if (checked && checked.value) return String(checked.value);

      const select = form.querySelector('select[name="id"]');
      if (select && select.value) return String(select.value);

      const input = form.querySelector('input[name="id"]');
      if (input && input.value) return String(input.value);

      if (form.id) {
        const external =
          document.querySelector('input[name="id"][form="' + form.id + '"]:checked') ||
          document.querySelector('select[name="id"][form="' + form.id + '"]') ||
          document.querySelector('input[name="id"][form="' + form.id + '"]');

        if (external && external.value) return String(external.value);
      }
    }

    return banner.dataset.currentVariantId || '';
  }

  function getVariantPriceCents(banner, scope) {
    const variantId = getVariantId(banner, scope);
    const variants = readVariants(banner);
    const matched = variants.find(function (variant) {
      return String(variant.id) === String(variantId);
    });

    if (matched && Number.isFinite(Number(matched.price))) {
      banner.dataset.currentVariantId = String(matched.id);
      banner.dataset.basePriceCents = String(matched.price);
      return Number(matched.price);
    }

    const storedPrice = toNumber(banner.dataset.basePriceCents, 0);
    if (storedPrice > 0) return storedPrice;

    const priceEl = findInScope(scope, '.price__container .pr_price.price-item.orpr:not(.hide), .pr_price.price-item.orpr:not(.hide), .price__container .sale:not(.hide), .pr_price:not(.hide)');
    return parseMoneyToCents(priceEl ? priceEl.textContent : '');
  }

  function getQuantity(banner, scope) {
    const form = getProductForm(banner, scope);
    const candidates = [];

    if (form) {
      form.querySelectorAll('input[name="quantity"]').forEach(function (input) {
        candidates.push(input);
      });

      if (form.id) {
        document.querySelectorAll('input[name="quantity"][form="' + form.id + '"]').forEach(function (input) {
          candidates.push(input);
        });
      }
    }

    if (scope && scope !== document) {
      scope.querySelectorAll('input[name="quantity"]').forEach(function (input) {
        if (!candidates.includes(input)) candidates.push(input);
      });
    }

    const input = candidates.find(function (candidate) {
      return !candidate.disabled;
    });

    return toPositiveInteger(input ? input.value : '1', 1);
  }

  function getLumeBundleTotalCents(banner, scope, variantId) {
    const bundle = findInScope(scope, LUME_BUNDLE_SELECTOR);
    if (!bundle) return 0;

    const bundleVariantId = bundle.dataset.lumeSelectedVariantId;
    const total = toNumber(bundle.dataset.lumeSelectedTotal, 0);

    if (total <= 0) return 0;
    if (variantId && bundleVariantId && String(bundleVariantId) !== String(variantId)) return 0;

    return Math.round(total);
  }

  function getAvadaBundleTotalCents(scope) {
    const selected = findInScope(scope, AVADA_SELECTED_SELECTOR);
    if (!selected) return 0;

    const priceEl = selected.querySelector(AVADA_PRICE_SELECTOR);
    return parseMoneyToCents(priceEl ? priceEl.textContent : '');
  }

  function getCurrentPriceCents(banner) {
    const scope = getScope(banner);
    const variantId = getVariantId(banner, scope);
    const lumeBundleTotal = getLumeBundleTotalCents(banner, scope, variantId);

    if (lumeBundleTotal > 0) return lumeBundleTotal;

    const avadaBundleTotal = getAvadaBundleTotalCents(scope);
    if (avadaBundleTotal > 0) return avadaBundleTotal;

    return Math.max(0, Math.round(getVariantPriceCents(banner, scope) * getQuantity(banner, scope)));
  }

  function setPoints(banner) {
    const pointsEl = banner.querySelector('[data-lume-points-value], [data-points]');
    if (!pointsEl) return;

    const rate = toNumber(banner.dataset.pointsRate || banner.dataset.ppd, 1);
    const cents = getCurrentPriceCents(banner);
    const nextPoints = Math.max(0, Math.round((cents / 100) * rate));
    const nextText = nextPoints.toLocaleString();

    if (pointsEl.textContent !== nextText) {
      pointsEl.textContent = nextText;
    }
  }

  function queueUpdate(banner) {
    if (banner.__lumePointsFrame) {
      window.cancelAnimationFrame(banner.__lumePointsFrame);
    }

    banner.__lumePointsFrame = window.requestAnimationFrame(function () {
      banner.__lumePointsFrame = null;
      setPoints(banner);
    });
  }

  function initBanner(banner) {
    if (!banner || banner.dataset.lumePointsReady === 'true') return;

    banner.dataset.lumePointsReady = 'true';

    const link = banner.querySelector('.lume-login-link');
    if (link) {
      link.addEventListener('click', function (event) {
        event.preventDefault();
        event.stopPropagation();
        if (event.stopImmediatePropagation) event.stopImmediatePropagation();
        window.location.assign(link.href);
      }, true);
    }

    queueUpdate(banner);
  }

  function initAll() {
    document.querySelectorAll(BANNER_SELECTOR).forEach(initBanner);
  }

  function updateAll() {
    initAll();
    document.querySelectorAll(BANNER_SELECTOR).forEach(queueUpdate);
  }

  function updateFromVariantEvent(event) {
    initAll();

    document.querySelectorAll(BANNER_SELECTOR).forEach(function (banner) {
      const variant = event && event.detail && event.detail.variant;

      if (variant && Number.isFinite(Number(variant.price))) {
        banner.dataset.currentVariantId = String(variant.id || '');
        banner.dataset.basePriceCents = String(variant.price);
      }

      queueUpdate(banner);
    });
  }

  ['variant:change', 'variantChange', 'variant:changed'].forEach(function (eventName) {
    document.addEventListener(eventName, updateFromVariantEvent);
  });

  ['lume:bundle-qty:change', 'lume:bundle-pricing:change'].forEach(function (eventName) {
    document.addEventListener(eventName, updateAll);
  });

  document.addEventListener('input', function (event) {
    if (event.target && event.target.matches && event.target.matches('input[name="quantity"]')) {
      updateAll();
    }
  }, true);

  document.addEventListener('change', function (event) {
    if (!event.target || !event.target.matches) return;

    if (
      event.target.matches('input[name="quantity"], input[name="id"], select[name="id"], input[name^="options"], select[name^="options"]') ||
      event.target.closest('variant-selects, variant-radios, [data-product-form]')
    ) {
      updateAll();
    }
  }, true);

  document.addEventListener('click', function (event) {
    if (!event.target || !event.target.closest) return;

    if (
      event.target.closest('quantity-input .qtyBtn, quantity-input button')
    ) {
      updateAll();
    }
  }, true);

  function isRelevantMutationNode(node) {
    if (!node || node.nodeType !== 1 || !node.matches) return false;

    return node.matches(BANNER_SELECTOR + ', ' + LUME_BUNDLE_SELECTOR + ', .Avada-Bundle-Volume__Container, .Avada-Volume__Item, input[name="quantity"]') ||
      !!node.querySelector(BANNER_SELECTOR + ', ' + LUME_BUNDLE_SELECTOR + ', .Avada-Bundle-Volume__Container, .Avada-Volume__Item, input[name="quantity"]');
  }

  const observer = new MutationObserver(function (mutations) {
    let shouldUpdate = false;

    mutations.forEach(function (mutation) {
      if (mutation.type === 'childList') {
        if (isRelevantMutationNode(mutation.target)) {
          shouldUpdate = true;
          return;
        }

        mutation.addedNodes.forEach(function (node) {
          if (isRelevantMutationNode(node)) shouldUpdate = true;
        });
      }

      if (mutation.type === 'attributes' && mutation.target && mutation.target.matches && (
        mutation.target.matches(LUME_BUNDLE_SELECTOR) ||
        mutation.target.matches('.Avada-Volume__Item')
      )) {
        shouldUpdate = true;
      }
    });

    if (shouldUpdate) updateAll();
  });

  if (document.body) {
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'data-lume-selected-total', 'data-lume-selected-variant-id']
    });
  }

  window.__lumePointsBannerInit = initAll;
  initAll();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAll);
  }

  window.addEventListener('load', updateAll);
  document.addEventListener('shopify:section:load', updateAll);
})();
