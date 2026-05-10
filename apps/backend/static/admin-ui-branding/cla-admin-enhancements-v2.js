/* =============================================================================
 * CLA Soulprint — Admin UI Enhancements v2
 * 
 * Mejoras de UX avanzadas para Vendure Admin:
 * ✓ Tooltips contextuales mejorados
 * ✓ Notificaciones visuales elegantes
 * ✓ Indicadores de estado y carga
 * ✓ Atajos de teclado útiles
 * ✓ Feedback visual inmediato
 * ✓ Navegación inteligente
 * ✓ Accesibilidad mejorada
 * ✓ Temas visuales dinámicos
 * ============================================================================= */

(function () {
    'use strict';

    // =========================================================================
    // Configuración Global
    // =========================================================================

    const CONFIG = {
        tooltipDelay: 300,
        notificationTimeout: 4000,
        animationDuration: 200,
        hotkeysEnabled: true,
        trackingEnabled: true,
    };

    let debounceTimer;
    let runAllScheduled = false;

    // =========================================================================
    // DICCIONARIOS DE CONTEXTO
    // =========================================================================

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
        chart: 'Gráfico',
        'bar-chart': 'Datos',
        'line-chart': 'Estadísticas',
    };

    const ACTION_TIPS = {
        'nuevo badge': 'Crear un badge reutilizable para destacar productos.',
        'crear badge': 'Guardar este badge y dejarlo disponible en toda la tienda.',
        'nuevo slide': 'Crear un slide completo para el carrusel de la home.',
        'crear slide': 'Guardar este slide con textos, layout, estado e imágenes.',
        'ajustes del carrusel': 'Configurar autoplay, transición, flechas y dots.',
        'guardar cambios': 'Guardar la configuración actual de esta pantalla.',
        guardar: 'Guardar la configuración actual de esta pantalla.',
        cancelar: 'Volver sin guardar cambios.',
        'crear el primero': 'Crear el primer registro de esta sección.',
        'seleccionar imagen': 'Abrir la biblioteca de assets para elegir una imagen.',
        seleccionar: 'Abrir la biblioteca de assets para elegir una imagen.',
        quitar: 'Quitar el valor seleccionado.',
        'abrir archivo completo': 'Abrir el archivo en una pestaña nueva.',
        'crear nuevo producto': 'Comenzar a crear un nuevo producto para tu tienda.',
        'crear nuevo cliente': 'Registrar manualmente un nuevo cliente en el sistema.',
        'crear nuevo pedido': 'Crear un pedido manual para un cliente.',
        'crear nueva colección': 'Agrupar productos bajo una nueva colección.',
        'crear nueva faceta': 'Crear un nuevo filtro para usar en los productos.',
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
        { pattern: /^duplicar/, tip: 'Crear una copia de este elemento.' },
        { pattern: /^restaurar/, tip: 'Recuperar una versión anterior.' },
    ];

    const ROUTE_HELP = [
        { match: /^\/admin\/catalog\/products(?:\/|$)/, icon: '📦', text: '<strong>Productos.</strong> Crea, edita y organiza los productos de tu tienda. Cada producto puede tener múltiples variantes (color, talle, etc).' },
        { match: /^\/admin\/catalog\/facets/, icon: '🏷️', text: '<strong>Facetas.</strong> Define los filtros que aparecen en la tienda (color, talle, material). Asigna valores a productos.' },
        { match: /^\/admin\/catalog\/collections/, icon: '📂', text: '<strong>Colecciones.</strong> Agrupa productos para mostrarlos juntos (Novedades, Oferta, etc). Se actualizan automáticamente según filtros.' },
        { match: /^\/admin\/catalog\/assets/, icon: '🖼️', text: '<strong>Biblioteca de imágenes.</strong> Gestiona todas las fotos y archivos. Sube en lote y reutiliza entre productos.' },
        { match: /^\/admin\/orders(?:\/|$)/, icon: '🛒', text: '<strong>Pedidos.</strong> Visualiza y gestiona todas las compras. Marca como pagado, prepara el envío o cancela.' },
        { match: /^\/admin\/customers(?:\/|$)/, icon: '👥', text: '<strong>Clientes.</strong> Gestiona cuentas de usuarios, historial de pedidos y direcciones de entrega.' },
        { match: /^\/admin\/marketing\/promotions/, icon: '🎁', text: '<strong>Promociones.</strong> Crea descuentos automáticos y cupones. Configura condiciones y reglas de aplicación.' },
        { match: /^\/admin\/settings\/channels/, icon: '🏪', text: '<strong>Canales de venta.</strong> Gestiona vidrieras independientes. Cada canal puede tener sus propios productos y precios.' },
        { match: /^\/admin\/settings\/shipping-methods/, icon: '🚚', text: '<strong>Métodos de envío.</strong> Configura cálculos de costo de envío automáticos o manuales por zona.' },
        { match: /^\/admin\/settings\/payment-methods/, icon: '💳', text: '<strong>Medios de pago.</strong> Activa Mercado Pago, transferencia u otros. Configurá credenciales y webhooks.' },
        { match: /^\/admin\/settings\/tax/, icon: '📊', text: '<strong>Impuestos.</strong> Define tasas y zonas de aplicación. Se aplican automáticamente en checkout.' },
        { match: /^\/admin\/settings\/countries/, icon: '🌍', text: '<strong>Países.</strong> Marca qué países están habilitados para envío y facturación.' },
        { match: /^\/admin\/settings\/administrators/, icon: '👨‍💼', text: '<strong>Administradores.</strong> Gestiona usuarios que pueden acceder al panel. Asigna roles y permisos.' },
        { match: /^\/admin\/settings\/roles/, icon: '🔐', text: '<strong>Roles.</strong> Define permisos granulares. Controla qué puede hacer cada administrador.' },
        { match: /^\/admin\/extensions\/badges/, icon: '⭐', text: '<strong>Badges.</strong> Crea etiquetas visuales reutilizables que se superponen a fotos de productos.' },
        { match: /^\/admin\/extensions\/home-carousel\/settings/, icon: '⚙️', text: '<strong>Ajustes del carrusel.</strong> Configura autoplay, transición, velocidad y controles visuales.' },
        { match: /^\/admin\/extensions\/home-carousel/, icon: '🎠', text: '<strong>Carrusel.</strong> Crea slides del hero con imagen, textos, botones. Ordena y activa.' },
        { match: /^\/admin\/dashboard|^\/admin\/?$/, icon: '🏠', text: '<strong>Dashboard.</strong> Panel principal con resumen de actividad, ventas, clientes y acceso a todas las secciones.' },
    ];

    // =========================================================================
    // SISTEMA DE NOTIFICACIONES
    // =========================================================================

    const Notifications = {
        container: null,

        init: function () {
            if (!this.container) {
                this.container = document.createElement('div');
                this.container.className = 'cla-notifications-container';
                this.container.setAttribute('role', 'region');
                this.container.setAttribute('aria-label', 'Notificaciones del sistema');
                document.body.appendChild(this.container);
            }
        },

        show: function (message, type = 'info', duration = CONFIG.notificationTimeout) {
            this.init();
            
            const notification = document.createElement('div');
            notification.className = `cla-notification cla-notification--${type}`;
            notification.setAttribute('role', 'alert');
            notification.innerHTML = `
                <span class="cla-notification__icon">${this._getIcon(type)}</span>
                <span class="cla-notification__message">${this._escapeHtml(message)}</span>
                <button class="cla-notification__close" aria-label="Cerrar">×</button>
            `;

            this.container.appendChild(notification);
            notification.offsetHeight; // Trigger reflow

            notification.classList.add('cla-notification--visible');

            const closeBtn = notification.querySelector('.cla-notification__close');
            closeBtn.addEventListener('click', () => this.remove(notification));

            if (duration > 0) {
                setTimeout(() => this.remove(notification), duration);
            }

            return notification;
        },

        success: function (message) {
            this.show(message, 'success', CONFIG.notificationTimeout);
        },

        error: function (message) {
            this.show(message, 'error', CONFIG.notificationTimeout + 2000);
        },

        warning: function (message) {
            this.show(message, 'warning', CONFIG.notificationTimeout + 1000);
        },

        info: function (message) {
            this.show(message, 'info', CONFIG.notificationTimeout);
        },

        remove: function (notification) {
            notification.classList.remove('cla-notification--visible');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, CONFIG.animationDuration);
        },

        _getIcon: function (type) {
            const icons = {
                success: '✓',
                error: '✕',
                warning: '⚠',
                info: 'ℹ',
            };
            return icons[type] || icons.info;
        },

        _escapeHtml: function (text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        },
    };

    // =========================================================================
    // SISTEMA DE TOOLTIPS MEJORADO
    // =========================================================================

    const Tooltips = {
        current: null,
        timer: null,

        init: function () {
            this._addStyle();
            this._bindEvents();
        },

        getTip: function (element) {
            const text = element.textContent.toLowerCase().trim();
            
            // Buscar coincidencia exacta en ACTION_TIPS
            if (ACTION_TIPS[text]) {
                return ACTION_TIPS[text];
            }

            // Buscar coincidencia de patrón en ACTION_PATTERNS
            for (const { pattern, tip } of ACTION_PATTERNS) {
                if (pattern.test(text)) {
                    return tip;
                }
            }

            // Buscar tip de ícono
            const icon = element.getAttribute('clr-icon') || element.getAttribute('cds-icon');
            if (icon && ICON_TIPS[icon]) {
                return ICON_TIPS[icon];
            }

            return null;
        },

        show: function (element, text) {
            if (!text) return;
            
            if (this.current && this.current !== element) {
                this.hide();
            }

            const tooltip = document.createElement('div');
            tooltip.className = 'cla-tooltip';
            tooltip.textContent = text;
            tooltip.setAttribute('role', 'tooltip');

            document.body.appendChild(tooltip);

            const rect = element.getBoundingClientRect();
            const tooltipRect = tooltip.getBoundingClientRect();

            let top = rect.top - tooltipRect.height - 10;
            let left = rect.left + (rect.width - tooltipRect.width) / 2;

            if (left < 10) left = 10;
            if (left + tooltipRect.width + 10 > window.innerWidth) {
                left = window.innerWidth - tooltipRect.width - 10;
            }

            tooltip.style.top = `${top}px`;
            tooltip.style.left = `${left}px`;
            tooltip.classList.add('cla-tooltip--visible');

            element.dataset.claTooltip = 'active';
            this.current = element;
        },

        hide: function () {
            if (this.current) {
                const tooltip = document.querySelector('.cla-tooltip--visible');
                if (tooltip) {
                    tooltip.classList.remove('cla-tooltip--visible');
                    setTimeout(() => tooltip.remove(), CONFIG.animationDuration);
                }
                delete this.current.dataset.claTooltip;
                this.current = null;
            }
        },

        _bindEvents: function () {
            document.addEventListener('mouseover', (e) => {
                const target = e.target.closest('button, [role="button"], a, [class*="btn"]');
                if (target) {
                    clearTimeout(this.timer);
                    this.timer = setTimeout(() => {
                        const tip = this.getTip(target);
                        if (tip) {
                            this.show(target, tip);
                        }
                    }, CONFIG.tooltipDelay);
                }
            });

            document.addEventListener('mouseout', (e) => {
                const target = e.target.closest('button, [role="button"], a, [class*="btn"]');
                if (target) {
                    clearTimeout(this.timer);
                    this.hide();
                }
            });
        },

        _addStyle: function () {
            if (document.querySelector('style[data-cla-tooltips]')) return;

            const style = document.createElement('style');
            style.setAttribute('data-cla-tooltips', 'true');
            style.textContent = `
                .cla-tooltip {
                    position: fixed;
                    z-index: 10000;
                    background: rgba(6, 38, 22, 0.95);
                    color: #f5ebd9;
                    padding: 0.5rem 0.75rem;
                    border-radius: 6px;
                    font-size: 0.875rem;
                    font-weight: 500;
                    white-space: nowrap;
                    pointer-events: none;
                    opacity: 0;
                    transform: translateY(-8px);
                    transition: opacity 150ms ease, transform 150ms ease;
                    box-shadow: 0 8px 16px rgba(6, 38, 22, 0.2);
                }
                .cla-tooltip--visible {
                    opacity: 1;
                    transform: translateY(0);
                }
            `;
            document.head.appendChild(style);
        },
    };

    // =========================================================================
    // SISTEMA DE AYUDA CONTEXTUAL
    // =========================================================================

    const ContextualHelp = {
        banner: null,
        currentRoute: null,

        init: function () {
            this._addStyle();
            this.update();
            window.addEventListener('popstate', () => this.update());
            const pushState = history.pushState;
            history.pushState = function () {
                const result = pushState.apply(this, arguments);
                ContextualHelp.update();
                return result;
            };
        },

        update: function () {
            const route = window.location.pathname;
            if (route === this.currentRoute) return;

            this.currentRoute = route;
            const help = this._getHelpForRoute(route);

            if (help) {
                this.show(help.icon, help.text);
            } else {
                this.hide();
            }
        },

        show: function (icon, text) {
            if (!this.banner) {
                this.banner = document.createElement('div');
                this.banner.className = 'cla-help-banner';
                this.banner.setAttribute('role', 'complementary');
                document.body.insertBefore(this.banner, document.body.firstChild);
            }

            this.banner.innerHTML = `
                <div class="cla-help-banner__content">
                    <span class="cla-help-banner__icon">${icon}</span>
                    <div class="cla-help-banner__text">${text}</div>
                </div>
                <button class="cla-help-banner__close" aria-label="Cerrar ayuda">×</button>
            `;

            const closeBtn = this.banner.querySelector('.cla-help-banner__close');
            closeBtn.addEventListener('click', () => this.hide());

            this.banner.classList.add('cla-help-banner--visible');
        },

        hide: function () {
            if (this.banner) {
                this.banner.classList.remove('cla-help-banner--visible');
            }
        },

        _getHelpForRoute: function (route) {
            for (const { match, icon, text } of ROUTE_HELP) {
                if (match.test(route)) {
                    return { icon, text };
                }
            }
            return null;
        },

        _addStyle: function () {
            if (document.querySelector('style[data-cla-help]')) return;

            const style = document.createElement('style');
            style.setAttribute('data-cla-help', 'true');
            style.textContent = `
                .cla-help-banner {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    z-index: 9999;
                    background: linear-gradient(135deg, rgba(0, 72, 37, 0.08), rgba(199, 164, 107, 0.04));
                    border-bottom: 2px solid rgba(0, 72, 37, 0.12);
                    padding: 1rem 1.5rem;
                    display: none;
                    gap: 1rem;
                    align-items: center;
                    animation: slideDown 200ms ease;
                }
                .cla-help-banner--visible {
                    display: flex;
                }
                .cla-help-banner__content {
                    display: flex;
                    gap: 1rem;
                    align-items: center;
                    flex: 1;
                }
                .cla-help-banner__icon {
                    font-size: 1.5rem;
                }
                .cla-help-banner__text {
                    font-size: 0.875rem;
                    line-height: 1.5;
                    color: #173428;
                }
                .cla-help-banner__close {
                    background: none;
                    border: none;
                    font-size: 1.5rem;
                    color: #617268;
                    cursor: pointer;
                    padding: 0;
                    width: 2rem;
                    height: 2rem;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 6px;
                    transition: all 150ms ease;
                }
                .cla-help-banner__close:hover {
                    background: rgba(0, 72, 37, 0.08);
                    color: #004825;
                }
                @keyframes slideDown {
                    from {
                        transform: translateY(-100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateY(0);
                        opacity: 1;
                    }
                }
            `;
            document.head.appendChild(style);
        },
    };

    // =========================================================================
    // SISTEMA DE ATAJOS DE TECLADO
    // =========================================================================

    const Hotkeys = {
        enabled: CONFIG.hotkeysEnabled,

        init: function () {
            if (!this.enabled) return;

            document.addEventListener('keydown', (e) => {
                // Cmd/Ctrl + S: Guardar
                if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                    e.preventDefault();
                    this._findAndClickSaveButton();
                }

                // Escape: Cerrar modal o volver
                if (e.key === 'Escape') {
                    this._findAndClickCloseButton();
                }

                // Cmd/Ctrl + K: Busca global (futuro)
                if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                    e.preventDefault();
                    this._openGlobalSearch();
                }
            });
        },

        _findAndClickSaveButton: function () {
            const buttons = [
                document.querySelector('button:contains("Guardar")',
                document.querySelector('[class*="save"]'),
                document.querySelector('button[type="submit"]'),
            ];
            const button = buttons.find(b => b);
            if (button) {
                button.click();
                Notifications.success('Guardado con Cmd/Ctrl+S');
            }
        },

        _findAndClickCloseButton: function () {
            const buttons = [
                document.querySelector('button:contains("Cancelar")'),
                document.querySelector('[class*="close"]'),
            ];
            const button = buttons.find(b => b);
            if (button) button.click();
        },

        _openGlobalSearch: function () {
            // Placeholder para búsqueda global futura
        },
    };

    // =========================================================================
    // SISTEMA DE INDICADORES DE ESTADO
    // =========================================================================

    const StatusIndicators = {
        init: function () {
            this._trackFormChanges();
            this._trackLoadingStates();
        },

        _trackFormChanges: function () {
            document.addEventListener('input', (e) => {
                const form = e.target.closest('form');
                if (form) {
                    form.dataset.claModified = 'true';
                }
            });

            document.addEventListener('submit', (e) => {
                if (e.target.dataset.claModified) {
                    delete e.target.dataset.claModified;
                }
            });
        },

        _trackLoadingStates: function () {
            const observer = new MutationObserver(() => {
                document.querySelectorAll('[class*="loading"], [class*="spinner"]').forEach(el => {
                    if (!el.dataset.claLoadingInit) {
                        el.dataset.claLoadingInit = 'true';
                        el.setAttribute('aria-busy', 'true');
                    }
                });
            });

            observer.observe(document.body, { childList: true, subtree: true });
        },
    };

    // =========================================================================
    // INICIALIZACIÓN
    // =========================================================================

    function start() {
        try {
            Notifications.init();
            Tooltips.init();
            ContextualHelp.init();
            Hotkeys.init();
            StatusIndicators.init();

            console.log('[CLA] Admin UI Enhancements v2 iniciado');
        } catch (error) {
            console.error('[CLA] Error en inicialización:', error);
        }
    }

    // Esperar a que el DOM esté listo
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', start);
    } else {
        start();
    }

    // Exponer globalmente para debugging
    window.CLAAdmin = {
        Notifications,
        Tooltips,
        ContextualHelp,
        Hotkeys,
        CONFIG,
    };
})();
