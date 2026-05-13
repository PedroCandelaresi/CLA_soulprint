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
        'nuevo badge': 'Crear una etiqueta visual reusable para destacar productos o variantes.',
        'crear badge': 'Guardar esta etiqueta visual y dejarla disponible en la tienda.',
        'nueva etiqueta': 'Crear una etiqueta visual reusable para destacar productos o variantes.',
        'crear etiqueta': 'Guardar esta etiqueta visual y dejarla disponible en la tienda.',
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
        { match: /^\/admin\/extensions\/badges/, text: '<strong>Etiquetas visuales.</strong> Sellos que se superponen a las fotos de los productos, con imagen o color de respaldo.' },
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
        { id: 'home-carousel', sectionId: 'marketing', label: 'Carrusel', route: '/extensions/home-carousel', icon: 'carousel' },
    ];

    const SOLAR_ICONS = {
        catalog: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.5" d="m15.578 3.382l2 1.05c2.151 1.129 3.227 1.693 3.825 2.708C22 8.154 22 9.417 22 11.942v.117c0 2.524 0 3.787-.597 4.801c-.598 1.015-1.674 1.58-3.825 2.709l-2 1.049C13.822 21.539 12.944 22 12 22s-1.822-.46-3.578-1.382l-2-1.05c-2.151-1.129-3.227-1.693-3.825-2.708C2 15.846 2 14.583 2 12.06v-.117c0-2.525 0-3.788.597-4.802c.598-1.015 1.674-1.58 3.825-2.708l2-1.05C10.178 2.461 11.056 2 12 2s1.822.46 3.578 1.382ZM21 7.5l-4 2M12 12L3 7.5m9 4.5v9.5m0-9.5l4.5-2.25l.5-.25m0 0V13m0-3.5l-9.5-5"/></svg>',
        sales: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3.864 16.455c-.858-3.432-1.287-5.147-.386-6.301S6.148 9 9.685 9h4.63c3.538 0 5.306 0 6.207 1.154s.472 2.87-.386 6.301c-.546 2.183-.818 3.274-1.632 3.91c-.814.635-1.939.635-4.189.635h-4.63c-2.25 0-3.375 0-4.189-.635c-.814-.636-1.087-1.727-1.632-3.91Z"/><path d="m19.5 9.5l-.71-2.605c-.274-1.005-.411-1.507-.692-1.886A2.5 2.5 0 0 0 17 4.172C16.56 4 16.04 4 15 4M4.5 9.5l.71-2.605c.274-1.005.411-1.507.692-1.886A2.5 2.5 0 0 1 7 4.172C7.44 4 7.96 4 9 4"/><path d="M9 4a1 1 0 0 1 1-1h4a1 1 0 1 1 0 2h-4a1 1 0 0 1-1-1Z"/></g></svg>',
        customers: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="9" cy="6" r="4"/><path stroke-linecap="round" d="M15 9a3 3 0 1 0 0-6"/><ellipse cx="9" cy="17" rx="7" ry="4"/><path stroke-linecap="round" d="M18 14c1.754.385 3 1.359 3 2.5c0 1.03-1.014 1.923-2.5 2.37"/></g></svg>',
        marketing: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4.728 16.137c-1.545-1.546-2.318-2.318-2.605-3.321c-.288-1.003-.042-2.068.45-4.197l.283-1.228c.413-1.792.62-2.688 1.233-3.302s1.51-.82 3.302-1.233l1.228-.284c2.13-.491 3.194-.737 4.197-.45c1.003.288 1.775 1.061 3.32 2.606l1.83 1.83C20.657 9.248 22 10.592 22 12.262c0 1.671-1.344 3.015-4.033 5.704c-2.69 2.69-4.034 4.034-5.705 4.034c-1.67 0-3.015-1.344-5.704-4.033z"/><path stroke-linecap="round" d="M15.39 15.39c.585-.587.664-1.457.176-1.946s-1.359-.409-1.945.177c-.585.586-1.456.665-1.944.177s-.409-1.359.177-1.944m3.535 3.535l.354.354m-.354-.354c-.4.401-.935.565-1.389.471m-2.5-4.36l.354.354m0 0c.331-.332.753-.5 1.146-.497"/><circle cx="8.607" cy="8.879" r="2" transform="rotate(-45 8.607 8.879)"/></g></svg>',
        settings: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="3"/><path d="M13.765 2.152C13.398 2 12.932 2 12 2s-1.398 0-1.765.152a2 2 0 0 0-1.083 1.083c-.092.223-.129.484-.143.863a1.62 1.62 0 0 1-.79 1.353a1.62 1.62 0 0 1-1.567.008c-.336-.178-.579-.276-.82-.308a2 2 0 0 0-1.478.396C4.04 5.79 3.806 6.193 3.34 7s-.7 1.21-.751 1.605a2 2 0 0 0 .396 1.479c.148.192.355.353.676.555c.473.297.777.803.777 1.361s-.304 1.064-.777 1.36c-.321.203-.529.364-.676.556a2 2 0 0 0-.396 1.479c.052.394.285.798.75 1.605c.467.807.7 1.21 1.015 1.453a2 2 0 0 0 1.479.396c.24-.032.483-.13.819-.308a1.62 1.62 0 0 1 1.567.008c.483.28.77.795.79 1.353c.014.38.05.64.143.863a2 2 0 0 0 1.083 1.083C10.602 22 11.068 22 12 22s1.398 0 1.765-.152a2 2 0 0 0 1.083-1.083c.092-.223.129-.483.143-.863c.02-.558.307-1.074.79-1.353a1.62 1.62 0 0 1 1.567-.008c.336.178.579.276.819.308a2 2 0 0 0 1.479-.396c.315-.242.548-.646 1.014-1.453s.7-1.21.751-1.605a2 2 0 0 0-.396-1.479c-.148-.192-.355-.353-.676-.555A1.62 1.62 0 0 1 19.562 12c0-.558.304-1.064.777-1.36c.321-.203.529-.364.676-.556a2 2 0 0 0 .396-1.479c-.052-.394-.285-.798-.75-1.605c-.467-.807-.7-1.21-1.015-1.453a2 2 0 0 0-1.479-.396c-.24.032-.483.13-.82.308a1.62 1.62 0 0 1-1.566-.008a1.62 1.62 0 0 1-.79-1.353c-.014-.38-.05-.64-.143-.863a2 2 0 0 0-1.083-1.083Z"/></g></svg>',
        system: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2 11c0-3.771 0-5.657 1.172-6.828S6.229 3 10 3h4c3.771 0 5.657 0 6.828 1.172S22 7.229 22 11v2c0 3.771 0 5.657-1.172 6.828S17.771 21 14 21h-4c-3.771 0-5.657 0-6.828-1.172S2 16.771 2 13zm0 1h20"/><path stroke-linecap="round" d="M13.5 16.5H18m-4.5-9H18m-12 10v-2m0-7v-2m3 11v-2m0-7v-2"/></g></svg>',
        products: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.5" d="m15.578 3.382l2 1.05c2.151 1.129 3.227 1.693 3.825 2.708C22 8.154 22 9.417 22 11.942v.117c0 2.524 0 3.787-.597 4.801c-.598 1.015-1.674 1.58-3.825 2.709l-2 1.049C13.822 21.539 12.944 22 12 22s-1.822-.46-3.578-1.382l-2-1.05c-2.151-1.129-3.227-1.693-3.825-2.708C2 15.846 2 14.583 2 12.06v-.117c0-2.525 0-3.788.597-4.802c.598-1.015 1.674-1.58 3.825-2.708l2-1.05C10.178 2.461 11.056 2 12 2s1.822.46 3.578 1.382ZM21 7.5L12 12m0 0L3 7.5m9 4.5v9.5"/></svg>',
        tags: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4.728 16.137c-1.545-1.546-2.318-2.318-2.605-3.321c-.288-1.003-.042-2.068.45-4.197l.283-1.228c.413-1.792.62-2.688 1.233-3.302s1.51-.82 3.302-1.233l1.228-.284c2.13-.491 3.194-.737 4.197-.45c1.003.288 1.775 1.061 3.32 2.606l1.83 1.83C20.657 9.248 22 10.592 22 12.262c0 1.671-1.344 3.015-4.033 5.704c-2.69 2.69-4.034 4.034-5.705 4.034c-1.67 0-3.015-1.344-5.704-4.033z"/><circle cx="8.607" cy="8.879" r="2" transform="rotate(-45 8.607 8.879)"/><path stroke-linecap="round" d="m11.542 18.5l6.979-6.98"/></g></svg>',
        collections: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" d="M18 10h-5"/><path d="M10 3h6.5c.464 0 .697 0 .892.026a3 3 0 0 1 2.582 2.582c.026.195.026.428.026.892"/><path d="M2 6.95c0-.883 0-1.324.07-1.692A4 4 0 0 1 5.257 2.07C5.626 2 6.068 2 6.95 2c.386 0 .58 0 .766.017a4 4 0 0 1 2.18.904c.144.119.28.255.554.529L11 4c.816.816 1.224 1.224 1.712 1.495a4 4 0 0 0 .848.352C14.098 6 14.675 6 15.828 6h.374c2.632 0 3.949 0 4.804.77q.119.105.224.224c.77.855.77 2.172.77 4.804V14c0 3.771 0 5.657-1.172 6.828S17.771 22 14 22h-4c-3.771 0-5.657 0-6.828-1.172S2 17.771 2 14z"/></g></svg>',
        assets: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2 12c0-4.714 0-7.071 1.464-8.536C4.93 2 7.286 2 12 2s7.071 0 8.535 1.464C22 4.93 22 7.286 22 12s0 7.071-1.465 8.535C19.072 22 16.714 22 12 22s-7.071 0-8.536-1.465C2 19.072 2 16.714 2 12Z"/><circle cx="16" cy="8" r="2"/><path stroke-linecap="round" d="m2 12.5l1.752-1.533a2.3 2.3 0 0 1 3.14.105l4.29 4.29a2 2 0 0 0 2.564.222l.299-.21a3 3 0 0 1 3.731.225L21 18.5"/></g></svg>',
        visualTags: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4.728 16.137c-1.545-1.546-2.318-2.318-2.605-3.321c-.288-1.003-.042-2.068.45-4.197l.283-1.228c.413-1.792.62-2.688 1.233-3.302s1.51-.82 3.302-1.233l1.228-.284c2.13-.491 3.194-.737 4.197-.45c1.003.288 1.775 1.061 3.32 2.606l1.83 1.83C20.657 9.248 22 10.592 22 12.262c0 1.671-1.344 3.015-4.033 5.704c-2.69 2.69-4.034 4.034-5.705 4.034c-1.67 0-3.015-1.344-5.704-4.033z"/><path stroke-linecap="round" d="M15.39 15.39c.585-.587.664-1.457.176-1.946s-1.359-.409-1.945.177c-.585.586-1.456.665-1.944.177s-.409-1.359.177-1.944m3.535 3.535l.354.354m-.354-.354c-.4.401-.935.565-1.389.471m-2.5-4.36l.354.354m0 0c.331-.332.753-.5 1.146-.497"/><circle cx="8.607" cy="8.879" r="2" transform="rotate(-45 8.607 8.879)"/></g></svg>',
        orders: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3.742 20.555C4.942 22 7.174 22 11.64 22h.72c4.466 0 6.699 0 7.899-1.445m-16.517 0c-1.2-1.446-.788-3.64.035-8.03c.585-3.12.877-4.681 1.988-5.603M3.742 20.555Zm16.517 0c1.2-1.446.788-3.64-.035-8.03c-.585-3.12-.878-4.681-1.989-5.603m2.024 13.633ZM18.235 6.922C17.125 6 15.536 6 12.361 6h-.722c-3.175 0-4.763 0-5.874.922m12.47 0Zm-12.47 0Z"/><path stroke-linecap="round" stroke-linejoin="round" d="m10 14.3l1.333 1.2l2.667-3"/><path stroke-linecap="round" d="M9 6V5a3 3 0 1 1 6 0v1"/></g></svg>',
        customer: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="6" r="4"/><path d="M20 17.5c0 2.485 0 4.5-8 4.5s-8-2.015-8-4.5S7.582 13 12 13s8 2.015 8 4.5Z"/></g></svg>',
        customerGroups: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="6" r="4"/><path stroke-linecap="round" d="M18 9c1.657 0 3-1.12 3-2.5S19.657 4 18 4M6 9C4.343 9 3 7.88 3 6.5S4.343 4 6 4"/><ellipse cx="12" cy="17" rx="6" ry="4"/><path stroke-linecap="round" d="M20 19c1.754-.385 3-1.359 3-2.5s-1.246-2.115-3-2.5M4 19c-1.754-.385-3-1.359-3-2.5s1.246-2.115 3-2.5"/></g></svg>',
        promotions: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><g fill="none"><path stroke="currentColor" stroke-linecap="round" stroke-width="1.5" d="m9 15l6-6"/><path fill="currentColor" d="M15.5 14.5a1 1 0 1 1-2 0a1 1 0 0 1 2 0m-5-5a1 1 0 1 1-2 0a1 1 0 0 1 2 0"/><path stroke="currentColor" stroke-width="1.5" d="M2 12c0-4.714 0-7.071 1.464-8.536C4.93 2 7.286 2 12 2s7.071 0 8.535 1.464C22 4.93 22 7.286 22 12s0 7.071-1.465 8.535C19.072 22 16.714 22 12 22s-7.071 0-8.536-1.465C2 19.072 2 16.714 2 12Z"/></g></svg>',
        carousel: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-width="1.5" d="M8 18c-2.828 0-4.243 0-5.121-.879C2 16.243 2 14.828 2 12s0-4.243.879-5.121C3.757 6 5.172 6 8 6h8c2.828 0 4.243 0 5.121.879C22 7.757 22 9.172 22 12s0 4.243-.879 5.121C20.243 18 18.828 18 16 18zM19.5 6c0-1.4 0-2.1-.273-2.635a2.5 2.5 0 0 0-1.092-1.093C17.6 2 16.9 2 15.5 2h-7c-1.4 0-2.1 0-2.635.272a2.5 2.5 0 0 0-1.093 1.093C4.5 3.9 4.5 4.6 4.5 6m15 12c0 1.4 0 2.1-.273 2.635a2.5 2.5 0 0 1-1.092 1.092C17.6 22 16.9 22 15.5 22h-7c-1.4 0-2.1 0-2.635-.273a2.5 2.5 0 0 1-1.093-1.092C4.5 20.1 4.5 19.4 4.5 18"/></svg>',
    };

    const SIDEBAR_SECTION_ICONS = {
        catalog: 'catalog',
        catalogo: 'catalog',
        sales: 'sales',
        ventas: 'sales',
        customer: 'customers',
        customers: 'customers',
        clientes: 'customers',
        marketing: 'marketing',
        settings: 'settings',
        ajustes: 'settings',
        system: 'system',
        sistema: 'system',
    };

    const SIDEBAR_GROUP_LABELS = {
        catalog: 'Catálogo',
        catalogo: 'Catálogo',
        sales: 'Ventas',
        ventas: 'Ventas',
        customer: 'Clientes',
        customers: 'Clientes',
        clientes: 'Clientes',
        marketing: 'Marketing',
        settings: 'Ajustes',
        ajustes: 'Ajustes',
        system: 'Sistema',
        sistema: 'Sistema',
    };

    const SIDEBAR_ITEM_LABELS = {
        badges: 'Etiquetas visuales',
        badge: 'Etiqueta visual',
    };

    const SIDEBAR_ITEM_ICONS = {
        product: 'products',
        products: 'products',
        producto: 'products',
        productos: 'products',
        facet: 'tags',
        facets: 'tags',
        tag: 'tags',
        tags: 'tags',
        etiqueta: 'tags',
        etiquetas: 'tags',
        collection: 'collections',
        collections: 'collections',
        coleccion: 'collections',
        colecciones: 'collections',
        asset: 'assets',
        assets: 'assets',
        recurso: 'assets',
        recursos: 'assets',
        badge: 'visualTags',
        badges: 'visualTags',
        etiqueta_visual: 'visualTags',
        etiquetas_visuales: 'visualTags',
        order: 'orders',
        orders: 'orders',
        pedido: 'orders',
        pedidos: 'orders',
        customer: 'customer',
        customers: 'customer',
        cliente: 'customer',
        clientes: 'customer',
        customer_group: 'customerGroups',
        customer_groups: 'customerGroups',
        grupo_de_clientes: 'customerGroups',
        grupos_de_clientes: 'customerGroups',
        promotion: 'promotions',
        promotions: 'promotions',
        promocion: 'promotions',
        promociones: 'promotions',
        carousel: 'carousel',
        carrusel: 'carousel',
        home_carousel: 'carousel',
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

    function sidebarKey(value) {
        return normalizeText(value)
            .replace(/[^a-z0-9]+/g, '_')
            .replace(/^_+|_+$/g, '');
    }

    function createSolarIcon(iconKey) {
        const span = document.createElement('span');
        span.className = 'cla-solar-icon';
        span.setAttribute('aria-hidden', 'true');
        span.setAttribute('data-cla-solar-icon', iconKey);
        span.innerHTML = SOLAR_ICONS[iconKey] || SOLAR_ICONS.catalog;

        const svg = span.querySelector('svg');
        if (svg) {
            svg.setAttribute('focusable', 'false');
            svg.setAttribute('aria-hidden', 'true');
        }

        return span;
    }

    function ensureSolarIcon(host, iconKey, referenceNode) {
        if (!host || !SOLAR_ICONS[iconKey]) {
            return;
        }

        const directIcon = Array.from(host.children).find(function (child) {
            return child.classList && child.classList.contains('cla-solar-icon');
        });

        if (directIcon && directIcon.getAttribute('data-cla-solar-icon') === iconKey) {
            return;
        }

        if (directIcon) {
            directIcon.remove();
        }

        const icon = createSolarIcon(iconKey);
        host.insertBefore(icon, referenceNode || host.firstChild);
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
        header.className = 'section-header';

        const headerLabel = document.createElement('span');
        headerLabel.className = 'nav-group-header';
        headerLabel.textContent = label;
        header.appendChild(headerLabel);

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

        const span = document.createElement('span');
        span.textContent = item.label;

        link.appendChild(createSolarIcon(item.icon));
        link.appendChild(span);
        wrapper.appendChild(link);
        navList.appendChild(wrapper);
    }

    function ensureCarouselNavLinks() {
        FALLBACK_NAV_LINKS.forEach(ensureFallbackNavLink);
    }

    function updateLeafLabel(host, label) {
        const spans = Array.from(host.querySelectorAll('span')).filter(function (span) {
            return normalizeText(span.textContent) !== '';
        });
        const target = spans.length > 0 ? spans[spans.length - 1] : host;
        target.textContent = label;
    }

    function polishSidebarCopy() {
        document.querySelectorAll('.left-nav .nav-group-header').forEach(function (header) {
            const label = SIDEBAR_GROUP_LABELS[normalizeText(header.textContent)];
            if (label) {
                header.textContent = label;
            }
        });

        document.querySelectorAll('.left-nav vdr-main-nav nav.main-nav .nav-link > a, .left-nav .settings-nav-container .nav-link > a').forEach(function (link) {
            const label = SIDEBAR_ITEM_LABELS[normalizeText(link.textContent)];
            if (label) {
                updateLeafLabel(link, label);
            }
        });
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
        return SIDEBAR_SECTION_ICONS[key] || SIDEBAR_SECTION_ICONS[labelKey] || 'catalog';
    }

    function ensureSidebarGroupIcon(group, key) {
        group.querySelectorAll('.cla-nav-accordion-title-icon').forEach(function (icon) {
            icon.remove();
        });
    }

    function getSidebarItemIconKey(link) {
        const attrCandidates = [
            link.getAttribute('data-item-id'),
            link.getAttribute('data-extension-id'),
            link.getAttribute('routerlink'),
            link.getAttribute('ng-reflect-router-link'),
            link.getAttribute('href'),
        ].filter(Boolean);

        const route = attrCandidates.join(' ').toLowerCase();
        const routeMatches = [
            ['home-carousel', 'carousel'],
            ['badges', 'visualTags'],
            ['badge', 'visualTags'],
            ['products', 'products'],
            ['facets', 'tags'],
            ['collections', 'collections'],
            ['assets', 'assets'],
            ['orders', 'orders'],
            ['customer-groups', 'customerGroups'],
            ['customers/groups', 'customerGroups'],
            ['customers', 'customer'],
            ['promotions', 'promotions'],
            ['marketing', 'promotions'],
        ];

        const matchedRoute = routeMatches.find(function (entry) {
            return route.indexOf(entry[0]) !== -1;
        });
        if (matchedRoute) {
            return matchedRoute[1];
        }

        const textKey = sidebarKey(link.textContent);
        return SIDEBAR_ITEM_ICONS[textKey] || SIDEBAR_ITEM_ICONS[normalizeText(link.textContent)] || null;
    }

    function ensureSidebarSolarIcons() {
        getSidebarGroups().forEach(function (group, index) {
            const key = getSidebarGroupKey(group, index);
            const header = group.querySelector(':scope > vdr-ui-extension-point > .section-header, :scope > .section-header, .section-header');
            if (!header) {
                return;
            }

            const title = header.querySelector('.nav-group-header') || Array.from(header.children).find(function (child) {
                return !child.matches('button, .cla-nav-accordion-button, .cla-solar-icon');
            });
            ensureSolarIcon(header, getSidebarGroupIconShape(group, key), title || header.firstChild);
        });

        document.querySelectorAll('.left-nav vdr-main-nav nav.main-nav .nav-link > a, .left-nav .settings-nav-container .nav-link > a').forEach(function (link) {
            const iconKey = getSidebarItemIconKey(link);
            const labelNode = Array.from(link.children).find(function (child) {
                return !child.matches('clr-icon, cds-icon, .cla-solar-icon');
            });
            if (iconKey) {
                ensureSolarIcon(link, iconKey, labelNode || link.firstChild);
            }
        });
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

    function getRouteHelp(pathname) {
        return ROUTE_HELP.find(function (entry) {
            return entry.match.test(pathname);
        }) || null;
    }

    function clearToastTimers() {
        currentToastTimers.forEach(function (timer) {
            clearTimeout(timer);
        });
        currentToastTimers = [];
    }

    function hideHelpToast() {
        clearToastTimers();
        if (!currentToast) {
            return;
        }

        currentToast.classList.remove('is-visible');
        currentToastTimers.push(setTimeout(function () {
            if (currentToast && !currentToast.classList.contains('is-visible')) {
                currentToast.remove();
                currentToast = null;
            }
        }, 240));
    }

    function injectHelpBanner() {
        const currentPath = window.location.pathname;
        if (currentPath === lastPath) {
            return;
        }
        lastPath = currentPath;

        const help = getRouteHelp(currentPath);
        if (!help) {
            hideHelpToast();
            return;
        }

        clearToastTimers();
        if (!currentToast) {
            currentToast = document.createElement('div');
            currentToast.className = 'cla-help-toast';
            currentToast.setAttribute('role', 'status');
            currentToast.setAttribute('aria-live', 'polite');
            document.body.appendChild(currentToast);
        }

        currentToast.innerHTML = '<div class="cla-help-toast-body">' + help.text + '</div>' +
            '<button type="button" class="cla-help-toast-close" aria-label="Cerrar ayuda">&times;</button>';

        const closeButton = currentToast.querySelector('.cla-help-toast-close');
        if (closeButton) {
            closeButton.addEventListener('click', hideHelpToast, { once: true });
        }

        currentToastTimers.push(setTimeout(function () {
            if (currentToast) {
                currentToast.classList.add('is-visible');
            }
        }, 20));
        currentToastTimers.push(setTimeout(hideHelpToast, 8000));
    }



    let lastRunTime = 0;
    function runAll() {
        const now = Date.now();
        if (now - lastRunTime < 300) {
            return;
        }
        lastRunTime = now;

        try {
            ensureCarouselNavLinks();
            ensureSidebarAccordions();
            polishSidebarCopy();
            ensureSidebarSolarIcons();
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
