import { listCollections, listProducts, listProductsByCollection } from '@/lib/vendure';
import type { CollectionItem } from '@/lib/vendure';
import type { Product } from '@/types/product';
import ProductosPageContent from './ProductosPageContent';

export const dynamic = 'force-dynamic';

export const metadata = {
    title: 'Tienda | CLA',
    description: 'Explora nuestra colección de joyería personalizada.',
};

export default async function ProductosPage({
    searchParams,
}: {
    searchParams: { [key: string]: string | string[] | undefined };
}) {
    const collectionSlug = typeof searchParams.collection === 'string' ? searchParams.collection : undefined;

    // Fetch Collections
    let collections: CollectionItem[] = [];
    try {
        collections = await listCollections();
    } catch (error) {
        console.error("Error fetching collections:", error);
    }

    // Fetch Products
    let products: Product[] = [];
    try {
        if (collectionSlug) {
            products = await listProductsByCollection(collectionSlug, { take: 24, skip: 0 });
        } else {
            products = await listProducts({ take: 24, skip: 0 });
        }

    } catch (error) {
        console.error("Error fetching products:", error);
    }

    return (
        <ProductosPageContent
            collections={collections}
            products={products}
            collectionSlug={collectionSlug}
        />
    );
}
