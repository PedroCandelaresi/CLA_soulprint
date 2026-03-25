# Auditoría técnica del Admin UI de Vendure y moneda ARS

Fecha: 2026-03-25

## 1. Resumen ejecutivo

Esta auditoría revisó en profundidad la implementación actual del Admin UI de Vendure, la capa de estilos custom, la configuración de canales/moneda y los datos persistidos en la base local del proyecto.

Conclusión ejecutiva:

- El problema visual de la sidebar no proviene de un único detalle aislado. La causa más probable es una combinación de diseño base demasiado pesado, jerarquía visual débil y una estrategia de overrides globales excesivamente agresiva. El resultado es una navegación que dejó de verse "default Vendure", pero todavía no alcanza una terminación profesional consistente.
- El problema de moneda no es un hardcode simple en frontend. El proyecto está en un estado de migración incompleta hacia ARS: el canal por defecto hoy ya está configurado en ARS, pero todavía conserva `USD` como moneda disponible y existen registros históricos en `product_variant_price` con `USD`.
- En el entorno local auditado, los productos activos y el canal activo responden en `ARS` tanto en Shop API como en Admin API. Por lo tanto, el estado real no es "todo sigue en USD", sino "la base y la configuración todavía no quedaron limpiamente cerradas en ARS".
- Corregir la UI visual tiene riesgo bajo a medio. Corregir moneda tiene riesgo medio por impacto potencial en pricing histórico, channels y datos si existieran pedidos o catálogos productivos con mezcla de monedas.

Estado general:

| Tema | Estado actual | Severidad | Riesgo de corrección |
| --- | --- | --- | --- |
| Sidebar / navegación | Mejorada respecto al default, pero todavía visualmente pesada, inconsistente y con señales de override improvisado | Alta | Bajo-Medio |
| Moneda / ARS | Configuración y datos parcialmente migrados; todavía hay residuos de USD | Alta | Medio |

Nota metodológica:

- La auditoría visual se apoya en el código real de estilos, la estructura de integración del Admin UI y la descripción de la captura provista en el pedido. No se recibió un archivo de imagen navegable dentro del workspace para una inspección pixel-perfect.
- La auditoría de moneda se apoya en código fuente, comportamiento de Vendure core instalado en `node_modules`, consultas a la base MySQL local y consultas GraphQL al backend activo.

## 2. Diagnóstico del problema visual del Admin UI

### 2.1 Arquitectura actual de customización del Admin

El proyecto no está customizando el Admin UI mediante componentes Angular específicos del shell, sino mediante inyección de assets estáticos sobre el build generado de Vendure:

- `apps/backend/src/admin-ui/config.ts:18-45` inyecta `cla-theme.css` y `cla-login-enhancements.js` dentro de `index.html`.
- `apps/backend/src/admin-ui/config.ts:96-120` copia `apps/backend/admin-ui-src/cla-theme.scss` y `apps/backend/admin-ui-src/cla-login-enhancements.js` al build final del Admin.
- `apps/backend/src/admin-ui/admin-ui-options.ts:6-17` define branding básico (`brand: 'CLA Soulprint'`) y locale por defecto del Admin.

Implicación técnica:

- La capa visual depende casi por completo de un único archivo global: `apps/backend/admin-ui-src/cla-theme.scss`.
- Ese archivo tiene 1672 líneas y 301 usos de `!important`, señal clara de una estrategia de override agresiva, difícil de mantener y propensa a conflictos de cascada.

### 2.2 Diagnóstico específico de la sidebar

#### Hallazgo 1: el color base sigue siendo demasiado pesado

Evidencia:

- `apps/backend/admin-ui-src/cla-theme.scss:586-590`

```scss
.left-nav {
  background: linear-gradient(180deg, #184631 0%, #133427 100%) !important;
  border-right: 1px solid rgba(255, 255, 255, 0.1) !important;
  box-shadow: 10px 0 28px rgba(10, 24, 19, 0.22) !important;
}
```

Diagnóstico:

- La base visual del sidebar sigue siendo un verde muy oscuro con degradado vertical y sombra lateral marcada.
- Esto le da demasiado peso visual al bloque de navegación y hace que compita con el contenido principal en lugar de servirle de soporte.

Impacto:

- Apariencia más cercana a un panel "temático" que a un sistema administrativo premium.
- La sidebar domina la pantalla y vuelve más difícil que el contenido se perciba como protagonista.

Corrección recomendada en segunda fase:

- Reemplazar el degradado por un color sólido sobrio.
- Bajar contraste estructural del fondo y reservar el verde para estados activos o acentos.

#### Hallazgo 2: el item activo usa doble contenedor y pierde fineza

Evidencia:

- `apps/backend/admin-ui-src/cla-theme.scss:628-631`
- `apps/backend/admin-ui-src/cla-theme.scss:699-703`

```scss
.main-nav .nav-group.active {
  background: rgba(255, 255, 255, 0.04) !important;
  border-color: rgba(255, 255, 255, 0.12) !important;
}

.main-nav .nav-link.active a {
  background: rgba(255, 255, 255, 0.14) !important;
  color: #ffffff !important;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.08) !important;
}
```

Diagnóstico:

- El grupo activo ya tiene un fondo propio.
- Dentro de ese grupo, el link activo recibe un segundo fondo, otro borde interno y otro tratamiento visual.

Impacto:

- El activo se ve "encerrado" dos veces.
- La tarjeta activa de "Productos" puede sentirse hinchada, poco limpia y más cercana a un parche visual que a una jerarquía refinada.

Corrección recomendada:

- Usar una sola superficie activa.
- Elegir entre resaltar el grupo o resaltar el item, pero no ambos al mismo tiempo con cajas independientes.

#### Hallazgo 3: contraste insuficiente en estados inactivos y secundarios

Evidencia:

- `apps/backend/admin-ui-src/cla-theme.scss:638-644`
- `apps/backend/admin-ui-src/cla-theme.scss:662`
- `apps/backend/admin-ui-src/cla-theme.scss:671-676`

```scss
.main-nav .nav-section-title {
  color: rgba(255, 255, 255, 0.62) !important;
}

.main-nav .nav-link a {
  color: rgba(255, 255, 255, 0.84) !important;
}

.main-nav .nav-link clr-icon,
.main-nav .nav-link .nav-icon {
  color: rgba(255, 255, 255, 0.68) !important;
}
```

Diagnóstico:

- Títulos de sección, íconos y estados inactivos dependen de opacidades de blanco sobre un fondo muy oscuro.
- El texto principal no es ilegible, pero la paleta por transparencia genera variaciones poco robustas y menor consistencia entre estados.

Impacto:

- Los grupos del menú pierden jerarquía.
- Las diferencias entre navegación primaria, secundaria e inactiva no terminan de verse "decididas".

Corrección recomendada:

- Definir tokens explícitos para `nav-text`, `nav-muted`, `nav-active`, `nav-border`.
- Evitar resolver contraste con cadenas de `rgba(255,255,255, x)` sobre fondos complejos.

#### Hallazgo 4: la sidebar sigue siendo demasiado dominante en ancho y presencia

Evidencia:

- `apps/backend/admin-ui-src/cla-theme.scss:186-195`

```scss
:root {
  --left-nav-width: 272px;
}

@media (min-width: 1280px) {
  :root {
    --left-nav-width: 288px;
  }
}
```

Diagnóstico:

- El sidebar ocupa entre 272px y 288px en desktop.
- Para el nivel de información mostrado en el menú actual, ese ancho es generoso y refuerza la percepción de panel pesado.

Impacto:

- La navegación roba demasiado espacio al contenido.
- Acentúa el problema de "bloque oscuro dominante".

Corrección recomendada:

- Reducir ancho.
- Separar mejor la columna de navegación del contenido mediante sobriedad, no mediante masa visual.

#### Hallazgo 5: la separación entre navegación primaria y secundaria es débil

Evidencia:

- `apps/backend/admin-ui-src/cla-theme.scss:605-618`

```scss
.settings-nav-container {
  margin-top: auto !important;
  padding-top: 18px !important;
}

.settings-nav-container hr {
  border-top: 1px solid rgba(255, 255, 255, 0.12) !important;
}
```

Diagnóstico:

- La división entre navegación principal y secundaria depende casi exclusivamente de un `hr`.
- No hay suficiente tratamiento de bloques, títulos o respiración para distinguir claramente zonas como catálogo, ventas, clientes, marketing, ajustes y sistema.

Impacto:

- El menú se percibe como una columna larga de items antes que como una arquitectura de navegación bien ordenada.

Corrección recomendada:

- Dar estructura explícita a grupos primarios y secundarios.
- Trabajar separación por spacing, títulos de grupo y consistencia de sangrías antes que por líneas decorativas.

#### Hallazgo 6: la iconografía sigue mezclando herencia default de Vendure/Clarity con custom styles

Evidencia:

- `apps/backend/admin-ui-src/cla-theme.scss:671`, `688`, `705`, `799-800`, `1262-1264`, `1419` siguen estilizando `clr-icon`.
- No se encontraron integraciones de sets modernos de iconos para el menú (`Heroicons`, `Tabler`, etc.) en el código del Admin custom.

Diagnóstico:

- La estética fue modernizada a nivel de superficies y espaciado, pero la iconografía sigue dependiendo del sistema visual heredado de Vendure/Clarity.

Impacto:

- El lenguaje visual del menú queda partido: fondo y componentes intentan verse modernos, mientras que los íconos siguen respondiendo al sistema base.

Corrección recomendada:

- Unificar iconografía o, si se mantiene Clarity, diseñar el resto del menú para convivir con ese set sin sobremaquillar el contenedor.

#### Hallazgo 7: existe una mezcla real entre custom theme y estilos legacy/default

Evidencia:

- `apps/backend/admin-ui-src/cla-theme.scss` contiene reglas globales extensas y altamente específicas.
- Solo para tabs generales no hay un sistema de overrides consistente; la mayoría de la personalización está centrada en contenedores, tablas y sidebar.
- La configuración actual se monta como una hoja global copiada al Admin, no como una capa de componentes propios.

Diagnóstico:

- El Admin no fue reconstruido con una gramática visual nueva desde componentes; fue reestilado por cascada sobre estructuras existentes.
- Eso mejora rápido la apariencia, pero deja zonas visuales "a mitad de camino" entre el default y el tema custom.

Impacto:

- Terminación inconsistente.
- Mayor probabilidad de que cada pantalla del Admin responda distinto según la especificidad heredada.

Corrección recomendada:

- Reducir overrides genéricos.
- Organizar el theme por áreas: shell, nav, tables, forms, feedback, auth.

### 2.3 Evaluación visual por componente

| Elemento | Evidencia principal | Estado actual | Diagnóstico |
| --- | --- | --- | --- |
| Sidebar | `cla-theme.scss:586-807` | Parcialmente modernizada | Base pesada, jerarquía débil, doble contenedor activo |
| Item activo | `cla-theme.scss:699-703` | Llamativo pero poco fino | Sobretratado, demasiado "card-like" |
| Items inactivos | `cla-theme.scss:662-676` | Legibles pero débiles | Contraste por opacidad, no por sistema estable |
| Secciones del menú | `cla-theme.scss:638-644`, `605-618` | Insuficientes | Separación visual poco clara |
| Breadcrumb superior | `cla-theme.scss:471-499` | Correcto | Algo sobrediseñado en formato pill |
| Título de página | `cla-theme.scss:391-417` | Bueno | No es hoy el principal problema |
| Tabs | ausencia de override global claro; solo presets en `cla-theme.scss:1140-1170` | Inconsistente | No hay una estrategia visual homogénea para tabs |
| Botón primario | `cla-theme.scss:858-874` | Fuerte pero no sobrio | Gradiente y sombra más agresivos de lo ideal |
| Tabla | `cla-theme.scss:1122-1399` | Mejorada | Buen avance, aunque todavía muy "card" |
| Empty state | `cla-theme.scss:1407-1472`, `cla-login-enhancements.js:318-344` | Mejorado | Correcto; más sólido que el menú |
| Top right user area | `cla-theme.scss:501-519` | Limpio | Funciona, pero comparte el exceso de pill framing |

## 3. Diagnóstico del problema de moneda (USD vs ARS)

### 3.1 Estado real actual

El problema no es un simple hardcode de frontend a USD.

Estado verificado en el entorno local:

- El `defaultChannel` hoy está en `ARS`.
- `availableCurrencyCodes` del canal activo todavía incluye `USD`.
- Los productos activos consultados por API responden en `ARS`.
- Existe al menos un registro histórico en `product_variant_price` con `USD`.
- Ese registro `USD` corresponde en esta base local a una variante soft-deleted, no a una variante activa.

Conclusión:

- El sistema está en un estado inconsistente o incompletamente migrado a ARS.
- No se encontró evidencia de que la UI actual esté forzando `USD` desde el código del storefront o del Admin custom.

### 3.2 Evidencia en configuración del proyecto

#### Hallazgo 1: ARS se fuerza por bootstrap posterior, no desde el default inicial de Vendure

Evidencia:

- `apps/backend/src/bootstrap/argentina-defaults.ts:85-94`

```ts
await channelService.update(ctx, {
  id: defaultChannel.id,
  defaultLanguageCode: LanguageCode.es,
  currencyCode: CurrencyCode.ARS,
  availableCurrencyCodes: [CurrencyCode.ARS],
  pricesIncludeTax: true,
  defaultTaxZoneId: argentinaZone.id,
  defaultShippingZoneId: argentinaZone.id,
});
```

- `apps/backend/src/bootstrap/index.ts:9-27` ejecuta `ensureArgentinaDefaults(app)` al iniciar.
- `apps/backend/src/seed/populate.ts:20` también ejecuta `ensureArgentinaDefaults(app)` durante seed.

Diagnóstico:

- El proyecto intenta corregir el canal por defecto después de que Vendure ya inicializó su estado base.
- Esto deja margen a inconsistencias históricas si la base se creó antes bajo defaults de Vendure.

#### Hallazgo 2: Vendure crea el canal default en USD por defecto

Evidencia en core instalado:

- `apps/backend/node_modules/@vendure/core/dist/service/services/channel.service.js:394-401`

```js
const defaultChannel = new channel_entity_1.Channel({
  code: types_1.DEFAULT_CHANNEL_CODE,
  token: '',
  pricesIncludeTax: false,
  defaultCurrencyCode: generated_types_1.CurrencyCode.USD,
  availableCurrencyCodes: [generated_types_1.CurrencyCode.USD],
});
```

Diagnóstico:

- Si la base fue inicializada alguna vez sin una corrección suficientemente temprana, el estado original del canal nació en USD.

Impacto:

- Los datos iniciales y algunos precios pueden haber quedado creados bajo la moneda default equivocada.

#### Hallazgo 3: la actualización del channel no garantiza limpiar completamente monedas históricas

Evidencia en core instalado:

- `apps/backend/node_modules/@vendure/core/dist/service/services/channel.service.js:295-300`
- `apps/backend/node_modules/@vendure/core/dist/service/services/channel.service.js:337-340`

Comportamiento relevante:

- Cuando se actualiza `currencyCode` o `defaultCurrencyCode`, Vendure agrega la moneda default al conjunto de `availableCurrencyCodes`.
- Cuando recibe `availableCurrencyCodes`, valida que la moneda default esté incluida, pero no hay una limpieza explícita de monedas residuales históricas en el flujo observado.

Diagnóstico:

- La estrategia actual de "forzar ARS en bootstrap" no asegura, por sí sola, una transición limpia a `ARS`-only.

### 3.3 Evidencia en base de datos local

#### Channel actual

Consulta ejecutada:

```sql
SELECT id, code, token, defaultLanguageCode, availableLanguageCodes,
       defaultCurrencyCode, availableCurrencyCodes, pricesIncludeTax,
       defaultTaxZoneId, defaultShippingZoneId
FROM channel;
```

Resultado relevante:

| Campo | Valor |
| --- | --- |
| `defaultLanguageCode` | `es` |
| `availableLanguageCodes` | `es,en` |
| `defaultCurrencyCode` | `ARS` |
| `availableCurrencyCodes` | `ARS,USD` |
| `pricesIncludeTax` | `1` |

Diagnóstico:

- El canal ya opera con `ARS` como default.
- La persistencia todavía expone un set mixto de monedas disponibles.

#### Prices por currency en `product_variant_price`

Consulta ejecutada:

```sql
SELECT currencyCode, COUNT(*) AS qty, MIN(price) AS min_price, MAX(price) AS max_price
FROM product_variant_price
GROUP BY currencyCode;
```

Resultado relevante:

| currencyCode | qty | min_price | max_price |
| --- | --- | --- | --- |
| `ARS` | 6 | 15000 | 4500000 |
| `USD` | 1 | 5000000 | 5000000 |

Detalle del registro USD:

```sql
SELECT pvp.variantId, pvp.currencyCode, pvp.price, pvp.channelId, pv.deletedAt
FROM product_variant_price pvp
JOIN product_variant pv ON pv.id = pvp.variantId
WHERE pvp.currencyCode = 'USD';
```

Resultado relevante:

| variantId | currencyCode | price | channelId | deletedAt |
| --- | --- | --- | --- | --- |
| 4 | `USD` | 5000000 | 1 | `2025-12-24 19:12:34` |

Diagnóstico:

- Hay residuos de USD en datos.
- En esta base local no afectan a variantes activas, pero sí prueban que la migración de moneda no quedó cerrada.

#### Orders

Consulta ejecutada:

```sql
SELECT COUNT(*) AS total_orders FROM `order`;
```

Resultado:

- `0`

Diagnóstico:

- En esta base local el riesgo de migración de moneda es menor porque no hay órdenes persistidas.
- Este dato no puede extrapolarse automáticamente a otros entornos.

### 3.4 Evidencia en APIs activas

#### Admin API

Consulta ejecutada sobre `http://localhost:4002/admin-api`:

```graphql
query {
  channels {
    items {
      code
      defaultCurrencyCode
      availableCurrencyCodes
      defaultLanguageCode
      availableLanguageCodes
      pricesIncludeTax
    }
  }
}
```

Resultado relevante:

- `defaultCurrencyCode: ARS`
- `availableCurrencyCodes: [ARS, USD]`

#### Shop API

Consulta ejecutada sobre `http://localhost:4002/shop-api`:

```graphql
query {
  activeChannel {
    code
    defaultCurrencyCode
    availableCurrencyCodes
    defaultLanguageCode
    pricesIncludeTax
  }
}
```

Resultado relevante:

- `defaultCurrencyCode: ARS`
- `availableCurrencyCodes: [ARS, USD]`
- `pricesIncludeTax: true`

#### Productos activos

Consultas ejecutadas sobre Shop/Admin APIs devolvieron productos y variantes activas con:

- `currencyCode: ARS`

Diagnóstico:

- Hoy la visualización activa del catálogo no depende de USD para funcionar.
- El problema remanente es de consistencia estructural entre config, metadata del channel y datos históricos.

### 3.5 Revisión de frontend / formateo

#### Storefront

Evidencia:

- `apps/storefront/src/components/products/ProductCard.tsx:14-21`
- `apps/storefront/src/components/products/ProductDetail.tsx:16-22`
- `apps/storefront/src/components/cart/CartPageContent.tsx:25-29`

Todos estos componentes usan:

```ts
new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency,
})
```

Diagnóstico:

- El storefront ya formatea moneda con `es-AR`.
- No se encontró un hardcode activo a `USD` ni `en-US` en estas rutas críticas.

Hallazgo adicional:

- `apps/storefront/src/lib/vendure/products.ts:177` usa un fallback `currencyCode: 'ARS'` al mapear resultados de búsqueda.

Impacto:

- Ese fallback no genera el problema USD.
- Sí puede ocultar inconsistencias del backend durante flujos alternativos de búsqueda.

#### Admin custom

No se encontró en `apps/backend/admin-ui-src` evidencia de `USD`, `en-US`, `Intl.NumberFormat('en-US')` ni pipes custom que fuercen dólar.

Conclusión:

- No hay evidencia de que el Admin custom esté imponiendo USD desde su capa de personalización.

## 4. Hallazgos concretos con evidencia

### 4.1 Hallazgos visuales

| Hallazgo | Evidencia | Qué hace hoy | Impacto |
| --- | --- | --- | --- |
| Sidebar con gradiente oscuro y sombra lateral marcada | `cla-theme.scss:586-590` | Vuelve al nav demasiado protagónico | Penaliza sobriedad y foco de contenido |
| Doble contenedor activo | `cla-theme.scss:628-631`, `699-703` | Grupo y link activo reciben superficies distintas | Item activo se ve pesado e improvisado |
| Contraste por opacidades, no por tokens estables | `cla-theme.scss:638-676` | Texto e íconos dependen de `rgba` sobre fondo oscuro | Menor claridad jerárquica |
| Sidebar demasiado ancha | `cla-theme.scss:186-195` | 272px a 288px | Exceso de masa visual |
| Separación primaria/secundaria débil | `cla-theme.scss:605-618` | Solo `hr` y margen superior | Arquitectura de navegación poco clara |
| Estrategia de overrides agresiva | `cla-theme.scss` completo, 301 `!important` | Fuerza casi todo por cascada | Mantenibilidad baja, riesgo de incoherencia |
| Tabs sin sistema visual global claro | solo presets en `cla-theme.scss:1140-1170` | Algunas tabs heredan default | Terminación desigual entre pantallas |

### 4.2 Hallazgos de moneda

| Hallazgo | Evidencia | Qué hace hoy | Impacto |
| --- | --- | --- | --- |
| Vendure default channel nace en USD | `channel.service.js:394-401` en core | La base original puede haberse creado en USD | Origen probable del problema |
| ARS se aplica por bootstrap posterior | `argentina-defaults.ts:85-94`, `bootstrap/index.ts:9-27`, `seed/populate.ts:20` | Corrige después del arranque | No garantiza limpieza histórica |
| Channel persiste `availableCurrencyCodes = ARS,USD` | consulta SQL + GraphQL | El sistema expone mezcla de monedas disponibles | Riesgo de comportamiento ambiguo |
| Existe un precio histórico en USD | consulta SQL a `product_variant_price` | Hay residuos de datos antiguos | Prueba de migración incompleta |
| Script operativo con semántica ambigua de precio | `fix_prices.js:116-120` | Actualiza precios sin moneda explícita y comenta `$150.00` | Puede reforzar inconsistencias históricas |
| Storefront ya formatea en `es-AR` | `ProductCard.tsx`, `ProductDetail.tsx`, `CartPageContent.tsx` | UI de tienda lista para ARS | Descarta hardcode principal a USD en frontend |

## 5. Causas raíz probables

### 5.1 Sidebar

Prioridad de causas probables:

1. **Sistema visual de navegación mal resuelto desde su base**.
   La sidebar sigue construida sobre un bloque oscuro con gradiente, overlays translúcidos y mucha masa visual.
2. **Sobrecorrección por CSS global**.
   El theme intenta modernizar Vendure desde un archivo monolítico con muchos `!important`, lo que genera una UI visualmente mejorada pero todavía tensa e inconsistente.
3. **Jerarquía de navegación insuficiente**.
   Las diferencias entre grupo, item, activo e inactivo no están resueltas con una gramática simple y profesional.
4. **Mezcla de lenguaje visual nuevo con elementos legacy**.
   Shell moderno parcial + iconografía/estructuras heredadas de Vendure/Clarity.

Respuesta directa:

- ¿Por qué sigue viéndose mal?  
  Porque no es solo un problema de color: el sidebar actual combina una base demasiado pesada, una jerarquía débil y una estrategia de overrides que genera fricción visual.
- ¿Es color, estructura, CSS conflictivo o todo junto?  
  Es principalmente una combinación de color base, estructura de estados activos y CSS conflictivo/global.
- ¿Qué 3 a 5 cambios tendrían mayor impacto real?  
  1. Eliminar el gradiente y adoptar un fondo sólido sobrio.  
  2. Simplificar el estado activo a una sola superficie.  
  3. Reducir ancho y peso visual del nav.  
  4. Reestructurar grupos/secciones con mejor jerarquía y separación.  
  5. Bajar dependencia de `!important` y de overlays translúcidos.

### 5.2 Moneda

Prioridad de causas probables:

1. **Inicialización original del canal por defecto en USD por comportamiento nativo de Vendure**.
2. **Corrección posterior a ARS vía bootstrap, no suficientemente temprana para evitar residuos históricos**.
3. **Persistencia de monedas disponibles mixtas (`ARS,USD`) en el channel**.
4. **Residuos de precios históricos en USD en `product_variant_price`**.
5. **Scripts operativos no totalmente explícitos respecto de moneda**.

Respuesta directa:

- ¿Por qué sigue en USD?  
  No todo sigue en USD. El problema real es que la migración a ARS quedó incompleta: el canal ya está en ARS, pero conserva USD como moneda disponible y arrastra datos históricos en USD.
- ¿Es solo visual o también de datos/configuración?  
  Es de configuración y datos; no se detectó como un problema principal de formateo visual del frontend.
- ¿Qué habría que tocar exactamente para migrar correctamente a ARS?  
  Channel/defaults, limpieza de `availableCurrencyCodes`, revisión de precios históricos por currency, scripts de seed/bootstrap y cualquier script manual que actualice precios sin controlar moneda.
- ¿Hay riesgo de romper datos, orders o pricing existentes?  
  Sí, especialmente si en otros entornos existen orders o catálogos vivos vinculados a USD. En la base local auditada el riesgo es menor porque no hay órdenes.

## 6. Plan de corrección recomendado

Esta sección propone una segunda fase segura, pero no ejecuta cambios.

### Fase 1. Visual / UI

Objetivo:

- Llevar el Admin a una estética más sobria, más consistente y menos "theme improvisado".

Cambios recomendados:

1. Redefinir la sidebar sobre fondo sólido, sin gradiente.
2. Reducir el ancho del nav y su sombra lateral.
3. Rehacer la jerarquía del menú con:
   - títulos de sección más claros
   - espaciado vertical consistente
   - menor cantidad de cajas/bordes decorativos
4. Reemplazar el activo actual por un estado fino:
   - una sola superficie
   - borde suave o acento lateral
   - mejor contraste tipográfico
5. Unificar color tokens para navegación:
   - `nav-bg`
   - `nav-text`
   - `nav-muted`
   - `nav-active-bg`
   - `nav-active-text`
   - `nav-border`
6. Ajustar botones primarios para que dejen de verse como CTA de marketing:
   - sin gradiente
   - sombra menor
   - contraste más sobrio
7. Revisar tabs globales y componentes que aún heredan visual default.
8. Particionar `cla-theme.scss` por áreas o al menos por bloques internos estrictos para bajar conflicto de cascada.

### Fase 2. Moneda / ARS

Objetivo:

- Dejar el proyecto en un estado inequívoco y limpio de operación en pesos argentinos.

Cambios recomendados:

1. Auditar y fijar el channel por defecto a `ARS` de manera idempotente y verificable.
2. Limpiar `availableCurrencyCodes` para evitar que quede `USD` expuesto si el negocio no va a operar multimoneda.
3. Ejecutar una revisión/migración controlada de `product_variant_price`:
   - identificar filas `USD`
   - distinguir activas vs soft-deleted
   - decidir conversión, eliminación o archivo según cada caso
4. Revisar scripts de bootstrap/seed para que la moneda quede definida de forma robusta desde la inicialización.
5. Revisar o retirar scripts manuales como `fix_prices.js` si no garantizan semántica explícita de moneda.
6. Confirmar locale y formato:
   - mantener `es-AR` en storefront
   - revisar si conviene elevar configuración de locale a más puntos del stack
7. Reindexar / validar catálogos y probar flujos completos:
   - Admin
   - Shop API
   - storefront

## 7. Riesgos de tocar configuración/datos

### 7.1 Riesgos visuales

Riesgo estimado: **bajo a medio**

Riesgos concretos:

- romper layout en pantallas específicas del Admin por overrides demasiado globales
- afectar mobile nav o estados colapsados
- introducir regresiones visuales en componentes heredados de Vendure que hoy dependen de la misma cascada

Mitigación:

- intervenir primero shell/navigation/tokens
- validar páginas clave: listado de productos, detalle de producto, órdenes, clientes, configuración

### 7.2 Riesgos de moneda

Riesgo estimado: **medio**

Riesgos concretos:

- dejar channels con metadata incoherente
- generar divergencias entre precios históricos y precios activos
- romper pricing si se convierten o reemplazan filas sin una regla explícita
- afectar órdenes existentes en entornos donde sí haya pedidos
- encubrir errores si se corrige solo visualización y no datos/configuración

Mitigación:

- snapshot previo de base
- inventario exacto de filas por currency y por channel
- separar claramente:
  - limpieza de metadata de channel
  - saneamiento de `product_variant_price`
  - validación funcional posterior

## 8. Lista exacta de archivos a modificar en una segunda fase

Archivos probables para Fase 1. Visual:

- `apps/backend/admin-ui-src/cla-theme.scss`
- `apps/backend/admin-ui-src/cla-login-enhancements.js`
- `apps/backend/src/admin-ui/config.ts`  
  Solo si hace falta reorganizar cómo se inyectan assets del Admin.
- `apps/backend/src/admin-ui/admin-ui-options.ts`  
  Solo si se decide ajustar branding/locale visible del shell.

Archivos probables para Fase 2. Moneda:

- `apps/backend/src/bootstrap/argentina-defaults.ts`
- `apps/backend/src/bootstrap/index.ts`
- `apps/backend/src/config/vendure-config.ts`
- `apps/backend/src/seed/populate.ts`
- `fix_prices.js`
- `apps/storefront/src/lib/vendure/products.ts`  
  Solo para revisar el fallback `currencyCode: 'ARS'` una vez saneado backend.

Archivos nuevos recomendables:

- un script o migración de saneamiento de moneda para channels y `product_variant_price`
- un documento operativo con procedimiento de migración/rollback por entorno

Archivos auditados como evidencia, pero no recomendados para editar directamente:

- `apps/backend/node_modules/@vendure/core/dist/service/services/channel.service.js`
- `apps/backend/node_modules/@vendure/core/dist/config/default-config.js`

## Checklist final

- [x] Revisada la integración actual del Admin UI
- [x] Revisado el theme global y los overrides relevantes
- [x] Auditada la sidebar con foco en jerarquía, contraste, spacing y active state
- [x] Revisada la configuración de channel/moneda/language
- [x] Auditadas evidencias en base de datos local
- [x] Auditadas respuestas reales de Admin API y Shop API
- [x] Revisado el storefront para detectar hardcodes de moneda/locale
- [x] Identificadas causas raíz probables
- [x] Definido plan de corrección en dos fases
- [x] Delimitados riesgos y archivos a tocar en una segunda etapa

## Conclusión accionable

El Admin UI actual no falla porque "todavía parece Vendure" sino porque la capa de personalización quedó resuelta por superposición de estilos globales sobre una base visual demasiado pesada. El mayor problema está concentrado en la sidebar: color, jerarquía y active state.

La moneda no está incorrecta por un formateador aislado a USD. El proyecto ya empuja ARS en varios puntos, pero la migración quedó a medio cerrar: Vendure nació con USD como default, luego se corrigió por bootstrap, y todavía sobreviven `USD` en `availableCurrencyCodes` y en datos históricos.

Recomendación inmediata:

1. Aprobar una segunda fase separada en dos bloques: `UI` y `moneda`.
2. En `UI`, intervenir primero el shell y la navegación.
3. En `moneda`, ejecutar antes un saneamiento controlado de channel + precios históricos, no un cambio cosmético de formato.
