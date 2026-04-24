/* =============================================================================
 * CLA Soulprint — Admin UI enhancements
 *
 * Se carga una sola vez desde index.html. Su objetivo es hacer el panel
 * Vendure más claro y amable: agrega tooltips explicativos en castellano
 * sobre los botones e íconos más importantes, y un aviso de ayuda con
 * contexto al entrar a cada sección.
 *
 * No modifica ningún comportamiento de Vendure — sólo añade atributos
 * `data-cla-tip` y banners informativos usando un MutationObserver, para
 * que siga funcionando aunque Angular re-renderice la vista.
 * ============================================================================= */
(function () {
    'use strict';

    const ICON_TIPS = {
        plus: 'Crear nuevo',
        'plus-circle': 'Agregar',
        check: 'Confirmar',
        times: 'Cancelar o cerrar',
        'times-circle': 'Eliminar',
        trash: 'Eliminar definitivamente',
        pencil: 'Editar',
        edit: 'Editar',
        floppy: 'Guardar cambios',
        save: 'Guardar cambios',
        search: 'Buscar',
        filter: 'Aplicar filtros',
        'filter-grid': 'Ver filtros',
        refresh: 'Recargar datos',
        download: 'Descargar',
        upload: 'Subir archivo',
        copy: 'Copiar al portapapeles',
        clipboard: 'Copiar al portapapeles',
        eye: 'Ver detalle',
        'eye-hide': 'Ocultar',
        export: 'Exportar',
        import: 'Importar',
        print: 'Imprimir',
        'arrow-left': 'Volver atrás',
        'arrow-right': 'Siguiente',
        'caret-down': 'Desplegar opciones',
        'ellipsis-vertical': 'Más acciones',
        'ellipsis-horizontal': 'Más opciones',
        'info-circle': 'Más información',
        'help-info': 'Ayuda',
        'warning-standard': 'Atención',
        user: 'Usuario',
        users: 'Clientes',
        'shopping-cart': 'Pedido',
        tag: 'Etiqueta',
        tags: 'Etiquetas',
        bundle: 'Colección',
        layers: 'Variantes',
        store: 'Canal de venta',
        truck: 'Envío',
        'credit-card': 'Pago',
        'coin-bag': 'Cobros',
        'dollar-bill': 'Precios',
        image: 'Imagen o asset',
        picture: 'Asset',
        file: 'Archivo',
        'file-group': 'Archivos',
        'folder-open': 'Abrir selector',
        envelope: 'Email',
        globe: 'Idioma o región',
        language: 'Idioma',
        calendar: 'Fecha',
        clock: 'Horario',
        lock: 'Bloqueado o privado',
        unlock: 'Desbloqueado o público',
        cog: 'Configuración',
        'block-folder': 'Categoría',
        'two-way-arrows': 'Sincronizar',
        play: 'Ejecutar',
        pause: 'Pausar',
        stop: 'Detener',
        sync: 'Sincronizar',
        logout: 'Cerrar sesión',
    };

    const ACTION_TIPS = {
        'nuevo badge': 'Crear un badge reusable para destacar productos o variantes.',
        'crear badge': 'Guardar este badge y dejarlo disponible en la tienda.',
        'nuevo slide': 'Crear un slide completo para el carrusel de la home.',
        'crear slide': 'Guardar este slide con textos, layout, estado e imágenes.',
        'ajustes del carrusel': 'Configurar autoplay, transición, flechas y dots del carrusel.',
        'guardar cambios': 'Guardar la configuración actual de esta pantalla.',
        guardar: 'Guardar la configuración actual de esta pantalla.',
        cancelar: 'Volver sin guardar cambios.',
        'crear el primero': 'Crear el primer registro de esta sección.',
        'seleccionar imagen': 'Abrir la biblioteca de assets para elegir una imagen.',
        seleccionar: 'Abrir la biblioteca de assets para elegir una imagen.',
        quitar: 'Quitar el valor seleccionado.',
        'abrir archivo completo': 'Abrir el archivo en una pestaña nueva.',
    };

    const ACTION_PATTERNS = [
        { pattern: /^crear /, tip: 'Crear un registro nuevo en esta sección.' },
        { pattern: /^nuevo /, tip: 'Crear un registro nuevo en esta sección.' },
        { pattern: /^guardar/, tip: 'Guardar los cambios de esta pantalla.' },
        { pattern: /^cancelar/, tip: 'Salir de esta pantalla sin guardar cambios.' },
        { pattern: /^eliminar/, tip: 'Eliminar este elemento de forma permanente.' },
        { pattern: /^editar/, tip: 'Abrir este elemento para editarlo.' },
        { pattern: /^seleccionar /, tip: 'Abrir el selector correspondiente.' },
        { pattern: /^quitar/, tip: 'Quitar el valor seleccionado.' },
        { pattern: /^buscar/, tip: 'Buscar dentro de la sección actual.' },
        { pattern: /^aplicar/, tip: 'Aplicar la acción o los filtros elegidos.' },
        { pattern: /^descargar|^exportar/, tip: 'Descargar la información visible.' },
        { pattern: /^subir|^importar/, tip: 'Subir información desde un archivo.' },
        { pattern: /^volver/, tip: 'Volver a la pantalla anterior.' },
    ];

    const ROUTE_HELP = [
        { match: /^\/admin\/catalog\/products(?:\/|$)/, text: '<strong>Productos.</strong> Cada fila es un producto de la tienda. Usá el botón verde "Crear nuevo producto" para agregar uno. Hacé click sobre la fila para editarlo.' },
        { match: /^\/admin\/catalog\/facets/, text: '<strong>Facetas.</strong> Son las categorías de filtros que aparecen en la tienda (ej: color, talle, material). Cada faceta tiene valores que se asignan a los productos.' },
        { match: /^\/admin\/catalog\/collections/, text: '<strong>Colecciones.</strong> Agrupan productos para mostrarlos juntos en la tienda (ej: "Novedades", "Oferta"). Se actualizan solas según los filtros que les pongas.' },
        { match: /^\/admin\/catalog\/assets/, text: '<strong>Biblioteca de imágenes.</strong> Todas las fotos y archivos subidos a la tienda. Desde acá podés subir en lote y reutilizar entre productos.' },
        { match: /^\/admin\/orders(?:\/|$)/, text: '<strong>Pedidos.</strong> Cada fila es una compra hecha por un cliente. Hacé click para ver el detalle, marcar como pagado, despachar o cancelar.' },
        { match: /^\/admin\/customers(?:\/|$)/, text: '<strong>Clientes.</strong> Las cuentas de usuarios registrados en la tienda. Podés ver su historial de pedidos y direcciones.' },
        { match: /^\/admin\/marketing\/promotions/, text: '<strong>Promociones.</strong> Definí descuentos automáticos o cupones. Primero elegís las condiciones y después la acción.' },
        { match: /^\/admin\/settings\/channels/, text: '<strong>Canales de venta.</strong> Cada canal es una vidriera diferente. Si sólo tenés una tienda, alcanza con el canal por defecto.' },
        { match: /^\/admin\/settings\/shipping-methods/, text: '<strong>Métodos de envío.</strong> Acá configurás cómo se calcula el costo del envío.' },
        { match: /^\/admin\/settings\/payment-methods/, text: '<strong>Medios de pago.</strong> Habilitá Mercado Pago, transferencia u otros y configurá sus credenciales.' },
        { match: /^\/admin\/settings\/tax/, text: '<strong>Impuestos.</strong> Cargá las tasas y las zonas donde aplican para que el checkout las use automáticamente.' },
        { match: /^\/admin\/settings\/countries/, text: '<strong>Países.</strong> Marcá qué países están habilitados para envío y facturación.' },
        { match: /^\/admin\/settings\/administrators/, text: '<strong>Administradores.</strong> Usuarios que pueden entrar a este panel. Dales roles según lo que puedan tocar.' },
        { match: /^\/admin\/settings\/roles/, text: '<strong>Roles.</strong> Definen qué puede hacer cada administrador.' },
        { match: /^\/admin\/extensions\/badges/, text: '<strong>Badges.</strong> Etiquetas visuales que se superponen a las fotos de los productos, con imagen o color de fallback.' },
        { match: /^\/admin\/extensions\/home-carousel\/settings/, text: '<strong>Ajustes del carrusel.</strong> Controlás autoplay, transición y controles visibles para todos los slides activos.' },
        { match: /^\/admin\/extensions\/home-carousel/, text: '<strong>Carrusel.</strong> Armá los slides de la home con imagen desktop/mobile, textos, botones, orden y estado desde una sola pantalla.' },
        { match: /^\/admin\/dashboard|^\/admin\/?$/, text: '<strong>Bienvenido/a al panel CLA Soulprint.</strong> Desde acá manejás productos, pedidos, clientes y configuraciones de la tienda.' },
    ];

    const SIDEBAR_FIX_CSS = `
.left-nav {
    --clr-nav-background-color: #003c22 !important;
    --clr-sidenav-border-color: rgba(230, 216, 190, 0.22) !important;
    --color-left-nav-bg: #003c22 !important;
    --color-left-nav-text: #f7efe0 !important;
    --color-left-nav-text-hover: #ffffff !important;
    --color-text-active: #ffffff !important;
    --color-primary-500: #006a3b !important;
    background: linear-gradient(180deg, #003c22 0%, #002b1b 100%) !important;
    color: #f7efe0 !important;
}
.left-nav vdr-main-nav,
.left-nav vdr-main-nav nav.main-nav {
    background: transparent !important;
    color: #f7efe0 !important;
}
.left-nav vdr-main-nav nav.main-nav .nav-group:not(.collapsed) .nav-list {
    display: block !important;
    max-height: none !important;
    overflow: visible !important;
    opacity: 1 !important;
}
.left-nav vdr-main-nav nav.main-nav .nav-group,
.left-nav vdr-main-nav nav.main-nav .nav-list {
    background: transparent !important;
    color: #f7efe0 !important;
}
.left-nav vdr-main-nav nav.main-nav .section-header,
.left-nav vdr-main-nav nav.main-nav .nav-group-header,
.left-nav vdr-main-nav nav.main-nav .nav-link,
.left-nav vdr-main-nav nav.main-nav .nav-link > a {
    min-height: 1.75rem !important;
    background: transparent !important;
    color: rgba(247, 239, 224, 0.82) !important;
    border-radius: 0.35rem !important;
}
.left-nav vdr-main-nav nav.main-nav .section-header,
.left-nav vdr-main-nav nav.main-nav .nav-group-header {
    color: rgba(216, 171, 103, 0.92) !important;
    font-weight: 700 !important;
    letter-spacing: 0.08em !important;
    text-transform: uppercase !important;
}
.left-nav vdr-main-nav nav.main-nav .nav-link > a span,
.left-nav vdr-main-nav nav.main-nav .nav-link > a div,
.left-nav vdr-main-nav nav.main-nav .nav-link > a clr-icon,
.left-nav vdr-main-nav nav.main-nav .nav-link > a cds-icon {
    color: inherit !important;
}
.left-nav vdr-main-nav nav.main-nav .nav-link:hover,
.left-nav vdr-main-nav nav.main-nav .nav-link:hover > a,
.left-nav vdr-main-nav nav.main-nav .nav-link.active,
.left-nav vdr-main-nav nav.main-nav .nav-link.active > a,
.left-nav vdr-main-nav nav.main-nav .nav-link > a.active,
.left-nav vdr-main-nav nav.main-nav .nav-link > a[aria-current='page'] {
    background: rgba(0, 106, 59, 0.62) !important;
    color: #ffffff !important;
}
.left-nav vdr-main-nav nav.main-nav hr,
.left-nav .settings-nav-container hr {
    border-color: rgba(230, 216, 190, 0.24) !important;
}
.left-nav .channel-selector,
.left-nav vdr-channel-switcher {
    background: #002b1b !important;
    color: #f7efe0 !important;
}
.left-nav hr,
.left-nav .settings-nav-container hr,
.left-nav vdr-main-nav nav.main-nav hr {
    display: none !important;
}
.left-nav .main-nav-container,
.left-nav .settings-nav-container {
    border: 0 !important;
    background: transparent !important;
}
.left-nav {
    overflow-x: hidden !important;
    overflow-y: auto !important;
}
.left-nav .main-nav-container {
    flex: 0 0 auto !important;
    overflow: visible !important;
}
.left-nav .settings-nav-container {
    flex: 0 0 auto !important;
    margin: 0 !important;
    padding: 0 !important;
    position: static !important;
    inset: auto !important;
    transform: none !important;
    overflow: visible !important;
}
.left-nav vdr-main-nav,
.left-nav vdr-main-nav nav.main-nav {
    display: block !important;
    min-height: 100% !important;
    overflow: visible !important;
}
.left-nav .settings-nav-container,
.left-nav .settings-nav-container vdr-main-nav,
.left-nav .settings-nav-container nav.main-nav,
.left-nav .settings-nav-container .nav-group,
.left-nav .settings-nav-container .nav-list,
.left-nav .settings-nav-container .section-header {
    background: transparent !important;
}
.left-nav vdr-main-nav nav.main-nav .nav-group.cla-nav-accordion-group {
    margin: 0.08rem 0 0.42rem !important;
    padding: 0.12rem 0.72rem 0.35rem !important;
    overflow: hidden !important;
}
.left-nav vdr-main-nav nav.main-nav .nav-group.cla-nav-accordion-group .section-header {
    display: grid !important;
    grid-template-columns: 1.08rem minmax(0, 1fr) 1.55rem !important;
    align-items: center !important;
    column-gap: 0.72rem !important;
    min-height: 2.35rem !important;
    padding: 0.12rem 0.2rem !important;
    border-radius: 6px !important;
    background: transparent !important;
}
.left-nav vdr-main-nav nav.main-nav .nav-group.cla-nav-accordion-group .section-header:hover {
    background: rgba(245, 235, 217, 0.055) !important;
}
.left-nav vdr-main-nav nav.main-nav .nav-group.cla-nav-accordion-group .nav-group-header {
    display: flex !important;
    align-items: center !important;
    justify-self: start !important;
    align-self: center !important;
    min-width: 0 !important;
    margin: 0 !important;
    padding: 0 !important;
    color: rgba(216, 171, 103, 0.92) !important;
    font-size: 0.68rem !important;
    line-height: 1 !important;
    letter-spacing: 0.13em !important;
    font-weight: 800 !important;
    text-align: left !important;
    text-transform: uppercase !important;
    transform: translateY(1px) !important;
}
.left-nav vdr-main-nav nav.main-nav .nav-group.cla-nav-accordion-group .cla-nav-accordion-title-icon {
    justify-self: center !important;
    align-self: center !important;
    width: 0.95rem !important;
    height: 0.95rem !important;
    margin: 0 !important;
    color: rgba(216, 171, 103, 0.92) !important;
    opacity: 0.9 !important;
}
.left-nav vdr-main-nav nav.main-nav .nav-group.cla-nav-accordion-group .section-header button,
.left-nav vdr-main-nav nav.main-nav .nav-group.cla-nav-accordion-group .cla-nav-accordion-button {
    position: relative !important;
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    width: 1.55rem !important;
    height: 1.55rem !important;
    min-width: 1.55rem !important;
    justify-self: end !important;
    align-self: center !important;
    margin: 0 !important;
    padding: 0 !important;
    border: 1px solid rgba(230, 216, 190, 0.18) !important;
    border-radius: 6px !important;
    background: rgba(247, 239, 224, 0.06) !important;
    color: rgba(247, 239, 224, 0.76) !important;
    box-shadow: none !important;
}
.left-nav vdr-main-nav nav.main-nav .nav-group.cla-nav-accordion-group .cla-nav-accordion-button clr-icon {
    display: none !important;
}
.left-nav vdr-main-nav nav.main-nav .nav-group.cla-nav-accordion-group .cla-nav-accordion-button::before {
    content: "";
    width: 0.42rem;
    height: 0.42rem;
    border-right: 1.5px solid currentColor;
    border-bottom: 1.5px solid currentColor;
    transform: translateY(-1px) rotate(45deg);
    transition: transform 0.18s ease;
}
.left-nav vdr-main-nav nav.main-nav .nav-group.cla-nav-accordion-group.collapsed .cla-nav-accordion-button::before,
.left-nav vdr-main-nav nav.main-nav .nav-group.cla-nav-accordion-group.cla-nav-group-collapsed .cla-nav-accordion-button::before {
    transform: translateX(-1px) rotate(-45deg);
}
.left-nav vdr-main-nav nav.main-nav .nav-group.cla-nav-accordion-group .nav-list {
    margin-top: 0.12rem !important;
    transition: max-height 0.18s ease, opacity 0.14s ease !important;
}
.left-nav .settings-nav-container .nav-group.cla-nav-accordion-group {
    margin: 0.08rem 0 0.42rem !important;
    padding: 0.12rem 0.72rem 0.35rem !important;
    overflow: hidden !important;
}
.left-nav .settings-nav-container .nav-group.cla-nav-accordion-group .section-header {
    display: grid !important;
    grid-template-columns: 1.08rem minmax(0, 1fr) 1.55rem !important;
    align-items: center !important;
    column-gap: 0.72rem !important;
    min-height: 2.35rem !important;
    padding: 0.12rem 0.2rem !important;
    border-radius: 6px !important;
    background: transparent !important;
}
.left-nav .settings-nav-container .nav-group.cla-nav-accordion-group .section-header:hover {
    background: rgba(245, 235, 217, 0.055) !important;
}
.left-nav .settings-nav-container .nav-group.cla-nav-accordion-group .nav-group-header {
    display: flex !important;
    align-items: center !important;
    justify-self: start !important;
    align-self: center !important;
    min-width: 0 !important;
    margin: 0 !important;
    padding: 0 !important;
    color: rgba(216, 171, 103, 0.92) !important;
    font-size: 0.68rem !important;
    line-height: 1 !important;
    letter-spacing: 0.13em !important;
    font-weight: 800 !important;
    text-align: left !important;
    text-transform: uppercase !important;
    transform: translateY(1px) !important;
}
.left-nav .settings-nav-container .nav-group.cla-nav-accordion-group .cla-nav-accordion-title-icon {
    justify-self: center !important;
    align-self: center !important;
    width: 0.95rem !important;
    height: 0.95rem !important;
    margin: 0 !important;
    color: rgba(216, 171, 103, 0.92) !important;
    opacity: 0.9 !important;
}
.left-nav .settings-nav-container .nav-group.cla-nav-accordion-group .section-header button,
.left-nav .settings-nav-container .nav-group.cla-nav-accordion-group .cla-nav-accordion-button {
    position: relative !important;
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    width: 1.55rem !important;
    height: 1.55rem !important;
    min-width: 1.55rem !important;
    justify-self: end !important;
    align-self: center !important;
    margin: 0 !important;
    padding: 0 !important;
    border: 1px solid rgba(230, 216, 190, 0.18) !important;
    border-radius: 6px !important;
    background: rgba(247, 239, 224, 0.06) !important;
    color: rgba(247, 239, 224, 0.76) !important;
    box-shadow: none !important;
}
.left-nav .settings-nav-container .nav-group.cla-nav-accordion-group .section-header button:hover,
.left-nav .settings-nav-container .nav-group.cla-nav-accordion-group .cla-nav-accordion-button:hover {
    background: rgba(199, 164, 107, 0.18) !important;
    color: #ffffff !important;
}
.left-nav .settings-nav-container .nav-group.cla-nav-accordion-group .cla-nav-accordion-button clr-icon {
    display: none !important;
}
.left-nav .settings-nav-container .nav-group.cla-nav-accordion-group .cla-nav-accordion-button::before {
    content: "";
    width: 0.42rem;
    height: 0.42rem;
    border-right: 1.5px solid currentColor;
    border-bottom: 1.5px solid currentColor;
    transform: translateY(-1px) rotate(45deg);
    transition: transform 0.18s ease;
}
.left-nav .settings-nav-container .nav-group.cla-nav-accordion-group.collapsed .cla-nav-accordion-button::before,
.left-nav .settings-nav-container .nav-group.cla-nav-accordion-group.cla-nav-group-collapsed .cla-nav-accordion-button::before {
    transform: translateX(-1px) rotate(-45deg);
}
.left-nav .settings-nav-container .nav-group.cla-nav-accordion-group .nav-list {
    margin-top: 0.12rem !important;
    transition: max-height 0.18s ease, opacity 0.14s ease !important;
}
.left-nav vdr-main-nav nav.main-nav .nav-group.cla-nav-accordion-group:not(.collapsed):not(.cla-nav-group-collapsed) .nav-list {
    display: block !important;
    max-height: none !important;
    overflow: visible !important;
    opacity: 1 !important;
    visibility: visible !important;
    pointer-events: auto !important;
}
.left-nav .settings-nav-container .nav-group.cla-nav-accordion-group:not(.collapsed):not(.cla-nav-group-collapsed) .nav-list {
    display: block !important;
    max-height: none !important;
    overflow: visible !important;
    opacity: 1 !important;
    visibility: visible !important;
    pointer-events: auto !important;
}
.left-nav vdr-main-nav nav.main-nav .nav-group.cla-nav-accordion-group.collapsed .nav-list,
.left-nav vdr-main-nav nav.main-nav .nav-group.cla-nav-accordion-group.cla-nav-group-collapsed .nav-list,
.left-nav .settings-nav-container .nav-group.cla-nav-accordion-group.collapsed .nav-list,
.left-nav .settings-nav-container .nav-group.cla-nav-accordion-group.cla-nav-group-collapsed .nav-list {
    max-height: 0 !important;
    overflow: hidden !important;
    opacity: 0 !important;
    visibility: hidden !important;
    margin-top: 0 !important;
    pointer-events: none !important;
}
`;

    const FALLBACK_NAV_LINKS = [
        { id: 'home-carousel', sectionId: 'marketing', label: 'Carrusel', route: '/extensions/home-carousel', icon: 'image' },
    ];

    const SIDEBAR_SECTION_ICONS = {
        catalog: 'folder',
        catalogo: 'folder',
        sales: 'shopping-cart',
        ventas: 'shopping-cart',
        customer: 'users',
        customers: 'users',
        clientes: 'users',
        marketing: 'image',
        settings: 'cog',
        ajustes: 'cog',
        system: 'blocks-group',
        sistema: 'blocks-group',
    };

    let lastPath = '';
    let lastSidebarPath = '';
    let tooltipEl = null;
    let activeTooltipHost = null;
    let runAllScheduled = false;

    function injectSidebarFixStyles() {
        if (document.getElementById('cla-sidebar-runtime-fix')) {
            return;
        }
        const style = document.createElement('style');
        style.id = 'cla-sidebar-runtime-fix';
        style.textContent = SIDEBAR_FIX_CSS;
        document.head.appendChild(style);
    }

    function getAdminBasePath() {
        const baseEl = document.querySelector('base[href]');
        const baseHref = baseEl ? baseEl.getAttribute('href') : '/admin/';
        try {
            return new URL(baseHref, window.location.origin).pathname.replace(/\/$/, '') || '/admin';
        } catch (error) {
            return '/admin';
        }
    }

    function findNavGroup(sectionId, label) {
        const nav = document.querySelector('.left-nav vdr-main-nav nav.main-nav');
        if (!nav) {
            return null;
        }
        const direct = nav.querySelector('.nav-group[data-section-id="' + sectionId + '"]');
        if (direct) {
            return direct;
        }
        const normalizedLabel = normalizeText(label || sectionId);
        return Array.from(nav.querySelectorAll('.nav-group')).find(function (group) {
            const header = group.querySelector('.section-header, .nav-group-header');
            return normalizeText(header ? header.textContent : '').indexOf(normalizedLabel) !== -1;
        }) || null;
    }

    function createFallbackNavGroup(sectionId, label) {
        const nav = document.querySelector('.left-nav vdr-main-nav nav.main-nav');
        if (!nav) {
            return null;
        }
        const group = document.createElement('div');
        group.className = 'nav-group cla-fallback-nav-group';
        group.setAttribute('data-section-id', sectionId);

        const header = document.createElement('div');
        header.className = 'section-header nav-group-header';
        header.textContent = label;

        const list = document.createElement('div');
        list.className = 'nav-list';

        group.appendChild(header);
        group.appendChild(list);
        nav.appendChild(group);
        return group;
    }

    function cleanupFallbackNavLink(item) {
        const escapedRoute = item.route.replace(/"/g, '\\"');
        const fallback = document.querySelector('[data-cla-fallback-item="' + item.id + '"]');
        const realLink = Array.from(document.querySelectorAll('a[href$="' + escapedRoute + '"]')).find(function (link) {
            return !link.closest('[data-cla-fallback-item]');
        });
        if (fallback && realLink) {
            const group = fallback.closest('.cla-fallback-nav-group');
            fallback.remove();
            if (group && !group.querySelector('.nav-link')) {
                group.remove();
            }
        }
    }

    function ensureFallbackNavLink(item) {
        cleanupFallbackNavLink(item);
        const adminBase = getAdminBasePath();
        const href = adminBase + item.route;
        const escapedRoute = item.route.replace(/"/g, '\\"');
        const existing = document.querySelector(
            '[data-cla-fallback-item="' + item.id + '"], a[href="' + href + '"], a[href$="' + escapedRoute + '"]',
        );
        if (existing) {
            return;
        }

        const group = findNavGroup(item.sectionId, 'Marketing') || createFallbackNavGroup(item.sectionId, 'Marketing');
        const navList = group ? group.querySelector('.nav-list') : null;
        if (!navList) {
            return;
        }

        const wrapper = document.createElement('div');
        wrapper.className = 'nav-link px-4 cla-fallback-nav-link';
        wrapper.setAttribute('data-cla-fallback-item', item.id);

        const link = document.createElement('a');
        link.href = href;
        link.setAttribute('data-item-id', item.id);

        const icon = document.createElement('clr-icon');
        icon.setAttribute('shape', item.icon);
        icon.setAttribute('size', '16');

        const span = document.createElement('span');
        span.textContent = item.label;

        link.appendChild(icon);
        link.appendChild(span);
        wrapper.appendChild(link);
        navList.appendChild(wrapper);
    }

    function ensureCarouselNavLinks() {
        FALLBACK_NAV_LINKS.forEach(ensureFallbackNavLink);
    }

    function getSidebarGroups() {
        return Array.from(new Set(Array.from(document.querySelectorAll(
            '.left-nav vdr-main-nav nav.main-nav .nav-group, .left-nav .settings-nav-container .nav-group'
        ))));
    }

    function getSidebarGroupLabel(group) {
        const label = group.querySelector('.nav-group-header, .section-header');
        return (label ? label.textContent : group.getAttribute('data-section-id') || '').replace(/\s+/g, ' ').trim();
    }

    function getSidebarGroupKey(group, index) {
        const existing = group.getAttribute('data-cla-accordion-key');
        if (existing) {
            return existing;
        }
        const key = normalizeText(group.getAttribute('data-section-id') || getSidebarGroupLabel(group) || 'group-' + index);
        group.setAttribute('data-cla-accordion-key', key);
        return key;
    }

    function getSidebarGroupIconShape(group, key) {
        const labelKey = normalizeText(getSidebarGroupLabel(group));
        return SIDEBAR_SECTION_ICONS[key] || SIDEBAR_SECTION_ICONS[labelKey] || 'folder';
    }

    function ensureSidebarGroupIcon(group, key) {
        const header = group.querySelector('.section-header');
        const label = header ? header.querySelector('.nav-group-header') : null;
        if (!header || !label) {
            return;
        }
        let icon = header.querySelector('.cla-nav-accordion-title-icon');
        if (!icon) {
            icon = document.createElement('clr-icon');
            icon.className = 'cla-nav-accordion-title-icon';
            icon.setAttribute('size', '14');
            header.insertBefore(icon, label);
        }
        icon.setAttribute('shape', getSidebarGroupIconShape(group, key));
    }

    function sidebarGroupIsActive(group) {
        if (group.classList.contains('active')) {
            return true;
        }
        return Boolean(group.querySelector('.nav-link.active, a.active, a[aria-current="page"]'));
    }

    function getAccordionStorageValue(key) {
        try {
            return window.localStorage.getItem('cla-sidebar-accordion-v2:' + key);
        } catch (error) {
            return null;
        }
    }

    function setAccordionStorageValue(key, value) {
        try {
            window.localStorage.setItem('cla-sidebar-accordion-v2:' + key, value);
        } catch (error) {
            // Local storage can be disabled; the accordion still works for this session.
        }
    }

    function getSidebarGroupNavList(group) {
        return group.querySelector(':scope > vdr-ui-extension-point > .nav-list, :scope > .nav-list, .nav-list');
    }

    function setNavListVisibility(group, collapsed) {
        const navList = getSidebarGroupNavList(group);
        if (!navList) {
            return;
        }

        if (collapsed) {
            navList.style.setProperty('display', 'block', 'important');
            navList.style.setProperty('max-height', '0', 'important');
            navList.style.setProperty('overflow', 'hidden', 'important');
            navList.style.setProperty('opacity', '0', 'important');
            navList.style.setProperty('visibility', 'hidden', 'important');
            navList.style.setProperty('margin-top', '0', 'important');
            navList.style.setProperty('pointer-events', 'none', 'important');
            return;
        }

        navList.style.setProperty('display', 'block', 'important');
        navList.style.setProperty('max-height', 'none', 'important');
        navList.style.setProperty('overflow', 'visible', 'important');
        navList.style.setProperty('opacity', '1', 'important');
        navList.style.setProperty('visibility', 'visible', 'important');
        navList.style.setProperty('margin-top', '0.12rem', 'important');
        navList.style.setProperty('pointer-events', 'auto', 'important');
    }

    function setSidebarGroupCollapsed(group, collapsed) {
        const shouldCollapse = collapsed && !sidebarGroupIsActive(group);
        group.classList.toggle('collapsed', shouldCollapse);
        group.classList.toggle('cla-nav-group-collapsed', shouldCollapse);
        group.classList.add('collapsible');
        setNavListVisibility(group, shouldCollapse);
        const button = group.querySelector('.cla-nav-accordion-button');
        if (button) {
            button.setAttribute('aria-expanded', String(!shouldCollapse));
            button.setAttribute(
                'aria-label',
                (shouldCollapse ? 'Expandir ' : 'Contraer ') + (getSidebarGroupLabel(group) || 'seccion'),
            );
        }
    }

    function toggleSidebarGroup(group) {
        const key = group.getAttribute('data-cla-accordion-key') || normalizeText(getSidebarGroupLabel(group));
        const nextCollapsed = !group.classList.contains('cla-nav-group-collapsed') && !group.classList.contains('collapsed');
        setSidebarGroupCollapsed(group, nextCollapsed);
        setAccordionStorageValue(key, nextCollapsed ? 'collapsed' : 'expanded');
    }

    function ensureSidebarAccordions() {
        const currentPath = window.location.pathname + window.location.search;
        const routeChanged = currentPath !== lastSidebarPath;

        getSidebarGroups().forEach(function (group, index) {
            const navList = group.querySelector(':scope > vdr-ui-extension-point > .nav-list, :scope > .nav-list, .nav-list');
            const header = group.querySelector(':scope > vdr-ui-extension-point > .section-header, :scope > .section-header, .section-header');
            if (!navList || !header) {
                return;
            }

            const key = getSidebarGroupKey(group, index);
            group.classList.add('cla-nav-accordion-group', 'collapsible');
            header.classList.add('cla-nav-accordion-header');
            ensureSidebarGroupIcon(group, key);

            let button = header.querySelector('.cla-nav-accordion-button') || header.querySelector('button');
            if (!button) {
                button = document.createElement('button');
                button.type = 'button';
                header.appendChild(button);
            }
            button.classList.add('cla-nav-accordion-button');

            if (!button.getAttribute('data-cla-accordion-bound')) {
                button.setAttribute('data-cla-accordion-bound', 'true');
                button.addEventListener('click', function (event) {
                    event.preventDefault();
                    event.stopImmediatePropagation();
                    toggleSidebarGroup(group);
                }, true);
            }

            if (!group.getAttribute('data-cla-accordion-ready')) {
                setSidebarGroupCollapsed(group, !sidebarGroupIsActive(group));
                group.setAttribute('data-cla-accordion-ready', 'true');
            } else if (sidebarGroupIsActive(group)) {
                setSidebarGroupCollapsed(group, false);
            } else if (routeChanged) {
                setSidebarGroupCollapsed(group, true);
            } else {
                setSidebarGroupCollapsed(group, group.classList.contains('cla-nav-group-collapsed') || group.classList.contains('collapsed'));
            }
        });

        lastSidebarPath = currentPath;
    }

    function normalizeText(value) {
        return (value || '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/\s+/g, ' ')
            .replace(/[.:;!?,]/g, '')
            .trim()
            .toLowerCase();
    }

    function rememberTitleForAccessibility(host) {
        const title = host.getAttribute('title');
        if (!title) {
            return;
        }
        if (!host.getAttribute('aria-label') && !(host.textContent || '').trim()) {
            host.setAttribute('aria-label', title);
        }
        host.removeAttribute('title');
    }

    function setTooltip(host, tip) {
        const cleanTip = (tip || '').replace(/\s+/g, ' ').trim();
        if (!cleanTip || host.hasAttribute('data-cla-tip')) {
            return;
        }
        host.setAttribute('data-cla-tip', cleanTip);
        if (cleanTip.length > 42) {
            host.setAttribute('data-cla-tip-wrap', '');
        }
        rememberTitleForAccessibility(host);
    }

    function inferActionTooltip(host) {
        const label = host.getAttribute('aria-label')
            || host.getAttribute('title')
            || host.textContent
            || '';
        const normalized = normalizeText(label);
        if (!normalized) {
            return '';
        }
        if (ACTION_TIPS[normalized]) {
            return ACTION_TIPS[normalized];
        }
        const matchedPattern = ACTION_PATTERNS.find(function (entry) {
            return entry.pattern.test(normalized);
        });
        if (matchedPattern) {
            return matchedPattern.tip;
        }
        if (normalized.length < 3 || /^\d+$/.test(normalized)) {
            return '';
        }
        if (normalized.length <= 38) {
            return label.replace(/\s+/g, ' ').trim();
        }
        return '';
    }

    function applyIconTooltips(root) {
        const icons = (root || document).querySelectorAll('cds-icon[shape], clr-icon[shape]');
        icons.forEach(function (icon) {
            const shape = icon.getAttribute('shape');
            const tip = ICON_TIPS[shape];
            if (!tip) {
                return;
            }
            const host = icon.closest('button, a, [role="button"]') || icon;
            setTooltip(host, tip);
        });
    }

    function applyActionTooltips(root) {
        const actionHosts = (root || document).querySelectorAll(
            'button, a.btn, .btn, [role="button"], .icon-button',
        );
        actionHosts.forEach(function (host) {
            if (host.closest('.left-nav')) {
                return;
            }
            const tip = inferActionTooltip(host);
            if (!tip) {
                return;
            }
            setTooltip(host, tip);
        });
    }

    function ensureTooltipEl() {
        if (tooltipEl) {
            return tooltipEl;
        }
        tooltipEl = document.createElement('div');
        tooltipEl.className = 'cla-floating-tooltip';
        document.body.appendChild(tooltipEl);
        document.body.classList.add('cla-tooltips-ready');
        return tooltipEl;
    }

    function positionTooltip(host) {
        if (!host || !document.body.contains(host)) {
            hideTooltip();
            return;
        }

        const el = ensureTooltipEl();
        const margin = 12;
        const rect = host.getBoundingClientRect();
        const maxWidth = host.hasAttribute('data-cla-tip-wrap') ? 280 : 380;

        el.style.maxWidth = Math.max(180, Math.min(maxWidth, window.innerWidth - margin * 2)) + 'px';
        const width = el.offsetWidth;
        const height = el.offsetHeight;

        let left = rect.left + rect.width / 2 - width / 2;
        left = Math.max(margin, Math.min(left, window.innerWidth - width - margin));

        let top = rect.top - height - 12;
        let placeBottom = false;
        if (top < margin) {
            top = rect.bottom + 12;
            placeBottom = true;
        }

        const arrowLeft = Math.max(18, Math.min(width - 18, rect.left + rect.width / 2 - left));

        el.classList.toggle('cla-floating-tooltip--bottom', placeBottom);
        el.style.left = Math.round(left) + 'px';
        el.style.top = Math.round(top) + 'px';
        el.style.setProperty('--cla-tip-arrow-left', Math.round(arrowLeft) + 'px');
    }

    function showTooltip(host) {
        if (!host || !host.getAttribute('data-cla-tip')) {
            return;
        }

        const el = ensureTooltipEl();
        activeTooltipHost = host;
        el.textContent = host.getAttribute('data-cla-tip');
        el.classList.toggle('cla-floating-tooltip--wrap', host.hasAttribute('data-cla-tip-wrap'));
        el.classList.add('is-visible');
        positionTooltip(host);
    }

    function hideTooltip() {
        activeTooltipHost = null;
        if (!tooltipEl) {
            return;
        }
        tooltipEl.classList.remove('is-visible', 'cla-floating-tooltip--bottom', 'cla-floating-tooltip--wrap');
    }

    function findTooltipHost(node) {
        if (!node || node.nodeType !== 1) {
            return null;
        }
        return node.closest('[data-cla-tip]');
    }

    function bindTooltipEvents() {
        document.addEventListener('mouseover', function (event) {
            const host = findTooltipHost(event.target);
            if (!host || host === activeTooltipHost) {
                return;
            }
            showTooltip(host);
        }, true);

        document.addEventListener('mouseout', function (event) {
            const host = findTooltipHost(event.target);
            const nextHost = findTooltipHost(event.relatedTarget);
            if (host && host === activeTooltipHost && host !== nextHost) {
                hideTooltip();
            }
        }, true);

        document.addEventListener('focusin', function (event) {
            const host = findTooltipHost(event.target);
            if (host) {
                showTooltip(host);
            }
        });

        document.addEventListener('focusout', function (event) {
            const host = findTooltipHost(event.target);
            const nextHost = findTooltipHost(event.relatedTarget);
            if (host && host === activeTooltipHost && host !== nextHost) {
                hideTooltip();
            }
        });

        window.addEventListener('resize', function () {
            if (activeTooltipHost) {
                positionTooltip(activeTooltipHost);
            }
        });

        window.addEventListener('scroll', function () {
            if (activeTooltipHost) {
                positionTooltip(activeTooltipHost);
            }
        }, true);
    }

    let currentToast = null;
    let currentToastTimers = [];



    let lastRunTime = 0;
    function runAll() {
        const now = Date.now();
        if (now - lastRunTime < 300) {
            return;
        }
        lastRunTime = now;

        try {
            injectSidebarFixStyles();
            ensureCarouselNavLinks();
            ensureSidebarAccordions();
            applyIconTooltips(document);
            applyActionTooltips(document);
            injectHelpBanner();
            if (activeTooltipHost) {
                positionTooltip(activeTooltipHost);
            }
        } catch (error) {
            console.warn('[CLA] enhancements error:', error);
        }
    }

    function scheduleRunAll(delay) {
        if (runAllScheduled) {
            return;
        }
        runAllScheduled = true;

        const run = function () {
            runAllScheduled = false;
            runAll();
        };

        if (delay) {
            setTimeout(run, delay);
            return;
        }

        if (typeof window.requestAnimationFrame === 'function') {
            window.requestAnimationFrame(run);
        } else {
            setTimeout(run, 16);
        }
    }

    function start() {
        runAll();
        bindTooltipEvents();

        const observer = new MutationObserver(function () {
            scheduleRunAll();
        });
        observer.observe(document.body, { childList: true, subtree: true });

        const pushState = history.pushState;
        history.pushState = function () {
            const result = pushState.apply(this, arguments);
            scheduleRunAll(50);
            return result;
        };

        window.addEventListener('popstate', function () {
            scheduleRunAll(50);
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', start);
    } else {
        start();
    }
})();
