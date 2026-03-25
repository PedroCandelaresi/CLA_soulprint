(function () {
  var SIDEBAR_STORAGE_KEY = 'cla-admin-sidebar-collapsed';
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

  function getMessages() {
    var lang =
      document.documentElement.getAttribute('lang') ||
      (typeof navigator !== 'undefined' ? navigator.language : '') ||
      'es';

    return String(lang).toLowerCase().indexOf('en') === 0 ? MESSAGES.en : MESSAGES.es;
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
