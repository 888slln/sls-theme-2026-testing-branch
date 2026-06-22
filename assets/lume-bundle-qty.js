(function () {
  if (window.__lumeBundleQtyLoaded) {
    if (typeof window.__lumeBundleQtyInit === 'function') {
      window.__lumeBundleQtyInit();
    }
    return;
  }

  window.__lumeBundleQtyLoaded = true;

  const BUNDLE_SELECTOR = '[data-lume-bundle-qty]';
  const OPTION_SELECTOR = '[data-lume-option]';
  const AVADA_CONTAINER_SELECTOR = '.Avada-Bundle-Volume__Container';
  const AVADA_ITEM_SELECTOR = '.Avada-Volume__Item';

  function toInteger(value, fallback) {
    const number = parseInt(value, 10);
    return Number.isFinite(number) ? number : fallback;
  }

  function parseVariants(script) {
    if (!script) return [];

    try {
      const parsed = JSON.parse(script.textContent || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return [];
    }
  }

  function formatMoney(cents, state) {
    const roundedCents = Math.round(cents || 0);

    if (window.theme && theme.Currency && typeof theme.Currency.formatMoney === 'function') {
      return theme.Currency.formatMoney(roundedCents, state.moneyFormat || theme.moneyFormat);
    }

    if (window.Currency && typeof Currency.formatMoney === 'function') {
      return Currency.formatMoney(roundedCents, state.moneyFormat || '${{amount}}');
    }

    try {
      return new Intl.NumberFormat('en-AU', {
        style: 'currency',
        currency: state.currencyCode || 'AUD'
      }).format(roundedCents / 100);
    } catch (error) {
      return '$' + (roundedCents / 100).toFixed(2);
    }
  }

  function addUnique(items, item) {
    if (item && !items.includes(item)) items.push(item);
  }

  function getSection(block) {
    return block.closest('.shopify-section') ||
      block.closest('section') ||
      block.closest('product-info') ||
      document;
  }

  function getProductForm(state) {
    const formId = state.block.dataset.productFormId;
    const section = state.section;

    if (formId) {
      const formById = document.getElementById(formId);
      if (formById && formById.tagName === 'FORM') return formById;
    }

    return state.block.closest('form[action*="/cart/add"]') ||
      section.querySelector('form[action*="/cart/add"]') ||
      section.querySelector('form[data-type="add-to-cart-form"]') ||
      document.querySelector('form[action*="/cart/add"]');
  }

  function getVariantId(state) {
    const form = getProductForm(state);

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

    const urlVariant = new URLSearchParams(window.location.search).get('variant');
    if (urlVariant) return String(urlVariant);

    return state.initialVariantId;
  }

  function getCurrentVariant(state) {
    const id = getVariantId(state);

    if (id) {
      const match = state.variants.find(function (variant) {
        return String(variant.id) === String(id);
      });

      if (match) return match;
    }

    if (state.initialVariantId) {
      const initial = state.variants.find(function (variant) {
        return String(variant.id) === String(state.initialVariantId);
      });

      if (initial) return initial;
    }

    return state.variants.find(function (variant) {
      return variant.available;
    }) || state.variants[0] || null;
  }

  function getDiscountForQty(state, qty) {
    if (qty === 2) return state.discount2;
    if (qty >= 3) return state.discount3;
    return 0;
  }

  function getBundlePricing(state, unitPrice, qty) {
    const normalizedQty = Math.max(1, toInteger(qty, 1));
    const compareTotal = unitPrice * normalizedQty;
    const discount = getDiscountForQty(state, normalizedQty);
    const finalTotal = Math.round((compareTotal * (100 - discount)) / 100);

    return {
      compareTotal: compareTotal,
      finalTotal: finalTotal,
      savedTotal: compareTotal - finalTotal
    };
  }

  function getQtyInputs(state) {
    const inputs = [];
    const form = getProductForm(state);

    if (form) {
      form.querySelectorAll('input[name="quantity"]').forEach(function (input) {
        addUnique(inputs, input);
      });

      if (form.id) {
        document.querySelectorAll('input[name="quantity"][form="' + form.id + '"]').forEach(function (input) {
          addUnique(inputs, input);
        });
      }
    }

    state.section.querySelectorAll('input[name="quantity"]').forEach(function (input) {
      addUnique(inputs, input);
    });

    if (!inputs.length && form) {
      const hidden = document.createElement('input');
      hidden.type = 'hidden';
      hidden.name = 'quantity';
      hidden.value = String(state.selectedQty);
      hidden.defaultValue = String(state.selectedQty);
      form.appendChild(hidden);
      inputs.push(hidden);
    }

    return inputs.filter(function (input) {
      return !input.disabled;
    });
  }

  function normalizeQtyForInputs(qty, inputs) {
    let normalized = Math.max(1, toInteger(qty, 1));
    const input = inputs.find(function (candidate) {
      return candidate.type !== 'hidden';
    }) || inputs[0];

    if (!input) return normalized;

    const min = toInteger(input.getAttribute('min') || input.dataset.min, NaN);

    if (Number.isFinite(min)) normalized = Math.max(normalized, min);

    return Math.max(1, normalized);
  }

  function readQty(state) {
    const inputs = getQtyInputs(state);

    for (const input of inputs) {
      const value = toInteger(input.value, NaN);

      if (Number.isFinite(value) && value > 0) {
        state.selectedQty = normalizeQtyForInputs(value, inputs);
        return state.selectedQty;
      }
    }

    state.selectedQty = normalizeQtyForInputs(state.selectedQty, inputs);
    return state.selectedQty;
  }

  function writeQty(state, qty, dispatchEvents) {
    const inputs = getQtyInputs(state);
    state.selectedQty = normalizeQtyForInputs(qty, inputs);

    inputs.forEach(function (input) {
      const value = String(state.selectedQty);

      if (input.value !== value) {
        input.value = value;
      }

      input.defaultValue = value;
      input.setAttribute('value', value);

      if (dispatchEvents) {
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
  }

  function updateActiveCard(state) {
    const activeQty = state.selectedQty >= 3 ? 3 : state.selectedQty;

    state.optionEls.forEach(function (option) {
      const optionQty = toInteger(option.dataset.lumeQty, 1);
      const active = optionQty === activeQty;

      option.classList.toggle('is-active', active);
      option.setAttribute('aria-checked', active ? 'true' : 'false');
    });
  }

  function updateBundleRows(state) {
    const variant = getCurrentVariant(state);
    if (!variant) return null;

    const unitPrice = toInteger(variant.price, 0);
    const buy3Qty = state.selectedQty > 3 ? state.selectedQty : 3;
    const buy1 = getBundlePricing(state, unitPrice, 1);
    const buy2 = getBundlePricing(state, unitPrice, 2);
    const buy3 = getBundlePricing(state, unitPrice, buy3Qty);
    const selected = getBundlePricing(state, unitPrice, state.selectedQty);

    if (state.els.buy1Price) state.els.buy1Price.textContent = formatMoney(buy1.finalTotal, state);

    if (state.els.buy2Price) state.els.buy2Price.textContent = formatMoney(buy2.finalTotal, state);
    if (state.els.buy2Compare) state.els.buy2Compare.textContent = formatMoney(buy2.compareTotal, state);
    if (state.els.buy2Save) state.els.buy2Save.textContent = 'Save ' + formatMoney(buy2.savedTotal, state);

    if (state.els.buy3Label) state.els.buy3Label.textContent = buy3Qty > 3 ? 'Buy ' + buy3Qty : 'Buy 3';
    if (state.els.buy3Price) state.els.buy3Price.textContent = formatMoney(buy3.finalTotal, state);
    if (state.els.buy3Compare) state.els.buy3Compare.textContent = formatMoney(buy3.compareTotal, state);
    if (state.els.buy3Save) state.els.buy3Save.textContent = 'Save ' + formatMoney(buy3.savedTotal, state);

    state.block.dataset.lumeSelectedQty = String(state.selectedQty);
    state.block.dataset.lumeSelectedTotal = String(selected.finalTotal);
    state.block.dataset.lumeSelectedVariantId = String(variant.id || '');

    return selected;
  }

  function parseAvadaTierQty(item) {
    const target = item.querySelector('.Avada-Volume__Info--TriggerQty') || item;
    const match = (target.textContent || '').match(/Buy\s*(\d+)/i);
    return match ? toInteger(match[1], 0) : 0;
  }

  function syncAvadaTier(state) {
    const tierQty = state.selectedQty >= 3 ? 3 : state.selectedQty;
    const containers = [];

    state.section.querySelectorAll(AVADA_CONTAINER_SELECTOR).forEach(function (container) {
      addUnique(containers, container);
    });

    if (!containers.length) {
      document.querySelectorAll(AVADA_CONTAINER_SELECTOR).forEach(function (container) {
        addUnique(containers, container);
      });
    }

    containers.forEach(function (container) {
      const items = Array.from(container.querySelectorAll(AVADA_ITEM_SELECTOR));
      const target = items.find(function (item) {
        return parseAvadaTierQty(item) === tierQty;
      });

      if (!target) return;

      const selected = target.classList.contains('Avada-Volume__Item--Selected') ||
        target.getAttribute('aria-checked') === 'true';

      if (!selected) {
        target.dispatchEvent(new MouseEvent('click', {
          bubbles: true,
          cancelable: true,
          view: window
        }));
      }
    });
  }

  function updatePointsBanners(state, pricing) {
    if (!pricing) return;

    if (state.pointsUpdateTimer) {
      window.clearTimeout(state.pointsUpdateTimer);
    }

    state.pointsUpdateTimer = null;
    state.block.dataset.lumeSelectedTotal = String(pricing.finalTotal);

    document.dispatchEvent(new CustomEvent('lume:bundle-pricing:change', {
      detail: {
        block: state.block,
        quantity: state.selectedQty,
        total: pricing.finalTotal
      }
    }));
  }

  function requestAtcPriceUpdate() {
    if (typeof window.updateAddToCartPriceFromCurrentState === 'function') {
      window.updateAddToCartPriceFromCurrentState();
    }
  }

  function update(state, options) {
    const opts = options || {};

    if (opts.readQuantity) {
      readQty(state);
    }

    if (opts.writeQuantity) {
      writeQty(state, state.selectedQty, opts.dispatchQuantity);
    }

    updateActiveCard(state);
    const selectedPricing = updateBundleRows(state);

    if (opts.syncAvada !== false) {
      syncAvadaTier(state);
    }

    updatePointsBanners(state, selectedPricing);
    requestAtcPriceUpdate();

    document.dispatchEvent(new CustomEvent('lume:bundle-qty:change', {
      detail: {
        block: state.block,
        quantity: state.selectedQty,
        total: selectedPricing ? selectedPricing.finalTotal : null
      }
    }));
  }

  function scheduleUpdate(state, options, delay) {
    if (state.updateTimer) {
      window.clearTimeout(state.updateTimer);
    }

    state.updateTimer = window.setTimeout(function () {
      state.updateTimer = null;
      update(state, options);
    }, delay || 0);
  }

  function runSettledUpdates(state, options) {
    const opts = options || {};

    state.settleTimers.forEach(function (timer) {
      window.clearTimeout(timer);
    });
    state.settleTimers = [];

    if (state.settleFrame) {
      window.cancelAnimationFrame(state.settleFrame);
      state.settleFrame = null;
    }

    update(state, opts);

    state.settleFrame = window.requestAnimationFrame(function () {
      state.settleFrame = null;
      update(state, Object.assign({}, opts, { dispatchQuantity: false }));
    });

    (opts.settleDelays || [80, 200]).forEach(function (delay) {
      const timer = window.setTimeout(function () {
        state.settleTimers = state.settleTimers.filter(function (activeTimer) {
          return activeTimer !== timer;
        });
        update(state, Object.assign({}, opts, { dispatchQuantity: false }));
      }, delay);

      state.settleTimers.push(timer);
    });
  }

  function ownsQtyInput(state, target) {
    if (!target || !target.matches || !target.matches('input[name="quantity"]')) return false;

    const form = getProductForm(state);
    if (form && form.contains(target)) return true;
    if (form && form.id && target.getAttribute('form') === form.id) return true;

    return state.section.contains(target) &&
      !target.closest('cart-drawer, cart-items, .cart-drawer, .cart');
  }

  function ownsVariantInput(state, target) {
    if (!target || !target.matches) return false;

    const form = getProductForm(state);
    const isVariantInput =
      target.matches('input[name="id"]') ||
      target.matches('select[name="id"]') ||
      target.matches('input[name^="options"]') ||
      target.matches('select[name^="options"]');

    if (!isVariantInput) return false;
    if (form && form.contains(target)) return true;

    return state.section.contains(target);
  }

  function bindFormSubmit(state) {
    const form = getProductForm(state);
    if (!form || form.dataset.lumeBundleSubmitBound === 'true') return;

    form.dataset.lumeBundleSubmitBound = 'true';
    form.addEventListener('submit', function () {
      update(state, {
        readQuantity: true,
        writeQuantity: true,
        dispatchQuantity: true,
        syncAvada: true
      });
    }, true);
  }

  function startShortObserver(state) {
    const target = state.section === document ? document.body : state.section;
    if (!target) return;

    const observer = new MutationObserver(function () {
      bindFormSubmit(state);
      scheduleUpdate(state, {
        readQuantity: false,
        writeQuantity: false,
        dispatchQuantity: false,
        syncAvada: true
      }, 20);
    });

    observer.observe(target, {
      childList: true,
      subtree: true
    });

    window.setTimeout(function () {
      observer.disconnect();
    }, 4000);
  }

  function initBlock(block) {
    if (!block || block.dataset.lumeBundleReady === 'true') return;

    block.dataset.lumeBundleReady = 'true';
    document.documentElement.classList.add('lume-bundle-qty-active');

    const state = {
      block: block,
      section: getSection(block),
      variants: parseVariants(block.querySelector('[data-lume-variants]')),
      discount2: toInteger(block.dataset.discount2, 10),
      discount3: toInteger(block.dataset.discount3, 15),
      currencyCode: block.dataset.currencyCode || 'AUD',
      moneyFormat: block.dataset.moneyFormat || '',
      initialVariantId: block.dataset.initialVariantId ? String(block.dataset.initialVariantId) : null,
      selectedQty: 1,
      optionEls: Array.from(block.querySelectorAll(OPTION_SELECTOR)),
      updateTimer: null,
      settleTimers: [],
      settleFrame: null,
      els: {
        buy1Price: block.querySelector('[data-lume-price-buy1]'),
        buy2Price: block.querySelector('[data-lume-price-buy2]'),
        buy2Compare: block.querySelector('[data-lume-compare-buy2]'),
        buy2Save: block.querySelector('[data-lume-save-buy2]'),
        buy3Label: block.querySelector('[data-lume-label-buy3]'),
        buy3Price: block.querySelector('[data-lume-price-buy3]'),
        buy3Compare: block.querySelector('[data-lume-compare-buy3]'),
        buy3Save: block.querySelector('[data-lume-save-buy3]')
      }
    };

    block.__lumeBundleQtyState = state;

    block.addEventListener('click', function (event) {
      const option = event.target.closest(OPTION_SELECTOR);
      if (!option || !block.contains(option)) return;

      state.selectedQty = toInteger(option.dataset.lumeQty, 1);
      runSettledUpdates(state, {
        readQuantity: false,
        writeQuantity: true,
        dispatchQuantity: true,
        syncAvada: true,
        settleDelays: [80, 200]
      });
    });

    block.addEventListener('keydown', function (event) {
      if (event.key !== 'Enter' && event.key !== ' ') return;

      const option = event.target.closest(OPTION_SELECTOR);
      if (!option || !block.contains(option)) return;

      event.preventDefault();
      state.selectedQty = toInteger(option.dataset.lumeQty, 1);
      runSettledUpdates(state, {
        readQuantity: false,
        writeQuantity: true,
        dispatchQuantity: true,
        syncAvada: true,
        settleDelays: [80, 200]
      });
    });

    document.addEventListener('input', function (event) {
      if (!ownsQtyInput(state, event.target)) return;

      state.selectedQty = Math.max(1, toInteger(event.target.value, 1));
      runSettledUpdates(state, {
        readQuantity: false,
        writeQuantity: false,
        dispatchQuantity: false,
        syncAvada: true,
        settleDelays: [80]
      });
    }, true);

    document.addEventListener('change', function (event) {
      if (ownsQtyInput(state, event.target)) {
        state.selectedQty = Math.max(1, toInteger(event.target.value, 1));
        runSettledUpdates(state, {
          readQuantity: false,
          writeQuantity: false,
          dispatchQuantity: false,
          syncAvada: true,
          settleDelays: [80]
        });
        return;
      }

      if (ownsVariantInput(state, event.target) || (event.target && event.target.closest && (
        event.target.closest('variant-selects') ||
        event.target.closest('variant-radios') ||
        event.target.closest('[data-product-form]')
      ))) {
        runSettledUpdates(state, {
          readQuantity: false,
          writeQuantity: true,
          dispatchQuantity: false,
          syncAvada: true,
          settleDelays: [80, 200]
        });
      }
    }, true);

    document.addEventListener('click', function (event) {
      const form = getProductForm(state);
      const button = event.target.closest('button[name="add"], .product-form__submit, [data-add-to-cart]');

      if (button && form && form.contains(button)) {
        update(state, {
          readQuantity: true,
          writeQuantity: true,
          dispatchQuantity: true,
          syncAvada: true
        });
      }
    }, true);

    ['variant:change', 'variantChange', 'variant:changed'].forEach(function (eventName) {
      document.addEventListener(eventName, function () {
        runSettledUpdates(state, {
          readQuantity: false,
          writeQuantity: true,
          dispatchQuantity: false,
          syncAvada: true,
          settleDelays: [80, 200]
        });
      });
    });

    bindFormSubmit(state);

    runSettledUpdates(state, {
      readQuantity: false,
      writeQuantity: true,
      dispatchQuantity: false,
      syncAvada: true,
      settleDelays: [80, 250]
    });

    startShortObserver(state);
  }

  function initAll() {
    document.querySelectorAll(BUNDLE_SELECTOR).forEach(initBlock);
  }

  window.__lumeBundleQtyInit = initAll;
  initAll();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAll);
  }

  window.addEventListener('load', initAll);
  document.addEventListener('shopify:section:load', initAll);
})();
