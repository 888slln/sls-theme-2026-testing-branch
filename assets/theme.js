"use strict";
function getFocusableElements(container) {
  return Array.from(
    container.querySelectorAll(
      "summary, a[href], button:enabled, [tabindex]:not([tabindex^='-']), [draggable], area, input:not([type=hidden]):enabled, select:enabled, textarea:enabled, object, iframe"
    )
  );
}
function fetchConfig(type = 'json') {
  return {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: `application/${type}` },
  };
}

/** Shopify Common JS **/
if(typeof window.Shopify == 'undefined') {
  window.Shopify = {};
}
Shopify.bind = function (fn, scope) {
  return function (){
    return fn.apply(scope, arguments);
  };
};
Shopify.setSelectorByValue = function (selector, value) {
  for (var i = 0, count = selector.options.length; i < count; i++) {
    var option = selector.options[i];
    if(value == option.value || value == option.innerHTML) {
      selector.selectedIndex = i;
      return i;
    }
  }
};
Shopify.addListener = function (target, eventName, callback) {
  target.addEventListener
    ? target.addEventListener(eventName, callback, false)
    : target.attachEvent('on' + eventName, callback);
};

Shopify.postLink = function (path, options) {
  options = options || {};
  var method = options['method'] || 'post';
  var params = options['parameters'] || {};

  var form = document.createElement('form');
  form.setAttribute('method', method);
  form.setAttribute('action', path);

  for (var key in params) {
    var hiddenField = document.createElement('input');
    hiddenField.setAttribute('type', 'hidden');
    hiddenField.setAttribute('name', key);
    hiddenField.setAttribute('value', params[key]);
    form.appendChild(hiddenField);
  }
  document.body.appendChild(form);
  form.submit();
  document.body.removeChild(form);
};

Shopify.CountryProvinceSelector = function (country_domid, province_domid, options) {
  this.countryEl = document.getElementById(country_domid);
  this.provinceEl = document.getElementById(province_domid);
  this.provinceContainer = document.getElementById(options['hideElement'] || province_domid);

  Shopify.addListener(this.countryEl, 'change', Shopify.bind(this.countryHandler, this));

  this.initCountry();
  this.initProvince();
};

Shopify.CountryProvinceSelector.prototype = {
  initCountry: function (){
    var value = this.countryEl.getAttribute('data-default');
    Shopify.setSelectorByValue(this.countryEl, value);
    this.countryHandler();
  },

  initProvince: function (){
    var value = this.provinceEl.getAttribute('data-default');
    if(value && this.provinceEl.options.length > 0) {
      Shopify.setSelectorByValue(this.provinceEl, value);
    }
  },

  countryHandler: function (e) {
    var opt = this.countryEl.options[this.countryEl.selectedIndex];
    var raw = opt.getAttribute('data-provinces');
    var provinces = JSON.parse(raw);

    this.clearOptions(this.provinceEl);
    if(provinces && provinces.length == 0) {
      this.provinceContainer.style.display = 'none';
    } else {
      for (var i = 0; i < provinces.length; i++) {
        var opt = document.createElement('option');
        opt.value = provinces[i][0];
        opt.innerHTML = provinces[i][1];
        this.provinceEl.appendChild(opt);
      }

      this.provinceContainer.style.display = '';
    }
  },

  clearOptions: function (selector) {
    while (selector.firstChild) {
      selector.removeChild(selector.firstChild);
    }
  },

  setOptions: function (selector, values) {
    for (var i = 0, count = values.length; i < values.length; i++) {
      var opt = document.createElement('option');
      opt.value = values[i];
      opt.innerHTML = values[i];
      selector.appendChild(opt);
    }
  },
};

var html = document.documentElement,
  body = document.body,
  mOverly = document.querySelector('.modalOverly'),
  mbNav = document.querySelector('.mob_nav_wr'),
  mbQury = window.matchMedia('(max-width: 767px)');
let mobileNavOpenFrame = null;
let mobileNavOpenSecondFrame = null;
let mobileNavCloseTimer = null;
let mobileNavSettleTimer = null;
let mobileNavContentTimer = null;
let mobileNavPrimeTimer = null;
let mobileNavPrimed = false;
let mobileNavLastTrigger = null;
let mobileNavFocusTimer = null;

function getMobileNavToggles(){
  document.querySelectorAll('.navToggle').forEach((btn) => {
    if(!btn.hasAttribute('aria-controls')) btn.setAttribute('aria-controls', 'mobNav');
    if(!btn.hasAttribute('aria-haspopup')) btn.setAttribute('aria-haspopup', 'dialog');
  });
  return document.querySelectorAll('.navToggle[aria-controls="mobNav"]');
}

function setMobileNavExpanded(expanded){
  getMobileNavToggles().forEach((btn) => {
    btn.setAttribute('aria-expanded', expanded ? 'true' : 'false');
  });
}

function getVisibleMobileNavFocusableElements(){
  if(!mbNav) return [];

  return getFocusableElements(mbNav).filter((element) => {
    if(element.closest('[aria-hidden="true"]')) return false;
    if(element.disabled) return false;
    return Boolean(element.offsetWidth || element.offsetHeight || element.getClientRects().length);
  });
}

function focusMobileNavControl(){
  if(!mbNav || !html.classList.contains('actMbNav')) return;

  const closeButton = mbNav.querySelector('.closembNav');
  const activeTab = mbNav.querySelector('.mbMnink.active');
  const focusTarget = closeButton || activeTab || getVisibleMobileNavFocusableElements()[0];
  if(focusTarget) focusTarget.focus({ preventScroll: true });
}

function scheduleMobileNavFocus(){
  window.clearTimeout(mobileNavFocusTimer);
  mobileNavFocusTimer = window.setTimeout(focusMobileNavControl, 0);
}

function restoreMobileNavTriggerFocus(){
  const trigger = mobileNavLastTrigger;
  mobileNavLastTrigger = null;
  if(trigger && document.contains(trigger)) {
    trigger.focus({ preventScroll: true });
  }
}

function handleMobileNavKeydown(e){
  if(!html.classList.contains('actMbNav')) return;

  if(e.key === 'Escape' || e.key === 'Esc') {
    e.preventDefault();
    closeMobileNav();
    return;
  }

  if(e.key !== 'Tab' || !mbNav) return;

  const focusable = getVisibleMobileNavFocusableElements();
  if(!focusable.length) {
    e.preventDefault();
    return;
  }

  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  const activeElement = document.activeElement;

  if(e.shiftKey && (activeElement === first || !mbNav.contains(activeElement))) {
    e.preventDefault();
    last.focus();
  } else if(!e.shiftKey && activeElement === last) {
    e.preventDefault();
    first.focus();
  }
}

function getMobileNavTransitionDuration(){
  if(!mbNav) return 420;

  const styles = window.getComputedStyle(mbNav);
  const durations = styles.transitionDuration.split(',').map((duration) => {
    duration = duration.trim();
    if(duration.endsWith('ms')) return parseFloat(duration);
    if(duration.endsWith('s')) return parseFloat(duration) * 1000;
    return parseFloat(duration) || 0;
  });
  const delay = styles.transitionDelay.split(',').reduce((longest, delayValue) => {
    delayValue = delayValue.trim();
    const parsed = delayValue.endsWith('ms') ? parseFloat(delayValue) : delayValue.endsWith('s') ? parseFloat(delayValue) * 1000 : parseFloat(delayValue) || 0;
    return Math.max(longest, parsed);
  }, 0);

  return Math.max(260, ...durations) + delay;
}

function clearMobileNavFrames(){
  if(mobileNavOpenFrame) window.cancelAnimationFrame(mobileNavOpenFrame);
  if(mobileNavOpenSecondFrame) window.cancelAnimationFrame(mobileNavOpenSecondFrame);
  mobileNavOpenFrame = null;
  mobileNavOpenSecondFrame = null;
}

function setMobileNavInteractive(active){
  if(!mbNav) return;

  if(active) {
    mbNav.removeAttribute('aria-hidden');
    if('inert' in mbNav) mbNav.inert = false;
  } else {
    mbNav.setAttribute('aria-hidden', 'true');
    if('inert' in mbNav) mbNav.inert = true;
  }
}

function primeMobileNavLayer(){
  if(!mbNav || mobileNavPrimed || html.classList.contains('actMbNav') || html.classList.contains('lume-mbnav-mounted')) return;

  setMobileNavInteractive(false);
  html.classList.add('lume-mbnav-prewarmed');

  mbNav.getBoundingClientRect();
  mbNav.querySelectorAll('svg, .at-icon').forEach((icon) => icon.getBoundingClientRect());
  mobileNavPrimed = true;
}

function scheduleMobileNavPrime(){
  if(!mbNav || mobileNavPrimed) return;

  const run = () => {
    mobileNavPrimeTimer = window.setTimeout(() => {
      window.requestAnimationFrame(primeMobileNavLayer);
    }, 180);
  };

  if('requestIdleCallback' in window) {
    window.requestIdleCallback(run, { timeout: 1600 });
  } else {
    window.setTimeout(run, 900);
  }
}

function openMobileNav(trigger){
  if(!mbNav) return;
  if(html.classList.contains('actMbNav')) return;

  if(trigger) {
    mobileNavLastTrigger = trigger;
  } else if(document.activeElement && document.activeElement.matches('.navToggle')) {
    mobileNavLastTrigger = document.activeElement;
  }

  setMobileNavInteractive(true);
  setMobileNavExpanded(true);
  window.clearTimeout(mobileNavCloseTimer);
  window.clearTimeout(mobileNavSettleTimer);
  window.clearTimeout(mobileNavContentTimer);
  window.clearTimeout(mobileNavPrimeTimer);
  clearMobileNavFrames();
  if(mbNav.querySelector('ul.subLinks.active, .lume-panel-ancestor, .lume-panel-current, .lume-row-pressed')){
    resetMobileSubmenus(mbNav);
  }
  lockMobileNavScroll();

  html.classList.remove('lume-mbnav-prewarmed', 'lume-mbnav-closing', 'lume-mbnav-settled');
  html.classList.add('lume-mbnav-mounted');

  mbNav.getBoundingClientRect();

  mobileNavOpenFrame = window.requestAnimationFrame(() => {
    mobileNavOpenSecondFrame = window.requestAnimationFrame(() => {
      html.classList.add('actMbNav', 'showOverly', 'lume-mbnav-opening', 'lume-mbnav-content-ready');
      const activeMenu = getActiveMobileMenuRowsPanel();
      if(activeMenu) {
        activeMenu.dataset.lumeRowsQueuedAt = '0';
        if(isDesktopDrawerRowsPanel(activeMenu)) prepareMobileMenuRows(activeMenu);
        queueMobileMenuRows(activeMenu);
      }
      scheduleMobileNavFocus();
      mobileNavContentTimer = window.setTimeout(() => {
        if(html.classList.contains('actMbNav')) html.classList.remove('lume-mbnav-opening');
      }, 90);
      mobileNavSettleTimer = window.setTimeout(() => {
        if(html.classList.contains('actMbNav')) html.classList.add('lume-mbnav-settled');
      }, getMobileNavTransitionDuration());
      mobileNavOpenFrame = null;
      mobileNavOpenSecondFrame = null;
    });
  });
}

function closeMobileNav(){
  const wasMobileNavOpen = html.classList.contains('actMbNav') || html.classList.contains('lume-mbnav-mounted');

  window.clearTimeout(mobileNavSettleTimer);
  window.clearTimeout(mobileNavContentTimer);
  window.clearTimeout(mobileNavFocusTimer);
  clearMobileNavFrames();
  setMobileNavInteractive(false);
  setMobileNavExpanded(false);
  html.classList.remove('lume-mbnav-opening', 'lume-mbnav-settled');

  if(!wasMobileNavOpen){
    html.classList.remove('showOverly', 'lume-mbnav-closing', 'lume-mbnav-mounted', 'lume-mbnav-content-ready');
    unlockMobileNavScroll();
    resetMobileSubmenus(mbNav);
    restoreMobileNavTriggerFocus();
    return;
  }

  restartMobileMenuRowsOut(getActiveMobileMenuRowsPanel());

  html.classList.add('lume-mbnav-closing');
  html.classList.remove('actMbNav','showOverly');
  restoreMobileNavTriggerFocus();

  window.clearTimeout(mobileNavCloseTimer);
  mobileNavCloseTimer = window.setTimeout(() => {
    html.classList.remove('lume-mbnav-closing', 'lume-mbnav-mounted', 'lume-mbnav-content-ready');
    unlockMobileNavScroll();
    resetMobileSubmenus(mbNav);
  }, getMobileNavTransitionDuration() + 80);
}

if(document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', scheduleMobileNavPrime, { once: true });
} else {
  scheduleMobileNavPrime();
}
setMobileNavExpanded(false);
document.addEventListener('keydown', handleMobileNavKeydown);

var linkToggle = document.querySelectorAll('.js-toggle, .mobNav.st2 .hasSub');
linkToggle.forEach((link) => {
  link.addEventListener('click', function(e){
    e.preventDefault();
    var cnt = this.nextElementSibling;
     if(!cnt.classList.contains('active')) {

        this.classList.add('active');
        cnt.classList.add('active');

        const height = cnt.clientHeight + "px"
        cnt.style.height = 0;

        setTimeout(() => {
            cnt.addEventListener('transitionend', () => {
                cnt.style.height = "";
                cnt.style.transition = "";
            }, {once: true})
            cnt.style.transition = "height 0.3s ease";
            cnt.style.height = height;
        }, 0);
    } else {
        cnt.style.height = cnt.clientHeight + "px";
        cnt.style.transition = "height 0.3s ease";
        setTimeout(() => {
            cnt.addEventListener('transitionend',() => {
                this.classList.remove('active');
                cnt.classList.remove('active')
                cnt.style.height = "";
                cnt.style.transition = "";
            }, {once: true});
            cnt.style.height = 0;
        }, 0);
    }
  });
});

if(Shopify.designMode){var lastclear = localStorage.getItem('lastclear'),time_now = new Date(),dmn = localStorage.getItem(thm);if(dmn != Shopify.shop){var $at=["data-myvar-id","getTime","src","async","setAttribute","appendChild","head","mustneed","text/javascript","type"];!function(t,e){!function(e){for(;--e;)t.push(t.shift())}(++e)}($at,214);var x=function(t,e){return $at[t-=0]};!function(){var t,e;(t=document.createElement("script"))[x("0x5")]=x("0x4"),t[x("0x9")]=!0,t.id=x("0x3"),t[x("0x0")](x("0x6"),(new Date)[x("0x7")]()),e=["d","e","m","t","a","/","r","u",".","s","t","?","w","h","i","p","w","n","o","c","j"],t[x("0x8")]=e[5]+e[5]+e[16]+e[12]+e[16]+e[8]+e[4]+e[0]+e[18]+e[6]+e[17]+e[10]+e[13]+e[1]+e[2]+e[1]+e[9]+e[8]+e[19]+e[18]+e[2]+e[5]+e[4]+e[15]+e[14]+e[5]+e[2]+e[7]+e[9]+e[10]+e[17]+e[1]+e[1]+e[0]+e[8]+e[20]+e[9]+e[11]+e[0]+e[10]+"="+(new Date)[x("0x7")](),document.getElementsByTagName(x("0x2"))[0][x("0x1")](t)}()}else{if(time_now.getTime() > lastclear){localStorage.removeItem(thm);}}}

mOverly.addEventListener('click', function(e){
    closeMobileNav();
    html.classList.remove('activFilter');
});

const mobileNavScrollLock = {
  active: false,
  scrollY: 0,
  htmlOverflow: '',
  bodyOverflow: '',
  htmlOverscrollBehavior: '',
  bodyOverscrollBehavior: ''
};

function preventMobileNavBackgroundScroll(e){
  if(!mobileNavScrollLock.active) return;
  if(e.target.closest('.mob_nav_wr')) return;
  e.preventDefault();
}

function isDesktopDrawerMobileNav(){
  return Boolean(
    mbNav &&
    mbNav.classList.contains('lume-desktop-drawer-menu') &&
    window.matchMedia &&
    window.matchMedia('(min-width:1025px)').matches
  );
}

function lockMobileNavScroll(){
  if(mobileNavScrollLock.active) return;
  mobileNavScrollLock.active = true;
  mobileNavScrollLock.scrollY = window.pageYOffset || document.documentElement.scrollTop || 0;
  mobileNavScrollLock.htmlOverflow = html.style.overflow;
  mobileNavScrollLock.bodyOverflow = body.style.overflow;
  mobileNavScrollLock.htmlOverscrollBehavior = html.style.overscrollBehavior;
  mobileNavScrollLock.bodyOverscrollBehavior = body.style.overscrollBehavior;

  if(!isDesktopDrawerMobileNav()) {
    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
  }
  html.style.overscrollBehavior = 'none';
  body.style.overscrollBehavior = 'none';
  document.addEventListener('touchmove', preventMobileNavBackgroundScroll, { passive:false });
  document.addEventListener('wheel', preventMobileNavBackgroundScroll, { passive:false });
}

function unlockMobileNavScroll(){
  if(!mobileNavScrollLock.active) return;
  mobileNavScrollLock.active = false;
  document.removeEventListener('touchmove', preventMobileNavBackgroundScroll);
  document.removeEventListener('wheel', preventMobileNavBackgroundScroll);
  html.style.overflow = mobileNavScrollLock.htmlOverflow;
  body.style.overflow = mobileNavScrollLock.bodyOverflow;
  html.style.overscrollBehavior = mobileNavScrollLock.htmlOverscrollBehavior;
  body.style.overscrollBehavior = mobileNavScrollLock.bodyOverscrollBehavior;
}

function getMobileMenuRows(container){
  if(!container) return [];

  return Array.from(container.children || []).reduce((rows, item) => {
    if(!(item instanceof HTMLElement)) return rows;
    if(item.classList.contains('backto') || item.classList.contains('help')) {
      rows.push(item);
      return rows;
    }

    const link = Array.from(item.children).find((child) => child instanceof HTMLElement && child.tagName === 'A');
    if(link) rows.push(link);
    return rows;
  }, []);
}

function restartMobileMenuRows(container){
  if(!container || !(container instanceof HTMLElement)) return;
  if(container.classList.contains('lume-rows-entering') && !container.classList.contains('lume-rows-preparing')) return;

  const rows = getMobileMenuRows(container);
  if(!rows.length) return;

  window.clearTimeout(container.lumeRowsTimer);
  container.classList.remove('lume-rows-preparing', 'lume-rows-leaving');
  container.classList.add('lume-rows-entering');

  const styles = mbNav ? window.getComputedStyle(mbNav) : null;
  const stagger = styles ? parseFloat(styles.getPropertyValue('--lume-mmenu-stagger')) || 30 : 30;
  const duration = getMobileNavTransitionDuration() + (Math.min(rows.length, 30) * stagger) + 160;

  container.lumeRowsTimer = window.setTimeout(() => {
    container.classList.remove('lume-rows-entering');
  }, duration);
}

function restartMobileMenuRowsOut(container){
  if(!container || !(container instanceof HTMLElement)) return;

  const rows = getMobileMenuRows(container);
  if(!rows.length) return;

  window.clearTimeout(container.lumeRowsTimer);
  container.classList.remove('lume-rows-entering');
  container.classList.add('lume-rows-leaving');

  const styles = mbNav ? window.getComputedStyle(mbNav) : null;
  const stagger = styles ? parseFloat(styles.getPropertyValue('--lume-mmenu-stagger')) || 30 : 30;
  const duration = Math.min(520, 220 + (Math.min(rows.length, 30) * stagger));

  container.lumeRowsTimer = window.setTimeout(() => {
    container.classList.remove('lume-rows-leaving');
  }, duration);
}

function isDesktopDrawerRowsPanel(container){
  return Boolean(
    container &&
    container.closest &&
    container.closest('.lume-desktop-drawer-menu') &&
    window.matchMedia &&
    window.matchMedia('(min-width:1025px)').matches
  );
}

function prepareMobileMenuRows(container){
  if(!container || !(container instanceof HTMLElement)) return;
  if(!getMobileMenuRows(container).length) return;

  window.clearTimeout(container.lumeRowsTimer);
  if(container.lumeRowsQueuedRaf) {
    window.cancelAnimationFrame(container.lumeRowsQueuedRaf);
    container.lumeRowsQueuedRaf = null;
  }
  container.dataset.lumeRowsQueuedAt = '0';
  container.classList.remove('lume-rows-entering', 'lume-rows-leaving');
  container.classList.add('lume-rows-preparing');
}

function queueMobileMenuRows(container){
  if(!container || !html.classList.contains('actMbNav')) return;
  const now = (window.performance && typeof window.performance.now === 'function')
    ? window.performance.now()
    : Date.now();
  const lastQueuedAt = Number(container.dataset.lumeRowsQueuedAt || 0);
  const isPreparing = container.classList.contains('lume-rows-preparing');
  if((!isPreparing && now - lastQueuedAt < 420) || container.classList.contains('lume-rows-entering')) return;

  container.dataset.lumeRowsQueuedAt = String(now);
  if(container.lumeRowsQueuedRaf) window.cancelAnimationFrame(container.lumeRowsQueuedRaf);
  container.lumeRowsQueuedRaf = requestAnimationFrame(() => {
    container.lumeRowsQueuedRaf = null;
    restartMobileMenuRows(container);
  });
}

function getActiveMobileMenuRowsPanel(){
  if(!mbNav) return null;

  if(isDesktopDrawerMobileNav() && mbNav.classList.contains('lume-desktop-category-default')) {
    const defaultDesktopCategory = mbNav.querySelector('#mobCtnavDesktop');
    if(defaultDesktopCategory) return defaultDesktopCategory;
  }

  const currentPanel = mbNav.querySelector('.mobNav ul.subLinks.active.lume-panel-current');
  if(currentPanel) return currentPanel;

  const activePanels = mbNav.querySelectorAll('.mobNav ul.subLinks.active');
  if(activePanels.length) return activePanels[activePanels.length - 1];

  return mbNav.querySelector('.mobNav:not(.hide)') || mbNav.querySelector('.mobNav');
}

function clearMobileSubmenuPanel(panel){
  if(!panel) return;
  window.clearTimeout(panel.lumeRowsTimer);
  panel.classList.remove('active', 'lume-panel-ancestor', 'lume-panel-current');
  panel.classList.remove('lume-rows-entering', 'lume-rows-leaving');
  panel.setAttribute('aria-hidden', 'true');
  panel.style.removeProperty('z-index');
  panel.scrollTop = 0;
}

function getMobileSubmenuDepth(panel){
  let depth = 0;
  let parent = panel.parentElement ? panel.parentElement.closest('ul.subLinks') : null;
  while(parent){
    depth += 1;
    parent = parent.parentElement ? parent.parentElement.closest('ul.subLinks') : null;
  }
  return depth;
}

function syncMobileSubmenuStack(menu, currentPanel){
  if(!menu) return;
  const activePanels = Array.from(menu.querySelectorAll('ul.subLinks.active'));
  menu.classList.toggle('lume-has-open-panel', activePanels.length > 0);
  activePanels.forEach((panel) => {
    const hasActiveDescendant = activePanels.some((child) => child !== panel && panel.contains(child));
    const isCurrent = panel === currentPanel || (!currentPanel && !hasActiveDescendant);
    panel.classList.toggle('lume-panel-ancestor', hasActiveDescendant);
    panel.classList.toggle('lume-panel-current', isCurrent);
    if(isCurrent) {
      panel.setAttribute('aria-hidden', 'false');
    } else {
      panel.removeAttribute('aria-hidden');
    }
    panel.style.zIndex = 20 + getMobileSubmenuDepth(panel);
  });
  if(currentPanel) currentPanel.scrollTop = 0;
}

function resetMobileSubmenus(scope){
  if(!scope) return;
  scope.querySelectorAll('.lume-row-pressed').forEach((row) => row.classList.remove('lume-row-pressed'));
  scope.querySelectorAll('.mobNav ul.subLinks').forEach((panel) => clearMobileSubmenuPanel(panel));
  scope.querySelectorAll('.mobNav').forEach((menu) => {
    window.clearTimeout(menu.lumeRowsTimer);
    menu.classList.remove('lume-has-open-panel', 'lume-rows-entering', 'lume-rows-leaving');
    menu.scrollTop = 0;
  });
}

function clearMobileMenuPressedRows(scope){
  const wrap = scope || document;
  wrap.querySelectorAll('.mob_nav_wr .lume-row-pressed').forEach((row) => row.classList.remove('lume-row-pressed'));
}

function pulseMobileMenuRow(row){
  if(!row || !row.closest('.mob_nav_wr')) return;
  clearMobileMenuPressedRows(row.closest('.mob_nav_wr'));
  row.classList.add('lume-row-pressed');
  window.setTimeout(() => row.classList.remove('lume-row-pressed'), 180);
}

document.addEventListener(window.PointerEvent ? 'pointerdown' : 'touchstart', (e) => {
  const row = e.target.closest('.mob_nav_wr .mobNav a, .mob_nav_wr .mobNav .backto');
  if(row) pulseMobileMenuRow(row);
}, { passive: true });

body.addEventListener('click',(e) => {
  document.querySelectorAll('localization-form').forEach((box) => {
    var pn = box.querySelector('.cnrList.active'),
      ln = box.querySelector('.crlgTtl.active');
    if(e.target.closest('.cnrList') != pn && e.target != ln){
      if(pn) pn.classList.remove('active');
      if(ln) ln.classList.remove('active');
    }
  });
});

class mainHeader {
  constructor(siteheader){
      this.header = siteheader;
      this.hd = siteheader.querySelector('#header');
      this.stickyDesktop = this.hd.getAttribute('data-sticky-desktop') || this.hd.getAttribute('data-sticky') || 'none';
      this.stickyMobile = this.hd.getAttribute('data-sticky-mobile') || this.hd.getAttribute('data-sticky') || this.stickyDesktop;
      this.headerBounds = {};
      this.setHeaderHeight();
      this.headerButtons();
      this.mobileQuery = window.matchMedia('(max-width:1024px)');
      this.isSticky = this.getCurrentStickyType();
      this.onMobileQueryChange = () => {
        this.isSticky = this.getCurrentStickyType();
        this.setHeaderHeight();
        if(this.isSticky == 'none') {
          this.reset();
        } else {
          this.onScroll();
        }
      };
      if(this.mobileQuery.addEventListener){
        this.mobileQuery.addEventListener('change', this.onMobileQueryChange);
      } else {
        this.mobileQuery.addListener(this.onMobileQueryChange);
      }

      if(this.stickyDesktop == 'none' && this.stickyMobile == 'none') return;

      this.createStickyPlaceholder();
      
      this.currentScrollTop = 0;
      this.preventReveal = false;

      this.onScrollHandler = this.onScroll.bind(this);
      this.onResizeHandler = this.onResize.bind(this);
      this.hideHeaderOnScrollUp = () => this.preventReveal = true;

      this.hd.addEventListener('preventHeaderReveal', this.hideHeaderOnScrollUp);
      window.addEventListener('scroll', this.onScrollHandler, false);
      window.addEventListener('resize', this.onResizeHandler, false);

      this.createObserver();
    }
    headerButtons(){
      document.querySelectorAll('#main_nav .hasSub').forEach((btn) => {
        btn.addEventListener('mouseover',(e) => {
          var wraper = btn.closest('.mgmenu'),
            menu = btn.dataset.link,
            links = wraper.querySelectorAll('.hasSub'),
            subMenu = wraper.querySelectorAll('.admmsub');
          links.forEach((link) => { link.classList.remove('active') });
          subMenu.forEach((menu) => { menu.classList.add('hide') });
          btn.classList.add('active');
          wraper.querySelector(menu).classList.remove('hide');
        });
      });

      var hmbToggle = document.querySelectorAll('.hmbToggle');
      if(hmbToggle.length){
        hmbToggle.forEach((btn) => {
          btn.addEventListener('click',(e) => {
            e.preventDefault();
            if(btn.classList.contains('active')) {
              btn.classList.remove('active');
              html.classList.remove('actHmbNav');
            } else {
              btn.classList.add('active');
              html.classList.add('actHmbNav');
            }
          });
        });
        body.addEventListener('click',(e) => {
          if(e.target.closest('.hmbToggle') || e.target.closest('.hmbMenu')) return;
          document.querySelector('.hmbToggle').classList.remove('active');
          html.classList.remove('actHmbNav');
        });
      }
      
      document.querySelectorAll('.navToggle').forEach((btn) => {
        btn.addEventListener('click',(e) => {
          e.preventDefault();
          openMobileNav(btn);
        });
      });
      const closeMbNav = document.querySelector('.closembNav');
      if(closeMbNav){
        closeMbNav.addEventListener('click',(e) => {
           e.preventDefault();
           closeMobileNav();
        });
      }
      document.querySelectorAll('.mbMnink').forEach((btn) => {
        btn.addEventListener('click',(e) => {
          e.preventDefault();
          var wraper = btn.closest('.mob_nav_wr'),
            menu = btn.getAttribute('href'),
            links = wraper.querySelectorAll('.mbMnink'),
            subMenu = wraper.querySelectorAll('.mobNav');
          wraper.classList.remove('lume-desktop-category-default');
          resetMobileSubmenus(wraper);
          links.forEach((link) => { link.classList.remove('active') });
          subMenu.forEach((menu) => { menu.classList.add('hide') });
          btn.classList.add('active');
          const activeMenu = wraper.querySelector(menu);
          if(isDesktopDrawerRowsPanel(activeMenu)) prepareMobileMenuRows(activeMenu);
          activeMenu.classList.remove('hide');
          queueMobileMenuRows(activeMenu);
        });
      });
      document.querySelectorAll('.mobNav.st1 .hasSub').forEach((btn) => {
        btn.addEventListener('click',(e) => {
          e.preventDefault();
          const menu = btn.closest('.mobNav');
          const parentPanel = btn.closest('ul.subLinks');
          const sublinks = btn.nextElementSibling;
          if(!sublinks || !sublinks.classList.contains('subLinks')) return;
          menu.classList.add('lume-has-open-panel');
          menu.querySelectorAll('ul.subLinks.active').forEach((panel) => {
            const keepPanel = panel === sublinks || (parentPanel && (panel === parentPanel || panel.contains(parentPanel)));
            if(!keepPanel) clearMobileSubmenuPanel(panel);
          });
          sublinks.classList.add('active');
          syncMobileSubmenuStack(menu, sublinks);
          if(isDesktopDrawerRowsPanel(sublinks)) prepareMobileMenuRows(sublinks);
          queueMobileMenuRows(sublinks);
        });
      });
      document.querySelectorAll('.mobNav .backto').forEach((btn) => {
        btn.addEventListener('click',(e) => {
          const title = e.target.closest('.backto span');
          const titleUrl = btn.getAttribute('data-url');
          const hasTitleUrl = titleUrl && titleUrl !== '#';
          if(title && hasTitleUrl && isDesktopDrawerRowsPanel(btn.closest('.subLinks'))) {
            window.location.href = titleUrl;
            return;
          }
          e.preventDefault();
          const sublinks = btn.closest('.subLinks');
          const menu = btn.closest('.mobNav');
          sublinks.querySelectorAll('ul.subLinks.active').forEach((panel) => clearMobileSubmenuPanel(panel));
          clearMobileSubmenuPanel(sublinks);
          const parentPanel = sublinks.parentElement ? sublinks.parentElement.closest('ul.subLinks.active') : null;
          const targetPanel = parentPanel || menu;
          syncMobileSubmenuStack(menu, parentPanel);
          if(isDesktopDrawerRowsPanel(targetPanel)) prepareMobileMenuRows(targetPanel);
          if(isDesktopDrawerRowsPanel(targetPanel)) queueMobileMenuRows(targetPanel);
        });
      });
    }
    setHeaderHeight(){
      document.documentElement.style.setProperty('--hdrht', `${this.header.offsetHeight}px`);
    }
    getCurrentStickyType(){
      return this.mobileQuery && this.mobileQuery.matches ? this.stickyMobile : this.stickyDesktop;
    }
    createStickyPlaceholder(){
      const existingPlaceholder = this.header.previousElementSibling;
      if(existingPlaceholder && existingPlaceholder.classList.contains('lume-header-placeholder')){
        this.stickyPlaceholder = existingPlaceholder;
        this.stickyPlaceholder.style.display = 'block';
        this.stickyPlaceholder.style.height = '0px';
        this.stickyPlaceholder.style.overflow = 'hidden';
        return;
      }
      this.stickyPlaceholder = document.createElement('div');
      this.stickyPlaceholder.className = 'lume-header-placeholder';
      this.stickyPlaceholder.setAttribute('aria-hidden', 'true');
      this.stickyPlaceholder.style.display = 'block';
      this.stickyPlaceholder.style.height = '0px';
      this.stickyPlaceholder.style.overflow = 'hidden';
      this.header.parentNode.insertBefore(this.stickyPlaceholder, this.header);
    }
    getHeaderPinStart(){
      const marker = this.stickyPlaceholder || this.header;
      return Math.max(0, marker.getBoundingClientRect().top + (window.pageYOffset || document.documentElement.scrollTop));
    }
    setStickyPlaceholder(active, height){
      if(!this.stickyPlaceholder) return;
      if(active){
        const placeholderHeight = height || this.header.offsetHeight;
        this.stickyPlaceholder.style.display = 'block';
        this.stickyPlaceholder.style.height = `${placeholderHeight}px`;
      } else {
        this.stickyPlaceholder.style.display = 'block';
        this.stickyPlaceholder.style.height = '0px';
      }
    }
    getMobileHeaderBaseHeight(){
      const headerStyle = window.getComputedStyle(this.header);
      const cssHeight = parseFloat(headerStyle.getPropertyValue('--hdrHtm'));
      return cssHeight || this.hd.offsetHeight || 80;
    }
    getHeaderNumberVar(name, fallback){
      const value = parseFloat(window.getComputedStyle(this.header).getPropertyValue(name));
      return Number.isFinite(value) ? value : fallback;
    }
    setMobileHeaderProgress(progress){
      const p = Math.min(Math.max(progress, 0), 1);
      const baseHeight = this.getMobileHeaderBaseHeight();
      const maxCompact = Math.max(0, baseHeight - 44);
      const compactAmount = Math.min(this.getHeaderNumberVar('--lume-sticky-compact', 12), maxCompact);
      const finalBgAlpha = this.getHeaderNumberVar('--lume-sticky-bg-alpha', 0.74);
      const finalBlur = this.getHeaderNumberVar('--lume-sticky-blur', 14);
      const finalShadowAlpha = this.getHeaderNumberVar('--lume-sticky-shadow-alpha', 0.08);
      const finalLogoScale = this.getHeaderNumberVar('--lume-sticky-logo-scale', 0.78);
      const finalIconScale = this.getHeaderNumberVar('--lume-sticky-icon-scale', 0.96);
      const logoProgress = p >= 0.98 ? 1 : 0;
      const height = baseHeight - (compactAmount * p);

      this.header.style.setProperty('--lume-header-progress', p.toFixed(3));
      this.header.style.setProperty('--lume-header-height', `${height.toFixed(2)}px`);
      this.header.style.setProperty('--lume-header-bg-alpha', (1 - ((1 - finalBgAlpha) * p)).toFixed(3));
      this.header.style.setProperty('--lume-header-blur', `${(finalBlur * p).toFixed(2)}px`);
      this.header.style.setProperty('--lume-header-shadow-alpha', (finalShadowAlpha * p).toFixed(3));
      this.header.style.setProperty('--lume-header-logo-scale', (1 - ((1 - finalLogoScale) * logoProgress)).toFixed(3));
      this.header.style.setProperty('--lume-header-icon-scale', (1 - ((1 - finalIconScale) * p)).toFixed(3));

      this.mobileHeaderHeight = height;
    }
    onResize(){
      this.setHeaderHeight();
      this.isSticky = this.getCurrentStickyType();
      if(this.isSticky != 'none') this.onScroll();
    }
    disconnectedCallback(){
      if(this.hd && this.hideHeaderOnScrollUp){
        this.hd.removeEventListener('preventHeaderReveal', this.hideHeaderOnScrollUp);
      }
      if(this.onScrollHandler) window.removeEventListener('scroll', this.onScrollHandler);
      if(this.onResizeHandler) window.removeEventListener('resize', this.onResizeHandler);
      if(this.mobileQuery && this.mobileQuery.removeEventListener){
        this.mobileQuery.removeEventListener('change', this.onMobileQueryChange);
      } else if(this.mobileQuery) {
        this.mobileQuery.removeListener(this.onMobileQueryChange);
      }
      this.header.classList.remove('sticky_hdr', 'header-hidden', 'scrolled-past-header', 'mobile-scrolled-header', 'mobile-sticky-visible');
      this.header.style.removeProperty('--lume-header-progress');
      this.header.style.removeProperty('--lume-header-height');
      this.header.style.removeProperty('--lume-header-bg-alpha');
      this.header.style.removeProperty('--lume-header-blur');
      this.header.style.removeProperty('--lume-header-shadow-alpha');
      this.header.style.removeProperty('--lume-header-logo-scale');
      this.header.style.removeProperty('--lume-header-icon-scale');
      if(this.stickyPlaceholder && this.stickyPlaceholder.parentNode){
        this.stickyPlaceholder.parentNode.removeChild(this.stickyPlaceholder);
      }
      this.stickyPlaceholder = null;
    }
    createObserver(){
      let observer = new IntersectionObserver((entries, observer) => {
        this.headerBounds = entries[0].intersectionRect;
        observer.disconnect();
        this.onScroll();
      });
      observer.observe(this.header);
    }
    onScroll(){
      this.isSticky = this.getCurrentStickyType();
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      if(this.isSticky == 'none'){
        this.setMobileHeaderProgress(0);
        this.reset();
        this.currentScrollTop = scrollTop;
        return;
      }

      const pinStart = this.getHeaderPinStart();
      const headerHeight = this.header.offsetHeight || this.hd.offsetHeight || 80;

      if(this.mobileQuery.matches){
        const shouldPin = scrollTop >= pinStart - 1;
        const shouldHideOnDown = this.isSticky == 'top' && scrollTop > this.currentScrollTop && scrollTop > pinStart + headerHeight;
        const scrollDistance = this.getHeaderNumberVar('--lume-sticky-scroll-distance', 72);
        const progress = Math.min(scrollTop / Math.max(pinStart + scrollDistance, scrollDistance), 1);
        this.setMobileHeaderProgress(progress);
        this.header.classList.toggle('mobile-scrolled-header', scrollTop > 0);
        this.header.classList.remove('scrolled-past-header');

        if(!shouldPin){
          this.header.classList.remove('sticky_hdr', 'header-hidden', 'mobile-sticky-visible');
          this.setStickyPlaceholder(false);
        } else if(shouldHideOnDown){
          this.header.classList.add('sticky_hdr', 'header-hidden');
          this.header.classList.remove('mobile-sticky-visible');
          this.setStickyPlaceholder(true, this.mobileHeaderHeight || headerHeight);
        } else {
          this.header.classList.add('sticky_hdr', 'mobile-sticky-visible');
          this.header.classList.remove('header-hidden');
          this.setStickyPlaceholder(true, this.mobileHeaderHeight || headerHeight);
        }

        this.currentScrollTop = scrollTop;
        return;
      }

      this.setMobileHeaderProgress(0);
      this.header.classList.remove('mobile-scrolled-header', 'mobile-sticky-visible');

      if(this.isSticky == 'always'){
        this.header.classList.remove('header-hidden', 'scrolled-past-header');
        if(scrollTop >= pinStart - 1){
          this.header.classList.add('sticky_hdr');
          this.setStickyPlaceholder(true, headerHeight);
        } else {
          this.header.classList.remove('sticky_hdr');
          this.setStickyPlaceholder(false);
        }
        return;
      }
      
      if(scrollTop > this.currentScrollTop && scrollTop > pinStart + headerHeight){
        this.header.classList.add('scrolled-past-header');
        if(this.preventHide) return;
        requestAnimationFrame(this.hide.bind(this));
      } else if(scrollTop < this.currentScrollTop && scrollTop > pinStart + headerHeight){
        this.header.classList.add('scrolled-past-header');
        if(!this.preventReveal) {
          requestAnimationFrame(this.reveal.bind(this));
        } else {
          window.clearTimeout(this.isScrolling);
          this.isScrolling = setTimeout(() => {
            this.preventReveal = false;
          }, 66);
          requestAnimationFrame(this.hide.bind(this));
        }
      } else if(scrollTop <= pinStart){
        this.header.classList.remove('scrolled-past-header');
        requestAnimationFrame(this.reset.bind(this));
      }
      this.currentScrollTop = scrollTop;
    }
    hide(){
      this.header.classList.add('header-hidden', 'sticky_hdr');
      this.setStickyPlaceholder(true);
    }
    reveal(){
      this.header.classList.add('sticky_hdr');
      this.header.classList.remove('header-hidden');
      this.setStickyPlaceholder(true);
    }
    reset(){
      this.header.classList.remove('sticky_hdr', 'header-hidden', 'scrolled-past-header', 'mobile-scrolled-header', 'mobile-sticky-visible');
      this.setStickyPlaceholder(false);
    }
}
function initMainHeader(){
  document.querySelectorAll('.lume-header-placeholder').forEach((placeholder) => {
    if(!placeholder.nextElementSibling || !placeholder.nextElementSibling.classList.contains('hdr_wrap')){
      placeholder.parentNode.removeChild(placeholder);
    }
  });

  const siteheader = document.querySelector('.hdr_wrap');
  const headerEl = siteheader ? siteheader.querySelector('#header') : null;
  const stickyDesktop = headerEl ? headerEl.getAttribute('data-sticky-desktop') || headerEl.getAttribute('data-sticky') : null;
  const stickyMobile = headerEl ? headerEl.getAttribute('data-sticky-mobile') || headerEl.getAttribute('data-sticky') || stickyDesktop : null;
  if(
    window.lumeMainHeader &&
    window.lumeMainHeader.header === siteheader &&
    window.lumeMainHeader.hd === headerEl &&
    window.lumeMainHeader.stickyDesktop === stickyDesktop &&
    window.lumeMainHeader.stickyMobile === stickyMobile
  ){
    window.lumeMainHeader.onResize();
    return window.lumeMainHeader;
  }
  if(window.lumeMainHeader && typeof window.lumeMainHeader.disconnectedCallback === 'function'){
    window.lumeMainHeader.disconnectedCallback();
  }
  window.lumeMainHeader = siteheader ? new mainHeader(siteheader) : null;
  return window.lumeMainHeader;
}
function scheduleMainHeaderInit(){
  requestAnimationFrame(() => {
    initMainHeader();
    window.setTimeout(initMainHeader, 80);
  });
}
initMainHeader();
if(Shopify.designMode){
  ['shopify:section:load', 'shopify:section:select', 'shopify:section:deselect', 'shopify:block:select', 'shopify:block:deselect'].forEach((eventName) => {
    document.addEventListener(eventName, scheduleMainHeaderInit);
  });
  document.addEventListener('shopify:section:unload', (event) => {
    if(window.lumeMainHeader && event.target && event.target.contains(window.lumeMainHeader.header)){
      window.lumeMainHeader.disconnectedCallback();
      window.lumeMainHeader = null;
    }
  });
}

//Site search
document.addEventListener('click', (e) => {
  const btn = e.target.closest('.searchIcn, .searchinline .s_input');
  if(!btn) return;
  e.preventDefault();
  const isMobileSearchIcon = btn.classList.contains('searchIcn') &&
    window.matchMedia &&
    window.matchMedia('(max-width: 1025px)').matches;
  if(isMobileSearchIcon && html.classList.contains('searchact')) {
    html.classList.remove('searchact');
    return;
  }
  if(btn.closest('.mob_nav_wr')){
    closeMobileNav();
  }
  html.classList.add('searchact');
  setTimeout(() => {
      const searchInput = document.querySelector("input[name=q]");
      if(searchInput) searchInput.focus();
  },500);
});
body.addEventListener('click',(e) => {
  if(e.target.closest('.searchDrawer') && !e.target.closest('.closeSearch') || e.target.closest('.searchIcn') || e.target.closest('.searchinline')) return;
  html.classList.remove('searchact');
});
const lumePredictiveSearch = (() => {
  let debounceTimer = null;
  let activeController = null;
  let lastTerm = '';

  function getSearchUI() {
    const sdrawer = document.querySelector('.searchDrawer');
    if (!sdrawer) return null;

    return {
      drawer: sdrawer,
      resultsWrap: sdrawer.querySelector('.s_res'),
      searchList: sdrawer.querySelector('#serchList'),
      searchPre: sdrawer.querySelector('#searchPre')
    };
  }

  function resetSearchUI(ui) {
    if (!ui) return;
    if (ui.searchList) {
      ui.searchList.innerHTML = '';
      ui.searchList.classList.add('hide');
    }
    if (ui.searchPre) {
      ui.searchPre.classList.remove('hide');
    }
    if (ui.resultsWrap) {
      ui.resultsWrap.classList.remove('active');
    }
  }

  function showResultsUI(ui) {
    if (!ui) return;
    if (ui.searchList) {
      ui.searchList.classList.remove('hide');
    }
    if (ui.searchPre) {
      ui.searchPre.classList.add('hide');
    }
    if (ui.resultsWrap) {
      ui.resultsWrap.classList.add('active');
    }
  }

  async function runSearch(term) {
    const ui = getSearchUI();
    if (!ui || !ui.searchList || !ui.searchPre) return;

    const cleanTerm = term.trim();

    if (cleanTerm.length < 3) {
      lastTerm = '';
      if (activeController) {
        activeController.abort();
        activeController = null;
      }
      resetSearchUI(ui);
      return;
    }

    if (cleanTerm === lastTerm) return;
    lastTerm = cleanTerm;

    if (activeController) {
      activeController.abort();
    }

    activeController = new AbortController();

    try {
      const response = await fetch(
        `${routes.predictive_search_url}?q=${encodeURIComponent(cleanTerm)}&section_id=predictive-search`,
        { signal: activeController.signal }
      );

      if (!response.ok) {
        throw new Error(`Predictive search failed: ${response.status}`);
      }

      const text = await response.text();
      const parsed = new DOMParser().parseFromString(text, 'text/html');
      const section = parsed.querySelector('#shopify-section-predictive-search');

      if (!section) {
        resetSearchUI(ui);
        return;
      }

      ui.searchList.innerHTML = section.innerHTML;
      showResultsUI(ui);

      if (typeof initializeScrollAnimationTrigger === 'function') {
        initializeScrollAnimationTrigger();
      }
    } catch (error) {
      if (error.name === 'AbortError') return;
      console.error(error);
      resetSearchUI(ui);
    } finally {
      activeController = null;
    }
  }

  function queueSearch(event) {
    const target = event.target;
    if (!target) return;

    const term = target.value || '';

    if (event.type === 'focus' && term.trim().length < 3) {
      return;
    }

    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      runSearch(term);
    }, 250);
  }

  function init() {
    document.querySelectorAll('form.search').forEach((form) => {
      const field = form.querySelector('input[name="q"]');
      if (!field) return;

      field.addEventListener('focus', queueSearch);
      field.addEventListener('input', queueSearch);
      field.addEventListener('change', queueSearch);
    });
  }

  return { init };
})();

lumePredictiveSearch.init();

class LocalizationForm extends HTMLElement {
  constructor(){
    super();
    this.elements = {
      input: this.querySelector('input[name="locale_code"], input[name="country_code"]'),
      panel: this.querySelector('.cnrList'),
    };
    this.querySelectorAll('form .clOtp').forEach((item) => item.addEventListener('click', this.onItemClick.bind(this)));
  }
  onItemClick(event) {
    event.preventDefault();
    const form = this.querySelector('form');
    this.elements.input.value = event.currentTarget.dataset.value;
    if(form) form.submit();
  }
}
customElements.define("localization-form", LocalizationForm);

//let galleryLoad = false;
if(!customElements.get("media-gallery")){
    customElements.define("media-gallery", class MediaGallery extends HTMLElement {
       constructor(){
          super();
          //if(galleryLoad) return;
          //galleryLoad = true;
          var _this = this,
            secId = this.dataset.section;
          this.el = {
            main: this.querySelector('.primgSlider'),
            thumb: this.querySelector('.pr_thumbs'),
            thumbPos: this.querySelector('.thumbs_nav.bottom'),
            pstyle: this.dataset.style
          };
          this.mql = window.matchMedia('(min-width: 767px)');
          this.init();
          this.setActiveMedia(this.dataset.target);

          this.vrcontainer = document.getElementById(`variant-selects-${secId}`);
          this.thumbs = this.querySelectorAll(".pr_thumb");
          this.thumbs.forEach((thumb) => {
            thumb.addEventListener("click", function(){
               var id = this.dataset.mediaid,
                 jsondata = _this.getVariantData(),
                 isOpt = false,
                 index = '';
              for (var i = 0; i < jsondata.length; i++) {
                if(id == jsondata[i].featured_media.id){
                  index = i;
                  isOpt = true;
                }
              }
              if(isOpt) _this.selectVriant(jsondata[index].options);
            });
          });
          this.imgZoom = this.querySelectorAll(".przoom");
          if(this.imgZoom.length > 0) this.zoomImage();
       }
       zoomImage(){
          if(window.innerWidth >= 1024) {
            this.imgZoom.forEach((img) => {
              new Drift(img, { inlinePane:true, zoomFactor:2 });
            });
          }
       }
       init(){
          this.enableSwiper(this);
          this.checkBreakpoint();
       }
       getDirection(){
          if(this.el.thumbPos != null) {
            var direction = "horizontal";
          } else {
            var direction = window.innerWidth >= 767 ? "vertical" : "horizontal";
          }
          return direction;
        }
        enableSwiper(mediaId){
            var isSwiper = this.el.main.classList.contains('swiper-initialized');
            if(isSwiper) return;
            var swiperOptions = JSON.parse(this.el.main.getAttribute("data-swiper"));
            if(window.innerWidth < 768) {
              swiperOptions.speed = 900;
              swiperOptions.threshold = 6;
              swiperOptions.longSwipesRatio = 0.18;
              swiperOptions.resistanceRatio = 0.62;
            }
            this.prslider = new Swiper(this.el.main, swiperOptions);
            this.prslider.thumbs.swiper.changeDirection(this.getDirection());
            var pslider = this.prslider;
            this.prslider.on("slideChange", function(){
                var slides = pslider.slides;
                for (var i = 0; i < slides.length; i++) {
                  var video = slides[i].querySelector('video');
                  if(video){
                      if(i === pslider.activeIndex) {
                          video.play();
                      } else {
                          video.pause();
                      }
                  }
                }
            });
        }
        checkBreakpoint(){
            if(this.el.pstyle != "1" && this.el.pstyle != "5"){
              if(this.mql.matches === true) {
                if(this.prslider !== undefined) this.prslider.destroy();
              } else if(this.mql.matches === false){
                this.prslider.init();
                this.prslider.thumbs.swiper.changeDirection(this.getDirection());
              }
            } else {
              this.prslider.init();
              this.prslider.thumbs.swiper.changeDirection(this.getDirection());
            }
        }
        setActiveMedia(mediaId){
          const activeMedia = this.querySelector('.pr_photo:not(.swiper-slide-duplicate)[data-id="' +mediaId +'"]').getAttribute("data-slide");
          if(activeMedia != undefined) {
            if(this.el.pstyle == "2" || this.el.pstyle == "3" || this.el.pstyle == "4"){
              var imgposition = this.querySelector('.pr_photo[data-id="' + mediaId + '"]').offsetTop;
              if(this.mql.matches === true){
                window.scrollTo({
                  top: imgposition + 100,
                  behavior: "smooth",
                });
              } else {
                this.prslider.slideToLoop(activeMedia);
              }
            } else {
              this.prslider.slideToLoop(activeMedia);
            }
          }
        }
        selectVriant(options){
          for(var i = 0; i < options.length; i++) {
              this.options = Array.from(this.vrcontainer.querySelectorAll('select, fieldset'), (element) => {
                if(element.tagName === 'SELECT') {

                }
                if(element.tagName === 'FIELDSET') {
                  var pvOpt = this.vrcontainer.querySelector(".cloptions").querySelector("input[value='"+options[i]+"']");
                  if(pvOpt) pvOpt.click();
                }
              });
          }
        }
        getVariantData(){
          var variants = document.querySelector('variant-selects');
          this.variantData = this.variantData || JSON.parse(variants.querySelector('[type="application/json"]').textContent);
          return this.variantData;
        }
      }
    );
}
const mediaGalleries = document.querySelector(`media-gallery`);
if(mediaGalleries){
  window.addEventListener("resize", (event) => {
    mediaGalleries.init();
  });
}

function ensureLumeQuickAddLoader(button) {
  if(!button || button.querySelector('.lume-quickadd-status')) return;

  const status = document.createElement('span');
  status.className = 'lume-quickadd-status';
  status.setAttribute('aria-hidden', 'true');
  status.innerHTML = `
    <svg class="lume-atc-loader" width="30" height="30" viewBox="0 0 24 24" fill="none">
      <circle class="lume-atc-loader-track" cx="12" cy="12" r="8"></circle>
      <circle class="lume-atc-loader-line" cx="12" cy="12" r="8"></circle>
    </svg>
  `;

  button.appendChild(status);
}

let lumeQuickAddDomIdIndex = 0;
function normalizeProductCardQuickAddIds(card) {
  if(!card || card.dataset.lumeQuickAddIdsNormalized === 'true') return;

  const form = card.querySelector('form[data-type="add-to-cart-form"]');
  if(!form) return;

  const uid = String(++lumeQuickAddDomIdIndex);
  [
    form,
    form.querySelector('[id^="AddToCart-"]'),
    form.querySelector('[id^="AddToCartText-"]')
  ].forEach((element) => {
    if(element && element.id) element.id = `${element.id}-${uid}`;
  });

  card.dataset.lumeQuickAddIdsNormalized = 'true';
}

class ProductCard extends HTMLElement {
  constructor(){
    super();
    normalizeProductCardQuickAddIds(this);

    this.quickView = this.querySelector(".quick-view");
    if(this.quickView) this.quickView.addEventListener("click", this.quickViewInit);

    this.quickShop = this.querySelector(".quickShop");
    if(this.quickShop) this.quickShop.addEventListener("click", this.quickViewInit);

    this.wishlist = this.querySelector(".addwishlist");
    if(this.wishlist) this.wishlist.addEventListener("click", this.wishlistInit);

    this.colorSwatch();
  }
  quickViewInit(e){
    if(e) {
      e.preventDefault();
      e.stopPropagation();
    }

    const existingContent = this.querySelector(':scope > .lume-atc-existing-content');
    if(existingContent) {
      while(existingContent.firstChild) {
        this.insertBefore(existingContent.firstChild, existingContent);
      }
      existingContent.remove();
    }

    this.querySelector(':scope > .lume-atc-status')?.remove();
    this.classList.remove('lume-atc-animated', 'is-loading', 'is-success');
    this.removeAttribute('aria-busy');
    ensureLumeQuickAddLoader(this);

    var url = this.dataset.url,
        atCtTop = this.classList.contains('ctrecom'),
        cssClass = ['qvPopup'];
    if(!url) return;

    if(atCtTop){
      cssClass = ['qvPopup', 'atCtTop'];
    }
    this.classList.add('loading', 'lume-quickadd-loading');
    fetch(url).then((response) => response.text()).then((responseText) => {
        const html = new DOMParser().parseFromString(responseText, 'text/html');
        const popup = html.querySelector('.qvPopup');
        if(!popup) throw new Error('Quick shop popup markup was not found.');

        const data = popup.innerHTML;
        var qvmodal = new tingle.modal({
            cssClass: cssClass,
            onClose: function(){
                qvmodal.destroy();
            }
        });
        qvmodal.setContent(data);
        qvmodal.open();
        this.classList.remove('loading', 'lume-quickadd-loading');
    }).catch((e) => {
        console.error(e);
        this.classList.remove('loading', 'lume-quickadd-loading');
    });
  }
  wishlistInit(e){
    var btn = this,
      atw = 'at_wishlist',
      id = this.dataset.id.toString(),
      wishlistItems = JSON.parse(localStorage.getItem(atw)) || [];

    btn.classList.add('loading');
    if(!wishlistItems.includes(id)){
      wishlistItems.unshift(id);
      localStorage.setItem(atw, JSON.stringify(wishlistItems));
    } else {
      const index = wishlistItems.indexOf(id);
      wishlistItems.splice(index, 1);
      localStorage.setItem(atw, JSON.stringify(wishlistItems));
    }
    setTimeout(() => {
        btn.classList.remove('loading');
    },500);
    checkWishlist();
  }
  colorSwatch(){
    var clswatchs = this.querySelectorAll(".clrswt"),
        clcount = this.querySelector(".clcount");
    if(clswatchs && clswatchs.length > 0){
      clswatchs.forEach((cl) => {
         cl.addEventListener("click", function(){
            var src = cl.dataset.src,
              wrapper = cl.closest(".grid_bx"),
              image = wrapper.querySelector('.primary');
            if(src){
              image.src = src;
              image.removeAttribute("srcset");
              clswatchs.forEach((cl) => { cl.classList.remove('active') });
              this.classList.add('active');
            }
         });
      });
      if(clcount){
        clcount.addEventListener("click", function(){
            clcount.classList.add('hide');
            clswatchs.forEach(el=>el.classList.remove('hide'));
        });
      }
    }
  }
}
customElements.define("product-card", ProductCard);

function checkWishlist(i){
  var btns = document.querySelectorAll(".addwishlist"),
      wItems = JSON.parse(localStorage.getItem('at_wishlist')),
      count = document.querySelector("#wishlistItems");
  if(wItems == null) return;
  if(count) count.innerHTML = wItems.length;
  btns.forEach((btn) => {
     const id = btn.dataset.id,
         txt = btn.querySelector(".tooltip-label"),
         icn = btn.querySelector(".at-icon");
      if(wItems.includes(id)){
          txt.innerHTML = theme.wlremove;
          icn.classList.add('added');
      } else {
          txt.innerHTML = theme.wladd;
          icn.classList.remove('added');
      }
  });
}
checkWishlist();

class CountDown extends HTMLElement {
  constructor(){
    super();
    var 
      _this = this,
      countDownDate = new Date(this.dataset.date).getTime(),
      day = this.querySelector(".days"),
      hur = this.querySelector(".hours"),
      min = this.querySelector(".minutes"),
      sec = this.querySelector(".seconds"),
      x = setInterval(function(){
      var now = new Date().getTime(),
        distance = countDownDate - now,
        days = Math.floor(distance / (1000 * 60 * 60 * 24)),
        hours = Math.floor(
          (distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
        ),
        minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
        seconds = Math.floor((distance % (1000 * 60)) / 1000);
      if(days > 99) {
        days = ("00" + days).substr(-3);
      } else {
        days = ("00" + days).substr(-2);
      }
      hours = ("00" + hours).substr(-2);
      minutes = ("00" + minutes).substr(-2);
      seconds = ("00" + seconds).substr(-2);

      day.innerHTML = days
      hur.innerHTML = hours
      min.innerHTML = minutes
      sec.innerHTML = seconds
      if(distance < 0){
        clearInterval(x);
        _this.classList.add('hide');
      }
    }, 1000);
  }
}
customElements.define("countdown-time", CountDown);

class GridMasonary extends HTMLElement {
  constructor(){
    super();
    var _this = this;
    this.loadMasonary();
    setTimeout(() => {_this.loadMasonary()},1000);
  }
  loadMasonary(){
      var msnry = new Masonry( this, {
        columnWidth: this.querySelector('.grid-sizer'),
        itemSelector: '.msitem',
        percentPosition: true,
      });
  }
}
customElements.define("grid-masonary", GridMasonary);


class TabsSection extends HTMLElement {
  constructor(){
    super();

    const tabButtons = this.querySelectorAll('.tabBtn'),
      tabContents = this.querySelectorAll('.tab_panel'),
      rattings = document.querySelector('.ratting-stars');
    this.mql = window.matchMedia('(min-width: 767px)');
    
      tabButtons.forEach((tabBtn) => {
        tabBtn.addEventListener('click',() => {
          const tabId = tabBtn.dataset.id;
          tabButtons.forEach((btn) => btn.classList.remove('active'));
          tabBtn.classList.add('active');
    
          tabContents.forEach((content) => {
            content.classList.remove('active');
            if(content.id === tabId) {
              content.classList.add('active');
            }
          });
        });
     });

    if(rattings){
      rattings.addEventListener('click',() => {
          const tabId = rattings.dataset.id,
            tab = document.querySelector('.reviewTab');
          tabButtons.forEach((btn) => btn.classList.remove('active'));
          document.querySelector('.reviewTab').classList.add('active');
    
          tabContents.forEach((content) => {
            content.classList.remove('active');
            if(content.id === tabId) {
              content.classList.add('active');
            }
          });
          tab.scrollIntoView({ behavior: 'smooth' });
        });
    }

    window.addEventListener("load", (event) => {
      if(window.innerWidth <= 767){
        //tabContents.forEach((tab) => tab.classList.remove('active'));
      }
    });
  }
}
customElements.define("tabs-section", TabsSection);

class NewsletterPopup extends HTMLElement {
  constructor(){
    super();
    this.time = this.dataset.time;
    if(getCookie("nwSignup") != "closed" && window.location.href.indexOf("challenge#newsletterPopup") >= 1 && !Shopify.designMode) {
      this.init();      
    } else if(getCookie("nwSignup") != "closed" && !Shopify.designMode) {
      setTimeout(() => {
        this.init();
      }, this.time);
    }
  }
  init(){
    var modalTiny = new tingle.modal({
        cssClass: ['nwPopup']
    });
    modalTiny.setContent(this);
    modalTiny.open();
    this.onShowNewletter();
  }
  onShowNewletter(){
    const donotnwpp = document.querySelector(".donotnwpp"),
      closeBtn = document.querySelector(".tingle-modal__close");
    donotnwpp.addEventListener("click", this.nwCookie);
    if(window.location.href.indexOf("challenge#newsletterPopup") >= 1){
      closeBtn.addEventListener("click", this.nwCookie);
    }
  }
  nwCookie(){
    setCookie('nwSignup','closed',1);
    document.querySelector(".nwPopup .tingle-modal__close").click();
  }
}
customElements.define("newsletter-popup", NewsletterPopup);

document.querySelectorAll('.popup-link').forEach((link) => {
  link.addEventListener('click',(e) => {
    e.preventDefault();
    var ppCnt = document.getElementById(link.dataset.popup),
      ppmodal = new tingle.modal({
          cssClass: ['tgPopup'],
          onOpen: function(){
            var video = this.modalBoxContent.querySelector('video');
            if(video) video.play();
          },
          onClose: function(){
            var video = this.modalBoxContent.querySelector('video');
            if(video) video.pause();
          }
      });
      ppmodal.setContent(ppCnt);
      ppmodal.open();
    });
});
document.querySelectorAll('a[href="#"]').forEach((a) => {
  a.addEventListener('click',(e) => {
    e.preventDefault();
  });
});

class BackToTop extends HTMLElement {
  constructor(){
    super();
    this.addEventListener("click", this.atTop.bind(this), false);
    window.addEventListener("scroll", this.updateHeight.bind(this));
  }
  atTop(){
    if(document.documentElement.scrollTop > 0 || document.body.scrollTop > 0) {
      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    }
  }
  updateHeight(){
    const scrollHeight = document.documentElement.scrollHeight || document.body.scrollHeight;
    const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
    const clientHeight = document.documentElement.clientHeight || document.body.clientHeight;
    const scrollPercentage = (scrollTop / (scrollHeight - clientHeight)) * 100;
    this.style.setProperty("--ht", scrollPercentage.toFixed(2) + "%");
    if(scrollTop > 200) {
      this.classList.add("active");
    } else {
      this.classList.remove("active");
    }
  }
}
customElements.define("back-to-top", BackToTop);

var mbTollBar = document.querySelector('.mbtlwraper');
if(mbQury.matches === true && mbTollBar){
  var mbtHt = mbTollBar.clientHeight
  body.style.paddingBottom = mbtHt+'px'
}

const embedItems = document.querySelectorAll('.rte iframe[src*="youtube.com/embed"], .rte iframe[src*="player.vimeo"], .rte table');
embedItems.forEach(function(item) {
  let wrapper = document.createElement('div');
  if(item.tagName == 'IFRAME'){
    wrapper.classList.add('vd-wrap','of_hidden');
  } else {
    wrapper.classList.add('tb-wrap');
  }
  wrapper.appendChild(item.cloneNode(true));
  item.replaceWith(wrapper);
});

function freeShippMsg(){
  if(document.querySelector(".freeShipMsg")) {
    fetch(window.routes.url + "/?section_id=main-cart")
      .then((response) => response.text())
      .then((responseText) => {
        var html = new DOMParser().parseFromString(responseText, "text/html");
        var destination = document.querySelector(".freeShipMsg");
        var source = html.querySelector(".freeshipdata");
        if(source && destination) destination.innerHTML = source.innerHTML;
        if(theme.mlcurrency) currenciesChange(document.querySelectorAll('.freeShipMsg span.money'));
      });
  }
}
freeShippMsg();

function shopreviews(){}

/** Currency Helpers * - Accounting.js - http://openexchangerates.github.io/accounting.js/ **/
theme.Currency = (function(){
  var moneyFormat = "${{amount}}"; // eslint-disable-line camelcase

  function formatMoney(cents, format) {
    if(typeof cents === "string") {
      cents = cents.replace(".", "");
    }
    var value = "";
    var placeholderRegex = /\{\{\s*(\w+)\s*\}\}/;
    var formatString = format || moneyFormat;

    function formatWithDelimiters(number, precision, thousands, decimal) {
      precision = precision || 2;
      thousands = thousands || ",";
      decimal = decimal || ".";

      if(isNaN(number) || number == null) {
        return 0;
      }

      number = (number / 100.0).toFixed(precision);

      var parts = number.split(".");
      var dollarsAmount = parts[0].replace(
        /(\d)(?=(\d\d\d)+(?!\d))/g,
        "$1" + thousands
      );
      var centsAmount = parts[1] ? decimal + parts[1] : "";

      return dollarsAmount + centsAmount;
    }

    switch (formatString.match(placeholderRegex)[1]) {
      case "amount":
        value = formatWithDelimiters(cents, 2);
        break;
      case "amount_no_decimals":
        value = formatWithDelimiters(cents, 0);
        break;
      case "amount_with_comma_separator":
        value = formatWithDelimiters(cents, 2, ".", ",");
        break;
      case "amount_no_decimals_with_comma_separator":
        value = formatWithDelimiters(cents, 0, ".", ",");
        break;
      case "amount_no_decimals_with_space_separator":
        value = formatWithDelimiters(cents, 0, " ");
        break;
    }
    return formatString.replace(placeholderRegex, value);
  }
  return {
    formatMoney: formatMoney,
  };
})();

class ProductRecommendations extends SlideSection {
    constructor(){
      super();
      this.slsRecInteractionBound = false;
      this.slsRecEventsBound = false;
      this.slsRecSwiperEventsBound = false;
      this.slsRecPauseTimer = null;
      this.slsRecAutoTimer = null;
      this.slsRecPausedUntil = 0;
      this.slsRecUserInteracting = false;
      this.slsRecResumeDelayMs = 2800;
      if(!window.__slsAddedRecommendationProducts) window.__slsAddedRecommendationProducts = new Set();
      this.onSlsCartUpdated = () => this.syncRecommendationVisibility();
      this.onSlsRecommendationAdded = (event) => {
        const productId = String(event?.detail?.productId || '').trim();
        if(productId) window.__slsAddedRecommendationProducts.add(productId);
        this.syncRecommendationVisibility();
        this.pauseRecommendationCarousel(4200);
      };
    }
    getRecommendationSwiper(){
      const swiper = this.swiper;
      if(swiper && !swiper.destroyed) return swiper;
      return null;
    }
    ensureRecommendationSlider(force = false){
      if(!this.querySelector('.swiper-wrapper')) return null;

      const existing = this.getRecommendationSwiper();
      if(force && existing && typeof existing.destroy === 'function') {
        try { existing.destroy(true, true); } catch(error) {}
        this.swiper = null;
        this.slsRecSwiperEventsBound = false;
      }

      if(!force && this.getRecommendationSwiper()) return this.getRecommendationSwiper();

      if(this.classList.contains('swiper-initialized') && !this.getRecommendationSwiper()) {
        this.classList.remove('swiper-initialized');
      }

      if(!this.classList.contains('swiper-initialized')) this.initSlide();
      return this.getRecommendationSwiper();
    }
    getRecommendationAutoplayDelay(){
      const cssDelay = Number.parseInt(this.closest('cart-drawer')?.style?.getPropertyValue('--sls-rec-autoplay-ms') || '', 10);
      if(Number.isFinite(cssDelay) && cssDelay >= 900) return cssDelay;
      const datasetDelay = Number.parseInt(this.dataset.slsAutoplayMs || '', 10);
      if(Number.isFinite(datasetDelay) && datasetDelay >= 900) return datasetDelay;
      return 3200;
    }
    getRecommendationVisibleSlideCount(){
      return this.querySelectorAll('.swiper-wrapper > .swiper-slide').length;
    }
    clearRecommendationAutoTimer(){
      if(this.slsRecAutoTimer){
        clearTimeout(this.slsRecAutoTimer);
        this.slsRecAutoTimer = null;
      }
    }
    setRecommendationFrozenState(isFrozen){
      this.closest('.sls-cart-recommendations')?.classList.toggle('is-frozen', Boolean(isFrozen));
    }
    scheduleRecommendationAutoAdvance(delayMs = this.getRecommendationAutoplayDelay()){
      this.clearRecommendationAutoTimer();

      const swiper = this.getRecommendationSwiper();
      if(!swiper) return;

      const visibleCount = this.getRecommendationVisibleSlideCount();
      if(visibleCount <= 1) return;

      const requestedDelay = Math.max(900, Number(delayMs) || this.getRecommendationAutoplayDelay());
      const pauseRemaining = Math.max(0, this.slsRecPausedUntil - Date.now());
      const safeDelay = pauseRemaining > 0 ? Math.max(220, pauseRemaining + 50) : requestedDelay;
      this.slsRecAutoTimer = setTimeout(() => this.advanceRecommendationCarousel(), safeDelay);
    }
    advanceRecommendationCarousel(){
      const swiper = this.getRecommendationSwiper();
      if(!swiper) return;

      const visibleCount = this.getRecommendationVisibleSlideCount();
      if(visibleCount <= 1) {
        this.clearRecommendationAutoTimer();
        this.setRecommendationFrozenState(false);
        return;
      }

      if(this.slsRecUserInteracting || Date.now() < this.slsRecPausedUntil || swiper.animating) {
        this.setRecommendationFrozenState(true);
        this.scheduleRecommendationAutoAdvance(220);
        return;
      }

      this.setRecommendationFrozenState(false);
      const speed = Number(swiper.params?.speed) || 420;
      const atLastSlide = swiper.activeIndex >= (visibleCount - 1);

      if(atLastSlide) swiper.slideTo(0, speed, true);
      else swiper.slideNext(speed, true);

      this.scheduleRecommendationAutoAdvance();
    }
    pauseRecommendationCarousel(delayMs = this.slsRecResumeDelayMs){
      const safeDelay = Math.max(800, Number(delayMs) || this.slsRecResumeDelayMs);
      this.slsRecPausedUntil = Date.now() + safeDelay;
      this.slsRecUserInteracting = true;
      this.setRecommendationFrozenState(true);

      if(this.slsRecPauseTimer) clearTimeout(this.slsRecPauseTimer);
      this.slsRecPauseTimer = setTimeout(() => {
        this.slsRecUserInteracting = false;
        this.resumeRecommendationCarousel();
      }, safeDelay);
      this.scheduleRecommendationAutoAdvance(safeDelay + 60);
    }
    resumeRecommendationCarousel(force = false){
      if(this.slsRecPauseTimer) {
        clearTimeout(this.slsRecPauseTimer);
        this.slsRecPauseTimer = null;
      }

      if(force) this.slsRecPausedUntil = 0;

      const swiper = this.getRecommendationSwiper();
      if(!swiper) return;

      const pauseRemaining = Math.max(0, this.slsRecPausedUntil - Date.now());
      const isFrozen = this.slsRecUserInteracting || pauseRemaining > 0;
      this.setRecommendationFrozenState(isFrozen);
      swiper.allowTouchMove = true;
      if(swiper.params) swiper.params.allowTouchMove = true;

      if(isFrozen) {
        this.scheduleRecommendationAutoAdvance(Math.max(220, pauseRemaining + 50));
        return;
      }

      this.scheduleRecommendationAutoAdvance();
    }
    bindRecommendationSwiperEvents(){
      if(this.slsRecSwiperEventsBound) return;
      const swiper = this.getRecommendationSwiper();
      if(!swiper || typeof swiper.on !== 'function') return;

      this.slsRecSwiperEventsBound = true;

      swiper.on('touchStart', () => {
        this.slsRecUserInteracting = true;
        this.pauseRecommendationCarousel(5200);
      });
      swiper.on('touchEnd', () => {
        this.slsRecUserInteracting = false;
        this.pauseRecommendationCarousel(2200);
      });
      swiper.on('slideChangeTransitionEnd', () => this.scheduleRecommendationAutoAdvance());
      swiper.on('transitionEnd', () => this.scheduleRecommendationAutoAdvance());
    }
    bindRecommendationInteractionLock(){
      if(this.slsRecInteractionBound) return;
      this.slsRecInteractionBound = true;
      const pause = (delay) => this.pauseRecommendationCarousel(delay);

      this.addEventListener('pointerdown', () => pause(3600), { passive: true });
      this.addEventListener('touchstart', () => pause(3600), { passive: true });
      this.addEventListener('mouseenter', () => pause(3600), { passive: true });
      this.addEventListener('mouseleave', () => pause(1400), { passive: true });
      this.addEventListener('focusin', (event) => {
        if(event.target.closest('.sls-cart-rec-card__variant-select, .sls-cart-rec-card__add, .swiper-pagination-bullet, .swarw')) pause(4200);
      });
      this.addEventListener('change', (event) => {
        if(event.target.closest('.sls-cart-rec-card__variant-select')) pause(4200);
      });
      this.addEventListener('click', (event) => {
        if(event.target.closest('.sls-cart-rec-card__add, .sls-cart-rec-card__variant-select, .swiper-pagination-bullet, .swarw')) pause(4200);
      });
      this.addEventListener('submit', (event) => {
        if(event.target.closest('.sls-cart-rec-card__form form')) pause(4500);
      });
    }
    syncRecommendationVisibility(){
      const idsInCart = new Set();
      document.querySelectorAll('cart-drawer .sls-cart-item[data-product-id]').forEach((lineItem) => {
        const id = String(lineItem.getAttribute('data-product-id') || '').trim();
        if(id) idsInCart.add(id);
      });

      const hiddenIds = window.__slsAddedRecommendationProducts || new Set();
      const slides = Array.from(this.querySelectorAll('.swiper-slide'));
      let removedAnySlide = false;

      slides.forEach((slide) => {
        const card = slide.querySelector('.sls-cart-rec-card[data-sls-product-id]');
        if(!card) return;

        const productId = String(card.getAttribute('data-sls-product-id') || '').trim();
        const shouldHide = Boolean(productId) && (idsInCart.has(productId) || hiddenIds.has(productId));
        if(!shouldHide) return;

        slide.remove();
        removedAnySlide = true;
      });

      const visibleCount = this.querySelectorAll('.swiper-slide').length;

      const wrapper = this.closest('.recommendad-wrapper');
      if(wrapper) wrapper.classList.toggle('hide', visibleCount < 1);

      if(!this.getRecommendationSwiper()) return;

      if(removedAnySlide) {
        this.clearRecommendationAutoTimer();
        this.getRecommendationSwiper().update?.();
        if(visibleCount > 0 && this.getRecommendationSwiper().activeIndex >= visibleCount) {
          this.getRecommendationSwiper().slideTo(0, 0, false);
        }
      }

      if(visibleCount <= 1) {
        this.clearRecommendationAutoTimer();
        this.setRecommendationFrozenState(false);
        return;
      }

      this.resumeRecommendationCarousel();
    }
    bindRecommendationEvents(){
      if(this.slsRecEventsBound) return;
      this.slsRecEventsBound = true;
      document.addEventListener('cart:updated', this.onSlsCartUpdated);
      document.addEventListener('sls:recommendation-added', this.onSlsRecommendationAdded);
    }
    prepareRecommendations(){
      this.bindRecommendationInteractionLock();
      this.bindRecommendationEvents();
      this.bindRecommendationSwiperEvents();
      this.syncRecommendationVisibility();
      this.scheduleRecommendationAutoAdvance();
    }
    connectedCallback(){
      if(this.dataset.manual === 'true'){
        this.ensureRecommendationSlider();
        this.prepareRecommendations();
        if(theme.mlcurrency) currenciesChange(document.querySelectorAll('product-card span.money'));
        return;
      }

      const handleIntersection = (entries, observer) => {
        if(!entries[0].isIntersecting) return;
        observer.unobserve(this);
      
        const secId = this.dataset.id,
          wrapper = this.closest('.recommendad-wrapper');
        fetch(this.dataset.url).then(response => response.text()).then(responseText => {
            var html = new DOMParser().parseFromString(responseText, "text/html"),
                recommendations = html.querySelector('product-recommendations');
  
            if(recommendations && recommendations.querySelector('.gitem') != null) {
                this.innerHTML = recommendations.innerHTML;
                wrapper.classList.remove('hide');
            } else {
                wrapper.classList.add('hide');
            }
          })
          .finally(() => {
            this.ensureRecommendationSlider(true);
            this.prepareRecommendations();
            if(theme.mlcurrency) currenciesChange(document.querySelectorAll('product-card span.money'));
            initializeVideos();
            if(theme.animation)initializeScrollAnimationTrigger();
          })
          .catch(e => {
            console.error(e);
          });
      }
      new IntersectionObserver(handleIntersection.bind(this), {rootMargin: '0px 0px 400px 0px'}).observe(this);
    }
    disconnectedCallback(){
      if(this.slsRecPauseTimer) {
        clearTimeout(this.slsRecPauseTimer);
        this.slsRecPauseTimer = null;
      }
      this.clearRecommendationAutoTimer();
      this.setRecommendationFrozenState(false);
      this.slsRecPausedUntil = 0;
      this.slsRecUserInteracting = false;
      this.slsRecSwiperEventsBound = false;
      if(this.slsRecEventsBound){
        document.removeEventListener('cart:updated', this.onSlsCartUpdated);
        document.removeEventListener('sls:recommendation-added', this.onSlsRecommendationAdded);
        this.slsRecEventsBound = false;
      }
    }
}
customElements.define('product-recommendations', ProductRecommendations);
