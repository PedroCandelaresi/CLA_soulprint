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

    /**
     * Mapa ícono Clarity → explicación en español.
     * Son los íconos más comunes del admin. Se aplica a cualquier
     * cds-icon/clr-icon que tenga el `shape` correspondiente.
     */
    const ICON_TIPS = {
        plus: 'Crear nuevo',
        'plus-circle': 'Agregar',
        check: 'Confirmar',
        times: 'Cancelar / cerrar',
        'times-circle': 'Eliminar',
        trash: 'Eliminar definitivamente',
        pencil: 'Editar',
        'floppy': 'Guardar cambios',
        save: 'Guardar cambios',
        'cog': 'Configuración',
        cog: 'Configuración',
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
        'export': 'Exportar',
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
        'truck': 'Envío',
        'credit-card': 'Pago',
        'coin-bag': 'Cobros',
        'dollar-bill': 'Precios',
        image: 'Imagen / asset',
        'picture': 'Asset',
        file: 'Archivo',
        'file-group': 'Archivos',
        envelope: 'Email',
        globe: 'Idioma / región',
        language: 'Idioma',
        calendar: 'Fecha',
        clock: 'Horario',
        lock: 'Bloqueado / privado',
        unlock: 'Desbloqueado / público',
        cog: 'Configuración',
        'block-folder': 'Categoría',
        'two-way-arrows': 'Sincronizar',
        'play': 'Ejecutar',
        pause: 'Pausar',
        stop: 'Detener',
        sync: 'Sincronizar',
        logout: 'Cerrar sesión',
    };

    /**
     * Explicaciones por ruta. Cuando detectamos que la URL cambió, inyectamos
     * un banner arriba del contenido con una explicación breve y amigable.
     */
    const ROUTE_HELP = [
        { match: /^\/admin\/catalog\/products(?:\/|$)/, text: '<strong>Productos.</strong> Cada fila es un producto de la tienda. Usá el botón verde "Crear nuevo producto" para agregar uno. Hacé click sobre la fila para editarlo.' },
        { match: /^\/admin\/catalog\/facets/, text: '<strong>Facetas.</strong> Son las categorías de filtros que aparecen en la tienda (ej: color, talle, material). Cada faceta tiene valores que se asignan a los productos.' },
        { match: /^\/admin\/catalog\/collections/, text: '<strong>Colecciones.</strong> Agrupan productos para mostrarlos juntos en la tienda (ej: "Novedades", "Oferta"). Se actualizan solas según los filtros que les pongas.' },
        { match: /^\/admin\/catalog\/assets/, text: '<strong>Biblioteca de imágenes.</strong> Todas las fotos y archivos subidos a la tienda. Desde acá podés subir en lote y reutilizar entre productos.' },
        { match: /^\/admin\/orders(?:\/|$)/, text: '<strong>Pedidos.</strong> Cada fila es una compra hecha por un cliente. Hacé click para ver el detalle, marcar como pagado, despachar o cancelar.' },
        { match: /^\/admin\/customers(?:\/|$)/, text: '<strong>Clientes.</strong> Las cuentas de usuarios registrados en la tienda. Podés ver su historial de pedidos y direcciones.' },
        { match: /^\/admin\/marketing\/promotions/, text: '<strong>Promociones.</strong> Definí descuentos automáticos o cupones. Primero elegís las condiciones (cuándo aplica) y después la acción (qué descuento).' },
        { match: /^\/admin\/settings\/channels/, text: '<strong>Canales de venta.</strong> Cada canal es una "vidriera" diferente. Si sólo tenés una tienda, alcanza con el canal por defecto.' },
        { match: /^\/admin\/settings\/shipping-methods/, text: '<strong>Métodos de envío.</strong> Acá configurás cómo se calcula el costo del envío (fijo, por peso, gratis arriba de X, etc.).' },
        { match: /^\/admin\/settings\/payment-methods/, text: '<strong>Medios de pago.</strong> Habilitá Mercado Pago, transferencia u otros. Cada uno tiene su configuración (tokens, reglas).' },
        { match: /^\/admin\/settings\/tax/, text: '<strong>Impuestos.</strong> Cargá las tasas (IVA, etc.) y las zonas donde aplican. Esto se aplica automáticamente al checkout.' },
        { match: /^\/admin\/settings\/countries/, text: '<strong>Países.</strong> Marcá qué países están habilitados para envío y facturación.' },
        { match: /^\/admin\/settings\/administrators/, text: '<strong>Administradores.</strong> Usuarios que pueden entrar a este panel. Dales roles según qué queres que puedan tocar.' },
        { match: /^\/admin\/settings\/roles/, text: '<strong>Roles.</strong> Definen qué puede hacer cada administrador (ver productos, editar pedidos, etc.).' },
        { match: /^\/admin\/extensions\/badges/, text: '<strong>Badges.</strong> Etiquetas visuales que se superponen a las fotos de los productos (ej: "NUEVO", "-30%").' },
        { match: /^\/admin\/dashboard|^\/admin\/?$/, text: '<strong>Bienvenido/a al panel CLA Soulprint.</strong> Desde acá manejás todo lo que pasa en la tienda. A la izquierda tenés el menú con todas las secciones.' },
    ];

    /** Cachea el último pathname para no re-inyectar cada mutation. */
    let lastPath = '';

    function applyIconTooltips(root) {
        const icons = (root || document).querySelectorAll('cds-icon[shape], clr-icon[shape]');
        icons.forEach(function (icon) {
            if (icon.hasAttribute('data-cla-tip')) {
                return;
            }
            const shape = icon.getAttribute('shape');
            const tip = ICON_TIPS[shape];
            if (!tip) {
                return;
            }
            // Aplicar el tooltip al botón/anchor contenedor si existe,
            // sino al ícono directamente.
            const host = icon.closest('button, a, [role="button"]') || icon;
            if (!host.hasAttribute('data-cla-tip')) {
                host.setAttribute('data-cla-tip', tip);
            }
        });
    }

    function injectHelpBanner() {
        const path = window.location.pathname;
        if (path === lastPath) {
            return;
        }
        lastPath = path;

        // Remover banners previos
        document.querySelectorAll('.cla-help-banner').forEach(function (b) {
            b.remove();
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
        // Insertar como primer hijo del area de contenido
        if (contentArea.firstChild) {
            contentArea.insertBefore(banner, contentArea.firstChild);
        } else {
            contentArea.appendChild(banner);
        }
    }

    function runAll() {
        try {
            applyIconTooltips(document);
            injectHelpBanner();
        } catch (e) {
            // nunca romper el admin si algo falla
            console.warn('[CLA] enhancements error:', e);
        }
    }

    function start() {
        runAll();
        const observer = new MutationObserver(function () {
            runAll();
        });
        observer.observe(document.body, { childList: true, subtree: true });

        // Detectar cambios de ruta hash/history
        const push = history.pushState;
        history.pushState = function () {
            const ret = push.apply(this, arguments);
            setTimeout(runAll, 50);
            return ret;
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
