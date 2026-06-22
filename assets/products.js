"use strict";
if(!customElements.get('sticky-cart')) {
  class StickyCart extends HTMLElement {
    constructor() {
      super();
      this.sectionId = this.dataset.section;
      this.stickyInput = this.querySelector('[data-sticky-qty-input]');
      this.syncingQuantity = false;
      this.visibilityQueued = false;
      this.animationTimer = null;
      this.animationFrame = null;

      this.initVisibility();
      this.bindVariantSelector();
      this.bindQuantity();
    }

    getProductForm() {
      return document.getElementById(`product-form-${this.sectionId}`) ||
        document.querySelector(`form[action*="/cart/add"][id="product-form-${this.sectionId}"]`) ||
        document.querySelector('product-form form[action*="/cart/add"]') ||
        document.querySelector('form[action*="/cart/add"]');
    }

    getMainQuantityInput() {
      const form = this.getProductForm();
      if(form) {
        const formInput = form.querySelector('input[name="quantity"]');
        if(formInput) return formInput;

        if(form.id) {
          const externalInput = document.querySelector(`input[name="quantity"][form="${form.id}"]`);
          if(externalInput) return externalInput;
        }
      }

      return document.querySelector('[data-main-product-quantity] input[name="quantity"]') ||
        document.querySelector('input[name="quantity"]');
    }

    getMainAddButton() {
      return document.querySelector('.product-form__buttons .product-form__submit[name="add"]') ||
        document.querySelector('.product-form__buttons button[name="add"]') ||
        document.querySelector('.product-form__submit[name="add"]') ||
        document.querySelector('.product-form__submit');
    }

    getStickyHeaderOffset() {
      const header = document.querySelector('.hdr_wrap.sticky_hdr, .sticky_hdr');
      if(!header) return 0;

      try {
        const style = window.getComputedStyle(header);
        const rect = header.getBoundingClientRect();
        if((style.position === 'fixed' || style.position === 'sticky') && rect.bottom > 0) {
          return Math.max(0, Math.ceil(rect.bottom));
        }
      } catch(e) {
        return 0;
      }

      return 0;
    }

    isElementVisible(el) {
      if(!el) return false;

      try {
        const style = window.getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        const topLimit = this.getStickyHeaderOffset();

        return style.display !== 'none' &&
          style.visibility !== 'hidden' &&
          parseFloat(style.opacity || '1') > 0 &&
          rect.width > 0 &&
          rect.height > 0 &&
          rect.bottom > topLimit &&
          rect.top < window.innerHeight;
      } catch(e) {
        return false;
      }
    }

    updateStickyVisibility() {
      this.visibilityQueued = false;

      const btn = this.getMainAddButton();
      if(!btn) {
        this.classList.toggle('active', window.scrollY > 300);
        return;
      }

      const rect = btn.getBoundingClientRect();
      const topLimit = this.getStickyHeaderOffset();
      const hasScrolledPastButton = rect.bottom <= topLimit;

      this.classList.toggle('active', hasScrolledPastButton && !this.isElementVisible(btn));
    }

    queueStickyVisibility() {
      if(this.visibilityQueued) return;
      this.visibilityQueued = true;
      requestAnimationFrame(this.updateStickyVisibility.bind(this));
    }

    initVisibility() {
      const queueVisibility = this.queueStickyVisibility.bind(this);

      window.addEventListener("scroll", queueVisibility, { passive: true });
      window.addEventListener("resize", queueVisibility, { passive: true });
      window.addEventListener("load", queueVisibility);
      queueVisibility();
      setTimeout(queueVisibility, 300);
    }

    bindVariantSelector() {
      const stickySelect = this.querySelector('#stickyOptions');
      if(!stickySelect) return;

      stickySelect.addEventListener('change', () => {
        const selectedOption = stickySelect.selectedOptions[0];
        const variantContainer = document.getElementById(`variant-selects-${this.sectionId}`);
        if(!selectedOption || !variantContainer) return;

        variantContainer.querySelectorAll('select, fieldset').forEach((field, index) => {
          const selectedValue = selectedOption.dataset[`option${index + 1}`];
          if(!selectedValue) return;

          if(field.tagName === 'SELECT') {
            Array.from(field.options).forEach((option) => {
              option.selected = option.value === selectedValue;
            });

            field.dispatchEvent(new Event('change', { bubbles: true }));
            return;
          }

          if(field.tagName === 'FIELDSET') {
            const input = Array.from(field.querySelectorAll('input')).find((candidate) => {
              return candidate.value === selectedValue;
            });

            if(input && !input.checked) input.click();
          }
        });

        this.scheduleQuantityRefresh();
      });
    }

    toNumber(value, fallback) {
      const number = parseInt(value, 10);
      return Number.isFinite(number) ? number : fallback;
    }

    getQuantityRules() {
      const mainInput = this.getMainQuantityInput();
      const source = mainInput || this.stickyInput;

      const min = Math.max(1, this.toNumber(source?.getAttribute('min') || source?.dataset.min, 1));
      const step = Math.max(1, this.toNumber(source?.getAttribute('step'), 1));

      return {
        min: min,
        step: step
      };
    }

    normalizeQuantity(value) {
      const rules = this.getQuantityRules();
      let quantity = this.toNumber(value, rules.min);

      quantity = Math.max(rules.min, quantity);

      return quantity;
    }

    getCurrentQuantity() {
      const mainInput = this.getMainQuantityInput();
      const rules = this.getQuantityRules();
      const mainValue = this.toNumber(mainInput?.value, NaN);

      if(Number.isFinite(mainValue) && mainValue > 0) return mainValue;

      const stickyValue = this.toNumber(this.stickyInput?.value, NaN);
      if(Number.isFinite(stickyValue) && stickyValue > 0) return stickyValue;

      return rules.min;
    }

    setInputValue(input, value) {
      if(!input) return;

      const nextValue = String(value);
      input.value = nextValue;
      input.defaultValue = nextValue;
      input.setAttribute('value', nextValue);
    }

    copyQuantityAttributes() {
      const mainInput = this.getMainQuantityInput();
      if(!mainInput || !this.stickyInput) return;

      ['min', 'step', 'data-min'].forEach((attr) => {
        const value = mainInput.getAttribute(attr);
        if(value === null || value === '') {
          this.stickyInput.removeAttribute(attr);
        } else {
          this.stickyInput.setAttribute(attr, value);
        }
      });

      this.stickyInput.removeAttribute('max');
      this.stickyInput.removeAttribute('data-max');
    }

    clearQuantityMax(input) {
      if(!input) return;

      input.removeAttribute('max');
      input.removeAttribute('data-max');
    }

    dispatchQuantityEvents(input) {
      if(!input) return;

      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }

    animateQuantity(previousValue, nextValue) {
      const previous = this.toNumber(previousValue, NaN);
      const next = this.toNumber(nextValue, NaN);
      if(!Number.isFinite(previous) || !Number.isFinite(next) || previous === next) return;

      const className = next > previous ? 'is-qty-increase' : 'is-qty-decrease';
      const wrapper = this.stickyInput?.closest('.lume-qty-enhanced');
      if(!wrapper) return;

      clearTimeout(this.animationTimer);
      if(this.animationFrame) cancelAnimationFrame(this.animationFrame);

      wrapper.classList.remove('is-qty-increase', 'is-qty-decrease');
      this.animationFrame = requestAnimationFrame(() => {
        wrapper.classList.add(className);
        this.animationTimer = setTimeout(() => {
          wrapper.classList.remove('is-qty-increase', 'is-qty-decrease');
          this.animationFrame = null;
        }, 220);
      });
    }

    updateButtonStates(quantity) {
      const rules = this.getQuantityRules();
      const minusButton = this.querySelector('[data-sticky-qty-button="minus"]');
      const plusButton = this.querySelector('[data-sticky-qty-button="plus"]');

      if(minusButton) {
        const disabled = quantity <= rules.min;
        minusButton.classList.toggle('disabled', disabled);
        minusButton.setAttribute('aria-disabled', disabled ? 'true' : 'false');
      }

      if(plusButton) {
        plusButton.classList.remove('disabled');
        plusButton.setAttribute('aria-disabled', 'false');
      }
    }

    writeQuantity(value, options) {
      if(this.syncingQuantity) return;

      const opts = options || {};
      const mainInput = this.getMainQuantityInput();
      const previousValue = this.stickyInput ? this.stickyInput.value : this.getCurrentQuantity();
      const quantity = this.normalizeQuantity(value);

      if(opts.clearMax) this.clearQuantityMax(mainInput);

      this.syncingQuantity = true;
      this.setInputValue(this.stickyInput, quantity);
      this.setInputValue(mainInput, quantity);
      this.syncingQuantity = false;

      if(opts.animate) this.animateQuantity(previousValue, quantity);
      if(opts.dispatchMain !== false) this.dispatchQuantityEvents(mainInput);

      this.updateButtonStates(quantity);
    }

    bindSubmitQuantity() {
      const form = this.getProductForm();
      if(!form || form.dataset.lumeStickySubmitBound === 'true') return;

      form.dataset.lumeStickySubmitBound = 'true';

      form.addEventListener('submit', () => {
        this.writeQuantity(this.stickyInput.value || this.getCurrentQuantity(), {
          animate: false,
          clearMax: true,
          dispatchMain: false
        });
      }, true);

      form.addEventListener('formdata', (event) => {
        const quantity = this.normalizeQuantity(this.stickyInput.value || this.getCurrentQuantity());
        event.formData.set('quantity', String(quantity));
      });
    }

    syncFromMain() {
      if(this.syncingQuantity) return;
      this.copyQuantityAttributes();

      const quantity = this.normalizeQuantity(this.getCurrentQuantity());
      this.syncingQuantity = true;
      this.setInputValue(this.stickyInput, quantity);
      this.syncingQuantity = false;
      this.updateButtonStates(quantity);
    }

    scheduleQuantityRefresh() {
      this.syncFromMain();
      setTimeout(() => this.syncFromMain(), 80);
      setTimeout(() => this.syncFromMain(), 180);
    }

    bindQuantity() {
      if(!this.stickyInput) return;

      this.copyQuantityAttributes();
      this.syncFromMain();
      this.bindSubmitQuantity();

      this.querySelectorAll('[data-sticky-qty-button]').forEach((button) => {
        button.addEventListener('click', (event) => {
          event.preventDefault();

          const rules = this.getQuantityRules();
          const currentQuantity = this.normalizeQuantity(this.stickyInput.value || this.getCurrentQuantity());
          const nextQuantity = button.dataset.stickyQtyButton === 'plus'
            ? currentQuantity + rules.step
            : currentQuantity - rules.step;

          this.writeQuantity(nextQuantity, {
            animate: true,
            dispatchMain: true
          });
        });
      });

      this.stickyInput.addEventListener('input', () => {
        if(this.syncingQuantity || this.stickyInput.value === '') return;

        this.writeQuantity(this.stickyInput.value, {
          animate: false,
          dispatchMain: true
        });
      });

      this.stickyInput.addEventListener('change', () => {
        this.writeQuantity(this.stickyInput.value || this.getCurrentQuantity(), {
          animate: false,
          dispatchMain: true
        });
      });

      const mainInput = this.getMainQuantityInput();
      if(mainInput) {
        mainInput.addEventListener('input', () => this.syncFromMain());
        mainInput.addEventListener('change', () => this.syncFromMain());
      }

      const stickyAddButton = this.querySelector('button[name="add"][form]');
      if(stickyAddButton) {
        stickyAddButton.addEventListener('click', () => {
          this.writeQuantity(this.stickyInput.value || this.getCurrentQuantity(), {
            animate: false,
            clearMax: true,
            dispatchMain: true
          });
        }, true);
      }

      document.addEventListener('change', (event) => {
        const target = event.target;
        if(!target || !target.matches) return;

        if(
          target.matches('input[name="id"], select[name="id"], input[name^="options"], select[name^="options"]') ||
          target.closest('variant-selects, variant-radios, [data-product-form]')
        ) {
          this.scheduleQuantityRefresh();
        }
      }, true);

      ['variant:change', 'variantChange', 'variant:changed'].forEach((eventName) => {
        document.addEventListener(eventName, () => this.scheduleQuantityRefresh());
      });
    }
  }
  customElements.define("sticky-cart", StickyCart);
}
if(!customElements.get('back-in-stock')){
  class BackInStock extends HTMLElement {
    constructor() {
      super();
      this.bisCookie = 'backinstock'+this.dataset.id;
      this.form = this.querySelector('form');
      this.variant = this.querySelector('.bisVariant');
  
      this.form.addEventListener("submit", this.BackinStockSubmit.bind(this));
  
      window.addEventListener('DOMContentLoaded',function(){
        const error = window.location.href.indexOf('form_type=contact') > -1;
        if(window.location.href.indexOf('contact_posted=true') > -1 || error){
            if(getCookie('contatForm') == 'backinstockform'){
                var bismodal = new tingle.modal({
                      cssClass: ['bismodal'],
                      onClose: function(){
                          setCookie('contatForm','',1);
                      }
                });
                bismodal.setContent(document.getElementById('backStockSuccess'));
                bismodal.open();
                
            }
        }
      });
    }
    BackinStockSubmit(event){
        event.preventDefault();
        var vrId = this.querySelector('.bisVariant').dataset.id,
          cvr = vrId;
        if(getCookie(this.bisCookie) != null){
            cvr = getCookie(this.bisCookie)+'_'+vrId;
        }
        setCookie(this.bisCookie,cvr,1);
        setCookie('contatForm','backinstockform',1);
    }
    checkBackinstock(vr){
      this.variant.value = vr.title;
      this.variant.setAttribute('data-id', vr.id);
      var formMsg = this.querySelector('.bisMsg');
      if(vr.available){
        this.classList.add('hide');
      } else {
        this.classList.remove('hide');
         if(getCookie(this.bisCookie) != null){
           this.form.classList.remove('hide');
           formMsg.classList.add('hide');
           var str = String(getCookie(this.bisCookie)).split("_");
           for(var i=0; i<str.length; i++){
             if(str[i] == vr.id){
               this.form.classList.add('hide');
               formMsg.classList.remove('hide');
             }
           }
         }
      }
     }
  }
  customElements.define("back-in-stock", BackInStock);
}

var tearmFields = document.querySelectorAll('.tearmCheck'),
  dyButs = document.querySelectorAll('.shopify-payment-button__button');

if(tearmFields.length){
  setTimeout(function(){
    dyButs.forEach((btn) => { btn.disabled = true; });
  },300);
  
  tearmFields.forEach((tearm) => {
    tearm.onchange = function(){
      var dyBut = this.closest('.product-form__buttons').querySelector('.shopify-payment-button__button');
      //dyBut.disabled = !this.checked;
    };
  });
  
}
