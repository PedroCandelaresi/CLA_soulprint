(function () {
  var SIDEBAR_STORAGE_KEY = 'cla-admin-sidebar-collapsed';
  var BRAND_LOGO_ASSET_PATH = 'assets/cla-logo.svg';
  var SIDEBAR_COLLAPSE_ICON =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5" width="17" height="14" rx="2"></rect><path d="M8.5 5v14"></path><path d="M14 9.25 10.5 12 14 14.75"></path></svg>';
  var SIDEBAR_EXPAND_ICON =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5" width="17" height="14" rx="2"></rect><path d="M8.5 5v14"></path><path d="M11 9.25 14.5 12 11 14.75"></path></svg>';
  var eyeOpenIcon =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.8-6 10-6 10 6 10 6-3.8 6-10 6-10-6-10-6Z"></path><circle cx="12" cy="12" r="3.2"></circle></svg>';
  var eyeClosedIcon =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3l18 18"></path><path d="M10.6 10.6a3.2 3.2 0 0 0 4.53 4.53"></path><path d="M9.9 5.2A11.3 11.3 0 0 1 12 5c6.2 0 10 7 10 7a18.3 18.3 0 0 1-3.3 3.9"></path><path d="M6.2 6.3C3.7 8 2 12 2 12s3.8 7 10 7a10.9 10.9 0 0 0 5.1-1.2"></path></svg>';
  var MESSAGES = {
    en: {
      collapseSidebar: 'Collapse sidebar',
      createCollection: 'Create collection',
      createProduct: 'Create product',
      emptyStateSupport: 'Try adjusting the filters or search terms to find what you need.',
      emptyStateSupportAction: 'Try adjusting the filters, or create a new item to get started.',
      expandSidebar: 'Expand sidebar',
      hidePassword: 'Hide password',
      showPassword: 'Show password'
    },
    es: {
      collapseSidebar: 'Contraer menú lateral',
      createCollection: 'Crear colección',
      createProduct: 'Crear producto',
      emptyStateSupport: 'Probá ajustando los filtros o la búsqueda para encontrar lo que necesitás.',
      emptyStateSupportAction: 'Probá ajustando los filtros o creá un nuevo elemento para empezar.',
      expandSidebar: 'Expandir menú lateral',
      hidePassword: 'Ocultar contraseña',
      showPassword: 'Mostrar contraseña'
    }
  };
  var brandLogoMarkupPromise = null;
  var brandLogoInstanceId = 0;

  function getMessages() {
    var lang =
      document.documentElement.getAttribute('lang') ||
      (typeof navigator !== 'undefined' ? navigator.language : '') ||
      'es';

    return String(lang).toLowerCase().indexOf('en') === 0 ? MESSAGES.en : MESSAGES.es;
  }

  function escapeRegExp(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function getBrandLogoAssetUrl() {
    try {
      return new URL(BRAND_LOGO_ASSET_PATH, document.baseURI).toString();
    } catch (error) {
      return BRAND_LOGO_ASSET_PATH;
    }
  }

  function getAdminRootHref() {
    try {
      return new URL('./', document.baseURI).toString();
    } catch (error) {
      return getAdminBasePath() + '/';
    }
  }

  function getBrandLogoMarkup() {
    if (!brandLogoMarkupPromise) {
      brandLogoMarkupPromise = window.fetch(getBrandLogoAssetUrl(), {
        credentials: 'same-origin'
      })
        .then(function (response) {
          if (!response.ok) {
            throw new Error('Unable to load CLA brand logo');
          }

          return response.text();
        })
        .then(function (markup) {
          return markup.trim();
        })
        .catch(function () {
          return null;
        });
    }

    return brandLogoMarkupPromise;
  }

  function replaceSvgReferenceIds(value, idMap) {
    var nextValue = value;

    Object.keys(idMap).forEach(function (sourceId) {
      nextValue = nextValue.replace(
        new RegExp('url\\(#' + escapeRegExp(sourceId) + '\\)', 'g'),
        'url(#' + idMap[sourceId] + ')'
      );

      if (nextValue === '#' + sourceId) {
        nextValue = '#' + idMap[sourceId];
      }
    });

    return nextValue;
  }

  function uniquifyBrandLogoIds(svg) {
    var instanceSuffix = 'cla-brand-' + brandLogoInstanceId;
    var idMap = {};
    var referenceAttributes = [
      'clip-path',
      'fill',
      'filter',
      'mask',
      'marker-start',
      'marker-mid',
      'marker-end',
      'href',
      'xlink:href'
    ];

    brandLogoInstanceId += 1;

    if (svg.hasAttribute('id')) {
      var rootId = svg.getAttribute('id');

      idMap[rootId] = rootId + '-' + instanceSuffix;
      svg.setAttribute('id', idMap[rootId]);
    }

    svg.querySelectorAll('[id]').forEach(function (element) {
      var sourceId = element.getAttribute('id');
      var nextId = sourceId + '-' + instanceSuffix;

      idMap[sourceId] = nextId;
      element.setAttribute('id', nextId);
    });

    svg.querySelectorAll('*').forEach(function (element) {
      referenceAttributes.forEach(function (attributeName) {
        var value = element.getAttribute(attributeName);

        if (!value) {
          return;
        }

        element.setAttribute(attributeName, replaceSvgReferenceIds(value, idMap));
      });
    });
  }

  function createBrandLogoSvg(markup, context) {
    var template = document.createElement('template');
    template.innerHTML = markup;

    if (!(template.content.firstElementChild instanceof SVGElement)) {
      return null;
    }

    var svg = template.content.firstElementChild;

    uniquifyBrandLogoIds(svg);
    svg.setAttribute('data-brand-context', context);

    return svg;
  }

  function mountBrandLogo(host, context) {
    if (!(host instanceof HTMLElement)) {
      return;
    }

    if (host.querySelector('svg[data-brand-context="' + context + '"]')) {
      return;
    }

    if (host.dataset.claBrandLoading === context) {
      return;
    }

    host.dataset.claBrandLoading = context;

    getBrandLogoMarkup().then(function (markup) {
      delete host.dataset.claBrandLoading;

      if (!markup || !document.documentElement.contains(host)) {
        return;
      }

      if (host.querySelector('svg[data-brand-context="' + context + '"]')) {
        return;
      }

      var svg = createBrandLogoSvg(markup, context);

      if (!(svg instanceof SVGElement)) {
        return;
      }

      host.replaceChildren(svg);
      host.dataset.claBrandMounted = context;
    });
  }

  function ensureSidebarBranding() {
    var branding = document.querySelector('.left-nav .branding');

    if (!(branding instanceof HTMLElement)) {
      return;
    }

    var legacyLink = branding.querySelector('a');

    if (!(legacyLink instanceof HTMLAnchorElement)) {
      return;
    }

    var collapseMenu = branding.querySelector('.collapse-menu');
    var stack = branding.querySelector('.cla-sidebar-brand-stack');

    branding.classList.add('cla-branding-shell');

    if (!(stack instanceof HTMLElement)) {
      stack = document.createElement('div');
      stack.className = 'cla-sidebar-brand-stack';

      if (collapseMenu && collapseMenu.parentNode === branding) {
        branding.insertBefore(stack, collapseMenu);
      } else {
        branding.insertBefore(stack, legacyLink);
      }
    }

    if (legacyLink.parentNode !== stack) {
      stack.insertBefore(legacyLink, stack.firstChild);
    }

    legacyLink.classList.add('cla-brand-mark', 'cla-brand-mark--sidebar');
    legacyLink.setAttribute('aria-label', 'CLA Soulprint');
    mountBrandLogo(legacyLink, 'sidebar');

    var detail = stack.querySelector('.cla-sidebar-brand-detail');

    if (!(detail instanceof HTMLElement)) {
      detail = document.createElement('div');
      detail.className = 'cla-sidebar-brand-detail';
      detail.setAttribute('aria-hidden', 'true');
      stack.appendChild(detail);
    }

    mountBrandLogo(detail, 'sidebar-detail');
  }

  function ensureTopBarBranding() {
    var breadcrumb = document.querySelector('.top-bar vdr-breadcrumb');

    if (!(breadcrumb instanceof HTMLElement) || !(breadcrumb.parentElement instanceof HTMLElement)) {
      return;
    }

    var shell = breadcrumb.parentElement;
    var link = shell.querySelector('.cla-brand-mark--top');

    shell.classList.add('cla-breadcrumb-shell');

    if (!(link instanceof HTMLAnchorElement)) {
      link = document.createElement('a');
      link.className = 'cla-brand-mark cla-brand-mark--top';
      link.href = getAdminRootHref();
      link.setAttribute('aria-label', 'CLA Soulprint');
      shell.insertBefore(link, breadcrumb);
    }

    mountBrandLogo(link, 'top');
  }

  function ensureLoginBranding() {
    var imageContent = document.querySelector('.login-wrapper .login-wrapper-image .login-wrapper-image-content');

    if (!(imageContent instanceof HTMLElement)) {
      return;
    }

    var slot = imageContent.querySelector('.cla-login-brand-slot');

    if (!(slot instanceof HTMLElement)) {
      slot = document.createElement('div');
      slot.className = 'cla-login-brand-slot';
      slot.setAttribute('aria-hidden', 'true');
      imageContent.insertBefore(slot, imageContent.firstChild);
    }

    mountBrandLogo(slot, 'login');
  }

  function findPasswordInput() {
    var wrappedPasswordInput = document.querySelector('.cla-password-field input');

    if (wrappedPasswordInput instanceof HTMLInputElement) {
      return wrappedPasswordInput;
    }

    var selectors = [
      '#login_password',
      '.login-group input.password',
      'input.password',
      'input[autocomplete="current-password"]',
      'input[name="password"]',
      'input[type="password"]'
    ];

    for (var index = 0; index < selectors.length; index += 1) {
      var candidate = document.querySelector(selectors[index]);

      if (candidate instanceof HTMLInputElement) {
        return candidate;
      }
    }

    return null;
  }

  function updatePasswordToggleState(button, input) {
    var messages = getMessages();
    var showingPassword = input.type === 'text';
    var nextState = showingPassword ? 'visible' : 'hidden';

    if (button.dataset.passwordVisibility === nextState) {
      return;
    }

    button.dataset.passwordVisibility = nextState;
    button.innerHTML = showingPassword ? eyeClosedIcon : eyeOpenIcon;
    button.setAttribute('aria-label', showingPassword ? messages.hidePassword : messages.showPassword);
    button.setAttribute('aria-pressed', showingPassword ? 'true' : 'false');
  }

  function enhancePasswordField() {
    var passwordInput = findPasswordInput();

    if (!(passwordInput instanceof HTMLInputElement)) {
      return;
    }

    var wrapper = passwordInput.closest('.cla-password-field');

    if (!wrapper) {
      wrapper = document.createElement('div');
      wrapper.className = 'cla-password-field';
      passwordInput.parentNode.insertBefore(wrapper, passwordInput);
      wrapper.appendChild(passwordInput);
    }

    var toggleButton = wrapper.querySelector('.cla-password-toggle');

    if (!toggleButton) {
      toggleButton = document.createElement('button');
      toggleButton.type = 'button';
      toggleButton.className = 'cla-password-toggle';
      toggleButton.addEventListener('click', function () {
        passwordInput.type = passwordInput.type === 'password' ? 'text' : 'password';
        updatePasswordToggleState(toggleButton, passwordInput);
        passwordInput.focus({ preventScroll: true });
      });
      wrapper.appendChild(toggleButton);
    }

    updatePasswordToggleState(toggleButton, passwordInput);
  }

  function isDesktopViewport() {
    return window.matchMedia('(min-width: 992px)').matches;
  }

  function readSidebarState() {
    try {
      return window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === 'true';
    } catch (error) {
      return false;
    }
  }

  function writeSidebarState(value) {
    try {
      window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(value));
    } catch (error) {
      return;
    }
  }

  function applySidebarPreference() {
    if (!(document.body instanceof HTMLBodyElement)) {
      return;
    }

    if (!isDesktopViewport()) {
      document.body.classList.remove('cla-sidebar-collapsed');
      return;
    }

    document.body.classList.toggle('cla-sidebar-collapsed', readSidebarState());
  }

  function updateSidebarToggleButton() {
    var button = document.querySelector('.cla-desktop-nav-toggle');
    var messages = getMessages();

    if (!(button instanceof HTMLButtonElement)) {
      return;
    }

    var collapsed = document.body.classList.contains('cla-sidebar-collapsed');
    button.innerHTML = collapsed ? SIDEBAR_EXPAND_ICON : SIDEBAR_COLLAPSE_ICON;
    button.setAttribute('aria-label', collapsed ? messages.expandSidebar : messages.collapseSidebar);
    button.setAttribute('title', collapsed ? messages.expandSidebar : messages.collapseSidebar);
    button.setAttribute('aria-pressed', collapsed ? 'true' : 'false');
  }

  function toggleDesktopSidebar() {
    if (!(document.body instanceof HTMLBodyElement) || !isDesktopViewport()) {
      return;
    }

    var collapsed = !document.body.classList.contains('cla-sidebar-collapsed');
    document.body.classList.toggle('cla-sidebar-collapsed', collapsed);
    writeSidebarState(collapsed);
    updateSidebarToggleButton();
  }

  function ensureDesktopSidebarToggle() {
    var topBar = document.querySelector('.top-bar');

    if (!(topBar instanceof HTMLElement)) {
      return;
    }

    var button = topBar.querySelector('.cla-desktop-nav-toggle');

    if (!(button instanceof HTMLButtonElement)) {
      button = document.createElement('button');
      button.type = 'button';
      button.className = 'cla-desktop-nav-toggle';
      button.addEventListener('click', toggleDesktopSidebar);

      var expandMenu = topBar.querySelector('.expand-menu');

      if (expandMenu && expandMenu.parentNode === topBar) {
        if (expandMenu.nextSibling) {
          topBar.insertBefore(button, expandMenu.nextSibling);
        } else {
          topBar.appendChild(button);
        }
      } else if (topBar.firstChild) {
        topBar.insertBefore(button, topBar.firstChild);
      } else {
        topBar.appendChild(button);
      }
    }

    updateSidebarToggleButton();
  }

  function isVisible(element) {
    return !!(element && element.getClientRects().length);
  }

  function looksLikeCreateAction(text) {
    return /(crear|create|nuevo|new|agregar|add|añadir)/i.test(text || '');
  }

  function getAdminBasePath() {
    var parts = window.location.pathname.split('/').filter(Boolean);

    return parts.length ? '/' + parts[0] : '';
  }

  function getFallbackEmptyAction(messages) {
    var pathname = window.location.pathname;
    var adminBasePath = getAdminBasePath();

    if (/\/catalog\/products(?:\/?$|[?#])/.test(pathname)) {
      return {
        href: adminBasePath + '/catalog/products/create',
        label: messages.createProduct
      };
    }

    if (/\/catalog\/collections(?:\/?$|[?#])/.test(pathname)) {
      return {
        href: adminBasePath + '/catalog/collections/create',
        label: messages.createCollection
      };
    }

    return null;
  }

  function createEmptyStateActionFromElement(action, messages) {
    var label = (action.textContent || '').replace(/\s+/g, ' ').trim();

    if (!label) {
      return null;
    }

    if (action instanceof HTMLAnchorElement && action.href) {
      var link = document.createElement('a');
      link.className = 'cla-empty-state-cta';
      link.href = action.href;
      link.textContent = label;

      return link;
    }

    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'cla-empty-state-cta';
    button.textContent = label;
    button.addEventListener('click', function () {
      action.click();
    });

    return button;
  }

  function createFallbackEmptyStateAction(messages) {
    var fallback = getFallbackEmptyAction(messages);

    if (!fallback) {
      return null;
    }

    var link = document.createElement('a');
    link.className = 'cla-empty-state-cta';
    link.href = fallback.href;
    link.textContent = fallback.label;

    return link;
  }

  function resolveEmptyStateAction(messages) {
    var contentArea = document.querySelector('.content-area') || document;
    var selector =
      'vdr-action-bar a.btn.btn-primary, vdr-action-bar button.btn.btn-primary, vdr-action-bar a.button.primary, vdr-action-bar button.button.primary';
    var candidates = contentArea.querySelectorAll(selector);

    for (var index = 0; index < candidates.length; index += 1) {
      var candidate = candidates[index];

      if (!(candidate instanceof HTMLElement)) {
        continue;
      }

      if (!isVisible(candidate) || candidate.closest('.modal')) {
        continue;
      }

      if (!looksLikeCreateAction(candidate.textContent)) {
        continue;
      }

      var action = createEmptyStateActionFromElement(candidate, messages);

      if (action) {
        return action;
      }
    }

    return createFallbackEmptyStateAction(messages);
  }

  function enhanceEmptyStates() {
    var messages = getMessages();
    var emptyStates = document.querySelectorAll('.empty-state');

    for (var index = 0; index < emptyStates.length; index += 1) {
      var emptyState = emptyStates[index];

      if (!(emptyState instanceof HTMLElement) || emptyState.dataset.claEnhanced === 'true') {
        continue;
      }

      var action = resolveEmptyStateAction(messages);
      var support = document.createElement('p');
      support.className = 'cla-empty-state-support';
      support.textContent = action ? messages.emptyStateSupportAction : messages.emptyStateSupport;
      emptyState.appendChild(support);

      if (action) {
        var actions = document.createElement('div');
        actions.className = 'cla-empty-state-actions';
        actions.appendChild(action);
        emptyState.appendChild(actions);
      }

      emptyState.dataset.claEnhanced = 'true';
    }
  }

  function runEnhancements() {
    applySidebarPreference();
    ensureSidebarBranding();
    ensureTopBarBranding();
    ensureLoginBranding();
    enhancePasswordField();
    ensureDesktopSidebarToggle();
    enhanceEmptyStates();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runEnhancements, { once: true });
  } else {
    runEnhancements();
  }

  window.addEventListener('resize', runEnhancements);

  var enhancementScheduled = false;
  var observer = new MutationObserver(function () {
    if (enhancementScheduled) {
      return;
    }

    enhancementScheduled = true;
    window.requestAnimationFrame(function () {
      enhancementScheduled = false;
      runEnhancements();
    });
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true
  });
})();
