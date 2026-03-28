(function () {
  var SIDEBAR_COLLAPSED_CLASS = 'cla-sidebar-collapsed';
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
  var PERSONALIZATION_MESSAGES = {
    en: {
      assetUnavailable: 'No linked file',
      fileName: 'File',
      loadErrorBody: 'The personalization data for this order could not be loaded.',
      loadErrorTitle: 'Unable to load personalization',
      loadingBody: 'Fetching the uploaded file and the current personalization status.',
      loadingTitle: 'Loading personalization',
      noDataBody: 'This order does not expose personalization data in the Admin API.',
      noDataTitle: 'Personalization not available',
      noNotes: 'No customer notes',
      noPreview: 'No preview available',
      notRequired: 'Does not require personalization',
      notRequiredDescription: 'This order does not include variants marked as personalized products.',
      notes: 'Customer notes',
      openFile: 'Open original file',
      orderCode: 'Order',
      orderRequiresNo: 'No',
      orderRequiresYes: 'Yes',
      orderState: 'Order status',
      pending: 'Pending upload',
      pendingDescription: 'This order requires a file and there is still no photo linked to the order.',
      paymentState: 'Payment',
      refresh: 'Refresh',
      required: 'Requires personalization',
      retry: 'Retry',
      shipmentState: 'Shipment',
      status: 'Personalization status',
      trackingCode: 'Tracking',
      title: 'Order personalization',
      unavailable: 'Unavailable',
      unknownStatus: 'Unknown status',
      uploaded: 'File uploaded',
      uploadedAt: 'Uploaded at',
      uploadedDescription: 'The operator already has a linked file and can open it directly from this order.',
      uploadedIncompleteDescription: 'The order is marked as uploaded, but the file data is incomplete.'
    },
    es: {
      assetUnavailable: 'No hay archivo vinculado',
      fileName: 'Archivo',
      loadErrorBody: 'No se pudieron cargar los datos de personalización de esta orden.',
      loadErrorTitle: 'No se pudo cargar la personalización',
      loadingBody: 'Consultando el archivo subido y el estado actual de personalización.',
      loadingTitle: 'Cargando personalización',
      noDataBody: 'Esta orden no expone datos de personalización en el Admin API.',
      noDataTitle: 'Personalización no disponible',
      noNotes: 'Sin notas del cliente',
      noPreview: 'Sin preview disponible',
      notRequired: 'No requiere personalización',
      notRequiredDescription: 'Esta orden no incluye variantes marcadas como productos personalizados.',
      notes: 'Notas del cliente',
      openFile: 'Abrir archivo original',
      orderCode: 'Pedido',
      orderRequiresNo: 'No',
      orderRequiresYes: 'Sí',
      orderState: 'Estado del pedido',
      pending: 'Pendiente',
      pendingDescription: 'Esta orden requiere un archivo y todavía no hay una foto vinculada al pedido.',
      paymentState: 'Pago',
      refresh: 'Actualizar',
      required: 'Requiere personalización',
      retry: 'Reintentar',
      shipmentState: 'Envío',
      status: 'Estado de personalización',
      trackingCode: 'Tracking',
      title: 'Personalización del pedido',
      unavailable: 'No disponible',
      unknownStatus: 'Estado desconocido',
      uploaded: 'Foto subida',
      uploadedAt: 'Fecha de carga',
      uploadedDescription: 'El operador ya tiene un archivo vinculado y puede abrirlo directamente desde esta orden.',
      uploadedIncompleteDescription: 'La orden figura como cargada, pero los datos del archivo están incompletos.'
    }
  };
  var PERSONALIZATION_PANEL_ID = 'cla-order-personalization-panel';
  var PERSONALIZATION_ORDER_QUERY_FIELDS = [
    'personalizationRequired',
    'personalizationStatus',
    'personalizationAssetPreviewUrl',
    'personalizationOriginalFilename',
    'personalizationUploadedAt',
    'personalizationNotes',
    'personalizationAsset'
  ];
  var PERSONALIZATION_INTROSPECTION_QUERY = [
    'query ClaOrderType {',
    '  __type(name: "Order") {',
    '    fields {',
    '      name',
    '      type {',
    '        kind',
    '        name',
    '        ofType {',
    '          kind',
    '          name',
    '          ofType {',
    '            kind',
    '            name',
    '            ofType {',
    '              kind',
    '              name',
    '            }',
    '          }',
    '        }',
    '      }',
    '    }',
    '  }',
    '}'
  ].join('\n');
  var PERSONALIZATION_TYPE_QUERY = [
    'query ClaType($name: String!) {',
    '  __type(name: $name) {',
    '    fields {',
    '      name',
    '      type {',
    '        kind',
    '        name',
    '        ofType {',
    '          kind',
    '          name',
    '          ofType {',
    '            kind',
    '            name',
    '            ofType {',
    '              kind',
    '              name',
    '            }',
    '          }',
    '        }',
    '      }',
    '    }',
    '  }',
    '}'
  ].join('\n');
  var brandLogoMarkupPromise = null;
  var brandLogoInstanceId = 0;
  var personalizationSchemaPromise = null;
  var personalizationLoadToken = 0;

  function isEnglishLanguage() {
    var lang =
      document.documentElement.getAttribute('lang') ||
      (typeof navigator !== 'undefined' ? navigator.language : '') ||
      'es';

    return String(lang).toLowerCase().indexOf('en') === 0;
  }

  function getMessages() {
    return isEnglishLanguage() ? MESSAGES.en : MESSAGES.es;
  }

  function getPersonalizationMessages() {
    return isEnglishLanguage() ? PERSONALIZATION_MESSAGES.en : PERSONALIZATION_MESSAGES.es;
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
    var existingTopLogo = document.querySelector('.top-bar .cla-brand-mark--top');

    if (existingTopLogo && existingTopLogo.parentNode) {
      existingTopLogo.parentNode.removeChild(existingTopLogo);
    }
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

  function setSidebarCollapsedState(value) {
    if (!(document.body instanceof HTMLBodyElement)) {
      return false;
    }

    document.body.classList.toggle(SIDEBAR_COLLAPSED_CLASS, value);
    document.body.setAttribute('data-cla-sidebar-collapsed', value ? 'true' : 'false');

    return value;
  }

  function applySidebarPreference() {
    if (!(document.body instanceof HTMLBodyElement)) {
      return;
    }

    if (!isDesktopViewport()) {
      setSidebarCollapsedState(false);
      return;
    }

    setSidebarCollapsedState(readSidebarState());
  }

  function updateSidebarToggleButton() {
    var messages = getMessages();
    var buttons = document.querySelectorAll('.cla-desktop-nav-toggle');
    var collapsed =
      document.body instanceof HTMLBodyElement &&
      document.body.classList.contains(SIDEBAR_COLLAPSED_CLASS);

    buttons.forEach(function (button) {
      if (!(button instanceof HTMLButtonElement)) {
        return;
      }

      button.innerHTML = collapsed ? SIDEBAR_EXPAND_ICON : SIDEBAR_COLLAPSE_ICON;
      button.setAttribute('aria-label', collapsed ? messages.expandSidebar : messages.collapseSidebar);
      button.setAttribute('title', collapsed ? messages.expandSidebar : messages.collapseSidebar);
      button.setAttribute('aria-pressed', collapsed ? 'true' : 'false');
    });
  }

  function toggleDesktopSidebar() {
    if (!(document.body instanceof HTMLBodyElement) || !isDesktopViewport()) {
      return;
    }

    var collapsed = !document.body.classList.contains(SIDEBAR_COLLAPSED_CLASS);

    setSidebarCollapsedState(collapsed);
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

  function handleDocumentClick(event) {
    if (!(event.target instanceof Element)) {
      return;
    }

    var desktopToggle = event.target.closest('.cla-desktop-nav-toggle');

    if (!(desktopToggle instanceof HTMLButtonElement)) {
      return;
    }

    event.preventDefault();
    toggleDesktopSidebar();
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

  function getStoredValue(key) {
    var rawValue = null;

    try {
      rawValue = window.sessionStorage.getItem(key) || window.localStorage.getItem(key);
    } catch (error) {
      return null;
    }

    if (!rawValue) {
      return null;
    }

    try {
      return JSON.parse(rawValue);
    } catch (error) {
      return rawValue;
    }
  }

  function getAdminAuthToken() {
    var value = getStoredValue('vnd_authToken');

    if (value && typeof value === 'object') {
      value = value.token || value.accessToken || value.value || null;
    }

    return typeof value === 'string' && value ? value : null;
  }

  function getActiveChannelToken() {
    var value = getStoredValue('vnd_activeChannelToken');
    return typeof value === 'string' && value ? value : null;
  }

  function getAdminApiUrl() {
    return window.location.origin + '/admin-api';
  }

  function getPersonalizationRequestHeaders() {
    var headers = {
      'Content-Type': 'application/json',
      'Apollo-Require-Preflight': 'true'
    };
    var channelToken = getActiveChannelToken();
    var authToken = getAdminAuthToken();

    if (channelToken) {
      headers['vendure-token'] = channelToken;
    }

    if (authToken) {
      headers.Authorization = 'Bearer ' + authToken;
    }

    return headers;
  }

  function requestGraphQl(query, variables) {
    return window.fetch(getAdminApiUrl(), {
      method: 'POST',
      credentials: 'include',
      headers: getPersonalizationRequestHeaders(),
      body: JSON.stringify({
        query: query,
        variables: variables || {}
      })
    }).then(function (response) {
      return response
        .json()
        .catch(function () {
          return {};
        })
        .then(function (body) {
          if (!response.ok) {
            var errorMessage =
              body && body.errors && body.errors.length
                ? body.errors.map(function (error) {
                    return error.message;
                  }).join(' ')
                : 'HTTP ' + response.status;
            throw new Error(errorMessage);
          }

          if (body && body.errors && body.errors.length) {
            throw new Error(
              body.errors
                .map(function (error) {
                  return error.message;
                })
                .join(' ')
            );
          }

          return body.data || {};
        });
    });
  }

  function unwrapGraphQlType(typeNode) {
    var currentType = typeNode;

    while (currentType && (currentType.kind === 'NON_NULL' || currentType.kind === 'LIST')) {
      currentType = currentType.ofType;
    }

    return currentType || null;
  }

  function findFieldDefinition(typeInfo, fieldName) {
    if (!typeInfo || !typeInfo.fields || !typeInfo.fields.length) {
      return null;
    }

    for (var index = 0; index < typeInfo.fields.length; index += 1) {
      if (typeInfo.fields[index].name === fieldName) {
        return typeInfo.fields[index];
      }
    }

    return null;
  }

  function createFallbackPersonalizationSchema() {
    var fieldMap = {};

    PERSONALIZATION_ORDER_QUERY_FIELDS.forEach(function (fieldName) {
      fieldMap[fieldName] = {
        name: fieldName
      };
    });

    return {
      fieldMap: fieldMap,
      hasCustomFields: true
    };
  }

  function getPersonalizationSchema() {
    if (!personalizationSchemaPromise) {
      personalizationSchemaPromise = requestGraphQl(PERSONALIZATION_INTROSPECTION_QUERY)
        .then(function (data) {
          var orderType = data && data.__type;
          var customFieldsDefinition = findFieldDefinition(orderType, 'customFields');
          var customFieldsType = unwrapGraphQlType(customFieldsDefinition && customFieldsDefinition.type);
          var customFieldsTypeName = customFieldsType && customFieldsType.name;

          if (!customFieldsTypeName) {
            return {
              fieldMap: {},
              hasCustomFields: false
            };
          }

          return requestGraphQl(PERSONALIZATION_TYPE_QUERY, {
            name: customFieldsTypeName
          }).then(function (customTypeData) {
            var customType = customTypeData && customTypeData.__type;
            var fieldMap = {};

            (customType && customType.fields ? customType.fields : []).forEach(function (field) {
              fieldMap[field.name] = field;
            });

            return {
              fieldMap: fieldMap,
              hasCustomFields: true
            };
          });
        })
        .catch(function () {
          return createFallbackPersonalizationSchema();
        });
    }

    return personalizationSchemaPromise;
  }

  function buildPersonalizationOrderQuery(schema) {
    if (!schema || !schema.hasCustomFields) {
      return null;
    }

    var selectedFields = [];

    PERSONALIZATION_ORDER_QUERY_FIELDS.forEach(function (fieldName) {
      if (!schema.fieldMap[fieldName]) {
        return;
      }

      if (fieldName === 'personalizationAsset') {
        selectedFields.push('personalizationAsset { id name preview source mimeType fileSize }');
        return;
      }

      selectedFields.push(fieldName);
    });

    if (!selectedFields.length) {
      return null;
    }

    return [
      'query ClaOrderPersonalization($id: ID!) {',
      '  order(id: $id) {',
      '    id',
      '    code',
      '    state',
      '    payments {',
      '      id',
      '      state',
      '      method',
      '      createdAt',
      '    }',
      '    fulfillments {',
      '      id',
      '      state',
      '      trackingCode',
      '    }',
      '    customFields {',
      selectedFields
        .map(function (field) {
          return '      ' + field;
        })
        .join('\n'),
      '    }',
      '  }',
      '}'
    ].join('\n');
  }

  function getCurrentOrderId() {
    var pathSegments = window.location.pathname.split('/').filter(Boolean);
    var ordersIndex = pathSegments.indexOf('orders');

    if (ordersIndex === -1) {
      return null;
    }

    for (var index = pathSegments.length - 1; index > ordersIndex; index -= 1) {
      var segment = pathSegments[index];

      if (
        !segment ||
        segment === 'orders' ||
        segment === 'seller-orders' ||
        segment === 'modify' ||
        segment === 'history' ||
        segment === 'create'
      ) {
        continue;
      }

      return decodeURIComponent(segment);
    }

    return null;
  }

  function getPersonalizationPanelAnchor() {
    return document.querySelector('vdr-order-custom-fields-card') || document.querySelector('vdr-custom-detail-component-host');
  }

  function getPersonalizationPanel() {
    var panel = document.getElementById(PERSONALIZATION_PANEL_ID);
    return panel instanceof HTMLElement ? panel : null;
  }

  function removePersonalizationPanel() {
    var panel = getPersonalizationPanel();

    if (panel && panel.parentNode) {
      panel.parentNode.removeChild(panel);
    }
  }

  function createElement(tagName, className, textContent) {
    var element = document.createElement(tagName);

    if (className) {
      element.className = className;
    }

    if (textContent != null) {
      element.textContent = textContent;
    }

    return element;
  }

  function getLastItem(items) {
    return Array.isArray(items) && items.length ? items[items.length - 1] : null;
  }

  function normalizeText(value) {
    return typeof value === 'string' && value.trim() ? value.trim() : null;
  }

  function firstDefinedValue() {
    for (var index = 0; index < arguments.length; index += 1) {
      var value = arguments[index];
      if (typeof value === 'string' && value.trim()) {
        return value.trim();
      }
    }

    return null;
  }

  function formatDateTime(value) {
    if (!value) {
      return null;
    }

    var date = value instanceof Date ? value : new Date(value);

    if (Number.isNaN(date.getTime())) {
      return null;
    }

    return new Intl.DateTimeFormat(isEnglishLanguage() ? 'en-US' : 'es-AR', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(date);
  }

  function getStatusPresentation(required, status, hasAsset) {
    var messages = getPersonalizationMessages();
    var normalizedStatus = status || (required ? (hasAsset ? 'uploaded' : 'pending') : 'not-required');

    if (!required || normalizedStatus === 'not-required') {
      return {
        description: messages.notRequiredDescription,
        label: messages.notRequired,
        tone: 'neutral'
      };
    }

    if (normalizedStatus === 'uploaded') {
      return {
        description: hasAsset ? messages.uploadedDescription : messages.uploadedIncompleteDescription,
        label: messages.uploaded,
        tone: 'success'
      };
    }

    if (normalizedStatus === 'pending') {
      return {
        description: messages.pendingDescription,
        label: messages.pending,
        tone: 'warning'
      };
    }

    return {
      description: hasAsset ? messages.uploadedIncompleteDescription : messages.pendingDescription,
      label: normalizedStatus,
      tone: hasAsset ? 'success' : 'warning'
    };
  }

  function normalizePersonalizationData(order) {
    var customFields = order && order.customFields && typeof order.customFields === 'object' ? order.customFields : {};
    var asset =
      customFields.personalizationAsset && typeof customFields.personalizationAsset === 'object'
        ? customFields.personalizationAsset
        : null;
    var required = Boolean(customFields.personalizationRequired);
    var previewUrl = firstDefinedValue(
      asset && asset.preview,
      customFields.personalizationAssetPreviewUrl,
      asset && asset.source
    );
    var assetUrl = firstDefinedValue(asset && asset.source, previewUrl);
    var filename = firstDefinedValue(
      customFields.personalizationOriginalFilename,
      asset && asset.name
    );
    var rawStatus = normalizeText(customFields.personalizationStatus);
    var lastPayment = getLastItem(order && order.payments);
    var lastFulfillment = getLastItem(order && order.fulfillments);
    var statusPresentation = getStatusPresentation(required, rawStatus, Boolean(assetUrl));

    return {
      assetMimeType: normalizeText(asset && asset.mimeType),
      assetUrl: assetUrl,
      filename: filename,
      notes: normalizeText(customFields.personalizationNotes),
      orderCode: normalizeText(order && order.code),
      orderState: normalizeText(order && order.state),
      paymentState: normalizeText(lastPayment && lastPayment.state),
      previewUrl: previewUrl,
      required: required,
      shipmentState: normalizeText(lastFulfillment && lastFulfillment.state),
      status: rawStatus || (required ? (assetUrl ? 'uploaded' : 'pending') : 'not-required'),
      statusDescription: statusPresentation.description,
      statusLabel: statusPresentation.label,
      tone: statusPresentation.tone,
      trackingCode: normalizeText(lastFulfillment && lastFulfillment.trackingCode),
      uploadedAt: formatDateTime(customFields.personalizationUploadedAt)
    };
  }

  function appendMetaRow(container, label, value) {
    var item = createElement('div', 'cla-order-personalization-card__meta-item');
    var title = createElement('dt', 'cla-order-personalization-card__meta-label', label);
    var detail = createElement(
      'dd',
      'cla-order-personalization-card__meta-value' + (!value ? ' is-muted' : ''),
      value || getPersonalizationMessages().unavailable
    );

    item.appendChild(title);
    item.appendChild(detail);
    container.appendChild(item);
  }

  function renderPersonalizationPlaceholder(container, message) {
    var placeholder = createElement('div', 'cla-order-personalization-card__preview-placeholder');
    placeholder.appendChild(createElement('span', 'cla-order-personalization-card__preview-placeholder-copy', message));
    container.appendChild(placeholder);
  }

  function renderPanelContent(panel, normalized) {
    var messages = getPersonalizationMessages();
    var badge = createElement(
      'span',
      'cla-order-personalization-badge cla-order-personalization-badge--' + normalized.tone,
      normalized.statusLabel || messages.unknownStatus
    );
    var header = createElement('div', 'card-header cla-order-personalization-card__header');
    var titleGroup = createElement('div', 'cla-order-personalization-card__title-group');
    var title = createElement('div', 'card-title', messages.title);
    var subtitle = createElement(
      'p',
      'cla-order-personalization-card__subtitle',
      messages.orderCode + ' ' + (normalized.orderCode || messages.unavailable)
    );
    var body = createElement('div', 'card-block cla-order-personalization-card__body');
    var summary = createElement(
      'p',
      'cla-order-personalization-card__summary',
      normalized.statusDescription
    );
    var content = createElement('div', 'cla-order-personalization-card__content');
    var previewColumn = createElement('div', 'cla-order-personalization-card__preview');
    var detailsColumn = createElement('div', 'cla-order-personalization-card__details');
    var meta = createElement('dl', 'cla-order-personalization-card__meta');
    var notes = createElement('div', 'cla-order-personalization-card__notes');
    var notesTitle = createElement('h4', 'cla-order-personalization-card__notes-title', messages.notes);
    var notesText = createElement(
      'p',
      'cla-order-personalization-card__notes-copy' + (!normalized.notes ? ' is-muted' : ''),
      normalized.notes || messages.noNotes
    );
    var actions = createElement('div', 'cla-order-personalization-card__actions');
    var refreshButton = createElement(
      'button',
      'btn btn-sm cla-order-personalization-card__action cla-order-personalization-card__action--refresh',
      messages.refresh
    );

    panel.className = 'card cla-order-personalization-card cla-order-personalization-card--' + normalized.tone;
    panel.replaceChildren();

    titleGroup.appendChild(title);
    titleGroup.appendChild(subtitle);
    header.appendChild(titleGroup);
    header.appendChild(badge);

    if (normalized.previewUrl) {
      var image = createElement('img', 'cla-order-personalization-card__image');
      image.src = normalized.previewUrl;
      image.alt = messages.title + ' ' + (normalized.orderCode || '');
      image.loading = 'lazy';
      image.addEventListener('error', function () {
        image.remove();
        renderPersonalizationPlaceholder(previewColumn, messages.noPreview);
      });
      previewColumn.appendChild(image);
    } else {
      renderPersonalizationPlaceholder(
        previewColumn,
        normalized.assetUrl ? messages.noPreview : messages.assetUnavailable
      );
    }

    appendMetaRow(meta, messages.required, normalized.required ? messages.orderRequiresYes : messages.orderRequiresNo);
    appendMetaRow(meta, messages.status, normalized.statusLabel || messages.unknownStatus);
    appendMetaRow(meta, messages.fileName, normalized.filename || messages.assetUnavailable);
    appendMetaRow(meta, messages.uploadedAt, normalized.uploadedAt);
    appendMetaRow(meta, messages.orderState, normalized.orderState);
    appendMetaRow(meta, messages.paymentState, normalized.paymentState);
    appendMetaRow(meta, messages.shipmentState, normalized.shipmentState);

    if (normalized.trackingCode) {
      appendMetaRow(meta, messages.trackingCode, normalized.trackingCode);
    }

    notes.appendChild(notesTitle);
    notes.appendChild(notesText);

    refreshButton.type = 'button';
    refreshButton.addEventListener('click', function () {
      var orderId = panel.dataset.claOrderId;
      if (orderId) {
        loadPersonalizationPanel(panel, orderId, true);
      }
    });
    actions.appendChild(refreshButton);

    if (normalized.assetUrl) {
      var openFileLink = createElement(
        'a',
        'btn btn-sm btn-secondary cla-order-personalization-card__action cla-order-personalization-card__action--open',
        messages.openFile
      );
      openFileLink.href = normalized.assetUrl;
      openFileLink.target = '_blank';
      openFileLink.rel = 'noreferrer noopener';
      actions.appendChild(openFileLink);
    }

    detailsColumn.appendChild(meta);
    detailsColumn.appendChild(notes);
    detailsColumn.appendChild(actions);

    content.appendChild(previewColumn);
    content.appendChild(detailsColumn);

    body.appendChild(summary);
    body.appendChild(content);

    panel.appendChild(header);
    panel.appendChild(body);
    panel.dataset.claLoaded = 'true';
    panel.dataset.claState = 'ready';
  }

  function renderPanelState(panel, options) {
    var messages = getPersonalizationMessages();
    var header = createElement('div', 'card-header cla-order-personalization-card__header');
    var titleGroup = createElement('div', 'cla-order-personalization-card__title-group');
    var title = createElement('div', 'card-title', messages.title);
    var subtitle = createElement(
      'p',
      'cla-order-personalization-card__subtitle',
      messages.orderCode + ' ' + (panel.dataset.claOrderCode || messages.unavailable)
    );
    var body = createElement('div', 'card-block cla-order-personalization-card__body');
    var state = createElement('div', 'cla-order-personalization-card__state');
    var stateTitle = createElement('h4', 'cla-order-personalization-card__state-title', options.title);
    var stateBody = createElement('p', 'cla-order-personalization-card__state-copy', options.body);

    panel.className = 'card cla-order-personalization-card cla-order-personalization-card--neutral';
    panel.replaceChildren();

    titleGroup.appendChild(title);
    titleGroup.appendChild(subtitle);
    header.appendChild(titleGroup);
    body.appendChild(state);
    state.appendChild(stateTitle);
    state.appendChild(stateBody);

    if (options.retry) {
      var retryButton = createElement(
        'button',
        'btn btn-sm cla-order-personalization-card__action cla-order-personalization-card__action--refresh',
        messages.retry
      );
      retryButton.type = 'button';
      retryButton.addEventListener('click', function () {
        var orderId = panel.dataset.claOrderId;
        if (orderId) {
          loadPersonalizationPanel(panel, orderId, true);
        }
      });
      state.appendChild(retryButton);
    }

    panel.appendChild(header);
    panel.appendChild(body);
    panel.dataset.claLoaded = 'false';
    panel.dataset.claState = options.state || 'idle';
  }

  function loadPersonalizationPanel(panel, orderId, forceRefresh) {
    var requestId = String(personalizationLoadToken + 1);
    var messages = getPersonalizationMessages();

    personalizationLoadToken += 1;
    panel.dataset.claRequestId = requestId;
    panel.dataset.claOrderId = orderId;
    panel.dataset.claLoaded = 'false';

    if (forceRefresh) {
      personalizationSchemaPromise = null;
    }

    renderPanelState(panel, {
      body: messages.loadingBody,
      state: 'loading',
      title: messages.loadingTitle
    });

    getPersonalizationSchema()
      .then(function (schema) {
        var query = buildPersonalizationOrderQuery(schema);

        if (!query) {
          renderPanelState(panel, {
            body: messages.noDataBody,
            state: 'empty',
            title: messages.noDataTitle
          });
          return null;
        }

        return requestGraphQl(query, {
          id: orderId
        });
      })
      .then(function (data) {
        if (!data || panel.dataset.claRequestId !== requestId) {
          return;
        }

        if (!data.order) {
          renderPanelState(panel, {
            body: messages.noDataBody,
            state: 'empty',
            title: messages.noDataTitle
          });
          return;
        }

        var normalized = normalizePersonalizationData(data.order);
        panel.dataset.claOrderCode = normalized.orderCode || '';
        renderPanelContent(panel, normalized);
      })
      .catch(function (error) {
        if (panel.dataset.claRequestId !== requestId) {
          return;
        }

        renderPanelState(panel, {
          body: (error && error.message ? error.message + '. ' : '') + messages.loadErrorBody,
          retry: true,
          state: 'error',
          title: messages.loadErrorTitle
        });
      });
  }

  function ensureOrderPersonalizationPanel() {
    var orderId = getCurrentOrderId();
    var anchor = getPersonalizationPanelAnchor();
    var panel = getPersonalizationPanel();

    if (!orderId || !(anchor instanceof HTMLElement) || !anchor.parentNode) {
      removePersonalizationPanel();
      return;
    }

    if (!(panel instanceof HTMLElement)) {
      panel = document.createElement('section');
      panel.id = PERSONALIZATION_PANEL_ID;
    }

    if (panel.parentNode !== anchor.parentNode || panel.nextSibling !== anchor) {
      anchor.parentNode.insertBefore(panel, anchor);
    }

    if (panel.dataset.claOrderId === orderId && panel.dataset.claState === 'ready') {
      return;
    }

    loadPersonalizationPanel(panel, orderId, false);
  }

  function runEnhancements() {
    applySidebarPreference();
    ensureSidebarBranding();
    // ensureTopBarBranding();
    ensureLoginBranding();
    enhancePasswordField();
    ensureDesktopSidebarToggle();
    enhanceEmptyStates();
    ensureOrderPersonalizationPanel();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runEnhancements, { once: true });
  } else {
    runEnhancements();
  }

  document.addEventListener('click', handleDocumentClick);
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
