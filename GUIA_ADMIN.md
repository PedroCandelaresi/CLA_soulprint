# Guía de Administración: Vendure (Backend)

Esta guía explica los conceptos clave de Vendure para gestionar tu tienda, específicamente la diferencia entre **Colecciones** y **Facetas**, que suele ser confusa al principio.

## 1. Facetas (Facets) vs. Colecciones (Collections)

En Vendure, casi todo se organiza usando estos dos conceptos.

### 🔹 Facetas (Facets) = "Etiquetas" o "Atributos"
Piensa en las Facetas como **etiquetas** que le pegas a un producto. Sirven para filtrar y organizar, pero **no crean una página automática** en el menú por sí solas.

*   **Ejemplo**:
    *   Faceta: "Color"
    *   Valores: "Negro", "Blanco", "Azul".
    *   Uso: Le asignas al producto la faceta "Color: Azul".

*   **¿Para qué sirven?**:
    *   Para los **Filtros** de la barra lateral en la tienda ("Filtrar por Color", "Filtrar por Material").
    *   Para crear Colecciones Inteligentes (ver abajo).

### 🔹 Colecciones (Collections) = "Categorías del Menú"
Las Colecciones son lo que el cliente ve como **Categorías** en la tienda. Son las páginas donde se agrupan los productos.

*   **Tipos de Colecciones**:
    1.  **Manuales**: Creas la colección "Ofertas de Verano" y agregas los productos uno por uno manualmente.
    2.  **Dinámicas (Inteligentes)**: Aquí es donde brillan las Facetas.
        *   Creas la colección "Productos Azules".
        *   Le dices a Vendure: *"Mete aquí automáticamente todos los productos que tengan la Faceta 'Color: Azul'"*.
        *   **Ventaja**: Si mañana subes un producto nuevo y le pones la etiqueta "Azul", ¡aparece solo en la colección!

## 2. Flujo de Trabajo Recomendado

Para subir productos y que se vean en la tienda:

1.  **Crea tus Facetas (Una sola vez)**:
    *   Ve a *Catálogo > Facetas*.
    *   Crea una llamada "Categoría" (o "Tipo").
    *   Agrega valores: "Indumentaria", "Accesorios", "Hogar".

2.  **Crea tus Colecciones (Una sola vez)**:
    *   Ve a *Catálogo > Colecciones*.
    *   Crea una llamada "Accesorios".
    *   Configura el **Filtro**: "Product has Facet Value" -> Selecciona "Categoría: Accesorios".
    *   (Ahora esta colección se "llenará sola").

3.  **Sube tus Productos (Día a día)**:
    *   Ve a *Catálogo > Productos > Crear Nuevo*.
    *   Sube nombre, precio y **FOTOS**.
    *   En la sección de Facetas, selecciona "Categoría: Accesorios".
    *   ¡Listo! Al guardar, el producto aparecerá automáticamente en la colección "Accesorios" del frontend.

## 3. Solución de Problemas de Imágenes

Si las fotos se ven en el Admin pero no en la Tienda:
1.  Asegúrate de haber ejecutado `docker compose up -d --build` si hubo cambios de código.
2.  El sistema ahora usa una ruta interna segura. Si ves un icono de "Imagen Rota" o un placeholder neutro, significa que **el archivo físico falta en el servidor**.
3.  **Solución**: Vuelve a subir la imagen en el producto desde el Admin. El sistema nuevo la guardará en el lugar correcto (el volumen persistente) y no se volverá a borrar.
