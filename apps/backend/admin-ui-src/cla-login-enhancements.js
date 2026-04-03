(function () {
  var SIDEBAR_COLLAPSED_CLASS = 'cla-sidebar-collapsed';
  var SIDEBAR_STORAGE_KEY = 'cla-admin-sidebar-collapsed';
  var CATALOG_ACCORDION_KEY = 'cla-admin-catalog-collapsed';
  var SIDEBAR_GROUPS_STORAGE_KEY = 'cla-admin-sidebar-groups';
  var SIDEBAR_ACCORDION_GROUPS = [
    {
      id: 'catalog',
      labels: ['catalog', 'catalogo', 'catálogo'],
      routePrefixes: ['catalog']
    },
    {
      id: 'orders',
      labels: ['orders', 'sales', 'ventas'],
      routePrefixes: ['orders']
    },
    {
      id: 'customer',
      labels: ['customer', 'customers', 'cliente', 'clientes'],
      routePrefixes: ['customer']
    },
    {
      id: 'marketing',
      labels: ['marketing'],
      routePrefixes: ['marketing']
    }
  ];
  var BRAND_LOGO_ASSET_PATH = 'assets/cla-logo.svg';
  var SIDEBAR_MENU_ICON =
    '<svg viewBox="0 0 20 20" aria-hidden="true" focusable="false"><line x1="2" y1="5" x2="18" y2="5"/><line x1="2" y1="10" x2="18" y2="10"/><line x1="2" y1="15" x2="18" y2="15"/></svg>';
  var SIDEBAR_COLLAPSE_ICON = SIDEBAR_MENU_ICON;
  var SIDEBAR_EXPAND_ICON = SIDEBAR_MENU_ICON;
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
      businessStatus: 'Business status',
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
      productionStatus: 'Production',
      productionUpdatedAt: 'Production updated',
      required: 'Requires personalization',
      retry: 'Retry',
      shipmentState: 'Shipment',
      status: 'Personalization status',
      trackingCode: 'Tracking',
      title: 'Order status and personalization',
      unavailable: 'Unavailable',
      unknownStatus: 'Unknown status',
      uploaded: 'File uploaded',
      uploadedAt: 'Uploaded at',
      uploadedDescription: 'The operator already has a linked file and can open it directly from this order.',
      uploadedIncompleteDescription: 'The order is marked as uploaded, but the file data is incomplete.'
    },
    es: {
      assetUnavailable: 'No hay archivo vinculado',
      businessStatus: 'Estado general',
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
      productionStatus: 'Producción',
      productionUpdatedAt: 'Actualización producción',
      required: 'Requiere personalización',
      retry: 'Reintentar',
      shipmentState: 'Envío',
      status: 'Estado de personalización',
      trackingCode: 'Tracking',
      title: 'Estado del pedido y personalización',
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
    'personalizationOverallStatus',
    'productionStatus',
    'productionUpdatedAt',
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
  var lastActiveSidebarItemKey = null;

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

  function normalizeSidebarText(value) {
    return (value || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
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

  function readSidebarGroupsState() {
    try {
      var rawValue = window.localStorage.getItem(SIDEBAR_GROUPS_STORAGE_KEY);

      if (!rawValue) {
        return {};
      }

      var parsed = JSON.parse(rawValue);

      if (!parsed || typeof parsed !== 'object') {
        return {};
      }

      return parsed;
    } catch (error) {
      return {};
    }
  }

  function writeSidebarGroupsState(nextState) {
    try {
      window.localStorage.setItem(SIDEBAR_GROUPS_STORAGE_KEY, JSON.stringify(nextState));
    } catch (error) {
      return;
    }
  }

  function readSidebarGroupCollapsed(groupId) {
    var storedState = readSidebarGroupsState();

    if (typeof storedState[groupId] === 'boolean') {
      return storedState[groupId];
    }

    if (groupId === 'catalog') {
      try {
        return window.localStorage.getItem(CATALOG_ACCORDION_KEY) === 'true';
      } catch (error) {
        return false;
      }
    }

    return false;
  }

  function writeSidebarGroupCollapsed(groupId, collapsed) {
    var storedState = readSidebarGroupsState();
    storedState[groupId] = collapsed;
    writeSidebarGroupsState(storedState);

    if (groupId === 'catalog') {
      try {
        window.localStorage.setItem(CATALOG_ACCORDION_KEY, collapsed ? 'true' : 'false');
      } catch (error) {
        return;
      }
    }
  }

  function getCurrentAdminRouteSegment() {
    var adminBasePath = getAdminBasePath();
    var pathname = window.location.pathname;

    if (adminBasePath && pathname.indexOf(adminBasePath + '/') === 0) {
      pathname = pathname.slice(adminBasePath.length + 1);
    } else {
      pathname = pathname.replace(/^\/+/, '');
    }

    return pathname.split('/').filter(Boolean)[0] || '';
  }

  function getNavGroupHeaderText(navGroup) {
    var header = navGroup.querySelector('.nav-group-header');

    if (!(header instanceof HTMLElement)) {
      return '';
    }

    return normalizeSidebarText(header.textContent);
  }

  function getNavGroupRoutePrefixes(navGroup) {
    var links = navGroup.querySelectorAll('.nav-link a[href]');
    var routePrefixes = {};
    var adminBasePath = getAdminBasePath();

    for (var i = 0; i < links.length; i += 1) {
      var link = links[i];
      var href = link.getAttribute('href') || link.href;

      if (!href) {
        continue;
      }

      try {
        var url = new URL(href, window.location.origin);
        var pathname = url.pathname;

        if (adminBasePath && pathname.indexOf(adminBasePath + '/') === 0) {
          pathname = pathname.slice(adminBasePath.length + 1);
        } else {
          pathname = pathname.replace(/^\/+/, '');
        }

        var prefix = pathname.split('/').filter(Boolean)[0];

        if (prefix) {
          routePrefixes[prefix] = true;
        }
      } catch (error) {
        continue;
      }
    }

    return Object.keys(routePrefixes);
  }

  function getSidebarAccordionGroupConfig(navGroup) {
    var headerText = getNavGroupHeaderText(navGroup);
    var routePrefixes = getNavGroupRoutePrefixes(navGroup);

    for (var i = 0; i < SIDEBAR_ACCORDION_GROUPS.length; i += 1) {
      var config = SIDEBAR_ACCORDION_GROUPS[i];

      for (var j = 0; j < routePrefixes.length; j += 1) {
        if (config.routePrefixes.indexOf(routePrefixes[j]) !== -1) {
          return config;
        }
      }

      if (config.labels.indexOf(headerText) !== -1) {
        return config;
      }
    }

    return null;
  }

  function getSidebarScrollContainer(element) {
    if (element instanceof HTMLElement) {
      var closestContainer = element.closest('.sidenav');

      if (closestContainer instanceof HTMLElement) {
        return closestContainer;
      }
    }

    var fallbackContainer = document.querySelector('.left-nav .sidenav');

    return fallbackContainer instanceof HTMLElement ? fallbackContainer : null;
  }

  function scrollElementIntoSidebarView(element, options) {
    if (!(element instanceof HTMLElement)) {
      return;
    }

    var scrollContainer = getSidebarScrollContainer(element);

    if (!(scrollContainer instanceof HTMLElement)) {
      return;
    }

    var topPadding = options && typeof options.topPadding === 'number' ? options.topPadding : 12;
    var bottomPadding = options && typeof options.bottomPadding === 'number' ? options.bottomPadding : 24;
    var elementRect = element.getBoundingClientRect();
    var containerRect = scrollContainer.getBoundingClientRect();
    var nextScrollTop = scrollContainer.scrollTop;

    if (elementRect.top < containerRect.top + topPadding) {
      nextScrollTop += elementRect.top - containerRect.top - topPadding;
    } else if (elementRect.bottom > containerRect.bottom - bottomPadding) {
      nextScrollTop += elementRect.bottom - containerRect.bottom + bottomPadding;
    } else {
      return;
    }

    scrollContainer.scrollTo({
      top: Math.max(0, Math.round(nextScrollTop)),
      behavior: 'smooth'
    });
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

  function navGroupHasActiveItem(navGroup) {
    return !!navGroup.querySelector(
      '.nav-link.active, .nav-link a.active, .nav-link a[aria-current="page"], .nav-link a.router-link-active'
    );
  }

  function isSidebarAccordionGroupActive(navGroup, config) {
    if (navGroupHasActiveItem(navGroup)) {
      return true;
    }

    return config.routePrefixes.indexOf(getCurrentAdminRouteSegment()) !== -1;
  }

  function ensureSidebarAccordionPanel(navGroup) {
    var existingPanel = navGroup.querySelector(':scope > .cla-accordion-panel');

    if (existingPanel instanceof HTMLElement) {
      return existingPanel;
    }

    var sectionHeader = navGroup.querySelector(':scope > .section-header');

    if (!(sectionHeader instanceof HTMLElement)) {
      return null;
    }

    var panel = document.createElement('div');
    panel.className = 'cla-accordion-panel';

    if (!panel.id) {
      panel.id = 'cla-accordion-panel-' + (navGroup.dataset.claAccordionGroupId || 'group');
    }

    if (sectionHeader.nextSibling) {
      navGroup.insertBefore(panel, sectionHeader.nextSibling);
    } else {
      navGroup.appendChild(panel);
    }

    var directChildren = Array.prototype.slice.call(navGroup.children);

    for (var i = 0; i < directChildren.length; i += 1) {
      var child = directChildren[i];

      if (child === sectionHeader || child === panel) {
        continue;
      }

      if (child instanceof HTMLElement && child.classList.contains('nav-link')) {
        panel.appendChild(child);
      }
    }

    return panel;
  }

  function updateSidebarAccordionPanelHeight(navGroup) {
    var panel = navGroup.querySelector('.cla-accordion-panel');

    if (!(panel instanceof HTMLElement)) {
      return;
    }

    navGroup.style.setProperty('--cla-accordion-panel-height', panel.scrollHeight + 'px');
  }

  function updateSidebarAccordionAccessibility(navGroup, expanded) {
    var sectionHeader = navGroup.querySelector('.section-header');
    var panel = navGroup.querySelector('.cla-accordion-panel');

    if (!(sectionHeader instanceof HTMLElement)) {
      return;
    }

    sectionHeader.setAttribute('role', 'button');
    sectionHeader.setAttribute('tabindex', '0');
    sectionHeader.setAttribute('aria-expanded', expanded ? 'true' : 'false');

    if (panel instanceof HTMLElement) {
      sectionHeader.setAttribute('aria-controls', panel.id);
      panel.setAttribute('aria-hidden', expanded ? 'false' : 'true');
    }
  }

  function setSidebarAccordionCollapsed(navGroup, config, collapsed, options) {
    var shouldCollapse = collapsed;

    if (isDesktopViewport() && document.body instanceof HTMLBodyElement && document.body.classList.contains(SIDEBAR_COLLAPSED_CLASS)) {
      shouldCollapse = false;
    }

    navGroup.classList.toggle('cla-collapsed', shouldCollapse);
    updateSidebarAccordionPanelHeight(navGroup);
    updateSidebarAccordionAccessibility(navGroup, !shouldCollapse);

    if (!(options && options.skipPersist)) {
      writeSidebarGroupCollapsed(config.id, collapsed);
    }
  }

  function toggleSidebarAccordion(navGroup, config) {
    if (isDesktopViewport() && document.body instanceof HTMLBodyElement && document.body.classList.contains(SIDEBAR_COLLAPSED_CLASS)) {
      return;
    }

    var nextCollapsed = !navGroup.classList.contains('cla-collapsed');
    setSidebarAccordionCollapsed(navGroup, config, nextCollapsed);

    if (!nextCollapsed) {
      setTimeout(function () {
        scrollNavGroupIntoView(navGroup);
      }, 220);
    }
  }

  function ensureMainNavAccordions() {
    var mainNav = document.querySelector('.main-nav-container .main-nav');

    if (!(mainNav instanceof HTMLElement)) {
      return;
    }

    var navGroups = mainNav.querySelectorAll('.nav-group');

    for (var i = 0; i < navGroups.length; i += 1) {
      var navGroup = navGroups[i];
      var config = getSidebarAccordionGroupConfig(navGroup);

      if (!config) {
        continue;
      }

      navGroup.dataset.claAccordionGroupId = config.id;
      navGroup.classList.add('cla-accordion');
      var panel = ensureSidebarAccordionPanel(navGroup);
      var sectionHeader = navGroup.querySelector('.section-header');

      if (sectionHeader instanceof HTMLElement && !sectionHeader.querySelector('.cla-accordion-toggle')) {
        var chevron = document.createElement('span');
        chevron.className = 'cla-accordion-toggle';
        chevron.setAttribute('aria-hidden', 'true');
        chevron.innerHTML =
          '<svg viewBox="0 0 24 24" fill="none"><polyline points="6 9 12 15 18 9"></polyline></svg>';
        sectionHeader.appendChild(chevron);
      }
      
      if (sectionHeader instanceof HTMLElement && sectionHeader.dataset.claAccordionBound !== 'true') {
        sectionHeader.dataset.claAccordionBound = 'true';
        sectionHeader.addEventListener('click', function (event) {
          if (event.target instanceof Element && event.target.closest('.button-small')) {
            return;
          }

          var group = event.currentTarget.closest('.nav-group');
          var groupId = group instanceof HTMLElement ? group.dataset.claAccordionGroupId : '';
          var groupConfig = null;

          for (var groupIndex = 0; groupIndex < SIDEBAR_ACCORDION_GROUPS.length; groupIndex += 1) {
            if (SIDEBAR_ACCORDION_GROUPS[groupIndex].id === groupId) {
              groupConfig = SIDEBAR_ACCORDION_GROUPS[groupIndex];
              break;
            }
          }

          if (!(group instanceof HTMLElement) || !groupConfig) {
            return;
          }

          toggleSidebarAccordion(group, groupConfig);
        });
        sectionHeader.addEventListener('keydown', function (event) {
          if (event.key !== 'Enter' && event.key !== ' ') {
            return;
          }

          event.preventDefault();
          event.currentTarget.click();
        });
      }

      if (panel instanceof HTMLElement && !panel.id) {
        panel.id = 'cla-accordion-panel-' + config.id;
      }

      var shouldCollapse = readSidebarGroupCollapsed(config.id);

      if (isSidebarAccordionGroupActive(navGroup, config)) {
        shouldCollapse = false;
      }

      setSidebarAccordionCollapsed(navGroup, config, shouldCollapse, { skipPersist: true });
    }
  }

  function scrollNavGroupIntoView(navGroup) {
    scrollElementIntoSidebarView(navGroup, {
      topPadding: 16,
      bottomPadding: 32
    });
  }

  function ensureSidebarItemTitles() {
    var interactiveElements = document.querySelectorAll(
      '.left-nav .nav-link a, .left-nav .setting-link, .left-nav vdr-channel-switcher .active-channel'
    );

    for (var i = 0; i < interactiveElements.length; i += 1) {
      var element = interactiveElements[i];

      if (!(element instanceof HTMLElement)) {
        continue;
      }

      var label = (element.textContent || '').replace(/\s+/g, ' ').trim();

      if (!label) {
        continue;
      }

      if (!element.getAttribute('title')) {
        element.setAttribute('title', label);
      }

      if (!element.getAttribute('aria-label')) {
        element.setAttribute('aria-label', label);
      }
    }
  }

  function ensureActiveSidebarItemVisible() {
    var activeItem = document.querySelector(
      '.left-nav .nav-link.active, .left-nav .nav-link a.active, .left-nav .nav-link a[aria-current="page"], .left-nav .nav-link a.router-link-active'
    );

    if (!(activeItem instanceof HTMLElement)) {
      lastActiveSidebarItemKey = null;
      return;
    }

    var activeItemKey = activeItem.getAttribute('href') || (activeItem.textContent || '').replace(/\s+/g, ' ').trim();

    if (!activeItemKey || activeItemKey === lastActiveSidebarItemKey) {
      return;
    }

    lastActiveSidebarItemKey = activeItemKey;

    scrollElementIntoSidebarView(activeItem, {
      topPadding: 24,
      bottomPadding: 32
    });
  }

  function handleDocumentClick(event) {
    if (!(event.target instanceof Element)) {
      return;
    }

    var desktopToggle = event.target.closest('.cla-desktop-nav-toggle');

    if (desktopToggle instanceof HTMLButtonElement) {
      event.preventDefault();
      toggleDesktopSidebar();
      return;
    }

    // Scroll automático al expandir acordeones de Ajustes / Sistema
    var navGroupTrigger = event.target.closest(
      '.left-nav .nav-group .nav-group-trigger,' +
      '.left-nav .nav-group .nav-trigger,' +
      '.left-nav .nav-group [clrverticalnavgrouphandle]'
    );

    if (navGroupTrigger instanceof HTMLElement) {
      var navGroup = navGroupTrigger.closest('.nav-group');

      if (navGroup instanceof HTMLElement) {
        setTimeout(function () {
          var isExpanded =
            !navGroup.classList.contains('collapsed') &&
            !navGroup.classList.contains('cla-collapsed');

          if (isExpanded) {
            scrollNavGroupIntoView(navGroup);
          }
        }, 280);
      }
    }
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
      '    lines {',
      '      id',
      '      productVariant {',
      '        name',
      '        product {',
      '          name',
      '        }',
      '        customFields {',
      '          requiresPersonalization',
      '        }',
      '      }',
      '      customFields {',
      '        personalizationStatus',
      '        personalizationNotes',
      '        personalizationUploadedAt',
      '        personalizationSnapshotFileName',
      '        personalizationAsset {',
      '          id',
      '          name',
      '          preview',
      '          source',
      '          mimeType',
      '          fileSize',
      '        }',
      '      }',
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

  function normalizeProductionStatus(value) {
    var normalized = normalizeText(value);

    if (normalized === 'in-production' || normalized === 'in_production' || normalized === 'production') {
      return 'in-production';
    }

    if (
      normalized === 'ready' ||
      normalized === 'ready-to-ship' ||
      normalized === 'ready_to_ship' ||
      normalized === 'listo'
    ) {
      return 'ready';
    }

    return 'not-started';
  }

  function getProductionLabel(value) {
    var status = normalizeProductionStatus(value);

    if (status === 'in-production') {
      return 'En producción';
    }

    if (status === 'ready') {
      return 'Listo para enviar';
    }

    return 'Sin iniciar';
  }

  function deriveBusinessStatus(normalized) {
    var paymentState = normalizeText(normalized.paymentState);
    var orderState = normalizeText(normalized.orderState);
    var shipmentState = normalizeText(normalized.shipmentState);
    var productionStatus = normalizeProductionStatus(normalized.productionStatus);

    if (orderState === 'cancelled') {
      return 'cancelled';
    }

    if (
      ['authorized', 'settled', 'paymentauthorized', 'paymentsettled', 'approved'].indexOf(paymentState) === -1 &&
      ['paymentauthorized', 'paymentsettled'].indexOf(orderState) === -1
    ) {
      return 'pending_payment';
    }

    if (shipmentState.indexOf('deliver') !== -1 || shipmentState.indexOf('entreg') !== -1) {
      return 'delivered';
    }

    if (
      normalized.trackingCode ||
      shipmentState.indexOf('ship') !== -1 ||
      shipmentState.indexOf('dispatch') !== -1 ||
      shipmentState.indexOf('enviado') !== -1 ||
      shipmentState.indexOf('transito') !== -1 ||
      shipmentState.indexOf('camino') !== -1
    ) {
      return 'shipped';
    }

    if (productionStatus === 'ready') {
      return 'ready_to_ship';
    }

    if (productionStatus === 'in-production') {
      return 'in_production';
    }

    if (normalized.required && normalized.status === 'pending') {
      return 'awaiting_personalization';
    }

    if (normalized.required && normalized.status === 'uploaded') {
      return 'personalization_received';
    }

    return 'paid';
  }

  function getBusinessStatusPresentation(status) {
    var messages = getPersonalizationMessages();

    switch (status) {
      case 'pending_payment':
        return { label: 'Pendiente de pago', description: 'La orden existe, pero todavía no tiene pago confirmado.', tone: 'neutral' };
      case 'awaiting_personalization':
        return { label: 'Esperando personalización', description: 'El pago está acreditado, pero falta el archivo requerido.', tone: 'warning' };
      case 'personalization_received':
        return { label: 'Material recibido', description: 'La foto ya fue recibida y el pedido puede pasar a producción.', tone: 'success' };
      case 'in_production':
        return { label: 'En producción', description: 'Operación marcó este pedido como en producción.', tone: 'success' };
      case 'ready_to_ship':
        return { label: 'Listo para enviar', description: 'La producción terminó y el pedido quedó listo para despacho.', tone: 'success' };
      case 'shipped':
        return { label: 'Enviado', description: 'El pedido ya salió y tiene datos de envío disponibles.', tone: 'success' };
      case 'delivered':
        return { label: 'Entregado', description: 'El pedido figura como entregado.', tone: 'success' };
      case 'cancelled':
        return { label: 'Cancelado', description: 'La orden quedó cancelada.', tone: 'warning' };
      case 'paid':
      default:
        return { label: 'Pago confirmado', description: 'El pago está acreditado y el pedido quedó listo para preparación.', tone: 'neutral' };
    }
  }

  function normalizePersonalizationData(order) {
    var customFields = order && order.customFields && typeof order.customFields === 'object' ? order.customFields : {};
    var lines = Array.isArray(order && order.lines) ? order.lines : [];
    var requiredLines = lines.filter(function (line) {
      return Boolean(
        line &&
          line.productVariant &&
          line.productVariant.customFields &&
          line.productVariant.customFields.requiresPersonalization === true
      );
    });
    var primaryLine = requiredLines.find(function (line) {
      return Boolean(line && line.customFields && line.customFields.personalizationAsset);
    }) || requiredLines[0] || null;
    var lineCustomFields = primaryLine && primaryLine.customFields && typeof primaryLine.customFields === 'object'
      ? primaryLine.customFields
      : {};
    var asset =
      lineCustomFields.personalizationAsset && typeof lineCustomFields.personalizationAsset === 'object'
        ? lineCustomFields.personalizationAsset
        : null;
    var required = requiredLines.length > 0;
    var previewUrl = firstDefinedValue(asset && asset.preview, asset && asset.source);
    var assetUrl = firstDefinedValue(asset && asset.source, previewUrl);
    var filename = firstDefinedValue(lineCustomFields.personalizationSnapshotFileName, asset && asset.name);
    var overallStatus = normalizeText(customFields.personalizationOverallStatus);
    var completedLines = requiredLines.filter(function (line) {
      var lineStatus = normalizeText(line && line.customFields && line.customFields.personalizationStatus);
      return lineStatus === 'uploaded' || lineStatus === 'approved';
    }).length;
    var rawStatus =
      overallStatus === 'complete'
        ? 'uploaded'
        : overallStatus === 'pending' || overallStatus === 'partial'
          ? 'pending'
          : !required
            ? 'not-required'
            : completedLines === requiredLines.length
              ? 'uploaded'
              : 'pending';
    var productionStatus = normalizeText(customFields.productionStatus);
    var lastPayment = getLastItem(order && order.payments);
    var lastFulfillment = getLastItem(order && order.fulfillments);
    var statusPresentation = getStatusPresentation(required, rawStatus, Boolean(assetUrl));
    var businessStatus = deriveBusinessStatus({
      paymentState: normalizeText(lastPayment && lastPayment.state),
      orderState: normalizeText(order && order.state),
      required: required,
      shipmentState: normalizeText(lastFulfillment && lastFulfillment.state),
      status: rawStatus || (required ? (assetUrl ? 'uploaded' : 'pending') : 'not-required'),
      trackingCode: normalizeText(lastFulfillment && lastFulfillment.trackingCode),
      productionStatus: productionStatus
    });
    var businessPresentation = getBusinessStatusPresentation(businessStatus);

    return {
      assetMimeType: normalizeText(asset && asset.mimeType),
      assetUrl: assetUrl,
      businessStatus: businessStatus,
      businessStatusDescription: businessPresentation.description,
      businessStatusLabel: businessPresentation.label,
      filename: filename,
      notes: normalizeText(lineCustomFields.personalizationNotes),
      orderCode: normalizeText(order && order.code),
      orderState: normalizeText(order && order.state),
      paymentState: normalizeText(lastPayment && lastPayment.state),
      previewUrl: previewUrl,
      productionStatus: productionStatus,
      productionStatusLabel: getProductionLabel(productionStatus),
      productionUpdatedAt: formatDateTime(customFields.productionUpdatedAt),
      required: required,
      shipmentState: normalizeText(lastFulfillment && lastFulfillment.state),
      status: rawStatus || (required ? (assetUrl ? 'uploaded' : 'pending') : 'not-required'),
      statusDescription: statusPresentation.description,
      statusLabel: statusPresentation.label,
      tone: statusPresentation.tone,
      trackingCode: normalizeText(lastFulfillment && lastFulfillment.trackingCode),
      uploadedAt: formatDateTime(lineCustomFields.personalizationUploadedAt)
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
      normalized.businessStatusLabel || normalized.statusLabel || messages.unknownStatus
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
      normalized.businessStatusDescription || normalized.statusDescription
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

    appendMetaRow(meta, messages.businessStatus, normalized.businessStatusLabel || messages.unavailable);
    appendMetaRow(meta, messages.required, normalized.required ? messages.orderRequiresYes : messages.orderRequiresNo);
    appendMetaRow(meta, messages.status, normalized.statusLabel || messages.unknownStatus);
    appendMetaRow(meta, messages.productionStatus, normalized.productionStatusLabel);
    appendMetaRow(meta, messages.productionUpdatedAt, normalized.productionUpdatedAt);
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
    ensureMainNavAccordions();
    ensureSidebarItemTitles();
    ensureActiveSidebarItemVisible();
    enhanceEmptyStates();
    removePersonalizationPanel();
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
