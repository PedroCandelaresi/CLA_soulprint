/* =============================================================================
 * CLA Soulprint — Admin UI enhancements
 *
 * Se carga una sola vez desde index.html. Su objetivo es hacer el panel
 * Vendure "a prueba de boludos": agrega tooltips explicativos en castellano
 * sobre los botones e íconos más importantes, y un banner de ayuda con
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
        'guardar cambios': 'Guardar la configuración actual de esta pantalla.',
        cancelar: 'Volver sin guardar cambios.',
        'crear el primero': 'Crear el primer badge disponible para la tienda.',
        'seleccionar imagen': 'Abrir la biblioteca de assets para elegir una imagen.',
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
        { match: /^\/admin\/dashboard|^\/admin\/?$/, text: '<strong>Bienvenido/a al panel CLA Soulprint.</strong> Desde acá manejás productos, pedidos, clientes y configuraciones de la tienda.' },
    ];

    let lastPath = '';
    let tooltipEl = null;
    let activeTooltipHost = null;

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

    function injectHelpBanner() {
        const path = window.location.pathname;
        if (path === lastPath) {
            return;
        }
        lastPath = path;

        document.querySelectorAll('.cla-help-banner').forEach(function (banner) {
            banner.remove();
        });

        const match = ROUTE_HELP.find(function (entry) {
            return entry.match.test(path);
        });
        if (!match) {
            return;
        }

        const contentArea = document.querySelector('.content-area, router-outlet + *, vdr-app-shell .content-container');
        if (!contentArea) {
            return;
        }

        const banner = document.createElement('div');
        banner.className = 'cla-help-banner';
        banner.innerHTML = '<div>' + match.text + '</div>';
        if (contentArea.firstChild) {
            contentArea.insertBefore(banner, contentArea.firstChild);
        } else {
            contentArea.appendChild(banner);
        }
    }

    function runAll() {
        try {
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

    function start() {
        runAll();
        bindTooltipEvents();

        const observer = new MutationObserver(function () {
            runAll();
        });
        observer.observe(document.body, { childList: true, subtree: true });

        const pushState = history.pushState;
        history.pushState = function () {
            const result = pushState.apply(this, arguments);
            setTimeout(runAll, 50);
            return result;
        };

        window.addEventListener('popstate', function () {
            setTimeout(runAll, 50);
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', start);
    } else {
        start();
    }
})();
