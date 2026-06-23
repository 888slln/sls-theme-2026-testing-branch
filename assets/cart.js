class VariantSelects extends HTMLElement {
  constructor() {
    super();
    this.addEventListener('change', this.onVariantChange);
  }

  onVariantChange(event) {
    this.updateOptions();
    this.updateMasterId();
    this.updateSelectedSwatchValue(event);
    this.removeErrorMessage();
    this.updateVariantStatuses();

    if(!this.currentVariant) {
      this.toggleAddButton(true, '', true);
      this.setUnavailable();
    } else {
      //this.toggleAddButton(false, '', false);
      this.updateMedia();
      this.updateURL();
      this.updateVariantInput();
      this.renderProductInfo();
      this.updateShareUrl();
    }
  }

  updateOptions(){
    this.options = Array.from(this.querySelectorAll('select, fieldset'), (element) => {
      if(element.tagName === 'SELECT') {
        return element.value;
      }
      if(element.tagName === 'FIELDSET') {
        return Array.from(element.querySelectorAll('input')).find((radio) => radio.checked)?.value;
      }
    });
  }

  updateMasterId() {
    this.currentVariant = this.getVariantData().find((variant) => {
      return !variant.options.map((option, index) => {
          return this.options[index] === option;
      }).includes(false);
    });
  }

  updateSelectedSwatchValue({ target }) {
    const { name, value, tagName } = target;
    if(tagName === 'SELECT' && target.selectedOptions.length) {
      const selectedSwatchValue = this.querySelector(`[data-opt="${name}"]`);
      if(selectedSwatchValue) selectedSwatchValue.innerHTML = value;
    } else if(tagName === 'INPUT' && target.type === 'radio') {
      const selectedSwatchValue = this.querySelector(`[data-opt="${name}"]`);
      if(selectedSwatchValue) selectedSwatchValue.innerHTML = value;
    }
  }

  updateMedia(){
    if(!this.currentVariant) return;
    if(!this.currentVariant.featured_media) return;

    const mediaGalleries = document.querySelectorAll(`[id^="MediaGallery-${this.dataset.section}"]`);
     mediaGalleries.forEach((mediaGallery) => {
       var activeSl = mediaGallery.querySelector('.primgSlider .swiper-slide-active'),
         crmedia = 0;
       if(activeSl) crmedia = activeSl.dataset.id;
       if(crmedia != `${this.currentVariant.featured_media.id}` || Shopify.designMode){
          mediaGallery.setActiveMedia(`${this.currentVariant.featured_media.id}`, true);
       }
     });
  }

  updateURL(){
    if(!this.currentVariant || this.dataset.updateUrl === 'false') return;
    window.history.replaceState({}, '', `${this.dataset.url}?variant=${this.currentVariant.id}`);
  }

  updateShareUrl(){
    const shareButton = document.getElementById(`Share-${this.dataset.section}`);
    if(!shareButton || !shareButton.updateUrl) return;
    shareButton.updateUrl(`${window.shopUrl}${this.dataset.url}?variant=${this.currentVariant.id}`);
  }

  updateVariantInput(){
    const productForms = document.querySelectorAll(`#product-form-${this.dataset.section}, #product-form-installment-${this.dataset.section}`);
    productForms.forEach((productForm) => {
      const input = productForm.querySelector('input[name="id"]');
      input.value = this.currentVariant.id;
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });
    const BackInStock = document.querySelector(`#backInStock-${this.dataset.section}`);
    if(BackInStock) BackInStock.checkBackinstock(this.currentVariant);
    if(window.SLSRezNotifySync) window.SLSRezNotifySync(this.currentVariant);
  }

  updateVariantStatuses() {
    const selectedOptionOneVariants = this.variantData.filter(
      (variant) => this.querySelector(':checked').value === variant.option1
    );
    const inputWrappers = [...this.querySelectorAll('.product-form__input')];
    inputWrappers.forEach((option, index) => {
      if(index === 0) return;
      const optionInputs = [...option.querySelectorAll('input[type="radio"], option')];
      const previousOptionSelected = inputWrappers[index - 1].querySelector(':checked').value;
      const availableOptionInputsValue = selectedOptionOneVariants.filter((variant) => variant.available && variant[`option${index}`] === previousOptionSelected).map((variantOption) => variantOption[`option${index + 1}`]);
      this.setInputAvailability(optionInputs, availableOptionInputsValue);
    });
  }

  setInputAvailability(elementList, availableValuesList) {
    elementList.forEach((element) => {
      const value = element.getAttribute('value');
      const availableElement = availableValuesList.includes(value);

      if(element.tagName === 'INPUT') {
        element.classList.toggle('disabled', !availableElement);
      } else if(element.tagName === 'OPTION') {
        element.classList.toggle('disabled', !availableElement);
      }
    });
  }

  removeErrorMessage() {
    const section = this.closest('section');
    if(!section) return;
    const productForm = section.querySelector('product-form');
    if(productForm) productForm.handleErrorMessage();
  }

  renderProductInfo(){
    const requestedVariantId = this.currentVariant.id;
    const sectionId = this.dataset.originalSection ? this.dataset.originalSection : this.dataset.section;

    document.querySelectorAll("#stickyOptions option").forEach((option) => {
      if(option.value === this.currentVariant.title) option.selected = true;
    });

    fetch(`${this.dataset.url}?variant=${requestedVariantId}&section_id=${this.dataset.originalSection ? this.dataset.originalSection : this.dataset.section}`)
      .then((response) => response.text()).then((responseText) => {
        // prevent unnecessary ui changes from abandoned selections
        if(this.currentVariant.id !== requestedVariantId) return;

        const html = new DOMParser().parseFromString(responseText, 'text/html');
        const destination = document.getElementById(`price-${this.dataset.section}`);
        const source = html.getElementById(`price-${this.dataset.originalSection ? this.dataset.originalSection : this.dataset.section}`);
        const skuSource = html.getElementById(`Sku-${this.dataset.originalSection ? this.dataset.originalSection : this.dataset.section}`);
        const skuDestination = document.getElementById(`Sku-${this.dataset.section}`);
        const inventorySource = html.getElementById(`Inventory-${this.dataset.originalSection ? this.dataset.originalSection : this.dataset.section}`);
        const inventoryDestination = document.getElementById(`Inventory-${this.dataset.section}`);
        const volumePricingSource = html.getElementById(`Volume-${this.dataset.originalSection ? this.dataset.originalSection : this.dataset.section}`);
        const pricePerItemDestination = document.getElementById(`Price-Per-Item-${this.dataset.section}`);
        const pricePerItemSource = html.getElementById(`Price-Per-Item-${this.dataset.originalSection ? this.dataset.originalSection : this.dataset.section}`);
        const volumePricingDestination = document.getElementById(`Volume-${this.dataset.section}`);
        const qtyRules = document.getElementById(`Quantity-Rules-${this.dataset.section}`);
        const volumeNote = document.getElementById(`Volume-Note-${this.dataset.section}`),
          stickyData = document.querySelector('sticky-cart .stickyData'),
          stickyDataSource = html.querySelector('sticky-cart .stickyData');

        if(volumeNote) volumeNote.classList.remove('hidden');
        if(volumePricingDestination) volumePricingDestination.classList.remove('hidden');
        if(qtyRules) qtyRules.classList.remove('hidden');

        if(source && destination) destination.innerHTML = source.innerHTML;
        if(inventorySource && inventoryDestination) inventoryDestination.innerHTML = inventorySource.innerHTML;
        if(skuSource && skuDestination) {
          skuDestination.innerHTML = skuSource.innerHTML;
          skuDestination.classList.toggle('hidden', skuSource.classList.contains('hidden'));
        }

        if(volumePricingSource && volumePricingDestination) {
          volumePricingDestination.innerHTML = volumePricingSource.innerHTML;
        }

        if(pricePerItemSource && pricePerItemDestination) {
          pricePerItemDestination.innerHTML = pricePerItemSource.innerHTML;
          pricePerItemDestination.classList.toggle('hidden', pricePerItemSource.classList.contains('hidden'));
        }

        const price = document.getElementById(`price-${this.dataset.section}`);
        if(price) price.classList.remove('hidden');

        if(inventoryDestination) inventoryDestination.classList.toggle('hidden', inventorySource.innerText === '');

        if(stickyData && stickyDataSource) stickyData.innerHTML = stickyDataSource.innerHTML;

        const addButtonUpdated = html.getElementById(`ProductSubmitButton-${sectionId}`);
        this.toggleAddButton(addButtonUpdated ? addButtonUpdated.hasAttribute('disabled') : true, window.variantStrings.soldOut);

        if(theme.mlcurrency) currenciesChange(document.querySelectorAll('product-info span.money, .stPrice span.money'));

        publish(PUB_SUB_EVENTS.variantChange, {
          data: { sectionId, html, variant: this.currentVariant, },
        });
      });
  }

toggleAddButton(disable = false, text, modifyClass = true) {
  const productForm = document.getElementById(`product-form-${this.dataset.section}`);
  if (!productForm) return;

  const addButton = productForm.querySelector('[name="add"]');
  const addButtonText =
    productForm.querySelector('[name="add"] .txt') ||
    productForm.querySelector('[name="add"] > span:not(.lume-atc-existing-content)') ||
    productForm.querySelector('[name="add"] > .lume-atc-existing-content');
  if (!addButton || !addButtonText) return;

  if (disable) {
    addButton.setAttribute('disabled', 'disabled');
    if (text) addButtonText.textContent = text; // sold out / unavailable = no price
  } else {
    addButton.removeAttribute('disabled');

    var vr = `data-v${this.currentVariant.id}`,
        qtyWrap = document.querySelector('.prvQty'),
        qty = qtyWrap ? qtyWrap.getAttribute(vr) : 1;

    if (qty < 1 && this.currentVariant.inventory_management == "shopify") {
      addButtonText.textContent = window.variantStrings.preOrder; // no price
    } else if (typeof window.updateAddToCartPriceFromCurrentState === 'function') {
      window.updateAddToCartPriceFromCurrentState(addButton);
    }
  }

  if (!modifyClass) return;
}

  setUnavailable() {
    const button = document.getElementById(`product-form-${this.dataset.section}`);
    const addButton = button.querySelector('[name="add"]');
    const addButtonText =
      button.querySelector('[name="add"] .txt') ||
      button.querySelector('[name="add"] > span:not(.lume-atc-existing-content)') ||
      button.querySelector('[name="add"] > .lume-atc-existing-content');
    const price = document.getElementById(`price-${this.dataset.section}`);
    const inventory = document.getElementById(`Inventory-${this.dataset.section}`);
    const sku = document.getElementById(`Sku-${this.dataset.section}`);
    const pricePerItem = document.getElementById(`Price-Per-Item-${this.dataset.section}`);
    const volumeNote = document.getElementById(`Volume-Note-${this.dataset.section}`);
    const volumeTable = document.getElementById(`Volume-${this.dataset.section}`);
    const qtyRules = document.getElementById(`Quantity-Rules-${this.dataset.section}`);

    if(!addButton) return;
    addButtonText.textContent = window.variantStrings.unavailable;
    if(window.SLSRezNotifySync) window.SLSRezNotifySync(false);
    if(price) price.classList.add('hidden');
    if(inventory) inventory.classList.add('hidden');
    if(sku) sku.classList.add('hidden');
    if(pricePerItem) pricePerItem.classList.add('hidden');
    if(volumeNote) volumeNote.classList.add('hidden');
    if(volumeTable) volumeTable.classList.add('hidden');
    if(qtyRules) qtyRules.classList.add('hidden');
  }

  getVariantData() {
    this.variantData = this.variantData || JSON.parse(this.querySelector('[type="application/json"]').textContent);
    return this.variantData;
  }
}
if(!customElements.get('variant-selects')) customElements.define('variant-selects', VariantSelects);

if(!customElements.get('product-info')) {
  customElements.define('product-info', class ProductInfo extends HTMLElement {
      constructor() {
        super();
        this.input = this.querySelector('.quantity__input');
        this.currentVariant = this.querySelector('.product-variant-id');
        this.submitButton = this.querySelector('[type="submit"]');
      }

      cartUpdateUnsubscriber = undefined;
      variantChangeUnsubscriber = undefined;

      connectedCallback() {
        if(!this.input) return;
        this.quantityForm = this.querySelector('.product-form__quantity');
        if(!this.quantityForm) return;
        this.setQuantityBoundries();
        if(!this.dataset.originalSection) {
          this.cartUpdateUnsubscriber = subscribe(PUB_SUB_EVENTS.cartUpdate, this.fetchQuantityRules.bind(this));
        }
        this.variantChangeUnsubscriber = subscribe(PUB_SUB_EVENTS.variantChange, (event) => {
          const sectionId = this.dataset.originalSection ? this.dataset.originalSection : this.dataset.section;
          if(event.data.sectionId !== sectionId) return;
          this.updateQuantityRules(event.data.sectionId, event.data.html);
          this.setQuantityBoundries();
        });
      }

      disconnectedCallback() {
        if(this.cartUpdateUnsubscriber) {
          this.cartUpdateUnsubscriber();
        }
        if(this.variantChangeUnsubscriber) {
          this.variantChangeUnsubscriber();
        }
      }

      setQuantityBoundries() {
        const data = {
          cartQuantity: this.input.dataset.cartQuantity ? parseInt(this.input.dataset.cartQuantity) : 0,
          min: this.input.dataset.min ? parseInt(this.input.dataset.min) : 1,
          max: this.input.dataset.max ? parseInt(this.input.dataset.max) : null,
          step: this.input.step ? parseInt(this.input.step) : 1,
        };

        let min = data.min;
        const max = data.max === null ? data.max : data.max - data.cartQuantity;
        if(max !== null) min = Math.min(min, max);
        if(data.cartQuantity >= data.min) min = Math.min(min, data.step);

        this.input.min = min;
        this.input.max = max;
        this.input.value = min;
        publish(PUB_SUB_EVENTS.quantityUpdate, undefined);
      }

      fetchQuantityRules() {
        if(!this.currentVariant || !this.currentVariant.value) return;
        this.querySelector('.quantity__rules-cart .loading__spinner').classList.remove('hidden');
        fetch(`${this.dataset.url}?variant=${this.currentVariant.value}&section_id=${this.dataset.section}`)
          .then((response) => {
            return response.text();
          })
          .then((responseText) => {
            const html = new DOMParser().parseFromString(responseText, 'text/html');
            this.updateQuantityRules(this.dataset.section, html);
            this.setQuantityBoundries();
          })
          .catch((e) => {
            console.error(e);
          })
          .finally(() => {
            this.querySelector('.quantity__rules-cart .loading__spinner').classList.add('hidden');
          });
      }

      updateQuantityRules(sectionId, html) {
        const quantityFormUpdated = html.getElementById(`Quantity-Form-${sectionId}`);
        const selectors = ['.quantity__input', '.quantity__rules', '.quantity__label'];
        for (let selector of selectors) {
          const current = this.quantityForm.querySelector(selector);
          const updated = quantityFormUpdated.querySelector(selector);
          if(!current || !updated) continue;
          if(selector === '.quantity__input') {
            const attributes = ['data-cart-quantity', 'data-min', 'data-max', 'step'];
            for (let attribute of attributes) {
              const valueUpdated = updated.getAttribute(attribute);
              if(valueUpdated !== null) current.setAttribute(attribute, valueUpdated);
            }
          } else {
            current.innerHTML = updated.innerHTML;
          }
        }
      }
    }
  );
}

class QuantityInput extends HTMLElement {
  constructor() {
    super();
    this.input = this.querySelector('input');
    this.changeEvent = new Event('change', { bubbles: true });
    this.qtyAnimationTimer = null;
    this.qtyAnimationFrame = null;
    this.lastQuantityValue = this.getQuantityValue();

    this.classList.add('lume-qty-enhanced');

    if(!this.input) return;

    this.input.addEventListener('change', this.onInputChange.bind(this));
    this.input.addEventListener('focusin', () => {
      this.lastQuantityValue = this.getQuantityValue();
    });
    this.querySelectorAll('button').forEach((button) =>
      button.addEventListener('click', this.onButtonClick.bind(this))
    );
  }

  quantityUpdateUnsubscriber = undefined;

  connectedCallback() {
    this.validateQtyRules();
    this.quantityUpdateUnsubscriber = subscribe(PUB_SUB_EVENTS.quantityUpdate, this.validateQtyRules.bind(this));
  }

  disconnectedCallback() {
    if(this.quantityUpdateUnsubscriber) {
      this.quantityUpdateUnsubscriber();
    }
    clearTimeout(this.qtyAnimationTimer);
    if(this.qtyAnimationFrame) cancelAnimationFrame(this.qtyAnimationFrame);
  }

  onInputChange(event) {
    const currentValue = this.getQuantityValue();
    this.animateQuantityChange(this.lastQuantityValue, currentValue);
    this.lastQuantityValue = currentValue;
    this.validateQtyRules();
  }

  onButtonClick(event) {
    event.preventDefault();
    const previousValue = this.input.value;

    event.currentTarget.name === 'plus' ? this.input.stepUp() : this.input.stepDown();
    if(previousValue !== this.input.value) {
      this.animateQuantityChange(previousValue, this.input.value);
      this.lastQuantityValue = this.getQuantityValue();
      this.input.dispatchEvent(this.changeEvent);
    }
  }

  getQuantityValue() {
    if(!this.input) return null;

    const value = parseFloat(this.input.value);
    return Number.isFinite(value) ? value : null;
  }

  animateQuantityChange(previousValue, currentValue) {
    const previous = parseFloat(previousValue);
    const current = parseFloat(currentValue);

    if(!Number.isFinite(previous) || !Number.isFinite(current) || previous === current) return;

    const animationClass = current > previous ? 'is-qty-increase' : 'is-qty-decrease';

    clearTimeout(this.qtyAnimationTimer);
    if(this.qtyAnimationFrame) cancelAnimationFrame(this.qtyAnimationFrame);

    this.classList.remove('is-qty-increase', 'is-qty-decrease');

    this.qtyAnimationFrame = requestAnimationFrame(() => {
      this.classList.add(animationClass);

      this.qtyAnimationTimer = setTimeout(() => {
        this.classList.remove('is-qty-increase', 'is-qty-decrease');
        this.qtyAnimationFrame = null;
      }, 220);
    });
  }

  validateQtyRules() {
    if(!this.input) return;

    const value = parseInt(this.input.value);
    if(this.input.min) {
      const min = parseInt(this.input.min);
      const buttonMinus = this.querySelector(".qtyBtn[name='minus']");
      if(buttonMinus) buttonMinus.classList.toggle('disabled', value <= min);
    }
    if(this.input.max) {
      const max = parseInt(this.input.max);
      const buttonPlus = this.querySelector(".qtyBtn[name='plus']");
      if(buttonPlus) buttonPlus.classList.toggle('disabled', value >= max);
    }
  }
}
if(!customElements.get('quantity-input')) customElements.define('quantity-input', QuantityInput);

function initMainProductQuantityProtection() {
  const forms = document.querySelectorAll('product-form form[action*="/cart/add"], form[data-type="add-to-cart-form"]');

  forms.forEach((form) => {
    if(form.dataset.lumeMainQuantityProtected === 'true') return;

    const buttons = form.querySelector('.product-form__buttons');
    if(!buttons) return;

    const seedPicker =
      buttons.querySelector('[data-main-product-quantity]') ||
      form.querySelector('[data-main-product-quantity]');
    const template = form.querySelector('template[data-main-product-quantity-template]');
    const templatePicker = template ? template.content.querySelector('[data-main-product-quantity]') : null;
    const pickerSource = seedPicker || templatePicker;

    if(!pickerSource) return;

    form.dataset.lumeMainQuantityProtected = 'true';

    const pickerTemplate = pickerSource.cloneNode(true);
    let queued = false;
    let lastKnownQuantity = null;

    function getMainQuantityValue(preferRememberedQuantity = false) {
      const formInput = form.querySelector('input[name="quantity"]');
      const stickyInput = document.querySelector('sticky-cart [data-sticky-qty-input]');
      const formValue = parseInt(formInput?.value, 10);
      const stickyValue = parseInt(stickyInput?.value, 10);

      if(preferRememberedQuantity && Number.isFinite(lastKnownQuantity) && lastKnownQuantity > 0) return lastKnownQuantity;
      if(Number.isFinite(formValue) && formValue > 0) return formValue;
      if(Number.isFinite(stickyValue) && stickyValue > 0) return stickyValue;
      if(Number.isFinite(lastKnownQuantity) && lastKnownQuantity > 0) return lastKnownQuantity;

      return 1;
    }

    function setImportantStyle(element, property, value) {
      if(
        element.style.getPropertyValue(property) === value &&
        element.style.getPropertyPriority(property) === 'important'
      ) {
        return;
      }

      element.style.setProperty(property, value, 'important');
    }

    function revealElement(element, displayValue) {
      if(!element) return;

      if(element.hidden) element.hidden = false;
      if(element.hasAttribute('hidden')) element.removeAttribute('hidden');
      if(element.classList.contains('hide')) element.classList.remove('hide');
      if(element.classList.contains('hidden')) element.classList.remove('hidden');

      setImportantStyle(element, 'display', displayValue);
      setImportantStyle(element, 'visibility', 'visible');
      setImportantStyle(element, 'opacity', '1');
    }

    function preparePicker(picker, preferRememberedQuantity = false) {
      revealElement(picker, 'inline-flex');
      picker.setAttribute('data-main-product-quantity', '');

      const input = picker.querySelector('input[name="quantity"]');
      if(!input) return;

      if(input.disabled) input.disabled = false;
      if(input.hasAttribute('disabled')) input.removeAttribute('disabled');
      if(input.hasAttribute('max')) input.removeAttribute('max');
      if(input.hasAttribute('data-max')) input.removeAttribute('data-max');

      const quantity = getMainQuantityValue(preferRememberedQuantity);
      const quantityValue = String(quantity);
      lastKnownQuantity = quantity;

      if(input.value !== quantityValue) input.value = quantityValue;
      if(input.defaultValue !== quantityValue) input.defaultValue = quantityValue;
      if(input.getAttribute('value') !== quantityValue) input.setAttribute('value', quantityValue);
    }

    function getQuantityRow() {
      let row = buttons.querySelector('[data-main-product-quantity-row]');
      const submitButton = buttons.querySelector('button[name="add"], .product-form__submit, [type="submit"]');

      if(!row) {
        row = document.createElement('div');
        row.className = 'fl f-aic gap mb15';
        row.setAttribute('data-main-product-quantity-row', '');
        row.style.setProperty('--gap', '10px');

        if(submitButton) {
          buttons.insertBefore(row, submitButton);
          row.appendChild(submitButton);
        } else {
          buttons.insertBefore(row, buttons.firstChild);
        }
      } else if(submitButton && submitButton.parentElement === buttons) {
        row.appendChild(submitButton);
      }

      revealElement(row, 'flex');
      return row;
    }

    function restoreQuantityPicker() {
      queued = false;

      const row = getQuantityRow();
      let picker = row.querySelector('[data-main-product-quantity]') || buttons.querySelector('[data-main-product-quantity]');
      let pickerWasRestored = false;

      if(!picker) {
        picker = pickerTemplate.cloneNode(true);
        pickerWasRestored = true;
        const submitButton = row.querySelector('button[name="add"], .product-form__submit, [type="submit"]') ||
          buttons.querySelector('button[name="add"], .product-form__submit, [type="submit"]');

        if(submitButton && submitButton.parentElement === row) {
          row.insertBefore(picker, submitButton);
        } else {
          row.insertBefore(picker, row.firstChild);
        }
      } else if(picker.parentElement !== row) {
        row.insertBefore(picker, row.firstChild);
      }

      preparePicker(picker, pickerWasRestored);
    }

    function queueRestore() {
      if(queued) return;
      queued = true;
      requestAnimationFrame(restoreQuantityPicker);
    }

    restoreQuantityPicker();

    form.addEventListener('input', (event) => {
      if(!event.target?.matches?.('input[name="quantity"]')) return;

      const value = parseInt(event.target.value, 10);
      if(Number.isFinite(value) && value > 0) lastKnownQuantity = value;
    }, true);

    form.addEventListener('change', (event) => {
      if(!event.target?.matches?.('input[name="quantity"]')) return;

      const value = parseInt(event.target.value, 10);
      if(Number.isFinite(value) && value > 0) lastKnownQuantity = value;
    }, true);

    const observer = new MutationObserver(queueRestore);
    observer.observe(form, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style', 'hidden', 'disabled']
    });

    [120, 400, 1000, 2500].forEach((delay) => {
      setTimeout(queueRestore, delay);
    });
  });
}

if(document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initMainProductQuantityProtection);
} else {
  initMainProductQuantityProtection();
}

document.addEventListener('shopify:section:load', initMainProductQuantityProtection);

function debounce(fn, wait) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(this, args), wait);
  };
}

function removeTrapFocus(elementToFocus = null){
  document.removeEventListener('focusin', trapFocusHandlers.focusin);
  document.removeEventListener('focusout', trapFocusHandlers.focusout);
  document.removeEventListener('keydown', trapFocusHandlers.keydown);

  if(elementToFocus) elementToFocus.focus();
}

const trapFocusHandlers = {};
function trapFocus(container, elementToFocus = container) {
  var elements = getFocusableElements(container);
  var first = elements[0];
  var last = elements[elements.length - 1];

  removeTrapFocus();

  trapFocusHandlers.focusin = (e) => {
    if(e.target !== container && e.target !== last && e.target !== first) return;
    document.addEventListener('keydown', trapFocusHandlers.keydown);
  };

  trapFocusHandlers.focusout = function() {
    document.removeEventListener('keydown', trapFocusHandlers.keydown);
  };

  trapFocusHandlers.keydown = function(e) {
    if(e.code.toUpperCase() !== 'TAB') return; // If not TAB key
    // On the last focusable element and tab forward, focus the first element.
    if(e.target === last && !e.shiftKey) {
      e.preventDefault();
      first.focus();
    }
    //  On the first focusable element and tab backward, focus the last element.
    if((e.target === container || e.target === first) && e.shiftKey){
      e.preventDefault();
      last.focus();
    }
  };
  document.addEventListener('focusout', trapFocusHandlers.focusout);
  document.addEventListener('focusin', trapFocusHandlers.focusin);
  elementToFocus.focus();
}

function createLumeAtcStatusIcon() {
  const wrapper = document.createElement('span');
  wrapper.className = 'lume-atc-status';
  wrapper.setAttribute('aria-hidden', 'true');
  wrapper.innerHTML = `
    <svg class="lume-atc-loader" width="30" height="30" viewBox="0 0 24 24" fill="none">
      <circle class="lume-atc-loader-track" cx="12" cy="12" r="8"></circle>
      <circle class="lume-atc-loader-line" cx="12" cy="12" r="8"></circle>
      <path class="lume-atc-check" d="M8.25 12.35L10.65 14.75L15.85 9.65"></path>
    </svg>
  `;
  return wrapper;
}

function prepareLumeAtcLoadingTarget(target) {
  if(!target || !target.classList) return null;
  if(target.classList.contains('lume-atc-animated')) return target;

  target.classList.add('lume-atc-animated');

  const existingContent = document.createElement('span');
  existingContent.className = 'lume-atc-existing-content';

  Array.from(target.childNodes).forEach((node) => {
    if(node.nodeType === Node.ELEMENT_NODE && node.classList.contains('lume-atc-status')) return;
    existingContent.appendChild(node);
  });

  target.appendChild(existingContent);
  target.appendChild(createLumeAtcStatusIcon());
  return target;
}

function startLumeAtcLoading(target) {
  const control = prepareLumeAtcLoadingTarget(target);
  if(!control) return null;

  control.classList.remove('is-success');
  control.classList.add('is-loading');
  control.setAttribute('aria-busy', 'true');
  return control;
}

function finishLumeAtcLoading(target) {
  if(!target || !target.classList) return;

  target.classList.remove('is-loading');
  target.classList.add('is-success');
  target.removeAttribute('aria-busy');
  window.setTimeout(() => {
    target.classList.remove('is-success');
  }, 520);
}

function resetLumeAtcLoading(target) {
  if(!target || !target.classList) return;
  target.classList.remove('is-loading', 'is-success');
  target.removeAttribute('aria-busy');
}

window.lumeCartStartLoading = startLumeAtcLoading;
window.lumeCartFinishLoading = finishLumeAtcLoading;
window.lumeCartResetLoading = resetLumeAtcLoading;

const SLS_CART_THEME_CONFIG_DEFAULTS = {
  pointsPerDollar: 5,
  pointsLabel: 'points',
  behavior: {
    autoOpenOnAdd: true
  },
  show: {
    marquee: true,
    shipping: true,
    countdown: false,
    giftGoal: false,
    rewards: true,
    rewardsBar: true,
    recommendations: true,
    coupon: true,
    orderNote: true
  },
  emptyShow: {
    marquee: true,
    shipping: true,
    countdown: false,
    giftGoal: false,
    rewards: false,
    rewardsBar: false,
    recommendations: false,
    coupon: false,
    orderNote: false
  },
  layout: {
    font: 'inherit',
    drawerWidth: 430,
    cardRadius: 24,
    buttonRadius: 50,
    imageRadius: 4,
    imageBorder: 0,
    itemSurface: 'card',
    loaderSize: 24,
    loaderGap: 8
  },
  typography: {
    textCase: 'none',
    marqueeTextCase: 'uppercase',
    recommendHeadingSize: 12,
    recommendTitleSize: 13,
    recommendSubtitleSize: 11,
    recommendPriceSize: 12,
    recommendVariantSize: 11,
    recommendAddSize: 11,
    rewardsBarFontSize: 11
  },
  colors: {
    drawerBg: '#FAF9F7',
    cardBg: '#FFFFFF',
    softBg: '#F5F5F5',
    marqueeBg: '#F5F5F5',
    marqueeSeparator: '#CBC4BC',
    topbarBg: '#FFFFFF',
    shippingMessage: '#222222',
    shippingLabels: '#867E73',
    shippingUnlocked: '#867E73',
    progressTrack: '#F5F5F5',
    progressFill: '#867E73',
    countdownBg: '#867E73',
    countdownText: '#FFFFFF',
    giftTrack: '#F5F5F5',
    giftFill: '#ACA39A',
    accent: '#867E73',
    accentHover: '#746C62',
    buttonHoverBg: '#746C62',
    buttonHoverText: '#FFFFFF',
    mid: '#ACA39A',
    text: '#222222',
    muted: '#222222',
    headerBg: '#FFFFFF',
    headerText: '#222222',
    footerBg: '#FFFFFF',
    footerText: '#222222',
    footerBorder: '#EEE9E4',
    itemTitle: '#222222',
    itemVariant: '#222222',
    itemPoints: '#867E73',
    itemPrice: '#222222',
    itemRemove: '#867E73',
    sale: '#C44A4A',
    recCardBg: '#FFFFFF',
    recCardBorder: '#EEE9E4',
    recImageBg: '#FFFFFF',
    recImageBorder: '#EEE9E4',
    recVariantBg: '#FFFFFF',
    recVariantBorder: '#EEE9E4',
    recAddBg: '#867E73',
    recAddText: '#FFFFFF',
    recAddHoverBg: '#746C62',
    recAddHoverText: '#FFFFFF',
    rewardsBarText: '#222222',
    rewardsBarValue: '#867E73',
    border: '#EEE9E4',
    sheetOverlay: 'rgba(44,41,38,.25)'
  },
  emptyButtons: {
    primaryLabel: 'Continue Shopping',
    primaryLink: '/collections/all',
    secondaryLabel: 'Shop Lash Trays',
    secondaryLink: '/collections/lash-trays'
  }
};

let slsCartConfigRaw = null;
let slsCartConfigCache = null;

function isSlsPlainObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}

function mergeSlsCartConfig(base, override) {
  const merged = { ...base };
  if(!isSlsPlainObject(override)) return merged;

  Object.keys(override).forEach((key) => {
    if(isSlsPlainObject(base[key]) && isSlsPlainObject(override[key])) {
      merged[key] = mergeSlsCartConfig(base[key], override[key]);
    } else {
      merged[key] = override[key];
    }
  });

  return merged;
}

function getSlsCartThemeConfig() {
  const settingsScript = document.getElementById('SlsCartControls');
  const raw = settingsScript ? (settingsScript.textContent || '').trim() : '';

  if(raw === slsCartConfigRaw && slsCartConfigCache) return slsCartConfigCache;

  slsCartConfigRaw = raw;
  if(!raw) {
    slsCartConfigCache = { ...SLS_CART_THEME_CONFIG_DEFAULTS };
    return slsCartConfigCache;
  }

  try {
    slsCartConfigCache = mergeSlsCartConfig(SLS_CART_THEME_CONFIG_DEFAULTS, JSON.parse(raw));
  } catch(error) {
    console.error('Studio Lume cart config JSON could not be read. Using safe defaults.', error);
    slsCartConfigCache = { ...SLS_CART_THEME_CONFIG_DEFAULTS };
  }

  return slsCartConfigCache;
}

function getSlsCartControls() {
  const drawer = document.querySelector('cart-drawer[data-sls-points-rate]');
  const drawerRate = Number(drawer?.dataset.slsPointsRate);
  const config = getSlsCartThemeConfig();
  const configRate = Number(config.pointsPerDollar);

  return {
    ...config,
    pointsPerDollar: Number.isFinite(configRate) ? configRate : (Number.isFinite(drawerRate) ? drawerRate : 5),
    pointsLabel: config.pointsLabel || drawer?.dataset.slsPointsLabel || 'points'
  };
}

function hasOpenSlsCartDrawer(excludeDrawer = null) {
  return Array.from(document.querySelectorAll('cart-drawer.sls-native-cart')).some((drawer) => {
    if(excludeDrawer && drawer === excludeDrawer) return false;
    return drawer.classList.contains('active') && drawer.getAttribute('aria-hidden') !== 'true';
  });
}

const slsPageLockState = {
  touchLockBound: false
};

const SLS_CART_SCROLL_LOCK_CLASS = 'sls-cart-scroll-lock';
const SLS_CART_DESKTOP_LOCK_CLASS = 'sls-cart-desktop-scroll-lock';
const SLS_CART_SCROLLBAR_WIDTH_VAR = '--sls-cart-scrollbar-width';

function slsHasActiveDrawerLockContext() {
  return document.querySelector('cart-drawer.sls-native-cart.active[aria-hidden="false"]');
}

function slsAllowDrawerTouchTarget(target, activeDrawer) {
  if(!(target instanceof Element) || !activeDrawer) return false;
  const allowed = target.closest('.sls-cart-main, .sls-cart-sheet__panel, .sls-cart-drawer, .drawer__inner');
  return Boolean(allowed && activeDrawer.contains(allowed));
}

function slsCanScrollInsideDrawer(target, activeDrawer, deltaY) {
  if(!(target instanceof Element) || !activeDrawer) return false;
  const allowed = target.closest('.sls-cart-main, .sls-cart-sheet__panel, .sls-cart-drawer, .drawer__inner');
  if(!allowed || !activeDrawer.contains(allowed)) return false;

  let node = target;
  while(node && node !== activeDrawer) {
    if(node instanceof Element) {
      const style = window.getComputedStyle(node);
      const canScrollY = /(auto|scroll)/.test(style.overflowY) && node.scrollHeight > node.clientHeight;
      if(canScrollY) {
        const atTop = node.scrollTop <= 0;
        const atBottom = node.scrollTop + node.clientHeight >= node.scrollHeight - 1;
        if(deltaY < 0 && !atTop) return true;
        if(deltaY > 0 && !atBottom) return true;
      }
    }
    node = node.parentElement;
  }

  return false;
}

function handleSlsCartGlobalTouchMove(event) {
  const activeDrawer = slsHasActiveDrawerLockContext();
  if(!activeDrawer) return;
  if(slsAllowDrawerTouchTarget(event.target, activeDrawer)) return;
  event.preventDefault();
}

function handleSlsCartGlobalTouchForce(event) {
  const activeDrawer = slsHasActiveDrawerLockContext();
  if(!activeDrawer) return;
  if(slsAllowDrawerTouchTarget(event.target, activeDrawer)) return;
  event.preventDefault();
}

function handleSlsCartGlobalWheel(event) {
  const activeDrawer = slsHasActiveDrawerLockContext();
  if(!activeDrawer) return;
  if(slsCanScrollInsideDrawer(event.target, activeDrawer, event.deltaY || 0)) return;
  event.preventDefault();
}

function bindSlsCartTouchLock() {
  if(slsPageLockState.touchLockBound) return;
  slsPageLockState.touchLockBound = true;
  document.addEventListener('touchmove', handleSlsCartGlobalTouchMove, { passive: false, capture: true });
  document.addEventListener('touchforcechange', handleSlsCartGlobalTouchForce, { passive: false, capture: true });
  document.addEventListener('wheel', handleSlsCartGlobalWheel, { passive: false, capture: true });
}

function unbindSlsCartTouchLock() {
  if(!slsPageLockState.touchLockBound) return;
  slsPageLockState.touchLockBound = false;
  document.removeEventListener('touchmove', handleSlsCartGlobalTouchMove, true);
  document.removeEventListener('touchforcechange', handleSlsCartGlobalTouchForce, true);
  document.removeEventListener('wheel', handleSlsCartGlobalWheel, true);
}

function setSlsCartScrollLock(locked) {
  const docEl = document.documentElement;
  if(!docEl) return;

  if(!locked) {
    docEl.classList.remove(SLS_CART_SCROLL_LOCK_CLASS);
    docEl.classList.remove(SLS_CART_DESKTOP_LOCK_CLASS);
    docEl.style.removeProperty(SLS_CART_SCROLLBAR_WIDTH_VAR);
    return;
  }

  const scrollbarWidth = Math.max(0, window.innerWidth - docEl.clientWidth);
  docEl.style.setProperty(SLS_CART_SCROLLBAR_WIDTH_VAR, `${scrollbarWidth}px`);
  docEl.classList.add(SLS_CART_SCROLL_LOCK_CLASS);
  docEl.classList.add(SLS_CART_DESKTOP_LOCK_CLASS);
}

function setSlsPageScrollLock(locked, sourceDrawer = null) {
  const docEl = document.documentElement;
  const bodyEl = document.body;

  if(locked) {
    setSlsCartScrollLock(true);
    docEl.classList.remove('of_hidden');
    if(bodyEl) bodyEl.classList.remove('of_hidden');
    bindSlsCartTouchLock();
    return;
  }

  if(hasOpenSlsCartDrawer(sourceDrawer)) return;

  setSlsCartScrollLock(false);
  docEl.classList.remove('of_hidden');
  if(!bodyEl) return;

  bodyEl.classList.remove('of_hidden');
  unbindSlsCartTouchLock();
}

window.SLSSetPageScrollLock = setSlsPageScrollLock;

function shouldSlsAutoOpenOnAdd() {
  const controls = getSlsCartControls();
  const fromControls = controls?.behavior?.autoOpenOnAdd;
  if(typeof fromControls === 'boolean') return fromControls;
  if(typeof window.__SLSCartAutoOpenOnAdd === 'boolean') return window.__SLSCartAutoOpenOnAdd;
  return getSlsBoolean(fromControls, true);
}

window.SLSShouldAutoOpenOnAdd = shouldSlsAutoOpenOnAdd;

function markSlsManualCartOpenIntent(ttlMs = 8000) {
  window.__SLSManualCartIntentUntil = Date.now() + Math.max(500, Number(ttlMs) || 8000);
}

function hasSlsManualCartOpenIntent() {
  return Number(window.__SLSManualCartIntentUntil || 0) > Date.now();
}

function clearSlsManualCartOpenIntent() {
  window.__SLSManualCartIntentUntil = 0;
}

window.SLSMarkManualCartOpenIntent = markSlsManualCartOpenIntent;
window.SLSHasManualCartOpenIntent = hasSlsManualCartOpenIntent;
window.SLSClearManualCartOpenIntent = clearSlsManualCartOpenIntent;

function updateSlsCartScrollCue(scope = document) {
  const root = scope || document;
  const scrollAreas = root.matches?.('.sls-cart-main')
    ? [root]
    : Array.from(root.querySelectorAll?.('.sls-cart-main') || []);

  scrollAreas.forEach((area) => {
    const maxScroll = Math.max(0, area.scrollHeight - area.clientHeight);
    const isScrollable = maxScroll > 2;
    const canScrollDown = isScrollable && area.scrollTop < maxScroll - 2;
    const canScrollUp = isScrollable && area.scrollTop > 2;

    area.classList.toggle('sls-cart-main--scrollable', isScrollable);
    area.classList.toggle('sls-cart-main--can-scroll-down', canScrollDown);
    area.classList.toggle('sls-cart-main--can-scroll-up', canScrollUp);
  });
}

window.SLSUpdateCartScrollCue = updateSlsCartScrollCue;

function isSlsManualCartTrigger(trigger) {
  if(!trigger || trigger.nodeType !== 1) return false;

  const selector = '[data-sls-cart-trigger], #cartLink, a.cartOpen';
  if(trigger.matches?.(selector)) return true;
  if(trigger.closest?.(selector)) return true;

  if(trigger.tagName === 'A') {
    const href = trigger.getAttribute('href') || '';
    if(href === '#cart-drawer') return true;
  }

  return false;
}

window.SLSIsManualCartTrigger = isSlsManualCartTrigger;

function getSlsNumber(value, fallback, min, max) {
  const number = Number(value);
  if(!Number.isFinite(number)) return fallback;
  if(typeof min === 'number' && number < min) return min;
  if(typeof max === 'number' && number > max) return max;
  return number;
}

function getSlsBoolean(value, fallback) {
  if(typeof value === 'boolean') return value;
  if(typeof value === 'string') return value.toLowerCase() !== 'false';
  return fallback;
}

function getSlsString(value, fallback = '') {
  return typeof value === 'string' ? value : fallback;
}

function getSlsTextCase(value) {
  const allowed = ['none', 'uppercase', 'lowercase', 'capitalize'];
  const normalized = getSlsString(value, 'none').toLowerCase();
  return allowed.includes(normalized) ? normalized : 'none';
}

function setSlsStyleVar(drawer, name, value, suffix = '') {
  if(value === undefined || value === null || value === '') return;
  drawer.style.setProperty(name, `${value}${suffix}`);
}

function getSlsDrawerItemCount(drawer) {
  if(!drawer) return 0;

  const renderedItems = drawer.querySelectorAll('.sls-cart-items .sls-cart-item').length;
  const countText = drawer.querySelector('[data-cart-render="item_count"]')?.textContent || '';
  const countMatch = countText.match(/\d+/);
  if(countMatch) {
    const parsed = Number.parseInt(countMatch[0], 10);
    if(Number.isFinite(parsed)) return (parsed === 0 && renderedItems > 0) ? renderedItems : parsed;
  }

  if(Number.isFinite(renderedItems) && renderedItems >= 0) return renderedItems;

  return drawer.classList.contains('is-empty') ? 0 : 1;
}

function getSlsDrawerLineItems(drawer) {
  if(!drawer) return [];
  return Array.from(drawer.querySelectorAll('.sls-cart-items .sls-cart-item'));
}

function getSlsDrawerQuantityCount(drawer) {
  const lineItems = getSlsDrawerLineItems(drawer);
  if(lineItems.length === 0) return 0;

  const quantityInputs = drawer.querySelectorAll('.sls-cart-items .quantity__input[name="updates[]"]');
  if(quantityInputs.length === 0) return lineItems.length;

  let total = 0;
  quantityInputs.forEach((input) => {
    const parsed = Number.parseInt(input.value || input.getAttribute('value') || input.defaultValue || '', 10);
    if(Number.isFinite(parsed) && parsed > 0) total += parsed;
  });

  return total > 0 ? total : lineItems.length;
}

function updateSlsDrawerCountBadge(drawer, itemCount) {
  if(!drawer || !Number.isFinite(itemCount)) return;
  const countBadge = drawer.querySelector('.sls-cart-count[data-cart-render="item_count"]');
  const mobileCount = drawer.querySelector('[data-cart-render="item_count_mobile"]');

  const safeCount = Math.max(0, itemCount);
  const nextText = `${safeCount} ${safeCount === 1 ? 'item' : 'items'}`;

  if(countBadge && (countBadge.textContent || '').trim() !== nextText) {
    countBadge.textContent = nextText;
  }

  if(mobileCount && (mobileCount.textContent || '').trim() !== String(safeCount)) {
    mobileCount.textContent = String(safeCount);
  }
}

function updateSlsCartIconBubbleCount(itemCount) {
  if(!Number.isFinite(itemCount)) return;
  const bubble = document.getElementById('cart-icon-bubble');
  if(!bubble) return;

  const safeCount = Math.max(0, itemCount);
  if((bubble.textContent || '').trim() !== String(safeCount)) {
    bubble.textContent = String(safeCount);
  }
}

function syncSlsDrawerEmptyState(drawer, isEmpty) {
  if(!drawer) return;

  drawer.classList.toggle('is-empty', isEmpty);
  drawer.querySelector('#CartDrawer')?.classList.toggle('is-empty', isEmpty);
  drawer.querySelector('.sls-cart-shell')?.classList.toggle('is-empty', isEmpty);
  drawer.querySelector('.drawer__inner')?.classList.toggle('is-empty', isEmpty);

  const emptyBlock = drawer.querySelector('.drawer-empty.sls-cart-empty');
  if(emptyBlock) {
    emptyBlock.hidden = !isEmpty;
    emptyBlock.classList.toggle('hide', !isEmpty);
  }

  const cartItemsWrapper = drawer.querySelector('#CartDrawer-CartItems .drawer__cart-items-wrapper');
  if(cartItemsWrapper) {
    cartItemsWrapper.hidden = isEmpty;
    cartItemsWrapper.classList.toggle('hide', isEmpty);
  }

  const checkoutButton = drawer.querySelector('#CartDrawer-Checkout');
  if(checkoutButton && isEmpty) checkoutButton.setAttribute('disabled', 'disabled');
}

function runSlsCartIntegrityCheck(drawer) {
  if(!drawer) return;

  const lineItems = getSlsDrawerLineItems(drawer).length;
  const quantityCount = getSlsDrawerQuantityCount(drawer);
  const authoritativeCount = Math.max(lineItems, quantityCount, 0);
  const shouldBeEmpty = authoritativeCount <= 0;

  syncSlsDrawerEmptyState(drawer, shouldBeEmpty);
  updateSlsDrawerCountBadge(drawer, authoritativeCount);
  updateSlsCartIconBubbleCount(authoritativeCount);
}

function ensureSlsEmptyButton(actions, selector, className) {
  let button = actions.querySelector(selector);
  if(button) return button;

  button = document.createElement('a');
  button.className = className;
  actions.appendChild(button);
  return button;
}

function applySlsEmptyButtons(drawer, config) {
  const actions = drawer.querySelector('.sls-cart-empty__actions');
  if(!actions) return;

  const emptyButtons = config.emptyButtons || {};
  const primaryLabel = getSlsString(emptyButtons.primaryLabel, 'Continue Shopping').trim();
  const primaryLink = getSlsString(emptyButtons.primaryLink, '/collections/all').trim() || '/collections/all';
  const secondaryLabel = getSlsString(emptyButtons.secondaryLabel, '').trim();
  const secondaryLink = getSlsString(emptyButtons.secondaryLink, '').trim() || '#';

  const primary = ensureSlsEmptyButton(actions, '.sls-cart-empty__btn:not(.sls-cart-empty__btn--secondary)', 'sls-cart-empty__btn');
  primary.textContent = primaryLabel;
  primary.setAttribute('href', primaryLink);
  primary.hidden = !primaryLabel;

  const secondary = ensureSlsEmptyButton(actions, '.sls-cart-empty__btn--secondary', 'sls-cart-empty__btn sls-cart-empty__btn--secondary');
  secondary.textContent = secondaryLabel;
  secondary.setAttribute('href', secondaryLink);
  secondary.hidden = !secondaryLabel;

  actions.hidden = !primaryLabel && !secondaryLabel;
}

function updateSlsCartNoteTool(drawer, noteOverride) {
  if(!drawer) return;
  const noteToolLabel = drawer.querySelector('.sls-cart-tool[href="#cartNote"] span');
  if(!noteToolLabel) return;

  const noteField = drawer.querySelector('#CartDrawer-Note');
  const noteValue = typeof noteOverride === 'string' ? noteOverride : (noteField?.value || '');
  noteToolLabel.textContent = noteValue.trim() ? 'Note Added' : 'Order Note';
  drawer.classList.toggle('sls-order-note-tip-has-note', Boolean(noteValue.trim()));
}

const slsOrderNoteTipText = [
  'Not picking up soon? Let us know when.',
  'Need us to hold your order? Add a note here.',
  'Any special requests? Pop them in your order note.',
  'Picking up later than usual? Let us know.',
  'Need something packed separately? Add a quick note.',
  'Want us to know anything before packing? Leave it here.'
];
const slsOrderNoteTipState = new WeakMap();

function getSlsOrderNoteValue(drawer) {
  return drawer?.querySelector?.('#CartDrawer-Note')?.value || '';
}

function hasSlsOrderNoteValue(drawer) {
  const noteValue = getSlsOrderNoteValue(drawer).trim();
  if(noteValue) return true;

  const noteToolLabel = drawer?.querySelector?.('.sls-cart-tool[href="#cartNote"] span');
  return noteToolLabel?.textContent?.trim()?.toLowerCase() === 'note added';
}

function ensureSlsOrderNoteTip(drawer) {
  const noteButton = drawer?.querySelector?.('.sls-cart-tool[href="#cartNote"]');
  if(!drawer || !noteButton) return null;

  let anchor = noteButton.closest('.sls-order-note-tip-anchor');
  if(!anchor) {
    anchor = document.createElement('div');
    anchor.className = 'sls-order-note-tip-anchor';
    noteButton.parentNode?.insertBefore(anchor, noteButton);
    anchor.appendChild(noteButton);
  }

  let tip = anchor.querySelector('[data-sls-order-note-tip]');
  if(!tip) {
    tip = document.createElement('div');
    tip.className = 'sls-order-note-tip';
    tip.setAttribute('data-sls-order-note-tip', '');
    tip.setAttribute('role', 'tooltip');
    tip.setAttribute('aria-hidden', 'true');

    const tipText = document.createElement('span');
    tipText.className = 'sls-order-note-tip__text';
    tipText.setAttribute('data-sls-order-note-tip-text', '');
    tipText.textContent = slsOrderNoteTipText[0];
    tip.appendChild(tipText);

    anchor.insertBefore(tip, noteButton);
  }

  return { tip, noteButton };
}

function hideSlsOrderNoteTip(drawer, dismiss = false) {
  const tip = drawer?.querySelector?.('[data-sls-order-note-tip]');
  const state = drawer ? slsOrderNoteTipState.get(drawer) : null;
  if(state?.timer) {
    window.clearInterval(state.timer);
    state.timer = null;
  }
  if(state?.showTimer) {
    window.clearTimeout(state.showTimer);
    state.showTimer = null;
  }
  if(tip) {
    tip.classList.remove('is-visible', 'is-changing');
    tip.setAttribute('aria-hidden', 'true');
  }
  drawer?.classList?.remove('sls-order-note-tip-visible');
  drawer?.classList?.toggle('sls-order-note-tip-dismissed', Boolean(dismiss));
}

function setSlsOrderNoteTipText(drawer, index, animate = true) {
  const tip = drawer?.querySelector?.('[data-sls-order-note-tip]');
  const text = tip?.querySelector?.('[data-sls-order-note-tip-text]');
  if(!tip || !text) return;

  const nextText = slsOrderNoteTipText[index % slsOrderNoteTipText.length];
  if(!animate || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
    text.textContent = nextText;
    return;
  }

  tip.classList.add('is-changing');
  window.setTimeout(() => {
    text.textContent = nextText;
    tip.classList.remove('is-changing');
  }, 180);
}

function showSlsOrderNoteTip(drawer) {
  const state = drawer ? slsOrderNoteTipState.get(drawer) : null;
  const ensured = ensureSlsOrderNoteTip(drawer);
  const tip = ensured?.tip;
  const noteButton = ensured?.noteButton;
  if(!drawer || !state || !tip || !noteButton || drawer.getAttribute('aria-hidden') === 'true') return;
  if(drawer.getAttribute('data-sls-show-order-note') === 'false') return;
  if(drawer.classList.contains('is-empty') || hasSlsOrderNoteValue(drawer)) return;

  setSlsOrderNoteTipText(drawer, state.index || 0, false);
  tip.classList.add('is-visible');
  tip.setAttribute('aria-hidden', 'false');
  drawer.classList.remove('sls-order-note-tip-dismissed');
  drawer.classList.add('sls-order-note-tip-visible');

  if(state.timer) window.clearInterval(state.timer);
  state.timer = window.setInterval(() => {
    if(drawer.getAttribute('aria-hidden') === 'true' || drawer.querySelector('#cartNote.active') || hasSlsOrderNoteValue(drawer)) {
      hideSlsOrderNoteTip(drawer);
      return;
    }
    state.index = ((state.index || 0) + 1) % slsOrderNoteTipText.length;
    setSlsOrderNoteTipText(drawer, state.index, true);
  }, 4500);
}

function initSlsOrderNoteTip(drawer) {
  if(!drawer) return;
  const tips = drawer.querySelectorAll('[data-sls-order-note-tip]');
  tips.forEach((tip, index) => {
    if(index > 0) tip.remove();
  });

  const ensured = ensureSlsOrderNoteTip(drawer);
  const tip = ensured?.tip;
  const noteButton = ensured?.noteButton;
  const noteField = drawer.querySelector('#CartDrawer-Note');
  if(!tip || !noteButton) return;

  let state = slsOrderNoteTipState.get(drawer);
  if(!state) {
    state = { index: 0, timer: null, showTimer: null };
    slsOrderNoteTipState.set(drawer, state);
  }

  if(!tip.id) tip.id = `sls-order-note-tip-${Math.random().toString(36).slice(2, 9)}`;
  noteButton.setAttribute('aria-describedby', tip.id);

  if(noteButton.dataset.slsOrderNoteTipBound !== 'true') {
    noteButton.dataset.slsOrderNoteTipBound = 'true';
    noteButton.addEventListener('click', () => hideSlsOrderNoteTip(drawer, true));
    noteButton.addEventListener('focus', () => {
      if(drawer.getAttribute('aria-hidden') === 'false' && !hasSlsOrderNoteValue(drawer)) showSlsOrderNoteTip(drawer);
    });
    noteButton.addEventListener('blur', () => {
      if(drawer.getAttribute('aria-hidden') === 'false' && !drawer.classList.contains('active')) hideSlsOrderNoteTip(drawer);
    });
  }

  if(noteField && noteField.dataset.slsOrderNoteTipBound !== 'true') {
    noteField.dataset.slsOrderNoteTipBound = 'true';
    noteField.addEventListener('focus', () => hideSlsOrderNoteTip(drawer, true));
    noteField.addEventListener('input', () => hideSlsOrderNoteTip(drawer, true));
  }

  if(hasSlsOrderNoteValue(drawer)) hideSlsOrderNoteTip(drawer);
  else if(drawer.classList.contains('active') && drawer.getAttribute('aria-hidden') === 'false' && !drawer.querySelector('#cartNote.active')) {
    showSlsOrderNoteTip(drawer);
  }
}

const slsWalletObservers = new WeakMap();

function isSlsIosDevice() {
  const ua = navigator.userAgent || '';
  const platform = navigator.platform || '';
  const touchMac = platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  return /iPad|iPhone|iPod/i.test(ua) || touchMac;
}

function isSlsAndroidDevice() {
  return /Android/i.test(navigator.userAgent || '');
}

if(isSlsIosDevice()) {
  document.documentElement.classList.add('sls-ios');
}

function getSlsWalletElements(container, walletType) {
  if(!container) return [];

  const selectors = walletType === 'apple'
    ? [
        '[data-testid="ApplePay-button"]',
        '[aria-label*="Apple Pay" i]',
        '[title*="Apple Pay" i]',
        'iframe[src*="applepay" i]',
        'iframe[src*="apple-pay" i]'
      ]
    : [
        '[data-testid="GooglePay-button"]',
        '[aria-label*="Google Pay" i]',
        '[title*="Google Pay" i]',
        'iframe[src*="googlepay" i]',
        'iframe[src*="google-pay" i]'
      ];

  const nodes = [];
  selectors.forEach((selector) => {
    container.querySelectorAll(selector).forEach((node) => {
      if(!nodes.includes(node)) nodes.push(node);
    });
  });

  return nodes;
}

function getSlsWalletBlock(node) {
  if(!node) return null;
  return node.closest('li') || node.closest('[data-testid]') || node;
}

function toggleSlsWalletHidden(nodes, shouldHide) {
  nodes.forEach((node) => {
    const target = getSlsWalletBlock(node);
    if(!target) return;
    target.classList.toggle('sls-wallet-hidden', shouldHide);
    if(shouldHide) target.setAttribute('aria-hidden', 'true');
    else target.removeAttribute('aria-hidden');
  });
}

function enforceSlsWalletHorizontalLayout(drawer) {
  if(!drawer) return;
  const container = drawer.querySelector('.sls-cart-flex-payments__buttons');
  if(!container) return;

  container.classList.remove('additional-checkout-buttons--vertical');
  container.querySelectorAll('.additional-checkout-buttons--vertical').forEach((node) => {
    node.classList.remove('additional-checkout-buttons--vertical');
  });
  container.style.setProperty('--shopify-accelerated-checkout-inline-alignment', 'space-between');
  container.style.setProperty('--shopify-accelerated-checkout-button-inline-size', '40px');
  container.style.setProperty('--shopify-accelerated-checkout-row-gap', '6px');

  const hosts = container.querySelectorAll('shopify-accelerated-checkout-cart');
  if(!hosts.length) return;

  hosts.forEach((host) => {
    host.style.setProperty('--shopify-accelerated-checkout-button-inline-size', '40px');
    host.style.setProperty('--shopify-accelerated-checkout-inline-alignment', 'space-between');
    host.style.setProperty('--shopify-accelerated-checkout-row-gap', '6px');
  });
}

function applySlsWalletPlatformPreference(drawer) {
  if(!drawer) return;
  const container = drawer.querySelector('.sls-cart-flex-payments__buttons');
  if(!container) return;

  enforceSlsWalletHorizontalLayout(drawer);

  const appleNodes = getSlsWalletElements(container, 'apple');
  const googleNodes = getSlsWalletElements(container, 'google');
  if(!appleNodes.length && !googleNodes.length) return;

  toggleSlsWalletHidden(appleNodes, false);
  toggleSlsWalletHidden(googleNodes, false);

  if(!appleNodes.length || !googleNodes.length) return;

  if(isSlsIosDevice()) {
    toggleSlsWalletHidden(googleNodes, true);
    return;
  }

  if(isSlsAndroidDevice()) {
    toggleSlsWalletHidden(appleNodes, true);
  }
}

function bindSlsWalletPreferenceObserver(drawer) {
  if(!window.MutationObserver || !drawer) return;

  const container = drawer.querySelector('.sls-cart-flex-payments__buttons');
  const existing = slsWalletObservers.get(drawer);

  if(existing && existing.container === container) return;
  if(existing) {
    existing.observer.disconnect();
    if(existing.onResize) window.removeEventListener('resize', existing.onResize);
  }
  if(!container) {
    slsWalletObservers.delete(drawer);
    return;
  }

  let queued = false;
  const observer = new MutationObserver(() => {
    if(queued) return;
    queued = true;
    window.requestAnimationFrame(() => {
      queued = false;
      applySlsWalletPlatformPreference(drawer);
    });
  });

  observer.observe(container, { childList: true, subtree: true, attributes: true });
  slsWalletObservers.set(drawer, { observer, container });

  const onResize = () => enforceSlsWalletHorizontalLayout(drawer);
  window.addEventListener('resize', onResize, { passive: true });
  slsWalletObservers.get(drawer).onResize = onResize;
}

function applySlsCartThemeConfig(scope = document) {
  const config = getSlsCartThemeConfig();
  const root = scope && scope.nodeType === 1 ? scope : document;
  const drawers = [];

  if(root.matches?.('cart-drawer')) drawers.push(root);
  root.querySelectorAll?.('cart-drawer').forEach((drawer) => drawers.push(drawer));

  drawers.forEach((drawer) => {
    const layout = config.layout || {};
    const typography = config.typography || {};
    const colors = config.colors || {};
    const pointsPerDollar = getSlsNumber(config.pointsPerDollar, 5, 0, 1000);
    const pointsLabel = getSlsString(config.pointsLabel, 'points') || 'points';
    const textCase = getSlsTextCase(typography.textCase);
    const marqueeTextCase = getSlsTextCase(typography.marqueeTextCase || 'uppercase');
    const shippingTextCase = getSlsTextCase(typography.shippingTextCase || 'uppercase');
    const shippingMessageSpacing = getSlsNumber(typography.shippingMessageSpacing, 7, 0, 20);
    const itemSurface = getSlsString(layout.itemSurface, drawer.dataset.slsItemSurface || 'card').toLowerCase();
    const itemCount = getSlsDrawerItemCount(drawer);
    const isEmpty = itemCount === 0;
    const featureConfig = isEmpty ? (config.emptyShow || {}) : (config.show || {});

    drawer.classList.toggle('is-empty', isEmpty);
    drawer.querySelector('#CartDrawer')?.classList.toggle('is-empty', isEmpty);
    drawer.querySelector('.sls-cart-shell')?.classList.toggle('is-empty', isEmpty);

    drawer.dataset.slsPointsRate = String(pointsPerDollar);
    drawer.dataset.slsPointsLabel = pointsLabel;
    drawer.dataset.slsItemSurface = ['card', 'subtle', 'divider', 'none'].includes(itemSurface) ? itemSurface : 'card';

    [
      ['marquee', 'data-sls-show-marquee'],
      ['shipping', 'data-sls-show-shipping'],
      ['countdown', 'data-sls-show-countdown'],
      ['giftGoal', 'data-sls-show-gift-goal'],
      ['rewards', 'data-sls-show-rewards'],
      ['rewardsBar', 'data-sls-show-rewards-bar'],
      ['recommendations', 'data-sls-show-recommendations'],
      ['coupon', 'data-sls-show-coupon'],
      ['orderNote', 'data-sls-show-order-note']
    ].forEach(([key, attribute]) => {
      const current = drawer.getAttribute(attribute) !== 'false';
      drawer.setAttribute(attribute, getSlsBoolean(featureConfig[key], current) ? 'true' : 'false');
    });

    setSlsStyleVar(drawer, '--sls-cart-font', getSlsString(layout.font, 'inherit') || 'inherit');
    setSlsStyleVar(drawer, '--sls-cart-width', getSlsNumber(layout.drawerWidth, 430, 320, 720), 'px');
    setSlsStyleVar(drawer, '--sls-cart-card-radius', getSlsNumber(layout.cardRadius, 24, 0, 40), 'px');
    setSlsStyleVar(drawer, '--sls-cart-button-radius', getSlsNumber(layout.buttonRadius, 50, 0, 60), 'px');
    setSlsStyleVar(drawer, '--sls-cart-image-radius', getSlsNumber(layout.imageRadius, 4, 0, 32), 'px');
    setSlsStyleVar(drawer, '--sls-cart-image-border-width', getSlsNumber(layout.imageBorder, 0, 0, 4), 'px');
    setSlsStyleVar(drawer, '--sls-cart-loader-size', getSlsNumber(layout.loaderSize, 24, 12, 44), 'px');
    setSlsStyleVar(drawer, '--sls-cart-loader-gap', getSlsNumber(layout.loaderGap, 8, 0, 24), 'px');
    setSlsStyleVar(drawer, '--sls-cart-text-case', textCase);
    setSlsStyleVar(drawer, '--sls-cart-text-case-upper', textCase === 'none' ? 'uppercase' : textCase);
    setSlsStyleVar(drawer, '--sls-marquee-case', marqueeTextCase === 'none' ? 'uppercase' : marqueeTextCase);
    setSlsStyleVar(drawer, '--sls-shipping-case', shippingTextCase);
    setSlsStyleVar(drawer, '--sls-shipping-message-spacing', (shippingMessageSpacing * 0.01).toFixed(2), 'em');
    setSlsStyleVar(drawer, '--sls-rec-heading-size', getSlsNumber(typography.recommendHeadingSize, 12, 10, 24), 'px');
    setSlsStyleVar(drawer, '--sls-rec-title-size', getSlsNumber(typography.recommendTitleSize, 13, 10, 26), 'px');
    setSlsStyleVar(drawer, '--sls-rec-subtitle-size', getSlsNumber(typography.recommendSubtitleSize, 11, 9, 22), 'px');
    setSlsStyleVar(drawer, '--sls-rec-price-size', getSlsNumber(typography.recommendPriceSize, 12, 10, 24), 'px');
    setSlsStyleVar(drawer, '--sls-rec-variant-size', getSlsNumber(typography.recommendVariantSize, 11, 9, 22), 'px');
    setSlsStyleVar(drawer, '--sls-rec-add-size', getSlsNumber(typography.recommendAddSize, 11, 9, 18), 'px');
    setSlsStyleVar(drawer, '--sls-rewards-font-size', getSlsNumber(typography.rewardsBarFontSize, 11, 10, 16), 'px');

    setSlsStyleVar(drawer, '--sls-cart-bg', getSlsString(colors.drawerBg, '#FAF9F7'));
    setSlsStyleVar(drawer, '--sls-cart-card-bg', getSlsString(colors.cardBg, '#FFFFFF'));
    setSlsStyleVar(drawer, '--sls-cart-soft-bg', getSlsString(colors.softBg, '#F5F5F5'));
    setSlsStyleVar(drawer, '--sls-marquee-bg', getSlsString(colors.marqueeBg, getSlsString(colors.softBg, '#F5F5F5')));
    setSlsStyleVar(drawer, '--sls-marquee-sep', getSlsString(colors.marqueeSeparator, '#CBC4BC'));
    setSlsStyleVar(drawer, '--sls-topbar-bg', getSlsString(colors.topbarBg, getSlsString(colors.cardBg, '#FFFFFF')));
    setSlsStyleVar(drawer, '--sls-shipping-message', getSlsString(colors.shippingMessage, getSlsString(colors.text, '#222222')));
    setSlsStyleVar(drawer, '--sls-shipping-labels', getSlsString(colors.shippingLabels, getSlsString(colors.accent, '#867E73')));
    setSlsStyleVar(drawer, '--sls-shipping-unlocked', getSlsString(colors.shippingUnlocked, getSlsString(colors.progressFill, getSlsString(colors.accent, '#867E73'))));
    setSlsStyleVar(drawer, '--sls-progress-track', getSlsString(colors.progressTrack, getSlsString(colors.softBg, '#F5F5F5')));
    setSlsStyleVar(drawer, '--sls-progress-fill', getSlsString(colors.progressFill, getSlsString(colors.accent, '#867E73')));
    setSlsStyleVar(drawer, '--sls-countdown-bg', getSlsString(colors.countdownBg, getSlsString(colors.accent, '#867E73')));
    setSlsStyleVar(drawer, '--sls-countdown-text', getSlsString(colors.countdownText, '#FFFFFF'));
    setSlsStyleVar(drawer, '--sls-gift-track', getSlsString(colors.giftTrack, getSlsString(colors.softBg, '#F5F5F5')));
    setSlsStyleVar(drawer, '--sls-gift-fill', getSlsString(colors.giftFill, getSlsString(colors.mid, '#ACA39A')));
    setSlsStyleVar(drawer, '--sls-cart-accent', getSlsString(colors.accent, '#867E73'));
    setSlsStyleVar(drawer, '--sls-cart-accent-hover', getSlsString(colors.accentHover, '#746C62'));
    setSlsStyleVar(drawer, '--sls-marquee-text', getSlsString(colors.marqueeText, getSlsString(colors.accent, '#867E73')));
    setSlsStyleVar(drawer, '--sls-btn-hover-bg', getSlsString(colors.buttonHoverBg, getSlsString(colors.accentHover, '#746C62')));
    setSlsStyleVar(drawer, '--sls-btn-hover-text', getSlsString(colors.buttonHoverText, '#FFFFFF'));
    setSlsStyleVar(drawer, '--sls-cart-mid', getSlsString(colors.mid, '#ACA39A'));
    setSlsStyleVar(drawer, '--sls-cart-text', getSlsString(colors.text, '#222222'));
    setSlsStyleVar(drawer, '--sls-cart-muted', getSlsString(colors.muted, '#222222'));
    setSlsStyleVar(drawer, '--sls-header-bg', getSlsString(colors.headerBg, getSlsString(colors.cardBg, '#FFFFFF')));
    setSlsStyleVar(drawer, '--sls-header-text', getSlsString(colors.headerText, getSlsString(colors.text, '#222222')));
    setSlsStyleVar(drawer, '--sls-footer-bg', getSlsString(colors.footerBg, getSlsString(colors.cardBg, '#FFFFFF')));
    setSlsStyleVar(drawer, '--sls-footer-text', getSlsString(colors.footerText, getSlsString(colors.text, '#222222')));
    setSlsStyleVar(drawer, '--sls-footer-border', getSlsString(colors.footerBorder, getSlsString(colors.border, '#EEE9E4')));
    setSlsStyleVar(drawer, '--sls-item-title', getSlsString(colors.itemTitle, getSlsString(colors.text, '#222222')));
    setSlsStyleVar(drawer, '--sls-item-variant', getSlsString(colors.itemVariant, getSlsString(colors.muted, '#222222')));
    setSlsStyleVar(drawer, '--sls-item-points', getSlsString(colors.itemPoints, getSlsString(colors.accent, '#867E73')));
    setSlsStyleVar(drawer, '--sls-item-price', getSlsString(colors.itemPrice, getSlsString(colors.text, '#222222')));
    setSlsStyleVar(drawer, '--sls-item-remove', getSlsString(colors.itemRemove, getSlsString(colors.accent, '#867E73')));
    setSlsStyleVar(drawer, '--sls-sale-color', getSlsString(colors.sale, '#C44A4A'));
    setSlsStyleVar(drawer, '--sls-rec-card-bg', getSlsString(colors.recCardBg, getSlsString(colors.cardBg, '#FFFFFF')));
    setSlsStyleVar(drawer, '--sls-rec-card-border', getSlsString(colors.recCardBorder, getSlsString(colors.border, '#EEE9E4')));
    setSlsStyleVar(drawer, '--sls-rec-image-bg', getSlsString(colors.recImageBg, '#FFFFFF'));
    setSlsStyleVar(drawer, '--sls-rec-image-border', getSlsString(colors.recImageBorder, getSlsString(colors.border, '#EEE9E4')));
    setSlsStyleVar(drawer, '--sls-rec-variant-bg', getSlsString(colors.recVariantBg, '#FFFFFF'));
    setSlsStyleVar(drawer, '--sls-rec-variant-border', getSlsString(colors.recVariantBorder, getSlsString(colors.border, '#EEE9E4')));
    setSlsStyleVar(drawer, '--sls-rec-add-bg', getSlsString(colors.recAddBg, getSlsString(colors.accent, '#867E73')));
    setSlsStyleVar(drawer, '--sls-rec-add-text', getSlsString(colors.recAddText, '#FFFFFF'));
    setSlsStyleVar(drawer, '--sls-rec-add-hover-bg', getSlsString(colors.recAddHoverBg, getSlsString(colors.buttonHoverBg, getSlsString(colors.accentHover, '#746C62'))));
    setSlsStyleVar(drawer, '--sls-rec-add-hover-text', getSlsString(colors.recAddHoverText, getSlsString(colors.buttonHoverText, '#FFFFFF')));
    setSlsStyleVar(drawer, '--sls-rewards-bar-text', getSlsString(colors.rewardsBarText, getSlsString(colors.footerText, getSlsString(colors.text, '#222222'))));
    setSlsStyleVar(drawer, '--sls-rewards-bar-value', getSlsString(colors.rewardsBarValue, getSlsString(colors.accent, '#867E73')));
    setSlsStyleVar(drawer, '--sls-cart-border', getSlsString(colors.border, '#EEE9E4'));
    setSlsStyleVar(drawer, '--sls-cart-sheet-overlay', getSlsString(colors.sheetOverlay, 'rgba(44,41,38,.25)'));

    applySlsEmptyButtons(drawer, config);
    updateSlsCartPoints(drawer);
    updateSlsCartNoteTool(drawer);
    initSlsOrderNoteTip(drawer);
    applySlsWalletPlatformPreference(drawer);
    bindSlsWalletPreferenceObserver(drawer);
    runSlsCartIntegrityCheck(drawer);
  });
}

function updateSlsCartPoints(scope = document) {
  const controls = getSlsCartControls();
  const pointsPerDollar = Number(controls.pointsPerDollar);
  const rate = Number.isFinite(pointsPerDollar) ? pointsPerDollar : 5;
  const label = controls.pointsLabel || 'points';

  scope.querySelectorAll('[data-sls-points-price]').forEach((element) => {
    const cents = Number(element.dataset.slsPointsPrice || 0);
    const points = Math.max(0, Math.floor((cents / 100) * rate));
    element.textContent = `+${points.toLocaleString()} ${label}`;
  });
}

window.slsUpdateCartPoints = updateSlsCartPoints;
window.SLSApplyCartThemeConfig = applySlsCartThemeConfig;

if(document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => applySlsCartThemeConfig());
} else {
  applySlsCartThemeConfig();
}

document.addEventListener('shopify:section:load', (event) => applySlsCartThemeConfig(event.target));
document.addEventListener('sls:cart-note-updated', (event) => {
  const note = typeof event?.detail?.note === 'string' ? event.detail.note : '';
  document.querySelectorAll('cart-drawer').forEach((drawer) => updateSlsCartNoteTool(drawer, note));
});

if(window.MutationObserver) {
  let slsApplyQueued = false;
  new MutationObserver((mutations) => {
    if(slsApplyQueued) return;
    if(!mutations.some((mutation) => Array.prototype.some.call(mutation.addedNodes, (node) => node.nodeType === 1 && (node.matches?.('cart-drawer') || node.querySelector?.('cart-drawer'))))) return;

    slsApplyQueued = true;
    window.requestAnimationFrame(() => {
      slsApplyQueued = false;
      applySlsCartThemeConfig();
    });
  }).observe(document.documentElement, { childList: true, subtree: true });
}

class CartRemoveButton extends HTMLElement {
  constructor() {
    super();
    this.addEventListener('click', (e) => {
      e.preventDefault();
      const cartItems = this.closest('cart-items') || this.closest('cart-drawer-items');
      const lineItem = this.closest('.cart-item, .sls-cart-item');
      const keyedElement = e.target?.closest?.('[data-line-key]');
      const lineKey = this.dataset.lineKey || keyedElement?.dataset?.lineKey || lineItem?.dataset?.lineKey || '';
      const lineIndex = this.dataset.index || lineItem?.id?.match?.(/(\d+)$/)?.[1] || '';

      if(lineKey && typeof cartItems?.queueRemove === 'function') {
        cartItems.queueRemove(lineIndex, lineKey);
      } else if(lineIndex) {
        cartItems?.updateQuantity?.(lineIndex, 0, null, null, lineKey);
      }
    });
  }
}
if(!customElements.get('cart-remove-button')) customElements.define('cart-remove-button', CartRemoveButton);

function parseSlsCartDrawerHtml(html) {
  return new DOMParser().parseFromString(html, 'text/html');
}

function fetchSlsCartDrawerViaSectionsApi() {
  const root = window.Shopify?.routes?.root || '/';
  const separator = root.includes('?') ? '&' : '?';

  return fetch(`${root}${separator}sections=cart-drawer`, { credentials: 'same-origin' })
    .then((response) => {
      if(!response.ok) throw new Error(`Cart drawer sections request failed: ${response.status}`);
      return response.json();
    })
    .then((sections) => {
      if(!sections?.['cart-drawer']) throw new Error('Cart drawer sections response was empty.');
      return parseSlsCartDrawerHtml(sections['cart-drawer']);
    });
}

function fetchCartDrawerSection() {
  return fetchSlsCartDrawerViaSectionsApi();
}

function fetchSlsRenderedSections(sectionIds = []) {
  const ids = Array.from(new Set(sectionIds.filter(Boolean)));
  if(ids.length === 0) return Promise.resolve({});

  const root = window.Shopify?.routes?.root || '/';
  const separator = root.includes('?') ? '&' : '?';
  const encodedIds = ids.map((id) => encodeURIComponent(id)).join(',');

  return fetch(`${root}${separator}sections=${encodedIds}`, { credentials: 'same-origin' })
    .then((response) => {
      if(!response.ok) throw new Error(`Cart sections request failed: ${response.status}`);
      return response.json();
    });
}

function fetchSlsCartJson() {
  const cartUrl = window.routes?.cart_url || '/cart';
  return fetch(`${cartUrl}.js`, { credentials: 'same-origin' })
    .then((response) => {
      if(!response.ok) throw new Error(`Cart JSON request failed: ${response.status}`);
      return response.json();
    });
}

function getSlsCartQuantityForVariant(cart, variantId) {
  const id = String(variantId || '').trim();
  if(!id) return 0;

  return (cart?.items || []).reduce((total, item) => {
    const itemVariantId = item.variant_id || item.id;
    if(String(itemVariantId || '') !== id) return total;
    return total + (lumeParsePositiveQuantity(item.quantity) || 0);
  }, 0);
}

function findSlsCartProgressBar(root = document) {
  const scope = root instanceof Element || root instanceof Document ? root : document;
  if(scope instanceof Element && scope.matches?.('.sls-cart-progress__bar--tiered')) return scope;
  return scope.querySelector?.('cart-drawer.sls-native-cart .sls-cart-progress__bar--tiered, .sls-cart-progress__bar--tiered') || null;
}

function parseSlsCartProgressValue(fill) {
  const raw = fill?.style?.width || fill?.getAttribute?.('style') || '';
  const match = String(raw).match(/-?\d+(?:\.\d+)?/);
  const value = match ? Number.parseFloat(match[0]) : 0;
  if(!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

function getSlsCartProgressSnapshot(root = document) {
  const bar = findSlsCartProgressBar(root);
  return {
    progress: parseSlsCartProgressValue(bar?.querySelector('span')),
    standardUnlocked: Boolean(bar?.querySelector('.sls-cart-progress__marker--standard.is-unlocked')),
    expressUnlocked: Boolean(bar?.querySelector('.sls-cart-progress__marker--express.is-unlocked'))
  };
}

function pulseSlsCartGoalTargets(targets = []) {
  targets.forEach((target) => {
    if(!target) return;
    target.classList.remove('sls-goal-hit');
    void target.offsetWidth;
    target.classList.add('sls-goal-hit');
    window.setTimeout(() => target.classList.remove('sls-goal-hit'), 760);
  });
}

function animateSlsCartProgress(root = document, previous = null) {
  const bar = findSlsCartProgressBar(root);
  const fill = bar?.querySelector('span');
  if(!bar || !fill) return;

  const currentProgress = parseSlsCartProgressValue(fill);
  const previousProgress = previous && Number.isFinite(previous.progress) ? previous.progress : 0;
  const hasMotionPreference = !window.matchMedia || !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if(hasMotionPreference && Math.abs(currentProgress - previousProgress) > 0.2) {
    const fromWidth = `${previousProgress}%`;
    const toWidth = `${currentProgress}%`;
    fill.style.width = toWidth;

    if(typeof fill.animate === 'function') {
      fill.getAnimations?.().forEach((animation) => animation.cancel());
      fill.animate(
        [{ width: fromWidth }, { width: toWidth }],
        { duration: 680, easing: 'cubic-bezier(.22,1,.36,1)' }
      );
    } else {
      fill.style.setProperty('transition', 'none', 'important');
      fill.style.width = fromWidth;
      void fill.offsetWidth;
      fill.style.setProperty('transition', 'width .68s cubic-bezier(.22,1,.36,1)', 'important');
      window.requestAnimationFrame(() => {
        fill.style.width = toWidth;
        window.setTimeout(() => fill.style.removeProperty('transition'), 720);
      });
    }
  }

  const standardUnlocked = Boolean(bar.querySelector('.sls-cart-progress__marker--standard.is-unlocked'));
  const expressUnlocked = Boolean(bar.querySelector('.sls-cart-progress__marker--express.is-unlocked'));
  const crossedStandard = Boolean(previous) && !previous.standardUnlocked && standardUnlocked;
  const crossedExpress = Boolean(previous) && !previous.expressUnlocked && expressUnlocked;

  if(crossedStandard) {
    pulseSlsCartGoalTargets([
      bar.querySelector('.sls-cart-progress__marker--standard'),
      bar.closest('.sls-cart-progress')?.querySelector('[data-sls-tier="standard"]')
    ]);
  }

  if(crossedExpress) {
    pulseSlsCartGoalTargets([
      bar.querySelector('.sls-cart-progress__marker--express'),
      bar.closest('.sls-cart-progress')?.querySelector('[data-sls-tier="express"]')
    ]);
  }
}

class CartItems extends HTMLElement {
  constructor() {
    super();
    this.lineItemStatusElement = document.getElementById('shopping-cart-line-item-status') || document.getElementById('CartDrawer-LineItemStatus');
    this.slsQuantityQueue = Promise.resolve();
    this.slsQueueErrorCount = 0;
    this.slsQuantityChangeTimers = new Map();
    this.slsQuantityLoadingTargets = new Map();
    this.slsQuantityLoadingRequests = new Map();
    this.slsQuantityLoadingTokens = new Map();
    this.slsQuantityBatchQueue = new Map();
    this.slsQuantityPendingValues = new Map();
    this.slsQuantityBatchTimer = null;
    this.slsQuantityBatchActive = false;
    this.slsQuantityBatchPromise = null;

    this.addEventListener('change', this.onChange.bind(this));
  }

  cartUpdateUnsubscriber = undefined;

  connectedCallback() {
    this.cartUpdateUnsubscriber = subscribe(PUB_SUB_EVENTS.cartUpdate, (event) => {
      if(event.source === 'cart-items') {
        return;
      }
      this.onCartUpdate();
    });
  }

  disconnectedCallback() {
    if(this.cartUpdateUnsubscriber) {
      this.cartUpdateUnsubscriber();
    }
  }

  onChange(event) {
    const target = event?.target;
    if(!target || target.name !== 'updates[]' || !target.dataset?.index) return;

    const activeName = document.activeElement && typeof document.activeElement.getAttribute === 'function'
      ? document.activeElement.getAttribute('name')
      : null;

    const request = {
      line: target.dataset.index,
      quantity: target.value,
      name: activeName,
      variantId: target.dataset.quantityVariantId,
      lineItemKey: target.dataset.lineKey || '',
      trigger: target
    };
    const debounceKey = this.getQuantityLoadingKey(request.line, request.lineItemKey);

    this.setPendingQuantityValue(request);
    this.markQuantityPending(request.line, request.lineItemKey);
    window.clearTimeout(this.slsQuantityChangeTimers.get(debounceKey));
    this.slsQuantityChangeTimers.set(debounceKey, window.setTimeout(() => {
      this.slsQuantityChangeTimers.delete(debounceKey);
      this.updateQuantity(request.line, request.quantity, request.name, request.variantId, request.lineItemKey, request.trigger);
    }, 160));
  }
  onCartUpdate() {
    if(this.tagName === 'CART-DRAWER-ITEMS') {
      const cartDrawerWrapper = document.querySelector('cart-drawer.sls-native-cart');
      const slsProgressBefore = getSlsCartProgressSnapshot(cartDrawerWrapper || this);

      fetchCartDrawerSection()
        .then((html) => {
          const selectors = ['cart-drawer-items', '.drawer__footer'];
          for(const selector of selectors){
            const targetElement = document.querySelector(selector);
            const sourceElement = html.querySelector(selector);
            if(targetElement && sourceElement) {
              targetElement.replaceWith(sourceElement);
            }
          }
          applySlsCartThemeConfig();
          animateSlsCartProgress(cartDrawerWrapper || document, slsProgressBefore);
        })
        .catch((e) => {
          console.error(e);
        });
    } else {
      fetch(`${routes.cart_url}?section_id=main-cart`)
        .then((response) => response.text()).then((responseText) => {
          const html = new DOMParser().parseFromString(responseText, 'text/html');
          const sourceQty = html.querySelector('cart-items');
          this.innerHTML = sourceQty.innerHTML;
        })
        .catch((e) => {
          console.error(e);
        });
    }
  }

  getSectionsToRender(){
    const drawer = this.closest('cart-drawer');
    if(this.tagName === 'CART-DRAWER-ITEMS' || drawer) {
      return [
        {
          id: 'cart-drawer',
          section: drawer?.dataset?.id || 'cart-drawer',
          selector: '#CartDrawer',
        },
        {
          id: 'cart-icon-bubble',
          section: 'cart-icon-bubble',
          selector: '.shopify-section'
        }
      ];
    }

    const mainCartItems = document.getElementById('main-cart-items');
    const mainCartFooter = document.getElementById('main-cart-footer');
    const mainCartSection = mainCartItems?.dataset?.id || mainCartFooter?.dataset?.id;
    const sections = [];

    if(mainCartItems && mainCartSection) {
      sections.push({
        id: 'main-cart-items',
        section: mainCartSection,
        selector: '.js-contents',
      });
    }

    if(document.getElementById('cartPage') && mainCartSection) {
      sections.push({
        id: 'cartPage',
        section: mainCartSection,
        selector: '.gift-wraper',
      });
    }

    if(document.getElementById('cart-icon-bubble')) {
      sections.push({
        id: 'cart-icon-bubble',
        section: 'cart-icon-bubble',
        selector: '.shopify-section'
      });
    }

    if(mainCartFooter && mainCartSection) {
      sections.push({
        id: 'main-cart-footer',
        section: mainCartSection,
        selector: '.cartTotal',
      });
    }

    return sections;
  }

  formatQuantityMessage({ requestedQuantity, updatedQuantity, rawMessage }) {
    const safeRequested = Number.isFinite(requestedQuantity) ? requestedQuantity : null;
    const safeUpdated = Number.isFinite(updatedQuantity) ? updatedQuantity : null;

    if(safeRequested !== null && safeUpdated !== null && safeUpdated < safeRequested) {
      return `Only ${safeUpdated} available`;
    }

    const raw = typeof rawMessage === 'string' ? rawMessage.trim() : '';
    if(!raw) return "Couldn't update quantity";

    const quantityMatch = raw.match(/(\d+)/);
    if(quantityMatch && /only|available|stock|left|add|quantity|cannot|can't|sorry/i.test(raw)) {
      return `Only ${quantityMatch[1]} available`;
    }

    if(raw.length > 96) return "Couldn't update quantity";
    return raw;
  }

  getAvailabilityQuantityFromMessage(rawMessage) {
    const raw = typeof rawMessage === 'string' ? rawMessage.trim() : '';
    if(!raw) return null;

    const patterns = [
      /\bonly\s+(\d+)\s+(?:item|items|unit|units)\b/i,
      /\bonly\s+(\d+)\s+(?:available|left|in stock)\b/i,
      /\b(\d+)\s+(?:item|items|unit|units)\s+(?:were|was)\s+added\b/i,
      /\b(\d+)\s+(?:available|left|in stock)\b/i
    ];

    for(const pattern of patterns) {
      const match = raw.match(pattern);
      const parsed = match ? Number.parseInt(match[1], 10) : NaN;
      if(Number.isFinite(parsed) && parsed >= 0) return parsed;
    }

    return null;
  }

  getCartChangeErrorMessage(parsedState) {
    if(!parsedState) return window.cartStrings.error;
    if(typeof parsedState.errors === 'string') return parsedState.errors;
    if(typeof parsedState.description === 'string') return parsedState.description;
    if(typeof parsedState.message === 'string') return parsedState.message;
    return window.cartStrings.error;
  }

  isInvalidCartChangeTargetMessage(message) {
    return /no\s+valid\s+(?:id\s+or\s+line|line\s+or\s+id)\s+parameter|valid\s+id\s+or\s+line/i.test(String(message || ''));
  }

  buildCartChangePayload(request, useLineFallback = false) {
    const payload = { quantity: request.requestedQuantity };
    const resolvedLine = this.resolveLineFromKey(request.line, request.lineItemKey, false);

    if(request.lineItemKey && !useLineFallback) {
      payload.id = request.lineItemKey;
    } else if(Number.isFinite(resolvedLine) && resolvedLine > 0) {
      payload.line = resolvedLine;
    } else {
      const fallbackLine = Number.parseInt(request.line, 10);
      payload.line = Number.isFinite(fallbackLine) && fallbackLine > 0 ? fallbackLine : 1;
    }

    return payload;
  }

  fetchCartChange(request, useLineFallback = false) {
    return fetch(`${routes.cart_change_url}`, {
      ...fetchConfig(),
      ...{ body: JSON.stringify(this.buildCartChangePayload(request, useLineFallback)) }
    })
      .then((response) => response.text())
      .then((state) => JSON.parse(state));
  }

  getUpdatedCartLineItem(cartData, request) {
    const items = Array.isArray(cartData?.items) ? cartData.items : [];
    if(items.length === 0) return null;

    if(request.lineItemKey) {
      const keyedItem = items.find((item) => String(item?.key || '') === String(request.lineItemKey));
      if(keyedItem) return keyedItem;
    }

    const lineIndex = Number.parseInt(request.line, 10) - 1;
    if(lineIndex >= 0 && items[lineIndex]) {
      const lineVariantId = String(items[lineIndex]?.variant_id || items[lineIndex]?.id || '');
      if(!request.variantId || lineVariantId === String(request.variantId)) return items[lineIndex];
    }

    if(request.variantId) {
      const variantMatches = items.filter((item) => String(item?.variant_id || item?.id || '') === String(request.variantId));
      if(variantMatches.length === 1) return variantMatches[0];
    }

    return null;
  }

  toSelectorSafeValue(value = '') {
    if(typeof CSS !== 'undefined' && typeof CSS.escape === 'function') return CSS.escape(String(value));
    return String(value).replace(/["\\]/g, '\\$&');
  }

  resolveLineFromKey(line, lineItemKey, strictForKey = false) {
    const fallbackLine = Number.parseInt(line, 10);
    if(!lineItemKey) return Number.isFinite(fallbackLine) && fallbackLine > 0 ? fallbackLine : 1;

    const escapedKey = this.toSelectorSafeValue(lineItemKey);
    const row = this.querySelector(`.sls-cart-item[data-line-key="${escapedKey}"], .cart-item[data-line-key="${escapedKey}"]`);
    if(!row) {
      if(strictForKey) return null;
      return Number.isFinite(fallbackLine) && fallbackLine > 0 ? fallbackLine : 1;
    }

    const idMatch = (row.id || '').match(/(\d+)$/);
    if(idMatch) {
      const fromId = Number.parseInt(idMatch[1], 10);
      if(Number.isFinite(fromId) && fromId > 0) return fromId;
    }

    const input = row.querySelector('.quantity__input[data-index]');
    const fromInput = Number.parseInt(input?.dataset?.index || '', 10);
    if(Number.isFinite(fromInput) && fromInput > 0) return fromInput;

    return Number.isFinite(fallbackLine) && fallbackLine > 0 ? fallbackLine : 1;
  }

  getQuantityElement(line, lineItemKey) {
    const resolvedLine = this.resolveLineFromKey(line, lineItemKey);
    return (
      document.getElementById(`Quantity-${resolvedLine}`) ||
      document.getElementById(`Drawer-quantity-${resolvedLine}`) ||
      (lineItemKey ? this.querySelector(`.quantity__input[data-line-key="${this.toSelectorSafeValue(lineItemKey)}"]`) : null)
    );
  }

  getLineItemElement(line, lineItemKey = '') {
    const escapedKey = lineItemKey ? this.toSelectorSafeValue(lineItemKey) : '';
    return (
      (lineItemKey ? document.querySelector(`.sls-cart-item[data-line-key="${escapedKey}"], .cart-item[data-line-key="${escapedKey}"]`) : null) ||
      (lineItemKey ? this.querySelector(`.sls-cart-item[data-line-key="${escapedKey}"], .cart-item[data-line-key="${escapedKey}"]`) : null) ||
      document.getElementById(`CartItem-${line}`) ||
      document.getElementById(`CartDrawer-Item-${line}`) ||
      this.querySelector(`#CartItem-${line}, #CartDrawer-Item-${line}`)
    );
  }

  markRemovePending(line, lineItemKey = '') {
    const lineItem = this.getLineItemElement(line, lineItemKey);
    lineItem?.classList.add('sls-cart-remove-pending');
    lineItem?.querySelectorAll('.loading__spinner').forEach((spinner) => spinner.classList.remove('hidden'));
    lineItem?.querySelectorAll('.sls-cart-remove button, .cart-remove-button').forEach((button) => {
      window.lumeCartStartLoading?.(button);
      button.setAttribute('aria-disabled', 'true');
      button.classList.add('loading');
    });
    this.lineItemStatusElement?.setAttribute('aria-hidden', false);
  }

  clearRemovePending(removals = []) {
    removals.forEach(({ line, lineItemKey }) => {
      const lineItem = this.getLineItemElement(line, lineItemKey);
      lineItem?.classList.remove('sls-cart-remove-pending');
      lineItem?.querySelectorAll('.loading__spinner').forEach((spinner) => spinner.classList.add('hidden'));
      lineItem?.querySelectorAll('.sls-cart-remove button, .cart-remove-button').forEach((button) => {
        window.lumeCartResetLoading?.(button);
        button.removeAttribute('aria-disabled');
        button.classList.remove('loading');
      });
    });
  }

  markQueuedRemovePending() {
    Array.from(this.slsRemoveQueue?.values?.() || []).forEach(({ line, lineItemKey }) => {
      this.markRemovePending(line, lineItemKey);
    });
  }

  queueRemove(line, lineItemKey = '') {
    if(!lineItemKey) return this.updateQuantity(line, 0, null, null, lineItemKey);

    this.slsRemoveQueue = this.slsRemoveQueue || new Map();
    if(this.slsRemoveQueue.has(lineItemKey)) return this.slsRemoveBatchPromise || Promise.resolve();

    this.slsRemoveQueue.set(lineItemKey, { line, lineItemKey });
    this.markRemovePending(line, lineItemKey);

    window.clearTimeout(this.slsRemoveFlushTimer);
    this.slsRemoveFlushTimer = window.setTimeout(() => this.flushRemoveQueue(), 90);
    return this.slsRemoveBatchPromise || Promise.resolve();
  }

  removeQueuedItemsWithChangeRequests(removals = [], slsProgressBefore = null) {
    const sortedRemovals = removals.slice().sort((a, b) => {
      const lineA = this.resolveLineFromKey(a.line, a.lineItemKey, false);
      const lineB = this.resolveLineFromKey(b.line, b.lineItemKey, false);
      return lineB - lineA;
    });

    return sortedRemovals
      .reduce((promise, removal) => {
        return promise.then(() => {
          const resolvedLine = this.resolveLineFromKey(removal.line, removal.lineItemKey, false);
          return this.performValidatedQuantityChange({
            line: resolvedLine,
            quantity: 0,
            requestedQuantity: 0,
            lineItemKey: removal.lineItemKey || ''
          }).then((result) => {
            if(result?.parsedState) return result;
            throw new Error(result?.errorMessage || window.cartStrings.error);
          });
        });
      }, Promise.resolve())
      .then(() => {
        const sectionIds = this.getSectionsToRender().map((section) => section.section);
        return Promise.all([
          fetchSlsRenderedSections(sectionIds),
          fetchSlsCartJson().catch(() => null)
        ]);
      })
      .then(([sections, cartData]) => {
        this.renderCartSections(sections, cartData, slsProgressBefore);
        publish(PUB_SUB_EVENTS.cartUpdate, { source: 'cart-items', cartData });
      });
  }

  flushRemoveQueue() {
    if(this.slsRemoveBatchActive) return this.slsRemoveBatchPromise || Promise.resolve();

    const removals = Array.from(this.slsRemoveQueue?.values?.() || []);
    if(removals.length === 0) return Promise.resolve();
    this.slsRemoveQueue.clear();
    this.slsRemoveBatchActive = true;

    const updates = {};
    removals.forEach(({ lineItemKey }) => {
      if(lineItemKey) updates[lineItemKey] = 0;
    });

    const firstLine = removals[0]?.line || 1;
    const cartDrawerWrapper = document.querySelector('cart-drawer');
    const slsProgressBefore = getSlsCartProgressSnapshot(cartDrawerWrapper || this);
    const body = JSON.stringify({
      updates,
      sections: this.getSectionsToRender().map((section) => section.section),
      sections_url: window.location.pathname
    });

    this.slsRemoveBatchPromise = fetch(`${routes.cart_update_url}`, { ...fetchConfig(), ...{ body } })
      .then((response) => response.text())
      .then((state) => {
        const parsedState = JSON.parse(state);
        if(parsedState.errors || parsedState.status >= 400) {
          throw new Error(parsedState.description || parsedState.message || parsedState.errors || window.cartStrings.error);
        }

        this.renderCartSections(parsedState.sections || {}, parsedState, slsProgressBefore);
        this.markQueuedRemovePending();
        this.updateLiveRegions(firstLine, '');
        publish(PUB_SUB_EVENTS.cartUpdate, { source: 'cart-items', cartData: parsedState });
      })
      .catch((error) => {
        return this.removeQueuedItemsWithChangeRequests(removals, slsProgressBefore)
          .catch((fallbackError) => {
            this.clearRemovePending(removals);
            const errors = document.getElementById('cart-errors') || document.getElementById('CartDrawer-CartErrors');
            if(errors) errors.textContent = this.formatQuantityMessage({ requestedQuantity: 0, updatedQuantity: null, rawMessage: fallbackError.message || error.message || window.cartStrings.error });
            console.error(fallbackError || error);
          });
      })
      .finally(() => {
        this.slsRemoveBatchActive = false;
        if(this.slsRemoveQueue?.size) {
          window.clearTimeout(this.slsRemoveFlushTimer);
          this.slsRemoveFlushTimer = window.setTimeout(() => this.flushRemoveQueue(), 0);
        } else {
          this.slsRemoveFlushTimer = null;
        }
        this.slsRemoveBatchPromise = null;
      });

    return this.slsRemoveBatchPromise;
  }

  renderCartSections(sections = {}, cartData = null, slsProgressBefore = null) {
    const cartDrawerWrapper = this.closest('cart-drawer') || document.querySelector('cart-drawer.sls-native-cart') || document.querySelector('cart-drawer');
    const parsedCount = Number(cartData?.item_count);
    const hasParsedCount = Number.isFinite(parsedCount);

    if(hasParsedCount) {
      const isEmpty = parsedCount === 0;
      this.classList.toggle('is-empty', isEmpty);

      const cartFooter = document.getElementById('main-cart-footer');
      if(cartFooter) cartFooter.classList.toggle('is-empty', isEmpty);
      if(cartDrawerWrapper) cartDrawerWrapper.classList.toggle('is-empty', isEmpty);
      updateSlsCartIconBubbleCount(parsedCount);
    }

    this.getSectionsToRender().forEach((section) => {
      const sectionHtml = sections?.[section.section];
      if(!sectionHtml) return;

      if(section.id === 'cart-drawer') {
        const drawerTarget = cartDrawerWrapper?.querySelector(section.selector);
        const drawerMarkup = this.getSectionInnerHTML(sectionHtml, section.selector);
        if(drawerTarget && drawerMarkup) drawerTarget.innerHTML = drawerMarkup;
        return;
      }

      const sectionContainer = document.getElementById(section.id);
      if(!sectionContainer) return;

      const elementToReplace = sectionContainer.querySelector(section.selector) || sectionContainer;
      const sectionMarkup = this.getSectionInnerHTML(sectionHtml, section.selector);
      if(sectionMarkup) elementToReplace.innerHTML = sectionMarkup;
    });

    applySlsCartThemeConfig();
    this.restoreQuantityLoadingTargets();
    this.restorePendingQuantityValues();
    animateSlsCartProgress(cartDrawerWrapper || this, slsProgressBefore);
  }

  reconcileAvailabilityQuantityError({ resolvedLine, requestedQuantity, cappedQuantity, rawMessage, variantId, lineItemKey = '' }) {
    const cartDrawerWrapper = document.querySelector('cart-drawer');
    const slsProgressBefore = getSlsCartProgressSnapshot(cartDrawerWrapper || this);
    const message = this.formatQuantityMessage({ requestedQuantity, updatedQuantity: cappedQuantity, rawMessage });
    const sectionIds = this.getSectionsToRender().map((section) => section.section);

    return Promise.all([
      fetchSlsRenderedSections(sectionIds),
      fetchSlsCartJson().catch(() => null)
    ])
      .then(([sections, cartData]) => {
        this.renderCartSections(sections, cartData, slsProgressBefore);
        this.updateLiveRegions(resolvedLine, message);
        if(cartData) publish(PUB_SUB_EVENTS.cartUpdate, { source: 'cart-items', cartData, variantId });
      })
      .catch((error) => {
        const quantityElement = this.getQuantityElement(resolvedLine, lineItemKey);
        if(quantityElement && Number.isFinite(cappedQuantity)) {
          const cappedValue = String(cappedQuantity);
          quantityElement.value = cappedValue;
          quantityElement.defaultValue = cappedValue;
          quantityElement.setAttribute('value', cappedValue);
        }
        this.updateLiveRegions(resolvedLine, message);
        console.error(error);
      });
  }

  updateQuantity(line, quantity, name, variantId, lineItemKey = '', trigger = null) {
    const request = { line, quantity, name, variantId, lineItemKey, trigger };

    if(lineItemKey) return this.queueQuantityUpdate(request);

    this.slsQuantityQueue = this.slsQuantityQueue
      .catch(() => {})
      .then(() => this.performQuantityUpdate(request));

    return this.slsQuantityQueue;
  }

  queueQuantityUpdate(request) {
    const requestedQuantity = Number.parseInt(request.quantity, 10);
    const normalizedQuantity = Number.isFinite(requestedQuantity) ? requestedQuantity : 0;
    const resolvedLine = this.resolveLineFromKey(request.line, request.lineItemKey, false);
    const quantityElementBeforeRequest = this.getQuantityElement(resolvedLine, request.lineItemKey);
    const previousQuantity = Number.parseInt(
      quantityElementBeforeRequest?.value ||
      quantityElementBeforeRequest?.getAttribute('value') ||
      quantityElementBeforeRequest?.defaultValue ||
      '',
      10
    );
    const loadingKey = this.getQuantityLoadingKey(resolvedLine, request.lineItemKey);
    const loadingToken = this.enableLoading(resolvedLine, request.lineItemKey, request.trigger);

    this.slsQuantityBatchQueue.set(loadingKey, {
      ...request,
      line: resolvedLine,
      quantity: normalizedQuantity,
      requestedQuantity: normalizedQuantity,
      previousQuantity,
      loadingKey,
      loadingToken
    });

    window.clearTimeout(this.slsQuantityBatchTimer);
    this.slsQuantityBatchTimer = window.setTimeout(() => this.flushQuantityUpdateBatch(), 30);
    return this.slsQuantityBatchPromise || Promise.resolve();
  }

  performValidatedQuantityChange(request) {
    return this.fetchCartChange(request, false)
      .then((parsedState) => {
        if(!parsedState.errors) return { request, parsedState };

        const errorMessage = this.getCartChangeErrorMessage(parsedState);

        if(request.lineItemKey && this.isInvalidCartChangeTargetMessage(errorMessage)) {
          return this.fetchCartChange(request, true).then((retriedState) => {
            if(!retriedState.errors) return { request, parsedState: retriedState };

            return {
              request,
              parsedState: null,
              errorMessage: this.getCartChangeErrorMessage(retriedState),
              cappedQuantity: this.getAvailabilityQuantityFromMessage(this.getCartChangeErrorMessage(retriedState))
            };
          });
        }

        const cappedQuantity = this.getAvailabilityQuantityFromMessage(errorMessage);

        if(
          Number.isFinite(cappedQuantity) &&
          Number.isFinite(request.requestedQuantity) &&
          request.requestedQuantity > cappedQuantity
        ) {
          const cappedRequest = { ...request, requestedQuantity: cappedQuantity };

          return this.fetchCartChange(cappedRequest, false)
            .then((cappedParsedState) => {
              if(cappedParsedState.errors && request.lineItemKey && this.isInvalidCartChangeTargetMessage(this.getCartChangeErrorMessage(cappedParsedState))) {
                return this.fetchCartChange(cappedRequest, true);
              }
              return cappedParsedState;
            })
            .then((cappedParsedState) => {
              return {
                request,
                parsedState: cappedParsedState.errors ? null : cappedParsedState,
                errorMessage,
                cappedQuantity
              };
            });
        }

        return { request, parsedState: null, errorMessage, cappedQuantity };
      });
  }

  flushQuantityUpdateBatch() {
    if(this.slsQuantityBatchActive) return this.slsQuantityBatchPromise || Promise.resolve();

    const requests = Array.from(this.slsQuantityBatchQueue.values());
    if(requests.length === 0) return Promise.resolve();

    this.slsQuantityBatchQueue.clear();
    this.slsQuantityBatchActive = true;

    const cartDrawerWrapper = document.querySelector('cart-drawer');
    const slsProgressBefore = getSlsCartProgressSnapshot(cartDrawerWrapper || this);

    this.slsQuantityBatchPromise = requests
      .reduce((promise, request) => {
        return promise.then((results) => {
          return this.performValidatedQuantityChange(request).then((result) => results.concat(result));
        });
      }, Promise.resolve([]))
      .then((results) => {
        const sectionIds = this.getSectionsToRender().map((section) => section.section);
        return Promise.all([
          fetchSlsRenderedSections(sectionIds),
          fetchSlsCartJson().catch(() => null)
        ]).then(([sections, cartData]) => ({ results, sections, cartData }));
      })
      .then(({ results, sections, cartData }) => {
        this.renderCartSections(sections, cartData, slsProgressBefore);

        results.forEach((result) => {
          const request = result.request;
          const updatedLineItem = this.getUpdatedCartLineItem(cartData, request);
          const updatedValue = updatedLineItem ? updatedLineItem.quantity : undefined;
          const normalizedUpdatedValue = Number.isFinite(Number.parseInt(updatedValue, 10))
            ? Number.parseInt(updatedValue, 10)
            : undefined;
          const isIncreaseAttempt = Number.isFinite(request.previousQuantity) && Number.isFinite(request.requestedQuantity)
            ? request.requestedQuantity > request.previousQuantity
            : Number.isFinite(request.requestedQuantity);
          let message = '';

          if(
            isIncreaseAttempt &&
            typeof updatedValue !== 'undefined' &&
            updatedValue < request.requestedQuantity
          ) {
            message = this.formatQuantityMessage({
              requestedQuantity: request.requestedQuantity,
              updatedQuantity: normalizedUpdatedValue,
              rawMessage: window.cartStrings.quantityError.replace('[quantity]', updatedValue)
            });
          } else if(result.errorMessage) {
            message = this.formatQuantityMessage({
              requestedQuantity: request.requestedQuantity,
              updatedQuantity: Number.isFinite(result.cappedQuantity) ? result.cappedQuantity : null,
              rawMessage: result.errorMessage
            });
          } else if(
            Number.isFinite(request.requestedQuantity) &&
            request.requestedQuantity > 0 &&
            typeof updatedValue === 'undefined'
          ) {
            message = this.formatQuantityMessage({
              requestedQuantity: request.requestedQuantity,
              updatedQuantity: request.previousQuantity,
              rawMessage: window.cartStrings.error
            });
          }

          const liveRegionLine = this.resolveLineFromKey(request.line, request.lineItemKey, false);
          this.updateLiveRegions(liveRegionLine, message);
        });

        this.slsQueueErrorCount = 0;
        if(cartData) publish(PUB_SUB_EVENTS.cartUpdate, { source: 'cart-items', cartData });
      })
      .catch((error) => {
        this.slsQueueErrorCount += 1;
        const errors = document.getElementById('cart-errors') || document.getElementById('CartDrawer-CartErrors');
        if(errors) errors.textContent = this.formatQuantityMessage({ requestedQuantity: null, updatedQuantity: null, rawMessage: error.message || window.cartStrings.error });
        console.error(error);
      })
      .finally(() => {
        requests.forEach((request) => this.disableLoading(request.line, request.lineItemKey, request.loadingToken));
        this.slsQuantityBatchActive = false;
        this.slsQuantityBatchPromise = null;

        if(this.slsQuantityBatchQueue.size) {
          window.clearTimeout(this.slsQuantityBatchTimer);
          this.slsQuantityBatchTimer = window.setTimeout(() => this.flushQuantityUpdateBatch(), 0);
        } else {
          this.slsQuantityBatchTimer = null;
        }
      });

    return this.slsQuantityBatchPromise;
  }

  performQuantityUpdate({ line, quantity, name, variantId, lineItemKey = '', trigger = null }) {
    this.slsCartLoadingSucceeded = false;
    const resolvedLine = this.resolveLineFromKey(line, lineItemKey, Boolean(lineItemKey));
    if(resolvedLine === null) {
      this.slsCartLoadingSucceeded = true;
      return Promise.resolve();
    }
    this.enableLoading(resolvedLine, lineItemKey, trigger);
    const requestedQuantity = Number.parseInt(quantity, 10);
    const normalizedQuantity = Number.isFinite(requestedQuantity) ? requestedQuantity : 0;
    const quantityElementBeforeRequest = this.getQuantityElement(resolvedLine, lineItemKey);
    const previousQuantity = Number.parseInt(
      quantityElementBeforeRequest?.value ||
      quantityElementBeforeRequest?.getAttribute('value') ||
      quantityElementBeforeRequest?.defaultValue ||
      '',
      10
    );

    const payload = {
      quantity: normalizedQuantity,
      sections: this.getSectionsToRender().map((section) => section.section),
      sections_url: window.location.pathname,
    };
    if(lineItemKey) payload.id = lineItemKey;
    else payload.line = resolvedLine;

    const body = JSON.stringify(payload);

    return fetch(`${routes.cart_change_url}`, { ...fetchConfig(), ...{ body } })
      .then((response) => {
        return response.text();
      })
      .then((state) => {
        const parsedState = JSON.parse(state);
        const quantityElement = this.getQuantityElement(resolvedLine, lineItemKey);
        const items = document.querySelectorAll('.cart-item');

        if(parsedState.errors) {
          const errorMessage = typeof parsedState.errors === 'string'
            ? parsedState.errors
            : parsedState.description || window.cartStrings.error;
          const cappedQuantity = this.getAvailabilityQuantityFromMessage(errorMessage);

          if(
            Number.isFinite(cappedQuantity) &&
            Number.isFinite(requestedQuantity) &&
            requestedQuantity > cappedQuantity
          ) {
            return this.reconcileAvailabilityQuantityError({
              resolvedLine,
              requestedQuantity,
              cappedQuantity,
              rawMessage: errorMessage,
              variantId,
              lineItemKey
            });
          }

          if(quantityElement) {
            const fallbackValue = quantityElement.getAttribute('value') || quantityElement.defaultValue;
            if(fallbackValue !== null && fallbackValue !== undefined) quantityElement.value = fallbackValue;
          }
          this.updateLiveRegions(resolvedLine, this.formatQuantityMessage({ requestedQuantity, updatedQuantity: null, rawMessage: errorMessage }));
          return;
        }

        const cartDrawerWrapper = document.querySelector('cart-drawer');
        const slsProgressBefore = getSlsCartProgressSnapshot(cartDrawerWrapper || this);
        this.renderCartSections(parsedState.sections || {}, parsedState, slsProgressBefore);
        const updatedLineItem = this.getUpdatedCartLineItem(parsedState, {
          line: resolvedLine,
          lineItemKey,
          variantId
        });
        const updatedValue = updatedLineItem ? updatedLineItem.quantity : undefined;
        const normalizedUpdatedValue = Number.isFinite(Number.parseInt(updatedValue, 10))
          ? Number.parseInt(updatedValue, 10)
          : undefined;
        const isIncreaseAttempt = Number.isFinite(previousQuantity) && Number.isFinite(requestedQuantity)
          ? requestedQuantity > previousQuantity
          : Number.isFinite(requestedQuantity);
        let message = '';
        if(
          items.length === parsedState.items.length &&
          isIncreaseAttempt &&
          typeof updatedValue !== 'undefined' &&
          updatedValue < requestedQuantity
        ) {
          message = this.formatQuantityMessage({
            requestedQuantity,
            updatedQuantity: normalizedUpdatedValue,
            rawMessage: window.cartStrings.quantityError.replace('[quantity]', updatedValue)
          });
        } else if(
          items.length === parsedState.items.length &&
          Number.isFinite(requestedQuantity) &&
          requestedQuantity > 0 &&
          typeof updatedValue === 'undefined'
        ) {
          message = this.formatQuantityMessage({
            requestedQuantity,
            updatedQuantity: previousQuantity,
            rawMessage: window.cartStrings.error
          });
        }
        this.updateLiveRegions(resolvedLine, message);

        const lineItem =
          document.getElementById(`CartItem-${resolvedLine}`) || document.getElementById(`CartDrawer-Item-${resolvedLine}`);
        if(lineItem && lineItem.querySelector(`[name="${name}"]`)) {
          cartDrawerWrapper
            ? trapFocus(cartDrawerWrapper, lineItem.querySelector(`[name="${name}"]`))
            : lineItem.querySelector(`[name="${name}"]`).focus();
        } else if(parsedState.item_count === 0 && cartDrawerWrapper) {
          trapFocus(cartDrawerWrapper.querySelector('.drawer-empty') || cartDrawerWrapper, cartDrawerWrapper.querySelector('a, button'));
        } else if(document.querySelector('.cart-item') && cartDrawerWrapper) {
          trapFocus(cartDrawerWrapper, document.querySelector('.cart-item__name, .sls-cart-item__title'));
        }

        this.slsQueueErrorCount = 0;
        this.slsCartLoadingSucceeded = true;
        publish(PUB_SUB_EVENTS.cartUpdate, { source: 'cart-items', cartData: parsedState, variantId: variantId });
      })
      .catch((error) => {
        this.slsQueueErrorCount += 1;
        this.slsCartLoadingSucceeded = false;
        this.querySelectorAll('.loading__spinner').forEach((overlay) => overlay.classList.add('hidden'));
        const errors = document.getElementById('cart-errors') || document.getElementById('CartDrawer-CartErrors');
        if(errors) errors.textContent = this.formatQuantityMessage({ requestedQuantity, updatedQuantity: previousQuantity, rawMessage: window.cartStrings.error });
        console.error(error);
      })
      .finally(() => {
        this.disableLoading(resolvedLine, lineItemKey);
      });
  }
  updateLiveRegions(line, message) {
    const lineItemError = document.getElementById(`Line-item-error-${line}`) || document.getElementById(`CartDrawer-LineItemError-${line}`);
    const lineItemErrorText = lineItemError?.querySelector('.ctItem-error');
    const normalizedMessage = typeof message === 'string' ? message.trim() : '';
    if(lineItemErrorText) lineItemErrorText.textContent = normalizedMessage;
    if(lineItemError) lineItemError.classList.toggle('has-message', Boolean(normalizedMessage));

    this.lineItemStatusElement?.setAttribute('aria-hidden', true);

    const cartStatus = document.getElementById('cart-live-region-text') || document.getElementById('CartDrawer-LiveRegionText');
    cartStatus?.setAttribute('aria-hidden', false);
    freeShippMsg();cartTerms();
    if(theme.mlcurrency) currenciesChange(document.querySelectorAll('cart-item span.money'));
    setTimeout(() => {
      cartStatus?.setAttribute('aria-hidden', true);
    }, 1000);
  }
  getSectionInnerHTML(html, selector) {
    if(!html || !selector) return '';
    return new DOMParser().parseFromString(html, 'text/html').querySelector(selector)?.innerHTML || '';
  }

  getQuantityLoadingKey(line, lineItemKey = '') {
    return lineItemKey ? `key:${lineItemKey}` : `line:${line || 1}`;
  }

  getQuantityLoadingTarget(line, lineItemKey = '', trigger = null) {
    const lineItem = this.getLineItemElement(line, lineItemKey);
    const triggerControl = trigger?.closest?.('.sls-cart-quantity') || trigger?.closest?.('button') || null;
    const activeElement = document.activeElement;
    const activeControl = activeElement && lineItem?.contains(activeElement)
      ? activeElement.closest('.sls-cart-quantity') || activeElement.closest('button')
      : null;

    return triggerControl || activeControl || lineItem?.querySelector('.sls-cart-quantity') || lineItem?.querySelector('.sls-cart-remove button') || null;
  }

  restoreQuantityLoadingTargets() {
    this.slsQuantityLoadingRequests?.forEach(({ line, lineItemKey }, loadingKey) => {
      const target = this.getQuantityLoadingTarget(line, lineItemKey);
      if(target) {
        this.slsQuantityLoadingTargets.set(loadingKey, target);
        if(!this.isQuantityLoadingTarget(target)) window.lumeCartStartLoading?.(target);
      }

      const lineItem = this.getLineItemElement(line, lineItemKey);
      lineItem?.classList.add('sls-cart-loading', 'sls-cart-quantity-updating');
      lineItem?.querySelectorAll('.loading__spinner').forEach((overlay) => overlay.classList.remove('hidden'));
    });
  }

  setPendingQuantityValue({ line, quantity, lineItemKey = '' }) {
    const parsedQuantity = Number.parseInt(quantity, 10);
    if(!Number.isFinite(parsedQuantity)) return;

    const loadingKey = this.getQuantityLoadingKey(line, lineItemKey);
    this.slsQuantityPendingValues.set(loadingKey, {
      line,
      lineItemKey,
      quantity: parsedQuantity
    });
  }

  restorePendingQuantityValues() {
    this.slsQuantityPendingValues?.forEach((pending) => {
      const resolvedLine = this.resolveLineFromKey(pending.line, pending.lineItemKey, false);
      const quantityElement = this.getQuantityElement(resolvedLine, pending.lineItemKey);
      const pendingValue = String(pending.quantity);

      if(quantityElement && quantityElement.value !== pendingValue) {
        quantityElement.value = pendingValue;
        quantityElement.closest('quantity-input')?.validateQtyRules?.();
      }

      const lineItem = this.getLineItemElement(resolvedLine, pending.lineItemKey);
      lineItem?.classList.add('sls-cart-loading');
    });
  }

  clearPendingQuantityValue(line, lineItemKey = '') {
    const loadingKey = this.getQuantityLoadingKey(line, lineItemKey);
    if(this.slsQuantityChangeTimers.has(loadingKey) || this.slsQuantityBatchQueue.has(loadingKey)) return;
    this.slsQuantityPendingValues.delete(loadingKey);
  }

  markQuantityPending(line, lineItemKey = '') {
    const lineItem = this.getLineItemElement(line, lineItemKey);
    lineItem?.classList.add('sls-cart-loading');
    this.lineItemStatusElement?.setAttribute('aria-hidden', false);
  }

  isQuantityLoadingTarget(target) {
    return Boolean(target && target.matches && target.matches('.sls-cart-quantity, .cart-quantity'));
  }

  enableLoading(line, lineItemKey = '', trigger = null) {
    const mainCartItems = document.getElementById('main-cart-items') || document.getElementById('CartDrawer-CartItems');
    mainCartItems?.classList.add('cart__items--disabled');

    const cartItemElements = this.querySelectorAll(`#CartItem-${line} .loading__spinner`);
    const cartDrawerItemElements = this.querySelectorAll(`#CartDrawer-Item-${line} .loading__spinner`);
    const loadingKey = this.getQuantityLoadingKey(line, lineItemKey);
    const loadingTarget = this.getQuantityLoadingTarget(line, lineItemKey, trigger);
    const loadingToken = (this.slsQuantityLoadingTokens.get(loadingKey) || 0) + 1;
    const lineItem = this.getLineItemElement(line, lineItemKey);

    this.slsQuantityLoadingTokens.set(loadingKey, loadingToken);
    this.slsQuantityLoadingRequests.set(loadingKey, { line, lineItemKey, token: loadingToken });
    if(loadingTarget) this.slsQuantityLoadingTargets.set(loadingKey, loadingTarget);
    if(!this.isQuantityLoadingTarget(loadingTarget)) window.lumeCartStartLoading?.(loadingTarget);

    lineItem?.classList.add('sls-cart-loading', 'sls-cart-quantity-updating');
    [...cartItemElements, ...cartDrawerItemElements].forEach((overlay) => overlay.classList.remove('hidden'));

    if(!this.isQuantityLoadingTarget(loadingTarget)) document.activeElement?.blur?.();
    this.lineItemStatusElement?.setAttribute('aria-hidden', false);
    return loadingToken;
  }
  disableLoading(line, lineItemKey = '', loadingToken = null) {
    const mainCartItems = document.getElementById('main-cart-items') || document.getElementById('CartDrawer-CartItems');

    const cartItemElements = document.querySelectorAll(`#CartItem-${line} .loading__spinner`);
    const cartDrawerItemElements = document.querySelectorAll(`#CartDrawer-Item-${line} .loading__spinner`);
    const loadingKey = this.getQuantityLoadingKey(line, lineItemKey);
    const currentLoadingRequest = this.slsQuantityLoadingRequests.get(loadingKey);
    if(loadingToken !== null && currentLoadingRequest?.token !== loadingToken) return;

    const loadingTarget = this.slsQuantityLoadingTargets.get(loadingKey) || this.getQuantityLoadingTarget(line, lineItemKey);
    const lineItem = this.getLineItemElement(line, lineItemKey);

    cartItemElements.forEach((overlay) => overlay.classList.add('hidden'));
    cartDrawerItemElements.forEach((overlay) => overlay.classList.add('hidden'));
    lineItem?.querySelectorAll('.loading__spinner').forEach((overlay) => overlay.classList.add('hidden'));

    window.lumeCartResetLoading?.(loadingTarget);
    this.slsQuantityLoadingTargets.delete(loadingKey);
    this.slsQuantityLoadingRequests.delete(loadingKey);
    this.slsQuantityLoadingTokens.delete(loadingKey);
    this.clearPendingQuantityValue(line, lineItemKey);
    lineItem?.classList.remove('sls-cart-quantity-updating');

    if(!this.slsQuantityPendingValues.has(loadingKey)) {
      const quantityElement = this.getQuantityElement(line, lineItemKey);
      const renderedQuantity = quantityElement?.getAttribute('value') || quantityElement?.defaultValue;

      if(quantityElement && renderedQuantity !== null && renderedQuantity !== undefined && quantityElement.value !== renderedQuantity) {
        quantityElement.value = renderedQuantity;
        quantityElement.closest('quantity-input')?.validateQtyRules?.();
      }

      lineItem?.classList.remove('sls-cart-loading');
    }

    if(!this.slsQuantityLoadingTargets.size && !this.slsQuantityChangeTimers.size) {
      mainCartItems?.classList.remove('cart__items--disabled');
    }
  }
}
if(!customElements.get('cart-items')) customElements.define('cart-items', CartItems);

if(!customElements.get('cart-note')) {
  customElements.define('cart-note', class CartNote extends HTMLElement {
      constructor() {
        super();
        this.addEventListener('input',debounce((event) => {
            const noteValue = typeof event?.target?.value === 'string' ? event.target.value : '';
            document.dispatchEvent(new CustomEvent('sls:cart-note-updated', { detail: { note: noteValue } }));
            const body = JSON.stringify({ note: event.target.value });
            fetch(`${routes.cart_update_url}`, { ...fetchConfig(), ...{ body } });
          }, 300)
        );
      }
    }
  );
}

class CartDrawer extends HTMLElement {
  constructor() {
    super();
    this.slsUpdateScrollCue = () => updateSlsCartScrollCue(this);
    this.addEventListener('scroll', (event) => {
      if(event.target?.matches?.('.sls-cart-main')) updateSlsCartScrollCue(event.target);
    }, true);
    window.addEventListener('resize', this.slsUpdateScrollCue, { passive: true });
    this.addEventListener('keyup', (evt) => evt.code === 'Escape' && this.close());
    this.onOverlayClick = this.close.bind(this);
    this.querySelector('#CartDrawer-Overlay')?.addEventListener('click', this.onOverlayClick);
    this.addEventListener('click', (event) => {
      const checkoutButton = event.target.closest('.sls-cart-checkout');
      if(checkoutButton && !checkoutButton.disabled) window.lumeCartStartLoading?.(checkoutButton);
    });
  }

  open(triggeredBy) {
    const openedManually = Boolean(
      isSlsManualCartTrigger(triggeredBy) || hasSlsManualCartOpenIntent()
    );
    if(!shouldSlsAutoOpenOnAdd() && !openedManually) return;
    const wasOpen = this.classList.contains('active') && this.getAttribute('aria-hidden') === 'false';
    document.querySelectorAll('cart-drawer.sls-native-cart').forEach((drawer) => {
      if(drawer === this) return;
      drawer.classList.remove('active', 'poptop', 'sls-cart-opening', 'sls-cart-settled');
      drawer.setAttribute('aria-hidden', 'true');
    });
    if(triggeredBy) this.setActiveElement(triggeredBy);
    const cartDrawerNote = this.querySelector('[id^="Details-"] summary');
    if(cartDrawerNote && !cartDrawerNote.hasAttribute('role')) this.setSummaryAccessibility(cartDrawerNote);
    // here the animation doesn't seem to always get triggered. A timeout seem to help
    this.classList.add('sls-native-cart');
    this.classList.remove('poptop', 'hide', 'sls-cart-settled');
    if(!wasOpen) {
      this.classList.add('sls-cart-opening');
      clearTimeout(this.slsCartOpeningTimer);
      this.slsCartOpeningTimer = setTimeout(() => {
        this.classList.remove('sls-cart-opening');
        if(this.classList.contains('active') && this.getAttribute('aria-hidden') === 'false') {
          this.classList.add('sls-cart-settled');
        }
      }, 760);
    } else {
      this.classList.add('sls-cart-settled');
    }
    this.setAttribute('aria-hidden', 'false');
    this.dataset.slsOpenSource = openedManually ? 'manual' : 'auto';
    this.querySelector('#CartDrawer')?.classList.remove('hide');
    if(!wasOpen) {
      this.classList.remove('active', 'animate');
      this.querySelector('#CartDrawer')?.getBoundingClientRect();
      const activateDrawer = () => this.classList.add('animate', 'active');
      if(typeof requestAnimationFrame === 'function') requestAnimationFrame(activateDrawer);
      else setTimeout(activateDrawer, 0);
    } else {
      this.classList.add('animate', 'active');
    }

    this.addEventListener('transitionend', () => {
      const containerToTrapFocusOn = this.classList.contains('is-empty') ? this.querySelector('.drawer-empty') : this.querySelector('#CartDrawer');
      const focusElement = this.querySelector('.drawer__inner') || this.querySelector('.drawer__close');
      trapFocus(containerToTrapFocusOn, focusElement);
    }, { once: true });

    setSlsPageScrollLock(true, this);
    requestAnimationFrame(this.slsUpdateScrollCue);
    setTimeout(this.slsUpdateScrollCue, 420);
    initSlsOrderNoteTip(this);
    showSlsOrderNoteTip(this);
    const tipState = slsOrderNoteTipState.get(this);
    if(tipState) {
      tipState.showTimer = window.setTimeout(() => showSlsOrderNoteTip(this), 680);
    }
  }

  close() {
    clearTimeout(this.slsCartOpeningTimer);
    hideSlsOrderNoteTip(this);
    this.classList.remove('active','poptop','sls-cart-opening','sls-cart-settled');
    this.setAttribute('aria-hidden', 'true');
    this.dataset.slsOpenSource = 'closed';
    removeTrapFocus(this.activeElement);
    setSlsPageScrollLock(false, this);
  }

  setSummaryAccessibility(cartDrawerNote) {
    cartDrawerNote.setAttribute('role', 'button');
    cartDrawerNote.setAttribute('aria-expanded', 'false');

    if(cartDrawerNote.nextElementSibling.getAttribute('id')) {
      cartDrawerNote.setAttribute('aria-controls', cartDrawerNote.nextElementSibling.id);
    }

    cartDrawerNote.addEventListener('click', (e) => {
      e.currentTarget.setAttribute('aria-expanded', !e.currentTarget.closest('details').hasAttribute('open'));
    });

    //cartDrawerNote.parentElement.addEventListener('keyup', onKeyUpEscape);
  }

  renderContents(parsedState, openDrawer = shouldSlsAutoOpenOnAdd()) {
    document.querySelectorAll('cart-drawer.sls-native-cart[data-sls-fallback-drawer="true"]').forEach((drawer) => {
      if(drawer !== this) drawer.remove();
    });

    const slsProgressBefore = getSlsCartProgressSnapshot(this);

    this.productId = parsedState.id;
    this.getSectionsToRender().forEach((section => {
      const sectionElement = section.selector
        ? (section.selector === '#CartDrawer' ? this.querySelector(section.selector) : document.querySelector(section.selector))
        : document.getElementById(section.id);
      const sectionHtml = parsedState.sections?.[section.id];
      if(sectionElement && sectionHtml) {
        sectionElement.innerHTML = this.getSectionInnerHTML(sectionHtml, section.selector);
      }
    }));

    const parsedCount = Number(parsedState?.item_count);
    const renderedCount = getSlsDrawerItemCount(this);
    const itemCount = Number.isFinite(parsedCount) ? parsedCount : renderedCount;
    const isEmpty = itemCount <= 0 && renderedCount <= 0;

    this.classList.toggle('is-empty', isEmpty);
    this.querySelector('#CartDrawer')?.classList.toggle('is-empty', isEmpty);
    this.querySelector('.drawer__inner')?.classList.toggle('is-empty', isEmpty);

    applySlsCartThemeConfig();
    animateSlsCartProgress(this, slsProgressBefore);

    setTimeout(() => {
      if(openDrawer) this.open();
      this.slsUpdateScrollCue();
      if(theme.mlcurrency) currenciesChange(document.querySelectorAll('cart-item span.money'));
    });
  }
  getSectionInnerHTML(html, selector = '.shopify-section'){
    return new DOMParser().parseFromString(html, 'text/html').querySelector(selector)?.innerHTML || '';
  }
  getSectionsToRender() {
    return [
      {
        id: 'cart-drawer',
        selector: '#CartDrawer'
      },
      {
        id: 'cart-icon-bubble'
      }
    ];
  }
  getSectionDOM(html, selector = '.shopify-section') {
    return new DOMParser().parseFromString(html, 'text/html').querySelector(selector);
  }
  setActiveElement(element) {
    this.activeElement = element;
  }
}
if(!customElements.get('cart-drawer')) customElements.define('cart-drawer', CartDrawer);

(function bindSlsNativeCartTriggers() {
  if(window.__slsNativeCartTriggerFallbackBound) return;
  window.__slsNativeCartTriggerFallbackBound = true;

  const triggerSelector = '[data-sls-cart-trigger], #cartLink, a.cartOpen';

  function isCartTemplate() {
    try {
      const cartPath = new URL(window.routes?.cart_url || '/cart', window.location.origin).pathname;
      return document.body?.classList.contains('template-cart') || window.location.pathname === cartPath;
    } catch(e) {
      return false;
    }
  }

  function getDrawer() {
    const drawers = Array.from(document.querySelectorAll('cart-drawer'));
    if(drawers.length === 0) return document.querySelector('.ctdrawer');
    if(drawers.length === 1) return drawers[0];

    const openDrawer = drawers.find(
      (drawer) => drawer.classList.contains('active') && drawer.getAttribute('aria-hidden') !== 'true'
    );
    const nativeDrawer = drawers.find((drawer) => drawer.classList.contains('sls-native-cart'));
    const keep = openDrawer || nativeDrawer || drawers[0];

    drawers.forEach((drawer) => {
      if(drawer !== keep) drawer.remove();
    });

    return keep;
  }

  function ensureFallbackDrawer() {
    const existing = getDrawer();
    if(existing) return Promise.resolve(existing);

    return fetchCartDrawerSection().then((html) => {
      const drawer = html.querySelector('cart-drawer');
      if(!drawer) throw new Error('Cart drawer response did not include cart-drawer.');
      document.body.appendChild(drawer);
      applySlsCartThemeConfig(drawer);
      return drawer;
    });
  }

  function forceOpenNativeDrawer(trigger) {
    const drawer = getDrawer();
    if(!drawer) return false;
    if(drawer.classList.contains('active') && drawer.getAttribute('aria-hidden') === 'false') return true;

    if(typeof drawer.open === 'function') {
      drawer.open(trigger);
      return true;
    }

    drawer.classList.add('sls-native-cart', 'animate', 'active');
    drawer.classList.remove('poptop', 'hide', 'sls-cart-settled');
    drawer.setAttribute('aria-hidden', 'false');
    drawer.querySelector('#CartDrawer')?.classList.remove('hide');
    setSlsPageScrollLock(true, drawer);
    return true;
  }

  function stopCartEvent(event) {
    if(!event) return;
    event.__slsCartHandled = true;
    event.preventDefault();
    event.returnValue = false;
    event.stopPropagation();
    event.stopImmediatePropagation?.();
  }

  function openFromTrigger(event, trigger) {
    if(event?.__slsCartHandled) return false;
    if(!trigger || isCartTemplate()) return true;

    if(event?.isTrusted) markSlsManualCartOpenIntent();
    stopCartEvent(event);

    if(window.SLSCartDrawer && typeof window.SLSCartDrawer.open === 'function') {
      forceOpenNativeDrawer(trigger);
      window.SLSCartDrawer.open(trigger).catch(() => {
        ensureFallbackDrawer()
          .then(() => forceOpenNativeDrawer(trigger))
          .catch((error) => {
            console.error('Studio Lume cart drawer could not open. Staying on page instead of redirecting to /cart.', error);
          });
      });
      return false;
    }

    ensureFallbackDrawer()
      .then(() => forceOpenNativeDrawer(trigger))
      .catch((error) => {
        console.error('Studio Lume cart drawer could not open. Staying on page instead of redirecting to /cart.', error);
      });

    return false;
  }

  window.SLSOpenCartFromLink = openFromTrigger;
  window.SLSOpenCartDrawer = function(trigger) {
    if(window.SLSCartDrawer && typeof window.SLSCartDrawer.open === 'function') {
      return window.SLSCartDrawer.open(trigger);
    }
    return forceOpenNativeDrawer(trigger);
  };

  function decorateTrigger(trigger) {
    if(!trigger || trigger.dataset.slsCartJsFallbackBound === 'true') return;
    trigger.dataset.slsCartJsFallbackBound = 'true';
    trigger.dataset.slsCartTrigger = 'true';
    trigger.setAttribute('role', 'button');
    trigger.setAttribute('aria-haspopup', 'dialog');
    trigger.setAttribute('aria-controls', 'CartDrawer');

    if(trigger.tagName === 'A') {
      if(!trigger.getAttribute('data-sls-cart-href')) {
        const href = trigger.getAttribute('href');
        if(href && href !== '#cart-drawer') trigger.setAttribute('data-sls-cart-href', href);
      }
      trigger.setAttribute('href', '#cart-drawer');
    }
  }

  function decorateAll(root = document) {
    if(root.nodeType === 1 && root.matches?.(triggerSelector)) decorateTrigger(root);
    root.querySelectorAll?.(triggerSelector).forEach(decorateTrigger);
  }

  document.addEventListener('click', (event) => {
    const trigger = event.target.closest?.(triggerSelector);
    if(trigger) openFromTrigger(event, trigger);
  }, true);

  document.addEventListener('DOMContentLoaded', () => decorateAll(document), { once: true });
  decorateAll(document);
  getDrawer();

  if(window.MutationObserver) {
    new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if(node.nodeType === 1) decorateAll(node);
        });
      });
    }).observe(document.documentElement, { childList: true, subtree: true });
  }
})();

(function enforceSlsCartOpenPolicy() {
  if(window.__slsCartOpenPolicyBound) return;
  window.__slsCartOpenPolicyBound = true;

  const manualTriggerSelector = '[data-sls-cart-trigger], #cartLink, a.cartOpen';

  function closeDrawerNow(drawer) {
    if(!drawer) return;
    if(typeof drawer.close === 'function') {
      drawer.close();
      return;
    }

    drawer.classList.remove('active', 'poptop', 'sls-cart-opening', 'sls-cart-settled');
    drawer.setAttribute('aria-hidden', 'true');
    drawer.querySelector('#CartDrawer')?.classList.remove('active');
    setSlsPageScrollLock(false, drawer);
  }

  function shouldForceClose(drawer) {
    if(!drawer) return false;
    if(shouldSlsAutoOpenOnAdd()) return false;
    if(drawer.dataset.slsOpenSource === 'manual') return false;
    if(hasSlsManualCartOpenIntent()) return false;

    return drawer.classList.contains('active') && drawer.getAttribute('aria-hidden') !== 'true';
  }

  function enforceOnDrawer(drawer) {
    if(!(drawer instanceof Element) || !drawer.matches('cart-drawer')) return;
    if(!shouldForceClose(drawer)) return;
    closeDrawerNow(drawer);
  }

  function enforceOnNode(node) {
    if(!(node instanceof Element)) return;
    if(node.matches('cart-drawer')) enforceOnDrawer(node);
    node.querySelectorAll?.('cart-drawer').forEach(enforceOnDrawer);
  }

  function enforceAll() {
    document.querySelectorAll('cart-drawer').forEach(enforceOnDrawer);
  }

  const markIntentFromEvent = (event) => {
    if(!event?.isTrusted) return;
    const trigger = event.target?.closest?.(manualTriggerSelector);
    if(trigger) markSlsManualCartOpenIntent();
  };

  document.addEventListener('pointerdown', markIntentFromEvent, true);
  document.addEventListener('click', markIntentFromEvent, true);

  if(window.MutationObserver) {
    const watchDrawer = (drawer) => {
      if(!(drawer instanceof Element) || !drawer.matches('cart-drawer')) return;
      if(drawer.dataset.slsPolicyObserved === 'true') return;
      drawer.dataset.slsPolicyObserved = 'true';

      const observer = new MutationObserver(() => enforceOnDrawer(drawer));
      observer.observe(drawer, {
        attributes: true,
        attributeFilter: ['class', 'aria-hidden']
      });
    };

    document.querySelectorAll('cart-drawer').forEach(watchDrawer);

    if(document.documentElement) {
      new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          mutation.addedNodes?.forEach((node) => {
            enforceOnNode(node);
            if(!(node instanceof Element)) return;
            if(node.matches('cart-drawer')) watchDrawer(node);
            node.querySelectorAll?.('cart-drawer').forEach(watchDrawer);
          });
        });
      }).observe(document.documentElement, {
        childList: true,
        subtree: true
      });
    }
  }

  if(document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', enforceAll, { once: true });
  } else {
    enforceAll();
  }
})();

class CartDrawerItems extends CartItems {
  getSectionsToRender() {
    return [
      {
        id: 'CartDrawer',
        section: 'cart-drawer',
        selector: '.drawer__inner'
      },
      {
        id: 'cart-icon-bubble',
        section: 'cart-icon-bubble',
        selector: '.shopify-section'
      }
    ];
  }
}
if(!customElements.get('cart-drawer-items')) customElements.define('cart-drawer-items', CartDrawerItems);

class CartDiscount extends HTMLElement {
  #activeFetch = null;
  constructor() {
    super();
    const form = this.querySelector("form");
    if(form) form.addEventListener("submit", this.applyDiscount);

    this.addEventListener("click", (event) => {
      if (event.target.closest(".cart-discount-remove")) {
        this.removeDiscount(event);
      }
    });
    this.submitButton = this.querySelector('[type="submit"]');
    this.errorEl = this.querySelector('.cart-discount__error') || document.querySelector('.cart-discount__error');
    this.hydrateDiscountCodesFromCart();
  }

  #createAbortController() {
    if(this.#activeFetch) this.#activeFetch.abort();

    const abortController = new AbortController();
    this.#activeFetch = abortController;
    return abortController;
  }

  async #updateCartDiscount(discountCodes, abortController) {
    const body = JSON.stringify({discount: discountCodes.join(","), sections: this.getSectionsToRender().map((section) => section.section), sections_url: window.routes.cart_url,});
    const response = await fetch(`${routes.cart_update_url}`, { ...fetchConfig(), ...{ body: body, signal: abortController.signal } });
    if(!response.ok) throw new Error(`Cart discount update failed: ${response.status}`);
    return response.json();
  }

  #updateCartUI(data){
    if(!data) return;
    this.getSectionsToRender().forEach((section) => {
      if (data.sections && data.sections[section.section]){
        const elementToReplace = document.getElementById(section.id) ?.querySelector(section.selector) || document.getElementById(section.id);
        if(elementToReplace){
          elementToReplace.innerHTML = this.getSectionInnerHTML(data.sections[section.section], section.selector);
        }
      }
    });
    applySlsCartThemeConfig();
    if(theme.mlcurrency) currenciesChange(document.querySelectorAll('cart-item span.money'));
    document.querySelectorAll('cart-discount').forEach((element) => element.hydrateDiscountCodesFromCart?.());
  }

  #setLoadingState(isLoading) {
    if(!this.submitButton) return;
    const spinner = this.submitButton.querySelector('.loading__spinner');

    if (isLoading) {
      this.submitButton.setAttribute("aria-disabled", "true");
      this.submitButton.classList.add("loading");
      spinner?.classList.remove("hidden");
      window.lumeCartStartLoading?.(this.submitButton);
    } else {
      this.submitButton.removeAttribute("aria-disabled");
      this.submitButton.classList.remove("loading");
      spinner?.classList.add("hidden");
      if(this.slsDiscountLoadingSucceeded) {
        window.lumeCartFinishLoading?.(this.submitButton);
      } else {
        window.lumeCartResetLoading?.(this.submitButton);
      }
    }
  }

  /*** Returns an array of existing discount codes. * @returns {string[]} */
  #existingDiscounts() {
    const discountCodes = [];
    const discountPills = this.querySelectorAll(".discount-code, [data-discount-code]");

    for (const pill of discountPills){
      if (pill instanceof HTMLElement){
        const code = pill.dataset.discountCode || pill.dataset.code;
        if (typeof code === "string" && code.trim()) {
          discountCodes.push(code.trim());
        }
      }
    }
    return discountCodes;
  }

  #escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  #renderDiscountCodePill(code) {
    const safeCode = this.#escapeHtml(code);
    return `<li class="discount-code fl f-aic" data-discount-code="${safeCode}" aria-label="Discount applied: ${safeCode}">
      <svg class="at-icon mr5"><use xlink:href="#icon-tag"></use></svg> ${safeCode}
      <button type="button" on:click="/removeDiscount" class="cart-discount-remove btnLink" aria-label="Remove discount ${safeCode}">
        <svg class="at-icon remove ml10" viewBox="0 0 24 24"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 14h10l1-14M9 7V4h6v3"/></svg>
        <svg class="at-icon at-spin ml10"><use xlink:href="#icon-loading"></use></svg>
      </button>
    </li>`;
  }

  async hydrateDiscountCodesFromCart() {
    const list = this.querySelector('.cart-discount__codes');
    if(!list || !window.fetch || !window.routes?.cart_url) return;

    try {
      const response = await fetch(`${routes.cart_url}.js`, { credentials: 'same-origin' });
      if(!response.ok) return;
      const cart = await response.json();
      const shopifyCodes = Array.isArray(cart.discount_codes)
        ? cart.discount_codes.map((discount) => discount?.code).filter(Boolean)
        : [];
      if(!shopifyCodes.length) return;

      const existingCodes = new Set(this.#existingDiscounts().map((code) => code.toLowerCase()));
      shopifyCodes.forEach((code) => {
        if(existingCodes.has(String(code).toLowerCase())) return;
        list.insertAdjacentHTML('beforeend', this.#renderDiscountCodePill(code));
        existingCodes.add(String(code).toLowerCase());
      });
    } catch (error) {
      return;
    }
  }

  applyDiscount = async (event) => {
    event.preventDefault();
    event.stopPropagation();

    this.errorEl?.classList.add('hidden');

    const form = event.target instanceof HTMLFormElement ? event.target : this.querySelector("form");
    const discountCode = form?.querySelector('input[name="discount"]');
    const discountCodeValue = discountCode?.value.trim();
    if(!discountCodeValue) return;

    // Check if discount already exists
    const existingDiscounts = this.#existingDiscounts();
    if (existingDiscounts.includes(discountCodeValue)){
      this.#handleDiscountError('exist');
      return;
    }

    this.slsDiscountLoadingSucceeded = false;
    this.#setLoadingState(true);
    const abortController = this.#createAbortController();

    try {
      const updatedDiscounts = [...existingDiscounts, discountCodeValue];
      const data = await this.#updateCartDiscount(updatedDiscounts, abortController);

      /** @type {{ code: string; applicable: boolean; }} */
      if(data.discount_codes?.find((discount) => { return (discount.code === discountCodeValue && discount.applicable === false);})){
        this.#handleDiscountError('discount');
        return;
      }

      discountCode.value = "";
      this.slsDiscountLoadingSucceeded = true;
      this.#updateCartUI(data);
      //this.#checkShipCode(discountCodeValue,data.discount_codes);
    } catch (error) {
      var type = "applying discount"
      this.#handleDiscountError(type);
    } finally {
      this.#setLoadingState(false);
      this.#activeFetch = null;
    }
  };

  removeDiscount = async (event) => {
    event.preventDefault();
    event.stopPropagation();
    if(event instanceof KeyboardEvent && event.key !== "Enter") return;

    const removeButton = event.target.closest(".cart-discount-remove");
    const discountCode = this.#getDiscountCodeFromEvent(event);
    if(!removeButton || !discountCode) return;

    const existingDiscounts = this.#existingDiscounts();
    const updatedDiscounts = existingDiscounts.filter((code) => code !== discountCode);

    if(updatedDiscounts.length === existingDiscounts.length){
      console.warn("Discount code not found in existing discounts");
      return;
    }

    const abortController = this.#createAbortController();
    let discountRemoved = false;
    removeButton.setAttribute("aria-disabled", "true");
    removeButton.classList.add("loading");
    window.lumeCartStartLoading?.(removeButton);

    try {
      const data = await this.#updateCartDiscount(updatedDiscounts, abortController);
      discountRemoved = true;
      this.#updateCartUI(data);
    } catch (error) {

    } finally {
      this.#activeFetch = null;
      removeButton.setAttribute("aria-disabled", "false");
      removeButton.classList.remove("loading");
      if(discountRemoved) {
        window.lumeCartFinishLoading?.(removeButton);
      } else {
        window.lumeCartResetLoading?.(removeButton);
      }
      this.errorEl?.classList.add('hidden');
    }
  };

  #getDiscountCodeFromEvent(event) {
    const removeButton = event.target.closest(".discount-code");
    if (!removeButton) return null;
    return (removeButton.dataset.code || removeButton.dataset.discountCode || removeButton.closest("[data-discount-code]")?.dataset.discountCode || null);
  }

  #checkShipCode(code, codes){
    const existingDiscounts = this.#existingDiscounts();
    if(!existingDiscounts.includes(code) && codes.find((discount) => { return (discount.code === code && discount.applicable === true);})){
      this.#handleDiscountError('shipping');
    }
  }
  /*** Handles the discount error. */
  #handleDiscountError(type){
    if(!this.errorEl) return;
    if(type == 'shipping'){
      this.errorEl.textContent = cartStrings?.discount_ship;
    } else if(type == 'exist'){
      this.errorEl.textContent = cartStrings?.discount_already;
    } else {
      this.errorEl.textContent = cartStrings?.discount_error;
    }
    this.errorEl.classList.remove('hidden');
  }

  getSectionsToRender(){
    const mainCartItems = document.getElementById('main-cart-items');
    const mainCartFooter = document.getElementById('main-cart-footer');
    const cartDiscount = document.getElementById('cartDiscount');

    if(mainCartItems?.dataset?.id){
        const sections = [
          {
            id: 'main-cart-items',
            section: mainCartItems.dataset.id,
            selector: '.js-contents',
          },
          {
            id: 'cart-icon-bubble',
            section: 'cart-icon-bubble',
            selector: '.shopify-section'
          }
        ];

        if(mainCartFooter?.dataset?.id){
          sections.push({
            id: 'main-cart-footer',
            section: mainCartFooter.dataset.id,
            selector: '.cartTotal',
          });
        }

        if(cartDiscount?.dataset?.id){
          sections.push({
            id: 'cartDiscount',
            section: cartDiscount.dataset.id,
            selector: '.cart-discount__codes',
          });
        }

        return sections;
    }

    const sectionId = this.dataset.id || cartDiscount?.dataset?.id || 'cart-drawer';
    return [
      {
        id: 'CartDrawer',
        section: sectionId,
        selector: '.drawer__inner'
      },
      {
        id: 'cartDiscount',
        section: sectionId,
        selector: '.cart-discount__codes',
      }
    ];
  }

  getSectionInnerHTML(html, selector) {
    return ( new DOMParser().parseFromString(html, "text/html").querySelector(selector)?.innerHTML || "" );
  }
}

if (!customElements.get("cart-discount")){
  customElements.define("cart-discount", CartDiscount);
}

class CartOption extends HTMLElement {
  constructor() {
    super();
    const getKeyboardInset = () => {
      if(!window.visualViewport) return 0;
      const inset = window.innerHeight - (window.visualViewport.height + window.visualViewport.offsetTop);
      return Math.max(0, Math.round(inset));
    };

    const applySheetKeyboardOffset = (sheet) => {
      if(!sheet || !sheet.classList.contains('active')) return;
      const keyboardInset = getKeyboardInset();
      const safeInset = Math.max(0, keyboardInset);
      sheet.style.setProperty('--sls-sheet-kb-inset', `${safeInset}px`);
    };

    const clearSheetKeyboardOffset = (sheet) => {
      if(!sheet) return;
      sheet.style.removeProperty('--sls-sheet-kb-inset');
    };

    const setToolSelectedState = (scopeRoot, selectedButton) => {
      const root = scopeRoot || document;
      root.querySelectorAll('.cftBtn.sls-cart-tool').forEach((button) => {
        const isSelected = Boolean(selectedButton && button === selectedButton);
        button.classList.toggle('is-selected', isSelected);
        button.setAttribute('aria-expanded', isSelected ? 'true' : 'false');
      });
    };

    const setDrawerSheetOpenState = (scopeRoot, isOpen) => {
      const root = scopeRoot || document;
      const drawer = root.closest?.('cart-drawer') || root.querySelector?.('cart-drawer') || document.querySelector('cart-drawer.sls-native-cart.active');
      if(!drawer) return;
      const shouldTrackSheetState = window.matchMedia?.('(max-width: 767px)').matches;
      drawer.classList.toggle('sls-cart-sheet-open', Boolean(isOpen && shouldTrackSheetState));
      drawer.querySelector('#CartDrawer')?.classList.toggle('sls-cart-sheet-open', Boolean(isOpen && shouldTrackSheetState));
    };

    const unbindKeyboardAwareSheet = (sheet) => {
      if(!sheet) return;
      const handler = sheet.__slsKeyboardViewportHandler;
      if(!handler || !window.visualViewport) return;
      window.visualViewport.removeEventListener('resize', handler);
      window.visualViewport.removeEventListener('scroll', handler);
      sheet.__slsKeyboardViewportHandler = null;
      sheet.dataset.slsKeyboardBound = 'false';
    };

    const bindKeyboardAwareSheet = (sheet) => {
      if(!sheet || sheet.dataset.slsKeyboardBound === 'true') return;
      sheet.dataset.slsKeyboardBound = 'true';

      const update = () => applySheetKeyboardOffset(sheet);
      sheet.__slsKeyboardViewportHandler = update;

      if(window.visualViewport) {
        window.visualViewport.addEventListener('resize', update, { passive: true });
        window.visualViewport.addEventListener('scroll', update, { passive: true });
      }

      sheet.addEventListener('transitionend', () => update(), { passive: true });
    };

    const focusSheetInput = (sheet) => {
      if(!sheet) return;
      const field = sheet.querySelector('input:not([type="hidden"]):not([disabled]), textarea:not([disabled])');
      if(!field) return;
      bindKeyboardAwareSheet(sheet);

      const runFocus = () => {
        applySheetKeyboardOffset(sheet);
        try {
          field.focus({ preventScroll: true });
        } catch(e) {
          field.focus();
        }
        if(typeof field.select === 'function' && field.tagName === 'INPUT') {
          try { field.select(); } catch(e) {}
        }
        setTimeout(() => {
          applySheetKeyboardOffset(sheet);
          try {
            field.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'auto' });
          } catch(e) {}
        }, 80);
      };

      runFocus();
      requestAnimationFrame(runFocus);
    };

    const closeAllSheets = (scopeRoot) => {
      const root = scopeRoot || document;
      root.querySelectorAll('.cftDraw.active').forEach((element) => {
        element.classList.remove('active');
        clearSheetKeyboardOffset(element);
        unbindKeyboardAwareSheet(element);
      });
      setToolSelectedState(root, null);
      setDrawerSheetOpenState(root, false);
    };

    const bindSheetBackdropClose = (sheet, scopeRoot) => {
      if(!sheet || sheet.dataset.slsSheetBound === 'true') return;
      sheet.dataset.slsSheetBound = 'true';

      const panel = sheet.querySelector('.sls-cart-sheet__panel');
      if(panel) {
        panel.addEventListener('click', (event) => event.stopPropagation());
        panel.addEventListener('pointerdown', (event) => event.stopPropagation());
      }

      sheet.addEventListener('click', (event) => {
        if(event.target !== sheet) return;
        event.preventDefault();
        closeAllSheets(scopeRoot);
      });
    };

    this.querySelectorAll('.cftBtn').forEach((button) => button.addEventListener("click", function(e){
        e.preventDefault();
        const drawer = this.closest('cart-drawer') || document.querySelector('cart-drawer.sls-native-cart.active');
        const scopeRoot = drawer?.querySelector('.drawer__inner') || drawer || document;
        closeAllSheets(scopeRoot);
        var ftbk = this.hash.substr(1);
        var target = document.getElementById(ftbk);
        this.setAttribute('aria-controls', ftbk);
        if(target) {
          if(ftbk === 'cartNote') hideSlsOrderNoteTip(drawer, true);
          bindSheetBackdropClose(target, scopeRoot);
          target.classList.add("active");
          setToolSelectedState(scopeRoot, this);
          setDrawerSheetOpenState(scopeRoot, true);
          focusSheetInput(target);
        }
    }));

    const scope = this.closest('.drawer__inner') || document;
      scope.querySelectorAll('.saveBtn').forEach((btn) => {
      if(btn.dataset.slsSaveBound === 'true') return;
      btn.dataset.slsSaveBound = 'true';
      btn.addEventListener('click',(e) => {
        e.preventDefault();
        closeAllSheets(scope);
      });
    });

    if(!window.__slsCartSheetFocusoutBound) {
      window.__slsCartSheetFocusoutBound = true;
      document.addEventListener('focusout', (event) => {
        const sheet = event.target?.closest?.('.cftDraw.active');
        if(!sheet) return;
        setTimeout(() => applySheetKeyboardOffset(sheet), 50);
      });
    }
  }
}
if(!customElements.get('cart-option')) customElements.define('cart-option', CartOption);

function startTimer(duration, display, countdown) {
    if(!display || !countdown) return;
    var timer = parseInt(duration, 10);
    if(!Number.isFinite(timer) || timer <= 0) return;

    if(countdown.__slsTimer) clearInterval(countdown.__slsTimer);

    function render() {
        var hours = parseInt(timer / 3600, 10),
            minutes = parseInt((timer % 3600) / 60, 10),
            seconds = parseInt(timer % 60, 10);

        hours = hours < 10 ? "0" + hours : hours;
        minutes = minutes < 10 ? "0" + minutes : minutes;
        seconds = seconds < 10 ? "0" + seconds : seconds;

        display.textContent = hours + ":" + minutes + ":" + seconds;

        if(--timer < 0) {
            clearInterval(countdown.__slsTimer);
            countdown.remove();
        }
    }

    render();
    countdown.__slsTimer = setInterval(render, 1000);
}

function initCartCountdowns(root = document) {
    root.querySelectorAll('.cartCountdown').forEach((countdown) => {
        var duration = countdown.getAttribute('data-countdown'),
            display = countdown.querySelector('[data-sls-countdown-time]') || countdown.querySelector('#cartTime') || countdown;
        startTimer(duration, display, countdown);
    });
}

window.addEventListener('load', () => initCartCountdowns());
document.addEventListener('cart:updated', () => setTimeout(() => initCartCountdowns(), 0));
document.addEventListener('product:added', () => setTimeout(() => initCartCountdowns(), 0));

function lumeParsePositiveQuantity(value) {
  const quantity = parseInt(value, 10);
  return Number.isFinite(quantity) && quantity > 0 ? quantity : null;
}

function lumeGetFormVariantId(form) {
  const input = form ? form.querySelector('input[name="id"], select[name="id"]') : null;
  return input && input.value ? String(input.value) : null;
}

function lumeGetCurrentProductVariantId(form) {
  const sourceForm = form ||
    document.querySelector('product-form form[action*="/cart/add"]') ||
    document.querySelector('form[action*="/cart/add"]');

  return lumeGetFormVariantId(sourceForm);
}

function lumeGetProductScopeFromForm(form, source) {
  const sourceElement = source && source.nodeType === 1 ? source : null;
  const sourceScope = sourceElement && (
    sourceElement.closest('.sls-cart-rec-card') ||
    sourceElement.closest('product-card') ||
    sourceElement.closest('.product-card') ||
    sourceElement.closest('.grid_bx') ||
    sourceElement.closest('.grid-view-item') ||
    sourceElement.closest('.product-item') ||
    sourceElement.closest('.quick_shop') ||
    sourceElement.closest('.qvPopup') ||
    sourceElement.closest('.tingle-modal') ||
    sourceElement.closest('.tingle-modal-box') ||
    sourceElement.closest('.product-single') ||
    sourceElement.closest('sticky-cart') ||
    sourceElement.closest('[id^="shopify-section-"]')
  );

  if(sourceScope) return sourceScope;
  if(!form) return document;

  return (
    form.closest('.sls-cart-rec-card') ||
    form.closest('product-card') ||
    form.closest('.product-card') ||
    form.closest('.grid_bx') ||
    form.closest('.grid-view-item') ||
    form.closest('.product-item') ||
    form.closest('.quick_shop') ||
    form.closest('.qvPopup') ||
    form.closest('.tingle-modal') ||
    form.closest('.tingle-modal-box') ||
    form.closest('.product-single') ||
    form.closest('sticky-cart') ||
    form.closest('[id^="shopify-section-"]') ||
    document
  );
}

function lumeGetFormIdAttribute(form) {
  return form && typeof form.getAttribute === 'function' ? form.getAttribute('id') || '' : '';
}

function lumeIsSingleItemQuickAddContext(form, source) {
  const sourceElement = source && source.nodeType === 1 ? source : null;
  const formId = lumeGetFormIdAttribute(form);
  const quickAddSelector = '.sls-cart-rec-card, product-card, .product-card, .grid_bx, .grid-view-item, .product-item';

  return Boolean(
    /^quickadd-/i.test(formId) ||
    form?.closest?.(quickAddSelector) ||
    sourceElement?.closest?.(quickAddSelector) ||
    sourceElement?.matches?.('.gbtn, .sls-cart-rec-card__add')
  );
}

function lumeGetDesiredAddToCartQuantity(variantId, form, source) {
  if (!form && !source) return null;
  if (lumeIsSingleItemQuickAddContext(form, source)) return 1;

  const currentVariantId = variantId ? String(variantId) : lumeGetCurrentProductVariantId(form);
  const productVariantId = lumeGetCurrentProductVariantId(form);
  const scope = lumeGetProductScopeFromForm(form, source);
  const formId = lumeGetFormIdAttribute(form);
  let desiredQty = null;

  if (form && (!currentVariantId || !productVariantId || String(currentVariantId) === String(productVariantId))) {
    const formQty = lumeParsePositiveQuantity(form.querySelector('input[name="quantity"]')?.value);
    if (formQty) desiredQty = Math.max(desiredQty || 0, formQty);

    if (formId) {
      document.querySelectorAll('input[name="quantity"][form="' + formId + '"]').forEach(function (input) {
        const externalFormQty = lumeParsePositiveQuantity(input.value);
        if (externalFormQty) desiredQty = Math.max(desiredQty || 0, externalFormQty);
      });
    }
  }

  scope.querySelectorAll('.lume-bundle-qty[data-lume-bundle-qty]').forEach(function (bundle) {
    const bundleVariantId = bundle.dataset.lumeSelectedVariantId;
    const bundleQty = lumeParsePositiveQuantity(bundle.dataset.lumeSelectedQty);

    if (!bundleQty) return;
    if (currentVariantId && bundleVariantId && String(bundleVariantId) !== currentVariantId) return;

    desiredQty = Math.max(desiredQty || 0, bundleQty);
  });

  scope.querySelectorAll('sticky-cart [data-sticky-qty-input], [data-sticky-qty-input]').forEach(function (input) {
    const stickyQty = lumeParsePositiveQuantity(input.value);
    if (variantId && productVariantId && String(variantId) !== String(productVariantId)) return;
    if (stickyQty) desiredQty = Math.max(desiredQty || 0, stickyQty);
  });

  return desiredQty;
}

function lumeGetGuardedAddToCartQuantity(variantId, form, source, currentQuantity) {
  if (lumeIsSingleItemQuickAddContext(form, source)) return 1;

  const desiredQty = lumeGetDesiredAddToCartQuantity(variantId, form, source);
  const bodyQty = lumeParsePositiveQuantity(currentQuantity);

  if (desiredQty && bodyQty) return Math.max(desiredQty, bodyQty);
  return desiredQty || bodyQty;
}

function lumeApplyQuantityToForm(form, quantity) {
  if (!form || !quantity) return;

  const inputs = Array.from(form.querySelectorAll('input[name="quantity"]'));
  const formId = lumeGetFormIdAttribute(form);

  if (formId) {
    document.querySelectorAll('input[name="quantity"][form="' + formId + '"]').forEach(function (input) {
      if (!inputs.includes(input)) inputs.push(input);
    });
  }

  if (!inputs.length) {
    const hidden = document.createElement('input');
    hidden.type = 'hidden';
    hidden.name = 'quantity';
    form.appendChild(hidden);
    inputs.push(hidden);
  }

  inputs.forEach(function (input) {
    input.removeAttribute('max');
    input.removeAttribute('data-max');
    input.value = String(quantity);
    input.defaultValue = String(quantity);
    input.setAttribute('value', String(quantity));
  });
}

function lumeIsIsolatedCartAddContext(form, source) {
  const sourceElement = source && source.nodeType === 1 ? source : null;
  const isolatedSelector = 'cart-drawer, .sls-cart-rec-card, product-card, .product-card, .grid_bx, .grid-view-item, .product-item, .quick_shop, .qvPopup, .tingle-modal, .tingle-modal-box, quick-add-modal';
  return Boolean(
    form?.closest?.(isolatedSelector) ||
    sourceElement?.closest?.(isolatedSelector)
  );
}

function lumeNormalizeVariantIdForBody(variantId) {
  const value = String(variantId || '').trim();
  return /^\d+$/.test(value) ? Number(value) : value;
}

function lumeGetForcedAddToCartVariantId(form, source, submittedVariantId) {
  const formVariantId = lumeGetFormVariantId(form);
  if (!formVariantId || !lumeIsIsolatedCartAddContext(form, source)) return null;
  if (submittedVariantId && String(submittedVariantId) === formVariantId) return null;
  return formVariantId;
}

function lumeGetIsolatedQuantityScope(form, source) {
  const sourceElement = source && source.nodeType === 1 ? source : null;
  const scopeSelector = 'cart-drawer, .sls-cart-rec-card, product-card, .product-card, .grid_bx, .grid-view-item, .product-item, .quick_shop, .qvPopup, .tingle-modal, .tingle-modal-box, quick-add-modal, .product-single, sticky-cart, [id^="shopify-section-"]';

  return (
    sourceElement?.closest?.(scopeSelector) ||
    form?.closest?.(scopeSelector) ||
    document
  );
}

function lumeAddUniqueQuantityInput(inputs, input) {
  if (input && !input.disabled && !inputs.includes(input)) inputs.push(input);
}

function lumeGetFormQuantitySelector(form) {
  const formId = lumeGetFormIdAttribute(form);
  if (!formId) return null;
  return 'input[name="quantity"][form="' + String(formId).replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"]';
}

function lumeIsVisibleQuantityInput(input) {
  if (!input || input.type === 'hidden') return false;
  return Boolean(input.offsetWidth || input.offsetHeight || input.getClientRects().length);
}

function lumeGetAssociatedAddQuantityInputs(form, source) {
  const inputs = [];
  const scope = lumeGetIsolatedQuantityScope(form, source);
  const externalSelector = lumeGetFormQuantitySelector(form);

  form?.querySelectorAll?.('input[name="quantity"]').forEach(function (input) {
    lumeAddUniqueQuantityInput(inputs, input);
  });

  if (externalSelector) {
    (scope && scope !== document ? scope : document).querySelectorAll(externalSelector).forEach(function (input) {
      lumeAddUniqueQuantityInput(inputs, input);
    });

    document.querySelectorAll(externalSelector).forEach(function (input) {
      lumeAddUniqueQuantityInput(inputs, input);
    });
  }

  if (scope && scope !== document) {
    const formId = lumeGetFormIdAttribute(form);
    scope.querySelectorAll('input[name="quantity"], .quantity__input[name="quantity"], quantity-input input[name="quantity"]').forEach(function (input) {
      if (form && input.form !== form && input.getAttribute('form') !== formId && !form.contains(input)) return;
      lumeAddUniqueQuantityInput(inputs, input);
    });
  }

  return inputs.slice().sort(function (a, b) {
    return Number(lumeIsVisibleQuantityInput(b)) - Number(lumeIsVisibleQuantityInput(a));
  });
}

function lumeGetIsolatedCartAddQuantity(form, source, currentQuantity) {
  if (lumeIsSingleItemQuickAddContext(form, source)) return 1;

  const sortedInputs = lumeGetAssociatedAddQuantityInputs(form, source);

  for (const input of sortedInputs) {
    const quantity = lumeParsePositiveQuantity(input.value);
    if (quantity) return quantity;
  }

  return lumeParsePositiveQuantity(currentQuantity) || 1;
}

function lumeGetCartQuantityForAddVariant(variantId, form, source) {
  const inputs = lumeGetAssociatedAddQuantityInputs(form, source);

  for (const input of inputs) {
    const cartQuantity = parseInt(input.dataset.cartQuantity || input.getAttribute('data-cart-quantity'), 10);
    if (Number.isFinite(cartQuantity) && cartQuantity >= 0) return cartQuantity;
  }

  return 0;
}

function lumeGetVariantInventoryFromScope(variantId, form, source) {
  const id = String(variantId || '').trim();
  if (!id) return null;

  const scope = lumeGetIsolatedQuantityScope(form, source);
  const roots = [];
  if (scope && scope !== document) roots.push(scope);
  roots.push(document);

  for (const root of roots) {
    const stockEl = root.querySelector?.('.prvQty');
    if (!stockEl) continue;

    const rawStock = stockEl.getAttribute('data-v' + id);
    if (rawStock === null) continue;

    const stock = parseInt(rawStock, 10);
    if (!Number.isFinite(stock)) continue;

    return {
      stock: stock,
      management: stockEl.getAttribute('data-management-v' + id) || '',
      policy: stockEl.getAttribute('data-policy-v' + id) || ''
    };
  }

  return null;
}

function lumeGetVariantDataFromScope(variantId, form, source) {
  const id = String(variantId || '').trim();
  if (!id) return null;

  const scope = lumeGetIsolatedQuantityScope(form, source);
  const roots = [];
  if (scope && scope !== document) roots.push(scope);
  roots.push(document);

  for (const root of roots) {
    const scripts = Array.from(root.querySelectorAll?.('variant-selects script[type="application/json"], script[id^="variants"][type="application/json"]') || []);

    for (const script of scripts) {
      try {
        const variants = JSON.parse(script.textContent || '[]');
        if (!Array.isArray(variants)) continue;

        const variant = variants.find(function (item) {
          return String(item && item.id) === id;
        });

        if (variant) return variant;
      } catch (error) {
        continue;
      }
    }
  }

  return null;
}

function lumeGetInventoryCappedAddQuantity(variantId, form, source, requestedQuantity) {
  const requested = lumeParsePositiveQuantity(requestedQuantity);
  if (!requested) return requestedQuantity;

  const inventory = lumeGetVariantInventoryFromScope(variantId, form, source);
  if (!inventory) return requested;

  const variantData = lumeGetVariantDataFromScope(variantId, form, source);
  const management = inventory.management || variantData?.inventory_management || '';
  const policy = inventory.policy || variantData?.inventory_policy || '';

  if (management !== 'shopify' || policy === 'continue') return requested;
  if (!Number.isFinite(inventory.stock) || inventory.stock < 1) return requested;

  return Math.min(requested, inventory.stock);
}

function lumeGetAvailabilityLimitFromCartAddError(data) {
  const raw = [data?.description, data?.message, data?.errors]
    .filter(Boolean)
    .join(' ')
    .trim();

  if (!raw) return null;

  const patterns = [
    /\bonly\s+(\d+)\s+items?\s+were\s+added\b/i,
    /\bonly\s+(\d+)\s+(?:items?|units?)\b/i,
    /\bonly\s+(\d+)\s+(?:available|left|in stock)\b/i,
    /\bmaximum\s+quantity\s+of\s+(?:this\s+item\s+is\s+)?(\d+)\b/i
  ];

  for (const pattern of patterns) {
    const match = raw.match(pattern);
    const parsed = match ? parseInt(match[1], 10) : NaN;
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }

  return null;
}

function lumeIsAvailabilityCartAddError(data) {
  const raw = [data?.description, data?.message, data?.errors]
    .filter(Boolean)
    .join(' ')
    .trim();

  return /available|availability|stock|maximum quantity|already in your cart|only\s+\d+/i.test(raw);
}

function lumeFormatPartialAvailabilityAddMessage(addedQuantity, beforeQuantity, afterQuantity) {
  const added = Number.isFinite(addedQuantity) ? addedQuantity : null;
  const before = Number.isFinite(beforeQuantity) ? beforeQuantity : null;
  const after = Number.isFinite(afterQuantity) ? afterQuantity : null;

  if (!added || added < 1) return false;

  const itemLabel = added === 1 ? 'item' : 'items';
  if (before && before > 0 && after && after > before) {
    return `Only ${added} more ${itemLabel} could be added. You now have ${after} in your cart.`;
  }

  return `Only ${added} ${itemLabel} ${added === 1 ? 'was' : 'were'} added to your cart due to availability.`;
}

function lumeGetCartAddLineFromBody(body) {
  if (!body) return null;

  if (typeof FormData !== 'undefined' && body instanceof FormData) {
    return {
      id: body.get('id'),
      quantity: lumeParsePositiveQuantity(body.get('quantity')) || 1
    };
  }

  if (typeof URLSearchParams !== 'undefined' && body instanceof URLSearchParams) {
    return {
      id: body.get('id'),
      quantity: lumeParsePositiveQuantity(body.get('quantity')) || 1
    };
  }

  if (typeof body !== 'string') return null;

  const trimmedBody = body.trim();

  if (trimmedBody.charAt(0) === '{' || trimmedBody.charAt(0) === '[') {
    try {
      const parsed = JSON.parse(trimmedBody);
      const item = Array.isArray(parsed)
        ? parsed[0]
        : Array.isArray(parsed?.items)
          ? parsed.items[0]
          : parsed;

      if (!item || typeof item !== 'object') return null;

      return {
        id: item.id,
        quantity: lumeParsePositiveQuantity(item.quantity) || 1
      };
    } catch (error) {
      return null;
    }
  }

  try {
    const params = new URLSearchParams(body);
    return {
      id: params.get('id'),
      quantity: lumeParsePositiveQuantity(params.get('quantity')) || 1
    };
  } catch (error) {
    return null;
  }
}

function lumeCloneParamsWithQuantity(params, quantity) {
  const next = new URLSearchParams(params);
  next.set('quantity', String(quantity));
  return next;
}

function lumeCloneCartAddBodyWithQuantity(body, quantity) {
  if (!body) return null;

  if (typeof FormData !== 'undefined' && body instanceof FormData) {
    const next = new FormData();
    body.forEach(function (value, key) {
      if (key !== 'quantity') {
        next.append(key, value);
      }
    });
    next.set('quantity', String(quantity));
    return next;
  }

  if (typeof URLSearchParams !== 'undefined' && body instanceof URLSearchParams) {
    return lumeCloneParamsWithQuantity(body, quantity);
  }

  if (typeof body !== 'string') return null;

  const trimmedBody = body.trim();

  if (trimmedBody.charAt(0) === '{' || trimmedBody.charAt(0) === '[') {
    try {
      const parsed = JSON.parse(trimmedBody);
      const item = Array.isArray(parsed)
        ? parsed[0]
        : Array.isArray(parsed?.items)
          ? parsed.items[0]
          : parsed;

      if (!item || typeof item !== 'object') return null;

      item.quantity = quantity;
      return JSON.stringify(parsed);
    } catch (error) {
      return null;
    }
  }

  try {
    return lumeCloneParamsWithQuantity(new URLSearchParams(body), quantity).toString();
  } catch (error) {
    return null;
  }
}

function lumeStripAovBundleProperty(target) {
  if (!target || typeof target !== 'object' || !target.properties || typeof target.properties !== 'object') return false;
  if (!Object.prototype.hasOwnProperty.call(target.properties, '_aov_bundles')) return false;
  delete target.properties._aov_bundles;
  if (!Object.keys(target.properties).length) delete target.properties;
  return true;
}

function lumeStripAovBundlePropertyFromParams(params) {
  if (!params || typeof params.delete !== 'function' || typeof params.has !== 'function') return false;
  const hadAovProperty = params.has('properties[_aov_bundles]') || params.has('_aov_bundles');
  params.delete('properties[_aov_bundles]');
  params.delete('_aov_bundles');
  return hadAovProperty;
}

function lumeShouldPreserveAovBundlePayload(form, source) {
  if (!form || !form.isConnected) return false;
  if (lumeIsIsolatedCartAddContext(form, source)) return false;

  const scope = lumeGetProductScopeFromForm(form, source);
  const hasBundleUi = Boolean(
    scope?.querySelector?.('.Avada-Bundle-Volume__Container, .lume-bundle-qty[data-lume-bundle-qty]')
  );

  if (!hasBundleUi) return false;

  const submittedVariantId = lumeGetFormVariantId(form);
  const productVariantId = lumeGetCurrentProductVariantId(form);
  return !submittedVariantId || !productVariantId || String(submittedVariantId) === String(productVariantId);
}

function lumeForceSubmittedVariant(target, form, source) {
  if (!target || typeof target !== 'object') return false;
  const forcedVariantId = lumeGetForcedAddToCartVariantId(form, source, target.id);
  if (!forcedVariantId) return false;
  target.id = lumeNormalizeVariantIdForBody(forcedVariantId);
  lumeStripAovBundleProperty(target);
  return true;
}

function lumeForceSubmittedVariantInParams(params, form, source) {
  const forcedVariantId = lumeGetForcedAddToCartVariantId(form, source, params.get('id'));
  if (!forcedVariantId) return false;
  params.set('id', forcedVariantId);
  lumeStripAovBundlePropertyFromParams(params);
  return true;
}

function lumeSetIsolatedCartAddQuantityInParams(params, form, source) {
  if (!lumeIsIsolatedCartAddContext(form, source)) return false;
  const variantId = params.get('id');
  const quantity = lumeGetInventoryCappedAddQuantity(
    variantId,
    form,
    source,
    lumeGetIsolatedCartAddQuantity(form, source, params.get('quantity'))
  );
  const changed = String(params.get('quantity') || '') !== String(quantity);
  const hadAovProperty = lumeStripAovBundlePropertyFromParams(params);
  if (changed) params.set('quantity', String(quantity));
  return changed || hadAovProperty;
}

function lumeGuardCartAddBody(body, form, source) {
  if (!body) return body;

  const preserveAovBundlePayload = lumeShouldPreserveAovBundlePayload(form, source);

  if (typeof FormData !== 'undefined' && body instanceof FormData) {
    if (!preserveAovBundlePayload) lumeStripAovBundlePropertyFromParams(body);
    const forced = lumeForceSubmittedVariantInParams(body, form, source);
    const isolatedQtyChanged = lumeSetIsolatedCartAddQuantityInParams(body, form, source);
    if (forced || isolatedQtyChanged) return body;
    const variantId = body.get('id');
    const desiredQty = lumeGetInventoryCappedAddQuantity(
      variantId,
      form,
      source,
      lumeGetGuardedAddToCartQuantity(variantId, form, source, body.get('quantity'))
    );
    if (desiredQty) body.set('quantity', String(desiredQty));
    return body;
  }

  if (typeof URLSearchParams !== 'undefined' && body instanceof URLSearchParams) {
    if (!preserveAovBundlePayload) lumeStripAovBundlePropertyFromParams(body);
    const forced = lumeForceSubmittedVariantInParams(body, form, source);
    const isolatedQtyChanged = lumeSetIsolatedCartAddQuantityInParams(body, form, source);
    if (forced || isolatedQtyChanged) return body;
    const variantId = body.get('id');
    const desiredQty = lumeGetInventoryCappedAddQuantity(
      variantId,
      form,
      source,
      lumeGetGuardedAddToCartQuantity(variantId, form, source, body.get('quantity'))
    );
    if (desiredQty) body.set('quantity', String(desiredQty));
    return body;
  }

  if (typeof body !== 'string') return body;

  const trimmedBody = body.trim();

  if (trimmedBody.charAt(0) === '{' || trimmedBody.charAt(0) === '[') {
    try {
      const parsed = JSON.parse(trimmedBody);
      let changed = false;

      if (Array.isArray(parsed)) {
        parsed.forEach(function (item) {
          if (!item || typeof item !== 'object') return;
          const forced = lumeForceSubmittedVariant(item, form, source);
          if (!preserveAovBundlePayload && lumeStripAovBundleProperty(item)) changed = true;
          if (lumeIsIsolatedCartAddContext(form, source)) {
            const isolatedQty = lumeGetInventoryCappedAddQuantity(
              item.id,
              form,
              source,
              lumeGetIsolatedCartAddQuantity(form, source, item.quantity)
            );
            if (item.quantity !== isolatedQty) {
              item.quantity = isolatedQty;
              changed = true;
            }
            if (forced) changed = true;
            return;
          }
          const desiredQty = lumeGetInventoryCappedAddQuantity(
            item.id,
            form,
            source,
            lumeGetGuardedAddToCartQuantity(item.id, form, source, item.quantity)
          );
          if (desiredQty) {
            item.quantity = desiredQty;
            changed = true;
          }
        });
      } else if (parsed && typeof parsed === 'object' && Array.isArray(parsed.items)) {
        parsed.items.forEach(function (item) {
          if (!item || typeof item !== 'object') return;
          const forced = lumeForceSubmittedVariant(item, form, source);
          if (!preserveAovBundlePayload && lumeStripAovBundleProperty(item)) changed = true;
          if (lumeIsIsolatedCartAddContext(form, source)) {
            const isolatedQty = lumeGetInventoryCappedAddQuantity(
              item.id,
              form,
              source,
              lumeGetIsolatedCartAddQuantity(form, source, item.quantity)
            );
            if (item.quantity !== isolatedQty) {
              item.quantity = isolatedQty;
              changed = true;
            }
            if (forced) changed = true;
            return;
          }
          const desiredQty = lumeGetInventoryCappedAddQuantity(
            item.id,
            form,
            source,
            lumeGetGuardedAddToCartQuantity(item.id, form, source, item.quantity)
          );
          if (desiredQty) {
            item.quantity = desiredQty;
            changed = true;
          }
        });
      } else if (parsed && typeof parsed === 'object') {
        const forced = lumeForceSubmittedVariant(parsed, form, source);
        if (!preserveAovBundlePayload && lumeStripAovBundleProperty(parsed)) changed = true;
        if (lumeIsIsolatedCartAddContext(form, source)) {
          const isolatedQty = lumeGetInventoryCappedAddQuantity(
            parsed.id,
            form,
            source,
            lumeGetIsolatedCartAddQuantity(form, source, parsed.quantity)
          );
          if (parsed.quantity !== isolatedQty) {
            parsed.quantity = isolatedQty;
            changed = true;
          }
          if (forced) changed = true;
        } else {
          const desiredQty = lumeGetInventoryCappedAddQuantity(
            parsed.id,
            form,
            source,
            lumeGetGuardedAddToCartQuantity(parsed.id, form, source, parsed.quantity)
          );
          if (desiredQty) {
            parsed.quantity = desiredQty;
            changed = true;
          }
        }
        if (forced) {
          changed = true;
        }
      }

      if (changed) return JSON.stringify(parsed);
    } catch (error) {
      return body;
    }
  }

  try {
    const params = new URLSearchParams(body);
    const strippedAovProperty = preserveAovBundlePayload ? false : lumeStripAovBundlePropertyFromParams(params);
    const changed = lumeForceSubmittedVariantInParams(params, form, source);
    const isolatedQtyChanged = lumeSetIsolatedCartAddQuantityInParams(params, form, source);
    if (changed || isolatedQtyChanged) return params.toString();
    const variantId = params.get('id');
    const desiredQty = lumeGetInventoryCappedAddQuantity(
      variantId,
      form,
      source,
      lumeGetGuardedAddToCartQuantity(variantId, form, source, params.get('quantity'))
    );
    if (desiredQty) {
      params.set('quantity', String(desiredQty));
      return params.toString();
    }
    if (strippedAovProperty) return params.toString();
  } catch (error) {
    return body;
  }

  return body;
}

(function () {
  if (window.__lumeCartAddQuantityGuard || typeof window.fetch !== 'function') return;
  window.__lumeCartAddQuantityGuard = true;

  const nativeFetch = window.fetch;
  let lastSubmitContext = null;

  function isCartAddRequest(input) {
    const url = typeof input === 'string' ? input : input && input.url;
    return !!url && /\/cart\/add(?:\.js)?(?:[/?#]|$)/i.test(url);
  }

  function normalizeCartAddUrl(url, preserveAovBundleApp) {
    if (preserveAovBundleApp || typeof url !== 'string' || !/[?&]app=aov-ai-bundle(?:&|$)/i.test(url)) return url;

    try {
      const parsed = new URL(url, window.location.origin);
      const isRelative = !/^[a-z][a-z0-9+.-]*:/i.test(url);
      parsed.searchParams.delete('app');
      return isRelative ? `${parsed.pathname}${parsed.search}${parsed.hash}` : parsed.href;
    } catch (error) {
      return url
        .replace(/([?&])app=aov-ai-bundle&/i, '$1')
        .replace(/[?&]app=aov-ai-bundle(?:#|$)/i, function (match) {
          return match.endsWith('#') ? '#' : '';
        });
    }
  }

  function normalizeCartAddInput(input, preserveAovBundleApp) {
    if (typeof input === 'string') return normalizeCartAddUrl(input, preserveAovBundleApp);
    return input;
  }

  function getCartJsonUrl() {
    const cartUrl = window.routes?.cart_url || '/cart';
    return /\.js(?:[?#]|$)/i.test(cartUrl) ? cartUrl : `${cartUrl}.js`;
  }

  function getLiveCartQuantityForVariant(variantId) {
    const id = String(variantId || '').trim();
    if (!id) return Promise.resolve(0);

    return nativeFetch(getCartJsonUrl(), { credentials: 'same-origin' })
      .then(function (cartResponse) {
        if (!cartResponse.ok) throw new Error('Unable to fetch cart');
        return cartResponse.json();
      })
      .then(function (cart) {
        return (cart.items || []).reduce(function (total, item) {
          const itemVariantId = item.variant_id || item.id;
          if (String(itemVariantId || '') !== id) return total;
          return total + (lumeParsePositiveQuantity(item.quantity) || 0);
        }, 0);
      });
  }

  function retryAvailabilityLimitedCartAdd(input, init, response, guardedBody, context) {
    if (!response || response.ok || !guardedBody) return Promise.resolve(response);

    return response.clone().json().then(function (data) {
      const limit = lumeGetAvailabilityLimitFromCartAddError(data);
      const line = lumeGetCartAddLineFromBody(guardedBody);

      if (!limit || !line?.id || !line.quantity) return response;

      return getLiveCartQuantityForVariant(line.id).then(function (cartQuantity) {
        const fallbackCartQuantity = lumeGetCartQuantityForAddVariant(line.id, context && context.form, context && context.source);
        const knownCartQuantity = Number.isFinite(cartQuantity) ? cartQuantity : fallbackCartQuantity;
        const remainingQuantity = limit - knownCartQuantity;

        if (!Number.isFinite(remainingQuantity) || remainingQuantity < 1 || remainingQuantity >= line.quantity) {
          return response;
        }

        const retryBody = lumeCloneCartAddBodyWithQuantity(guardedBody, remainingQuantity);
        if (!retryBody) return response;

        const retryInit = Object.assign({}, init || {}, { body: retryBody });
        const retryInput = normalizeCartAddInput(input, lumeShouldPreserveAovBundlePayload(context && context.form, context && context.source));

        return nativeFetch(retryInput, retryInit).then(function (retryResponse) {
          if (retryResponse.ok) {
            document.dispatchEvent(new CustomEvent('cart:updated'));
            document.dispatchEvent(new CustomEvent('product:added'));
          }

          return retryResponse;
        });
      });
    }).catch(function () {
      return response;
    });
  }

  function setSubmitContext(form, source) {
    if (!form || !/\/cart\/add/i.test(form.getAttribute('action') || '')) return;
    lastSubmitContext = {
      form: form,
      source: source || form,
      time: Date.now()
    };
  }

  function getSubmitContext() {
    if (!lastSubmitContext || Date.now() - lastSubmitContext.time > 1800) return null;
    if (!lastSubmitContext.form || !lastSubmitContext.form.isConnected) return null;
    return lastSubmitContext;
  }

  document.addEventListener('submit', function (event) {
    setSubmitContext(event.target, event.submitter);
  }, true);

  document.addEventListener('click', function (event) {
    const button = event.target.closest && event.target.closest('button[name="add"], button[type="submit"], input[type="submit"]');
    if (!button) return;

    const formId = button.getAttribute('form');
    const form = formId ? document.getElementById(formId) : button.closest('form');
    setSubmitContext(form, button);
  }, true);

  window.fetch = function (input, init) {
    if (isCartAddRequest(input)) {
      const context = getSubmitContext();
      const preserveAovBundleApp = lumeShouldPreserveAovBundlePayload(context && context.form, context && context.source);

      if (init && init.body) {
        const guardedBody = lumeGuardCartAddBody(init.body, context && context.form, context && context.source);
        init = Object.assign({}, init, {
          body: guardedBody
        });
        input = normalizeCartAddInput(input, preserveAovBundleApp);
        return nativeFetch(input, init).then(function (response) {
          return retryAvailabilityLimitedCartAdd(input, init, response, guardedBody, context);
        });
      } else if (typeof Request !== 'undefined' && input instanceof Request && input.bodyUsed === false) {
        return input.clone().formData().then(function (formData) {
          const guardedBody = lumeGuardCartAddBody(formData, context && context.form, context && context.source);
          const normalizedUrl = normalizeCartAddUrl(input.url, preserveAovBundleApp);
          return nativeFetch(new Request(normalizedUrl, {
            method: input.method,
            headers: input.headers,
            mode: input.mode,
            credentials: input.credentials,
            cache: input.cache,
            redirect: input.redirect,
            referrer: input.referrer,
            referrerPolicy: input.referrerPolicy,
            integrity: input.integrity,
            keepalive: input.keepalive,
            signal: input.signal,
            body: guardedBody
          })).then(function (response) {
            return retryAvailabilityLimitedCartAdd(normalizedUrl, { body: guardedBody }, response, guardedBody, context);
          });
        }).catch(function () {
          return nativeFetch(input, init);
        });
      }
    }

    return nativeFetch(input, init);
  };

  if (typeof XMLHttpRequest !== 'undefined') {
    const nativeOpen = XMLHttpRequest.prototype.open;
    const nativeSend = XMLHttpRequest.prototype.send;

    XMLHttpRequest.prototype.open = function (method, url) {
      this.__lumeCartAddUrl = url;
      if (isCartAddRequest(url)) {
        const context = getSubmitContext();
        arguments[1] = normalizeCartAddUrl(
          url,
          lumeShouldPreserveAovBundlePayload(context && context.form, context && context.source)
        );
      }
      return nativeOpen.apply(this, arguments);
    };

    XMLHttpRequest.prototype.send = function (body) {
      if (isCartAddRequest(this.__lumeCartAddUrl)) {
        const context = getSubmitContext();
        body = lumeGuardCartAddBody(body, context && context.form, context && context.source);
      }

      return nativeSend.call(this, body);
    };
  }
})();

const LUME_QUICK_ADD_CONFIRM_DELAY = 1050;
const LUME_QUICK_ADD_SUCCESS_RESET_DELAY = 1300;

if(!customElements.get('product-form')) {
  customElements.define('product-form', class ProductForm extends HTMLElement {
      constructor() {
        super();
        this.form = this.querySelector('form');
        if(!this.form) return;
        const variantInput = this.form.querySelector('[name=id]');
        if(variantInput) variantInput.disabled = false;
        this.form.addEventListener('submit', this.onSubmitHandler.bind(this));
        this.cart =
          this.closest('cart-drawer') ||
          document.querySelector('cart-notification') ||
          document.querySelector('cart-drawer');
        this.submitButton = this.querySelector('[type="submit"]');

        if(document.querySelector('cart-drawer')) this.submitButton.setAttribute('aria-haspopup', 'dialog');

        this.hideErrors = this.dataset.hideErrors === 'true';
      }

      onSubmitHandler(evt){
        evt.preventDefault();
        if(this.submitButton.getAttribute('aria-disabled') === 'true') return;

        if(!this.closest('cart-drawer') && !shouldSlsAutoOpenOnAdd()) clearSlsManualCartOpenIntent();
        this.handleErrorMessage();

        const useLumeAtcAnimation =
          this.submitButton.classList.contains('lume-atc-animated') ||
          this.submitButton.querySelector('.lume-atc-status');
        const loadingSpinner = this.querySelector('.loading__spinner');

        this.submitButton.setAttribute('aria-disabled', true);
        if(!useLumeAtcAnimation) {
          this.submitButton.classList.add('loading');
          if(loadingSpinner) loadingSpinner.classList.remove('hidden');
        }

        const config = fetchConfig('javascript');
        config.headers['X-Requested-With'] = 'XMLHttpRequest';
        delete config.headers['Content-Type'];

        const desiredQty = lumeGetDesiredAddToCartQuantity(this.form.querySelector('[name="id"]')?.value, this.form, evt.submitter);
        if (desiredQty) lumeApplyQuantityToForm(this.form, desiredQty);

        const formData = new FormData(this.form);
        if (desiredQty) formData.set('quantity', String(desiredQty));
        lumeGuardCartAddBody(formData, this.form, evt.submitter);

        if(this.cart) {
          formData.append('sections', this.cart.getSectionsToRender().map((section) => section.id));
          formData.append('sections_url', window.location.pathname);
          this.cart.setActiveElement(document.activeElement);
        }
        config.body = formData;

        const submittedVariantId = String(formData.get('id') || '').trim();
        const submittedQuantity = lumeParsePositiveQuantity(formData.get('quantity')) || 1;
        const cartQuantityBeforeAddPromise = submittedQuantity > 1
          ? this.getCartQuantityBeforeAdd(submittedVariantId)
          : Promise.resolve(null);

        cartQuantityBeforeAddPromise
          .then(() => fetch(`${routes.cart_add_url}`, config))
          .then((response) => response.json())
          .then((response) => {
            if(response.status) {
              return this.recoverPartialAvailabilityAdd(response, formData, cartQuantityBeforeAddPromise).then((partialResponse) => {
                if(partialResponse) return partialResponse;

                publish(PUB_SUB_EVENTS.cartError, {
                  source: 'product-form',
                  productVariantId: formData.get('id'),
                  errors: response.errors || response.description,
                  message: response.message,
                });
                document.dispatchEvent(new CustomEvent('cart:error'));
                this.handleErrorMessage(response.description);

                const soldOutMessage = this.submitButton.querySelector('.sold-out-message');
                if(!soldOutMessage) return null;
                this.submitButton.setAttribute('aria-disabled', true);
                const soldOutButtonText =
                  this.submitButton.querySelector('.txt') ||
                  this.submitButton.querySelector('.lume-atc-existing-content > span:not(.sold-out-message)') ||
                  this.submitButton.querySelector('span:not(.lume-atc-existing-content):not(.lume-atc-status):not(.sold-out-message)');
                if(soldOutButtonText) soldOutButtonText.classList.add('hidden');
                soldOutMessage.classList.remove('hidden');
                this.error = true;
                return null;
              });
            }

            this.finishAddToCartButton();
            return this.prepareCartAddResponse(response);
          })
          .then((response) => {
            if(!response) return;

            if(!this.cart) {
              fetch(`${routes.cart_url}.js`)
                .then((response) => {
                  if(!response.ok) throw new Error('Cart fetch failed');
                  return response.json();
                })
                .then((cart) => {
                  const bubble = document.getElementById('cart-icon-bubble');
                  if(bubble) {
                    bubble.textContent = cart.item_count || 0;
                    bubble.classList.toggle('hidden', (cart.item_count || 0) < 1);
                    bubble.classList.toggle('hide', (cart.item_count || 0) < 1);
                  }
                  document.dispatchEvent(new CustomEvent('cart:updated'));
                  document.dispatchEvent(new CustomEvent('product:added'));
                  if(shouldSlsAutoOpenOnAdd()) this.openCartFallback();
                })
                .catch((e) => {
                  console.error(e);
                  document.dispatchEvent(new CustomEvent('cart:error'));
                  const shouldAutoOpenOnError = shouldSlsAutoOpenOnAdd();
                  if(shouldAutoOpenOnError && window.SLSCartDrawer && typeof window.SLSCartDrawer.open === 'function') {
                    window.SLSCartDrawer.open(document.activeElement).catch((error) => {
                      console.error('Studio Lume cart drawer could not open after add to cart.', error);
                    });
                  } else if(shouldAutoOpenOnError) {
                    console.error('Studio Lume cart drawer opener is unavailable after add to cart.');
                  }
                });
              return;
            }

            this.error = false;
            const isCartDrawerForm = Boolean(this.closest('cart-drawer'));
            const quickAddModal = this.closest('quick-add-modal');
            const tingleQuickAddModal = this.getQuickAddTingleModal();
            const quickAddConfirmDelay = useLumeAtcAnimation ? LUME_QUICK_ADD_CONFIRM_DELAY : 0;

            this.renderCartContents(response);
            if(!isCartDrawerForm) {
              if(quickAddModal) {
                setTimeout(() => {
                  quickAddModal.hide(true);
                }, quickAddConfirmDelay);
              } else if(tingleQuickAddModal) {
                setTimeout(() => {
                  this.closeTingleModal(tingleQuickAddModal);
                }, quickAddConfirmDelay);
              }
            }

            if(!this.error)
              publish(PUB_SUB_EVENTS.cartUpdate, {
                source: 'product-form',
                productVariantId: formData.get('id'),
                cartData: response,
              });
            if(!this.error) {
              const recommendationCard = this.closest('.sls-cart-rec-card');
              const recommendationProductId = String(
                this.form?.dataset?.slsProductId ||
                recommendationCard?.dataset?.slsProductId ||
                ''
              ).trim();
              if(recommendationProductId) {
                document.dispatchEvent(new CustomEvent('sls:recommendation-added', {
                  detail: {
                    productId: recommendationProductId,
                    variantId: String(formData.get('id') || '')
                  }
                }));
              }
              document.dispatchEvent(new CustomEvent('cart:updated'));
              document.dispatchEvent(new CustomEvent('product:added'));
            }
          })
          .catch((e) => {
            console.error(e);
            document.dispatchEvent(new CustomEvent('cart:error'));
          })
          .finally(() => {
            if(!useLumeAtcAnimation) {
              this.submitButton.classList.remove('loading');
              if(loadingSpinner) loadingSpinner.classList.add('hidden');
            }
            if(this.cart && this.cart.classList.contains('is-empty')) this.cart.classList.remove('is-empty');
            if(!this.error) this.submitButton.removeAttribute('aria-disabled');
            freeShippMsg();cartTerms();
          });
      }

      getCartQuantityBeforeAdd(variantId) {
        const id = String(variantId || '').trim();
        if(!id) return Promise.resolve(null);

        return fetchSlsCartJson()
          .then((cartData) => getSlsCartQuantityForVariant(cartData, id))
          .catch(() => null);
      }

      recoverPartialAvailabilityAdd(response, formData, beforeQuantityPromise) {
        if(!lumeIsAvailabilityCartAddError(response)) return Promise.resolve(null);

        const variantId = String(formData.get('id') || '').trim();
        if(!variantId) return Promise.resolve(null);

        return Promise.resolve(beforeQuantityPromise)
          .then((beforeQuantity) => {
            if(!Number.isFinite(beforeQuantity)) return null;

            return fetchSlsCartJson().then((cartData) => {
              const afterQuantity = getSlsCartQuantityForVariant(cartData, variantId);
              if(!Number.isFinite(afterQuantity) || afterQuantity <= beforeQuantity) return null;

              const warning = lumeFormatPartialAvailabilityAddMessage(
                afterQuantity - beforeQuantity,
                beforeQuantity,
                afterQuantity
              ) || response.description || response.message || false;
              if(warning) this.handleErrorMessage(warning);
              this.finishAddToCartButton();

              const cartLikeResponse = Object.assign({}, cartData || {}, {
                id: variantId,
                quantity: afterQuantity - beforeQuantity
              });
              delete cartLikeResponse.status;
              delete cartLikeResponse.message;
              delete cartLikeResponse.description;

              return this.prepareCartAddResponse(cartLikeResponse);
            });
          })
          .catch(() => null);
      }

      finishAddToCartButton() {
        document.dispatchEvent(new CustomEvent('lume:atc:success', {
          detail: {
            button: this.submitButton
          }
        }));
      }

      prepareCartAddResponse(response) {
        if(!this.cart || !response || response.status || response.sections) return Promise.resolve(response);

        const sectionIds = this.cart.getSectionsToRender()
          .map((section) => section.id || section.section)
          .filter(Boolean);

        if(!sectionIds.length) return Promise.resolve(response);

        return Promise.all([
          fetchSlsRenderedSections(sectionIds),
          fetchSlsCartJson().catch(() => null)
        ])
          .then(([sections, cartData]) => Object.assign({}, response, cartData || {}, { sections }))
          .catch((error) => {
            console.error('Studio Lume cart drawer sections could not be prepared after add to cart.', error);
            return response;
          });
      }

      handleErrorMessage(errorMessage = false) {
        if(this.hideErrors) return;

        this.errorMessageWrapper =
          this.errorMessageWrapper || this.querySelector('.product-form__error-message-wrapper');
        if(!this.errorMessageWrapper) return;
        this.errorMessage = this.errorMessage || this.errorMessageWrapper.querySelector('.product-form__error-message');

        this.errorMessageWrapper.toggleAttribute('hidden', !errorMessage);

        if(errorMessage) {
          this.errorMessage.textContent = errorMessage;
        }
      }

      getQuickAddTingleModal() {
        const modal = this.closest('.tingle-modal');
        if(!modal) return null;

        return modal.querySelector('.quick_shop, .qvPopup') ? modal : null;
      }

      closeTingleModal(modal) {
        if(!modal) return;

        const closeButton = modal.querySelector('.tingle-modal__close');
        if(closeButton) {
          closeButton.click();
          return;
        }

        modal.classList.remove('tingle-modal--visible');
        modal.style.display = 'none';
        document.body.classList.remove('tingle-enabled');
      }

      renderCartContents(response) {
        const autoOpen = shouldSlsAutoOpenOnAdd();
        if(this.cart && response && response.sections && typeof this.cart.renderContents === 'function') {
          try {
            this.cart.renderContents(response, autoOpen);
            return;
          } catch(error) {
            console.error('Studio Lume cart drawer could not render after add to cart.', error);
          }
        }

        if(autoOpen) this.openCartFallback();
      }

      openCartFallback() {
        if(window.SLSCartDrawer && typeof window.SLSCartDrawer.open === 'function') {
          window.SLSCartDrawer.open(document.activeElement).catch((error) => {
            console.error('Studio Lume cart drawer could not open after add to cart.', error);
          });
        }
      }
    }
  );
}

function cartTerms(){
  var cterms = document.querySelector('#cartTerms'),
    cBtn = document.querySelector('.cartCheckout');
  if(cterms && cBtn){
    cterms.onchange = function(){
      cBtn.disabled = !this.checked;
    }
  }
}
cartTerms();

function getAddToCartTextTarget(addButtonText) {
  if (!addButtonText) return null;
  return addButtonText.matches('.txt, .btnin, [id^="AddToCartText"]') ?
    addButtonText :
    addButtonText.querySelector('.txt, .btnin, [id^="AddToCartText"]') || addButtonText;
}

function doesAddToCartTextFit(addButton, addButtonText) {
  if (!addButton || !addButtonText || !addButton.isConnected) return true;

  const buttonRect = addButton.getBoundingClientRect();
  if (buttonRect.width < 1 || buttonRect.height < 1) return true;

  const buttonStyle = window.getComputedStyle(addButton);
  const inlinePadding =
    parseFloat(buttonStyle.paddingLeft || 0) +
    parseFloat(buttonStyle.paddingRight || 0);
  const availableWidth = addButton.clientWidth - inlinePadding;
  if (availableWidth < 1) return true;

  const textRect = addButtonText.getBoundingClientRect();
  const textWidth = Math.ceil(Math.max(textRect.width, addButtonText.scrollWidth || 0));

  return textWidth <= availableWidth + 1;
}

function setAddToCartTextWithOptionalPrice(addButton, addButtonText, baseText, priceText) {
  const textTarget = getAddToCartTextTarget(addButtonText);
  if (!textTarget) return;

  const base = baseText || 'Add to cart';
  const price = (priceText || '').trim();
  const fullText = price ? `${base} · ${price}` : base;

  textTarget.textContent = fullText;

  textTarget.title = price ? fullText : '';
}

(function () {
  let priceUpdateTimer = null;
  let lastPriceSource = null;
  let priceContextObserverStarted = false;
  const lastGoodPriceByRoot = new WeakMap();
  const addButtonSelector = '.pr_btn[name="add"], .product-form__submit[name="add"], button.addtocart_js[name="add"]';

  function isElementVisible(element) {
    if (!element || !element.isConnected) return false;
    if (element.closest('[hidden]')) return false;
    const style = window.getComputedStyle(element);
    if (style.display === 'none' || style.visibility === 'hidden') return false;
    return Boolean(element.offsetWidth || element.offsetHeight || element.getClientRects().length);
  }

  function isCartDrawerContext(element) {
    return Boolean(element && element.closest('cart-drawer, cart-items, .cart, .sls-cart-rec-card'));
  }

  function getButtonForm(button) {
    if (!button) return null;

    const formId = button.getAttribute('form');
    if (formId) return document.getElementById(formId);

    return button.closest('form');
  }

  function isAddButton(button) {
    if (!button || !button.matches || !button.matches(addButtonSelector)) return false;
    if (isCartDrawerContext(button)) return false;

    const form = getButtonForm(button);
    return Boolean(form && /\/cart\/add/i.test(form.getAttribute('action') || ''));
  }

  function findAddButtonIn(root) {
    if (!root || !root.querySelectorAll) return null;

    const candidates = [];
    if (root.matches && isAddButton(root)) candidates.push(root);
    root.querySelectorAll(addButtonSelector).forEach((button) => {
      if (isAddButton(button)) candidates.push(button);
    });

    return candidates.find(isElementVisible) || candidates[0] || null;
  }

  function getAddButton(source) {
    const sourceElement = source && source.nodeType === 1 ? source : null;

    if (sourceElement) {
      const scopedRoot =
        sourceElement.closest('.quick_shop, .qvPopup, .tingle-modal, .product-single, sticky-cart, [id^="shopify-section-"]') ||
        sourceElement.closest('product-form') ||
        sourceElement.closest('form[action*="/cart/add"]');
      const scopedButton = findAddButtonIn(scopedRoot);
      if (scopedButton) return scopedButton;
    }

    if (lastPriceSource && lastPriceSource.isConnected && lastPriceSource !== sourceElement) {
      const lastButton = getAddButton(lastPriceSource);
      if (lastButton) return lastButton;
    }

    const activeModal = Array.from(document.querySelectorAll('.tingle-modal--visible, .quick_shop, .qvPopup'))
      .find(isElementVisible);
    const modalButton = findAddButtonIn(activeModal);
    if (modalButton) return modalButton;

    const activeButton = findAddButtonIn(document.activeElement?.closest?.('.quick_shop, .qvPopup, .tingle-modal, .product-single, sticky-cart, [id^="shopify-section-"]'));
    if (activeButton) return activeButton;

    return Array.from(document.querySelectorAll(addButtonSelector))
      .filter(isAddButton)
      .find(isElementVisible) || null;
  }

  function getAddButtonText(addButton) {
    if (!addButton) return null;
    return addButton.querySelector('.txt') ||
           addButton.querySelector('.btnin') ||
           addButton.querySelector('[id^="AddToCartText"]') ||
           addButton.querySelector(':scope > span:not(.lume-atc-existing-content)') ||
           addButton.querySelector(':scope > .lume-atc-existing-content') ||
           addButton;
  }

  function getProductPriceRoot(addButton, form) {
    return (
      addButton?.closest('.quick_shop') ||
      addButton?.closest('.qvPopup') ||
      addButton?.closest('.tingle-modal') ||
      addButton?.closest('.product-single') ||
      addButton?.closest('sticky-cart') ||
      form?.closest('.quick_shop') ||
      form?.closest('.qvPopup') ||
      form?.closest('.tingle-modal') ||
      form?.closest('.product-single') ||
      form?.closest('[id^="shopify-section-"]') ||
      addButton?.closest('[id^="shopify-section-"]') ||
      document
    );
  }

  function cleanPrice(text) {
    return (text || '').replace(/from\s*/ig, '').replace(/\s+/g, ' ').trim();
  }

  function formatMoneyLike(sourceText, amount) {
    const match = String(sourceText || '').match(/^(.*?)(\d[\d,]*(?:\.\d+)?)(.*)$/);
    if(!match) return amount.toFixed(2);

    const decimals = match[2].includes('.') ? Math.min(2, match[2].split('.')[1].length) : 2;
    return `${match[1]}${amount.toFixed(decimals)}${match[3]}`;
  }

  function getSelectedBundlePrice(root) {
    if (!root || root === document) return '';

    const el =
      root.querySelector('.lume-bundle-qty[data-lume-active="true"] .lume-bundle-option.is-active .lume-bundle-option__price') ||
      root.querySelector('.Avada-Volume__Item--Selected .AOV-Offer__DiscountPrice');
    return el ? cleanPrice(el.textContent) : '';
  }

  function getVariantPrice(root) {
    if (!root || !root.querySelector) return '';

    const el =
      root.querySelector('.price__container .pr_price.price-item.orpr:not(.hide)') ||
      root.querySelector('.pr_price.price-item.orpr:not(.hide)') ||
      root.querySelector('.price__container .pr_price.orpr:not(.hide)') ||
      root.querySelector('.price__container .pr_price:not(.cmpr):not(.hide)');
    return el ? cleanPrice(el.textContent) : '';
  }

  function getAssociatedQuantityInput(form, root) {
    const candidates = [];
    const formId = lumeGetFormIdAttribute(form);

    if (form) {
      form.querySelectorAll('input[name="quantity"], .quantity__input[name="quantity"]').forEach((input) => candidates.push(input));

      if (formId) {
        const formSelector = `input[name="quantity"][form="${String(formId).replace(/"/g, '\\"')}"]`;
        (root && root !== document ? root : document).querySelectorAll(formSelector).forEach((input) => candidates.push(input));
      }
    }

    if (root && root !== document) {
      root.querySelectorAll('input[name="quantity"], .quantity__input[name="quantity"], quantity-input input[name="quantity"]').forEach((input) => candidates.push(input));
    }

    const scopedCandidates = candidates
      .filter((input, index, array) => input && array.indexOf(input) === index)
      .filter((input) => !isCartDrawerContext(input))
      .filter((input) => !form || input.form === form || input.getAttribute('form') === formId || form.contains(input));

    return scopedCandidates.find(isElementVisible) || scopedCandidates[0] || null;
  }

  function getScopedLastGoodPrice(root) {
    return root && root !== document ? lastGoodPriceByRoot.get(root) || '' : '';
  }

  function setScopedLastGoodPrice(root, price) {
    if (!root || root === document || !price) return;
    lastGoodPriceByRoot.set(root, price);
  }

  window.updateAddToCartPriceFromCurrentState = function (source) {
    const addButton = getAddButton(source);
    const addButtonText = getAddButtonText(addButton);
    if (!addButton || !addButtonText) return;
    if (addButton.hasAttribute('disabled')) return;

    const form = getButtonForm(addButton);
    const productRoot = getProductPriceRoot(addButton, form);
    const base = (window.variantStrings && window.variantStrings.addToCart) || 'Add to cart';

    const bundlePrice = getSelectedBundlePrice(productRoot);
    const variantPrice = getVariantPrice(productRoot);
    if (bundlePrice) {
      setScopedLastGoodPrice(productRoot, bundlePrice);
      setAddToCartTextWithOptionalPrice(addButton, addButtonText, base, bundlePrice);
      return;
    }

    const unitPriceText = variantPrice || getScopedLastGoodPrice(productRoot) || '';

    if (unitPriceText) setScopedLastGoodPrice(productRoot, unitPriceText);

    const qtyInput = getAssociatedQuantityInput(form, productRoot);

    const qty = Math.max(1, parseInt(qtyInput?.value || 1, 10));

    if (!unitPriceText) {
      setAddToCartTextWithOptionalPrice(addButton, addButtonText, base, '');
      return;
    }

    const numericPrice = parseFloat(
      String(unitPriceText).replace(/[^0-9.]/g, '')
    );

    if (!Number.isFinite(numericPrice)) {
      setAddToCartTextWithOptionalPrice(addButton, addButtonText, base, unitPriceText);
      return;
    }

    setAddToCartTextWithOptionalPrice(addButton, addButtonText, base, formatMoneyLike(unitPriceText, numericPrice * qty));
  };

document.addEventListener('input', function (e) {
  if (
    e.target.matches('.quantity__input') ||
    e.target.matches('input[name="quantity"]') ||
    e.target.closest('quantity-input')
  ) {
    queueButtonPriceUpdate(10, e.target);
    setTimeout(() => window.updateAddToCartPriceFromCurrentState(e.target), 80);
  }
});

document.addEventListener('click', function (e) {
  if (
    e.target.closest('quantity-input .qtyBtn') ||
    e.target.closest('quantity-input button')
  ) {
    queueButtonPriceUpdate(10, e.target);
    setTimeout(() => window.updateAddToCartPriceFromCurrentState(e.target), 80);
    setTimeout(() => window.updateAddToCartPriceFromCurrentState(e.target), 180);
  }
});

  function queueButtonPriceUpdate(delay, source) {
    if (source && source.nodeType === 1) lastPriceSource = source;
    clearTimeout(priceUpdateTimer);
    priceUpdateTimer = setTimeout(function () {
      window.updateAddToCartPriceFromCurrentState(lastPriceSource);
    }, delay || 60);
  }

  function attachObservers() {
    const bundleContainers = Array.from(document.querySelectorAll('.Avada-Bundle-Volume__Container, .lume-bundle-qty[data-lume-bundle-qty]'))
      .filter((container) => !isCartDrawerContext(container));

    bundleContainers.forEach(function (bundleContainer) {
      if (bundleContainer.dataset.atcPriceObserverAttached) return;

      bundleContainer.dataset.atcPriceObserverAttached = 'true';

      const bundleObserver = new MutationObserver(function () {
        queueButtonPriceUpdate(20, bundleContainer);
      });

      bundleObserver.observe(bundleContainer, {
        subtree: true,
        childList: true,
        characterData: true,
        attributes: true,
        attributeFilter: ['class']
      });
    });

    document.querySelectorAll('.price__container').forEach((priceContainer) => {
      if (isCartDrawerContext(priceContainer) || priceContainer.dataset.atcPriceObserverAttached) return;

      priceContainer.dataset.atcPriceObserverAttached = 'true';

      const priceObserver = new MutationObserver(function () {
        queueButtonPriceUpdate(20, priceContainer);
      });

      priceObserver.observe(priceContainer, {
        subtree: true,
        childList: true,
        characterData: true
      });
    });
  }

  function bootButtonPrice() {
    window.updateAddToCartPriceFromCurrentState();
    attachObservers();
    observeDynamicPriceContexts();

    let tries = 0;
    const maxTries = 12;
    const timer = setInterval(function () {
      window.updateAddToCartPriceFromCurrentState();
      tries++;
      if (tries >= maxTries) clearInterval(timer);
    }, 120);
  }

  function observeDynamicPriceContexts() {
    if (priceContextObserverStarted || !window.MutationObserver || !document.body) return;
    priceContextObserverStarted = true;

    new MutationObserver((mutations) => {
      let source = null;
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (source || !node || node.nodeType !== 1) return;
          if (
            node.matches?.('.quick_shop, .qvPopup, .tingle-modal, product-form, .price__container') ||
            node.querySelector?.('.quick_shop, .qvPopup, .tingle-modal, product-form, .price__container')
          ) {
            source = node;
          }
        });
      });

      if (!source) return;
      attachObservers();
      queueButtonPriceUpdate(40, source);
      setTimeout(() => window.updateAddToCartPriceFromCurrentState(source), 140);
    }).observe(document.body, { childList: true, subtree: true });
  }

  document.addEventListener('DOMContentLoaded', bootButtonPrice);
  window.addEventListener('load', bootButtonPrice);
  window.addEventListener('resize', function () {
    queueButtonPriceUpdate(60);
  });

  document.addEventListener('click', function (e) {
    if (
      e.target.closest('.Avada-Volume__Item') ||
      e.target.closest('.lume-bundle-option') ||
      e.target.closest('.swatch') ||
      e.target.closest('.variant-input') ||
      e.target.closest('.product-form__input') ||
      e.target.closest('[data-option-value]') ||
      e.target.closest('[data-value]') ||
      e.target.closest('label[for*="template"]') ||
      e.target.closest('label[for*="option"]')
    ) {
      queueButtonPriceUpdate(20, e.target);
      setTimeout(() => window.updateAddToCartPriceFromCurrentState(e.target), 120);
    }
  });

  document.addEventListener('change', function (e) {
    if (
      e.target.matches('input[name="id"]') ||
      e.target.matches('select[name="id"]') ||
      e.target.matches('input[name^="options"]') ||
      e.target.matches('select[name^="options"]')
    ) {
      queueButtonPriceUpdate(20, e.target);
      setTimeout(() => window.updateAddToCartPriceFromCurrentState(e.target), 120);
    }
  });

  document.addEventListener('lume:bundle-qty:change', function (event) {
    queueButtonPriceUpdate(10, event.target);
    setTimeout(() => window.updateAddToCartPriceFromCurrentState(event.target), 80);
  });
})();

(function () {
  const successResetDelay = 520;
  const stuckResetDelay = 9000;
  const selectors = [
    'form[action*="/cart/add"] button[name="add"]',
    'form[action*="/cart/add"] button[type="submit"]',
    'button[name="add"][form]',
    '.product-form__submit[name="add"]',
    'button.addtocart_js[name="add"]'
  ];
  const nonCartSelector = '.quickShop, .quick-view, .btn-options, .popup-link, .addwishlist, [data-popup], [data-url*="section_id=quick-"]';
  const dynamicButtonSelector = selectors.concat([nonCartSelector]).join(',');

  let observed = false;

  function createStatusIcon() {
    const wrapper = document.createElement('span');
    wrapper.className = 'lume-atc-status';
    wrapper.setAttribute('aria-hidden', 'true');

    wrapper.innerHTML = `
      <svg class="lume-atc-loader" width="30" height="30" viewBox="0 0 24 24" fill="none">
        <circle class="lume-atc-loader-track" cx="12" cy="12" r="8"></circle>
        <circle class="lume-atc-loader-line" cx="12" cy="12" r="8"></circle>
        <path class="lume-atc-check" d="M8.25 12.35L10.65 14.75L15.85 9.65"></path>
      </svg>
    `;

    return wrapper;
  }

  function isAddToCartButton(button) {
    if (!button || button.nodeType !== 1) return false;
    if (isNonCartActionButton(button)) return false;

    const form = getButtonForm(button);
    if (form && /\/cart\/add/i.test(form.getAttribute('action') || '')) return true;

    return button.matches('button[name="add"][form], .product-form__submit[name="add"], button.addtocart_js[name="add"]');
  }

  function isNonCartActionButton(button) {
    if (!button || !button.matches) return true;

    if (button.matches('.quickShop, .quick-view, .btn-options, .popup-link, .addwishlist, [data-popup]')) {
      return true;
    }

    const url = button.getAttribute('data-url') || '';
    if (/section_id=quick-(shop|view)/i.test(url)) return true;

    return false;
  }

  function getButtonForm(button) {
    if (!button) return null;

    const formId = button.getAttribute('form');
    if (formId) return document.getElementById(formId);

    return button.closest('form');
  }

  function wrapButtonContent(button) {
    if (!isAddToCartButton(button)) return;
    if (button.classList.contains('lume-atc-animated')) return;

    button.classList.add('lume-atc-animated');

    const existingContent = document.createElement('span');
    existingContent.className = 'lume-atc-existing-content';

    while (button.firstChild) {
      existingContent.appendChild(button.firstChild);
    }

    button.appendChild(existingContent);
    button.appendChild(createStatusIcon());
  }

  function unwrapButtonContent(button) {
    if (!button || !button.classList || !button.classList.contains('lume-atc-animated')) return;

    const existingContent = button.querySelector(':scope > .lume-atc-existing-content');
    const status = button.querySelector(':scope > .lume-atc-status');

    if (existingContent) {
      while (existingContent.firstChild) {
        button.insertBefore(existingContent.firstChild, existingContent);
      }

      existingContent.remove();
    }

    if (status) status.remove();
    button.classList.remove('lume-atc-animated', 'is-loading', 'is-success');
    button.removeAttribute('aria-busy');
  }

  function cleanupNonCartActionButtons(root) {
    const scope = root && root.querySelectorAll ? root : document;

    if (scope.matches && scope.matches(nonCartSelector)) {
      unwrapButtonContent(scope);
    }

    scope.querySelectorAll(nonCartSelector).forEach(unwrapButtonContent);
  }

  function setLoading(button) {
    if (!button || button.disabled || button.getAttribute('aria-disabled') === 'true') return;

    button.classList.remove('is-success');
    button.classList.add('is-loading');
    button.setAttribute('aria-busy', 'true');
  }

  function setSuccess(button) {
    if (!button) return;

    button.classList.remove('is-loading');
    button.classList.add('is-success');
    button.removeAttribute('aria-busy');

    window.clearTimeout(button.lumeAtcFallbackTimer);
    window.clearTimeout(button.lumeAtcResetTimer);
    button.lumeAtcFallbackAttempts = 0;

    button.lumeAtcResetTimer = window.setTimeout(function () {
      resetButton(button);
    }, getSuccessResetDelay(button));
  }

  function getSuccessResetDelay(button) {
    return isQuickAddConfirmationButton(button) ? LUME_QUICK_ADD_SUCCESS_RESET_DELAY : successResetDelay;
  }

  function isQuickAddConfirmationButton(button) {
    return Boolean(
      button &&
      button.closest &&
      button.closest('.quick_shop, .qvPopup, .tingle-modal, quick-add-modal') &&
      !button.closest('cart-drawer')
    );
  }

  function resetButton(button) {
    if (!button) return;

    button.classList.remove('is-loading', 'is-success');
    button.removeAttribute('aria-busy');
    button.lumeAtcFallbackAttempts = 0;
    window.clearTimeout(button.lumeAtcFallbackTimer);
    window.clearTimeout(button.lumeAtcResetTimer);
  }

  function scheduleFallbackReset(button) {
    if (!button) return;

    button.lumeAtcFallbackTimer = window.setTimeout(function () {
      const requestStillPending = button.disabled || button.getAttribute('aria-disabled') === 'true';
      button.lumeAtcFallbackAttempts = (button.lumeAtcFallbackAttempts || 0) + 1;

      if (requestStillPending && button.lumeAtcFallbackAttempts < 4) {
        scheduleFallbackReset(button);
        return;
      }

      resetButton(button);
    }, stuckResetDelay);
  }

  function startButtonAnimation(button) {
    if (!button || button.disabled || button.getAttribute('aria-disabled') === 'true') return;

    wrapButtonContent(button);
    setLoading(button);

    window.clearTimeout(button.lumeAtcFallbackTimer);
    window.clearTimeout(button.lumeAtcResetTimer);
    button.lumeAtcFallbackAttempts = 0;

    scheduleFallbackReset(button);
  }

  function getFormSubmitter(form, event) {
    if (event && event.submitter && isAddToCartButton(event.submitter)) return event.submitter;
    if (form._lumeAtcLastButton && isAddToCartButton(form._lumeAtcLastButton)) return form._lumeAtcLastButton;
    return form.querySelector(selectors.join(','));
  }

  function bindForm(form) {
    if (!form || form.dataset.lumeAtcBound === 'true') return;
    if (!/\/cart\/add/i.test(form.getAttribute('action') || '')) return;

    form.dataset.lumeAtcBound = 'true';

    form.addEventListener('submit', function (event) {
      startButtonAnimation(getFormSubmitter(form, event));
    }, true);
  }

  function bindButton(button) {
    if (!isAddToCartButton(button)) return;
    wrapButtonContent(button);

    const form = getButtonForm(button);
    bindForm(form);

    if (button.dataset.lumeAtcButtonBound === 'true') return;
    button.dataset.lumeAtcButtonBound = 'true';

    button.addEventListener('click', function () {
      const buttonForm = getButtonForm(button);
      if (buttonForm) buttonForm._lumeAtcLastButton = button;
      if (!buttonForm) startButtonAnimation(button);
    }, true);
  }

  function initButtons(root) {
    const scope = root && root.querySelectorAll ? root : document;
    cleanupNonCartActionButtons(scope);

    const buttons = scope.querySelectorAll(selectors.join(','));

    buttons.forEach(bindButton);
  }

  function finishLoadingButtons() {
    document.querySelectorAll('.lume-atc-animated.is-loading').forEach(setSuccess);
  }

  function resetAnimatedButtons() {
    document.querySelectorAll('.lume-atc-animated').forEach(resetButton);
  }

  function observeDynamicButtons() {
    if (observed || !document.body) return;
    observed = true;

    new MutationObserver(function (mutations) {
      mutations.forEach(function (mutation) {
        Array.from(mutation.addedNodes || []).forEach(function (node) {
          if (!node || node.nodeType !== 1) return;

          if (!(
            (node.matches && node.matches(dynamicButtonSelector)) ||
            (node.querySelector && node.querySelector(dynamicButtonSelector))
          )) {
            return;
          }

          if (node.matches && node.matches(selectors.join(','))) bindButton(node);
          initButtons(node);
        });
      });
    }).observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      initButtons();
      observeDynamicButtons();
    });
  } else {
    initButtons();
    observeDynamicButtons();
  }

  document.addEventListener('shopify:section:load', function (event) {
    initButtons(event.target);
  });

  document.addEventListener('cart:updated', finishLoadingButtons);
  document.addEventListener('product:added', finishLoadingButtons);
  document.addEventListener('ajaxProduct:added', finishLoadingButtons);
  document.addEventListener('lume:atc:success', function (event) {
    const button = event.detail && event.detail.button;
    if (button && button.classList && button.classList.contains('lume-atc-animated')) {
      setSuccess(button);
      return;
    }

    finishLoadingButtons();
  });
  document.addEventListener('cart:error', resetAnimatedButtons);
})();
